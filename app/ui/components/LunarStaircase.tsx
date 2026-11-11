import styles from "../../home.module.css";

const STEPS = Array.from({ length: 6 }, (_, index) => ({
  x: 500 + index * 52,
  y: 452 - index * 42,
}));

const DISTANT_STAIRS = [
  { x: 90, y: 460, scale: .085 },
  { x: 345, y: 463, scale: .09 },
  { x: 850, y: 460, scale: .08 },
  { x: 1000, y: 450, scale: .085 },
  { x: 1310, y: 452, scale: .09 },
  { x: 210, y: 504, scale: .12 },
  { x: 465, y: 510, scale: .11 },
  { x: 810, y: 497, scale: .105 },
  { x: 1120, y: 504, scale: .115 },
  { x: 1390, y: 510, scale: .12 },
  { x: 80, y: 562, scale: .155 },
  { x: 350, y: 575, scale: .15 },
  { x: 675, y: 564, scale: .14 },
  { x: 1010, y: 563, scale: .145 },
  { x: 1280, y: 572, scale: .16 },
];

function starTiming(index: number) {
  return {
    "--twinkle-duration": `${5 + (index * 367 % 1001) / 100}s`,
    "--twinkle-delay": `-${(index * 541 % 1700) / 100}s`,
  } as React.CSSProperties;
}

function StairAssembly({ ambient = false }: { ambient?: boolean }) {
  return (
    <g>
      <path d="M493 492 796 474 1060 730 893 756Z" fill="#050607" opacity=".35" filter="url(#soft-shadow)" />
      <ellipse cx="667" cy="489" rx="195" ry="18" fill="#060708" opacity=".4" filter="url(#soft-shadow)" />

      <g className={styles.hoveringStaircase}>
      {/* Side-facing solid steps: top, front, and the shaded right face. */}
      {STEPS.map(({ x, y }) => (
        <g key={x} className={styles.stairStep} style={{ "--step-lift": `-${(x - 500) / 52 * 1.5 + 2}px` } as React.CSSProperties}>
          <path d={`M${x} ${y}h52V492h-52Z`} fill="url(#stair-front)" stroke="#fff" strokeOpacity=".15" strokeWidth=".6" />
          <path d={`M${x + 52} ${y}l32 -20V472l-32 20Z`} fill="url(#stair-side)" />
          <path d={`M${x} ${y}l32 -20h52l-32 20Z`} fill="#f3f3ef" />
          <path d={`M${x} ${y}h52`} fill="none" stroke="#fff" strokeOpacity=".7" />
        </g>
      ))}

      {/* Hovering at the bottom; the button starts a separate floating ascent. */}
      <ellipse cx="480" cy="494" rx="16" ry="3" fill="#000" opacity=".25" />
      <g className={ambient ? styles.ambientClimber : styles.climber}>
        <g transform="scale(.8)" className={ambient ? styles.ambientFigure : styles.floatingFigure}>
          <ellipse className={ambient ? styles.ambientAura : styles.characterAura} cx="3" cy="-36" rx="65" ry="84" fill="url(#character-aura)" />
          <g className={styles.backLeg}>
            <rect x="-12" y="-23" width="11" height="23" rx="2" fill="#eeeeea" />
            <path d="M-12 -7h14v8h-14Z" fill="#f8f8f4" />
          </g>
          <g className={styles.frontLeg}>
            <rect x="2" y="-23" width="11" height="23" rx="2" fill="#f2f2ee" />
            <path d="M2 -7h15v8H2Z" fill="#fff" />
          </g>
          <g className={styles.backArm}>
            <rect x="-20" y="-46" width="9" height="23" rx="4" fill="#8e9393" />
            <path d="M-20 -25q-6 9 2 12" fill="none" stroke="#e6e7e2" strokeWidth="5" strokeLinecap="round" />
          </g>
          <path d="M-12 -48h25l5 25h-35Z" fill="#e8e9e5" />
          <path d="M8 -48h5l5 25H8Z" fill="#a3a8a7" />
          <rect x="-4" y="-54" width="13" height="8" rx="2" fill="#b4b8b6" />
          <rect x="-10" y="-76" width="29" height="25" rx="7" fill="#f0f0ea" />
          <ellipse cx="4.5" cy="-74" rx="14.5" ry="4" fill="#fff" />
          <rect x="0" y="-82" width="10" height="7" rx="2" fill="#dedfd9" />
          <circle cx="13" cy="-65" r="1.5" fill="#2b2f31" />
          <path d="M11 -58q4 2 6 -1" fill="none" stroke="#6a6f6f" strokeWidth="1.2" strokeLinecap="round" />
          <g className={styles.frontArm}>
            <rect x="7" y="-45" width="10" height="24" rx="4" fill="#f5f5ef" />
            <path d="M12 -22q-3 10 5 10" fill="none" stroke="#c7cbc7" strokeWidth="5" strokeLinecap="round" />
          </g>
        </g>
      </g>
      </g>
    </g>
  );
}

export default function LunarStaircase() {
  return (
    <svg className={styles.lunarScene} viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="lunar-sky" x2="0" y2="1">
          <stop stopColor="#08090b" />
          <stop offset="1" stopColor="#303135" />
        </linearGradient>
        <radialGradient id="lunar-haze">
          <stop stopColor="#e3e4e6" stopOpacity=".18" />
          <stop offset="1" stopColor="#bfc0c2" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="lunar-ground" x2=".3" y2="1">
          <stop stopColor="#77787b" />
          <stop offset=".5" stopColor="#36373a" />
          <stop offset="1" stopColor="#141517" />
        </linearGradient>
        <linearGradient id="stair-front" x2="1" y2="1">
          <stop stopColor="#e6e6e4" />
          <stop offset="1" stopColor="#aaaead" />
        </linearGradient>
        <linearGradient id="stair-side" x2="1" y2=".4">
          <stop stopColor="#919493" />
          <stop offset="1" stopColor="#4c5050" />
        </linearGradient>
        <radialGradient id="crater">
          <stop stopColor="#1b1d20" stopOpacity=".6" />
          <stop offset=".7" stopColor="#343639" stopOpacity=".3" />
          <stop offset="1" stopColor="#ddd" stopOpacity=".1" />
        </radialGradient>
        <filter id="soft-shadow"><feGaussianBlur stdDeviation="9" /></filter>
        <linearGradient id="navbar-fade" x2="0" y2="1">
          <stop stopColor="#fff" />
          <stop offset=".19" stopColor="#fff" stopOpacity=".98" />
          <stop offset=".55" stopColor="#e4e5e5" stopOpacity=".2" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="galaxy-core">
          <stop stopColor="#fff" stopOpacity=".5" />
          <stop offset=".32" stopColor="#f1f2f2" stopOpacity=".28" />
          <stop offset=".7" stopColor="#c5c7c9" stopOpacity=".07" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <filter id="galaxy-dust" x="-20%" y="-80%" width="140%" height="260%">
          <feTurbulence type="fractalNoise" baseFrequency=".009 .027" numOctaves="4" seed="18" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="100" />
          <feGaussianBlur stdDeviation="2" />
        </filter>
        <radialGradient id="character-aura">
          <stop stopColor="#fff" stopOpacity=".7" />
          <stop offset=".5" stopColor="#fff" stopOpacity=".28" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>

      <path fill="url(#lunar-sky)" d="M0 0h1440v900H0z" />
      <ellipse cx="780" cy="200" rx="600" ry="260" fill="url(#lunar-haze)" />
      <g className={styles.galaxy}>
        <ellipse cx="730" cy="180" rx="950" ry="190" fill="url(#galaxy-core)" transform="rotate(-14 730 180)" filter="url(#galaxy-dust)" />
        <ellipse cx="630" cy="150" rx="700" ry="66" fill="url(#galaxy-core)" transform="rotate(-14 630 150)" filter="url(#galaxy-dust)" />
        {Array.from({ length: 380 }, (_, i) => {
          const x = (i * 173.31 + 81) % 1440;
          const spread = ((i * 71.77) % 1 - .5) * ((i % 4) * 55 + 65);
          const y = 290 - x * .16 + spread;
          return <circle key={i} className={styles.star} style={starTiming(i)} cx={x} cy={y} r={i % 17 === 0 ? 1.3 : .35 + (i % 4) * .15} fill="#fff" opacity={.25 + (i % 7) * .1} />;
        })}
      </g>
      {Array.from({ length: 130 }, (_, i) => (
        <circle key={i} className={styles.star} style={starTiming(i + 900)} cx={(i * 179.3 + 39) % 1440} cy={(i * 73.7 + 33) % 580} r={i % 9 === 0 ? 1 : .5} fill="#fff" opacity={.15 + (i % 5) * .09} />
      ))}
      <path fill="url(#navbar-fade)" d="M0 0h1440v440H0z" />
      <g className={styles.ground}>
      <path d="M0 441Q130 405 250 445T510 448Q650 427 780 440T1020 425T1250 420T1440 444V900H0Z" fill="url(#lunar-ground)" />
      <path d="M0 441Q130 405 250 445T510 448Q650 427 780 440T1020 425T1250 420T1440 444" fill="none" stroke="#b9bbbd" strokeOpacity=".15" />
      {Array.from({ length: 28 }, (_, i) => (
        <ellipse key={i} cx={(i * 197 + 62) % 1440} cy={475 + (i * 53) % 390} rx={10 + (i * 7) % 50} ry={3 + (i * 3) % 13} fill="url(#crater)" transform={`rotate(-8 ${(i * 197 + 62) % 1440} ${475 + (i * 53) % 390})`} />
      ))}
      </g>
      <g className={styles.surfaceCamera}>
      {DISTANT_STAIRS.map(({ x, y, scale }, index) => (
        <g
          key={index}
          className={styles.surroundingStaircase}
          transform={`translate(${x} ${y}) scale(${scale}) translate(-656 -492)`}
          style={{ "--float-delay": `-${index * 1.73 + 2}s`, "--float-duration": `${10 + index % 5}s` } as React.CSSProperties}
        >
          <StairAssembly ambient />
        </g>
      ))}
        <g className={styles.stairWorld}>
          <StairAssembly />
        </g>
      </g>
    </svg>
  );
}
