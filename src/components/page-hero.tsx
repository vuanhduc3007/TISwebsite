import Image from "next/image";
import styles from "./page-hero.module.css";

type PageHeroProps = {
  title: string;
  description: string;
  image: string;
  imageAlt: string;
};

export function PageHero({ title, description, image, imageAlt }: PageHeroProps) {
  return (
    <section className={styles.hero}>
      <div className={`site-shell ${styles.shell}`}>
        <div className={`${styles.copy} rise-in`}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.description}>{description}</p>
        </div>
        <div className={styles.media}>
          <Image src={image} alt={imageAlt} fill priority sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover" />
        </div>
      </div>
    </section>
  );
}
