import ResponsiveLunarScene from "./ui/components/ResponsiveLunarScene";
import GetStartedButton from "./ui/components/GetStartedButton";
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
          <GetStartedButton />
        </div>
      </div>
    </HeroViewport>
  );
}
