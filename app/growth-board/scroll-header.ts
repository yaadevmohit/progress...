export type HeaderMotion = {
  y: number;
  anchor: number;
  direction: -1 | 0 | 1;
  floating: boolean;
  visible: boolean;
  animated: boolean;
};
export const INITIAL_HEADER: HeaderMotion = {
  y: 0,
  anchor: 0,
  direction: 0,
  floating: false,
  visible: false,
  animated: false,
};
export function nextHeaderMotion(
  previous: HeaderMotion,
  position: number,
  originalBottom: number,
): HeaderMotion {
  const y = Math.max(0, position);
  if (y === 0) return { ...INITIAL_HEADER };
  if (!previous.floating && y < originalBottom)
    return { ...INITIAL_HEADER, y, anchor: y };
  const direction =
    y > previous.y ? 1 : y < previous.y ? -1 : previous.direction;
  const anchor =
    direction !== previous.direction ? previous.y : previous.anchor;
  const visible =
    Math.abs(y - anchor) >= 8 ? direction === -1 : previous.visible;
  return {
    y,
    anchor,
    direction,
    floating: true,
    visible,
    animated: previous.animated || visible,
  };
}
