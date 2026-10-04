import { digitalReading, fullAddress, getProperty } from '../data/properties'
import { formatDate } from '../data/verify'
import { REQUEST_TYPES } from '../requestTypes'
import type { Draft, StepId } from './draft'

export interface StepDef {
  id: StepId
  title: (d: Draft) => string
  /** מה נדרש בשלב – מוצג מתחת לכותרת ובשלבים הבאים ברשימה */
  need: (d: Draft) => string
  visible: (d: Draft) => boolean
  /** מה עוד חסר כדי להמשיך; ריק = השלב הושלם */
  missing: (d: Draft) => string[]
  summary: (d: Draft) => string
  /** כמה דקות לוקח השלב בממוצע – ממנו מחושב "נותרו כ-X דקות" */
  mins: number
}

export const isStart = (d: Draft) => d.route === 'rent-start' || d.route === 'buy'
export const isStop = (d: Draft) => d.route === 'rent-end' || d.route === 'sell'
/** קנייה/מכירה של דירה שגר בה שוכר – רק עדכון בעל הנכס */
export const ownerUpdateOnly = (d: Draft) =>
  (d.route === 'buy' || d.route === 'sell') && d.occupancy === 'tenant'

export const validId = (s: string) => /^\d{9}$/.test(s.trim())
export const validPhone = (s: string) => /^05\d{8}$/.test(s.replace(/[\s-]/g, ''))
export const validEmail = (s: string) => /^\S+@\S+\.\S+$/.test(s.trim())

export { formatDate }

/** "את/ה" מול מבקש שירות – כשממלאים בשם מישהו אחר */
export const who = (d: Draft, self: string, other: string) => (d.proxy.enabled ? other : self)

export function partyRole(d: Draft): string {
  switch (d.route) {
    case 'buy':
      return 'המוכר/ת'
    case 'sell':
      return 'הקונה'
    default:
      return 'בעל/ת הנכס'
  }
}

export function dateQuestion(d: Draft): string {
  switch (d.route) {
    case 'rent-start':
      return who(d, 'מתי נכנסתם לדירה?', 'מתי מבקש/ת השירות נכנס/ה לדירה?')
    case 'buy':
      return who(d, 'מתי קיבלתם את המפתח?', 'מתי מבקש/ת השירות קיבל/ה את המפתח?')
    case 'rent-end':
      return who(d, 'מתי יצאתם מהדירה?', 'מתי מבקש/ת השירות יצא/ה מהדירה?')
    case 'sell':
      return who(d, 'מתי מסרתם את הדירה לקונה?', 'מתי נמסרה הדירה לקונה?')
    default:
      return 'תאריך ההחלפה'
  }
}

export function docKind(d: Draft) {
  if (d.route === 'rent-start') return 'rent-contract' as const
  if (d.route === 'rent-end') return 'lease-end' as const
  return 'sale-contract' as const
}

/** מסמך חובה רק כשמשתנה הבעלות – שם צריך אישור חד-משמעי. בשכירות הוא מומלץ בלבד */
export const docRequired = (d: Draft) => d.route === 'buy' || d.route === 'sell'

export const STEPS: StepDef[] = [
  {
    id: 'property',
    mins: 1,
    title: () => 'זיהוי הנכס',
    need: () => 'מספר חשבון חוזה, או מונה + ת.ז.',
    visible: () => true,
    missing: (d) => {
      const i = d.identification
      if (i.lookup !== 'found') {
        if (i.method !== 'meter') return ['מספר חשבון חוזה שנמצא במערכת']
        const m: string[] = []
        if (!i.meterNumber) m.push('מספר מונה (מצילום או הקלדה)')
        if (!validId(i.verifierId)) m.push('ת.ז. של בעל הנכס או של המשלם הנוכחי')
        if (m.length === 0) m.push('ללחוץ "חיפוש הנכס"')
        return m
      }
      if (i.confirmed !== true) return ['לאשר שזה הנכס']
      return []
    },
    summary: (d) => {
      const p = getProperty(d.identification.propertyId)
      return p ? fullAddress(p) : ''
    },
  },
  {
    id: 'route',
    mins: 0.3,
    title: () => 'מה קרה?',
    need: () => 'מתחילים לשלם או מסיימים לשלם',
    visible: () => true,
    missing: (d) => {
      if (!d.route) return ['לבחור מה קרה']
      if ((d.route === 'buy' || d.route === 'sell') && !d.occupancy)
        return [d.route === 'buy' ? 'לבחור מי יגור בדירה' : 'לבחור אם גר בדירה שוכר']
      return []
    },
    summary: (d) => {
      const t = REQUEST_TYPES.find((r) => r.id === d.route)
      if (!t) return ''
      const parts = [t.label]
      if (ownerUpdateOnly(d)) parts.push('יש שוכר')
      if (d.proxy.enabled) parts.push('בשם מישהו אחר')
      return parts.join(' · ')
    },
  },
  {
    id: 'proxy',
    mins: 0.7,
    title: () => 'פרטי המגיש',
    need: () => 'הפרטים שלך כמגיש, וייפוי כוח (אפשר להשלים אחר כך)',
    visible: (d) => d.proxy.enabled,
    missing: (d) => {
      const m: string[] = []
      if (!d.proxy.name.trim()) m.push('שם המגיש')
      if (!validPhone(d.proxy.phone)) m.push('נייד תקין')
      if (!d.proxy.kind) m.push('סוג הייצוג')
      if (!validId(d.proxy.idNumber)) m.push('ת.ז. של המגיש (9 ספרות)')
      return m
    },
    summary: (d) => `${d.proxy.name}${d.proxy.poaDocId ? '' : ' · ייפוי כוח יושלם אחר כך'}`,
  },
  {
    id: 'date',
    mins: 0.7,
    title: () => 'תאריך וקריאת מונה',
    need: () => 'תאריך ההחלפה וקריאת המונה באותו יום',
    visible: (d) => !ownerUpdateOnly(d),
    missing: (d) => {
      const m: string[] = []
      if (!d.switchDate) m.push('תאריך')
      if (d.reading.source === null) m.push('קריאת מונה')
      if (d.reading.source === 'manual') {
        if (!/^\d+$/.test(d.reading.manualValue)) m.push('קריאת מונה במספרים')
        if (!d.reading.photoDocId) m.push('צילום מונה')
      }
      return m
    },
    summary: (d) => {
      const date = formatDate(d.switchDate)
      if (d.reading.source === 'digital') {
        const value = digitalReading(getProperty(d.identification.propertyId)!, d.switchDate)
        return `${date} · ${value?.toLocaleString('he-IL')} מ״ק (דיגיטלי)`
      }
      return `${date} · ${d.reading.manualValue} מ״ק`
    },
  },
  {
    id: 'me',
    mins: 1,
    title: (d) => who(d, 'הפרטים שלך', 'פרטי מבקש/ת השירות'),
    need: () => 'שם, נייד, דוא״ל ות.ז. + ספח',
    visible: () => true,
    missing: (d) => {
      const m: string[] = []
      if (!d.me.firstName.trim() || !d.me.lastName.trim()) m.push('שם פרטי ושם משפחה')
      if (!validPhone(d.me.phone)) m.push('נייד תקין (05X-XXXXXXX)')
      if (!validEmail(d.me.email)) m.push('דוא״ל תקין')
      if (!validId(d.me.idNumber)) m.push('ת.ז. (9 ספרות)')
      return m
    },
    summary: (d) => `${d.me.firstName} ${d.me.lastName}`,
  },
  {
    id: 'party',
    mins: 0.5,
    title: (d) => partyRole(d),
    need: (d) => (d.route === 'rent-end' ? 'שם ונייד' : 'שם, נייד ות.ז.'),
    visible: (d) => d.route !== null,
    missing: (d) => {
      const m: string[] = []
      if (!d.party.name.trim()) m.push('שם')
      if (!validPhone(d.party.phone)) m.push('נייד תקין')
      if (d.route !== 'rent-end' && !validId(d.party.idNumber)) m.push('ת.ז. (9 ספרות)')
      return m
    },
    summary: (d) => d.party.name,
  },
  {
    id: 'next',
    mins: 0.4,
    title: () => 'מי נכנס אחרייך?',
    need: () => 'אם ידוע – שם ונייד של השוכר הבא',
    visible: (d) => d.route === 'rent-end',
    missing: (d) => {
      if (d.nextTenant.known === null) return ['לבחור אם ידוע מי נכנס']
      if (d.nextTenant.known) {
        const m: string[] = []
        if (!d.nextTenant.name.trim()) m.push('שם השוכר הבא')
        if (!validPhone(d.nextTenant.phone)) m.push('נייד תקין של השוכר הבא')
        return m
      }
      return []
    },
    summary: (d) => (d.nextTenant.known ? d.nextTenant.name : 'לא ידוע – יישלח לבעל הנכס'),
  },
  {
    id: 'docs',
    mins: 0.7,
    title: (d) => (d.route === 'rent-start' ? 'חוזה השכירות' : d.route === 'rent-end' ? 'מסמך סיום שכירות' : 'הסכם המכר'),
    need: (d) => (docRequired(d) ? 'חובה – העלאת המסמך המלא' : 'מומלץ – מזרז את הטיפול'),
    visible: (d) => d.route !== null,
    missing: (d) => (docRequired(d) && !d.contractDocId ? ['העלאת המסמך'] : []),
    summary: (d) => (d.contractDocId ? 'הועלה' : 'לא צורף'),
  },
  {
    id: 'residents',
    mins: 0.5,
    title: () => 'מי יגור בדירה?',
    need: () => 'רשות – הנחה לפי מספר נפשות',
    visible: (d) => isStart(d) && !ownerUpdateOnly(d),
    missing: (d) => {
      const r = d.residents
      if (r.wantsDiscount === null) return ['לבחור אם רוצים הנחה לפי מספר נפשות']
      if (!r.wantsDiscount) return []
      if (!/^\d+$/.test(r.others)) return ['מספר הבגירים הנוספים']
      const n = Number(r.others)
      const uploaded = r.docIds.slice(0, n).filter(Boolean).length
      return uploaded < n ? [`ת.ז. + ספח לכל בגיר (${uploaded} מתוך ${n})`] : []
    },
    summary: (d) =>
      d.residents.wantsDiscount ? `${Number(d.residents.others) + 1} בגירים + ילדים בספח` : 'בלי הנחה',
  },
  {
    id: 'mailing',
    mins: 0.4,
    title: () => 'לאן לשלוח את החשבון הסופי?',
    need: () => 'הכתובת החדשה',
    visible: (d) => isStop(d),
    missing: (d) => {
      const m: string[] = []
      if (!d.mailing.street.trim()) m.push('רחוב ומספר')
      if (!d.mailing.city.trim()) m.push('יישוב')
      return m
    },
    summary: (d) => `${d.mailing.street}, ${d.mailing.city}`,
  },
  {
    id: 'summary',
    mins: 0.5,
    title: () => 'סיכום ושליחה',
    need: () => 'בדיקה, אישור ושליחה',
    visible: () => true,
    missing: (d) => {
      const m: string[] = []
      if (!d.declarations.accurate) m.push('לאשר שהפרטים נכונים')
      if (!d.declarations.terms) m.push('לאשר את התקנון')
      return m
    },
    summary: () => '',
  },
]

/** מסמך חובה אחד – כזה שבלעדיו אי אפשר להמשיך, והשלב שבו מבקשים אותו */
export interface DocNeed {
  label: string
  done: boolean
  step: StepId
}

/**
 * מסמכי החובה לפי מה שנבחר עד כה.
 * מסמך מומלץ (ת.ז., ייפוי כוח, חוזה שכירות) לא נספר כאן – אפשר לשלוח בלעדיו.
 */
export function requiredDocs(d: Draft): DocNeed[] {
  const out: DocNeed[] = []
  if (d.reading.source === 'manual') out.push({ label: 'צילום המונה', done: Boolean(d.reading.photoDocId), step: 'date' })
  if (docRequired(d)) out.push({ label: 'הסכם המכר', done: Boolean(d.contractDocId), step: 'docs' })
  if (d.residents.wantsDiscount && /^\d+$/.test(d.residents.others)) {
    const n = Number(d.residents.others)
    for (let i = 0; i < n; i++)
      out.push({ label: `ת.ז. + ספח של בגיר ${i + 1}`, done: Boolean(d.residents.docIds[i]), step: 'residents' })
  }
  return out
}

/** הערכת הזמן שנותר: סכום השלבים שעוד לא הושלמו, מעוגל כלפי מעלה */
export function minutesLeft(d: Draft, steps: StepDef[]): number {
  const left = steps.filter((s) => s.missing(d).length > 0).reduce((sum, s) => sum + s.mins, 0)
  return Math.ceil(left)
}

/** לפני שבוחרים מה קרה – רק שני השלבים הראשונים; שאר הרשימה תלויה בבחירה */
export const visibleSteps = (d: Draft) =>
  d.route ? STEPS.filter((s) => s.visible(d)) : STEPS.filter((s) => s.id === 'property' || s.id === 'route')
export const stepDef = (id: StepId) => STEPS.find((s) => s.id === id)!
