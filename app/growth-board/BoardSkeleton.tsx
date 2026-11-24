import AccountButtons from "../auth/AccountButtons";
import ScrollHeader from "./ScrollHeader";
import ThemeToggle from "./ThemeToggle";
import styles from "./tracker.module.css";
import skeleton from "./skeleton.module.css";

function Bone({ className = "" }: { className?: string }) {
  return <div className={`${skeleton.bone} ${className}`} />;
}

export function ActivitySkeleton() {
  return (
    <section className={`${styles.panel} ${styles.activity}`} aria-hidden="true">
      <Bone className="h-6 w-28" />
      <Bone className="mt-2 h-3 w-44 max-w-full" />
      <div className={skeleton.activity}>
        {Array.from({ length: 7 }, (_, index) => (
          <div key={index}>
            <Bone className={skeleton.tile} />
            <Bone className="mx-auto mt-2 h-2 w-3/4" />
          </div>
        ))}
      </div>
      <Bone className="mt-5 h-3 w-40 max-w-full" />
    </section>
  );
}

export default function BoardSkeleton() {
  return (
    <div className={styles.root}>
      <ScrollHeader>
        <a href="/growth-board" className="text-xl font-extrabold tracking-tight sm:text-2xl">
          Growth Board<span className="text-[var(--tracker-accent)]">.</span>
        </a>
        <div className={styles.headerActions}>
          <span aria-hidden="true"><Bone className="h-10 w-24 sm:w-32" /></span>
          <AccountButtons growth />
          <ThemeToggle />
        </div>
      </ScrollHeader>
      <main className={styles.main} aria-busy="true" aria-label="Growth Board">
        <p role="status" className="sr-only">Loading your Growth Board…</p>
        <div aria-hidden="true">
          <div className={styles.stage}>
            <div className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div className="max-w-full">
                <Bone className="h-9 w-56 max-w-full" />
                <Bone className="mt-2 h-4 w-80 max-w-full" />
              </div>
              <Bone className="h-10 w-40" />
            </div>
            <div className={styles.dashboard}>
              <div className={styles.left}>
                <section className={`${styles.panel} ${styles.leader}`}>
                  <div className={`${styles.ring} ${skeleton.ring}`} />
                  <Bone className="mt-5 h-3 w-36" />
                  <Bone className="mt-3 h-7 w-3/4" />
                  <Bone className="mt-3 h-4 w-full" />
                  <Bone className="mt-2 h-4 w-2/3" />
                  <div className="mt-auto border-t border-[var(--tracker-line)] pt-5">
                    <Bone className="h-3 w-24" />
                    <Bone className="mt-3 h-4 w-3/4" />
                    <Bone className="mt-2 h-3 w-1/2" />
                    <Bone className="mt-6 h-9 w-32" />
                  </div>
                </section>
              </div>
              <div className={styles.right}>
                <Bone className="ml-auto h-4 w-10" />
                <div className={styles.skills}>
                  {Array.from({ length: 6 }, (_, index) => (
                    <div className={`${styles.skill} ${skeleton.card}`} key={index}>
                      <Bone className="h-4 w-3/4" />
                      <Bone className="my-4 h-8 w-1/2" />
                      <Bone className="h-3 w-2/3" />
                    </div>
                  ))}
                </div>
                <ActivitySkeleton />
              </div>
            </div>
          </div>
          <section className="pb-10 pt-6">
            <Bone className="mb-4 h-6 w-40" />
            <div className="divide-y divide-[var(--tracker-line)] rounded-2xl border border-[var(--tracker-line)]">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="flex items-center justify-between gap-5 p-4">
                  <div className="w-2/3">
                    <Bone className="h-4 w-40 max-w-full" />
                    <Bone className="mt-2 h-3 w-56 max-w-full" />
                  </div>
                  <Bone className="h-4 w-14" />
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
