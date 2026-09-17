import type { ProjectPillar } from "@/lib/projects-contract";

export type FeaturedProject = {
  name: string;
  client: string;
  location?: string;
  date: string;
  value: string;
  valueNumber: number;
  pillar: ProjectPillar;
  /** @deprecated Prefer `images` */
  image?: string;
  images?: string[];
};

export const featuredProjects: FeaturedProject[] = [
  {
    name: "Hệ thống camera an ninh khuôn viên",
    client: "Trường Đại học Y tế Công cộng",
    location: "Hà Nội",
    date: "19/10/2017",
    value: "804.491.604 VNĐ",
    valueNumber: 804491604,
    pillar: "it"
  },
  {
    name: "Hệ thống mạng, thoại và âm thanh",
    client: "Tòa nhà AZ Lâm Viên, 107 Nguyễn Phong Sắc",
    location: "Hà Nội",
    date: "22/05/2020",
    value: "908.106.000 VNĐ",
    valueNumber: 908106000,
    pillar: "it"
  },
  {
    name: "Trang bị thiết bị một cửa điện tử",
    client: "Các xã thuộc huyện Bắc Hà, Si Ma Cai, Mường Khương, Bát Xát",
    location: "Lào Cai",
    date: "12/10/2023",
    value: "22.186.327.987 VNĐ",
    valueNumber: 22186327987,
    pillar: "it"
  },
  {
    name: "Hệ thống cơ điện M&E và Điều hòa trung tâm HVAC",
    client: "Tòa nhà Văn phòng & Thương mại Hàng Bài",
    location: "Hà Nội",
    date: "15/12/2024",
    value: "4.500.000.000 VNĐ",
    valueNumber: 4500000000,
    pillar: "me",
    images: ["/images/projects/electrical-panel-installation.jpg"]
  },
  {
    name: "Điện mặt trời mái nhà - Hợp tác đầu tư",
    client: "Ban Quản lý Chợ Kim Tân",
    location: "Lào Cai",
    date: "04/2025",
    value: "500.000.000 VNĐ",
    valueNumber: 500000000,
    pillar: "renewable",
    images: [
      "/images/projects/cho_kim_tan/1.jpg",
      "/images/projects/cho_kim_tan/2.jpg",
      "/images/projects/cho_kim_tan/3.jpg",
      "/images/projects/cho_kim_tan/4.jpg"
    ]
  },
  {
    name: "Điện mặt trời mái nhà - Tự sản tự tiêu",
    client: "Công ty TNHH TM Tổng hợp Tuấn Phương, BQL Chợ Thuận Thành",
    location: "Bắc Ninh",
    date: "05/2025",
    value: "2.750.000.000 VNĐ",
    valueNumber: 2750000000,
    pillar: "renewable",
    images: [
      "/images/projects/cho_thuan_thanh/1.jpg",
      "/images/projects/cho_thuan_thanh/2.jpg",
      "/images/projects/cho_thuan_thanh/3.jpg"
    ]
  },
  {
    name: "Điện mặt trời mái nhà - Hợp tác đầu tư",
    client: "Công ty CP TM 69 Tuấn Hải, BQL Chợ đầu mối Ngã Tư Dâu",
    location: "Bắc Ninh",
    date: "04/08/2025",
    value: "1.800.000.000 VNĐ",
    valueNumber: 1800000000,
    pillar: "renewable",
    images: [
      "/images/projects/nga_tu_dau/1.jpg",
      "/images/projects/nga_tu_dau/2.jpg",
      "/images/projects/nga_tu_dau/3.jpg",
      "/images/projects/nga_tu_dau/4.jpg"
    ]
  },
  {
    name: "Điện mặt trời mái nhà - Khu thể thao giải trí",
    client: "Công ty CP TM 89 Long Hải, Thuận Thành",
    location: "Bắc Ninh",
    date: "22/08/2025",
    value: "1.200.000.000 VNĐ",
    valueNumber: 1200000000,
    pillar: "renewable"
  }
];
