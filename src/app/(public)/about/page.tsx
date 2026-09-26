import type { Metadata } from "next";
import { AboutBlueprintHero } from "@/components/about-blueprint-hero";
import styles from "./about.module.css";
import { company, vision, mission, coreValues, workforce, pillars, serviceLines } from "@/content/company";
import { IconBulb, IconDiamond, IconEye, IconHeartHandshake, IconHeart, IconTarget } from "@tabler/icons-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Giới thiệu",
  description: "Công ty TIS hoạt động từ năm 2013 trong lĩnh vực CNTT, cơ điện và năng lượng tái tạo.",
};

const valueIcons = {
  "Đổi mới sáng tạo": IconBulb,
  "Chất lượng vượt trội": IconDiamond,
  "Hợp tác bền vững": IconHeartHandshake,
  "Trách nhiệm xã hội": IconHeart,
} as const;

export default function AboutPage() {
  return (
    <main>
      <AboutBlueprintHero
        title="Về Công ty TIS"
        description="Công ty TIS hoạt động từ năm 2013 trong lĩnh vực CNTT, cơ điện và năng lượng tái tạo. Chúng tôi tư vấn, thiết kế và thi công giải pháp phù hợp với từng công trình."
        metrics={[
          { label: "Năm thành lập", value: company.established.slice(-4), detail: "Nền tảng đồng hành lâu dài", offset: "none" },
          { label: "Lĩnh vực cốt lõi", value: String(pillars.length).padStart(2, "0"), detail: "CNTT · Cơ điện · Năng\u00A0lượng", offset: "small" },
          { label: "Nhân sự chuyên môn", value: `${workforce.total}+`, detail: "Kỹ sư và kỹ thuật viên", offset: "large" }
        ]}
      />

      {/* 2. Company Overview */}
      <section className="site-shell section-space pt-0 grid gap-5 lg:grid-cols-2">
        <article className={`content-panel reveal ${styles.overviewPanel}`}>
          <h2>Thông tin doanh nghiệp</h2>
          <dl className="mt-5 grid gap-4 text-sm">
            <div className="grid grid-cols-[8rem_1fr] gap-2">
              <dt className="text-[var(--ink-muted)] font-medium">Tên pháp lý</dt>
              <dd>{company.legalNameVN}</dd>
            </div>
            <div className="grid grid-cols-[8rem_1fr] gap-2">
              <dt className="text-[var(--ink-muted)] font-medium">Mã số thuế</dt>
              <dd>{company.taxCode}</dd>
            </div>
            <div className="grid grid-cols-[8rem_1fr] gap-2">
              <dt className="text-[var(--ink-muted)] font-medium">Ngày thành lập</dt>
              <dd>{company.established}</dd>
            </div>
            <div className="grid grid-cols-[8rem_1fr] gap-2">
              <dt className="text-[var(--ink-muted)] font-medium">Người đại diện</dt>
              <dd>{company.representative} - {company.representativeTitle}</dd>
            </div>
            <div className="grid grid-cols-[8rem_1fr] gap-2">
              <dt className="text-[var(--ink-muted)] font-medium">Trụ sở chính</dt>
              <dd>{company.hq.address}</dd>
            </div>
            <div className="grid grid-cols-[8rem_1fr] gap-2">
              <dt className="text-[var(--ink-muted)] font-medium">VP giao dịch</dt>
              <dd>{company.office.address}</dd>
            </div>
            <div className="grid grid-cols-[8rem_1fr] gap-2">
              <dt className="text-[var(--ink-muted)] font-medium">Hotline</dt>
              <dd>
                <Link href={`tel:${company.hotline.replace(/\s+/g, '')}`} className="text-[var(--accent)] hover:underline">
                  {company.hotline}
                </Link>
              </dd>
            </div>
            <div className="grid grid-cols-[8rem_1fr] gap-2">
              <dt className="text-[var(--ink-muted)] font-medium">Email</dt>
              <dd>
                <Link href={`mailto:${company.email}`} className="text-[var(--accent)] hover:underline">
                  {company.email}
                </Link>
              </dd>
            </div>
          </dl>
        </article>

        <article className="content-panel reveal">
          <h2>Ba lĩnh vực chính</h2>
          <div className="mt-5 grid gap-5">
            {pillars.map((pillar, index) => (
              <div key={pillar.id} className="border-b border-[var(--line)] pb-5 last:border-0 last:pb-0 relative pl-10">
                <div className="absolute left-0 top-0.5 text-xl font-black text-[var(--accent)] opacity-50">
                  {(index + 1).toString().padStart(2, '0')}
                </div>
                <div className="flex items-center gap-2.5 mb-2">
                  <h3 className="font-semibold text-lg">{pillar.title}</h3>
                  <span className="text-[var(--ink-muted)] text-[0.7rem] uppercase tracking-wider px-2 py-0.5 bg-[var(--contact-grid-soft)] border border-[var(--line)] rounded">{pillar.titleEN}</span>
                </div>
                <p className="text-[var(--ink-muted)] leading-relaxed text-sm">{pillar.description}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      {/* 3. Vision & Mission */}
      <section className="site-shell section-space pt-0 grid gap-5 lg:grid-cols-2">
        <article className="content-panel reveal">
          <div className="flex items-center gap-3">
            <h2>Tầm nhìn</h2>
            <IconEye className="h-6 w-6 text-[var(--accent)]" stroke={1.7} aria-hidden="true" />
          </div>
          <p className="mt-4 leading-relaxed">{vision}</p>
        </article>
        <article className="content-panel reveal">
          <div className="flex items-center gap-3">
            <h2>Sứ mệnh</h2>
            <IconTarget className="h-6 w-6 text-[var(--accent)]" stroke={1.7} aria-hidden="true" />
          </div>
          <p className="mt-4 leading-relaxed">{mission}</p>
        </article>
      </section>

      {/* 4. Core Values */}
      <section className="site-shell section-space pt-0">
        <h2 className="text-center reveal">Giá trị cốt lõi</h2>
        <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-5">
          {coreValues.map((value) => {
            const Icon = valueIcons[value.title as keyof typeof valueIcons] || IconBulb;
            return (
              <div key={value.title} className="content-panel text-center flex flex-col items-center reveal">
                <div className="p-4 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] mb-5">
                  <Icon size={28} strokeWidth={1.6} />
                </div>
                <h3 className="font-bold">{value.title}</h3>
                <p className="text-[var(--ink-muted)] text-sm mt-2">{value.titleEN}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. Workforce */}
      <section className="site-shell section-space pt-0">
        <h2 className="reveal">Đội ngũ</h2>
        <div className="mt-8 grid md:grid-cols-3 gap-5 text-center">
          <div className="content-panel reveal">
            <div className="text-4xl font-bold text-[var(--accent)]">{workforce.total}+</div>
            <div className="mt-2 font-medium">Nhân sự</div>
          </div>
          <div className="content-panel reveal">
            <div className="text-4xl font-bold text-[var(--accent)]">{workforce.engineers}</div>
            <div className="mt-2 font-medium">Kỹ sư</div>
          </div>
          <div className="content-panel reveal">
            <div className="text-4xl font-bold text-[var(--accent)]">{workforce.technicians}+</div>
            <div className="mt-2 font-medium">Kỹ thuật viên</div>
          </div>
        </div>

        <div className="content-panel mt-5 reveal">
          <h3 className="font-semibold text-lg mb-4">Cơ cấu phòng ban</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {workforce.departments.map((dept) => (
              <div key={dept.name} className="flex justify-between border-b border-[var(--line)] pb-2 last:border-0">
                <span>{dept.name}</span>
                <span className="font-medium text-[var(--accent)]">{dept.count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Service Lines */}
      <section className="site-shell section-space pt-0">
        <div className="content-panel max-w-4xl reveal">
          <h2>Các lĩnh vực dịch vụ</h2>
          <ul className="check-list mt-5">
            {serviceLines.map((service, index) => (
              <li key={index}>{service}</li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
