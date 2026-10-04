// הצד השני בבקשה (סעיף 9):
// כניסה (שכירות/קנייה) – המשלם היוצא, שפרטיו שמורים אצל התאגיד.
// יציאה (סיום שכירות/מכירה) – מי שנכנס אחריו, שפרטיו מגיעים מהפונה.

import type { Draft } from '../noa/draft'
import { formatPhone } from './format'
import { scannedFields } from './ocr'
import { digitalReading, getProperty } from './properties'
import type { SubmittedRequest } from './store'
import { businessDaysSince } from './time'
import { formatDate, type Finding } from './verify'

export interface SecondPartyRef {
  name: string
  phone: string
  /** תעודת זהות – ידועה מראש רק כשהצד השני רשום אצל התאגיד */
  idNumber?: string
  role: string
  /** outgoing – המשלם שיוצא מהחשבון; incoming – מי שהחשבון עובר אליו */
  kind: 'outgoing' | 'incoming'
}

export function secondPartyOf(d: Draft): SecondPartyRef | null {
  if (d.route === 'rent-end') {
    return d.nextTenant.known ? { name: d.nextTenant.name, phone: d.nextTenant.phone, role: 'השוכר/ת הנכנס/ת', kind: 'incoming' } : null
  }
  if (d.route === 'sell') return { name: d.party.name, phone: d.party.phone, idNumber: d.party.idNumber, role: 'הקונה', kind: 'incoming' }

  // כניסה לנכס: מי שמשלם היום הוא הצד שיוצא מהחשבון – פרטיו מרשומות התאגיד
  const property = getProperty(d.identification.propertyId)
  if (!property || ((d.route === 'buy') && d.occupancy === 'tenant')) return null
  if (property.payer.id === d.me.idNumber.trim()) return null // כבר רשום על שמו
  return {
    name: property.payer.name,
    phone: property.payer.phone,
    idNumber: property.payer.id,
    role: d.route === 'buy' ? 'המוכר/ת' : 'המשלם/ת היוצא/ת',
    kind: 'outgoing',
  }
}

export const firstName = (full: string) => full.trim().split(/\s+/)[0] ?? full

/** הקריאה כפי שהצד הראשון דיווח – דיגיטלית או ידנית */
export function readingOf(d: Draft, date = d.switchDate): string {
  const p = getProperty(d.identification.propertyId)
  if (d.reading.source === 'digital' && p) return String(digitalReading(p, date) ?? '')
  return d.reading.manualValue
}

export const isDigital = (d: Draft) => d.reading.source === 'digital'

/** ימי עסקים שאחריהם שתיקת המשלם היוצא נרשמת כאישור */
export const SILENT_APPROVAL_DAYS = 5

/**
 * המשלם היוצא קיבל הודעה ולא הגיב תוך 5 ימי עסקים – נרשם כ"אושר בשתיקה".
 * עדיין אפשר לערער אחר כך; ערעור יפתח מחלוקת כרגיל.
 */
export function silentlyApproved(r: SubmittedRequest): boolean {
  const s = r.secondParty
  if (!s || s.status !== 'invited') return false
  if (secondPartyOf(r.draft)?.kind !== 'outgoing') return false
  return businessDaysSince(s.invitedAt ?? r.submittedAt) >= SILENT_APPROVAL_DAYS
}

/** מה הנציג רואה על הצד השני */
export function secondPartyFindings(r: SubmittedRequest): Finding[] {
  const s = r.secondParty
  const ref = secondPartyOf(r.draft)
  if (!s || !ref) return []

  if (s.status !== 'done' && s.status !== 'dispute') {
    const waiting = { key: 'second-pending', label: `${ref.role}: ${s.name}`, form: formatPhone(s.phone), source: 'system' as const }
    // בכניסה לנכס ההמתנה לא חוסמת – הבקשה של הפונה ממשיכה
    return ref.kind === 'outgoing'
      ? [
          {
            ...waiting,
            state: 'ok',
            found: silentlyApproved(r)
              ? `לא הגיב/ה תוך ${SILENT_APPROVAL_DAYS} ימי עסקים – אושר בשתיקה`
              : s.status === 'invited'
                ? 'נשלחה הודעה, ממתינים לאישור'
                : 'לא אושר – ראו מצב הבקשה',
          },
        ]
      : [{ ...waiting, label: `${ref.role} עוד לא השלים/ה`, state: 'missing' }]
  }

  const out: Finding[] = []
  if (ref.kind === 'incoming') {
    const ocr = scannedFields(s.idDocId ?? null)
    if (!s.idDocId) out.push({ key: 'second-id-doc', label: `ת.ז. של ${ref.role}`, state: 'missing', source: 'ai' })
    else if (!ocr) out.push({ key: 'second-id-doc', label: `ת.ז. של ${ref.role}`, state: 'mismatch', found: 'הצילום לא קריא', docId: s.idDocId, source: 'ai' })
    else
      out.push({
        key: 'second-id-number',
        label: `מספר ת.ז. של ${ref.role}`,
        state: ocr.idNumber === s.idNumber ? 'ok' : 'mismatch',
        form: s.idNumber,
        found: ocr.idNumber,
        docId: s.idDocId,
        field: 'idNumber',
        source: 'ai',
      })
  } else if (s.status === 'done') {
    out.push({ key: 'second-confirmed', label: `${ref.role} אישר/ה את הקריאה`, state: 'ok', found: s.name, source: 'system' })
  }

  if (s.status === 'dispute' && s.proposal) {
    // שתי הגרסאות מוצגות זו לצד זו מעל הבדיקה – כאן רק מה שחוסם את האישור
    out.push({
      key: 'second-dispute',
      label: `מחלוקת בין הצדדים (${formatDate(r.draft.switchDate)} מול ${formatDate(s.proposal.switchDate)}) – צריך להכריע`,
      state: 'mismatch',
      source: 'system',
    })
  }
  return out
}
