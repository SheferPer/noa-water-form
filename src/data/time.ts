import { MOCK_TODAY } from './seed'

/** שישי ושבת אינם ימי עסקים */
const isBusinessDay = (date: Date) => date.getUTCDay() !== 5 && date.getUTCDay() !== 6

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** 7 ימי עסקים מההגשה (סעיף 21א(ד) בכללים) */
export function deadline(submittedAt: string, businessDays = 7): string {
  let date = submittedAt
  let left = businessDays
  while (left > 0) {
    date = addDays(date, 1)
    if (isBusinessDay(new Date(`${date}T00:00:00Z`))) left--
  }
  return date
}

/** כמה ימי עסקים עברו מאז תאריך */
export function businessDaysSince(from: string, today = MOCK_TODAY): number {
  let date = from
  let count = 0
  while (date < today) {
    date = addDays(date, 1)
    if (isBusinessDay(new Date(`${date}T00:00:00Z`))) count++
  }
  return count
}

/** כמה ימי עסקים נותרו עד המועד; שלילי = חריגה */
export function businessDaysLeft(submittedAt: string, today = MOCK_TODAY): number {
  const end = deadline(submittedAt)
  if (end === today) return 0
  const forward = end > today
  let date = today
  let count = 0
  while (date !== end) {
    date = addDays(date, forward ? 1 : -1)
    if (isBusinessDay(new Date(`${date}T00:00:00Z`))) count++
  }
  return forward ? count : -count
}
