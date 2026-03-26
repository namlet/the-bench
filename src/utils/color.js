/**
 * Returns an HSL color string based on player status.
 *
 * Field: starts blue (rested), progresses to red over threshold.
 * Bench: starts at the heat from their last field stint, cools back to blue.
 *
 * Hue path: Blue (210) -> Green (120) -> Yellow (60) -> Red (0)
 *
 * @param {object} opts
 * @param {string} opts.location - 'field' or 'bench'
 * @param {number} opts.stintMs - current stint duration in ms
 * @param {number} opts.lastFieldStintMs - duration of last field stint (bench cooldown)
 * @param {number} opts.thresholdMinutes - minutes until fully red
 * @returns {{ color: string, isFullRed: boolean }}
 */
export function getPlayerColor({ location, stintMs, lastFieldStintMs, thresholdMinutes }) {
  const thresholdMs = thresholdMinutes * 60 * 1000

  if (location === 'field') {
    const progress = Math.min(stintMs / thresholdMs, 1)
    const hue = lerp(210, 0, progress)
    return {
      color: `hsl(${hue}, 70%, 50%)`,
      isFullRed: progress >= 1,
    }
  }

  // Bench: arrive with heat from last field stint, cool down over threshold
  if (!lastFieldStintMs) {
    return { color: 'hsl(210, 70%, 50%)', isFullRed: false }
  }

  const heatAtArrival = Math.min(lastFieldStintMs / thresholdMs, 1)
  const cooldown = Math.min(stintMs / thresholdMs, 1)
  const currentHeat = Math.max(heatAtArrival - cooldown, 0)

  const hue = lerp(210, 0, currentHeat)
  return {
    color: `hsl(${hue}, 70%, 50%)`,
    isFullRed: false,
  }
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

/**
 * Format milliseconds as M:SS
 */
export function formatTime(ms) {
  if (ms < 0) ms = 0
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
