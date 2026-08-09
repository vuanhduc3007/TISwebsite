import { IconMail, IconMapPin, IconPhone, IconPlus } from "@tabler/icons-react";
import { ContactForm } from "@/components/contact-form";
import styles from "./contact-blueprint.module.css";

export type ContactMetricIcon = "map-pin" | "phone" | "mail";

export type ContactMetric = {
  label: string;
  value: string;
  icon: ContactMetricIcon;
  href?: string;
  offset?: "none" | "small" | "large";
};

type ContactBlueprintProps = {
  title: string;
  description: string;
  legalName: string;
  motto: string;
  formDescription: string;
  metrics: readonly ContactMetric[];
};

const iconMap: Record<ContactMetricIcon, typeof IconMapPin> = {
  "map-pin": IconMapPin,
  phone: IconPhone,
  mail: IconMail
};

export function ContactBlueprint({
  title,
  description,
  legalName,
  motto,
  formDescription,
  metrics
}: ContactBlueprintProps) {
  return (
    <section className={styles.hero} aria-labelledby="contact-blueprint-title">
      <div className={`${styles.marker} ${styles.markerTop}`} aria-hidden="true">
        <IconPlus size={16} strokeWidth={1.6} />
      </div>

      <div className={`site-shell ${styles.shell}`}>
        <div className={`${styles.copy} reveal`}>
          <p className={styles.eyebrow}>// Kết nối với TIS</p>
          <h1 id="contact-blueprint-title" className={styles.title}>{title}</h1>
          <span className={styles.rule} aria-hidden="true" />
          <p className={styles.description}>{description}</p>
          <p className={styles.legalName}>{legalName}</p>
          <p className={styles.motto}>{motto}</p>

          <ul className={styles.metrics} aria-label="Thông tin liên hệ">
            {metrics.map((metric) => {
              const Icon = iconMap[metric.icon];
              const value = metric.href ? (
                <a className={styles.metricValue} href={metric.href}>
                  {metric.value}
                </a>
              ) : (
                <span className={styles.metricValue}>{metric.value}</span>
              );

              return (
                <li className={styles.metric} data-offset={metric.offset ?? "none"} key={metric.label}>
                  <span className={styles.metricLabel}>{metric.label}</span>
                  {value}
                  <Icon className={styles.metricIcon} size={19} strokeWidth={1.7} aria-hidden="true" />
                </li>
              );
            })}
          </ul>
        </div>

        <div className={`${styles.formPanel} reveal`}>
          <div className={styles.formHeader}>
            <p className={styles.formEyebrow}>Kênh tiếp nhận</p>
            <span className={styles.formIndex}>01 / 01</span>
          </div>
          <h2 className={styles.formTitle}>Bắt đầu từ thông tin thực tế</h2>
          <p className={styles.formDescription}>{formDescription}</p>
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
