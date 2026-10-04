// ניקוי קלט ותצוגה אחידה: הפונה מקליד איך שנוח לו, המערכת מסדרת.
// הערך נשמר תמיד כספרות בלבד – ההשוואות במערכת לא תלויות בעיצוב.

export const digitsOnly = (s: string, max = 20) => s.replace(/\D/g, '').slice(0, max)

/** 0501234567 ← 050-123-4567: מקף אחרי הקידומת ואחרי שלוש ספרות, כדי שיהיה קל לקרוא ולהכתיב */
export function formatPhone(raw: string): string {
  const d = digitsOnly(raw, 10)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`
}

/** ת.ז.: ספרות בלבד, עד תשע */
export const formatId = (raw: string) => digitsOnly(raw, 9)

/** רווחים כפולים ורווח בסוף – תקלדות שאין סיבה להטריד בהן את המשתמש */
export const cleanName = (s: string) => s.trim().replace(/\s+/g, ' ')

/** דוא״ל: בלי רווחים, באותיות קטנות */
export const cleanEmail = (s: string) => s.trim().replace(/\s+/g, '').toLowerCase()
