import { cellArea, cellToBoundary, cellToLatLng, getResolution, isValidCell, latLngToCell } from 'h3-js'
import { isInGhana } from './ghana.js'

/**
 * AfriHex codes: AF-{COUNTRY}-{LEVEL}-{ID}, where ID is the full 64-bit H3
 * cell index in Crockford base-32, 13 characters. Encoding is pure maths, so
 * it works with no network. The ID ends in "Z"s that carry no information
 * (H3's unused digits); the short form drops them, and both forms decode to
 * the same cell. See SPEC.md.
 */

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const ID_LENGTH = 13

/** Grid levels AfriHex codes can use: 0 (whole regions) to 15 (under a metre). */
export const MIN_LEVEL = 0
export const MAX_LEVEL = 15

export interface DecodedCode {
  /** The full code, e.g. AF-GH-12-0GXTJJBE4RZZZ. */
  code: string
  /** The same code without the trailing filler Z's. */
  shortCode: string
  country: string
  level: number
  /** Centre of the cell. */
  lat: number
  lng: number
  /** Cell outline as [lat, lng] pairs. */
  boundary: [number, number][]
  areaM2: number
  /** The H3 cell index (hex string). */
  h3Index: string
}

export class AfriHexError extends Error {}

function toId(cell: string): string {
  let n = BigInt('0x' + cell)
  let id = ''
  for (let i = 0; i < ID_LENGTH; i++) {
    id = CROCKFORD[Number(n % 32n)] + id
    n /= 32n
  }
  return id
}

/**
 * The AfriHex code for a point. Level sets the cell size: 7 is about 2 km
 * across (the API's default), 12 about 20 m, 13 about 7 m. Throws for a point
 * outside Ghana or an invalid level.
 */
export function encode(lat: number, lng: number, level: number): string {
  if (!Number.isInteger(level) || level < MIN_LEVEL || level > MAX_LEVEL) {
    throw new AfriHexError(`level must be a whole number from ${MIN_LEVEL} to ${MAX_LEVEL}`)
  }
  if (!isInGhana(lat, lng)) {
    throw new AfriHexError('the point is outside Ghana')
  }
  const cell = latLngToCell(lat, lng, level)
  return `AF-GH-${level}-${toId(cell)}`
}

/** The H3 cell for a code in either form, or null if it isn't a valid code. */
export function codeToCell(code: string): string | null {
  const parts = code.trim().toUpperCase().split('-')
  if (parts.length !== 4 || parts[0] !== 'AF' || !/^[A-Z]{2}$/.test(parts[1]) || !/^\d{1,2}$/.test(parts[2])) return null
  const id = parts[3]
  if (id.length === 0 || id.length > ID_LENGTH) return null
  let n = 0n
  for (const ch of id.padEnd(ID_LENGTH, 'Z')) {
    const v = CROCKFORD.indexOf(ch)
    if (v < 0) return null
    n = n * 32n + BigInt(v)
  }
  if (n >= 1n << 64n) return null
  const cell = n.toString(16)
  if (!isValidCell(cell) || getResolution(cell) !== Number(parts[2])) return null
  return cell
}

/** Whether a string is a valid AfriHex code, full or short. */
export function isValid(code: string): boolean {
  return codeToCell(code) !== null
}

/** The full form of a code (what the API stores and returns as `code`). */
export function fullCode(code: string): string {
  const cell = codeToCell(code)
  if (!cell) throw new AfriHexError(`not an AfriHex code: ${code}`)
  const country = code.trim().toUpperCase().split('-')[1]
  return `AF-${country}-${getResolution(cell)}-${toId(cell)}`
}

/** The short form of a code: the same cell without the filler Z's. */
export function shortCode(code: string): string {
  return fullCode(code).replace(/Z+$/, '')
}

/** Everything about a code, worked out offline. Throws if it isn't valid. */
export function decode(code: string): DecodedCode {
  const cell = codeToCell(code)
  if (!cell) throw new AfriHexError(`not an AfriHex code: ${code}`)
  const full = fullCode(code)
  const [lat, lng] = cellToLatLng(cell)
  return {
    code: full,
    shortCode: full.replace(/Z+$/, ''),
    country: full.split('-')[1],
    level: getResolution(cell),
    lat,
    lng,
    boundary: cellToBoundary(cell) as [number, number][],
    areaM2: cellArea(cell, 'm2'),
    h3Index: cell,
  }
}
