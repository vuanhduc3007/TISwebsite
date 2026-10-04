import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

async function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...valueParts] = trimmed.split("=");
    if (key && !process.env[key.trim()]) {
      process.env[key.trim()] = valueParts.join("=").trim();
    }
  }
}

function normalizeSlugPart(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function generateProductDetails(product) {
  const { id, category_id, name, brand, price } = product;
  const numPrice = Number(String(price).replace(/[^0-9]/g, ""));
  const hasValidPrice = Number.isSafeInteger(numPrice) && numPrice > 0;
  const price_amount = hasValidPrice ? numPrice : null;
  const price_label = hasValidPrice ? null : "Liên hệ";
  const slug = `san-pham-${id}`;
  const image_alt = `${name} - Chính hãng ${brand}`;
  const sort_order = id * 10;
  const status = "published";

  let description = "";
  let specifications = [];

  // ==========================================
  // CATEGORY 1: TẤM PIN NĂNG LƯỢNG MẶT TRỜI
  // ==========================================
  if (category_id === 1) {
    let power = "550 Wp";
    let tech = "Đơn tinh thể Mono PERC";
    let efficiency = "21.5%";
    let dimensions = "2278 x 1134 x 35 mm";
    let weight = "28.5 kg";
    let voc = "49.8 V";
    let isc = "14.05 A";
    let vmp = "41.8 V";
    let imp = "13.16 A";
    let warrantyProd = "12 năm vật lý";
    let warrantyPerf = "25 năm hiệu suất trên 84.8%";
    let glass = "Kính cường lực 3.2 mm phủ lớp chống phản xạ";

    const isBifacial = /hai mat kinh|2 mat kinh|bifacial|bdv/i.test(name);
    const isNType = /n-type|n type|topcon/i.test(name) || /osda n|tiger neo/i.test(name);
    const isHPBC = /hi-mo x10|hi mo x10|hi-mo x6|hi-mo 9|hi mo 9|hpbc/i.test(name);

    if (isBifacial) {
      glass = "Kính cường lực 2 mặt (2.0mm + 2.0mm)";
      warrantyPerf = "30 năm hiệu suất tuyến tính (trên 87.4%)";
    }

    if (name.includes("620W") || name.includes("605-625W") || name.includes("Hi-MO 9")) {
      power = "620 Wp";
      efficiency = "23.0%";
      dimensions = "2382 x 1134 x 30 mm";
      weight = "33.5 kg";
      voc = "55.4 V";
      isc = "14.15 A";
      vmp = "46.2 V";
      imp = "13.42 A";
    } else if (name.includes("590W")) {
      power = "590 Wp";
      efficiency = "22.84%";
      dimensions = "2278 x 1134 x 30 mm";
      weight = "31.8 kg";
      voc = "51.5 V";
      isc = "14.45 A";
      vmp = "43.1 V";
      imp = "13.69 A";
    } else if (name.includes("560-580W") || name.includes("565-585W") || name.includes("570")) {
      power = "580 Wp";
      efficiency = "22.45%";
      dimensions = "2278 x 1134 x 30 mm";
      weight = "31.2 kg";
      voc = "51.1 V";
      isc = "14.36 A";
      vmp = "42.8 V";
      imp = "13.55 A";
    } else if (name.includes("545W") || name.includes("540-560W") || name.includes("540~560M") || name.includes("530-550W")) {
      power = "550 Wp";
      efficiency = "21.5%";
      dimensions = "2278 x 1134 x 35 mm";
      weight = "28.6 kg";
      voc = "49.8 V";
      isc = "13.98 A";
      vmp = "41.9 V";
      imp = "13.13 A";
    } else if (name.includes("460W") || name.includes("465W") || name.includes("480Wp")) {
      power = name.includes("480") ? "480 Wp" : name.includes("465") ? "465 Wp" : "460 Wp";
      efficiency = "21.16%";
      dimensions = "2094 x 1038 x 35 mm";
      weight = "24.5 kg";
      voc = "42.1 V";
      isc = "13.85 A";
      vmp = "35.2 V";
      imp = "13.07 A";
    } else if (name.includes("405~425M") || name.includes("385-405W") || name.includes("320-340W")) {
      const matchP = name.match(/(\d{3})/);
      power = matchP ? `${matchP[1]} Wp` : "400 Wp";
      efficiency = "20.5%";
      dimensions = "1722 x 1134 x 30 mm";
      weight = "21.5 kg";
      voc = "37.5 V";
      isc = "13.65 A";
      vmp = "31.2 V";
      imp = "12.82 A";
    }

    if (isHPBC) {
      tech = "N-Type HPBC thế hệ mới (Không thanh busbar mặt trước)";
      warrantyProd = "15 năm chính hãng";
      warrantyPerf = "30 năm hiệu suất (suy giảm năm đầu < 1%)";
    } else if (isNType) {
      tech = "N-Type TOPCon Half-cut Cell đa thanh dẫn (SMBB)";
      warrantyProd = "12 năm chính hãng";
      warrantyPerf = "30 năm hiệu suất (suy giảm hàng năm < 0.4%)";
    }

    description = `${name} là dòng pin quang điện cao cấp đến từ thương hiệu hàng đầu thế giới ${brand}, ứng dụng công nghệ tế bào quang điện tiên tiến mang lại hiệu suất chuyển đổi quang năng tối đa cùng độ suy giảm thấp vượt trội theo thời gian.\n\nSản phẩm sở hữu cấu trúc khung hợp kim nhôm mạ anodized chắc chắn kết hợp mặt kính cường lực chịu tải trọng gió 2400Pa và tải trọng tuyết lên tới 5400Pa. Hộp nối dây đạt chuẩn chống nước bụi IP68 tích hợp diode bypass giúp triệt tiêu hiện tượng hot-spot và hạn chế tối đa tổn hao do bóng râm che khuất.\n\nĐược thiết kế tối ưu cho cả hệ thống điện mặt trời áp mái dân dụng, thương mại công nghiệp (C&I) và nhà máy điện mặt trời quy mô lớn, tấm pin đảm bảo mang lại hệ số hoàn vốn đầu tư (ROI) nhanh chóng cùng độ bền bỉ dài lâu suốt hơn 25 - 30 năm vận hành.`;

    specifications = [
      { label: "Công suất danh định (Pmax)", value: power },
      { label: "Công nghệ Cell", value: tech },
      { label: "Hiệu suất tấm pin", value: efficiency },
      { label: "Điện áp hở mạch (Voc)", value: voc },
      { label: "Dòng điện ngắn mạch (Isc)", value: isc },
      { label: "Điện áp danh định (Vmp)", value: vmp },
      { label: "Dòng điện danh định (Imp)", value: imp },
      { label: "Kích thước & Trọng lượng", value: `${dimensions} | ${weight}` },
      { label: "Cấu tạo mặt kính", value: glass },
      { label: "Cấp độ bảo vệ", value: "IP68 (3 bypass diodes), cáp 4mm²" },
      { label: "Bảo hành vật lý", value: warrantyProd },
      { label: "Bảo hành hiệu suất", value: warrantyPerf }
    ];
  }

  // ==========================================
  // CATEGORY 2: BIẾN TẦN INVERTER
  // ==========================================
  else if (category_id === 2) {
    const isHybrid = /hybrid/i.test(name);
    const is3P = /3 pha|3P|30-50|8-18|GR3P|MAX|MID|SG04LP3|SG01LP3|T\/EU|M1|M5/i.test(name);
    const matchKw = name.match(/(\d+(?:\.\d+)?)\s*(?:kw|KTL|K\b|K0|KW)/i);
    let powerKw = matchKw ? `${matchKw[1]} kW` : "10 kW";

    if (name.includes("125KW") || name.includes("MAX125")) powerKw = "125 kW";
    else if (name.includes("110kW") || name.includes("110K")) powerKw = "110 kW";
    else if (name.includes("80KW") || name.includes("80K")) powerKw = "80 kW";
    else if (name.includes("60K")) powerKw = "60 kW";
    else if (name.includes("50K")) powerKw = "50 kW";
    else if (name.includes("40K") || name.includes("40KW")) powerKw = "40 kW";
    else if (name.includes("30K") || name.includes("30KW")) powerKw = "30 kW";
    else if (name.includes("25K") || name.includes("25KW")) powerKw = "25 kW";
    else if (name.includes("20K") || name.includes("20KW")) powerKw = "20 kW";
    else if (name.includes("16K")) powerKw = "16 kW";
    else if (name.includes("15K") || name.includes("15KW")) powerKw = "15 kW";
    else if (name.includes("12K")) powerKw = "12 kW";
    else if (name.includes("10K") || name.includes("10000") || name.includes("10kw")) powerKw = "10 kW";
    else if (name.includes("8K") || name.includes("8000") || name.includes("8kw")) powerKw = "8 kW";
    else if (name.includes("6K") || name.includes("6500") || name.includes("6kw")) powerKw = "6 kW";
    else if (name.includes("5K") || name.includes("5000") || name.includes("5kw")) powerKw = "5 kW";
    else if (name.includes("4K") || name.includes("4kw")) powerKw = "4 kW";
    else if (name.includes("3K") || name.includes("3000") || name.includes("3kw") || name.includes("3.6K")) powerKw = name.includes("3.6K") ? "3.6 kW" : "3 kW";
    else if (name.includes("2K") || name.includes("2kw")) powerKw = "2 kW";

    let mpptCount = "2 MPPT";
    if (name.includes("1 MPPT") || name.includes("1MPPT") || name.includes("HPK-3000") || name.includes("MIC3000")) mpptCount = "1 MPPT";
    else if (name.includes("3 MPPT") || name.includes("3MPPT")) mpptCount = "3 MPPT";
    else if (name.includes("4 MPPT") || name.includes("4MPPT") || name.includes("80K") || name.includes("50K") || name.includes("60K")) mpptCount = "4 MPPT";
    else if (name.includes("6 MPPT") || name.includes("6MPPT") || name.includes("110K") || name.includes("125K")) mpptCount = "6 - 8 MPPT";

    const phase = is3P ? "3 Pha (380V / 400V, 3L+N+PE)" : "1 Pha (220V / 230V, L+N+PE)";
    const maxEfficiency = is3P ? "98.6% - 98.8%" : "97.6% - 98.2%";
    const maxPvVoltage = is3P ? "1000V - 1100V DC" : "550V - 600V DC";
    const mpptVoltageRange = is3P ? "160V – 960V DC" : "90V – 520V DC";

    if (isHybrid) {
      description = `${name} là thiết bị biến tần lưu trữ thông minh (Hybrid Inverter) cao cấp đến từ thương hiệu ${brand}, giải pháp toàn diện cho nguồn điện ổn định 24/7. Thiết bị cho phép điều phối linh hoạt giữa nguồn năng lượng mặt trời, pin lưu trữ và điện lưới quốc gia.\n\nSản phẩm sở hữu chức năng chuyển đổi nguồn dự phòng UPS siêu tốc (< 10ms), đảm bảo các tải quan trọng không bị gián đoạn khi xảy ra sự cố mất điện lưới. Tích hợp màn hình cảm ứng LCD hoặc đèn hiển thị LED trực quan, cùng cổng kết nối thông minh Wi-Fi/4G giúp theo dõi sản lượng và quản lý năng lượng theo thời gian thực trên điện thoại di động.\n\nTương thích hoàn hảo với các dòng pin lưu trữ Lithium điện áp thấp (48V/51.2V) hoặc áp cao (High Voltage), hỗ trợ cài đặt xả theo giờ cao điểm (Peak-shaving) và kiểm soát bám tải không phát ngược lưới Zero-Export an toàn, thông minh.`;

      specifications = [
        { label: "Loại biến tần", value: `Biến tần lưu trữ Hybrid ${is3P ? "3 Pha" : "1 Pha"}` },
        { label: "Công suất AC định mức", value: powerKw },
        { label: "Điện áp đầu ra lưới", value: phase },
        { label: "Điện áp đầu vào PV cực đại", value: maxPvVoltage },
        { label: "Dải điện áp MPPT", value: mpptVoltageRange },
        { label: "Số lượng MPPT", value: mpptCount },
        { label: "Tương thích pin lưu trữ", value: name.includes("Áp Cao") || name.includes("-H") ? "Pin Lithium áp cao HV (160V - 600V)" : "Pin Lithium 48V / 51.2V (LiFePO4)" },
        { label: "Thời gian chuyển mạch UPS", value: "< 10 ms (Cấp nguồn liên tục không ngắt quãng)" },
        { label: "Hiệu suất tối đa", value: maxEfficiency },
        { label: "Cấp độ bảo vệ môi trường", value: "IP65 / IP66 (Lắp đặt trong nhà hoặc ngoài trời)" },
        { label: "Cổng giao tiếp giám sát", value: "RS485, CAN, Wi-Fi / LAN, DRM" },
        { label: "Bảo hành tiêu chuẩn", value: "5 năm chính hãng (Mở rộng tùy chọn đến 10 năm)" }
      ];
    } else {
      description = `${name} là dòng biến tần hòa lưới (On-grid Inverter) hiệu suất cao của thương hiệu ${brand}, được tối ưu hóa cho hiệu năng phát điện bền bỉ và ổn định tối đa dưới điều kiện khí hậu nhiệt đới.\n\nThiết bị tích hợp công nghệ dò điểm công suất cực đại MPPT tiên tiến với dải điện áp làm việc rộng, giúp khởi động sớm và tắt muộn để tận dụng tối đa năng lượng mặt trời mỗi ngày. Hệ thống tản nhiệt thông minh không dùng quạt ngoài (đối với model dân dụng) hoặc quạt tản nhiệt thông minh IP68 giúp máy hoạt động êm ái, kéo dài tuổi thọ linh kiện.\n\nHỗ trợ kết nối giám sát từ xa thông minh qua ứng dụng di động Cloud, tích hợp sẵn các cấp độ bảo vệ an toàn: chống sét lan truyền Type II (DC/AC), chống đảo pha, bảo vệ quá áp, quá dòng và chức năng ngắt hồ quang AFCI an toàn phòng chống cháy nổ.`;

      specifications = [
        { label: "Loại biến tần", value: `Biến tần hòa lưới ${is3P ? "3 Pha" : "1 Pha"}` },
        { label: "Công suất phát định mức", value: powerKw },
        { label: "Điện áp ra AC", value: phase },
        { label: "Điện áp đầu vào PV cực đại", value: maxPvVoltage },
        { label: "Dải điện áp hoạt động MPPT", value: mpptVoltageRange },
        { label: "Số lượng bộ theo dõi MPPT", value: mpptCount },
        { label: "Hiệu suất chuyển đổi cực đại", value: maxEfficiency },
        { label: "Tần số điện lưới danh định", value: "50 Hz / 60 Hz (Tự động thích ứng)" },
        { label: "Cấp bảo vệ chống nước, bụi", value: "IP65 / IP66 tiêu chuẩn quốc tế" },
        { label: "Tính năng bảo vệ", value: "Chống phát ngược (Zero-export), chống đảo pha, AFCI" },
        { label: "Giao thức truyền thông", value: "Wi-Fi, RS485, GPRS / 4G (Tùy chọn)" },
        { label: "Thời gian bảo hành", value: "5 năm tiêu chuẩn từ nhà sản xuất" }
      ];
    }
  }

  // ==========================================
  // CATEGORY 3: PIN LƯU TRỮ LITHIUM
  // ==========================================
  else if (category_id === 3) {
    let capacityKwh = "5.12 kWh";
    let voltage = "51.2 V";
    let capacityAh = "100 Ah";
    let formFactor = "Treo tường hoặc gắn tủ rack";
    let weight = "45 kg";
    let cycleLife = "≥ 6.000 chu kỳ @ 80% DOD (25°C)";
    let warranty = "5 - 10 năm chính hãng";

    if (name.includes("16kWh") || name.includes("16.07kWh") || name.includes("15.62kwh") || name.includes("15.36kWh") || name.includes("314Ah") || name.includes("300Ah")) {
      capacityKwh = name.includes("16.07") ? "16.07 kWh" : name.includes("15.62") ? "15.62 kWh" : name.includes("15.36") ? "15.36 kWh" : "16 kWh";
      capacityAh = name.includes("314Ah") ? "314 Ah" : name.includes("300Ah") ? "300 Ah" : "314 Ah";
      voltage = "51.2 V";
      weight = "115 - 130 kg";
      formFactor = "Dạng tủ đứng đặt sàn / modul công suất lớn";
    } else if (name.includes("14.3kWh") || name.includes("14.3kW") || name.includes("280Ah")) {
      capacityKwh = "14.3 kWh";
      capacityAh = "280 Ah";
      voltage = "51.2 V";
      weight = "108 kg";
      formFactor = "Dạng tủ đứng đặt sàn / treo tường công suất lớn";
    } else if (name.includes("10.24 kWh") || name.includes("10kwh") || name.includes("512200") || name.includes("51.2V200") || name.includes("200")) {
      capacityKwh = "10.24 kWh";
      capacityAh = "200 Ah";
      voltage = "51.2 V";
      weight = "85 kg";
      formFactor = name.includes("treo tường") ? "Dạng treo tường tiết kiệm không gian" : "Dạng gắn rack / đặt sàn";
    } else if (name.includes("Tower") || name.includes("Áp Cao") || name.includes("áp cao") || name.includes("HV")) {
      voltage = "Áp cao HV (192V - 600V tùy số module)";
      formFactor = "Hệ module xếp chồng cao cấp (Stackable Tower)";
      if (name.includes("T21")) { capacityKwh = "21.31 kWh"; weight = "240 kg"; }
      else if (name.includes("T17")) { capacityKwh = "17.76 kWh"; weight = "205 kg"; }
      else if (name.includes("T14")) { capacityKwh = "14.21 kWh"; weight = "170 kg"; }
      else if (name.includes("T10")) { capacityKwh = "10.66 kWh"; weight = "135 kg"; }
      else if (name.includes("T7")) { capacityKwh = "7.10 kWh"; weight = "100 kg"; }
      else { capacityKwh = "43 kWh - 215 kWh"; weight = "Tùy biến công nghiệp"; }
    } else if (name.includes("4.8kWh") || name.includes("48V100")) {
      capacityKwh = "4.8 kWh";
      capacityAh = "100 Ah";
      voltage = "48 V";
      weight = "42 kg";
      formFactor = "Gắn tủ rack 19-inch hoặc treo tường";
    }

    if (name.includes("treo tường")) {
      formFactor = "Thiết kế mỏng treo tường thẩm mỹ (Wall-mounted)";
    }

    description = `${name} sử dụng công nghệ tế bào pin LiFePO4 (Lithium Iron Phosphate) tiên tiến nhất hiện nay, cung cấp giải pháp lưu trữ năng lượng an toàn, tin cậy tuyệt đối và có tuổi thọ vượt trội so với các loại ắc quy axit-chì truyền thống.\n\nSản phẩm được tích hợp mạch quản lý pin thông minh (BMS - Battery Management System) chuyên sâu, liên tục giám sát và tự động cân bằng điện áp từng cell, bảo vệ chống quá nạp, quá xả, quá dòng và kiểm soát nhiệt độ nhiều tầng. Khả năng kết nối song song nhiều bộ pin giúp dễ dàng mở rộng dung lượng khi nhu cầu tiêu thụ điện gia tăng.\n\nTương thích liền mạch thông qua giao thức CAN/RS485 với hầu hết các thương hiệu Inverter Hybrid hàng đầu trên thị trường (Deye, Solis, Luxpower, Growatt, GoodWe, SMA...). Sản phẩm đảm bảo cung cấp nguồn điện liên tục, ổn định cho gia đình và doanh nghiệp.`;

    specifications = [
      { label: "Công nghệ tế bào pin", value: "Lithium Iron Phosphate (LiFePO4) an toàn cao" },
      { label: "Dung lượng lưu trữ định mức", value: `${capacityKwh} (${capacityAh})` },
      { label: "Điện áp danh định", value: voltage },
      { label: "Dải điện áp hoạt động", value: voltage.includes("48") ? "42.0V – 54.0V DC" : voltage.includes("Áp cao") ? "150V – 600V DC" : "44.8V – 57.6V DC" },
      { label: "Độ sâu xả (DoD)", value: "Khuyên dùng 90% (Hỗ trợ xả sâu đến 95%)" },
      { label: "Vòng đời chu kỳ (Cycle Life)", value: cycleLife },
      { label: "Kiểu dáng lắp đặt", value: formFactor },
      { label: "Khả năng mở rộng", value: "Hỗ trợ ghép nối song song tối đa 15 - 32 bộ" },
      { label: "Cổng giao tiếp truyền thông", value: "CAN 2.0 / RS485 / RS232 với BMS thông minh" },
      { label: "Tiêu chuẩn bảo vệ & Trọng lượng", value: `IP20 / IP55 / IP65 | Khối lượng: ~${weight}` },
      { label: "Chứng nhận chất lượng", value: "UN38.3, IEC62619, CE, MSDS quốc tế" },
      { label: "Chế độ bảo hành", value: warranty }
    ];
  }

  // ==========================================
  // CATEGORY 4: PHỤ KIỆN SOLAR
  // ==========================================
  else if (category_id === 4) {
    if (name.includes("Tủ Điện") || name.includes("Tủ điện") || name.includes("Biến Tần Bơm") || name.includes("Mạch boost")) {
      const matchP = name.match(/(\d+(?:\.\d+)?)\s*kW/i);
      const kw = matchP ? `${matchP[1]} kW` : "5.5 kW";
      const is3P = name.includes("3 Pha") || name.includes("380V") || name.includes("3P");

      description = `${name} là giải pháp trọn bộ chuyên dụng cho hệ thống máy bơm nước năng lượng mặt trời, phục vụ tưới tiêu nông nghiệp, trang trại và cấp nước sinh hoạt không phụ thuộc vào điện lưới quốc gia.\n\nTủ điện được gia công chuẩn công nghiệp, sơn tĩnh điện chống ăn mòn ngoài trời, tích hợp đầy đủ các thiết bị đóng cắt bảo vệ như Aptomat DC/AC, chống sét lan truyền SPD, role nhiệt và bộ điều khiển thông minh tự động bơm khi có nắng, tự ngắt khi cạn nước hoặc bể đầy.\n\nSản phẩm vận hành bền bỉ, tiết kiệm tối đa chi phí vận hành xăng dầu và tiền điện, là giải pháp kinh tế bền vững cho bà con nông dân và các dự án thủy lợi.`;

      specifications = [
        { label: "Dòng sản phẩm", value: "Tủ điện điều khiển biến tần bơm năng lượng mặt trời" },
        { label: "Công suất động cơ tương thích", value: kw },
        { label: "Điện áp đầu ra", value: is3P ? "3 Pha 380V AC" : "1 Pha 220V AC" },
        { label: "Nguồn cấp hỗ trợ", value: "Pin mặt trời DC hoặc Điện lưới AC dự phòng (Hybrid)" },
        { label: "Cấp độ bảo vệ vỏ tủ", value: "IP54 / IP65 ngoài trời chịu mưa nắng" },
        { label: "Thiết bị bảo vệ tích hợp", value: "Aptomat DC/AC, SPD chống sét, relay bảo vệ quá dòng" },
        { label: "Tính năng thông minh", value: "Tự động khởi động khi có nắng, tự ngắt khi cạn nước" },
        { label: "Bảo hành", value: "12 - 24 tháng chính hãng" }
      ];
    } else if (name.includes("Smart Meter") || name.includes("Meter")) {
      const is3P = name.includes("3 pha") || name.includes("TPM") || name.includes("630");

      description = `${name} là thiết bị đo đếm điện năng thông minh chuyên dụng, dùng để giám sát dòng điện hai chiều trong hệ thống điện mặt trời hòa lưới và hybrid.\n\nThiết bị kết nối trực tiếp với biến tần qua cổng truyền thông RS485 Modbus để truyền dữ liệu công suất phụ tải tiêu thụ, từ đó biến tần tự động điều chỉnh công suất phát để thực hiện chức năng bám tải Zero-Export (không phát ngược lên điện lưới).\n\nĐộ chính xác đo lường Class 1 theo tiêu chuẩn quốc tế, hiển thị chi tiết các thông số điện áp, dòng điện, hệ số công suất cosφ và điện năng tiêu thụ trên màn hình LCD.`;

      specifications = [
        { label: "Loại thiết bị", value: `Smart Meter cảm biến dòng bám tải ${is3P ? "3 Pha" : "1 Pha"}` },
        { label: "Thương hiệu tương thích", value: brand },
        { label: "Điện áp danh định", value: is3P ? "3x230V / 400V AC" : "230V AC" },
        { label: "Phương thức đo lường", value: name.includes("CT") ? "Biến dòng ngoài (CT Clamp) không cần cắt dây" : "Đo trực tiếp Modbus" },
        { label: "Giao thức truyền thông", value: "RS485 Modbus-RTU tốc độ 9600 bps" },
        { label: "Độ chính xác đo lường", value: "Class 1.0 (Sai số < 1%)" },
        { label: "Kiểu lắp đặt", value: "Gắn thanh DIN-rail 35mm trong tủ điện" },
        { label: "Bảo hành", value: "24 tháng chính hãng" }
      ];
    } else {
      let material = "Hợp kim nhôm cao cấp AL6005-T5 bề mặt Anodized";
      let app = "Hệ thống điện mặt trời áp mái tôn, mái ngói hoặc khung giàn";

      if (name.includes("Vít inox") || name.includes("inox")) {
        material = "Inox SUS304 / SUS410 cường độ cao chống rỉ sét";
      } else if (name.includes("Dây DC")) {
        material = "Lõi đồng mạ thiếc nhiều sợi mềm, cách điện XLPO kép chống cháy và UV";
      } else if (name.includes("Chổi vệ sinh")) {
        material = "Cán nhôm ống lồng carbon cao cấp, sợi cọ nilon chuyên dụng không xước kính";
        app = "Vệ sinh làm sạch bề mặt tấm pin mặt trời định kỳ";
      }

      description = `${name} là phụ kiện cơ khí / phụ trợ chuyên dụng trong thi công lắp đặt hệ thống điện mặt trời, đáp ứng các tiêu chuẩn kỹ thuật khắt khe về độ bền kéo, khả năng chống ăn mòn và tuổi thọ ngoài trời.\n\nSản phẩm được gia công chính xác trên dây chuyền công nghệ cao, giúp việc thi công nhanh gọn, chắc chắn và đảm bảo an toàn tuyệt đối cho công trình trước gió bão suốt hơn 25 năm sử dụng.`;

      specifications = [
        { label: "Tên phụ kiện", value: name },
        { label: "Vật liệu chế tạo", value: material },
        { label: "Khả năng chống chịu thời tiết", value: "Chống ăn mòn muối biển, chống tia cực tím UV" },
        { label: "Ứng dụng thi công", value: app },
        { label: "Tiêu chuẩn chất lượng", value: "ISO 9001, AS/NZS 1170.2, SGS testing" },
        { label: "Tuổi thọ thiết kế", value: "Trên 25 năm vận hành ngoài trời" },
        { label: "Bảo hành sản phẩm", value: "10 năm chất lượng vật lý" }
      ];
    }
  }

  return {
    id,
    category_id,
    name,
    slug,
    price,
    price_amount,
    price_label,
    image_url: product.image_url,
    image_alt,
    image_storage_key: null,
    brand,
    status,
    sort_order,
    description,
    specifications: JSON.stringify(specifications)
  };
}

function escapeSqlString(val) {
  if (val === null || val === undefined) return "NULL";
  const str = String(val);
  return "'" + str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
    switch (char) {
      case "\0": return "\\0";
      case "\x08": return "\\b";
      case "\x09": return "\\t";
      case "\x1a": return "\\z";
      case "\n": return "\\n";
      case "\r": return "\\r";
      case "\"":
      case "'":
      case "\\":
      case "%":
        return "\\" + char;
      default:
        return char;
    }
  }) + "'";
}

async function run() {
  await loadEnvLocal();
  const host = process.env.MYSQL_HOST || "127.0.0.1";
  const port = Number(process.env.MYSQL_PORT || 3306);
  const user = process.env.MYSQL_USER || "root";
  const password = process.env.MYSQL_PASSWORD || "";
  const database = process.env.MYSQL_DATABASE || "solar_shop";

  const conn = await mysql.createConnection({ host, port, user, password, database });
  console.log("Connected to MySQL!");

  const [products] = await conn.query("SELECT * FROM products ORDER BY id ASC");
  console.log(`Found ${products.length} products to enrich.`);

  const enrichedProducts = [];

  for (const prod of products) {
    const enriched = generateProductDetails(prod);
    enrichedProducts.push(enriched);

    await conn.execute(`
      UPDATE products
      SET slug = ?, price_amount = ?, price_label = ?, image_alt = ?, status = ?, sort_order = ?, description = ?, specifications = ?
      WHERE id = ?
    `, [
      enriched.slug,
      enriched.price_amount,
      enriched.price_label,
      enriched.image_alt,
      enriched.status,
      enriched.sort_order,
      enriched.description,
      enriched.specifications,
      enriched.id
    ]);
  }

  console.log(`✅ Updated ${enrichedProducts.length} products in the database!`);

  // Bây giờ tạo lại toàn bộ file sql/schema.sql hoàn chỉnh
  const [categories] = await conn.query("SELECT * FROM categories ORDER BY id ASC");
  const [projects] = await conn.query("SELECT * FROM projects ORDER BY id ASC");
  const [projectImages] = await conn.query("SELECT * FROM project_images ORDER BY id ASC");

  let sqlOutput = `-- ============================================================
-- DATABASE SCHEMA & SEED DATA FOR TIS WEBSITE (solar_shop)
-- Hoàn chỉnh đầy đủ thông tin chi tiết sản phẩm, dự án & admin CMS
-- ============================================================

CREATE DATABASE IF NOT EXISTS solar_shop CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE solar_shop;

-- Xóa bảng cũ nếu có để làm lại từ đầu
DROP TABLE IF EXISTS rate_limits;
DROP TABLE IF EXISTS admin_audit_logs;
DROP TABLE IF EXISTS admin_sessions;
DROP TABLE IF EXISTS admin_users;
DROP TABLE IF EXISTS admin_schema_migrations;
DROP TABLE IF EXISTS project_images;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;

-- 1. Bảng Loại sản phẩm (Categories)
CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(191) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE INDEX uq_categories_slug (slug),
  INDEX idx_categories_admin (is_active, sort_order, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO categories (id, name, slug, sort_order, is_active) VALUES 
(1, 'Tấm pin năng lượng mặt trời', 'tam-pin-nang-luong-mat-troi', 10, 1),
(2, 'Biến tần Inverter', 'bien-tan-inverter', 20, 1),
(3, 'Pin lưu trữ Lithium', 'pin-luu-tru-lithium', 30, 1),
(4, 'Phụ kiện solar', 'phu-kien-solar', 40, 1);

-- 2. Bảng Sản phẩm (Products)
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(191) NOT NULL,
  category_id INT NULL,
  name VARCHAR(255) NOT NULL,
  price VARCHAR(50) NOT NULL,
  price_amount BIGINT UNSIGNED NULL,
  price_label VARCHAR(100) NULL,
  image_url TEXT,
  image_alt VARCHAR(255) NULL,
  image_storage_key VARCHAR(512) NULL,
  brand VARCHAR(100) NOT NULL,
  status ENUM('draft', 'published') NOT NULL DEFAULT 'published',
  sort_order INT NOT NULL DEFAULT 0,
  description TEXT NULL,
  specifications JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  UNIQUE INDEX uq_products_slug (slug),
  INDEX idx_products_category (category_id),
  INDEX idx_products_brand (brand),
  INDEX idx_products_public (status, deleted_at, sort_order, id),
  INDEX idx_products_admin (deleted_at, status, category_id, brand)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Bảng Dự Án (Projects)
CREATE TABLE projects (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  client TEXT NOT NULL,
  pillar ENUM('it', 'me', 'renewable') NOT NULL DEFAULT 'renewable',
  location VARCHAR(255) NULL,
  contract_value_vnd BIGINT UNSIGNED NOT NULL DEFAULT 0,
  contract_date DATE NULL,
  date_display VARCHAR(32) NULL,
  is_highlight TINYINT(1) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  status ENUM('draft', 'published') NOT NULL DEFAULT 'published',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  INDEX idx_projects_list (status, sort_order, contract_value_vnd DESC),
  INDEX idx_projects_admin (deleted_at, status, pillar, sort_order, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Bảng Album Ảnh Dự Án (Project Images)
CREATE TABLE project_images (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id INT UNSIGNED NOT NULL,
  image_url VARCHAR(512) NOT NULL,
  caption VARCHAR(255) NULL,
  alt_text VARCHAR(255) NULL,
  storage_key VARCHAR(512) NULL,
  mime_type VARCHAR(100) NULL,
  file_size INT UNSIGNED NULL,
  width INT UNSIGNED NULL,
  height INT UNSIGNED NULL,
  sort_order INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_project_images_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_project_images_project (project_id, sort_order, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Bảng Quản trị viên (Admin Users)
CREATE TABLE admin_users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(191) NOT NULL,
  password_hash VARCHAR(512) NOT NULL,
  role ENUM('owner', 'editor') NOT NULL DEFAULT 'editor',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  must_change_password TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE INDEX uq_admin_users_email (email),
  INDEX idx_admin_users_active (is_active, role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Bảng Phiên Đăng Nhập (Admin Sessions)
CREATE TABLE admin_sessions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT fk_admin_sessions_user
    FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE,
  UNIQUE INDEX uq_admin_sessions_token (token_hash),
  INDEX idx_admin_sessions_user (user_id, revoked_at, expires_at),
  INDEX idx_admin_sessions_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Bảng Nhật Ký Hoạt Động (Admin Audit Logs)
CREATE TABLE admin_audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_user_id BIGINT UNSIGNED NULL,
  actor_email VARCHAR(191) NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(100) NULL,
  ip_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  details JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_admin_audit_actor
    FOREIGN KEY (actor_user_id) REFERENCES admin_users(id) ON DELETE SET NULL,
  INDEX idx_admin_audit_created (created_at, id),
  INDEX idx_admin_audit_resource (resource_type, resource_id, created_at),
  INDEX idx_admin_audit_actor (actor_user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Bảng Giới Hạn Tần Suất Yêu Cầu (Rate Limits)
CREATE TABLE rate_limits (
  scope VARCHAR(64) NOT NULL,
  key_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  window_start DATETIME NOT NULL,
  request_count INT UNSIGNED NOT NULL DEFAULT 1,
  expires_at DATETIME NOT NULL,
  PRIMARY KEY (scope, key_hash, window_start),
  INDEX idx_rate_limits_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Bảng Migration Version
CREATE TABLE admin_schema_migrations (
  version VARCHAR(100) PRIMARY KEY,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO admin_schema_migrations (version) VALUES ('001_admin_cms');

-- ============================================================
-- SEED DATA: SẢN PHẨM KÈM THÔNG TIN CHI TIẾT & THÔNG SỐ KỸ THUẬT
-- ============================================================

INSERT INTO products (id, slug, category_id, name, price, price_amount, price_label, image_url, image_alt, brand, status, sort_order, description, specifications) VALUES
`;

  const productValueStrings = enrichedProducts.map(p => {
    return `(${p.id}, ${escapeSqlString(p.slug)}, ${p.category_id}, ${escapeSqlString(p.name)}, ${escapeSqlString(p.price)}, ${p.price_amount === null ? "NULL" : p.price_amount}, ${escapeSqlString(p.price_label)}, ${escapeSqlString(p.image_url)}, ${escapeSqlString(p.image_alt)}, ${escapeSqlString(p.brand)}, 'published', ${p.sort_order}, ${escapeSqlString(p.description)}, ${escapeSqlString(p.specifications)})`;
  });

  sqlOutput += productValueStrings.join(",\n") + ";\n\n";

  sqlOutput += `-- ============================================================
-- PROJECTS SEED (Dữ liệu dự án)
-- ============================================================

INSERT INTO projects (id, name, client, pillar, location, contract_value_vnd, contract_date, date_display, is_highlight, sort_order) VALUES
(1, 'Hệ thống camera an ninh khuôn viên', 'Trường Đại học Y tế Công cộng', 'it', 'Hà Nội', 804491604, '2017-10-19', NULL, 0, 10),
(2, 'Hệ thống mạng, thoại và âm thanh', 'Tòa nhà AZ Lâm Viên, 107 Nguyễn Phong Sắc', 'it', 'Hà Nội', 908106000, '2020-05-22', NULL, 0, 20),
(3, 'Trang bị thiết bị một cửa điện tử', 'Các xã thuộc huyện Bắc Hà, Si Ma Cai, Mường Khương, Bát Xát', 'it', 'Lào Cai', 22186327987, '2023-10-12', NULL, 0, 30),
(4, 'Hệ thống cơ điện M&E và Điều hòa trung tâm HVAC', 'Tòa nhà Văn phòng & Thương mại Hàng Bài', 'me', 'Hà Nội', 4500000000, '2024-12-15', NULL, 0, 35),
(5, 'Điện mặt trời mái nhà - Hợp tác đầu tư', 'Ban Quản lý Chợ Kim Tân', 'renewable', 'Lào Cai', 500000000, NULL, '04/2025', 0, 40),
(6, 'Điện mặt trời mái nhà - Tự sản tự tiêu', 'Công ty TNHH TM Tổng hợp Tuấn Phương, BQL Chợ Thuận Thành', 'renewable', 'Bắc Ninh', 2750000000, NULL, '05/2025', 0, 50),
(7, 'Điện mặt trời mái nhà - Hợp tác đầu tư', 'Công ty CP TM 69 Tuấn Hải, BQL Chợ đầu mối Ngã Tư Dâu', 'renewable', 'Bắc Ninh', 1800000000, NULL, '04/08/2025', 0, 60),
(8, 'Điện mặt trời mái nhà - Khu thể thao giải trí', 'Công ty CP TM 89 Long Hải, Thuận Thành', 'renewable', 'Bắc Ninh', 1200000000, NULL, '22/08/2025', 0, 70);

-- Project Images Seed
INSERT INTO project_images (project_id, image_url, caption, sort_order) VALUES
-- 1. Camera an ninh
(1, '/images/projects/cam_an_ninh/1.jpg', 'Camera an ninh', 1),

-- 2. Mạng, thoại và âm thanh
(2, '/images/projects/mang_am_thanh/1.jpg', 'Mạng và âm thanh', 1),

-- 3. Một cửa điện tử
(3, '/images/projects/1_cua_truc_tuyen/1.jpg', 'Hệ thống một cửa điện tử', 1),
(3, '/images/projects/1_cua_truc_tuyen/2.jpg', 'Hệ thống một cửa điện tử', 2),
(3, '/images/projects/1_cua_truc_tuyen/3.jpg', 'Hệ thống một cửa điện tử', 3),
(3, '/images/projects/1_cua_truc_tuyen/4.jpg', 'Hệ thống một cửa điện tử', 4),

-- 4. Hệ thống cơ điện
(4, '/images/projects/electrical-panel-installation.jpg', 'Lắp đặt tủ điện phân phối trung tâm', 1),

-- 5. Chợ kim tân 
(5, '/images/projects/cho_kim_tan/1.jpg', 'Tấm pin trên mái Chợ Kim Tân', 1),
(5, '/images/projects/cho_kim_tan/2.jpg', 'Lắp đặt bằng cẩu tại công trình', 2),
(5, '/images/projects/cho_kim_tan/3.jpg', 'Mảng pin mái nhà', 3),
(5, '/images/projects/cho_kim_tan/4.jpg', 'Tổng thể công trình', 4),

-- 6. Chợ Thuận Thành
(6, '/images/projects/cho_thuan_thanh/1.jpg', 'Mái pin Chợ Thuận Thành', 1),
(6, '/images/projects/cho_thuan_thanh/2.jpg', 'Mái pin Chợ Thuận Thành', 2),
(6, '/images/projects/cho_thuan_thanh/3.jpg', 'Mái pin Chợ Thuận Thành', 3),

-- 7. Chợ Ngã Tư Dâu
(7, '/images/projects/nga_tu_dau/1.jpg', 'Flycam mái pin', 1),
(7, '/images/projects/nga_tu_dau/2.jpg', 'Mái pin', 2),
(7, '/images/projects/nga_tu_dau/3.jpg', 'Biến tần', 3),
(7, '/images/projects/nga_tu_dau/4.jpg', 'Tủ điện', 4);
`;

  const schemaPath = path.resolve(process.cwd(), "sql", "schema.sql");
  fs.writeFileSync(schemaPath, sqlOutput, "utf-8");
  console.log("✅ Successfully updated sql/schema.sql with full product specifications & descriptions!");

  await conn.end();
}

run().catch((e) => {
  console.error("Execution error:", e);
  process.exit(1);
});
