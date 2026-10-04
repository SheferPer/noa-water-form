import { useState } from 'react'
import { Field, Notice, Phone, TextInput } from '../components/ui'
import { loadRequests, type SubmittedRequest } from '../data/store'

const MOCK_CODE = '1234'
const digits = (s: string) => s.replace(/\D/g, '')

export type Role = 'applicant' | 'party'

/** מי נכנס: הפונה (או מיופה הכוח), או הצד השני שהוזמן ב-SMS */
function roleOf(r: SubmittedRequest, phone: string): Role | null {
  if ([r.draft.me.phone, r.draft.proxy.phone].map(digits).includes(digits(phone))) return 'applicant'
  const second = r.secondParty
  if (second && ['invited', 'proposed', 'dispute', 'done'].includes(second.status) && digits(second.phone) === digits(phone)) return 'party'
  return null
}

/** כניסה לבקשה קיימת: מספר פנייה + נייד, ואז קוד חד-פעמי לנייד (סעיף 10) */
export function TrackLogin({ onEnter, prefill }: { onEnter: (number: number, role: Role) => void; prefill?: number }) {
  const [number, setNumber] = useState(prefill ? String(prefill) : '')
  const [phone, setPhone] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const requests = loadRequests()
  const req = requests.find((r) => String(r.number) === number.trim())
  const role = req ? roleOf(req, phone) : null

  function sendCode() {
    // אותה הודעה בשני המקרים – לא מגלים אם מספר הפנייה קיים
    if (!role) {
      setError('מספר הפנייה או הנייד לא תואמים. בדקו את ה-SMS שקיבלתם עם מספר הפנייה.')
      return
    }
    setError('')
    setCodeSent(true)
  }

  function verify() {
    if (code.trim() !== MOCK_CODE) {
      setError('הקוד לא נכון. נסו שוב.')
      return
    }
    onEnter(Number(number), role!)
  }

  return (
    <section className="panel login">
      <h1>מעקב אחרי בקשה</h1>
      <p className="lead">מספר הפנייה נמצא ב-SMS שקיבלתם כשהגשתם.</p>

      {!codeSent ? (
        <div className="panel__body">
          <Field label="מספר פנייה">
            <TextInput value={number} onChange={setNumber} format="digits" inputMode="numeric" dir="ltr" placeholder="10491" />
          </Field>
          <Field label="הנייד שהזנתם בבקשה">
            <TextInput type="tel" format="phone" value={phone} onChange={setPhone} dir="ltr" placeholder="050-123-4567" />
          </Field>
          {error && <Notice tone="error">{error}</Notice>}
          <button type="button" className="primary" onClick={sendCode}>
            שליחת קוד לנייד
          </button>
        </div>
      ) : (
        <div className="panel__body">
          <Notice tone="info">
            שלחנו קוד בן 4 ספרות לנייד <Phone value={phone} />.
          </Notice>
          <Field label="הקוד מה-SMS">
            <TextInput value={code} onChange={setCode} format="digits" inputMode="numeric" dir="ltr" maxLength={4} />
          </Field>
          {error && <Notice tone="error">{error}</Notice>}
          <button type="button" className="primary" onClick={verify}>
            כניסה לבקשה
          </button>
        </div>
      )}

      <details className="sim">
        <summary>סימולציה: בקשות קיימות והקוד</summary>
        <p>הקוד תמיד {MOCK_CODE}. לחיצה על בקשה ממלאת את הפרטים:</p>
        <ul>
          {requests
            .filter((r) => r.number >= 10488)
            .flatMap((r) => {
              const people = [{ key: `${r.number}-a`, name: `${r.draft.me.firstName} ${r.draft.me.lastName}`, phone: r.draft.me.phone, note: '' }]
              if (r.secondParty && ['invited', 'proposed', 'dispute', 'done'].includes(r.secondParty.status))
                people.push({ key: `${r.number}-b`, name: r.secondParty.name, phone: r.secondParty.phone, note: ' – הצד השני' })
              return people.map((p) => (
                <li key={p.key}>
                  <button
                    type="button"
                    className="link"
                    onClick={() => {
                      setNumber(String(r.number))
                      setPhone(p.phone)
                      setCodeSent(false)
                      setError('')
                    }}
                  >
                    {r.number}
                  </button>{' '}
                  · {p.name}
                  {p.note} · <Phone value={p.phone} />
                </li>
              ))
            })}
        </ul>
      </details>
    </section>
  )
}
