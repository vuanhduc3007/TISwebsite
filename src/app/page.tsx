import { company, pillars, partnerLogos } from "@/content/company";
import { featuredProjects } from "@/content/projects-data";
import { products, solarImages } from "@/content/products";
import { ProductCard } from "@/components/product-card";
import Image from "next/image";
import Link from "next/link";
import { IconServer, IconBolt, IconSun } from "@tabler/icons-react";

export default function HomePage() {
  const topProjects = [...featuredProjects]
    .sort((a, b) => b.valueNumber - a.valueNumber)
    .slice(0, 4);

  return (
    <main>
      <section id="hero" className="site-shell grid min-h-[calc(100dvh-72px)] gap-8 lg:grid-cols-[.86fr_1.14fr] lg:gap-14">
        <div className="hero-copy rise-in">
          <p className="eyebrow">Giải pháp toàn diện</p>
          <h1>CNTT, Cơ điện và Năng lượng tái tạo</h1>
          <p className="section-lede">TIS tư vấn, thiết kế và thi công giải pháp cho công trình tại Việt Nam từ năm 2013.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link className="button-primary" href="/contact">Liên hệ</Link>
            <Link className="button-secondary" href="/projects">Xem dự án</Link>
          </div>
        </div>
        <div className="hero-media">
          <Image src={solarImages.rooftop} alt="CNTT, Cơ điện và Năng lượng tái tạo" fill priority sizes="(min-width: 1024px) 58vw, 100vw" className="object-cover" />
        </div>
      </section>

      <section id="features" className="site-shell section-space reveal">
        <div className="section-heading">
          <h2>Ba lĩnh vực cốt lõi</h2>
          <p className="section-lede">TIS hoạt động trên ba trụ cột chính, kết hợp công nghệ và kinh nghiệm thi công thực tế.</p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {pillars.map((pillar, index) => {
            const Icon = index === 0 ? IconServer : index === 1 ? IconBolt : IconSun;
            return (
              <div key={pillar.id} className="content-panel flex flex-col gap-4">
                <Icon className="w-8 h-8 text-[var(--accent)]" />
                <h3>{pillar.title}</h3>
                <p>{pillar.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section id="projects" className="site-shell section-space reveal grid gap-10 lg:grid-cols-[1.1fr_.9fr]">
        <div className="flex flex-col gap-6">
          <div className="section-heading">
            <h2>Dự án tiêu biểu</h2>
          </div>
          <div className="flex flex-col">
            {topProjects.map((project, index) => (
              <div key={index} className="py-5 border-b border-[var(--line)] last:border-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium px-2 py-1 bg-[var(--surface-muted)] rounded-md">
                    {project.pillar === "it" ? "CNTT" : project.pillar === "renewable" ? "Năng lượng tái tạo" : "Cơ điện"}
                  </span>
                  <span className="text-sm text-[var(--ink-muted)]">{project.date}</span>
                </div>
                <h3 className="text-lg font-semibold mb-1">{project.name}</h3>
                <p className="text-[var(--ink-muted)] mb-2">{project.client}</p>
                <p className="font-bold">{project.value}</p>
              </div>
            ))}
          </div>
          <Link className="button-secondary w-fit mt-2" href="/projects">Xem tất cả dự án</Link>
        </div>
        <div className="relative min-h-[30rem] overflow-hidden rounded-[20px] bg-[var(--surface-muted)]">
          <Image src={solarImages.installation} alt="Dự án tiêu biểu" fill sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />
        </div>
      </section>

      <section id="products" className="site-shell section-space reveal">
        <p className="eyebrow mb-3">Sản phẩm</p>
        <div className="section-heading">
          <h2>Thiết bị điện mặt trời</h2>
          <p className="section-lede">Khám phá danh mục độc lập để so sánh và trao đổi đúng loại thiết bị bạn cần.</p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {products.map((product, index) => (
            <ProductCard product={product} priority={index === 0} key={product.slug} />
          ))}
        </div>
      </section>

      <section className="site-shell section-space reveal">
        <div className="section-heading mb-8">
          <h2 className="text-2xl">Đối tác thiết bị</h2>
        </div>
        <div className="flex flex-wrap justify-center gap-8 md:gap-12 items-center">
          {partnerLogos.map((logo, idx) => (
            <div key={idx} className="relative w-20 h-12 md:w-24 md:h-16 grayscale hover:grayscale-0 transition-all duration-300">
              <Image src={logo.src} alt={logo.name} fill className="object-contain" />
            </div>
          ))}
        </div>
      </section>

      <section className="site-shell section-space reveal">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 bg-[var(--surface-muted)] p-8 rounded-[20px]">
          <div className="flex flex-col gap-1">
            <span className="text-4xl font-bold text-[var(--accent)]">12+</span>
            <span className="text-sm font-medium">Năm hoạt động</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-4xl font-bold text-[var(--accent)]">50+</span>
            <span className="text-sm font-medium">Nhân sự</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-4xl font-bold text-[var(--accent)]">29 tỷ+</span>
            <span className="text-sm font-medium">Giá trị dự án</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-4xl font-bold text-[var(--accent)]">12</span>
            <span className="text-sm font-medium">Đối tác thiết bị</span>
          </div>
        </div>
      </section>

      <section id="contact" className="site-shell section-space reveal">
        <div className="contact-band">
          <h2>Bắt đầu từ một cuộc trao đổi</h2>
          <p>Chia sẻ loại công trình và nhu cầu sử dụng. Đội ngũ TIS sẽ giúp bạn xác định giải pháp phù hợp.</p>
          <div className="mt-6 flex justify-center">
            <a href="tel:0988761315" className="text-2xl font-bold hover:text-[var(--accent)] transition-colors">0988 761 315</a>
          </div>
        </div>
      </section>
    </main>
  );
}
