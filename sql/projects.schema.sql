-- Projects list + gallery images (run against MYSQL_DATABASE used by the website)

CREATE TABLE IF NOT EXISTS projects (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name                VARCHAR(255) NOT NULL,
  client              TEXT NOT NULL,
  pillar              ENUM('it', 'renewable') NOT NULL,
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

CREATE TABLE IF NOT EXISTS project_images (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id  INT UNSIGNED NOT NULL,
  image_url   VARCHAR(512) NOT NULL,
  caption     VARCHAR(255) NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_project_images_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_project_images_project (project_id, sort_order, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed (safe to re-run: clears gallery + projects only)
DELETE FROM project_images;
DELETE FROM projects;

INSERT INTO projects (id, name, client, pillar, contract_value_vnd, contract_date, date_display, is_highlight, sort_order) VALUES
(1, 'Hệ thống camera an ninh khuôn viên', 'Trường Đại học Y tế Công cộng', 'it', 804491604, '2017-10-19', NULL, 0, 10),
(2, 'Hệ thống mạng, thoại và âm thanh', 'Tòa nhà AZ Lâm Viên, 107 Nguyễn Phong Sắc, Cầu Giấy, Hà Nội', 'it', 908106000, '2020-05-22', NULL, 0, 20),
(3, 'Trang bị thiết bị một cửa điện tử', 'Các xã thuộc huyện Bắc Hà, Si Ma Cai, Mường Khương, Bát Xát, Bảo Yên, Văn Bàn, Lào Cai', 'it', 22186327987, '2023-10-12', NULL, 1, 30),
(4, 'Điện mặt trời mái nhà - Hợp tác đầu tư', 'Ban Quản lý Chợ Kim Tân, Lào Cai', 'renewable', 500000000, NULL, '04/2025', 0, 40),
(5, 'Điện mặt trời mái nhà - Tự sản tự tiêu', 'Công ty TNHH TM Tổng hợp Tuấn Phương, BQL Chợ Thuận Thành, Bắc Ninh', 'renewable', 2750000000, NULL, '05/2025', 0, 50),
(6, 'Điện mặt trời mái nhà - Hợp tác đầu tư', 'Công ty CP TM 69 Tuấn Hải, BQL Chợ đầu mối Ngã Tư Dâu, Bắc Ninh', 'renewable', 1800000000, NULL, '04/08/2025', 0, 60),
(7, 'Điện mặt trời mái nhà - Khu thể thao giải trí', 'Công ty CP TM 89 Long Hải, Thuận Thành, Bắc Ninh', 'renewable', 1200000000, NULL, '22/08/2025', 0, 70);

INSERT INTO project_images (project_id, image_url, caption, sort_order) VALUES
(4, '/images/projects/cho-kim-tan-rooftop-panels-01.jpg', 'Tấm pin trên mái Chợ Kim Tân', 1),
(4, '/images/projects/cho-kim-tan-crane-install.jpg', 'Lắp đặt bằng cẩu tại công trình', 2),
(4, '/images/projects/cho-kim-tan-rooftop-panels-02.jpg', 'Mảng pin mái nhà', 3),
(4, '/images/projects/cho-kim-tan-exterior-01.jpg', 'Tổng thể công trình', 4),
(4, '/images/projects/electrical-panel-installation.jpg', 'Tủ điện và hệ thống kết nối', 5),
(5, '/images/projects/cho-thuan-thanh-exterior.jpg', 'Chợ Thuận Thành', 1),
(6, '/images/projects/cho-nga-tu-dau-exterior.jpg', 'Mặt tiền Chợ Ngã Tư Dâu', 1),
(6, '/images/projects/cho-nga-tu-dau-rooftop-aerial-01.jpg', 'Flycam mái pin', 2);
