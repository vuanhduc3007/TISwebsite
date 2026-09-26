import "server-only";

import type { RowDataPacket } from "mysql2";
import { DatabaseConfigurationError, getDatabasePool } from "@/lib/db";
import { toProductImageUrl } from "@/lib/product-image";
import type { Product } from "@/lib/products-contract";

type ProductRow = RowDataPacket & {
  id: number;
  slug: string;
  category_id: number | null;
  category_name: string | null;
  name: string;
  price: string | null;
  price_amount: number | null;
  price_label: string | null;
  image_url: string | null;
  brand: string | null;
  specifications: string | any | null;
  description: string | null;
  image_alt: string | null;
};

const PRODUCT_FIELDS = `
  p.id,
  p.slug,
  p.category_id,
  c.name AS category_name,
  p.name,
  p.price,
  p.price_amount,
  p.price_label,
  p.image_url,
  p.brand,
  p.specifications,
  p.description,
  p.image_alt
`;

const LIST_PRODUCTS_QUERY = `
  SELECT ${PRODUCT_FIELDS}
  FROM products AS p
  LEFT JOIN categories AS c ON c.id = p.category_id
  WHERE p.status = 'published' AND p.deleted_at IS NULL AND (c.is_active = 1 OR c.id IS NULL)
  ORDER BY p.sort_order ASC, p.id ASC
`;

const PRODUCT_BY_ID_QUERY = `
  SELECT ${PRODUCT_FIELDS}
  FROM products AS p
  LEFT JOIN categories AS c ON c.id = p.category_id
  WHERE p.id = ? AND p.status = 'published' AND p.deleted_at IS NULL
  LIMIT 1
`;

const PRODUCT_BY_SLUG_QUERY = `
  SELECT ${PRODUCT_FIELDS}
  FROM products AS p
  LEFT JOIN categories AS c ON c.id = p.category_id
  WHERE p.slug = ? AND p.status = 'published' AND p.deleted_at IS NULL
  LIMIT 1
`;

function normalizeSlugPart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createProductSlug(name: string, id: number) {
  return `${normalizeSlugPart(name) || "san-pham"}-${id}`;
}

function formatPrice(value: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return "Liên hệ";
  }

  const numericValue = Number(trimmed.replace(/[^0-9]/g, ""));
  if (Number.isSafeInteger(numericValue) && numericValue > 0) {
    return `${new Intl.NumberFormat("vi-VN").format(numericValue)} ₫`;
  }

  return trimmed;
}

function mapProductRow(row: ProductRow): Product {
  const category = {
    id: row.category_id ?? 0,
    name: row.category_name?.trim() || "Thiết bị điện mặt trời"
  };
  const brand = row.brand?.trim() || "TIS";
  const title = row.name.trim();
  const image = toProductImageUrl(row.image_url);

  let parsedSpecs = [];
  try {
    if (row.specifications) {
      parsedSpecs = typeof row.specifications === "string" 
        ? JSON.parse(row.specifications) 
        : row.specifications;
    }
  } catch (error) {
    // Fallback to empty if parse fails
  }

  if (!Array.isArray(parsedSpecs)) parsedSpecs = [];

  const price = row.price_amount !== null
    ? formatPrice(String(row.price_amount))
    : row.price_label?.trim() || formatPrice(row.price);
  const description = row.description?.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean) ?? [];

  return {
    id: row.id,
    slug: row.slug,
    title,
    shortTitle: title,
    summary: `${brand} · ${category.name}`,
    description,
    image,
    imageAlt: row.image_alt?.trim() || `${title}${brand ? ` - ${brand}` : ""}`,
    application: category.name,
    profileTitle: title,
    models: [
      {
        id: String(row.id),
        brand,
        image,
        alt: `${title}${brand ? ` - ${brand}` : ""}`
      }
    ],
    category,
    price,
    brand,
    specifications: parsedSpecs
  };
}

async function queryProducts(query: string, values: unknown[] = []) {
  const database = getDatabasePool();
  const [rows] = await database.query<ProductRow[]>(query, values);
  return rows.map(mapProductRow);
}

export async function getProducts() {
  return queryProducts(LIST_PRODUCTS_QUERY);
}

export async function getProductBySlug(slug: string) {
  const [exactMatch] = await queryProducts(PRODUCT_BY_SLUG_QUERY, [slug]);
  if (exactMatch) {
    return exactMatch;
  }

  const idMatch = slug.match(/-(\d+)$/);
  if (!idMatch) {
    return null;
  }

  const [product] = await queryProducts(PRODUCT_BY_ID_QUERY, [Number(idMatch[1])]);
  if (!product) {
    return null;
  }

  const legacySlug = createProductSlug(product.title, product.id);
  if (legacySlug !== slug) return null;

  return product;
}

export async function getProductSlugs() {
  const products = await getProducts();
  return products.map((product) => product.slug);
}

export function getProductRepositoryErrorMessage(error: unknown) {
  if (error instanceof DatabaseConfigurationError) {
    return "Chưa có cấu hình kết nối MySQL cho website.";
  }

  return "Không thể tải danh sách sản phẩm từ MySQL. Vui lòng kiểm tra dịch vụ database.";
}
