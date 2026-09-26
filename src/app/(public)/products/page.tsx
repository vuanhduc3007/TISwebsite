import type { Metadata } from "next";
import { AboutBlueprintHero } from "@/components/about-blueprint-hero";
import { ProductCatalog } from "@/components/product-catalog";
import { ProductCatalogState } from "@/components/product-catalog-state";
import { getProductRepositoryErrorMessage, getProducts } from "@/lib/products-repository";
import type { Product } from "@/lib/products-contract";

export const metadata: Metadata = {
  title: "Sản phẩm"
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProductsPage() {
  let products: Product[] = [];
  let errorMessage: string | null = null;

  try {
    products = await getProducts();
  } catch (error) {
    errorMessage = getProductRepositoryErrorMessage(error);
  }

  return (
    <main>
      <AboutBlueprintHero
        title="Thiết bị điện mặt trời"
        description="Danh mục sản phẩm được lấy trực tiếp từ hệ thống Solar Shop, giúp bạn tìm đúng thiết bị theo từng nhóm ứng dụng."
        eyebrow="// Danh mục sản phẩm"
        titleId="products-blueprint-title"
        metricsIntro="Thống kê sản phẩm"
        signature="TIS / PRODUCTS"
        metrics={[
          { label: "Phân loại sản phẩm", value: "04", detail: "Nhóm thiết bị chính", offset: "none" },
          { label: "Danh mục thiết bị", value: "50+", detail: "Inverter, Pin & Phụ kiện", offset: "small" },
          { label: "Hãng sản xuất", value: "10+", detail: "Đối tác thương hiệu uy tín", offset: "large" }
        ]}
      />

      {errorMessage ? (
        <ProductCatalogState variant="error" message={errorMessage} />
      ) : products.length === 0 ? (
        <ProductCatalogState variant="empty" message="Hiện chưa có sản phẩm nào trong cơ sở dữ liệu." />
      ) : (
        <ProductCatalog products={products} />
      )}
    </main>
  );
}
