/**
 * Parses a cooldown string (e.g. "6d", "12h", "30m", "1y") into a number of days.
 * Returns `null` if the string does not match a valid format.
 *
 * Note: "y" (year) uses a fixed 365-day approximation.
 */
function parseCooldown(s: string): number | null {
  const match = s.match(/^(\d+(?:\.\d+)?)(d|h|m|y)$/)
  if (!match) return null

  const value = parseFloat(match[1])
  const unit = match[2]

  if (unit === 'y') return value * 365 // approximate: 365 days per year
  if (unit === 'd') return value
  if (unit === 'h') return value / 24
  // unit === 'm'
  return value / (24 * 60)
}

export default parseCooldown
