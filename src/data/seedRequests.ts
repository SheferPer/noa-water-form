// בקשות שכבר "הוגשו" כשהסימולציה מתחילה – כולל שלושת תרחישי הבדיקה מהתרגיל (עמוד 16).

import { emptyDraft, type Draft } from '../noa/draft'
import { applicantActor } from './roles'
import type { SubmittedRequest } from './store'

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

function draft(recipe: (d: Draft) => void): Draft {
  const d = emptyDraft()
  d.step = 'summary'
  d.declarations = { accurate: true, terms: true, marketing: false }
  recipe(d)
  return d
}

function request(number: number, submittedAt: string, assignee: string, d: Draft, extra: Partial<SubmittedRequest> = {}): SubmittedRequest {
  return {
    number,
    submittedAt,
    draft: d,
    status: 'new',
    assignee,
    pending: ['נציג יבדוק את הבקשה – עד 7 ימי עסקים מרגע שהבקשה שלמה'],
    flags: [],
    resolutions: {},
    history: [{ at: submittedAt, text: 'הבקשה הוגשה', actor: applicantActor(d) }],
    ...extra,
  }
}

function scenarioRequests(): SubmittedRequest[] {
  return [
    // תרחיש בדיקה 1: יש קריאה ותאריך, אבל חסר צילום מונה
    request(
      10491,
      '2026-09-14',
      'michal',
      draft((d) => {
        d.identification = { ...d.identification, method: 'account', accountNumber: '5500122', lookup: 'found', propertyId: 'bialik-12-3', confirmed: true }
        d.route = 'rent-start'
        d.switchDate = '2026-09-10'
        d.reading = { source: 'manual', manualValue: '883', photoDocId: null }
        d.me = { ...noa, firstName: 'דנה', lastName: 'ישראלי', phone: '0509876543', email: 'dana@example.com', idNumber: '300000007', idDocId: 'id-dana' }
        d.party = { name: 'רחל כץ', phone: '0541112233', idNumber: '022222226' }
        d.contractDocId = 'rent-dana'
        d.residents = { wantsDiscount: false, others: '', docIds: [] }
      }),
    ),

    // תרחיש בדיקה 2: נועה היא גם הפונה וגם השוכרת – בקשה תקינה
    request(
      10494,
      '2026-09-14',
      'michal',
      draft((d) => {
        d.identification = { ...d.identification, method: 'meter', meterDocId: 'meter-bialik-4', meterNumber: '21-004871', verifierId: '034567891', lookup: 'found', propertyId: 'bialik-12-4', confirmed: true }
        d.route = 'rent-start'
        d.switchDate = '2026-09-01'
        d.reading = { source: 'digital', manualValue: '', photoDocId: null }
        d.me = { ...noa }
        d.party = { name: 'דוד לוי', phone: '0547654321', idNumber: '034567891' }
        d.contractDocId = 'rent-ok'
        d.residents = { wantsDiscount: true, others: '1', docIds: ['id-resident'] }
      }),
      {
        // המשלם היוצא קיבל הודעה ועוד לא אישר – זה לא מעכב את הבקשה
        secondParty: { status: 'invited', name: 'אורי שמש', phone: '0503334444', invitedAt: '2026-09-14' },
        pending: ['הודענו לאורי שמש (המשלם/ת היוצא/ת) – אורי יכול/ה לאשר את הקריאה או לערער', 'נציג יבדוק את הבקשה – עד 7 ימי עסקים מרגע שהבקשה שלמה'],
      },
    ),

    // תרחיש בדיקה 3: מיופה כוח מגיש בשם נועה, בלי ייפוי כוח חתום
    request(
      10493,
      '2026-09-17',
      'michal',
      draft((d) => {
        d.identification = { ...d.identification, method: 'account', accountNumber: '5500789', lookup: 'found', propertyId: 'herzl-3', confirmed: true }
        d.route = 'buy'
        d.occupancy = 'self'
        d.proxy = { enabled: true, name: 'עו"ד אמיר גל', phone: '0533334444', kind: 'lawyer', idNumber: '040404040', poaDocId: null }
        d.switchDate = '2026-09-10'
        d.reading = { source: 'digital', manualValue: '', photoDocId: null }
        d.me = { ...noa }
        d.party = { name: 'שרה אלון', phone: '0525556666', idNumber: '055555556' }
        d.contractDocId = 'sale-herzl'
        d.residents = { wantsDiscount: false, others: '', docIds: [] }
      }),
      { flags: ['חסר ייפוי כוח'], pending: ['חסר ייפוי כוח – נשלח בקשה להשלים', 'נציג יבדוק את הבקשה – עד 7 ימי עסקים מרגע שהבקשה שלמה'] },
    ),

    // תאריך יציאה רטרואקטיבי – הנציג מחליט אם להחיל
    request(
      10488,
      '2026-09-13',
      'michal',
      draft((d) => {
        d.identification = { ...d.identification, method: 'meter', meterDocId: 'meter-jabotinsky', meterNumber: '33-118822', verifierId: '123456782', lookup: 'found', propertyId: 'jabotinsky-40-7', confirmed: true }
        d.route = 'rent-end'
        d.switchDate = '2026-08-20'
        d.reading = { source: 'manual', manualValue: '2290', photoDocId: 'meter-jabotinsky' }
        d.me = { ...noa, prefilled: true }
        d.party = { name: 'משה ברק', phone: '0501231234', idNumber: '' }
        d.nextTenant = { known: false, name: '', phone: '' }
        d.mailing = { street: 'הרצל 50', city: 'גבעתיים' }
      }),
      { flags: ['החלפה רטרואקטיבית'] },
    ),

    // שני אנשים באותה בקשה: נועה יוצאת, יוסי נכנס – מחכים שיוסי יאשר
    request(
      10496,
      '2026-09-21',
      'avi',
      draft((d) => {
        d.identification = { ...d.identification, method: 'meter', meterDocId: 'meter-jabotinsky', meterNumber: '33-118822', verifierId: '123456782', lookup: 'found', propertyId: 'jabotinsky-40-7', confirmed: true }
        d.route = 'rent-end'
        d.switchDate = '2026-09-20'
        d.reading = { source: 'manual', manualValue: '2307', photoDocId: 'meter-jabotinsky' }
        d.me = { ...noa, prefilled: true }
        d.party = { name: 'משה ברק', phone: '0501231234', idNumber: '' }
        d.nextTenant = { known: true, name: 'יוסי לוין', phone: '0501112222' }
        d.mailing = { street: 'הרצל 50', city: 'גבעתיים' }
      }),
      {
        status: 'waiting-party',
        secondParty: { status: 'invited', name: 'יוסי לוין', phone: '0501112222', invitedAt: '2026-09-21' },
        pending: ['מחכים שיוסי לוין יאשר את הקריאה וימלא את החלק שלו', 'נציג יבדוק את הבקשה – עד 7 ימי עסקים מרגע שהבקשה שלמה'],
      },
    ),

    // שני אנשים באותה בקשה: שרה מוכרת לנועה – מחכים שנועה (הקונה) תאשר
    request(
      10497,
      '2026-09-21',
      'avi',
      draft((d) => {
        d.identification = { ...d.identification, method: 'meter', meterNumber: '12-777001', verifierId: '055555556', lookup: 'found', propertyId: 'herzl-3', confirmed: true }
        d.route = 'sell'
        d.occupancy = 'self'
        d.switchDate = '2026-09-10'
        d.reading = { source: 'digital', manualValue: '', photoDocId: null }
        d.me = { ...noa, firstName: 'שרה', lastName: 'אלון', phone: '0525556666', email: 'sara@example.com', idNumber: '055555556', idDocId: 'id-sara', prefilled: true }
        d.party = { name: 'נועה כהן', phone: '0521234567', idNumber: '123456782' }
        d.contractDocId = 'sale-herzl'
        d.mailing = { street: 'ביאליק 30', city: 'רמת גן' }
      }),
      {
        status: 'waiting-party',
        secondParty: { status: 'invited', name: 'נועה כהן', phone: '0521234567', invitedAt: '2026-09-21' },
        pending: ['מחכים שנועה כהן (הקונה) יאשר את הקריאה וימלא את החלק שלו', 'נציג יבדוק את הבקשה – עד 7 ימי עסקים מרגע שהבקשה שלמה'],
      },
    ),
  ]
}

// ---------- עומס עבודה: היסטוריה שהושלמה + בקשות פתוחות אצל רותם ואבי ----------

/** בקשות תקינות מכל מסלול – בסיס לבקשות שנוצרות אוטומטית */
const TEMPLATES: { make: (switchDate: string) => Draft }[] = [
  {
    make: (switchDate) =>
      draft((d) => {
        d.identification = { ...d.identification, method: 'account', accountNumber: '5500123', lookup: 'found', propertyId: 'bialik-12-4', confirmed: true }
        d.route = 'rent-start'
        d.switchDate = switchDate
        d.reading = { source: 'digital', manualValue: '', photoDocId: null }
        d.me = { ...noa }
        d.party = { name: 'דוד לוי', phone: '0547654321', idNumber: '034567891' }
        d.contractDocId = 'rent-ok'
        d.residents = { wantsDiscount: false, others: '', docIds: [] }
      }),
  },
  {
    make: (switchDate) =>
      draft((d) => {
        d.identification = { ...d.identification, method: 'account', accountNumber: '5500122', lookup: 'found', propertyId: 'bialik-12-3', confirmed: true }
        d.route = 'rent-start'
        d.switchDate = switchDate
        d.reading = { source: 'manual', manualValue: '883', photoDocId: 'meter-bialik-3' }
        d.me = { ...noa, firstName: 'דנה', lastName: 'ישראלי', phone: '0509876543', email: 'dana@example.com', idNumber: '300000007', idDocId: 'id-dana' }
        d.party = { name: 'רחל כץ', phone: '0541112233', idNumber: '022222226' }
        d.contractDocId = 'rent-dana'
        d.residents = { wantsDiscount: false, others: '', docIds: [] }
      }),
  },
  {
    make: (switchDate) =>
      draft((d) => {
        d.identification = { ...d.identification, method: 'account', accountNumber: '5500789', lookup: 'found', propertyId: 'herzl-3', confirmed: true }
        d.route = 'buy'
        d.occupancy = 'self'
        d.switchDate = switchDate
        d.reading = { source: 'digital', manualValue: '', photoDocId: null }
        d.me = { ...noa }
        d.party = { name: 'שרה אלון', phone: '0525556666', idNumber: '055555556' }
        d.contractDocId = 'sale-herzl'
        d.residents = { wantsDiscount: false, others: '', docIds: [] }
      }),
  },
  {
    make: (switchDate) =>
      draft((d) => {
        d.identification = { ...d.identification, method: 'meter', meterNumber: '12-777001', verifierId: '055555556', lookup: 'found', propertyId: 'herzl-3', confirmed: true }
        d.route = 'sell'
        d.occupancy = 'self'
        d.switchDate = switchDate
        d.reading = { source: 'digital', manualValue: '', photoDocId: null }
        d.me = { ...noa, firstName: 'שרה', lastName: 'אלון', phone: '0525556666', email: 'sara@example.com', idNumber: '055555556', idDocId: 'id-sara', prefilled: true }
        d.party = { name: 'נועה כהן', phone: '0521234567', idNumber: '123456782' }
        d.contractDocId = 'sale-herzl'
        d.mailing = { street: 'ביאליק 30', city: 'רמת גן' }
      }),
  },
  {
    make: (switchDate) =>
      draft((d) => {
        d.identification = { ...d.identification, method: 'account', accountNumber: '5500456', lookup: 'found', propertyId: 'jabotinsky-40-7', confirmed: true }
        d.route = 'rent-end'
        d.switchDate = switchDate
        d.reading = { source: 'manual', manualValue: '2307', photoDocId: 'meter-jabotinsky' }
        d.me = { ...noa, prefilled: true }
        d.party = { name: 'משה ברק', phone: '0501231234', idNumber: '' }
        d.nextTenant = { known: false, name: '', phone: '' }
        d.mailing = { street: 'הרצל 50', city: 'גבעתיים' }
      }),
  },
]

/** מחולל מספרים קבוע – אותם נתונים בכל איפוס */
function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

const AGENT_NAMES: Record<string, string> = { michal: 'מיכל', avi: 'אבי', rotem: 'רותם' }

function workload(): SubmittedRequest[] {
  const rand = rng(7)
  const out: SubmittedRequest[] = []

  // היסטוריה: 72 בקשות שהושלמו באוגוסט–ספטמבר
  for (let i = 0; i < 72; i++) {
    const agent = ['michal', 'avi', 'rotem'][Math.floor(rand() * 3)]
    const template = TEMPLATES[Math.floor(rand() * TEMPLATES.length)]
    const submittedAt = addDays('2026-08-01', Math.floor(rand() * 45))
    // מיכל מהירה יותר, רותם איטית יותר – כדי שיהיה מה לראות בזמן הממוצע
    const speed = agent === 'michal' ? 1 : agent === 'avi' ? 2 : 3
    const doneAt = addDays(submittedAt, speed + Math.floor(rand() * 4))
    const d = template.make(submittedAt)
    out.push(
      request(10300 + i, submittedAt, agent, d, {
        status: 'done',
        pending: [],
        history: [
          { at: submittedAt, text: 'הבקשה הוגשה', actor: applicantActor(d) },
          { at: addDays(submittedAt, 1), text: 'נפתחה לטיפול', by: AGENT_NAMES[agent] },
          { at: doneAt, text: 'אושרה והושלמה – נבדק על ידי AI, אושר על ידי הנציג', by: AGENT_NAMES[agent] },
        ],
      }),
    )
  }

  // בקשות פתוחות: רותם (לא זמינה) – 9, אבי – 3
  const open: [string, string][] = [
    ['rotem', '2026-09-11'], ['rotem', '2026-09-13'], ['rotem', '2026-09-13'], ['rotem', '2026-09-14'],
    ['rotem', '2026-09-15'], ['rotem', '2026-09-16'], ['rotem', '2026-09-17'], ['rotem', '2026-09-20'], ['rotem', '2026-09-21'],
    ['avi', '2026-09-14'], ['avi', '2026-09-17'], ['avi', '2026-09-21'],
  ]
  open.forEach(([agent, submittedAt], i) => {
    const template = TEMPLATES[i % TEMPLATES.length]
    out.push(request(10470 + i, submittedAt, agent, template.make(submittedAt)))
  })

  return out
}

export function seedRequests(): SubmittedRequest[] {
  return [...scenarioRequests(), ...workload()]
}
