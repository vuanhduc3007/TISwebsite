import { pillars } from "@/content/company";
import Image from "next/image";
import Link from "next/link";
import { IconServer, IconBolt, IconSun } from "@tabler/icons-react";
import { ContactFieldNote } from "@/components/contact-field-note";

export default function HomePage() {
  return (
    <main>
      {/* 1. HERO SECTION - Full width with dark overlay */}
      <section id="hero" className="relative min-h-[calc(100vh-72px)] flex items-center">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image 
            src="/images/projects/hero_main.jpg" 
            alt="Hệ thống điện mặt trời" 
            fill 
            priority 
            sizes="100vw" 
            className="object-cover object-center brightness-125 contrast-105" 
          />
          {/* Dark Overlay for text contrast */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a111a]/60 via-[#0a111a]/30 to-transparent"></div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 site-shell w-full py-24 sm:py-32 reveal">
          <div className="max-w-3xl flex flex-col items-start gap-6 sm:gap-8 lg:gap-9">
            <p className="inline-flex items-center px-4 py-1.5 text-xs sm:text-sm font-bold tracking-widest uppercase bg-black/40 text-[var(--accent)] border border-[var(--accent)]/40 backdrop-blur-md rounded-full shadow-sm">
              Giải pháp toàn diện
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-[1.25] sm:leading-[1.2] drop-shadow-sm">
              CNTT, Cơ điện và Năng lượng tái tạo
            </h1>
            <p className="text-base sm:text-lg text-slate-200 font-normal leading-relaxed max-w-2xl">
              Công ty TIS tư vấn, thiết kế và thi công giải pháp cho công trình tại Việt Nam từ năm 2013. Bền vững, tối ưu và chuyên nghiệp.
            </p>
            <div className="pt-2 sm:pt-4 flex flex-col sm:flex-row items-start gap-4">
              <Link className="inline-flex items-center justify-center bg-[var(--accent)] text-black font-bold hover:bg-[var(--accent-strong)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-sm sm:text-base px-8 py-4 rounded-xl uppercase tracking-wider shadow-lg shadow-[var(--accent)]/20" href="/contact">
                Liên hệ ngay
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2. LĨNH VỰC CỐT LÕI - Premium Cards */}
      <section id="features" className="home-section py-12 md:py-14 flex flex-col justify-center bg-[var(--surface-muted)] reveal">
        <div className="site-shell">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Ba lĩnh vực cốt lõi</h2>
            <p className="text-base text-[var(--ink-muted)] text-balance">Công ty TIS hoạt động trên ba trụ cột chính, kết hợp công nghệ hiện đại và kinh nghiệm thi công thực&nbsp;tế.</p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-3">
            {pillars.map((pillar, index) => {
              const Icon = index === 0 ? IconServer : index === 1 ? IconBolt : IconSun;
              return (
                <div key={pillar.id} className="bg-[var(--surface)] p-8 rounded-2xl shadow-sm hover:shadow-[var(--shadow)] transition-shadow duration-300 border border-[var(--line)] group flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-full bg-[var(--accent)]/20 flex items-center justify-center mb-6 group-hover:bg-[var(--accent)] transition-colors duration-300">
                    <Icon className="w-7 h-7 text-[var(--accent)] group-hover:text-black transition-colors duration-300" stroke={1.5} />
                  </div>
                  <h3 className="text-xl font-bold mb-4">{pillar.title}</h3>
                  <p className="text-[var(--ink-muted)] leading-relaxed text-sm text-balance">{pillar.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. TIS QUA CON SỐ - Dark Band */}
      <section className="home-section py-12 md:py-14 flex flex-col justify-center bg-[#0f172a] text-white reveal relative overflow-hidden">
        {/* Subtle background pattern/glow if needed */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--accent)] rounded-full blur-[120px] opacity-10 pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
        
        <div className="site-shell relative z-10 w-full">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-white">Công ty TIS qua con số</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            <div className="flex flex-col items-center text-center gap-2">
              <span className="text-4xl md:text-5xl font-bold text-[var(--accent)]">12+</span>
              <span className="text-sm md:text-base font-medium text-gray-400 uppercase tracking-wider">Năm hoạt động</span>
            </div>
            <div className="flex flex-col items-center text-center gap-2">
              <span className="text-4xl md:text-5xl font-bold text-[var(--accent)]">50+</span>
              <span className="text-sm md:text-base font-medium text-gray-400 uppercase tracking-wider">Nhân sự</span>
            </div>
            <div className="flex flex-col items-center text-center gap-2">
              <span className="text-4xl md:text-5xl font-bold text-[var(--accent)]">29 tỷ+</span>
              <span className="text-sm md:text-base font-medium text-gray-400 uppercase tracking-wider">Giá trị dự án</span>
            </div>
            <div className="flex flex-col items-center text-center gap-2">
              <span className="text-4xl md:text-5xl font-bold text-[var(--accent)]">12</span>
              <span className="text-sm md:text-base font-medium text-gray-400 uppercase tracking-wider">Đối tác thiết bị</span>
            </div>
          </div>
        </div>
      </section>

      <ContactFieldNote />
    </main>
  );
}
