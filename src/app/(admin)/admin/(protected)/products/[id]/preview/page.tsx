import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminProduct } from "@/lib/admin/repository";

function specs(value: unknown): Array<{ label: string; value: string }> {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export default async function ProductPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id)) notFound();
  const product = await getAdminProduct(id);
  if (!product) notFound();
  const specifications = specs(product.specifications);
  return <><header className="admin-page-header"><div><Link href={`/admin/products/${id}/edit`}>← Quay lại chỉnh sửa</Link><h1>Xem trước sản phẩm</h1></div><span className={`admin-status admin-status-${product.status}`}>{product.status}</span></header><article className="admin-panel"><p className="admin-eyebrow">{product.category_name} · {product.brand}</p><h2>{product.name}</h2>{product.image_url ? <img className="admin-preview-image" src={product.image_url} alt={product.image_alt || product.name} /> : null}<p>{product.price_amount === null ? product.price_label || "Liên hệ" : `${new Intl.NumberFormat("vi-VN").format(product.price_amount)} ₫`}</p>{product.description ? <div>{product.description.split(/\n\s*\n/).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div> : null}{specifications.length ? <dl>{specifications.map((item, index) => <div key={index}><dt><strong>{item.label}</strong></dt><dd>{item.value}</dd></div>)}</dl> : null}</article></>;
}
