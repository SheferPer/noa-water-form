import { useState } from 'react'
import { getDoc, scanDocument } from '../data/ocr'
import { SAMPLE_DOCS, type DocKind } from '../data/seed'
import { DocExample } from './DocExample'

export interface DocCheck {
  label: string
  ok: boolean
  detail?: string
  actions?: { label: string; onClick: () => void }[]
}

interface Props {
  kind: DocKind
  label: string
  value: string | null
  onChange: (docId: string | null) => void
  /** השוואת תוצאות ה-OCR לשדות שמולאו – מחושב אצל ההורה */
  checks?: DocCheck[]
}

export function DocUpload({ kind, label, value, onChange, checks = [] }: Props) {
  const [scanning, setScanning] = useState(false)
  const doc = getDoc(value)

  async function pick(docId: string) {
    if (!docId) return
    setScanning(true)
    await scanDocument(docId)
    setScanning(false)
    onChange(docId)
  }

  const problems = checks.filter((c) => !c.ok)

  return (
    <div className="doc">
      <div className="doc__head">
        <span className="field__label">{label}</span>
        <DocExample kind={kind} />
      </div>

      {scanning ? (
        <div className="doc__row doc__row--scanning">סורקים את המסמך…</div>
      ) : doc ? (
        <>
          <div className="doc__row">
            <span className="doc__file">📄 {doc.fileName}</span>
            {!doc.unreadable && checks.length > 0 && problems.length === 0 && (
              <span className="badge badge--ok">✓ תואם לפרטים שמילאת</span>
            )}
            <button type="button" className="link" onClick={() => onChange(null)}>
              החלפה
            </button>
          </div>
          {doc.unreadable && (
            <div className="check check--warn">הצילום לא ברור ולא הצלחנו לקרוא אותו. אפשר לצלם שוב, או להמשיך – נציג יבדוק.</div>
          )}
          {problems.map((c) => (
            <div key={c.label} className="check check--warn">
              <strong>{c.label}</strong>
              {c.detail && <span> – {c.detail}</span>}
              {c.actions && (
                <span className="check__actions">
                  {c.actions.map((a) => (
                    <button key={a.label} type="button" className="link" onClick={a.onClick}>
                      {a.label}
                    </button>
                  ))}
                </span>
              )}
            </div>
          ))}
        </>
      ) : (
        <label className="doc__pick">
          <span className="doc__pick-hint">העלאת קובץ (בסימולציה: בוחרים מסמך לדוגמה)</span>
          <select className="input" value="" onChange={(e) => pick(e.target.value)}>
            <option value="">בחרו מסמך…</option>
            {SAMPLE_DOCS.filter((d) => d.kind === kind).map((d) => (
              <option key={d.id} value={d.id}>
                {d.description}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  )
}
