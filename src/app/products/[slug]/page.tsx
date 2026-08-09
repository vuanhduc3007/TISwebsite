import type { Metadata } from "next";
import Image from "next/image";
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
    <main className="pb-24">
      {/* Editorial Header Section */}
      <section className="site-shell pt-16 md:pt-24 lg:pt-32 pb-16 md:pb-24">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-start reveal">
          
          {/* Left: Display Title */}
          <div className="lg:sticky lg:top-32">
            <h1 className="text-4xl md:text-5xl lg:text-5xl xl:text-6xl font-bold tracking-tighter leading-[1.05] text-[var(--ink)] pr-4">
              {product.profileTitle}
            </h1>
          </div>
          
          {/* Right: Refined Content */}
          <div className="flex flex-col gap-12">
            {/* Strengths (if any) */}
            {product.strengths && product.strengths.length > 0 && (
              <div>
                {product.strengthsTitle && (
                  <h2 className="text-base uppercase tracking-widest text-[var(--ink-muted)] mb-6 font-bold">
                    {product.strengthsTitle}
                  </h2>
                )}
                <ul className="flex flex-col border-t border-[var(--line)]">
                  {product.strengths.map((strength, idx) => (
                    <li 
                      key={idx} 
                      className="py-5 border-b border-[var(--line)] text-base md:text-lg text-[var(--ink)] leading-relaxed"
                    >
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Descriptions */}
            <div className="space-y-6">
              {product.description.map((paragraph, idx) => (
                <p 
                  key={idx} 
                  className={`text-base md:text-lg leading-relaxed ${
                    idx === 0 && (!product.strengths || product.strengths.length === 0) 
                      ? "text-xl md:text-2xl font-medium tracking-tight text-[var(--ink)]" 
                      : "text-[var(--ink-muted)]"
                  }`}
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
          
        </div>
      </section>

      {/* Models Grid Section */}
      <section className="site-shell reveal">
        <div className="border-t border-[var(--line)] pt-16 md:pt-24">
          <div className={`grid grid-cols-2 md:grid-cols-3 ${product.models.length === 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-x-6 gap-y-16 lg:gap-y-24`}>
            {product.models.map((model, idx) => (
              <div key={idx} className="flex flex-col items-center group">
                
                {/* Brand Logo (Optional) */}
                {model.logo && (
                  <div className="h-10 w-28 relative mb-8 opacity-80 mix-blend-multiply group-hover:opacity-100 transition-opacity duration-300">
                    {model.logo.endsWith('.svg') ? (
                       <img src={model.logo} alt={model.brand || "Logo"} className="w-full h-full object-contain" />
                    ) : (
                       <Image src={model.logo} alt={model.brand || "Logo"} fill sizes="112px" className="object-contain" />
                    )}
                  </div>
                )}
                
                {/* Product Image */}
                <div className={`relative w-full aspect-square mix-blend-multiply transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-3 ${!model.logo ? "mt-4" : ""}`}>
                  <Image 
                    src={model.image} 
                    alt={model.brand ? `Thiết bị ${model.brand}` : "Thiết bị lưu trữ BESS"} 
                    fill 
                    sizes="(max-width: 768px) 50vw, 25vw" 
                    className="object-contain drop-shadow-sm"
                  />
                </div>
                
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
