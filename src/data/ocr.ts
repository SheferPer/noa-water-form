import { SAMPLE_DOCS, type SampleDoc } from './seed'

export type ScanResult = { status: 'ok'; fields: Record<string, string> } | { status: 'unreadable' }

export function getDoc(docId: string | null): SampleDoc | undefined {
  return docId ? SAMPLE_DOCS.find((d) => d.id === docId) : undefined
}

/**
 * OCR מדומה: מחזיר את השדות שהוגדרו מראש למסמך לדוגמה, אחרי השהיה קצרה.
 * כדי לעבור ל-OCR אמיתי מחליפים רק את הפונקציה הזו.
 */
export function scanDocument(docId: string): Promise<ScanResult> {
  const doc = getDoc(docId)
  return new Promise((resolve) =>
    setTimeout(() => {
      if (!doc || doc.unreadable) resolve({ status: 'unreadable' })
      else resolve({ status: 'ok', fields: doc.fields })
    }, 900),
  )
}

/** תוצאת OCR סינכרונית למסמך שכבר נסרק */
export function scannedFields(docId: string | null): Record<string, string> | null {
  const doc = getDoc(docId)
  if (!doc || doc.unreadable) return null
  return doc.fields
}
