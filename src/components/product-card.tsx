import { IconArrowUpRight } from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/products-contract";

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  return (
    <article className="product-card group">
      <div className="product-image-wrap">
        <Image
          src={product.image}
          alt={product.imageAlt}
          fill
          priority={priority}
          sizes="(min-width: 1536px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className="object-contain p-3 transition duration-500 ease-out group-hover:scale-[1.04] sm:p-4"
        />
      </div>
      <div className="p-4 md:p-5">
        <div className="flex items-center justify-between gap-3 text-xs font-bold">
          <p className="truncate text-(--accent)">{product.brand}</p>
          <p className="shrink-0 text-right text-(--ink-muted)">{product.price}</p>
        </div>
        <h2 className="product-card-title mt-2 text-(--ink)">{product.shortTitle}</h2>
        <p className="product-card-description">{product.application}</p>
        <Link className="mt-3 inline-flex min-h-10 items-center gap-2 text-xs font-bold text-(--ink) transition hover:text-(--accent)" href={`/products/${product.slug}`}>
          Xem chi tiết <IconArrowUpRight size={16} width={16} height={16} stroke={1.8} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
