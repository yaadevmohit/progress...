// Actual filled arc shapes make each segment its own pointer and keyboard target.
export function donutPath(offset: number, percent: number) {
  if (percent <= 0) return "";
  const point = (radius: number, progress: number) => {
    const angle = (progress / 100) * Math.PI * 2 - Math.PI / 2;
    return `${50 + radius * Math.cos(angle)} ${50 + radius * Math.sin(angle)}`;
  };
  if (percent >= 100)
    return "M 50 1 A 49 49 0 1 1 50 99 A 49 49 0 1 1 50 1 M 50 13 A 37 37 0 1 0 50 87 A 37 37 0 1 0 50 13 Z";
  const end = offset + percent,
    large = percent > 50 ? 1 : 0;
  return `M ${point(49, offset)} A 49 49 0 ${large} 1 ${point(49, end)} L ${point(37, end)} A 37 37 0 ${large} 0 ${point(37, offset)} Z`;
}
