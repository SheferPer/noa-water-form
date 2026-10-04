import { useState } from 'react'
import { loadRequests, reassign, type SubmittedRequest } from '../data/store'
import { businessDaysLeft } from '../data/time'
import { AGENTS } from '../data/agents'
import { STATUS_LABEL, addressOf, atRisk, daysText, isOpen, routeLabel, topFlag } from '../agent/model'

const ADMIN = 'מנהל/ת'

/** מיקוד שמגיע ממדד בלוח הבקרה */
export type Focus = 'risk' | 'unowned' | 'escalated' | null

const FOCUS_LABEL: Record<Exclude<Focus, null>, string> = {
  risk: 'בסיכון – יום עסקים או פחות',
  unowned: 'בלי אחראי זמין',
  escalated: 'ממתינות להכרעת המנהל/ת',
}

/** כל הבקשות במערכת: מי מטפל בכל אחת, ואפשר להעביר אותה לנציג אחר */
export function AllRequests({
  onOpen,
  onChange,
  focus = null,
  onClearFocus,
}: {
  onOpen: (number: number) => void
  onChange: () => void
  focus?: Focus
  onClearFocus?: () => void
}) {
  const [agent, setAgent] = useState('all')
  const [status, setStatus] = useState('open')
  const [search, setSearch] = useState('')
  const requests = loadRequests()

  const unavailable = new Set(AGENTS.filter((a) => !a.available).map((a) => a.id))
  const matchesFocus = (r: SubmittedRequest) => {
    if (!focus) return true
    if (focus === 'risk') return isOpen(r) && atRisk(r)
    if (focus === 'unowned') return isOpen(r) && unavailable.has(r.assignee)
    return isOpen(r) && Boolean(r.escalation)
  }

  const rows = requests
    .filter(matchesFocus)
    .filter((r) => (agent === 'all' ? true : r.assignee === agent))
    .filter((r) => (status === 'all' ? true : status === 'open' ? r.status !== 'done' : r.status === status))
    .filter((r) => !search.trim() || String(r.number).includes(search.trim()) || addressOf(r).includes(search.trim()))
    .sort((a, b) => businessDaysLeft(a.submittedAt) - businessDaysLeft(b.submittedAt))

  function move(r: SubmittedRequest, to: string) {
    if (!to) return
    reassign([r.number], to, ADMIN)
    onChange()
  }

  return (
    <section className="panel">
      <h2>{focus ? FOCUS_LABEL[focus] : 'כל הבקשות'} · {rows.length}</h2>
      {focus && (
        <p className="muted">
          מוצגות רק הבקשות מהמדד שלחצת עליו.{' '}
          <button type="button" className="link" onClick={onClearFocus}>
            הצגת כל הבקשות
          </button>
        </p>
      )}
      <div className="range">
        <select className="input input--inline" value={agent} onChange={(e) => setAgent(e.target.value)} aria-label="נציג">
          <option value="all">כל הנציגים</option>
          {AGENTS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select className="input input--inline" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="מצב">
          <option value="open">בטיפול (לא הושלמו)</option>
          <option value="all">כל המצבים</option>
          <option value="new">חדשות</option>
          <option value="in-review">בבדיקה</option>
          <option value="waiting-applicant">ממתינות לפונה</option>
          <option value="waiting-party">ממתינות לצד השני</option>
          <option value="done">הושלמו</option>
        </select>
        <input className="input input--inline" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="מספר פנייה או כתובת" />
      </div>

      <table className="queue">
        <thead>
          <tr>
            <th>פנייה</th>
            <th>מסלול</th>
            <th>כתובת</th>
            <th>מצב</th>
            <th>מה קרה</th>
            <th>נותרו</th>
            <th>מטפל/ת</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 60).map((r) => {
            const flag = topFlag(r)
            const left = businessDaysLeft(r.submittedAt)
            const clock = r.status === 'new' || r.status === 'in-review'
            return (
              <tr key={r.number} className="no-hover">
                <td>
                  <button type="button" className="link" onClick={() => onOpen(r.number)}>
                    {r.number}
                  </button>
                </td>
                <td>{routeLabel(r)}</td>
                <td>{addressOf(r)}</td>
                <td>{STATUS_LABEL[r.status]}</td>
                <td>
                  <span className={`pill pill--${flag.tone}`}>{flag.label}</span>
                </td>
                <td className={clock && left <= 1 ? 'urgent' : ''}>{clock ? daysText(left) : '—'}</td>
                <td>
                  {/* החלפת נציג לבקשה אחת – הפעולה שחסרה למנהל */}
                  <select className="input input--inline" value={r.assignee} onChange={(e) => move(r, e.target.value)} aria-label={`מטפל בבקשה ${r.number}`}>
                    {AGENTS.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                        {a.available ? '' : ' (לא זמין/ה)'}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {rows.length > 60 && <p className="muted">מוצגות 60 הבקשות הדחופות ביותר. אפשר לסנן כדי לצמצם.</p>}
    </section>
  )
}
