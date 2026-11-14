export const TRACKER_THEME_KEY = "progress.skills-tracker.theme";

// Runs before hydration so a saved dark preference does not flash bright yellow.
export const TRACKER_THEME_SCRIPT = `try{document.documentElement.dataset.skillsTheme=localStorage.getItem(${JSON.stringify(TRACKER_THEME_KEY)})==="dark"?"dark":"light"}catch{}`;
