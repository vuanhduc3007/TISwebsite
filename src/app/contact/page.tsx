import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";
import { PageHero } from "@/components/page-hero";
import { company } from "@/content/company";
import { IconMapPin, IconPhone, IconMail } from "@tabler/icons-react";

export const metadata: Metadata = {
  title: "Liên hệ"
};

export default function ContactPage() {
  return (
    <main>
      <PageHero
        title="Trao đổi cùng TIS"
        description="Cho chúng tôi biết công trình hoặc nhóm thiết bị bạn đang quan tâm. Thông tin ban đầu càng rõ, tư vấn càng sát nhu cầu."
        image="/images/projects/rooftop-panels-colorful-buildings.jpg"
        imageAlt="Công trình lắp đặt hệ thống điện mặt trời"
      />
      <section className="site-shell section-space pt-0 grid gap-8 lg:grid-cols-[.75fr_1.25fr] lg:items-start">
        <div className="reveal space-y-8">
          <div>
            <h2>Thông tin liên hệ</h2>
            <p className="text-sm text-ink-muted mt-2">{company.legalNameVN}</p>
          </div>
          <ul className="space-y-6">
            <li className="flex gap-4">
              <IconMapPin className="shrink-0 text-accent mt-1" />
              <div>
                <p className="font-semibold">{company.hq.label}</p>
                <p className="text-ink-muted">{company.hq.address}</p>
              </div>
            </li>
            <li className="flex gap-4">
              <IconMapPin className="shrink-0 text-accent mt-1" />
              <div>
                <p className="font-semibold">{company.office.label}</p>
                <p className="text-ink-muted">{company.office.address}</p>
              </div>
            </li>
            <li className="flex gap-4 items-center">
              <IconPhone className="shrink-0 text-accent" />
              <a href="tel:0988761315" className="font-semibold hover:text-accent transition-colors">{company.hotline}</a>
            </li>
            <li className="flex gap-4 items-center">
              <IconMail className="shrink-0 text-accent" />
              <a href={`mailto:${company.email}`} className="font-semibold hover:text-accent transition-colors">{company.email}</a>
            </li>
          </ul>
          <p className="text-sm italic text-ink-muted">{company.motto}</p>
        </div>
        <div className="reveal">
          <div className="mb-8">
            <h2>Bắt đầu từ thông tin thực tế</h2>
            <p className="section-lede">Bạn có thể nêu loại công trình, khu vực mái hoặc danh mục thiết bị đang cần tìm hiểu. Đó là đủ để cuộc trao đổi đầu tiên đi đúng trọng tâm.</p>
          </div>
          <ContactForm />
        </div>
      </section>
    </main>
  );
}
