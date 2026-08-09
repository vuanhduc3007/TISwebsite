export type SupportCategory = "solar" | "wifi";

export type SupportIcon = "sun" | "bolt" | "battery" | "wifi" | "router" | "shield";

export type SupportTopic = {
  id: string;
  category: SupportCategory;
  categoryLabel: string;
  title: string;
  summary: string;
  checks: readonly string[];
  icon: SupportIcon;
};

export const supportTopics = [
  {
    id: "solar-inverter-not-starting",
    category: "solar",
    categoryLabel: "Năng lượng mặt trời",
    title: "Inverter không khởi động hoặc không phát điện",
    summary: "Một vài bước kiểm tra an toàn giúp khoanh vùng sự cố trước khi cần kỹ thuật viên can thiệp.",
    checks: [
      "Kiểm tra trạng thái aptomat và công tắc DC theo hướng dẫn của thiết bị.",
      "Ghi lại mã cảnh báo, thời điểm xuất hiện và trạng thái trên màn hình inverter.",
      "Không tự mở thiết bị; gửi hình ảnh mã lỗi cho đội ngũ kỹ thuật nếu cảnh báo vẫn còn."
    ],
    icon: "bolt"
  },
  {
    id: "solar-low-output",
    category: "solar",
    categoryLabel: "Năng lượng mặt trời",
    title: "Sản lượng điện mặt trời thấp hơn bình thường",
    summary: "So sánh dữ liệu giám sát với điều kiện thời tiết và hiện trạng mái để tìm nguyên nhân thực tế.",
    checks: [
      "Kiểm tra bóng che mới phát sinh trên bề mặt tấm pin trong các khung giờ chính.",
      "Đối chiếu sản lượng giữa các ngày có điều kiện nắng tương đương.",
      "Quan sát cảnh báo trên ứng dụng giám sát và tình trạng vệ sinh của tấm pin."
    ],
    icon: "sun"
  },
  {
    id: "solar-rooftop-prep",
    category: "solar",
    categoryLabel: "Năng lượng mặt trời",
    title: "Chuẩn bị gì trước khi lắp điện mặt trời mái nhà",
    summary: "Chuẩn bị đúng thông tin từ đầu giúp buổi khảo sát nhanh hơn và phương án sát với nhu cầu sử dụng.",
    checks: [
      "Tổng hợp hóa đơn điện hoặc mức tiêu thụ theo các tháng gần nhất.",
      "Kiểm tra hiện trạng mái, hướng mái, khu vực bóng che và lối tiếp cận.",
      "Xác định các tải ưu tiên và vị trí dự kiến cho inverter, tủ điện, pin lưu trữ."
    ],
    icon: "battery"
  },
  {
    id: "wifi-weak-coverage",
    category: "wifi",
    categoryLabel: "Mạng Wi-Fi",
    title: "Wi-Fi yếu ở một số khu vực trong nhà",
    summary: "Tín hiệu yếu thường liên quan đến vị trí đặt thiết bị, vật cản hoặc cách phân bổ điểm phát.",
    checks: [
      "Đo thử tín hiệu ở khu vực yếu và ghi lại thời điểm thường xảy ra.",
      "Đặt router cao, thoáng, gần vùng trung tâm thay vì trong tủ hoặc góc khuất.",
      "Kiểm tra nhu cầu bổ sung access point và ưu tiên kết nối backhaul có dây."
    ],
    icon: "wifi"
  },
  {
    id: "wifi-disconnected-devices",
    category: "wifi",
    categoryLabel: "Mạng Wi-Fi",
    title: "Thiết bị thường xuyên mất kết nối",
    summary: "Xác định thiết bị, băng tần và thời điểm rớt mạng giúp phân biệt lỗi phủ sóng với lỗi đường truyền.",
    checks: [
      "Kiểm tra dây mạng, nguồn cấp và đèn trạng thái trên router hoặc switch.",
      "Cập nhật firmware theo phiên bản ổn định được nhà sản xuất khuyến nghị.",
      "Tách nhóm thiết bị IoT hoặc khách và theo dõi tải khi nhiều thiết bị truy cập cùng lúc."
    ],
    icon: "router"
  },
  {
    id: "wifi-network-security",
    category: "wifi",
    categoryLabel: "Mạng Wi-Fi",
    title: "Đặt mật khẩu và bảo vệ mạng Wi-Fi",
    summary: "Một cấu hình bảo mật cơ bản nhưng đúng cách giúp giảm truy cập lạ và giữ mạng ổn định hơn.",
    checks: [
      "Dùng mật khẩu dài, riêng biệt và bật WPA2 hoặc WPA3 nếu thiết bị hỗ trợ.",
      "Đổi thông tin đăng nhập quản trị mặc định của router.",
      "Tạo mạng khách riêng và tắt WPS khi không cần sử dụng."
    ],
    icon: "shield"
  }
] as const satisfies readonly SupportTopic[];
