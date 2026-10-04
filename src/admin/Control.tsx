import { useState } from 'react'
import { Notice } from '../components/ui'
import { AGENTS, agentName } from '../data/agents'
import { handleFailure, loadFailures, loadRequests, reassign } from '../data/store'
import { atRisk, isOpen } from '../agent/model'
import type { Focus } from './AllRequests'
import { formatDate } from '../data/verify'

const ADMIN = 'מנהל/ת'

export function Control({ onChange, onDrill }: { onChange: () => void; onDrill: (focus: Focus) => void }) {
  const requests = loadRequests()
  const failures = loadFailures()
  const [result, setResult] = useState('')
  const [moving, setMoving] = useState<string | null>(null)
  const [scope, setScope] = useState<'risk' | 'all'>('risk')
  const [target, setTarget] = useState('auto')
  const [failureTarget, setFailureTarget] = useState<Record<string, string>>({})

  const open = requests.filter(isOpen)
  const risky = open.filter(atRisk)
  const unavailable = new Set(AGENTS.filter((a) => !a.available).map((a) => a.id))
  const unowned = open.filter((r) => unavailable.has(r.assignee))
  const openFailures = failures.filter((f) => !f.handledBy)
  const escalated = open.filter((r) => r.escalation)

  function move(from: string, which: 'risk' | 'all', to: string) {
    const numbers = open.filter((r) => r.assignee === from && (which === 'all' || atRisk(r))).map((r) => r.number)
    if (numbers.length === 0) return
    const after = reassign(numbers, to, ADMIN)
    const counts = AGENTS.map((a) => ({ name: a.name, n: after.filter((r) => numbers.includes(r.number) && r.assignee === a.id).length })).filter((x) => x.n > 0)
    setResult(`הועברו ${numbers.length} בקשות של ${agentName(from)}: ${counts.map((c) => `${c.n} ל${c.name}`).join(', ')}.`)
    setMoving(null)
    onChange()
  }

  return (
    <div className="admin">
      {/* כל מדד הוא קיצור לרשימת הבקשות שמאחוריו */}
      <div className="metrics">
        <button type="button" className="metric metric--link" onClick={() => onDrill('risk')}>
          <span className="metric__label">בסיכון – יום עסקים או פחות</span>
          <strong className={risky.length ? 'urgent' : ''}>{risky.length}</strong>
          <span className="metric__more">הצגת הבקשות ←</span>
        </button>
        <button type="button" className="metric metric--link" onClick={() => onDrill('unowned')}>
          <span className="metric__label">בלי אחראי זמין</span>
          <strong className={unowned.length ? 'urgent' : ''}>{unowned.length}</strong>
          <span className="metric__more">הצגת הבקשות ←</span>
        </button>
        <button type="button" className="metric metric--link" onClick={() => onDrill('escalated')}>
          <span className="metric__label">ממתינות להכרעה שלך</span>
          <strong className={escalated.length ? 'urgent' : ''}>{escalated.length}</strong>
          <span className="metric__more">הצגת הבקשות ←</span>
        </button>
        <a className="metric metric--link" href="#failures">
          <span className="metric__label">תקלות פתוחות</span>
          <strong className={openFailures.length ? 'urgent' : ''}>{openFailures.length}</strong>
          <span className="metric__more">לרשימת התקלות ←</span>
        </a>
      </div>

      {result && <Notice tone="ok">✓ {result}</Notice>}

      {escalated.length > 0 && (
        <Notice tone="info">
          <strong>בקשות שממתינות להכרעה שלך</strong>
          <ul>
            {escalated.map((r) => (
              <li key={r.number}>
                פנייה {r.number} · {r.escalation!.by}: {r.escalation!.question}
              </li>
            ))}
          </ul>
          <div className="muted">פותחים אותן בלשונית "כל הבקשות", ולוחצים "טיפול כמנהל/ת".</div>
        </Notice>
      )}

      {/* הפעולה המרכזית: נציג לא זמין עם בקשות פתוחות */}
      {AGENTS.filter((a) => !a.available).map((a) => {
        const theirs = open.filter((r) => r.assignee === a.id)
        if (theirs.length === 0) return null
        const theirRisk = theirs.filter(atRisk).length
        return (
          <Notice key={a.id} tone="warn">
            <strong>
              {a.name} לא זמינ/ה · {theirs.length} בקשות פתוחות{theirRisk ? `, ${theirRisk} מהן בסיכון` : ''}
            </strong>
            <div className="notice__actions">
              <button type="button" className="primary" onClick={() => move(a.id, 'all', 'auto')}>
                חלוקת כל הבקשות לפי עומס
              </button>
              {theirRisk > 0 && (
                <button type="button" className="link" onClick={() => move(a.id, 'risk', 'auto')}>
                  רק את {theirRisk} שבסיכון
                </button>
              )}
            </div>
          </Notice>
        )
      })}

      <div className="admin__grid">
        <section className="panel">
          <h2>הנציגים</h2>
          <table className="queue">
            <thead>
              <tr>
                <th>נציג</th>
                <th>פתוחות</th>
                <th>בסיכון</th>
                <th>זמינות</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {AGENTS.map((a) => {
                const theirs = open.filter((r) => r.assignee === a.id)
                const theirRisk = theirs.filter(atRisk).length
                return (
                  <tr key={a.id} className="no-hover">
                    <td>{a.name}</td>
                    <td>{theirs.length}</td>
                    <td className={theirRisk ? 'urgent' : ''}>{theirRisk}</td>
                    <td className={a.available ? '' : 'urgent'}>{a.available ? 'זמינ/ה' : 'לא זמינ/ה'}</td>
                    <td>
                      {theirs.length > 0 && (
                        <button type="button" className="link" onClick={() => setMoving(moving === a.id ? null : a.id)}>
                          העברה…
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {moving && (
            <div className="compose">
              <p className="field__label">העברת בקשות של {agentName(moving)}</p>
              <div className="choice">
                {(['risk', 'all'] as const).map((s) => (
                  <label key={s} className={`choice__opt ${scope === s ? 'is-selected' : ''}`}>
                    <input type="radio" name="scope" checked={scope === s} onChange={() => setScope(s)} />
                    {s === 'risk' ? 'רק בסיכון' : 'כל הפתוחות'}
                  </label>
                ))}
              </div>
              <select className="input" value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value="auto">חלוקה לפי עומס</option>
                {AGENTS.filter((a) => a.available && a.id !== moving).map((a) => (
                  <option key={a.id} value={a.id}>
                    ל{a.name}
                  </option>
                ))}
              </select>
              <button type="button" className="secondary" onClick={() => move(moving, scope, target)}>
                העברה
              </button>
            </div>
          )}
        </section>

        <section className="panel" id="failures">
          <h2>תקלות</h2>
          {failures.length === 0 && <p className="muted">אין תקלות.</p>}
          <div className="findings">
            {failures.map((f) => (
              <div key={f.id} className={`finding ${f.handledBy ? 'finding--resolved' : 'finding--mismatch'}`}>
                <div className="finding__title">
                  {f.kind === 'sms' ? '✉' : '⬆'} {f.text}
                </div>
                <div className="muted">
                  פנייה {f.number} · {formatDate(f.at)}
                  {f.handledBy && ` · הועבר ל${f.handledBy}`}
                </div>
                {!f.handledBy && (
                  <div className="finding__actions">
                    <select
                      className="input input--inline"
                      value={failureTarget[f.id] ?? ''}
                      onChange={(e) => setFailureTarget({ ...failureTarget, [f.id]: e.target.value })}
                    >
                      <option value="">למי להעביר?</option>
                      {f.kind === 'upload' && <option value="תמיכה טכנית">תמיכה טכנית</option>}
                      {AGENTS.filter((a) => a.available).map((a) => (
                        <option key={a.id} value={a.name}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="link"
                      onClick={() => {
                        const to = failureTarget[f.id]
                        if (!to) return
                        handleFailure(f.id, to, ADMIN)
                        onChange()
                      }}
                    >
                      העברה לטיפול
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
