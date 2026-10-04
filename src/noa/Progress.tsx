import { Meter } from '../components/ui'
import type { Draft, StepId } from './draft'
import { minutesLeft, requiredDocs, type StepDef } from './steps'

interface Props {
  d: Draft
  steps: StepDef[]
  current: StepId
  onSelect: (id: StepId) => void
}

const timeText = (n: number) => (n <= 1 ? 'נותרה כדקה' : `נותרו כ-${n} דקות`)

/** המסמכים הדרושים: מה כבר אצלנו, מה נבקש בהמשך, ומה חסר משלב שכבר עברו */
function DocsPanel({ d, steps, current, onSelect }: Props) {
  const docs = requiredDocs(d)
  // הרשימה נגזרת מסוג הבקשה, ולכן אין מה להציג לפני שבוחרים מה קרה
  if (!d.route) return null

  if (docs.length === 0) {
    return (
      <div className="docs-left docs-left--done">
        <strong>לא דרושים מסמכים בבקשה כזו</strong>
        <span>הרשימה מתעדכנת לפי סוג הבקשה והתשובות שלכם.</span>
      </div>
    )
  }

  const stepIndex = (id: StepId) => steps.findIndex((s) => s.id === id)
  const currentIndex = stepIndex(current)
  const titleOf = (id: StepId) => steps.find((s) => s.id === id)?.title(d) ?? ''

  const rows = docs.map((doc) => {
    const at = stepIndex(doc.step)
    const state = doc.done ? 'done' : at >= 0 && at < currentIndex ? 'late' : 'future'
    return { ...doc, at, state }
  })
  const here = rows.filter((x) => x.state === 'done').length
  const late = rows.filter((x) => x.state === 'late').length

  return (
    <details className={`docs-left docs-left--${late > 0 ? 'late' : here === docs.length ? 'done' : 'open'}`}>
      <summary>
        <strong>
          {here === docs.length ? `✓ כל ${docs.length} המסמכים הדרושים אצלנו` : `מסמכים דרושים: ${here} מתוך ${docs.length} אצלנו`}
        </strong>
        {/* בלי זה נראה שדילגנו על משהו, גם כשעוד לא הגענו לשלב */}
        <span>
          {late > 0
            ? `${late} מסמכים ממתינים לכם משלב קודם`
            : here === docs.length
              ? 'אין מה להעלות יותר'
              : 'כל מסמך יתבקש בשלב שלו'}
        </span>
        {/* סימן הרחבה מפורש – אחרת לא ברור שיש כאן מה לפתוח */}
        <span className="docs-left__toggle">
          <span className="docs-left__closed">▾ אילו מסמכים?</span>
          <span className="docs-left__open">▴ סגירת הפירוט</span>
        </span>
      </summary>
      <ul>
        {rows.map((x, i) => (
          <li key={`${x.label}-${i}`} className={`docs-left__row docs-left__row--${x.state}`}>
            <span aria-hidden="true">{x.state === 'done' ? '✓' : x.state === 'late' ? '⚠' : '○'}</span>
            <span>
              {x.label} –{' '}
              {x.state === 'done' ? (
                'הועלה'
              ) : x.at === currentIndex ? (
                'מבקשים בשלב הזה'
              ) : x.state === 'late' ? (
                <button type="button" className="link" onClick={() => onSelect(x.step)}>
                  חסר, חזרה לשלב "{titleOf(x.step)}"
                </button>
              ) : (
                `נבקש בשלב "${titleOf(x.step)}"`
              )}
            </span>
          </li>
        ))}
      </ul>
      {/* למה הרשימה משתנה תוך כדי המילוי */}
      <p className="docs-left__note">הרשימה מתעדכנת לפי סוג הבקשה והתשובות שלכם.</p>
    </details>
  )
}

/** רשימת השלבים בצד: מה עשיתי, איפה אני, ומה עוד יידרש */
export function Progress({ d, steps, current, onSelect }: Props) {
  const firstIncomplete = steps.find((s) => s.missing(d).length > 0)?.id
  const doneCount = steps.filter((s) => s.id !== current && s.missing(d).length === 0).length

  return (
    <nav className="progress" aria-label="שלבי הבקשה">
      <p className="progress__count">
        {d.route ? `הושלמו ${doneCount} מתוך ${steps.length} שלבים` : 'המילוי לוקח בדרך כלל 4–6 דקות'}
      </p>
      {/* הערכה גסה, מחושבת מהשלבים שנשארו – כדי שיהיה ברור כמה עוד */}
      {d.route && <Meter value={doneCount} max={steps.length} label={timeText(minutesLeft(d, steps))} />}

      <DocsPanel d={d} steps={steps} current={current} onSelect={onSelect} />

      <ol>
        {steps.map((s, i) => {
          const done = s.id !== current && s.missing(d).length === 0
          const isCurrent = s.id === current
          const reachable = done || isCurrent || s.id === firstIncomplete
          const state = isCurrent ? 'current' : done ? 'done' : 'todo'
          return (
            <li key={s.id} className={`progress__item progress__item--${state}`}>
              <button type="button" disabled={!reachable} onClick={() => onSelect(s.id)} aria-current={isCurrent ? 'step' : undefined}>
                <span className="progress__mark" aria-hidden="true">
                  {done ? '✓' : i + 1}
                </span>
                <span className="progress__text">
                  <span className="progress__title">{s.title(d)}</span>
                  <span className="progress__sub">{done ? s.summary(d) : s.need(d)}</span>
                </span>
              </button>
            </li>
          )
        })}
        {!d.route && <li className="progress__more">שאר השלבים יופיעו לפי מה שתבחרו ב"מה קרה?"</li>}
      </ol>
    </nav>
  )
}
