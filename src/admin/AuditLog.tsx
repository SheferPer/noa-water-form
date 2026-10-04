import { useState } from 'react'
import { AGENTS } from '../data/agents'
import { loadRequests } from '../data/store'
import { formatDate } from '../data/verify'

const KINDS: { id: string; label: string; match: (text: string) => boolean }[] = [
  { id: 'all', label: 'כל הפעולות', match: () => true },
  { id: 'id-view', label: 'צפייה במסמכי זיהוי', match: (t) => t.startsWith('צפייה במסמך זיהוי') },
  { id: 'transfer', label: 'העברות', match: (t) => t.startsWith('הועברה') || t.startsWith('תקלה הועברה') },
  { id: 'resolve', label: '"בדקתי, תקין"', match: (t) => t.startsWith('סומן "בדקתי, תקין"') },
  { id: 'status', label: 'שינויי מצב', match: (t) => t === 'נפתחה לטיפול' || t.startsWith('נשלחה בקשת השלמה') || t.startsWith('אושרה') },
]

/** מי שינה מצב, דרישה או הגדרה – ומתי */
export function AuditLog({ onOpen }: { onOpen: (number: number) => void }) {
  const [who, setWho] = useState('all')
  const [kind, setKind] = useState('all')
  const [number, setNumber] = useState('')

  const match = KINDS.find((k) => k.id === kind)!.match
  const entries = loadRequests()
    .flatMap((r) => r.history.map((h, i) => ({ ...h, number: r.number, order: i })))
    // רק פעולות של הצוות, לא של הפונה
    // פעולות הצוות; פעולות של הפונה והצד השני נרשמות עם actor
    .filter((e) => e.by || e.actor)
    .filter((e) => who === 'all' || e.by === who)
    .filter((e) => match(e.text))
    .filter((e) => !number.trim() || String(e.number).includes(number.trim()))
    .sort((a, b) => b.at.localeCompare(a.at) || b.number - a.number || b.order - a.order)

  return (
    <section className="panel">
      <h2>יומן פעולות</h2>
      <div className="range">
        <select className="input input--inline" value={who} onChange={(e) => setWho(e.target.value)} aria-label="מי">
          <option value="all">כל מי שפעל</option>
          {AGENTS.map((a) => (
            <option key={a.id} value={a.name}>
              {a.name}
            </option>
          ))}
          <option value="מנהל/ת">מנהל/ת</option>
        </select>
        <select className="input input--inline" value={kind} onChange={(e) => setKind(e.target.value)} aria-label="סוג פעולה">
          {KINDS.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
        </select>
        <input className="input input--inline" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="מספר פנייה" dir="ltr" />
      </div>

      <p className="muted">{entries.length} פעולות</p>
      <table className="queue">
        <thead>
          <tr>
            <th>תאריך</th>
            <th>מי</th>
            <th>פנייה</th>
            <th>פעולה</th>
          </tr>
        </thead>
        <tbody>
          {entries.slice(0, 150).map((e, i) => (
            <tr key={i} className="no-hover">
              <td>{formatDate(e.at)}</td>
              <td>{e.by ? (e.by === 'מנהל/ת' ? e.by : `נציג/ה ${e.by}`) : e.actor}</td>
              <td>
                <button type="button" className="link" onClick={() => onOpen(e.number)}>
                  {e.number}
                </button>
              </td>
              <td>{e.text}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
