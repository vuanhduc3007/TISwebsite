import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug, products } from "@/content/products";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  return { title: product?.title ?? "Sản phẩm" };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();

  return (
    <main>
      <section className="site-shell grid gap-10 py-12 md:py-16 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:py-20">
        <div className="rise-in">
          <p className="text-sm font-bold text-[var(--accent)]">{product.application}</p>
          <h1 className="mt-4">{product.title}</h1>
          <p className="page-lede">{product.description}</p>
          <Link className="button-primary mt-7" href="/contact">Liên hệ</Link>
        </div>
        <div className="detail-hero-media">
          <Image src={product.image} alt={product.imageAlt} fill priority sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover" />
        </div>
      </section>
      <section className="site-shell section-space pt-0 grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
        <article className="content-panel reveal">
          <h2>Điểm cần xem xét</h2>
          <ul className="check-list">
            {product.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}
          </ul>
        </article>
        <article className="content-panel reveal">
          <h2>Trao đổi trước khi chọn</h2>
          <p>Thông tin về mái, mục tiêu sử dụng và thiết bị đang quan tâm sẽ giúp TIS tư vấn một phương án dễ kiểm chứng hơn.</p>
        </article>
      </section>
    </main>
  );
}
