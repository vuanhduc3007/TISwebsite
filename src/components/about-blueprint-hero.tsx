import { IconPlus } from "@tabler/icons-react";
import styles from "./about-blueprint-hero.module.css";

export type AboutMetric = {
  label: string;
  value: string;
  detail: string;
  offset?: "none" | "small" | "large";
};

type AboutBlueprintHeroProps = {
  title: string;
  description: string;
  metrics: readonly AboutMetric[];
  eyebrow?: string;
  metricsIntro?: string;
  signature?: string;
  titleId?: string;
};

export function AboutBlueprintHero({
  title,
  description,
  metrics,
  eyebrow = "// Hồ sơ năng lực",
  metricsIntro = "Một vài điểm neo",
  signature = "TIS / 2013 — hiện tại",
  titleId = "about-blueprint-title"
}: AboutBlueprintHeroProps) {
  return (
    <section className={styles.hero} aria-labelledby={titleId}>
      <div className={`${styles.marker} ${styles.markerTop}`} aria-hidden="true">
        <IconPlus size={16} strokeWidth={1.6} />
      </div>
      <div className={`${styles.marker} ${styles.markerBottom}`} aria-hidden="true">
        <IconPlus size={16} strokeWidth={1.6} />
      </div>

      <div className={`site-shell ${styles.shell}`}>
        <div className={`${styles.copy} rise-in`}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1 id={titleId} className={styles.title}>{title}</h1>
          <span className={styles.rule} aria-hidden="true" />
          <p className={styles.description}>{description}</p>
          <p className={styles.signature}>{signature}</p>
        </div>

        <div className={styles.metricsPanel}>
          <p className={styles.metricsIntro}>{metricsIntro}</p>
          <ul className={styles.metrics} aria-label="Thông tin nhanh về TIS">
            {metrics.map((metric) => (
              <li className={styles.metric} data-offset={metric.offset ?? "none"} key={metric.label}>
                <span className={styles.metricLabel}>{metric.label}</span>
                <strong className={styles.metricValue}>{metric.value}</strong>
                <span className={styles.metricDetail}>{metric.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
