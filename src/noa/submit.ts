import { formatPhone } from '../data/format'
import { getDoc } from '../data/ocr'
import { fullAddress, getProperty } from '../data/properties'
import { BILLING_PERIOD_START, MOCK_TODAY } from '../data/seed'
import { addFailure, submitRequest, updateRequest, type SubmittedRequest } from '../data/store'
import { applicantActor } from '../data/roles'
import { firstName, secondPartyOf } from '../data/secondParty'
import type { Draft } from './draft'


/** יוצר את הבקשה: מה ממתין, אילו סימונים יראה הנציג, ואילו SMS נשלחים */
export function submitDraft(d: Draft): SubmittedRequest {
  const pending: string[] = []
  const flags: string[] = []
  const address = fullAddress(getProperty(d.identification.propertyId)!)
  // כשמחכים למי שנכנס אחרינו – הכדור אצלו והשעון לא רץ.
  // בכניסה לנכס המשלם היוצא רק מאשר, והבקשה ממשיכה במקביל.
  const second = secondPartyOf(d)
  const waitingForParty = second?.kind === 'incoming'

  if (d.route === 'rent-end') {
    pending.push(d.nextTenant.known ? `מחכים ש${d.nextTenant.name} יאשר את הקריאה וימלא את החלק שלו` : 'הבקשה נשלחה לבעל הנכס')
  }
  if (d.route === 'sell') pending.push(`מחכים ש${d.party.name} (הקונה) יאשר את הקריאה וימלא את החלק שלו`)
  if (second?.kind === 'outgoing') pending.push(`הודענו ל${second.name} (${second.role}) – ${firstName(second.name)} יכול/ה לאשר את הקריאה או לערער`)
  if (d.proxy.enabled && !d.proxy.poaDocId) {
    pending.push('חסר ייפוי כוח – נשלח בקשה להשלים')
    flags.push('חסר ייפוי כוח')
  }
  pending.push('נציג יבדוק את הבקשה – עד 7 ימי עסקים מרגע שהבקשה שלמה')

  if (d.switchDate && d.switchDate < BILLING_PERIOD_START) flags.push('החלפה רטרואקטיבית')
  const unreadable = [d.me.idDocId, d.contractDocId, d.reading.photoDocId].some((id) => getDoc(id)?.unreadable)
  if (unreadable) flags.push('מסמך לא קריא')

  const saved = submitRequest(
    {
      submittedAt: MOCK_TODAY,
      draft: d,
      status: waitingForParty ? 'waiting-party' : 'new',
      secondParty: second ? { status: 'invited', name: second.name, phone: second.phone, invitedAt: MOCK_TODAY } : undefined,
      pending,
      flags,
      history: [
        { at: MOCK_TODAY, text: d.proxy.enabled ? `הבקשה הוגשה על ידי ${d.proxy.name}` : 'הבקשה הוגשה', actor: applicantActor(d) },
        {
          at: MOCK_TODAY,
          text: `ההצהרה אושרה (חתימה אלקטרונית): ${d.proxy.enabled ? d.proxy.name : `${d.me.firstName} ${d.me.lastName}`}, ת.ז. ${
            d.proxy.enabled ? d.proxy.idNumber : d.me.idNumber
          }`,
          actor: applicantActor(d),
        },
        ...(d.notes.trim() ? [{ at: MOCK_TODAY, text: `הערה מהפונה: ${d.notes.trim()}`, actor: applicantActor(d) }] : []),
      ],
    },
    (number) => {
      const link = `https://mayim.example/r/${number}`
      const sms = [{ to: d.me.phone, text: `בקשה ${number} להחלפת משלמים (${address}) התקבלה. מעקב והשלמת מסמכים: ${link}` }]
      if (d.proxy.enabled) {
        sms.push({ to: d.proxy.phone, text: `הבקשה שהגשת בשם ${d.me.firstName} ${d.me.lastName} התקבלה (פנייה ${number}). ${link}` })
      }
      if (d.route === 'rent-end' && d.nextTenant.known) {
        sms.push({ to: d.nextTenant.phone, text: `${d.me.firstName} דיווח/ה שעזב/ה דירה ב${address.split(',')[0]}. נכנסת לגור שם? לאישור והשלמת הפרטים: ${link}/next · זה לא אני` })
      }
      if (second?.kind === 'outgoing') {
        sms.push({
          to: second.phone,
          text: `${d.me.firstName} דיווח/ה שנכנס/ה לנכס ב${address.split(',')[0]} מ-${d.switchDate}. חשבון המים ייצא משמך. לאישור: ${link}/out`,
        })
      }
      if (d.route === 'sell') {
        sms.push({ to: d.party.phone, text: `${d.me.firstName} דיווח/ה על מכירת דירה ב${address.split(',')[0]}. לאישור הקריאה והשלמת הפרטים: ${link}/buyer · זה לא אני` })
      }
      return sms
    },
  )

  // סימולציה: מספר שמסתיים ב-0000 "לא קיים" – ה-SMS לא נמסר.
  // מודיעים מיד לפונה ומוסיפים תקלה אצל המנהל, במקום לחכות 5 ימים לתשובה שלא תגיע (סעיף 9)
  const other = second
  if (other && other.phone.replace(/\D/g, '').endsWith('0000')) {
    addFailure({ id: `sms-${saved.number}`, kind: 'sms', number: saved.number, text: `SMS ל${other.name} לא נמסר (${formatPhone(other.phone)})`, at: MOCK_TODAY })
    const updated = updateRequest(saved.number, (r) => {
      r.secondParty!.status = 'failed'
      r.pending.unshift(`לא הצלחנו לשלוח הודעה ל${other.name}. בדקו את מספר הנייד`)
      r.history.push({ at: MOCK_TODAY, text: `SMS ל${other.name} לא נמסר` })
    })
    return updated.find((r) => r.number === saved.number)!
  }
  return saved
}
