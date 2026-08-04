import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { company, vision, mission, coreValues, workforce, pillars, serviceLines } from "@/content/company";
import { IconBulb, IconDiamond, IconHeartHandshake, IconHeart } from "@tabler/icons-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Giới thiệu",
  description: "TIS hoạt động từ năm 2013 trong lĩnh vực CNTT, cơ điện và năng lượng tái tạo.",
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
      <PageHero
        title="Về TIS"
        description="TIS hoạt động từ năm 2013 trong lĩnh vực CNTT, cơ điện và năng lượng tái tạo. Chúng tôi tư vấn, thiết kế và thi công giải pháp phù hợp với từng công trình."
        image="/images/projects/rooftop-panorama-worker.jpg"
        imageAlt="Đội ngũ TIS thi công trên mái công trình"
      />

      {/* 2. Company Overview */}
      <section className="site-shell section-space pt-0 grid gap-5 lg:grid-cols-2">
        <article className="content-panel reveal">
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
            {pillars.map((pillar) => (
              <div key={pillar.id} className="border-b border-[var(--line)] pb-4 last:border-0 last:pb-0">
                <h3 className="font-semibold text-lg">{pillar.title}</h3>
                <p className="text-[var(--ink-muted)] text-sm">{pillar.titleEN}</p>
                <p className="mt-1">{pillar.description}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      {/* 3. Vision & Mission */}
      <section className="site-shell section-space pt-0 grid gap-5 lg:grid-cols-2">
        <article className="content-panel reveal">
          <h2>Tầm nhìn</h2>
          <p className="mt-4 leading-relaxed">{vision}</p>
        </article>
        <article className="content-panel reveal">
          <h2>Sứ mệnh</h2>
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
                <div className="p-4 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] mb-4">
                  <Icon size={28} strokeWidth={1.6} />
                </div>
                <h3 className="font-bold">{value.title}</h3>
                <p className="text-[var(--ink-muted)] text-sm mt-1">{value.titleEN}</p>
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
