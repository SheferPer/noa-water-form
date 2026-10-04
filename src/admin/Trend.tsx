import { MOCK_TODAY } from '../data/seed'
import { loadRequests, type SubmittedRequest } from '../data/store'

const WEEKS = 8
const doneAt = (r: SubmittedRequest) => r.history.find((h) => h.text.startsWith('אושרה'))?.at

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** תחילת השבוע (יום ראשון) של תאריך נתון */
function weekStart(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  return addDays(iso, -d.getUTCDay())
}

const label = (iso: string) => `${Number(iso.slice(8, 10))}.${Number(iso.slice(5, 7))}`

interface Week {
  start: string
  submitted: number
  completed: number
}

function weeks(): Week[] {
  const requests = loadRequests()
  const first = addDays(weekStart(MOCK_TODAY), -7 * (WEEKS - 1))
  const out: Week[] = []
  for (let i = 0; i < WEEKS; i++) {
    const start = addDays(first, i * 7)
    const end = addDays(start, 7)
    out.push({
      start,
      submitted: requests.filter((r) => r.submittedAt >= start && r.submittedAt < end).length,
      completed: requests.filter((r) => {
        const at = doneAt(r)
        return at !== undefined && at >= start && at < end
      }).length,
    })
  }
  return out
}

/** בקשות שנפתחו מול בקשות שנסגרו, שבוע אחרי שבוע – שם רואים אם נוצר פקק */
export function Trend() {
  const data = weeks()
  const max = Math.max(1, ...data.map((w) => Math.max(w.submitted, w.completed)))
  const width = 660
  const height = 200
  const padBottom = 28
  const slot = width / data.length
  const barWidth = 20
  const scale = (n: number) => ((height - padBottom) * n) / max

  const backlog = data.reduce((sum, w) => sum + w.submitted - w.completed, 0)
  const busiest = data.reduce((a, b) => (b.submitted > a.submitted ? b : a))

  return (
    <section className="panel">
      <h2>מגמה: בקשות שנפתחו מול בקשות שנסגרו</h2>
      <p className="lead">שמונה השבועות האחרונים, מימין לשמאל. בכל שבוע: העמודה הימנית – נפתחו, השמאלית – הושלמו.</p>

      <svg className="trend" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="גרף בקשות שנפתחו והושלמו לפי שבוע">
        <line x1="0" y1={height - padBottom} x2={width} y2={height - padBottom} stroke="var(--border-strong)" />
        {/* בעברית הזמן זורם מימין לשמאל, אז השבוע הישן ביותר נמצא מימין */}
        {[...data].reverse().map((w, i) => {
          const center = i * slot + slot / 2
          const rows: [number, string, number][] = [
            [w.submitted, 'var(--purple-ink)', center + 2],
            [w.completed, 'var(--teal-ink)', center - barWidth - 2],
          ]
          return (
            <g key={w.start}>
              {rows.map(([value, color, x]) => (
                <g key={color}>
                  <rect x={x} y={height - padBottom - scale(value)} width={barWidth} height={scale(value)} rx="4" fill={color} />
                  {value > 0 && (
                    <text x={x + barWidth / 2} y={height - padBottom - scale(value) - 5} textAnchor="middle" fontSize="11" fill="var(--muted)">
                      {value}
                    </text>
                  )}
                </g>
              ))}
              <text x={center} y={height - 9} textAnchor="middle" fontSize="12" fill="var(--muted)">
                {label(w.start)}
              </text>
            </g>
          )
        })}
      </svg>

      <p className="legend">
        <span className="legend__key legend__key--open" /> נפתחו
        <span className="legend__key legend__key--done" /> הושלמו
      </p>
      <p className="muted">
        בשמונת השבועות האלה נפתחו {backlog >= 0 ? backlog : -backlog} בקשות {backlog >= 0 ? 'יותר' : 'פחות'} ממה שנסגר. השבוע העמוס ביותר
        התחיל ב-{label(busiest.start)} עם {busiest.submitted} בקשות.
      </p>
    </section>
  )
}
