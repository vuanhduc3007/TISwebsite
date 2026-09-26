import { createCategoryAction, updateCategoryAction } from "@/app/(admin)/admin/actions/categories";
import { CategoryForm } from "@/components/admin/category-form";
import { getAdminCategories } from "@/lib/admin/repository";

export default async function CategoriesPage() {
  const categories = await getAdminCategories();
  return <><header className="admin-page-header"><div><p className="admin-eyebrow">Cấu hình</p><h1>Danh mục sản phẩm</h1></div></header><section className="admin-panel"><h2>Thêm danh mục</h2><CategoryForm action={createCategoryAction} submitLabel="Thêm" /></section><section className="admin-panel"><h2>Danh mục hiện có</h2><div className="admin-stack">{categories.map((category) => <div className="admin-list-card" key={category.id}><span className="admin-count">{category.product_count} sản phẩm</span><CategoryForm action={updateCategoryAction.bind(null, category.id)} submitLabel="Lưu" initial={{ name: category.name, slug: category.slug, sortOrder: category.sort_order, isActive: Boolean(category.is_active) }} /></div>)}</div></section></>;
}
