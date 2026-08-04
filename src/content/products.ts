export type Product = {
  slug: string;
  title: string;
  shortTitle: string;
  summary: string;
  description: string;
  image: string;
  imageAlt: string;
  highlights: string[];
  application: string;
};

export const solarImages = {
  rooftop: "/images/projects/rooftop-panorama-worker.jpg",
  home: "/images/projects/rooftop-panels-colorful-buildings.jpg",
  installation: "/images/projects/electrical-panel-installation.jpg",
  field: "/images/projects/cho-kim-tan-rooftop-aerial-installer.jpg"
} as const;

export const products: Product[] = [
  {
    slug: "pin-nang-luong-mat-troi",
    title: "Tấm pin năng lượng mặt trời",
    shortTitle: "Tấm pin",
    summary: "Mô-đun phù hợp cho hệ mái dân dụng, thương mại và công trình công.",
    description:
      "TIS lựa chọn mô-đun theo điều kiện mái, hướng nắng và nhu cầu sử dụng điện của từng công trình.",
    image: solarImages.home,
    imageAlt: "Mái nhà lắp các tấm pin năng lượng mặt trời",
    highlights: [
      "Tư vấn theo diện tích mái thực tế",
      "Phối hợp đồng bộ cùng inverter và hệ khung",
      "Hồ sơ thiết bị rõ ràng trước khi triển khai"
    ],
    application: "Nhà ở, văn phòng và mái nhà xưởng"
  },
  {
    slug: "inverter-hoa-luoi",
    title: "Inverter hòa lưới",
    shortTitle: "Inverter",
    summary: "Thiết bị chuyển đổi được cấu hình theo quy mô và cách vận hành của hệ thống.",
    description:
      "Danh mục inverter được lựa chọn để vận hành ổn định với mô-đun, tải sử dụng và phương án giám sát phù hợp.",
    image: solarImages.installation,
    imageAlt: "Kỹ thuật viên kiểm tra hệ thống pin năng lượng mặt trời",
    highlights: [
      "Cấu hình theo nhu cầu tiêu thụ điện",
      "Tích hợp phương án theo dõi sản lượng",
      "Bàn giao hướng dẫn vận hành dễ hiểu"
    ],
    application: "Nhà ở, cửa hàng và doanh nghiệp"
  },
  {
    slug: "bo-luu-dien-hybrid",
    title: "Bộ lưu điện hybrid",
    shortTitle: "Lưu trữ hybrid",
    summary: "Giải pháp bổ sung cho công trình cần chủ động hơn trong cách sử dụng nguồn điện.",
    description:
      "TIS tư vấn hệ lưu trữ dựa trên mức độ ưu tiên tải, thời gian sử dụng và phương án điện phù hợp của công trình.",
    image: solarImages.field,
    imageAlt: "Hệ thống tấm pin năng lượng mặt trời dưới bầu trời xanh",
    highlights: [
      "Đánh giá nhu cầu lưu trữ trước khi đề xuất",
      "Kết hợp linh hoạt với hệ thống điện mặt trời",
      "Ưu tiên phương án vận hành rõ ràng"
    ],
    application: "Nhà ở, cơ sở giáo dục và công trình cần nguồn dự phòng"
  },
  {
    slug: "he-khung-lap-dat",
    title: "Hệ khung lắp đặt",
    shortTitle: "Hệ khung",
    summary: "Giải pháp cố định được xem xét cùng kết cấu mái và điều kiện thi công thực tế.",
    description:
      "Mỗi phương án lắp đặt cần phù hợp với loại mái, hướng bố trí và quy trình an toàn trong suốt quá trình thi công.",
    image: solarImages.rooftop,
    imageAlt: "Những hàng tấm pin điện mặt trời trên mái công trình",
    highlights: [
      "Khảo sát mái trước khi thiết kế phương án",
      "Bố trí gọn gàng theo mặt bằng công trình",
      "Kiểm tra đồng bộ khi nghiệm thu"
    ],
    application: "Mái tôn, mái bê tông và công trình thương mại"
  }
];

export function getProductBySlug(slug: string) {
  return products.find((product) => product.slug === slug);
}
