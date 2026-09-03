-- ============================================================
-- DATABASE SCHEMA & SEED DATA FOR TIS WEBSITE (solar_shop)
-- ============================================================

CREATE DATABASE IF NOT EXISTS solar_shop CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE solar_shop;

-- Xóa bảng cũ nếu có để làm lại từ đầu
DROP TABLE IF EXISTS project_images;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;

-- 1. Bảng Loại sản phẩm (Categories)
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO categories (id, name) VALUES 
(1, 'Tấm pin năng lượng mặt trời'),
(2, 'Biến tần Inverter'),
(3, 'Pin lưu trữ Lithium'),
(4, 'Phụ kiện solar');

-- 2. Bảng Sản phẩm (Products)
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT,
    name VARCHAR(255) NOT NULL,
    price VARCHAR(50) NOT NULL,
    image_url TEXT,
    brand VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_products_category (category_id),
    INDEX idx_products_brand (brand)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Bảng Dự Án (Projects)
CREATE TABLE projects (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name                VARCHAR(255) NOT NULL,
  client              TEXT NOT NULL,
  pillar              ENUM('it', 'me', 'renewable') NOT NULL DEFAULT 'renewable',
  location            VARCHAR(255) NULL,
  contract_value_vnd  BIGINT UNSIGNED NOT NULL DEFAULT 0,
  contract_date       DATE NULL,
  date_display        VARCHAR(32) NULL,
  is_highlight        TINYINT(1) NOT NULL DEFAULT 0,
  sort_order          INT NOT NULL DEFAULT 0,
  status              ENUM('draft', 'published') NOT NULL DEFAULT 'published',
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_projects_list (status, sort_order, contract_value_vnd DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Bảng Album Ảnh Dự Án (Project Images)
CREATE TABLE project_images (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id  INT UNSIGNED NOT NULL,
  image_url   VARCHAR(512) NOT NULL,
  caption     VARCHAR(255) NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_project_images_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_project_images_project (project_id, sort_order, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- SEED DATA (Dữ liệu sản phẩm chính xác theo bảng mới)
-- ============================================================

INSERT INTO products (id, category_id, name, price, image_url, brand) VALUES
(1, 1, 'Tấm pin LONGi Hi MO X10 Scientist Hai Mặt Kính', '2560000', '/uploads/products/tam_pin/1', 'LONGi'),
(2, 1, 'Tấm Pin Năng Lượng Mặt Trời LONGI Hi-MO X10', '2560000', '/uploads/products/tam_pin/2', 'LONGi'),
(3, 1, 'Tấm Pin OSDA N ODA 590W MHD Hai Mặt Kính', '2360000', '/uploads/products/tam_pin/3', 'OSDA'),
(4, 1, 'Tấm Pin OSDA N Pro ODA 620W MHDRz Hai Mặt Kính', '2480000', '/uploads/products/tam_pin/4', 'OSDA'),
(5, 1, 'Tấm Pin AE Solar METEOR 560-580W', 'Lien he', '/uploads/products/tam_pin/5', 'AE Solar'),
(6, 1, 'Tấm pin năng lượng mặt trời Longi Hi-MO 7 hai mặt kính', '2204000', '/uploads/products/tam_pin/6', 'LONGi'),
(7, 1, 'Tấm pin năng lượng mặt trời LONGI Hi-MO X6', '2128000', '/uploads/products/tam_pin/7', 'LONGi'),
(8, 1, 'Tấm pin năng lượng mặt trời Jolywood JW-HD144N 460W N-type', '2226400', '/uploads/products/tam_pin/8', 'Jolywood'),
(9, 1, 'Tấm pin năng lượng mặt trời Astronergy CHSM72M(DG)/F-BH 545W 2 mặt kính', '2068275', '/uploads/products/tam_pin/9', 'Astronergy'),
(10, 1, 'Tấm pin năng lượng mặt trời Jinko Tiger 465W', '1892550', '/uploads/products/tam_pin/10', 'Jinko'),
(11, 1, 'Tấm pin năng lượng mặt trời Jinko Tiger Pro 72HC 540-560W', '2258850', '/uploads/products/tam_pin/11', 'Jinko'),
(12, 1, 'Tấm pin năng lượng mặt trời Jinko 480Wp', 'Lien he', '/uploads/products/tam_pin/12', 'Jinko'),
(13, 1, 'Tấm pin năng lượng mặt trời LONGI Hi-Mo5 LR5-72HBD 540~560M', '2278100', '/uploads/products/tam_pin/13', 'LONGi'),
(14, 1, 'Tấm pin năng lượng mặt trời Longi LR5-54HPH 405~425M Hi-Mo5m', 'Lien he', '/uploads/products/tam_pin/14', 'LONGi'),
(15, 1, 'Tấm pin năng lượng mặt trời Jinko Tiger Neo N-type 72HL4-BDV 560-580W', 'Lien he', '/uploads/products/tam_pin/15', 'Jinko'),
(16, 1, 'Tấm pin năng lượng mặt trời Astronergy CHSM72M-HC 545W 1 mặt kính', '2068275', '/uploads/products/tam_pin/16', 'Astronergy'),
(17, 1, 'Tấm pin năng lượng mặt trời Jinko Tiger Neo N-type 72HL4-(V) 565-585W', 'Lien he', '/uploads/products/tam_pin/17', 'Jinko'),
(18, 1, 'Tấm pin năng lượng mặt trời Jinko Tiger Neo N-Type 78HL4-BDV 605-625W', 'Lien he', '/uploads/products/tam_pin/18', 'Jinko'),
(19, 1, 'Tấm pin năng lượng mặt trời Jinko Swan Bifacial HC 60M 320-340W', 'Lien he', '/uploads/products/tam_pin/19', 'Jinko'),
(20, 1, 'Tấm pin năng lượng mặt trời Jinko Swan Bifacial 72H 385-405W', 'Lien he', '/uploads/products/tam_pin/20', 'Jinko'),
(21, 1, 'Tấm pin năng lượng mặt trời Jinko Swan Bifacial 60H 320-340W', 'Lien he', '/uploads/products/tam_pin/21', 'Jinko'),
(22, 1, 'Tấm pin năng lượng mặt trời Jinko Swan Bifacial HC 72M 385-405W', '2000000', '/uploads/products/tam_pin/22', 'Jinko'),
(23, 1, 'Tấm pin năng lượng mặt trời Jinko Tiger Pro 72HC-BDVP 530-550W', '2052000', '/uploads/products/tam_pin/23', 'Jinko'),
(24, 1, 'Tấm pin năng lượng mặt trời LONGI Hi-MO 9', 'Lien he', '/uploads/products/tam_pin/24', 'LONGi'),
(25, 2, 'Inverter hybrid Solis S6-EH1P(3-10)K-L-PLUS', '25990000', '/uploads/products/inverter/1', 'Solis'),
(26, 2, 'Inverter Hybrid Solis S6 EH1P8K-L-PRO(SN)', '39200000', '/uploads/products/inverter/2', 'Solis'),
(27, 2, 'Inverter Hybrid Solis S6 EH1P5K-L-PRO 5KW', '24980000', '/uploads/products/inverter/3', 'Solis'),
(28, 2, 'Inverter Hybrid Solis S6-EH3P(8-18)K02-NV-YD-L | 3 Pha', '55090000', '/uploads/products/inverter/4', 'Solis'),
(29, 2, 'Inverter Hybrid Solis S6-EH1P(12-18)K03-NV-YD-L | 1 Pha | Áp Thấp', '57220000', '/uploads/products/inverter/5', 'Solis'),
(30, 2, 'Inverter Hybrid Solis S6-EH3P20K-H 3 pha (Áp Cao)', '54908000', '/uploads/products/inverter/6', 'Solis'),
(31, 2, 'Inverter Hybrid Solis S6-EH3P(30-50)K-H 3 pha (Áp Cao)', '117390000', '/uploads/products/inverter/7', 'Solis'),
(32, 2, 'Inverter hòa lưới Solis S6-GR1P3K-S | 1 pha | 2 MPPT', '12456000', '/uploads/products/inverter/8', 'Solis'),
(33, 2, 'Inverter hòa lưới Solis S5-GR3P10K | 3 pha | 2 MPPT', '25548000', '/uploads/products/inverter/9', 'Solis'),
(34, 2, 'Inverter hòa lưới Solis S5-GR1P10K | 1pha | 3 MPPT', '24696000', '/uploads/products/inverter/10', 'Solis'),
(35, 2, 'Inverter hòa lưới Solis S5-GR3P20K 20kW | 3 pha | 2 MPPT', '31083000', '/uploads/products/inverter/11', 'Solis'),
(36, 2, 'Inverter hòa lưới Hypontech HPS-10000 | 1 pha | 3 MPPT', '19278000', '/uploads/products/inverter/12', 'Hypontech'),
(37, 2, 'Inverter hòa lưới Hypontech HPS-8000 | 1 pha | 2 MPPT', '14301000', '/uploads/products/inverter/13', 'Hypontech'),
(38, 2, 'Inverter hòa lưới Hypontech HPK-3000 | 1 pha | 1 MPPT', '9009000', '/uploads/products/inverter/14', 'Hypontech'),
(39, 2, 'Inverter hòa lưới Solis S6-GR1P5K-S | 1 pha | 2 MPPT', '12561000', '/uploads/products/inverter/15', 'Solis'),
(40, 2, 'Inverter hòa lưới Hypontech HPS-6500 | 1 pha | 2 MPPT', '12033000', '/uploads/products/inverter/16', 'Hypontech'),
(41, 2, 'Inverter Hybrid Solis S6-EH3P10K2-H', '43200000', '/uploads/products/inverter/17', 'Solis'),
(42, 2, 'Inverter hòa lưới Solis S6-GR1P8K2 | 1 pha | 2 MPPT', '22141000', '/uploads/products/inverter/18', 'Solis'),
(43, 2, 'Inverter Hòa Lưới Bám Tải Senergy 10kw SE10KTL-D1P', '16590000', '/uploads/products/inverter/19', 'Senergy'),
(44, 2, 'Inverter Hòa Lưới Bám Tải Senergy 8kw SE8KTL-D1P', '15015000', '/uploads/products/inverter/20', 'Senergy'),
(45, 2, 'Inverter Hòa Lưới Bám Tải 6kw Senergy SE6KTL-D1-G2P', '11760000', '/uploads/products/inverter/21', 'Senergy'),
(46, 2, 'Inverter Hòa Lưới Bám Tải 5kw Senergy SE5KTL-D1/G2P', '11203500', '/uploads/products/inverter/22', 'Senergy'),
(47, 2, 'Inverter Hòa Lưới Bám Tải 4kw Senergy SE4KTL-D1/G2P', '10626000', '/uploads/products/inverter/23', 'Senergy'),
(48, 2, 'Inverter Hòa Lưới Bám Tải 3kw Senergy SE3KTL-S1/G2P', '8190000', '/uploads/products/inverter/24', 'Senergy'),
(49, 2, 'Inverter Hòa Lưới Bám Tải 2kw Senergy SE2KTL-S1/G2P', '7597590', '/uploads/products/inverter/25', 'Senergy'),
(50, 2, 'Inverter Hybrid SENERGY 10kw SE 10KHB-210-T/EU', '46200000', '/uploads/products/inverter/26', 'Senergy');

INSERT INTO products (id, category_id, name, price, image_url, brand) VALUES
(51, 2, 'Inverter Hybrid SENERGY 8kw SE 8KHB-210-T/EU', '40110000', '/uploads/products/inverter/27', 'Senergy'),
(52, 2, 'Inverter Hybrid SENERGY 6kw SE 6KHB-120', '25987500', '/uploads/products/inverter/28', 'Senergy'),
(53, 2, 'Inverter Hybrid SENERGY 5kw SE 5KHB-120', '24832500', '/uploads/products/inverter/29', 'Senergy'),
(54, 2, 'Inverter hòa lưới Growatt 125KW MAX125-KTL3-LV', '119700000', '/uploads/products/inverter/30', 'Growatt'),
(55, 2, 'Inverter hòa lưới Growatt 110kW MAX110-KTL3-LV (AFCI)', '105210000', '/uploads/products/inverter/31', 'Growatt'),
(56, 2, 'Inverter Hòa Lưới Growatt MAX80-KTL3-LV 80KW (AFCI)', '85680000', '/uploads/products/inverter/32', 'Growatt'),
(57, 2, 'Inverter Hòa Lưới Growatt MID40KTL3-X 40KW', '58590000', '/uploads/products/inverter/33', 'Growatt'),
(58, 2, 'Inverter Hòa Lưới Growatt MID30KTL3-X 30KW', '49770000', '/uploads/products/inverter/33', 'Growatt'),
(59, 2, 'Inverter Hòa Lưới Growatt MID25KTL3-X 25KW', '37170000', '/uploads/products/inverter/33', 'Growatt'),
(60, 2, 'Inverter Hòa Lưới Growatt MID20KTL3-X 20KW', '32130000', '/uploads/products/inverter/33', 'Growatt'),
(61, 2, 'Inverter Hòa Lưới Growatt MOD15KTL3-X 15KW', '27090000', '/uploads/products/inverter/37', 'Growatt'),
(62, 2, 'Inverter Hòa Lưới Growatt MOD 10KTL3-X 10KW', '23940000', '/uploads/products/inverter/37', 'Growatt'),
(63, 2, 'Inverter hòa lưới Solis S5-GR3P15K | 3 pha | 15kw', '27464000', '/uploads/products/inverter/39', 'Solis'),
(64, 2, 'Inverter Hybrid Solis S6 EH1P6K-L-PRO(SN)', '26399000', '/uploads/products/inverter/40', 'Solis'),
(65, 2, 'Inverter hòa lưới Deye SUN-80K-G | 3 pha | 4 MPPT', '65640120', '/uploads/products/inverter/41', 'Deye'),
(66, 2, 'Inverter hòa lưới Deye SUN-6K-G | 1 pha | 2 MPPT', '11924640', '/uploads/products/inverter/42', 'Deye'),
(67, 2, 'Inverter Hybrid Deye SUN-12K-SG04LP3-EU', '60627840', '/uploads/products/inverter/43', 'Deye'),
(68, 2, 'Inverter Hybrid Deye SUN-10K-SG04LP3-EU', '56445480', '/uploads/products/inverter/43', 'Deye'),
(69, 2, 'Inverter Hybrid Deye SUN-16K-SG01LP1-EU', '72563400', '/uploads/products/inverter/45', 'Deye'),
(70, 2, 'Inverter Hybrid Deye SUN-6K-SG04LP1-EU', '26612040', '/uploads/products/inverter/46', 'Deye'),
(71, 2, 'Inverter Hybrid Deye SUN-5K-SG04LP1-EU', '24995880', '/uploads/products/inverter/46', 'Deye'),
(72, 2, 'Inverter Hybrid Deye SUN-3.6K-SG04LP1-EU', '22986600', '/uploads/products/inverter/46', 'Deye'),
(73, 2, 'Inverter Hybrid Luxpower 8kW LXP-8K', '46200000', '/uploads/products/inverter/49', 'Luxpower'),
(74, 2, 'Inverter Hybrid Luxpower 6kW LXP-6K MG', '26900000', '/uploads/products/inverter/50', 'Luxpower'),
(75, 2, 'Inverter Hybrid Luxpower 5kW SNA5000', '15500000', '/uploads/products/inverter/51', 'Luxpower'),
(76, 2, 'Inverter hòa lưới Growatt 10kW MIN10000TL-X', '20790000', '/uploads/products/inverter/52', 'Growatt'),
(77, 2, 'Inverter hòa lưới Growatt 5kW MIN5000TL-X', '13356000', '/uploads/products/inverter/53', 'Growatt'),
(78, 2, 'Inverter hòa lưới Growatt 3kW MIC3000TL-X', '9450000', '/uploads/products/inverter/54', 'Growatt'),
(79, 2, 'Inverter hòa lưới Growatt 3kW MIN3000TL-X', '10710000', '/uploads/products/inverter/55', 'Growatt'),
(80, 2, 'Inverter Hybrid Growatt 10kW SPH10000TL3 BL-UP', '47775000', '/uploads/products/inverter/56', 'Growatt'),
(81, 2, 'Inverter Hybrid Growatt 6kW SPH6000TL BL-UP', '30975000', '/uploads/products/inverter/57', 'Growatt'),
(82, 2, 'Inverter Hybrid Growatt SPH 5000TL BL-UP', '28350000', '/uploads/products/inverter/58', 'Growatt'),
(83, 2, 'Inverter Hyrid Huawei SUN2000-(3-10)KTL-M1', 'Lien he', '/uploads/products/inverter/59', 'Huawei'),
(84, 2, 'Inverter Hyrid Huawei SUN2000-(12-25)KTL-M5', 'Lien he', '/uploads/products/inverter/60', 'Huawei'),
(85, 2, 'Inverter Hyrid Huawei SUN2000-(2-6)KTL-L1', 'Lien he', '/uploads/products/inverter/61', 'Huawei'),
(86, 2, 'Inverter hòa lưới Deye SUN-110K-G03 | 3 pha | 6 MPPT', '83013840', '/uploads/products/inverter/62', 'Deye'),
(87, 2, 'Inverter hòa lưới Deye SUN-60K-G | 3 pha | 4 MPPT', '55986840', '/uploads/products/inverter/63', 'Deye'),
(88, 2, 'Inverter hòa lưới Deye SUN-50K-G04 | 3 pha | 4 MPPT', '44433480', '/uploads/products/inverter/64', 'Deye'),
(89, 2, 'Inverter hòa lưới Deye SUN-30K-G04 | 3 pha | 2 MPPT', '30303000', '/uploads/products/inverter/65', 'Deye'),
(90, 2, 'Inverter hòa lưới Deye SUN-20K-G05 | 3 pha | 2 MPPT', '22222200', '/uploads/products/inverter/66', 'Deye'),
(91, 2, 'Inverter hòa lưới Deye SUN-15K-G05 | 3 pha | 2 MPPT', '20202000', '/uploads/products/inverter/67', 'Deye'),
(92, 2, 'Inverter hòa lưới Deye SUN-10K-G06 | 3 pha | 2 MPPT', '14141400', '/uploads/products/inverter/68', 'Deye'),
(93, 2, 'Inverter hòa lưới Deye SUN-8K-G | 1 pha | 2 MPPT', '16161600', '/uploads/products/inverter/69', 'Deye'),
(94, 2, 'Inverter hòa lưới Deye SUN-5K-G | 1 pha | 2 MPPT', '11520600', '/uploads/products/inverter/70', 'Deye'),
(95, 2, 'Inverter hòa lưới Deye SUN-3K-G04P1-EU-AM1 | 1 pha | 1 MPPT', '8353800', '/uploads/products/inverter/71', 'Deye'),
(96, 2, 'Inverter Hybrid Deye SUN-8K-SG04LP3-EU', '54425280', '/uploads/products/inverter/72', 'Deye'),
(97, 3, 'Pin lưu trữ Solis IntelliHome 16kWh - OD', '61066000', '/uploads/products/pin_luu_tru/1', 'Solis'),
(98, 3, 'Pin lưu trữ LVTOPSUN G3 16.07kWh (51.2v 314Ah)', '46575000', '/uploads/products/pin_luu_tru/2', 'LVTOPSUN'),
(99, 3, 'Pin lưu trữ LVTOPSUN 512314 G4 16.07kWh', '50025000', '/uploads/products/pin_luu_tru/3', 'LVTOPSUN'),
(100, 3, 'Pin lưu trữ Dyness BX51100 5.12 kWh', '21198000', '/uploads/products/pin_luu_tru/4', 'Dyness');

INSERT INTO products (id, category_id, name, price, image_url, brand) VALUES
(101, 3, 'Pin Lưu Trữ Lithium Narada 51.2V mã 51.2NESR200', '42900000', '/uploads/products/pin_luu_tru/5', 'Narada'),
(102, 3, 'Pin lưu trữ lithium LVTOPSUN 512200 G3 | 10.24 kWh', '34730000', '/uploads/products/pin_luu_tru/6', 'LVTOPSUN'),
(103, 3, 'Pin lưu trữ lithium LVTOPSUN 512300 G3', '45000000', '/uploads/products/pin_luu_tru/7', 'LVTOPSUN'),
(104, 3, 'Pin lưu trữ áp cao Dyness Tower T21', '142266000', '/uploads/products/pin_luu_tru/8', 'Dyness'),
(105, 3, 'Pin lưu trữ áp cao Dyness Tower T17', '120390000', '/uploads/products/pin_luu_tru/8', 'Dyness'),
(106, 3, 'Pin lưu trữ áp cao Dyness Tower T14', '98514000', '/uploads/products/pin_luu_tru/8', 'Dyness'),
(107, 3, 'Pin lưu trữ áp cao Dyness Tower T10', '76638000', '/uploads/products/pin_luu_tru/8', 'Dyness'),
(108, 3, 'Pin lưu trữ áp cao Dyness Tower T7', '54761000', '/uploads/products/pin_luu_tru/8', 'Dyness'),
(109, 3, 'Pin lưu trữ Dyness PowerBrick', '55155000', '/uploads/products/pin_luu_tru/13', 'Dyness'),
(110, 3, 'Pin lưu trữ Dyness áp cao Stack 280 (43kWh - 215.04kWh)', 'Lien he', '/uploads/products/pin_luu_tru/14', 'Dyness'),
(111, 3, 'Pin lưu trữ Dyness STACK100 Áp Cao', '98625000', '/uploads/products/pin_luu_tru/15', 'Dyness'),
(112, 3, 'Pin lưu trữ áp cao LVTOPSUN LVTS-5220-HV', '122522400', '/uploads/products/pin_luu_tru/16', 'LVTOPSUN'),
(113, 3, 'Pin lưu trữ lithium LVTOPSUN 51.2V200 (treo tường)', '38000000', '/uploads/products/pin_luu_tru/17', 'LVTOPSUN'),
(114, 3, 'Pin lưu trữ lithium LVTOPSUN 51.2 300Ah 15.36kWh', '45000000', '/uploads/products/pin_luu_tru/18', 'LVTOPSUN'),
(115, 3, 'Pin lưu trữ Dyness Powerbox Pro', '45542000', '/uploads/products/pin_luu_tru/19', 'Dyness'),
(116, 3, 'Pin lưu trữ Dyness DL5.0C công suất 5.12 kWh', '22080000', '/uploads/products/pin_luu_tru/20', 'Dyness'),
(117, 3, 'Pin lưu trữ lithium Narada NESR48100XA 4.8kWh', '20625000', '/uploads/products/pin_luu_tru/21', 'Narada'),
(118, 3, 'Pin lưu trữ lithium LVTOPSUN 48V100 (treo tường)', '23100000', '/uploads/products/pin_luu_tru/22', 'LVTOPSUN'),
(119, 3, 'Pin lưu trữ lithium Gigabox 5E', '17325000', '/uploads/products/pin_luu_tru/23', 'Gigabox'),
(120, 3, 'Pin lưu trữ lithium Gigabox 10S 10kwh', '37170000', '/uploads/products/pin_luu_tru/24', 'Gigabox'),
(121, 3, 'Pin Lưu Trữ Lithium SVE 5000RM', '26250000', '/uploads/products/pin_luu_tru/25', 'SVE'),
(122, 3, 'Pin lưu trữ lithium SVE 5000WM (treo tường)', '27090000', '/uploads/products/pin_luu_tru/26', 'SVE'),
(123, 3, 'Pin lưu trữ lithium Hinaess PowerGem Plus 14.3kWh', '60900000', '/uploads/products/pin_luu_tru/27', 'Hinaess'),
(124, 3, 'Pin lưu trữ lithium Hinaess PowerGem 5.12kWh', '30345000', '/uploads/products/pin_luu_tru/28', 'Hinaess'),
(125, 3, 'Pin lưu trữ lithium Hinaess Hi-5 5.12kWh', '30345000', '/uploads/products/pin_luu_tru/29', 'Hinaess'),
(126, 3, 'Pin lưu trữ Lithium E-Power Eco Plus 14.3kWh 51.2V 280Ah', '37800000', '/uploads/products/pin_luu_tru/30', 'E-Power'),
(127, 3, 'Pin Lưu Trữ Lithium Narada RESS LVG1-B5.4 51.2V', 'Lien he', '/uploads/products/pin_luu_tru/31', 'Narada'),
(128, 3, 'Hệ thống lưu trữ công nghiệp & thương mại Narada EDGE F', 'Lien he', '/uploads/products/pin_luu_tru/32', 'Narada'),
(129, 3, 'Pin lưu trữ Lithium SVE Plus 14.3kW', '49350000', '/uploads/products/pin_luu_tru/33', 'SVE'),
(130, 3, 'Pin lưu trữ Lithium Gigabox 16s 15,62kwh', '51450000', '/uploads/products/pin_luu_tru/34', 'Gigabox'),
(131, 4, 'Tủ Điện Tích Hợp Biến Tần Bơm Bedford 11kW | 3 Pha | 380V', '12020000', '/uploads/products/phu_kien/1', 'Bedford'),
(132, 4, 'Tủ Điện Tích Hợp Biến Tần Bơm Bedford 4kW | 3 Pha | 380V', '7144000', '/uploads/products/phu_kien/2', 'Bedford'),
(133, 4, 'Tủ Điện Tích Hợp Biến Tần Bơm Bedford 2.2kW | 3 Pha | 380V', '6900000', '/uploads/products/phu_kien/2', 'Bedford'),
(134, 4, 'Tủ Điện Tích Hợp Biến Tần Bơm Bedford 2.2kW | 1 Pha | 220V', '7800000', '/uploads/products/phu_kien/4', 'Bedford'),
(135, 4, 'Tủ Điện Tích Hợp Biến Tần Bơm Bedford 15kW | 3 Pha | 380V', '12900000', '/uploads/products/phu_kien/5', 'Bedford'),
(136, 4, 'Tủ Điện Tích Hợp Biến Tần Bơm Bedford 7.5kW | 3 Pha | 380V', '9431000', '/uploads/products/phu_kien/5', 'Bedford'),
(137, 4, 'Tủ Điện Tích Hợp Biến Tần Bơm Bedford 5.5kW | 3 Pha | 380V', '8440000', '/uploads/products/phu_kien/7', 'Bedford'),
(138, 4, 'Bát Z 30', '35000', '/uploads/products/phu_kien/8', 'Dang cap nhat'),
(139, 4, 'Bát Z 20', '30000', '/uploads/products/phu_kien/9', 'Dang cap nhat'),
(140, 4, 'Smart Meter Growatt SPM-CT-E 1 pha', '2160000', '/uploads/products/phu_kien/10', 'Growatt'),
(141, 4, 'Smart Meter Growatt TPM-CT-E 3 pha', '5400000', '/uploads/products/phu_kien/11', 'Growatt'),
(142, 4, 'Smart Meter Growatt SDM630-MODBUS-V3 3 pha', '3480000', '/uploads/products/phu_kien/12', 'Growatt'),
(143, 4, 'Smart Meter Growatt SDM230-MODBUS 1 pha', '1680000', '/uploads/products/phu_kien/13', 'Growatt'),
(144, 4, 'Kẹp biên', '15000', '/uploads/products/phu_kien/14', 'Dang cap nhat'),
(145, 4, 'Chân L', '20000', '/uploads/products/phu_kien/15', 'Dang cap nhat'),
(146, 4, 'Mini rail', '30000', '/uploads/products/phu_kien/16', 'Dang cap nhat'),
(147, 4, 'Thanh rail', 'Lien he', '/uploads/products/phu_kien/17', 'Dang cap nhat'),
(148, 4, 'Vít inox', '3000', '/uploads/products/phu_kien/18', 'Dang cap nhat'),
(149, 4, 'Dây DC', '20000', '/uploads/products/phu_kien/19', 'Dang cap nhat'),
(150, 4, 'Kẹp giữa', '15000', '/uploads/products/phu_kien/20', 'Dang cap nhat'),
(151, 4, 'Chổi vệ sinh tấm pin năng lượng mặt trời C21', 'Lien he', '/uploads/products/phu_kien/21', 'Dang cap nhat'),
(152, 4, 'Tủ điện tích hợp TD.PUMP.5R5P-4 | 5.5kW | 3P | 380V', '10143000', '/uploads/products/phu_kien/22', 'INVT'),
(153, 4, 'Tủ điện tích hợp TD.PUMP.004G-4 | 2.2kW | 3P | 380V', '8694000', '/uploads/products/phu_kien/23', 'INVT'),
(154, 4, 'Tủ điện tích hợp TD.PUMP.2R2G-4 | 2.2kW | 3P | 380V', '13041000', '/uploads/products/phu_kien/24', 'INVT'),
(155, 4, 'Tủ điện tích hợp TD.PUMP.004G-SS2 | 4kW | 1P | 220V', '9027500', '/uploads/products/phu_kien/25', 'INVT'),
(156, 4, 'Tủ điện tích hợp TD.PUMP.2R2G-S2 | 2.2kW | 1P | 220V', '6580875', '/uploads/products/phu_kien/26', 'INVT'),
(157, 4, 'Mạch boost áp PP100-3R2-PV 3.2kW kết hợp với biến tần bơm GD100-PV', '3806500', '/uploads/products/phu_kien/27', 'INVT');

-- ============================================================
-- PROJECTS SEED (Dữ liệu dự án)
-- ============================================================

INSERT INTO projects (id, name, client, pillar, location, contract_value_vnd, contract_date, date_display, is_highlight, sort_order) VALUES
(1, 'Hệ thống camera an ninh khuôn viên', 'Trường Đại học Y tế Công cộng', 'it', 'Hà Nội', 804491604, '2017-10-19', NULL, 0, 10),
(2, 'Hệ thống mạng, thoại và âm thanh', 'Tòa nhà AZ Lâm Viên, 107 Nguyễn Phong Sắc', 'it', 'Hà Nội', 908106000, '2020-05-22', NULL, 0, 20),
(3, 'Trang bị thiết bị một cửa điện tử', 'Các xã thuộc huyện Bắc Hà, Si Ma Cai, Mường Khương, Bát Xát', 'it', 'Lào Cai', 22186327987, '2023-10-12', NULL, 1, 30),
(4, 'Hệ thống cơ điện M&E và Điều hòa trung tâm HVAC', 'Tòa nhà Văn phòng & Thương mại Hàng Bài', 'me', 'Hà Nội', 4500000000, '2024-12-15', NULL, 0, 35),
(5, 'Điện mặt trời mái nhà - Hợp tác đầu tư', 'Ban Quản lý Chợ Kim Tân', 'renewable', 'Lào Cai', 500000000, NULL, '04/2025', 0, 40),
(6, 'Điện mặt trời mái nhà - Tự sản tự tiêu', 'Công ty TNHH TM Tổng hợp Tuấn Phương, BQL Chợ Thuận Thành', 'renewable', 'Bắc Ninh', 2750000000, NULL, '05/2025', 0, 50),
(7, 'Điện mặt trời mái nhà - Hợp tác đầu tư', 'Công ty CP TM 69 Tuấn Hải, BQL Chợ đầu mối Ngã Tư Dâu', 'renewable', 'Bắc Ninh', 1800000000, NULL, '04/08/2025', 0, 60),
(8, 'Điện mặt trời mái nhà - Khu thể thao giải trí', 'Công ty CP TM 89 Long Hải, Thuận Thành', 'renewable', 'Bắc Ninh', 1200000000, NULL, '22/08/2025', 0, 70);

-- Project Images Seed
INSERT INTO project_images (project_id, image_url, caption, sort_order) VALUES
-- 1. Camera an ninh
(1, '/images/projects/cam_an_ninh/1.jpg', 'Camera an ninh', 1),
(1, '/images/projects/cam_an_ninh/2.jpg', 'Camera an ninh', 2),

-- 2. Mạng, thoại và âm thanh
(2, '/images/projects/mang_am_thanh/1.jpg', 'Mạng và âm thanh', 1),
(2, '/images/projects/mang_am_thanh/2.jpg', 'Mạng và âm thanh', 2),

-- 3. Một cửa điện tử
(3, '/images/projects/1_cua_truc_tuyen/1.jpg', 'Hệ thống một cửa điện tử', 1),
(3, '/images/projects/1_cua_truc_tuyen/2.jpg', 'Hệ thống một cửa điện tử', 2),
(3, '/images/projects/1_cua_truc_tuyen/3.jpg', 'Hệ thống một cửa điện tử', 3),
(3, '/images/projects/1_cua_truc_tuyen/4.jpg', 'Hệ thống một cửa điện tử', 4),

-- 5. Chợ kim tân 
(5, '/images/projects/cho-kim-tan-rooftop-panels-01.jpg', 'Tấm pin trên mái Chợ Kim Tân', 1),
(5, '/images/projects/cho-kim-tan-crane-install.jpg', 'Lắp đặt bằng cẩu tại công trình', 2),
(5, '/images/projects/cho-kim-tan-rooftop-panels-02.jpg', 'Mảng pin mái nhà', 3),
(5, '/images/projects/cho-kim-tan-exterior-01.jpg', 'Tổng thể công trình', 4),
(5, '/images/projects/electrical-panel-installation.jpg', 'Tủ điện và hệ thống kết nối', 5),

-- 6. Chợ Thuận Thành
(6, '/images/projects/cho_thuan_thanh/1.jpg', 'Mái pin Chợ Thuận Thành', 1),
(6, '/images/projects/cho_thuan_thanh/2.jpg', 'Mái pin Chợ Thuận Thành', 2),
(6, '/images/projects/cho_thuan_thanh/3.jpg', 'Mái pin Chợ Thuận Thành', 3),

-- 7. Chợ Ngã Tư Dâu
(7, '/images/projects/nga_tu_dau/1.jpg', 'Flycam mái pin', 1),
(7, '/images/projects/nga_tu_dau/2.jpg', 'Mái pin', 2),
(7, '/images/projects/nga_tu_dau/3.jpg', 'Biến tần', 3),
(7, '/images/projects/nga_tu_dau/4.jpg', 'Tủ điện', 4),