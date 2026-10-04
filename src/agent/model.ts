import { fullAddress, getProperty } from '../data/properties'
import { businessDaysLeft } from '../data/time'
import type { RequestStatus, SubmittedRequest } from '../data/store'
import { requestFindings, type Finding } from '../data/verify'
import { secondPartyFindings, secondPartyOf } from '../data/secondParty'
import { identificationPhoto } from '../noa/draft'
import { REQUEST_TYPES } from '../requestTypes'

export const routeLabel = (r: SubmittedRequest) => REQUEST_TYPES.find((t) => t.id === r.draft.route)?.label ?? ''

export const addressOf = (r: SubmittedRequest) => {
  const p = getProperty(r.draft.identification.propertyId)
  return p ? fullAddress(p) : ''
}

export const isOpen = (r: SubmittedRequest) => r.status !== 'done'
/** השעון רץ – הבקשה אצל הנציג */
export const clockRunning = (r: SubmittedRequest) =>
  r.status === 'new' || r.status === 'in-review' || Boolean(r.completionArrived) || Boolean(r.applicantMessage)
export const atRisk = (r: SubmittedRequest) => clockRunning(r) && businessDaysLeft(r.submittedAt) <= 1

export const findingsOf = (r: SubmittedRequest) => [...requestFindings(r.draft), ...secondPartyFindings(r)]

/** חריגות שעוד לא נסגרו – לא תואם/חסר, ולא סומן "בדקתי, תקין" */
export const openFindings = (r: SubmittedRequest): Finding[] =>
  findingsOf(r).filter((f) => f.state !== 'ok' && !r.resolutions[f.key])

export function daysText(n: number) {
  if (n < 0) return `חריגה ב-${-n} ימים`
  if (n === 0) return 'היום'
  if (n === 1) return 'יום אחד'
  return `${n} ימים`
}

export const STATUS_LABEL: Record<RequestStatus, string> = {
  new: 'חדשה',
  'in-review': 'בבדיקה',
  'waiting-applicant': 'ממתינה לפונה',
  'waiting-party': 'ממתינה לצד השני',
  done: 'הושלמה',
}

export type Tone = 'danger' | 'warn' | 'accent' | 'neutral'

/** הסימון הדחוף ביותר – סימון אחד לכל שורה בתור */
export function topFlag(r: SubmittedRequest): { label: string; tone: Tone } {
  if (r.escalation) return { label: 'ממתינה להכרעת מנהל/ת', tone: 'accent' }
  if (r.completionArrived) return { label: 'הגיעה השלמה', tone: 'danger' }
  if (r.applicantMessage) return { label: 'הודעה מהפונה', tone: 'danger' }
  if (r.flags.includes('מחלוקת')) return { label: 'מחלוקת', tone: 'warn' }
  if (r.status === 'waiting-applicant') return { label: 'נשלחה בקשת השלמה', tone: 'neutral' }
  if (r.status === 'waiting-party')
    return { label: r.secondParty?.status === 'proposed' ? 'מחכים לאישור הצד הראשון' : 'מחכים לצד השני', tone: 'neutral' }
  if (r.status === 'done') return { label: 'הושלמה', tone: 'neutral' }
  const open = openFindings(r)
  const byKey = (k: string) => open.find((f) => f.key === k)
  if (byKey('poa')) return { label: 'חסר ייפוי כוח', tone: 'warn' }
  if (byKey('retro')) return { label: 'החלפה רטרואקטיבית', tone: 'warn' }
  if (open.length === 1) return { label: `${open[0].state === 'missing' ? 'חסר' : 'לא תואם'}: ${open[0].label}`, tone: 'warn' }
  if (open.length > 1) return { label: `${open.length} חריגות`, tone: 'warn' }
  if (r.status === 'new') return { label: 'בקשה חדשה', tone: 'accent' }
  return { label: 'הכל תואם – ממתינה לאישור', tone: 'accent' }
}

/** מסמכי הבקשה, לצפייה בצד מסך הטיפול */
export function documentsOf(r: SubmittedRequest): { docId: string; label: string }[] {
  const d = r.draft
  const docs: { docId: string | null; label: string }[] = [
    { docId: d.identification.billDocId, label: 'חשבון מים' },
    { docId: d.me.idDocId, label: 'ת.ז. הפונה' },
    { docId: d.reading.photoDocId ?? identificationPhoto(d), label: 'צילום מונה' },
    { docId: d.contractDocId, label: d.route === 'rent-start' ? 'חוזה שכירות' : d.route === 'rent-end' ? 'סיום שכירות' : 'הסכם מכר' },
    { docId: d.proxy.poaDocId, label: 'ייפוי כוח' },
    ...d.residents.docIds.map((id, i) => ({ docId: id, label: `ת.ז. בגיר ${i + 1}` })),
    { docId: r.secondParty?.idDocId ?? null, label: `ת.ז. ${secondPartyOf(d)?.role ?? 'הצד השני'}` },
  ]
  return docs.filter((x): x is { docId: string; label: string } => Boolean(x.docId))
}
