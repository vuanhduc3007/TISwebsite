export type FeaturedProject = {
  name: string;
  client: string;
  date: string;
  value: string;
  valueNumber: number;
  pillar: "it" | "renewable";
  image?: string;
};

export const featuredProjects: FeaturedProject[] = [
  {
    name: "Hệ thống camera an ninh khuôn viên",
    client: "Trường Đại học Y tế Công cộng",
    date: "19/10/2017",
    value: "804.491.604 VNĐ",
    valueNumber: 804491604,
    pillar: "it"
  },
  {
    name: "Hệ thống mạng, thoại và âm thanh",
    client: "Tòa nhà AZ Lâm Viên, 107 Nguyễn Phong Sắc, Cầu Giấy, Hà Nội",
    date: "22/05/2020",
    value: "908.106.000 VNĐ",
    valueNumber: 908106000,
    pillar: "it"
  },
  {
    name: "Trang bị thiết bị một cửa điện tử",
    client: "Các xã thuộc huyện Bắc Hà, Si Ma Cai, Mường Khương, Bát Xát, Bảo Yên, Văn Bàn, Lào Cai",
    date: "12/10/2023",
    value: "22.186.327.987 VNĐ",
    valueNumber: 22186327987,
    pillar: "it"
  },
  {
    name: "Điện mặt trời mái nhà - Hợp tác đầu tư",
    client: "Ban Quản lý Chợ Kim Tân, Lào Cai",
    date: "04/2025",
    value: "500.000.000 VNĐ",
    valueNumber: 500000000,
    pillar: "renewable",
    image: "/images/projects/cho-kim-tan-rooftop-panels-01.jpg"
  },
  {
    name: "Điện mặt trời mái nhà - Tự sản tự tiêu",
    client: "Công ty TNHH TM Tổng hợp Tuấn Phương, BQL Chợ Thuận Thành, Bắc Ninh",
    date: "05/2025",
    value: "2.750.000.000 VNĐ",
    valueNumber: 2750000000,
    pillar: "renewable",
    image: "/images/projects/cho-thuan-thanh-exterior.jpg"
  },
  {
    name: "Điện mặt trời mái nhà - Hợp tác đầu tư",
    client: "Công ty CP TM 69 Tuấn Hải, BQL Chợ đầu mối Ngã Tư Dâu, Bắc Ninh",
    date: "04/08/2025",
    value: "1.800.000.000 VNĐ",
    valueNumber: 1800000000,
    pillar: "renewable",
    image: "/images/projects/cho-nga-tu-dau-exterior.jpg"
  },
  {
    name: "Điện mặt trời mái nhà - Khu thể thao giải trí",
    client: "Công ty CP TM 89 Long Hải, Thuận Thành, Bắc Ninh",
    date: "22/08/2025",
    value: "1.200.000.000 VNĐ",
    valueNumber: 1200000000,
    pillar: "renewable"
  }
];
