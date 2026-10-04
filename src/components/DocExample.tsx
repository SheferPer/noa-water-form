import { useId, useState, type ReactNode } from 'react'
import { DOC_EXAMPLES, type DocKind } from '../data/seed'

/** שרטוט מוקטן של המסמך, עם סימון האזורים שחייבים להופיע */
function Sketch({ kind }: { kind: DocKind }) {
  switch (kind) {
    case 'meter':
      return (
        <div className="sketch sketch--meter">
          <div className="sketch__dial">
            <span className="sketch__digits">01234</span>
            <span className="sketch__mark sketch__mark--b">הקריאה</span>
          </div>
          <span className="sketch__serial">
            21-004871<span className="sketch__mark sketch__mark--a">מספר המונה</span>
          </span>
        </div>
      )
    case 'id':
      return (
        <div className="sketch sketch--id">
          <div className="sketch__card">
            <span className="sketch__photo" />
            <span className="sketch__lines">
              <i />
              <i />
              <i className="short" />
            </span>
            <span className="sketch__mark sketch__mark--a">צד התמונה</span>
          </div>
          <div className="sketch__card sketch__card--appendix">
            <span className="sketch__lines">
              <i />
              <i />
              <i />
            </span>
            <span className="sketch__mark sketch__mark--b">ספח פתוח</span>
          </div>
        </div>
      )
    case 'poa':
    case 'lease-end':
      return (
        <div className="sketch sketch--page">
          <span className="sketch__lines">
            <i />
            <i />
            <i className="short" />
          </span>
          <span className="sketch__sign">
            ✍<span className="sketch__mark sketch__mark--b">חתימה</span>
          </span>
        </div>
      )
    default:
      return (
        <div className="sketch sketch--pages">
          <div className="sketch__page">
            <span className="sketch__zone sketch__zone--a">הצדדים</span>
            <span className="sketch__zone sketch__zone--c">כתובת</span>
            <span className="sketch__lines">
              <i />
              <i className="short" />
            </span>
          </div>
          <div className="sketch__page">
            <span className="sketch__zone sketch__zone--b">תאריך</span>
            <span className="sketch__lines">
              <i />
              <i />
            </span>
          </div>
          <div className="sketch__page">
            <span className="sketch__lines">
              <i />
              <i className="short" />
            </span>
            <span className="sketch__zone sketch__zone--d">חתימות</span>
          </div>
        </div>
      )
  }
}

const DocIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path d="M6 2h8l5 5v15H6z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M14 2v5h5M9 12h7M9 16h5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
)

/** סמל שפותח חלונית במעבר עכבר או במיקוד; בנגיעה (טלפון) – נפתח ונסגר בלחיצה */
function Hint({ label, ariaLabel, children }: { label: string; ariaLabel: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <span className={`hint ${open ? 'is-open' : ''}`} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className="hint__icon"
        aria-label={ariaLabel}
        aria-describedby={id}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
      >
        <DocIcon />
        {label}
      </button>
      <span role="tooltip" id={id} className="hint__pop">
        {children}
      </span>
    </span>
  )
}

export function DocExample({ kind }: { kind: DocKind }) {
  const example = DOC_EXAMPLES[kind]
  return (
    <Hint label="דוגמה" ariaLabel={`דוגמה: ${example.title}`}>
      <strong className="hint__title">{example.title}</strong>
      <Sketch kind={kind} />
      <span className="hint__list">
        {example.mustShow.map((m) => (
          <span key={m}>✓ {m}</span>
        ))}
      </span>
    </Hint>
  )
}

/** שרטוט חשבון המים, עם הדגשת מספר חשבון החוזה */
export function BillSketch() {
  return (
    <>
      <strong className="hint__title">חשבון המים שלכם</strong>
      <span className="bill">
        <span className="bill__head">
          <strong>מי העיר</strong>
          <span>חשבון תקופתי</span>
        </span>
        <span className="bill__row">
          <span>שם הלקוח</span>
          <span>ישראל ישראלי</span>
        </span>
        <span className="bill__row bill__row--mark">
          <span>מספר חשבון חוזה</span>
          <strong dir="ltr">5500123</strong>
          <span className="sketch__mark sketch__mark--a">זה המספר</span>
        </span>
        <span className="bill__row">
          <span>תקופת חיוב</span>
          <span>07–08/2026</span>
        </span>
        <span className="sketch__lines">
          <i />
          <i />
          <i className="short" />
        </span>
        <span className="bill__total">
          <span>לתשלום</span>
          <strong>₪ 214.60</strong>
        </span>
      </span>
      <span className="hint__list">
        <span>אין חשבון? אפשר לבקש מבעל הנכס או מהשוכר הקודם.</span>
      </span>
    </>
  )
}

/** איפה מספר החשבון מופיע בחשבון המים */
export function BillHint() {
  return (
    <Hint label="איפה זה בחשבון?" ariaLabel="איפה מופיע מספר חשבון חוזה בחשבון המים">
      <BillSketch />
    </Hint>
  )
}
