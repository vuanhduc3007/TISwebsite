import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { ProductCard } from "@/components/product-card";
import { products, solarImages } from "@/content/products";

export const metadata: Metadata = {
  title: "Sản phẩm"
};

export default function ProductsPage() {
  return (
    <main>
      <PageHero
        title="Thiết bị điện mặt trời"
        description="Danh mục được tổ chức theo vai trò trong hệ thống, giúp bạn bắt đầu từ đúng nhóm thiết bị cần tìm hiểu."
        image={solarImages.field}
        imageAlt="Tấm pin điện mặt trời trải rộng dưới bầu trời xanh"
      />
      <section className="site-shell section-space pt-0">
        <div className="grid gap-5 md:grid-cols-2">
          {products.map((product, index) => (
            <ProductCard product={product} priority={index === 0} key={product.slug} />
          ))}
        </div>
      </section>
    </main>
  );
}
