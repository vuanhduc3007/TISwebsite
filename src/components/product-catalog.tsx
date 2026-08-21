"use client";

import { useMemo, useRef, useState } from "react";
import { IconArrowDownRight, IconSearch, IconX } from "@tabler/icons-react";
import { ProductCard } from "@/components/product-card";
import { ProductCatalogState } from "@/components/product-catalog-state";
import type { Product, ProductCatalogProps, ProductFilterState } from "@/lib/products-contract";

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .trim();
}

function formatCatalogIndex(index: number) {
  return String(index + 1).padStart(2, "0");
}

function groupProductsByCategory(products: Product[]) {
  const groups = new Map<number, { category: Product["category"]; products: Product[] }>();

  for (const product of products) {
    const existingGroup = groups.get(product.category.id);
    if (existingGroup) {
      existingGroup.products.push(product);
      continue;
    }

    groups.set(product.category.id, {
      category: product.category,
      products: [product]
    });
  }

  return Array.from(groups.values());
}

export function ProductCatalog({ products }: ProductCatalogProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [filters, setFilters] = useState<ProductFilterState>({
    search: "",
    categoryId: "all",
    brand: "all"
  });

  const categoryOptions = useMemo(() => {
    const categories = new Map<number, string>();
    for (const product of products) {
      categories.set(product.category.id, product.category.name);
    }

    return Array.from(categories.entries()).map(([id, label]) => ({
      value: String(id),
      label
    }));
  }, [products]);

  const brandOptions = useMemo(() => {
    return Array.from(new Set(products.map((product) => product.brand).filter(Boolean))).sort((first, second) =>
      first.localeCompare(second, "vi")
    );
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = normalizeSearchValue(filters.search);

    return products.filter((product) => {
      const matchesSearch = !normalizedSearch || [product.title, product.brand, product.category.name].some((value) => normalizeSearchValue(value).includes(normalizedSearch));
      const matchesCategory = filters.categoryId === "all" || String(product.category.id) === filters.categoryId;
      const matchesBrand = filters.brand === "all" || product.brand === filters.brand;

      return matchesSearch && matchesCategory && matchesBrand;
    });
  }, [filters, products]);

  const groups = useMemo(() => groupProductsByCategory(filteredProducts), [filteredProducts]);
  const hasActiveFilters = filters.search.trim().length > 0 || filters.categoryId !== "all" || filters.brand !== "all";

  function updateFilter<Key extends keyof ProductFilterState>(key: Key, value: ProductFilterState[Key]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function clearFilters() {
    setFilters({ search: "", categoryId: "all", brand: "all" });
    searchInputRef.current?.focus();
  }

  return (
    <>
      <section className="site-shell section-space">
        <div className="content-panel">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)] md:items-end">
            <label className="grid gap-2" htmlFor="product-search">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-(--ink-muted)">Tìm kiếm sản phẩm</span>
              <span className="relative block">
                <IconSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" size={19} width={19} height={19} stroke={1.8} color="var(--ink-muted)" aria-hidden="true" />
                <input
                  ref={searchInputRef}
                  id="product-search"
                  type="search"
                  value={filters.search}
                  onChange={(event) => updateFilter("search", event.target.value)}
                  placeholder="Tìm theo tên hoặc thương hiệu"
                  className="h-12 w-full rounded-[12px] border border-(--line) bg-(--canvas) pl-11 pr-4 text-sm text-(--ink) outline-hidden transition placeholder:text-(--ink-muted)/70 focus:border-(--accent) focus:ring-3 focus:ring-(--accent)/20"
                />
              </span>
            </label>

            <label className="grid gap-2" htmlFor="product-category">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-(--ink-muted)">Danh mục</span>
              <select
                id="product-category"
                value={filters.categoryId}
                onChange={(event) => updateFilter("categoryId", event.target.value)}
                className="h-12 w-full rounded-[12px] border border-(--line) bg-(--canvas) px-4 text-sm text-(--ink) outline-hidden transition focus:border-(--accent) focus:ring-3 focus:ring-(--accent)/20"
              >
                <option value="all">Tất cả danh mục</option>
                {categoryOptions.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2" htmlFor="product-brand">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-(--ink-muted)">Thương hiệu</span>
              <select
                id="product-brand"
                value={filters.brand}
                onChange={(event) => updateFilter("brand", event.target.value)}
                className="h-12 w-full rounded-[12px] border border-(--line) bg-(--canvas) px-4 text-sm text-(--ink) outline-hidden transition focus:border-(--accent) focus:ring-3 focus:ring-(--accent)/20"
              >
                <option value="all">Tất cả thương hiệu</option>
                {brandOptions.map((brand) => (
                  <option value={brand} key={brand}>
                    {brand}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-(--line) pt-4">
            <p className="text-sm font-semibold text-(--ink-muted)" aria-live="polite">
              {filteredProducts.length} sản phẩm phù hợp
            </p>
            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className="inline-flex min-h-10 items-center gap-2 rounded-[10px] border border-(--line) px-3 text-sm font-bold text-(--ink) transition hover:border-(--accent) hover:text-(--accent) disabled:cursor-not-allowed disabled:opacity-40"
            >
              <IconX size={16} width={16} height={16} stroke={1.8} color="currentColor" aria-hidden="true" />
              Xóa bộ lọc
            </button>
          </div>
        </div>
      </section>

      {groups.length === 0 ? (
        <ProductCatalogState variant="empty" message="Thử đổi từ khóa hoặc xóa bộ lọc để xem toàn bộ sản phẩm." />
      ) : (
        <section className="site-shell pb-24">
          {groups.length > 1 && (
            <nav className="mb-16 border-y border-(--line)" aria-label="Đi đến danh mục sản phẩm">
              {groups.map((group, index) => (
                <a
                  className="group flex items-center justify-between gap-4 border-b border-(--line) py-4 transition hover:pl-2 last:border-b-0"
                  href={`#category-${group.category.id}`}
                  key={group.category.id}
                >
                  <span className="flex items-baseline gap-4">
                    <span className="font-mono text-xs text-(--ink-muted)">{formatCatalogIndex(index)}</span>
                    <span className="text-base font-semibold tracking-[-0.03em] text-(--ink) transition group-hover:text-(--accent)">
                      {group.category.name}
                    </span>
                  </span>
                  <IconArrowDownRight size={18} width={18} height={18} stroke={1.6} color="var(--ink-muted)" aria-hidden="true" />
                </a>
              ))}
            </nav>
          )}

          <div className="space-y-20">
            {groups.map((group, index) => (
              <section id={`category-${group.category.id}`} key={group.category.id}>
                <div className="relative mb-6 overflow-hidden border-t border-(--line) pt-5">
                  <span className="pointer-events-none absolute -right-2 -top-8 select-none font-mono text-[7rem] font-bold leading-none text-(--ink) opacity-[0.045]" aria-hidden="true">
                    {formatCatalogIndex(index)}
                  </span>
                  <p className="eyebrow">Danh mục {formatCatalogIndex(index)}</p>
                  <h2 className="relative max-w-3xl">{group.category.name}</h2>
                  <p className="section-lede relative">{group.products.length} sản phẩm phù hợp trong danh mục này.</p>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
                  {group.products.map((product, productIndex) => (
                    <ProductCard product={product} priority={index === 0 && productIndex < 4} key={product.id} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
