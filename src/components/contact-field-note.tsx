import Image from "next/image";
import Link from "next/link";
import { IconArrowUpRight } from "@tabler/icons-react";
import styles from "./contact-field-note.module.css";

export function ContactFieldNote() {
  return (
    <section
      id="contact"
      aria-labelledby="contact-heading"
      className={`${styles.section} home-section reveal`}
    >
      <div className={styles.background} aria-hidden="true">
        <Image
          src="/images/projects/bess_facility.jpg"
          alt=""
          fill
          sizes="100vw"
          loading="lazy"
          className={styles.backgroundImage}
        />
      </div>
      <div className={styles.scrim} aria-hidden="true" />

      <div className={`site-shell ${styles.shell}`}>
        <div className={`${styles.meta} ${styles.metaSingle}`} aria-label="Thông tin section">
          <span className={styles.metaLabel}>Liên hệ tư vấn</span>
        </div>

        <div className={styles.content}>
          <div className={styles.copy}>
            <span className={styles.bracket} aria-hidden="true" />
            <p className={styles.eyebrow}>Bước tiếp theo</p>
            <h2 id="contact-heading" className={styles.title}>
              Bắt đầu từ một cuộc trao đổi
            </h2>
            <p className={styles.description}>
              Chia sẻ loại công trình và nhu cầu sử dụng. Đội ngũ TIS sẽ giúp bạn xác định giải pháp phù hợp nhất, tối ưu chi phí và hiệu năng.
            </p>
          </div>

          <aside className={styles.actionPanel} aria-label="Thông tin liên hệ">
            <div className={styles.actionHeader}>
              <p className={styles.actionLabel}>Hotline tư vấn</p>
              <span className={styles.statusDot} aria-hidden="true" />
            </div>
            <a className={styles.phone} href="tel:0988761315">
              0988 761 315
            </a>
            <p className={styles.actionDescription}>
              Trao đổi trực tiếp để bắt đầu từ đúng bài toán của công trình.
            </p>
            <Link className={styles.cta} href="/contact">
              <span>Gửi yêu cầu trực tuyến</span>
              <IconArrowUpRight size={20} stroke={2} aria-hidden="true" />
            </Link>
          </aside>
        </div>
      </div>
    </section>
  );
}
