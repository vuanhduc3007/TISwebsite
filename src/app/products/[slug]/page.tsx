import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IconArrowLeft, IconTag } from "@tabler/icons-react";
import { ProductCatalogState } from "@/components/product-catalog-state";
import { getProductRepositoryErrorMessage, getProductBySlug } from "@/lib/products-repository";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const product = await getProductBySlug(slug);
    return { title: product?.title ?? "Sản phẩm" };
  } catch {
    return { title: "Sản phẩm" };
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  let product;
  let errorMessage: string | null = null;

  try {
    product = await getProductBySlug(slug);
  } catch (error) {
    errorMessage = getProductRepositoryErrorMessage(error);
  }

  if (errorMessage) {
    return (
      <main>
        <ProductCatalogState variant="error" message={errorMessage} />
      </main>
    );
  }

  if (!product) {
    notFound();
  }

  return (
    <main className="pb-24">
      <section className="site-shell pt-10 md:pt-16">
        <Link className="inline-flex items-center gap-2 text-sm font-bold text-[var(--ink-muted)] transition hover:text-[var(--accent)]" href="/products">
          <IconArrowLeft size={17} width={17} height={17} stroke={1.8} aria-hidden="true" />
          Tất cả sản phẩm
        </Link>
      </section>

      <section className="site-shell pt-12 md:pt-20 lg:pt-28">
        <div className="grid items-start gap-12 lg:grid-cols-[.8fr_1.2fr] lg:gap-24">
          <div className="lg:sticky lg:top-32">
            <p className="eyebrow">{product.category.name}</p>
            <h1 className="max-w-3xl text-4xl font-bold tracking-tighter leading-[1.05] text-[var(--ink)] md:text-5xl xl:text-6xl">
              {product.title}
            </h1>
            <p className="mt-6 text-lg font-semibold text-[var(--accent)]">{product.price}</p>
          </div>

          <div className="flex flex-col gap-10">
            <div className="detail-hero-media min-h-[22rem] md:min-h-[30rem]">
              <Image src={product.image} alt={product.imageAlt} fill priority sizes="(min-width: 1024px) 60vw, 100vw" className="object-contain p-8 md:p-12" />
            </div>

            <div className="grid gap-6 border-y border-[var(--line)] py-6 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <IconTag size={20} width={20} height={20} stroke={1.7} color="var(--accent)" aria-hidden="true" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--ink-muted)]">Thương hiệu</p>
                  <p className="mt-2 font-semibold text-[var(--ink)]">{product.brand}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--ink-muted)]">Danh mục</p>
                <p className="mt-2 font-semibold text-[var(--ink)]">{product.category.name}</p>
              </div>
            </div>

            <div className="space-y-5">
              {product.description.map((paragraph) => (
                <p className="text-base leading-8 text-[var(--ink-muted)]" key={paragraph}>
                  {paragraph}
                </p>
              ))}
            </div>

            {product.specifications && product.specifications.length > 0 && (
              <div className="mt-4">
                <h2 className="mb-6 text-xl font-bold tracking-tight text-[var(--ink)]">Thông số kỹ thuật</h2>
                <dl className="grid gap-4 sm:grid-cols-2">
                  {product.specifications.map((spec, index) => (
                    <div key={index} className="flex flex-col gap-1 rounded-xl border border-[var(--line)] bg-white/50 p-4 transition-colors hover:bg-[var(--canvas)] dark:bg-[var(--canvas)] dark:hover:bg-white/5">
                      <dt className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--ink-muted)]">{spec.label}</dt>
                      <dd className="font-semibold text-[var(--ink)]">{spec.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            <Link className="button-primary w-fit" href="/contact">
              Tư vấn sản phẩm
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
