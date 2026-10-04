import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Field, Notice, TextInput } from '../components/ui'
import { MOCK_TODAY } from '../data/seed'
import { addSms, clearDraft, loadDraft, saveDraft, type SubmittedRequest } from '../data/store'
import { emptyDraft, type Draft, type DraftUpdate, type StepId } from './draft'
import { Progress } from './Progress'
import { DateStep } from './steps/DateStep'
import { MailingStep, MeStep, NextTenantStep, PartyStep, ProxyStep } from './steps/DetailSteps'
import { DocsStep } from './steps/DocsStep'
import { PropertyStep } from './steps/PropertyStep'
import { ResidentsStep } from './steps/ResidentsStep'
import { RouteStep } from './steps/RouteStep'
import { SummaryStep } from './steps/SummaryStep'
import { validPhone, visibleSteps } from './steps'
import { submitDraft } from './submit'
import { phoneError, ShowErrors, useFieldErrors } from './validation'

interface Props {
  onSubmitted?: (r: SubmittedRequest) => void
  /** עריכת בקשה שכבר הוגשה (לפני שנציג פתח אותה) */
  editing?: { draft: Draft; onSave: (d: Draft) => void }
  /** מעבר לבקשה פתוחה שכבר קיימת על אותו נכס */
  onJoin?: (number: number) => void
  /** "שמירה והמשך אחר כך" – נשלח קישור לנייד */
  onSaveExit?: (phone: string) => void
}

/** שמירת הטופס וחזרה אליו אחר כך, גם ממכשיר אחר */
function SaveForLater({ draft, onSaved }: { draft: Draft; onSaved: (phone: string) => void }) {
  const [phone, setPhone] = useState(draft.me.phone)
  const { blur, error } = useFieldErrors()
  const err = error('phone', phoneError(phone))

  function send() {
    if (!validPhone(phone)) return
    addSms([
      {
        at: MOCK_TODAY,
        to: phone,
        text: 'שמרנו את הטופס להחלפת משלמים שהתחלת. להמשך מאותה נקודה: https://mayim.example/draft/7K2M · הקישור בתוקף 30 יום',
      },
    ])
    onSaved(phone)
  }

  return (
    <div className="compose">
      <p className="muted">נשלח קישור לנייד. אפשר להמשיך מכל מכשיר, ומה שמילאת עד עכשיו יחכה לך.</p>
      <Field label="לאיזה נייד לשלוח?" error={err}>
        <TextInput
          type="tel"
          format="phone"
          value={phone}
          onChange={setPhone}
          onBlur={blur('phone')}
          invalid={Boolean(err)}
          dir="ltr"
          placeholder="050-123-4567"
        />
      </Field>
      <button type="button" className="secondary" onClick={send} disabled={!validPhone(phone)}>
        שליחת הקישור
      </button>
    </div>
  )
}

export function Wizard({ onSubmitted, editing, onJoin, onSaveExit }: Props) {
  const [draft, setDraft] = useState<Draft>(() => editing?.draft ?? loadDraft() ?? emptyDraft())
  const [showMissing, setShowMissing] = useState(false)
  const [saving, setSaving] = useState(false)
  // האם נכנסנו לטופס שכבר התחיל – כדי לומר את זה פעם אחת, בכניסה
  const [resumed] = useState(() => !editing && (loadDraft()?.step ?? 'property') !== 'property')
  const [resumeSeen, setResumeSeen] = useState(false)
  const panelRef = useRef<HTMLElement>(null)

  // שמירה אוטומטית בדפדפן – חוזרים מאותו מכשיר בדיוק לאותה נקודה
  useEffect(() => {
    if (!editing) saveDraft(draft)
  }, [draft, editing])

  const update: DraftUpdate = useCallback((recipe) => {
    setDraft((prev) => {
      const next = structuredClone(prev)
      recipe(next)
      return next
    })
  }, [])

  const steps = visibleSteps(draft)
  const index = Math.max(0, steps.findIndex((s) => s.id === draft.step))
  const step = steps[index]
  const missing = step.missing(draft)
  const isLast = step.id === 'summary'

  function goTo(id: StepId) {
    setShowMissing(false)
    setSaving(false)
    setResumeSeen(true)
    update((d) => (d.step = id))
    panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function next() {
    if (missing.length > 0) {
      setShowMissing(true)
      return
    }
    if (isLast) {
      const blocked = steps.find((s) => s.missing(draft).length > 0)
      if (blocked) return goTo(blocked.id)
      if (editing) return editing.onSave(draft)
      const saved = submitDraft(draft)
      clearDraft()
      onSubmitted?.(saved)
      return
    }
    goTo(steps[index + 1].id)
  }

  const body: Record<StepId, ReactNode> = {
    property: <PropertyStep d={draft} update={update} />,
    route: <RouteStep d={draft} update={update} onJoin={onJoin} />,
    proxy: <ProxyStep d={draft} update={update} />,
    date: <DateStep d={draft} update={update} />,
    me: <MeStep d={draft} update={update} />,
    party: <PartyStep d={draft} update={update} />,
    next: <NextTenantStep d={draft} update={update} />,
    docs: <DocsStep d={draft} update={update} />,
    residents: <ResidentsStep d={draft} update={update} />,
    mailing: <MailingStep d={draft} update={update} />,
    summary: <SummaryStep d={draft} update={update} goTo={goTo} />,
  }

  return (
    <div className="wizard">
      <Progress d={draft} steps={steps} current={step.id} onSelect={goTo} />

      <section className="panel" ref={panelRef}>
        <p className="panel__count">
          שלב {index + 1}
          {draft.route && ` מתוך ${steps.length}`}
        </p>
        <h1>{step.title(draft)}</h1>
        {/* בזיהוי הנכס השאלה עצמה ברורה – השורה מיותרת */}
        {step.id !== 'property' && <p className="lead">{step.need(draft)}</p>}

        {resumed && !resumeSeen && <Notice tone="ok">המשכנו מהמקום שבו עצרת. כל מה שמילאת נשמר.</Notice>}

        <div className="panel__body">
          <ShowErrors.Provider value={showMissing}>{body[step.id]}</ShowErrors.Provider>
        </div>

        {showMissing && missing.length > 0 && (
          <Notice tone="error">
            <strong>כדי להמשיך חסר:</strong>
            <ul>
              {missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </Notice>
        )}

        <div className="actions">
          <button type="button" className="primary" onClick={next}>
            {isLast ? (editing ? 'שמירת השינויים' : 'שליחת הבקשה') : 'המשך'}
          </button>
          {index > 0 && (
            <button type="button" className="link" onClick={() => goTo(steps[index - 1].id)}>
              חזרה
            </button>
          )}
          {onSaveExit && !editing && (
            <button type="button" className="link" onClick={() => setSaving((s) => !s)} aria-expanded={saving}>
              שמירה והמשך אחר כך
            </button>
          )}
          <span className="muted autosave">{editing ? 'עריכת בקשה שהוגשה' : 'נשמר אוטומטית'}</span>
        </div>

        {saving && onSaveExit && <SaveForLater draft={draft} onSaved={onSaveExit} />}
      </section>
    </div>
  )
}
