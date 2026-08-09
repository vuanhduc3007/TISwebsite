import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { ProductCatalog } from "@/components/product-catalog";
import { ProductCatalogState } from "@/components/product-catalog-state";
import { solarImages } from "@/content/products";
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
      <PageHero
        title="Thiết bị điện mặt trời"
        description="Danh mục sản phẩm được lấy trực tiếp từ hệ thống Solar Shop, giúp bạn tìm đúng thiết bị theo từng nhóm ứng dụng."
        image={solarImages.field}
        imageAlt="Tấm pin điện mặt trời trải rộng dưới bầu trời xanh"
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
