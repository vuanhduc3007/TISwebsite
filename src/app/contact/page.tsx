import type { Metadata } from "next";
import { ContactBlueprint } from "@/components/contact-blueprint";
import { company } from "@/content/company";

export const metadata: Metadata = {
  title: "Trao đổi cùng TIS",
  description: "Trao đổi cùng TIS về công trình, thiết bị và giải pháp CNTT, cơ điện, năng lượng tái tạo."
};

export default function ContactPage() {
  return (
    <main>
      <ContactBlueprint
        title="Trao đổi cùng TIS"
        description="Cho chúng tôi biết công trình hoặc nhóm thiết bị bạn đang quan tâm. Thông tin ban đầu càng rõ, tư vấn càng sát nhu cầu."
        legalName={company.legalNameVN}
        motto={company.motto}
        formDescription="Bạn có thể nêu loại công trình, khu vực mái hoặc danh mục thiết bị đang cần tìm hiểu. Đó là đủ để cuộc trao đổi đầu tiên đi đúng trọng tâm."
        metrics={[
          { label: company.hq.label, value: company.hq.address, icon: "map-pin", offset: "none" },
          { label: company.office.label, value: company.office.address, icon: "map-pin", offset: "small" },
          { label: "Hotline", value: company.hotline, icon: "phone", href: `tel:${company.hotline.replace(/\s+/g, "")}`, offset: "large" },
          { label: "Email", value: company.email, icon: "mail", href: `mailto:${company.email}`, offset: "small" }
        ]}
      />
    </main>
  );
}
