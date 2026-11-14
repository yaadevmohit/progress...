import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import styles from "./page.module.css";
export default function BrandFooter({onAbout}:{onAbout:()=>void}) {
 return <div className={styles.footerOuter}><footer className={styles.brandFooter}><div className={styles.footerTop}><div><span className={styles.footerHeading}>TOOLS</span><Link href="/job-hunt">Jobhunt <ArrowUpRight size={15}/></Link>{['pdpro','Daylight','Focusroom'].map(name=><span key={name} className={styles.comingTool}>{name}<small>In the works</small></span>)}</div><div className={styles.footerThought}>A little more room<br/>for what matters.</div><div><span className={styles.footerHeading}>PROGRESS..</span><Link href="/">The main space <ArrowUpRight size={15}/></Link><button onClick={onAbout}>About these tools</button><button onClick={onAbout}>About your data</button></div></div><div className={styles.footerBottom}><Link href="/" className={styles.parentBrand}>progress..</Link><div><span>© 2026 progress..</span><strong>Born in Toronto.</strong></div><span className={styles.footerNote}>Independent tools.<br/>One thing at a time.</span></div></footer></div>;
}
