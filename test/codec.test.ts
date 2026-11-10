import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { AfriHexError, decode, encode, fullCode, isValid, levelForAccuracy, shareMessage, shortCode } from '../src/index'

interface Vector { name: string; lat: number; lng: number; level: number; in_ghana: boolean; code?: string; short?: string }
const vectors: Vector[] = JSON.parse(readFileSync(new URL('./vectors.json', import.meta.url), 'utf8'))

describe('matches the AfriHex API exactly', () => {
  it.each(vectors.filter(v => v.in_ghana))('$name at level $level', v => {
    expect(encode(v.lat, v.lng, v.level)).toBe(v.code)
    expect(shortCode(v.code!)).toBe(v.short)
    const d = decode(v.short!)
    expect(d.code).toBe(v.code)
    expect(d.level).toBe(v.level)
  })
  it.each(vectors.filter(v => !v.in_ghana && v.level === 7))('refuses $name, outside Ghana', v => {
    expect(() => encode(v.lat, v.lng, v.level)).toThrow(AfriHexError)
  })
})

describe('reading codes', () => {
  const full = 'AF-GH-7-0GXTJJBDZZZZZ'
  it('accepts full, short and lower-case forms', () => {
    for (const c of [full, 'AF-GH-7-0GXTJJBD', 'af-gh-7-0gxtjjbd', ' AF-GH-7-0GXTJJBDZZ ']) {
      expect(isValid(c)).toBe(true)
      expect(fullCode(c)).toBe(full)
    }
  })
  it('rejects things that are not codes', () => {
    for (const c of ['GA-183-8164', 'AF-GH-9-0GXTJJBD', 'AF-GH-7-', 'AF-GH-7-0GXT!JBD', 'AF-GH-7-0GXTJJBDZZZZZZ', '']) {
      expect(isValid(c)).toBe(false)
    }
    expect(() => decode('nope')).toThrow(AfriHexError)
  })
  it('gives the cell centre and size', () => {
    const d = decode('AF-GH-13-' + shortCode(encode(5.6319, -0.14, 13)).split('-')[3])
    expect(d.lat).toBeCloseTo(5.6319, 3)
    expect(d.areaM2).toBeGreaterThan(20)
    expect(d.areaM2).toBeLessThan(80)
    expect(d.boundary.length).toBeGreaterThanOrEqual(5)
  })
  it('refuses a bad level', () => {
    expect(() => encode(5.6, -0.18, 16)).toThrow(AfriHexError)
    expect(() => encode(5.6, -0.18, 7.5)).toThrow(AfriHexError)
  })
})

describe('sharing a location', () => {
  it('picks the level from GPS accuracy', () => {
    expect([5, 15, 40, 100, 500].map(levelForAccuracy)).toEqual([13, 12, 11, 10, 9])
    expect(levelForAccuracy(NaN)).toBe(12)
  })
  it('writes a message any phone can use', () => {
    const m = shareMessage({ lat: 5.63194, lng: -0.13998, accuracyM: 8, at: new Date(2026, 10, 10, 14, 5), label: 'Ama' })
    expect(m.level).toBe(13)
    expect(m.rough).toBe(false)
    expect(m.text).toBe(`Ama: AfriHex ${m.shortCode}\n5.63194, -0.13998 (±8 m) at 14:05\nhttps://maps.google.com/?q=5.63194,-0.13998`)
    expect(decode(m.shortCode).code).toBe(m.code)
  })
  it('says so when the reading is rough', () => {
    const m = shareMessage({ lat: 5.63194, lng: -0.13998, accuracyM: 300 })
    expect(m.rough).toBe(true)
    expect(m.level).toBe(9)
    expect(m.text).toContain('please describe where you are')
  })
})
