import { Field, Notice } from '../../components/ui'
import { BILLING_PERIOD_START } from '../../data/seed'
import { contractFindings } from '../../data/verify'
import type { Draft, DraftUpdate, StepId } from '../draft'
import { visibleSteps } from '../steps'

interface Props {
  d: Draft
  update: DraftUpdate
  goTo: (id: StepId) => void
}

export function SummaryStep({ d, update, goTo }: Props) {
  const rows = visibleSteps(d).filter((s) => s.id !== 'summary')
  // אי-התאמות במסמך שהפונה יכול לתקן לפני השליחה
  const docProblems = contractFindings(d)
    .filter((f) => f.state !== 'ok')
    .map((f) => (f.key === 'contract-signed' ? { ...f, label: 'לא זוהתה חתימה על המסמך' } : f))

  return (
    <>
      <dl className="summary">
        {rows.map((s) => (
          <div key={s.id} className="summary__row">
            <dt>{s.title(d)}</dt>
            <dd>{s.summary(d)}</dd>
            <button type="button" className="link" onClick={() => goTo(s.id)}>
              עריכה
            </button>
          </div>
        ))}
      </dl>

      {docProblems.length > 0 && (
        <Notice tone="warn">
          <strong>{docProblems.map((f) => f.label).join(' · ')}</strong>
          <div>
            אפשר לשלוח ככה, אבל כל אי-התאמה מוסיפה ימים לטיפול. כדי לזרז – מומלץ לצרף מסמך מתוקן.
            <div className="notice__actions">
              <button type="button" className="link" onClick={() => goTo('docs')}>
                חזרה לשלב המסמך
              </button>
            </div>
          </div>
        </Notice>
      )}
      {!d.me.idDocId && (
        <Notice tone="warn">
          <strong>צילום ת.ז. עוד לא צורף.</strong>
          <div>
            אפשר לשלוח ככה – אבל בלי הצילום הטיפול לא יכול להסתיים, ונבקש אותו בהמשך. לצרף עכשיו מקצר את התהליך.
            <div className="notice__actions">
              <button type="button" className="link" onClick={() => goTo('me')}>
                חזרה לשלב הפרטים
              </button>
            </div>
          </div>
        </Notice>
      )}
      {d.proxy.enabled && !d.proxy.poaDocId && (
        <Notice tone="warn">ייפוי הכוח עוד לא צורף. אפשר לשלוח עכשיו – נבקש להשלים אותו.</Notice>
      )}
      {d.switchDate && d.switchDate < BILLING_PERIOD_START && (
        <Notice tone="warn">התאריך מוקדם מתקופת החיוב הנוכחית – נציג יבדוק אם אפשר להחיל אותו.</Notice>
      )}

      <Field label="הערות לנציג (רשות)" hint="משהו שחשוב שנדע – למשל נסיבות מיוחדות או מסמך שחסר">
        <textarea className="input input--wide" rows={3} value={d.notes} onChange={(e) => update((draft) => (draft.notes = e.target.value))} />
      </Field>

      <fieldset className="declarations">
        <legend className="field__label">לפני השליחה</legend>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={d.declarations.accurate}
            onChange={(e) => update((draft) => (draft.declarations.accurate = e.target.checked))}
          />
          אני מצהיר/ה שהפרטים נכונים ומלאים. ההצהרה הזו היא החתימה שלי על הבקשה <span className="req">(חובה)</span>
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={d.declarations.terms}
            onChange={(e) => update((draft) => (draft.declarations.terms = e.target.checked))}
          />
          קראתי את התקנון <span className="req">(חובה)</span>
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={d.declarations.marketing}
            onChange={(e) => update((draft) => (draft.declarations.marketing = e.target.checked))}
          />
          אשמח לקבל עדכונים ופרסומים <span className="muted">(רשות)</span>
        </label>
        <p className="muted">
          עדכונים על מצב הבקשה יישלחו ב-SMS בכל מקרה. עם השליחה יירשמו השם, מספר הת.ז. והמועד שבו אושרה ההצהרה.
        </p>
      </fieldset>
    </>
  )
}
