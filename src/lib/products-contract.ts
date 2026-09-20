export type ProductCategory = {
  id: number;
  name: string;
};

export type ProductModel = {
  id: string;
  brand?: string;
  logo?: string;
  image: string;
  alt?: string;
};

export type Product = {
  id: number;
  slug: string;
  title: string;
  shortTitle: string;
  summary: string;
  description: string[];
  image: string;
  imageAlt: string;
  application: string;
  profileTitle: string;
  strengths?: string[];
  specifications?: { label: string; value: string }[];
  models: ProductModel[];
  category: ProductCategory;
  price: string;
  brand: string;
};

export type ProductFilterState = {
  search: string;
  categoryId: string;
  brand: string;
};

export type ProductFilterOption = {
  value: string;
  label: string;
};

export type ProductCatalogProps = {
  products: Product[];
};
