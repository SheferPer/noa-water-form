import { useState } from 'react'
import { TextInput } from '../components/ui'
import type { SubmittedRequest } from '../data/store'
import { businessDaysLeft } from '../data/time'
import { addressOf, daysText, routeLabel, topFlag } from './model'

interface Props {
  requests: SubmittedRequest[]
  onOpen: (number: number) => void
}

type SortKey = 'deadline' | 'number' | 'route' | 'address' | 'flag'
interface Sort {
  key: SortKey
  asc: boolean
}

const applicantOf = (r: SubmittedRequest) => `${r.draft.me.firstName} ${r.draft.me.lastName}`.trim()

const valueOf = (r: SubmittedRequest, key: SortKey): string | number => {
  switch (key) {
    case 'number':
      return r.number
    case 'route':
      return routeLabel(r)
    case 'address':
      return addressOf(r)
    case 'flag':
      return topFlag(r).label
    default:
      return businessDaysLeft(r.submittedAt)
  }
}

function sortRows(rows: SubmittedRequest[], sort: Sort): SubmittedRequest[] {
  return [...rows].sort((a, b) => {
    const x = valueOf(a, sort.key)
    const y = valueOf(b, sort.key)
    const cmp = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'he')
    return sort.asc ? cmp : -cmp
  })
}

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'number', label: 'פנייה' },
  { key: 'route', label: 'מסלול' },
  { key: 'address', label: 'כתובת' },
  { key: 'flag', label: 'מה קרה' },
]

function Table({
  rows,
  onOpen,
  clockRuns,
  sort,
  onSort,
}: {
  rows: SubmittedRequest[]
  onOpen: (n: number) => void
  clockRuns: boolean
  sort: Sort
  onSort: (key: SortKey) => void
}) {
  const head = (key: SortKey, label: string) => (
    <th key={key} aria-sort={sort.key === key ? (sort.asc ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="th-sort" onClick={() => onSort(key)}>
        {label}
        {sort.key === key && <span aria-hidden="true"> {sort.asc ? '▲' : '▼'}</span>}
      </button>
    </th>
  )

  return (
    <table className="queue">
      <thead>
        <tr>
          {COLUMNS.map((c) => head(c.key, c.label))}
          {head('deadline', clockRuns ? 'נותרו' : 'שעון')}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const flag = topFlag(r)
          const left = businessDaysLeft(r.submittedAt)
          return (
            <tr key={r.number} onClick={() => onOpen(r.number)}>
              <td>
                <button type="button" className="link" onClick={() => onOpen(r.number)}>
                  {r.number}
                </button>
              </td>
              <td>{routeLabel(r)}</td>
              <td>{addressOf(r)}</td>
              <td>
                <span className={`pill pill--${flag.tone}`}>{flag.label}</span>
              </td>
              <td className={clockRuns && left <= 1 ? 'urgent' : ''}>{clockRuns ? daysText(left) : 'עצור'}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export function Queue({ requests, onOpen }: Props) {
  const [showWaiting, setShowWaiting] = useState(false)
  const [showDone, setShowDone] = useState(false)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<Sort>({ key: 'deadline', asc: true })

  // לחיצה על אותה כותרת הופכת את הכיוון; על כותרת אחרת – מיון חדש מלמעלה
  const onSort = (key: SortKey) => setSort((s) => (s.key === key ? { key, asc: !s.asc } : { key, asc: true }))

  const q = search.trim()
  const matches = (r: SubmittedRequest) =>
    !q || String(r.number).includes(q) || addressOf(r).includes(q) || applicantOf(r).includes(q) || routeLabel(r).includes(q)

  const all = requests.filter(matches)
  const needsMe = (r: SubmittedRequest) => r.completionArrived || Boolean(r.applicantMessage)
  const active = sortRows(all.filter((r) => r.status === 'new' || r.status === 'in-review' || needsMe(r)), sort)
  const waiting = sortRows(all.filter((r) => (r.status === 'waiting-applicant' || r.status === 'waiting-party') && !needsMe(r)), sort)
  const doneAt = (r: SubmittedRequest) => r.history.find((h) => h.text.startsWith('אושרה'))?.at ?? r.submittedAt
  // ברירת המחדל: האחרונות קודם – אחרת בקשה שטופלה עכשיו נבלעת בין הישנות
  const closed = all.filter((r) => r.status === 'done')
  const done = sort.key === 'deadline' ? [...closed].sort((a, b) => doneAt(b).localeCompare(doneAt(a))) : sortRows(closed, sort)

  return (
    <section className="panel">
      <h1>דורש טיפול שלך · {active.length}</h1>
      <p className="lead">ממוין לפי הזמן שנותר מתוך 7 ימי העסקים. אפשר למיין לפי כל עמודה.</p>
      <div className="range">
        <TextInput value={search} onChange={setSearch} placeholder="חיפוש: מספר פנייה, כתובת או שם" />
        {q && (
          <button type="button" className="link" onClick={() => setSearch('')}>
            ניקוי החיפוש
          </button>
        )}
      </div>
      {active.length > 0 ? (
        <Table rows={active} onOpen={onOpen} clockRuns sort={sort} onSort={onSort} />
      ) : (
        <p className="muted">{q ? 'אין בקשות שתואמות לחיפוש.' : 'אין בקשות שממתינות לך.'}</p>
      )}

      <button type="button" className="section-toggle" onClick={() => setShowWaiting((s) => !s)} aria-expanded={showWaiting}>
        {showWaiting ? '▾' : '◂'} ממתין לאחרים · {waiting.length}
        <span className="muted"> – הכדור אצל הפונה או הצד השני, השעון לא רץ</span>
      </button>
      {showWaiting && waiting.length > 0 && <Table rows={waiting} onOpen={onOpen} clockRuns={false} sort={sort} onSort={onSort} />}

      <button type="button" className="section-toggle" onClick={() => setShowDone((s) => !s)} aria-expanded={showDone}>
        {showDone ? '▾' : '◂'} הושלמו · {done.length}
      </button>
      {showDone && done.length > 0 && (
        <>
          <Table rows={done.slice(0, 10)} onOpen={onOpen} clockRuns={false} sort={sort} onSort={onSort} />
          {done.length > 10 && <p className="muted">מוצגות 10 האחרונות מתוך {done.length}.</p>}
        </>
      )}
    </section>
  )
}
