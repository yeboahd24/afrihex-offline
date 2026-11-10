import { encode, shortCode } from './codec'

/**
 * The code level that matches how precise a GPS reading is: a finer cell than
 * the reading can support would claim precision the phone doesn't have.
 */
export function levelForAccuracy(accuracyM: number): number {
  if (!Number.isFinite(accuracyM) || accuracyM <= 0) return 12
  if (accuracyM <= 8) return 13 // about 7 m across
  if (accuracyM <= 20) return 12 // about 20 m
  if (accuracyM <= 50) return 11 // about 50 m
  if (accuracyM <= 130) return 10 // about 130 m
  return 9 // about 350 m
}

/** Above this, a reading is rough and the message says so. */
export const ROUGH_ACCURACY_M = 50

export interface ShareInput {
  lat: number
  lng: number
  /** The phone's reported accuracy in metres, if known. */
  accuracyM?: number
  /** When the position was taken. */
  at?: Date
  /** Override the level chosen from accuracy. */
  level?: number
  /** Text before the location, e.g. a name or "Delivery to". */
  label?: string
}

export interface ShareMessage {
  code: string
  shortCode: string
  level: number
  /** True when the reading was too imprecise to rely on alone. */
  rough: boolean
  /** Plain text for an SMS or chat: works on any phone, no app needed. */
  text: string
}

const clock = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

/**
 * A message anyone can act on: the AfriHex code for AfriHex apps, plus plain
 * coordinates and a map link that open in any map app, with the accuracy and
 * time so the reader knows how far to trust it.
 */
export function shareMessage(input: ShareInput): ShareMessage {
  const level = input.level ?? levelForAccuracy(input.accuracyM ?? NaN)
  const code = encode(input.lat, input.lng, level)
  const short = shortCode(code)
  const rough = input.accuracyM != null && input.accuracyM > ROUGH_ACCURACY_M
  const lat = input.lat.toFixed(5)
  const lng = input.lng.toFixed(5)
  const lines: string[] = []
  lines.push(input.label ? `${input.label}: AfriHex ${short}` : `AfriHex ${short}`)
  let where = `${lat}, ${lng}`
  if (input.accuracyM != null && Number.isFinite(input.accuracyM)) where += ` (±${Math.round(input.accuracyM)} m)`
  if (input.at) where += ` at ${clock(input.at)}`
  lines.push(where)
  lines.push(`https://maps.google.com/?q=${lat},${lng}`)
  if (rough) lines.push('Location is rough: please describe where you are.')
  return { code, shortCode: short, level, rough, text: lines.join('\n') }
}
