import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";

export const metadata: Metadata = {
  title: "Tin tức"
};

const articles = [
  {
    title: "Hệ thống mạng và an ninh cho tòa nhà - bắt đầu từ đâu?",
    body: "Trước khi lựa chọn thiết bị, cần hiểu rõ quy mô tòa nhà, số lượng người dùng và yêu cầu bảo mật để có phương án phù hợp."
  },
  {
    title: "Chuyển đổi số cho cơ quan hành chính",
    body: "Trang bị một cửa điện tử và hệ thống CNTT cho cấp xã, huyện đòi hỏi khảo sát thực tế và kế hoạch triển khai theo từng giai đoạn."
  },
  {
    title: "Hệ thống HVAC cần những yếu tố nào để vận hành hiệu quả?",
    body: "Thiết kế hệ thống điều hòa phù hợp bắt đầu từ diện tích, công năng sử dụng và điều kiện khí hậu của công trình."
  },
  {
    title: "Tư vấn công trình điện - những điều cần biết",
    body: "Thi công hệ thống điện cần tuân thủ tiêu chuẩn an toàn và phù hợp với công suất sử dụng thực tế của công trình."
  },
  {
    title: "Trước khi lắp điện mặt trời mái nhà, nên chuẩn bị gì?",
    body: "Bắt đầu từ hiện trạng mái, thói quen sử dụng điện và khu vực dự kiến đặt thiết bị để buổi tư vấn có cơ sở hơn."
  },
  {
    title: "Khi nào nên tìm hiểu thêm giải pháp lưu trữ?",
    body: "Nhu cầu chủ động nguồn điện và các tải cần ưu tiên là điểm khởi đầu để trao đổi về hệ hybrid."
  }
];

export default function NewsPage() {
  return (
    <main>
      <PageHero
        title="Kiến thức ngành"
        description="Những nội dung cơ bản về CNTT, cơ điện và năng lượng tái tạo giúp bạn bắt đầu cuộc trao đổi với TIS bằng thông tin rõ ràng hơn."
        image="/images/projects/electrical-panel-installation.jpg"
        imageAlt="Kỹ thuật viên làm việc với tủ điện"
      />
      <section className="site-shell section-space pt-0">
        <div className="article-list">
          {articles.map((article) => (
            <article className="reveal" key={article.title}>
              <h2>{article.title}</h2>
              <p>{article.body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
