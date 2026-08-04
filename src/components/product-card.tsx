import { IconArrowUpRight } from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/content/products";

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  return (
    <article className="product-card group">
      <div className="product-image-wrap">
        <Image
          src={product.image}
          alt={product.imageAlt}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 45vw, (min-width: 768px) 50vw, 100vw"
          className="object-cover transition duration-500 ease-out group-hover:scale-[1.025]"
        />
      </div>
      <div className="p-5 md:p-6">
        <p className="text-sm font-semibold text-[var(--accent)]">{product.application}</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-[var(--ink)]">{product.shortTitle}</h2>
        <p className="mt-3 max-w-md text-sm leading-6 text-[var(--ink-muted)]">{product.summary}</p>
        <Link className="inline-flex items-center gap-2 pt-5 text-sm font-bold text-[var(--ink)] transition hover:text-[var(--accent)]" href={`/products/${product.slug}`}>
          Xem chi tiết <IconArrowUpRight size={17} strokeWidth={1.8} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
