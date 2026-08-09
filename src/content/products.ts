export type ProductModel = {
  brand?: string;
  logo?: string;
  image: string;
};

export type Product = {
  slug: string;
  title: string;
  shortTitle: string;
  summary: string;
  description: string[];
  image: string;
  imageAlt: string;
  application: string;
  
  profileTitle: string;
  strengthsTitle?: string;
  strengths?: string[];
  models: ProductModel[];
};

export const solarImages = {
  rooftop: "/images/projects/cho-kim-tan-crane-install.jpg",
  home: "/images/projects/cho-kim-tan-rooftop-panels-02.jpg",
  installation: "/images/projects/electrical-panel-installation.jpg",
  field: "/images/projects/cho-kim-tan-exterior-01.jpg"
} as const;

export const products: Product[] = [
  {
    slug: "he-thong-luu-tru-bess",
    title: "Hệ thống lưu trữ năng lượng mặt trời BESS",
    shortTitle: "Hệ thống lưu trữ năng lượng mặt trời BESS",
    summary: "Giải pháp lưu trữ tiên tiến giúp tận dụng tối đa nguồn năng lượng sạch, tăng cường sự ổn định của hệ thống điện.",
    description: [
      "Hệ thống lưu trữ năng lượng mặt trời BESS (Battery Energy Storage System) là một giải pháp tiên tiến giúp lưu trữ và tái sử dụng nguồn điện từ năng lượng mặt trời. Đây chính là bước tiến quan trọng hướng đến một tương lai năng lượng xanh và bền vững.",
      "Các sản phẩm do Công ty Cổ phần Thương mại và Dịch vụ Tin học Viễn thông TIS phân phối và lắp đặt đều được lựa chọn từ những nhà cung cấp hàng đầu thế giới trong lĩnh vực lưu trữ năng lượng. Nhờ vậy, các giải pháp mà TIS mang lại không chỉ đảm bảo chất lượng kỹ thuật vượt trội mà còn tối ưu về chi phí, mang lại giá trị cao nhất cho khách hàng."
    ],
    image: solarImages.field,
    imageAlt: "Hệ thống lưu trữ năng lượng BESS",
    application: "Trạm biến áp, khu công nghiệp và dự án điện lớn",
    
    profileTitle: "HỆ THỐNG LƯU TRỮ NĂNG LƯỢNG MẶT TRỜI BESS",
    strengthsTitle: "Lợi ích của hệ thống lưu trữ BESS:",
    strengths: [
      "Lưu trữ và tái sử dụng nguồn điện từ năng lượng mặt trời một cách hiệu quả.",
      "Sử dụng pin lithium-ion và công nghệ hiện đại để tối ưu hóa nguồn điện.",
      "Tận dụng tối đa nguồn năng lượng sạch, giảm lãng phí trong quá trình vận hành.",
      "Tăng cường sự ổn định và độ tin cậy của toàn bộ hệ thống điện lưới."
    ],
    models: [
      { image: "/images/products/bess-container-unit.png" },
      { image: "/images/products/bess-outdoor-cabinet.png" },
      { image: "/images/products/bess-rack-unit-01.png" },
      { image: "/images/products/bess-tower-unit.png" },
      { image: "/images/products/bess-jinko-cabinet.png" }
    ]
  },
  {
    slug: "inverter-hoa-luoi",
    title: "Danh mục biến tần năng lượng mặt trời",
    shortTitle: "Danh mục biến tần năng lượng mặt trời",
    summary: "Thiết bị chuyển đổi được cấu hình theo quy mô và cách vận hành của hệ thống.",
    description: [
      "Công ty Cổ phần Thương mại và Dịch vụ Tin học Viễn thông TIS cung cấp các dòng inverter năng lượng mặt trời hiệu suất cao, được tuyển chọn kỹ lưỡng bởi đội ngũ chuyên gia kỹ thuật. Các sản phẩm TIS phân phối đều được đánh giá cao về độ ổn định, uy tín thương hiệu, tính dễ sử dụng và độ bền, mang lại cho khách hàng giải pháp tối ưu với chi phí hợp lý nhất."
    ],
    image: solarImages.installation,
    imageAlt: "Kỹ thuật viên kiểm tra hệ thống pin năng lượng mặt trời",
    application: "Nhà ở, cửa hàng và doanh nghiệp",
    
    profileTitle: "DANH MỤC BIẾN TẦN NĂNG LƯỢNG MẶT TRỜI",
    strengthsTitle: "Điểm mạnh của Inverter năng lượng mặt trời:",
    strengths: [
      "Hỗ trợ hệ thống năng lượng mặt trời thân thiện với môi trường, góp phần giảm thiểu hiệu ứng nhà kính.",
      "Tối ưu hóa dòng điện cho thiết bị, giúp tiết kiệm năng lượng và chi phí điện.",
      "Đa dạng kích cỡ, phù hợp cho hệ thống từ quy mô nhỏ đến lớn.",
      "Trang bị tính năng giám sát, theo dõi hoạt động toàn bộ hệ thống năng lượng mặt trời."
    ],
    models: [
      { brand: "Solis", logo: "/images/partners/solis.png", image: "/images/products/inverter-white-unit-01.png" },
      { brand: "Growatt", logo: "/images/partners/growatt.svg", image: "/images/products/inverter-growatt-style.png" },
      { brand: "SolarEdge", logo: "/images/partners/solaredge.svg", image: "/images/products/inverter-solaredge-style.png" },
      { brand: "Huawei", logo: "/images/partners/huawei.png", image: "/images/products/inverter-white-unit-02.png" },
      { brand: "GoodWe", logo: "/images/partners/goodwe.svg", image: "/images/products/inverter-goodwe-style.png" },
      { brand: "Deye", logo: "/images/partners/deye.png", image: "/images/products/inverter-red-unit.png" },
      { brand: "Fronius", logo: "/images/partners/fronius.svg", image: "/images/products/inverter-fronius.png" },
      { brand: "Sungrow", logo: "/images/partners/sungrow.svg", image: "/images/products/inverter-sungrow.png" }
    ]
  }
];

export function getProductBySlug(slug: string) {
  return products.find((product) => product.slug === slug);
}
