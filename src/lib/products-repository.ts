import "server-only";

import type { RowDataPacket } from "mysql2";
import { DatabaseConfigurationError, getDatabasePool } from "@/lib/db";
import { toProductImageUrl } from "@/lib/product-image";
import type { Product } from "@/lib/products-contract";

type ProductRow = RowDataPacket & {
  id: number;
  category_id: number | null;
  category_name: string | null;
  name: string;
  price: string | null;
  image_url: string | null;
  brand: string | null;
  specifications: string | any | null;
};

const PRODUCT_FIELDS = `
  p.id,
  p.category_id,
  c.name AS category_name,
  p.name,
  p.price,
  p.image_url,
  p.brand,
  p.specifications
`;

const LIST_PRODUCTS_QUERY = `
  SELECT ${PRODUCT_FIELDS}
  FROM products AS p
  LEFT JOIN categories AS c ON c.id = p.category_id
  ORDER BY p.category_id ASC, p.id ASC
`;

const PRODUCT_BY_ID_QUERY = `
  SELECT ${PRODUCT_FIELDS}
  FROM products AS p
  LEFT JOIN categories AS c ON c.id = p.category_id
  WHERE p.id = ?
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

function generateMockSpecifications(title: string) {
  return [
    { label: "Model", value: title },
    { label: "Công suất", value: "545 Wp – 550 Wp" },
    { label: "Hiệu suất", value: "20.9%" },
    { label: "Kích thước", value: "2256mm x 1133mm x 35mm" },
    { label: "Bảo hành sản phẩm", value: "12 năm" },
    { label: "Bảo hành hiệu suất", value: "25 năm" },
  ];
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

  // Tạm thời nếu DB chưa có dữ liệu cho sản phẩm này, chúng ta vẫn dùng mock data
  if (!parsedSpecs || parsedSpecs.length === 0) {
    parsedSpecs = generateMockSpecifications(title);
  }

  return {
    id: row.id,
    slug: createProductSlug(title, row.id),
    title,
    shortTitle: title,
    summary: `${brand} · ${category.name}`,
    description: [`Giá tham khảo: ${formatPrice(row.price)}`],
    image,
    imageAlt: `${title}${brand ? ` - ${brand}` : ""}`,
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
    price: formatPrice(row.price),
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
  const idMatch = slug.match(/-(\d+)$/);
  if (!idMatch) {
    return null;
  }

  const [product] = await queryProducts(PRODUCT_BY_ID_QUERY, [Number(idMatch[1])]);
  if (!product || product.slug !== slug) {
    return null;
  }

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
