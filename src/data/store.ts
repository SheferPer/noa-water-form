// "שרת" מדומה: הכל נשמר בזיכרון הדפדפן (localStorage).

import type { Draft } from '../noa/draft'
import { AGENTS } from './agents'
import { MOCK_TODAY } from './seed'
import { seedRequests } from './seedRequests'

const DRAFT_KEY = 'noa.draft'
const REQUESTS_KEY = 'noa.requests.v2'
const SMS_KEY = 'noa.sms'
const SEED_VERSION_KEY = 'noa.seedVersion'
const SEEN_KEY = 'noa.seen'

export interface HistoryEntry {
  at: string
  text: string
  /** נציג שביצע את הפעולה */
  by?: string
  /** מי שאינו נציג: "הדייר היוצא (נועה כהן)", "הדייר הנכנס (יוסי לוין)" */
  actor?: string
  /** מוצג גם לפונה במסך מצב הבקשה */
  public?: boolean
}

/** הצד השני בבקשה: השוכר הבא (סיום שכירות) או הקונה (מכירה) – סעיף 9 */
export interface SecondParty {
  status:
    /** נשלח SMS, עוד לא נכנס */
    | 'invited'
    /** ה-SMS לא נמסר */
    | 'failed'
    /** לחץ "זה לא אני" */
    | 'not-me'
    /** תיאמו ביניהם – ממתין לאישור הצד הראשון */
    | 'proposed'
    /** לא הסכימו – הועבר לנציג */
    | 'dispute'
    | 'done'
  name: string
  phone: string
  /** מתי נשלחה ההזמנה – ממנו נספרים 5 ימי העסקים לאישור בשתיקה */
  invitedAt?: string
  /** מתי הצד השני נכנס לראשונה – מכאן הפונה כבר לא עורך את הבקשה */
  viewedAt?: string
  idNumber?: string
  email?: string
  idDocId?: string | null
  /** הגרסה של הצד השני לתאריך ולקריאה, כשהיא שונה */
  proposal?: { switchDate: string; reading: string }
  /** למשלם היוצא: לאן לשלוח את החשבון הסופי */
  mailing?: { street: string; city: string }
}

export type RequestStatus =
  /** הוגשה, נציג עוד לא פתח – הפונה עדיין יכול לערוך */
  | 'new'
  | 'in-review'
  /** הכדור אצל הפונה – השעון לא רץ */
  | 'waiting-applicant'
  /** הכדור אצל הצד השני – השעון לא רץ */
  | 'waiting-party'
  | 'done'

export interface Resolution {
  note: string
  at: string
  by: string
}

export interface SubmittedRequest {
  number: number
  submittedAt: string
  draft: Draft
  status: RequestStatus
  assignee: string
  /** מה עדיין חסר או ממתין – מוצג לפונה */
  pending: string[]
  flags: string[]
  /** חריגות שהנציג סימן "בדקתי, תקין" – לפי מזהה הממצא */
  resolutions: Record<string, Resolution>
  /** בקשת ההשלמה האחרונה שנשלחה לפונה */
  completion?: { items: string[]; message: string; at: string }
  /** הפונה השלים – מוצג בתור כ"הגיעה השלמה" */
  completionArrived?: boolean
  /** הודעה מהפונה שהנציג עוד לא קרא (אחרי שהבקשה נפתחה אי אפשר לערוך – רק לכתוב) */
  applicantMessage?: string
  secondParty?: SecondParty
  /** הנציג ביקש הכרעה של המנהל/ת */
  escalation?: { at: string; by: string; question: string }
  history: HistoryEntry[]
}

export interface Sms {
  at: string
  to: string
  text: string
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // בלי אחסון – האתר עדיין עובד, רק בלי שמירה
  }
}

export const loadDraft = () => read<Draft | null>(DRAFT_KEY, null)
export const saveDraft = (d: Draft) => write(DRAFT_KEY, d)
export const clearDraft = () => {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    // ignore
  }
}

/** מעלים את המספר כשנתוני הדמה משתנים – המאגר בדפדפן יתרענן לבד */
const SEED_VERSION = 6

export function loadRequests(): SubmittedRequest[] {
  const stored = read<SubmittedRequest[] | null>(REQUESTS_KEY, null)
  if (stored && read<number>(SEED_VERSION_KEY, 0) === SEED_VERSION) return stored
  write(SEED_VERSION_KEY, SEED_VERSION)
  const seeded = seedRequests()
  write(REQUESTS_KEY, seeded)
  return seeded
}

export const loadSms = () => read<Sms[]>(SMS_KEY, [])

export function addSms(sms: Sms[]) {
  write(SMS_KEY, [...loadSms(), ...sms])
}

/** חלוקה אוטומטית: לנציג הזמין עם הכי מעט בקשות פתוחות */
function leastLoadedAgent(requests: SubmittedRequest[]): string {
  const open = (id: string) => requests.filter((r) => r.assignee === id && r.status !== 'done').length
  return AGENTS.filter((a) => a.available).sort((a, b) => open(a.id) - open(b.id))[0].id
}

export function submitRequest(
  req: Omit<SubmittedRequest, 'number' | 'assignee' | 'resolutions'>,
  makeSms: (number: number) => Omit<Sms, 'at'>[],
): SubmittedRequest {
  const requests = loadRequests()
  const number = requests.reduce((max, r) => Math.max(max, r.number), 10000) + 1
  const saved: SubmittedRequest = { ...req, number, assignee: leastLoadedAgent(requests), resolutions: {} }
  write(REQUESTS_KEY, [...requests, saved])
  addSms(makeSms(number).map((s) => ({ ...s, at: req.submittedAt })))
  return saved
}

export function updateRequest(number: number, recipe: (r: SubmittedRequest) => void): SubmittedRequest[] {
  const requests = loadRequests().map((r) => {
    if (r.number !== number) return r
    const copy = structuredClone(r)
    recipe(copy)
    return copy
  })
  write(REQUESTS_KEY, requests)
  return requests
}

/** העברת כמה בקשות לנציג אחד (או לפי עומס כשאין יעד) – הפעולה המרכזית של המנהל */
export function reassign(numbers: number[], to: string | 'auto', by: string): SubmittedRequest[] {
  let requests = loadRequests()
  for (const number of numbers) {
    const target = to === 'auto' ? leastLoadedAgent(requests) : to
    requests = requests.map((r) =>
      r.number === number
        ? {
            ...r,
            assignee: target,
            history: [...r.history, { at: MOCK_TODAY, text: `הועברה ל${AGENTS.find((a) => a.id === target)?.name}`, by }],
          }
        : r,
    )
  }
  write(REQUESTS_KEY, requests)
  return requests
}

// ---------- "מה השתנה מאז שפתחתי" ----------
// לכל נציג נשמר אורך היומן שראה בבקשה. מה שנוסף מאז – חדש בשבילו.

type SeenMap = Record<string, number>
const seenKey = (agentId: string, number: number) => `${agentId}:${number}`

const loadSeen = () => read<SeenMap>(SEEN_KEY, {})

export const seenHistoryLength = (agentId: string, number: number): number => loadSeen()[seenKey(agentId, number)] ?? 0

export function markSeen(agentId: string, number: number, length: number) {
  write(SEEN_KEY, { ...loadSeen(), [seenKey(agentId, number)]: length })
}

// ---------- תקלות בתהליך ----------

const FAILURES_KEY = 'noa.failures'

export interface Failure {
  id: string
  kind: 'sms' | 'upload'
  number: number
  text: string
  at: string
  /** למי הועברה לטיפול */
  handledBy?: string
}

const SEED_FAILURES: Failure[] = [
  { id: 'f1', kind: 'sms', number: 10473, text: 'SMS לבעל הנכס לא נמסר (050-123-1234) – המספר לא זמין', at: '2026-09-14' },
  { id: 'f2', kind: 'upload', number: 10480, text: 'העלאת צילום ת.ז. נכשלה – הקובץ פגום', at: '2026-09-21' },
]

export const loadFailures = () => read<Failure[]>(FAILURES_KEY, SEED_FAILURES)

export function addFailure(f: Failure) {
  write(FAILURES_KEY, [...loadFailures(), f])
}

export function handleFailure(id: string, to: string, by: string): Failure[] {
  const failures = loadFailures().map((f) => (f.id === id ? { ...f, handledBy: to } : f))
  write(FAILURES_KEY, failures)
  const f = failures.find((x) => x.id === id)!
  updateRequest(f.number, (r) => r.history.push({ at: MOCK_TODAY, text: `תקלה הועברה לטיפול ${to}: ${f.text}`, by }))
  return failures
}

export function resetAll() {
  for (const key of [DRAFT_KEY, REQUESTS_KEY, SMS_KEY, FAILURES_KEY, SEED_VERSION_KEY, SEEN_KEY, 'noa.requests']) {
    try {
      localStorage.removeItem(key)
    } catch {
      // ignore
    }
  }
}
