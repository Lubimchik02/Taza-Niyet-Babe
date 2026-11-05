/** Геометрия радар-диаграммы навыков: оси равномерно по кругу, первая — вверх. */

export interface Point {
  x: number;
  y: number;
}

export function axisPoint(index: number, count: number, radius: number, center: Point): Point {
  const angle = -Math.PI / 2 + (2 * Math.PI * index) / count;
  return { x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle) };
}

/**
 * Многоугольник значений. Масштаб — по максимальному значению, но не меньше `minScale`,
 * чтобы у новичка 10 XP не выглядели «полностью прокачанным» навыком.
 */
export function radarPolygon(
  values: readonly number[],
  radius: number,
  center: Point,
  minScale = 100,
): Point[] {
  const scale = Math.max(minScale, ...values);
  return values.map((v, i) =>
    axisPoint(i, values.length, (Math.max(0, v) / scale) * radius, center),
  );
}

export function toSvgPoints(points: readonly Point[]): string {
  return points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}
