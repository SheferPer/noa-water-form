import { useState } from 'react'
import { Field, TextInput } from '../components/ui'
import { AGENTS } from '../data/agents'
import { MOCK_TODAY } from '../data/seed'
import { loadRequests, type SubmittedRequest } from '../data/store'
import { REQUEST_TYPES } from '../requestTypes'

/** תאריך הסיום – לפי רישום האישור ביומן */
const doneAt = (r: SubmittedRequest) => r.history.find((h) => h.text.startsWith('אושרה'))?.at
const days = (from: string, to: string) => (Date.parse(to) - Date.parse(from)) / 86_400_000

export function Performance() {
  const [from, setFrom] = useState('2026-09-01')
  const [to, setTo] = useState(MOCK_TODAY)

  const done = loadRequests().filter((r) => {
    const at = doneAt(r)
    return r.status === 'done' && at !== undefined && at >= from && at <= to
  })

  const rows = AGENTS.map((a) => {
    const theirs = done.filter((r) => r.assignee === a.id)
    const avg = theirs.length ? theirs.reduce((sum, r) => sum + days(r.submittedAt, doneAt(r)!), 0) / theirs.length : null
    return {
      agent: a,
      byRoute: REQUEST_TYPES.map((t) => theirs.filter((r) => r.draft.route === t.id).length),
      total: theirs.length,
      avg,
    }
  })

  return (
    <section className="panel">
      <h2>בקשות שטופלו, לפי נציג וסוג</h2>
      <div className="range">
        <Field label="מתאריך">
          <TextInput type="date" value={from} onChange={setFrom} />
        </Field>
        <Field label="עד תאריך">
          <TextInput type="date" value={to} onChange={setTo} />
        </Field>
      </div>

      <table className="queue perf">
        <thead>
          <tr>
            <th>נציג</th>
            {REQUEST_TYPES.map((t) => (
              <th key={t.id}>{t.label}</th>
            ))}
            <th>סה"כ</th>
            <th>זמן טיפול ממוצע</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.agent.id} className="no-hover">
              <td>{row.agent.name}</td>
              {row.byRoute.map((n, i) => (
                <td key={i}>{n}</td>
              ))}
              <td>
                <strong>{row.total}</strong>
              </td>
              <td>{row.avg === null ? '—' : `${row.avg.toFixed(1)} ימים`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted">
        זמן טיפול = מההגשה ועד האישור. כמות לבד לא מספרת הכל – נציג שבוחר בקשות פשוטות ייראה טוב יותר ממי שמטפל במורכבות.
      </p>
    </section>
  )
}
