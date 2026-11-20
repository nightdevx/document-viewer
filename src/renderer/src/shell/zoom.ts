const LEVELS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5]

export const clampZoom = (z: number): number => Math.min(5, Math.max(0.25, z))

/** Next preset level above (1) or below (-1) the current zoom. */
export function nextZoom(current: number, dir: 1 | -1): number {
  const found = dir === 1 ? LEVELS.find((l) => l > current + 1e-6) : [...LEVELS].reverse().find((l) => l < current - 1e-6)
  return found ?? (dir === 1 ? 5 : 0.25)
}
