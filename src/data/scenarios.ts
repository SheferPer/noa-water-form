// "קפיצה לתרחיש": מאפס את הסימולציה ומעמיד אותה במצב מוכן,
// כדי שהדגמה לא תתחיל בכל פעם ממילוי הטופס מאפס.

import { emptyDraft, type Draft } from '../noa/draft'
import { MOCK_TODAY } from './seed'
import { addFailure, resetAll, saveDraft, updateRequest } from './store'

export interface ScenarioTarget {
  role: 'applicant' | 'agent' | 'admin'
  /** מסך הנציג או המנהל/ת: איזו בקשה לפתוח */
  open?: number
  agentId?: string
  applicant?: { screen: 'new' | 'status'; number?: number }
  adminTab?: 'control' | 'all' | 'performance' | 'log' | 'permissions'
}

export interface Scenario {
  id: string
  label: string
  hint: string
  run: () => ScenarioTarget
}

const noa = {
  firstName: 'נועה',
  lastName: 'כהן',
  phone: '0521234567',
  email: 'noa@example.com',
  idNumber: '123456782',
  idDocId: 'id-noa',
  idConfirmed: false,
  prefilled: false,
}

function startDraft(recipe: (d: Draft) => void) {
  const d = emptyDraft()
  recipe(d)
  saveDraft(d)
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'ready-to-send',
    label: 'טופס מלא עד הסיכום',
    hint: 'נועה מסיימת שכירות, הכול מולא – נשאר רק לאשר ולשלוח.',
    run: () => {
      resetAll()
      startDraft((d) => {
        d.step = 'summary'
        d.identification = {
          ...d.identification,
          method: 'account',
          accountNumber: '5500456',
          lookup: 'found',
          propertyId: 'jabotinsky-40-7',
          confirmed: true,
        }
        d.route = 'rent-end'
        d.switchDate = '2026-09-20'
        d.reading = { source: 'manual', manualValue: '2307', photoDocId: 'meter-jabotinsky' }
        d.me = { ...noa }
        d.party = { name: 'משה ברק', phone: '0501231234', idNumber: '' }
        d.nextTenant = { known: true, name: 'יוסי לוין', phone: '0501112222' }
        d.mailing = { street: 'הרצל 50', city: 'גבעתיים' }
      })
      return { role: 'applicant', applicant: { screen: 'new' } }
    },
  },
  {
    id: 'missing-docs',
    label: 'קניתי דירה – חסרים מסמכים',
    hint: 'הסכם מכר ושתי תעודות של בגירים. מדד המסמכים בצד מראה מה נשאר.',
    run: () => {
      resetAll()
      startDraft((d) => {
        d.step = 'docs'
        d.identification = {
          ...d.identification,
          method: 'account',
          accountNumber: '5500789',
          lookup: 'found',
          propertyId: 'herzl-3',
          confirmed: true,
        }
        d.route = 'buy'
        d.occupancy = 'self'
        d.switchDate = '2026-09-18'
        d.reading = { source: 'digital', manualValue: '', photoDocId: null }
        d.me = { ...noa }
        d.party = { name: 'שרה אלון', phone: '0525556666', idNumber: '055555556' }
        d.residents = { wantsDiscount: true, others: '2', docIds: [] }
      })
      return { role: 'applicant', applicant: { screen: 'new' } }
    },
  },
  {
    id: 'id-mismatch',
    label: 'אי-התאמה בין הטופס לתעודה',
    hint: 'מסך הנציג: ה-AI קרא בתעודה שם אחר מזה שבטופס.',
    run: () => {
      resetAll()
      // הפונה בבקשה הזו היא דנה, והצילום שצורף הוא של נועה
      updateRequest(10491, (r) => {
        r.draft.me.idDocId = 'id-noa'
      })
      return { role: 'agent', agentId: 'michal', open: 10491 }
    },
  },
  {
    id: 'dispute',
    label: 'מחלוקת על התאריך והקריאה',
    hint: 'מסך הנציג: השוכר הנכנס מסר גרסה אחרת, וצריך להכריע.',
    run: () => {
      resetAll()
      updateRequest(10496, (r) => {
        r.status = 'new'
        r.secondParty = {
          ...r.secondParty!,
          status: 'dispute',
          idNumber: '300000007',
          proposal: { switchDate: '2026-09-17', reading: '2288' },
        }
        if (!r.flags.includes('מחלוקת')) r.flags.push('מחלוקת')
        r.pending = ['נציג/ה יבדוק/תבדוק את שתי הגרסאות']
        r.history.push({
          at: MOCK_TODAY,
          text: 'ביקש/ה שנציג/ה יבדוק – יש מחלוקת על הפרטים',
          actor: 'השוכר/ת הנכנס/ת (יוסי לוין)',
          public: true,
        })
      })
      return { role: 'agent', agentId: 'avi', open: 10496 }
    },
  },
  {
    id: 'sms-failed',
    label: 'ה-SMS לצד השני לא נמסר',
    hint: 'מסך הפונה: המערכת זיהתה שההודעה לא הגיעה, ומבקשת לבדוק את המספר.',
    run: () => {
      resetAll()
      updateRequest(10496, (r) => {
        r.secondParty!.status = 'failed'
        r.pending = ['לא הצלחנו לשלוח הודעה ליוסי לוין. בדקו את מספר הנייד']
        r.history.push({ at: MOCK_TODAY, text: 'SMS ליוסי לוין לא נמסר' })
      })
      addFailure({ id: 'sms-10496', kind: 'sms', number: 10496, text: 'SMS ליוסי לוין לא נמסר (050-111-2222)', at: MOCK_TODAY })
      return { role: 'applicant', applicant: { screen: 'status', number: 10496 } }
    },
  },
  {
    id: 'escalated',
    label: 'ממתינה להכרעת מנהל/ת',
    hint: 'הנציג ביקש הכרעה: לאשר בקשה של מיופה כוח בלי ייפוי כוח חתום?',
    run: () => {
      resetAll()
      updateRequest(10493, (r) => {
        r.status = 'in-review'
        r.escalation = {
          at: MOCK_TODAY,
          by: 'מיכל',
          question: 'עו״ד אמיר גל מגיש בשם נועה כהן, ואין ייפוי כוח חתום. הסכם המכר תקין ושני הצדדים מאשרים. לאשר?',
        }
        r.history.push({ at: MOCK_TODAY, text: 'הועברה להכרעת המנהל/ת: לאשר בלי ייפוי כוח?', by: 'מיכל' })
      })
      return { role: 'admin', open: 10493 }
    },
  },
  {
    id: 'overload',
    label: 'עומס: בקשות בלי אחראי זמין',
    hint: 'לוח הבקרה של המנהל/ת – תשע בקשות פתוחות אצל נציגה שלא זמינה.',
    run: () => {
      resetAll()
      return { role: 'admin', adminTab: 'control' }
    },
  },
]
