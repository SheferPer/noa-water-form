import { BILLING_PERIOD_START, PROPERTIES, type Property } from './seed'

export function getProperty(id: string | null): Property | undefined {
  return id ? PROPERTIES.find((p) => p.id === id) : undefined
}

export function findByAccount(accountNumber: string): Property | undefined {
  return PROPERTIES.find((p) => p.accountNumber === accountNumber.trim())
}

export type MeterCheck =
  | { result: 'ok'; property: Property }
  | { result: 'main-meter' }
  | { result: 'mismatch' }
  | { result: 'unknown-meter' }

/** מונה + ת.ז. של בעל הנכס או של המשלם הנוכחי */
export function verifyMeter(meterNumber: string, idNumber: string): MeterCheck {
  const property = PROPERTIES.find((p) => p.meterNumber === meterNumber.trim())
  if (!property) return { result: 'unknown-meter' }
  if (property.mainMeter) return { result: 'main-meter' }
  const id = idNumber.trim()
  if (id === property.payer.id || id === property.owner?.id) return { result: 'ok', property }
  return { result: 'mismatch' }
}

/** כתובת מלאה – למי שכבר זוהה */
export function fullAddress(p: Property): string {
  return `${p.street} ${p.house}${p.apt ? `, דירה ${p.apt}` : ''}`
}

/** כתובת חלקית לאישור – הספרה האחרונה של מספר הבית מוסתרת */
export function maskedAddress(p: Property): string {
  const house = p.house.length > 1 ? `${p.house.slice(0, -1)}*` : '*'
  return `${p.street} ${house}${p.apt ? `, דירה ${p.apt}` : ''}`
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000)
}

/** קריאה מהמונה הדיגיטלי לתאריך מסוים (מדומה) */
export function digitalReading(p: Property, date: string): number | null {
  if (!p.digitalMeter || !date) return null
  return Math.round(p.readingAtPeriodStart + daysBetween(BILLING_PERIOD_START, date) * p.dailyUsage)
}
