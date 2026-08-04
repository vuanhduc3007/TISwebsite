import Image from "next/image";

type PageHeroProps = {
  title: string;
  description: string;
  image: string;
  imageAlt: string;
};

export function PageHero({ title, description, image, imageAlt }: PageHeroProps) {
  return (
    <section className="site-shell page-hero grid gap-10 py-12 md:py-16 lg:grid-cols-[.88fr_1.12fr] lg:items-end lg:py-20">
      <div className="rise-in max-w-2xl">
        <h1>{title}</h1>
        <p className="page-lede">{description}</p>
      </div>
      <div className="relative min-h-[320px] overflow-hidden rounded-[20px] border border-[var(--line)] bg-[var(--surface-muted)] md:min-h-[420px]">
        <Image src={image} alt={imageAlt} fill priority sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover" />
      </div>
    </section>
  );
}
