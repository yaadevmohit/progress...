import styles from "./StepLabel.module.css";

export default function StepLabel({ number, label }: { number: number; label: string }) {
  return <span className={styles.label}>
    <span className={styles.number}>{String(number).padStart(2, "0")}</span>
    <span className={styles.separator} aria-hidden="true">\\\</span>
    <span>{label}</span>
  </span>;
}
