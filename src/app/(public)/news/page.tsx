import type { Metadata } from "next";
import Link from "next/link";
import { IconArrowUpRight, IconListCheck, IconSun, IconWifi } from "@tabler/icons-react";
import { AboutBlueprintHero } from "@/components/about-blueprint-hero";
import { SupportTopicCard } from "@/components/support-topic-card";
import { company } from "@/content/company";
import { supportTopics, type SupportCategory, type SupportTopic } from "@/content/support";

export const metadata: Metadata = {
  title: "Hỗ trợ kỹ thuật",
  description: "Hướng dẫn thực tế cho hệ thống năng lượng mặt trời và mạng Wi-Fi từ Công ty TIS."
};

const categoryContent: Record<SupportCategory, {
  eyebrow: string;
  title: string;
  description: string;
}> = {
  solar: {
    eyebrow: "01 / Năng lượng",
    title: "Giữ hệ thống mặt trời vận hành đúng bài toán",
    description: "Từ bước chuẩn bị khảo sát đến kiểm tra inverter và sản lượng, bắt đầu bằng những dấu hiệu dễ quan sát nhất."
  },
  wifi: {
    eyebrow: "02 / Kết nối",
    title: "Mạng Wi-Fi ổn định bắt đầu từ cấu hình đúng",
    description: "Khoanh vùng vùng phủ sóng, thiết bị và bảo mật trước khi thay mới phần cứng hoặc mở rộng hệ thống."
  }
};

const solarTopics = supportTopics.filter((topic) => topic.category === "solar");
const wifiTopics = supportTopics.filter((topic) => topic.category === "wifi");

function SupportCategorySection({ category, topics }: { category: SupportCategory; topics: readonly SupportTopic[] }) {
  const content = categoryContent[category];
  const Icon = category === "solar" ? IconSun : IconWifi;

  return (
    <section id={`${category}-support`} className="site-shell section-space scroll-mt-24 pt-0" aria-labelledby={`${category}-heading`}>
      <div className="mb-10 grid gap-6 border-t border-[var(--line)] pt-6 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)] lg:items-end">
        <div>
          <p className="eyebrow mb-3">{content.eyebrow}</p>
          <div className="flex items-center gap-3">
            <Icon className="h-6 w-6 shrink-0 text-[var(--accent)]" stroke={1.7} aria-hidden="true" />
            <h2 id={`${category}-heading`}>{content.title}</h2>
          </div>
        </div>
        <p className="max-w-2xl text-base leading-7 text-[var(--ink-muted)]">{content.description}</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {topics.map((topic) => (
          <SupportTopicCard key={topic.id} topic={topic} />
        ))}
      </div>
    </section>
  );
}

export default function TechnicalSupportPage() {
  return (
    <main>
      <AboutBlueprintHero
        title="Trung tâm hỗ trợ kỹ thuật"
        description="Hướng dẫn thực tế, checklist bảo trì và cách khoanh vùng sự cố cho hệ thống điện mặt trời và mạng Wi-Fi."
        eyebrow="// Trung tâm hỗ trợ"
        titleId="support-blueprint-title"
        metricsIntro="Tổng quan hỗ trợ"
        signature="TIS / SUPPORT DESK"
        metrics={[
          { label: "Nhóm giải pháp", value: "02", detail: "Điện mặt trời · Mạng Wi-Fi", offset: "none" },
          { label: "Chủ đề hướng dẫn", value: String(supportTopics.length).padStart(2, "0"), detail: "Checklist theo từng triệu chứng", offset: "small" },
          { label: "Kết nối trực tiếp", value: "01", detail: `Hotline ${company.hotline}`, offset: "large" }
        ]}
      />

      <section className="site-shell pb-20 pt-0" aria-labelledby="support-orientation-heading">
        <div className="grid gap-8 border-t border-[var(--line)] pt-6 lg:grid-cols-[minmax(0,.75fr)_minmax(0,1.25fr)] lg:items-end">
          <div>
            <p className="eyebrow mb-3">Trung tâm hỗ trợ</p>
            <h2 id="support-orientation-heading" className="max-w-xl">Bắt đầu từ triệu chứng, xử lý theo từng bước.</h2>
            <p className="mt-4 max-w-xl text-[var(--ink-muted)] leading-7">
              Chọn nhóm vấn đề để xem checklist phù hợp trước khi liên hệ kỹ thuật. Các hướng dẫn giúp bạn thu thập đúng thông tin, không thay thế quy trình an toàn tại công trình.
            </p>
          </div>
          <nav className="grid gap-3 sm:grid-cols-2" aria-label="Chọn nhóm hỗ trợ">
            <Link className="group flex items-center justify-between gap-4 rounded-[16px] border border-[var(--line)] bg-[var(--surface)] p-5 transition hover:-translate-y-1 hover:border-[var(--accent)] hover:shadow-[var(--shadow)]" href="#solar-support">
              <span>
                <span className="block text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--accent)]">01</span>
                <span className="mt-2 block text-lg font-extrabold tracking-[-0.04em]">Điện mặt trời</span>
              </span>
              <IconSun className="h-6 w-6 shrink-0 text-[var(--accent)] transition-transform group-hover:rotate-12" stroke={1.7} aria-hidden="true" />
            </Link>
            <Link className="group flex items-center justify-between gap-4 rounded-[16px] border border-[var(--line)] bg-[var(--surface)] p-5 transition hover:-translate-y-1 hover:border-[var(--accent)] hover:shadow-[var(--shadow)]" href="#wifi-support">
              <span>
                <span className="block text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--accent)]">02</span>
                <span className="mt-2 block text-lg font-extrabold tracking-[-0.04em]">Mạng Wi-Fi</span>
              </span>
              <IconWifi className="h-6 w-6 shrink-0 text-[var(--accent)] transition-transform group-hover:rotate-12" stroke={1.7} aria-hidden="true" />
            </Link>
          </nav>
        </div>
      </section>

      <SupportCategorySection category="solar" topics={solarTopics} />
      <SupportCategorySection category="wifi" topics={wifiTopics} />

      <section className="site-shell section-space pt-0" aria-labelledby="support-escalation-heading">
        <div className="project-panel reveal grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="eyebrow mb-3 text-black/70">Chưa tìm thấy vấn đề?</p>
            <div className="flex items-start gap-3">
              <IconListCheck className="mt-1 h-7 w-7 shrink-0 text-black" stroke={1.7} aria-hidden="true" />
              <div>
                <h2 id="support-escalation-heading">Cần hỗ trợ trực tiếp từ kỹ sư Công ty TIS?</h2>
                <p className="max-w-2xl text-black/70">Gửi thông tin công trình hoặc gọi hotline để đội ngũ kỹ thuật cùng bạn xác định nguyên nhân và hướng xử lý phù hợp.</p>
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-[auto_auto] sm:items-center">
            <Link className="button-secondary border-black/30 text-black hover:border-black hover:bg-black/10" href="/contact">
              Gửi yêu cầu hỗ trợ <IconArrowUpRight className="ml-2 h-4 w-4" stroke={2} aria-hidden="true" />
            </Link>
            <a className="text-center text-sm font-extrabold text-black underline decoration-black/30 underline-offset-4 hover:decoration-black" href={`tel:${company.hotline.replace(/\s+/g, "")}`}>
              {company.hotline}
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
