import {
  IconBatteryCharging,
  IconBolt,
  IconRouter,
  IconShieldCheck,
  IconSun,
  IconWifi
} from "@tabler/icons-react";
import type { SupportIcon, SupportTopic } from "@/content/support";
import styles from "./support-topic-card.module.css";

const iconMap: Record<SupportIcon, typeof IconSun> = {
  sun: IconSun,
  bolt: IconBolt,
  battery: IconBatteryCharging,
  wifi: IconWifi,
  router: IconRouter,
  shield: IconShieldCheck
};

export function SupportTopicCard({ topic }: { topic: SupportTopic }) {
  const Icon = iconMap[topic.icon];

  return (
    <article className={`${styles.card} reveal`} data-category={topic.category}>
      <div className={styles.topline}>
        <div className={styles.iconWrap} aria-hidden="true">
          <Icon size={24} strokeWidth={1.7} />
        </div>
        <span className={styles.category}>{topic.categoryLabel}</span>
      </div>
      <h3 className={styles.title}>{topic.title}</h3>
      <p className={styles.summary}>{topic.summary}</p>
      <div className={styles.checklistHeader}>
        <span>Các bước kiểm tra</span>
        <span className={styles.topicMark} aria-hidden="true">/ /</span>
      </div>
      <ul className={styles.checklist}>
        {topic.checks.map((check) => (
          <li key={check}>{check}</li>
        ))}
      </ul>
    </article>
  );
}
