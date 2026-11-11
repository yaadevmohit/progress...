import Link from "next/link";
import { MoveRight } from "lucide-react";
import ResponsiveLunarScene from "./ui/components/ResponsiveLunarScene";
import HeroViewport from "./ui/components/HeroViewport";
import styles from "./home.module.css";

export default function Home() {
  return (
    <HeroViewport>
      <div className={styles.scene} aria-hidden="true">
        <div className={styles.gestureZoom}><div className={styles.landscape}><ResponsiveLunarScene /></div></div>
      </div>
      <div className={styles.shade} aria-hidden="true" />
      <div className={styles.grain} aria-hidden="true" />

      <div className={styles.content}>
        <div>
          <h1>Take control<br />of your life<span className={styles.period}>.</span></h1>
        </div>
        <div className={styles.intro}>
          <p>Tools designed to stay organized and feel in control of your life.</p>
          <Link href="/dashboard" className={styles.cta}>
            <span className={styles.ctaLabel}>Get started</span>
            <span className={styles.ctaArrow} aria-hidden="true"><MoveRight size={24} strokeWidth={1.5} /></span>
          </Link>
        </div>
      </div>
    </HeroViewport>
  );
}
