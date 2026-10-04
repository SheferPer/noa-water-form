import { useEffect, useRef, useState } from 'react'
import { Notice } from '../components/ui'
import { AGENTS, MANAGER_ID, agentName } from '../data/agents'
import { getDoc } from '../data/ocr'
import { firstName, readingOf } from '../data/secondParty'
import { MOCK_TODAY } from '../data/seed'
import {
  addSms,
  markSeen,
  seenHistoryLength,
  updateRequest,
  type HistoryEntry,
  type Sms,
  type SubmittedRequest,
} from '../data/store'
import { businessDaysLeft } from '../data/time'
import { formatDate, type Finding } from '../data/verify'
import { DocViewer } from './DocViewer'
import { STATUS_LABEL, addressOf, daysText, documentsOf, findingsOf, openFindings, routeLabel } from './model'

interface Props {
  request: SubmittedRequest
  agentId: string
  onBack: () => void
  onChange: (all: SubmittedRequest[]) => void
  /** תצוגת מנהל: רואה הכל, לא משנה כלום (סעיף 15 – הרשאות) */
  readOnly?: boolean
}

/** חלון הביטול אחרי אישור – ההודעה לפונה מחכה עד שהוא נסגר */
const UNDO_SECONDS = 60

const actorOf = (h: HistoryEntry) => (h.by ? (h.by === 'מנהל/ת' ? h.by : `נציג/ה ${h.by}`) : (h.actor ?? 'המערכת'))

function completionText(items: Finding[]): string {
  return items
    .map((f) =>
      f.state === 'missing'
        ? `חסר: ${f.label}.`
        : f.form
          ? `${f.label} – בטופס: ${f.form}, במסמך: ${f.found}. נא לבדוק ולתקן.`
          : `${f.label}: ${f.found}. נא להעלות מחדש.`,
    )
    .join('\n')
}

export function RequestScreen({ request: r, agentId, onBack, onChange, readOnly = false }: Props) {
  const me = agentName(agentId)
  const d = r.draft
  const findings = findingsOf(r)
  const open = openFindings(r)
  const okCount = findings.filter((f) => f.state === 'ok').length
  const resolved = findings.filter((f) => f.state !== 'ok' && r.resolutions[f.key])
  const docs = documentsOf(r)

  // ברירת מחדל: מסמך שאינו תעודת זהות – צפייה בת.ז. היא פעולה מתועדת
  const [viewer, setViewer] = useState<{ docId: string | null; field?: string }>(() => ({
    docId: docs.find((x) => getDoc(x.docId)?.kind !== 'id')?.docId ?? null,
  }))
  const [showOk, setShowOk] = useState(false)
  const [resolving, setResolving] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [panel, setPanel] = useState<'none' | 'complete' | 'transfer' | 'approve-blocked' | 'escalate'>('none')
  const [selected, setSelected] = useState<string[]>(() => open.map((f) => f.key))
  const [message, setMessage] = useState(() => completionText(open))
  const [transferTo, setTransferTo] = useState('')
  const [question, setQuestion] = useState('')
  // מה נוסף ליומן מאז הפעם הקודמת שהנציג/ה הזה/זו פתח/ה את הבקשה
  const [changedSince] = useState<HistoryEntry[]>(() => {
    const seen = seenHistoryLength(agentId, r.number)
    return seen > 0 && seen < r.history.length ? r.history.slice(seen) : []
  })
  const [showChanges, setShowChanges] = useState(true)
  const [undo, setUndo] = useState<{ before: SubmittedRequest; left: number } | null>(null)
  const heldSms = useRef<Sms[] | null>(null)

  const act = (recipe: (req: SubmittedRequest) => void) => onChange(updateRequest(r.number, recipe))
  const log = (text: string) => ({ at: MOCK_TODAY, text, by: me })

  /** פתיחת מסמך בצד; כל צפייה במסמך זיהוי נרשמת ביומן הפעולות */
  function show(docId: string, field?: string) {
    const doc = getDoc(docId)
    // גם צפייה של המנהל נרשמת ביומן
    if (doc?.kind === 'id' && viewer.docId !== docId) act((req) => req.history.push(log(`צפייה במסמך זיהוי: ${doc.fileName}`)))
    setViewer({ docId, field })
  }

  // מכאן והלאה זה מה שהנציג/ה כבר ראה/תה
  useEffect(() => {
    markSeen(agentId, r.number, r.history.length)
  }, [agentId, r.number, r.history.length])

  // ספירה לאחור של חלון הביטול
  useEffect(() => {
    if (!undo) return
    const id = setInterval(() => setUndo((u) => (!u ? null : u.left <= 1 ? null : { ...u, left: u.left - 1 })), 1000)
    return () => clearInterval(id)
  }, [undo])

  // החלון נסגר (נגמר הזמן או יצאנו מהמסך) – ההודעה שהוחזקה יוצאת לפונה.
  // ביטול מנקה אותה קודם, ואז אין מה לשלוח.
  useEffect(() => {
    if (undo || !heldSms.current) return
    addSms(heldSms.current)
    heldSms.current = null
  }, [undo])

  // יציאה מהמסך סוגרת את החלון – ההודעה שהוחזקה יוצאת
  useEffect(
    () => () => {
      if (heldSms.current) {
        addSms(heldSms.current)
        heldSms.current = null
      }
    },
    [],
  )

  // פתיחה ראשונה: "בבדיקה" – מכאן הפונה כבר לא עורך, רק שולח הודעה
  useEffect(() => {
    if (r.status === 'new' && !readOnly) {
      onChange(
        updateRequest(r.number, (req) => {
          // נקרא מחדש מהאחסון – מונע רישום כפול
          if (req.status !== 'new') return
          req.status = 'in-review'
          req.history.push({ at: MOCK_TODAY, text: 'נפתחה לטיפול', by: agentName(agentId) })
        }),
      )
    }
  }, [r.number, r.status, agentId, onChange, readOnly])

  function resolve(f: Finding) {
    if (!note.trim()) return
    act((req) => {
      req.resolutions[f.key] = { note: note.trim(), at: MOCK_TODAY, by: me }
      req.history.push(log(`סומן "בדקתי, תקין": ${f.label} – ${note.trim()}`))
    })
    setResolving(null)
    setNote('')
  }

  function sendCompletion() {
    const items = open.filter((f) => selected.includes(f.key))
    if (items.length === 0 || !message.trim()) return
    act((req) => {
      req.status = 'waiting-applicant'
      req.completionArrived = false
      req.completion = { items: items.map((f) => f.key), message: message.trim(), at: MOCK_TODAY }
      req.pending = [`נדרשת פעולה ממך: ${items.map((f) => f.label).join(', ')}`]
      req.history.push(log(`נשלחה בקשת השלמה: ${items.map((f) => f.label).join(', ')}`))
    })
    const sms = [{ at: MOCK_TODAY, to: d.me.phone, text: `בבקשה ${r.number} חסר משהו כדי להמשיך. להשלמה: https://mayim.example/r/${r.number}` }]
    if (d.proxy.enabled) sms.push({ at: MOCK_TODAY, to: d.proxy.phone, text: `בבקשה ${r.number} שהגשת חסר משהו כדי להמשיך. להשלמה: https://mayim.example/r/${r.number}` })
    addSms(sms)
    setPanel('none')
  }

  function approve() {
    if (open.length > 0) {
      setPanel('approve-blocked')
      return
    }
    const before = structuredClone(r)
    act((req) => {
      req.status = 'done'
      req.completionArrived = false
      req.pending = []
      req.history.push(log('אושרה והושלמה – נבדק על ידי AI, אושר על ידי הנציג/ה'))
    })
    // ההודעה לפונה מחכה עד סוף חלון הביטול – אחרת "ביטול" לא באמת מבטל
    heldSms.current = [{ at: MOCK_TODAY, to: d.me.phone, text: `בקשה ${r.number} אושרה. החשבון עודכן מ-${formatDate(d.switchDate)}.` }]
    setUndo({ before, left: UNDO_SECONDS })
  }

  /** ביטול אישור שניתן בטעות – בלי לפנות למנהל/ת */
  function undoApprove() {
    if (!undo) return
    heldSms.current = null
    const before = undo.before
    act((req) => {
      req.status = before.status
      req.completionArrived = before.completionArrived
      req.pending = before.pending
      req.history = [...before.history, log('האישור בוטל על ידי הנציג/ה בתוך חלון הביטול')]
    })
    setUndo(null)
  }

  /** הכרעה במחלוקת בין הצדדים (סעיף 9) */
  function decideDispute(winner: 'first' | 'second') {
    const sp = r.secondParty!
    const who = winner === 'first' ? d.me.firstName : firstName(sp.name)
    act((req) => {
      const p = req.secondParty!.proposal!
      if (winner === 'second') {
        req.draft.switchDate = p.switchDate
        if (req.draft.reading.source === 'manual') req.draft.reading.manualValue = p.reading
      }
      req.secondParty!.status = 'done'
      req.flags = req.flags.filter((f) => f !== 'מחלוקת')
      req.history.push({ ...log(`נציג/ה הכריע/ה במחלוקת: הוחלה הגרסה של ${who}`), public: true })
    })
    addSms([
      { at: MOCK_TODAY, to: d.me.phone, text: `פנייה ${r.number}: נציג/ה הכריע/ה במחלוקת – הוחלה הגרסה של ${who}.` },
      { at: MOCK_TODAY, to: sp.phone, text: `פנייה ${r.number}: נציג/ה הכריע/ה במחלוקת – הוחלה הגרסה של ${who}.` },
    ])
  }

  /** הנציג מבקש הכרעה של המנהל/ת (למשל: לאשר בלי מסמך?) */
  function escalate() {
    if (!question.trim()) return
    act((req) => {
      req.escalation = { at: MOCK_TODAY, by: me, question: question.trim() }
      req.history.push(log(`הועברה להכרעת המנהל/ת: ${question.trim()}`))
    })
    setPanel('none')
    setQuestion('')
  }

  /** המנהל/ת מחזיר/ה לנציג עם תשובה */
  function returnToAgent(answer: string) {
    act((req) => {
      req.escalation = undefined
      req.history.push({ ...log(`הוחזרה לנציג/ה עם החלטה: ${answer}`) })
    })
  }

  function transfer() {
    if (!transferTo) return
    act((req) => {
      req.assignee = transferTo
      req.history.push(log(`הועברה ל${agentName(transferTo)}`))
    })
    onBack()
  }

  const left = businessDaysLeft(r.submittedAt)
  const parties = `${d.me.firstName} ${d.me.lastName} (${d.route === 'rent-start' ? 'הדייר/ת הנכנס/ת' : d.route === 'buy' ? 'הקונה' : d.route === 'sell' ? 'המוכר/ת' : 'הדייר/ת היוצא/ת'}) · ${d.party.name} (${d.route === 'buy' ? 'המוכר/ת' : d.route === 'sell' ? 'הקונה' : 'בעל/ת הנכס'})`
  const active = !readOnly && (r.status === 'in-review' || r.status === 'new')

  return (
    <div className="handle">
      <button type="button" className="link back" onClick={onBack}>
        → {readOnly ? 'חזרה לרשימה' : 'חזרה לתור'}
      </button>
      {readOnly && <Notice tone="info">תצוגת מנהל/ת: צפייה בלבד. הטיפול הוא של הנציג/ה שהבקשה משויכת אליו/ה.</Notice>}
      {!readOnly && agentId === MANAGER_ID && <Notice tone="warn">את/ה מטפל/ת בבקשה כמנהל/ת. כל פעולה תירשם ביומן על שמך.</Notice>}

      {/* ההקשר */}
      <section className="panel handle__context">
        <div>
          <h1>
            {r.number} · {routeLabel(r)} · {addressOf(r)}
          </h1>
          <p className="lead">
            {d.switchDate && `מ-${formatDate(d.switchDate)} · `}
            {parties}
            {d.proxy.enabled && ` · הוגש על ידי ${d.proxy.name}`}
          </p>
        </div>
        <div className="handle__meta">
          <span className="pill pill--neutral">{STATUS_LABEL[r.status]}</span>
          {active && <span className={left <= 1 ? 'urgent' : ''}>נותרו: {daysText(left)}</span>}
          <span className="muted">מטפל/ת: {agentName(r.assignee)}</span>
        </div>
      </section>

      {r.escalation && (
        <Notice tone="info">
          <strong>ממתינה להכרעת מנהל/ת</strong>
          <div>
            {r.escalation.by} שאל/ה: {r.escalation.question}
          </div>
          {agentId === MANAGER_ID && (
            <div className="notice__actions">
              <button type="button" className="secondary" onClick={() => returnToAgent('אושר – אפשר להמשיך')}>
                מאשר/ת – להמשיך
              </button>
              <button type="button" className="secondary" onClick={() => returnToAgent('לא אושר – להשלים את מה שחסר')}>
                לא מאשר/ת – להשלים
              </button>
            </div>
          )}
        </Notice>
      )}
      {r.applicantMessage && (
        <Notice tone="warn">
          <strong>הודעה מהפונה:</strong> {r.applicantMessage}
          <div className="notice__actions">
            <button
              type="button"
              className="link"
              onClick={() =>
                act((req) => {
                  req.applicantMessage = undefined
                  req.history.push(log('ההודעה מהפונה נקראה'))
                })
              }
            >
              סימון כנקרא
            </button>
          </div>
        </Notice>
      )}
      {r.secondParty?.status === 'dispute' && r.secondParty.proposal && (
        <Notice tone="warn">
          <strong>מחלוקת בין הצדדים – צריך להכריע</strong>
          <div className="versions">
            <div>
              <span className="muted">{d.me.firstName} (הגישה)</span>
              <strong>
                {formatDate(d.switchDate)} · {readingOf(d)} מ״ק
              </strong>
            </div>
            <div>
              <span className="muted">{r.secondParty.name}</span>
              <strong>
                {formatDate(r.secondParty.proposal.switchDate)} · {r.secondParty.proposal.reading} מ״ק
              </strong>
            </div>
          </div>
          {active && (
            <div className="notice__actions">
              <button type="button" className="secondary" onClick={() => decideDispute('first')}>
                להחיל את הגרסה של {d.me.firstName}
              </button>
              <button type="button" className="secondary" onClick={() => decideDispute('second')}>
                להחיל את הגרסה של {firstName(r.secondParty.name)}
              </button>
            </div>
          )}
        </Notice>
      )}
      {changedSince.length > 0 && showChanges && (
        <Notice tone="info">
          <strong>מה השתנה מאז שפתחת את הבקשה ({changedSince.length})</strong>
          <ol className="history">
            {changedSince.map((h, i) => (
              <li key={i}>
                <span className="history__at">{formatDate(h.at)}</span> {h.text}
                <span className="muted"> · {actorOf(h)}</span>
              </li>
            ))}
          </ol>
          <div className="notice__actions">
            <button type="button" className="link" onClick={() => setShowChanges(false)}>
              הבנתי, לסגור
            </button>
          </div>
        </Notice>
      )}
      {r.completionArrived && r.status !== 'done' && (
        <Notice tone="warn">
          <strong>הגיעה השלמה מהפונה.</strong> הממצאים למטה מחושבים מחדש לפי המסמכים החדשים.
        </Notice>
      )}
      {r.status === 'waiting-applicant' && r.completion && (
        <Notice tone="info">
          <strong>נשלחה בקשת השלמה ב-{formatDate(r.completion.at)}</strong> – השעון עצור עד שהפונה ישלים.
          <pre className="message">{r.completion.message}</pre>
        </Notice>
      )}
      {r.status === 'waiting-party' && <Notice tone="info">מחכים שהצד השני יאשר וימלא את החלק שלו – השעון עצור.</Notice>}
      {undo && (
        <Notice tone="ok">
          <strong>✓ הבקשה אושרה.</strong> ההודעה לפונה תישלח בעוד {undo.left} שניות – עד אז אפשר לחזור בך.
          <div className="notice__actions">
            <button type="button" className="secondary" onClick={undoApprove}>
              ביטול האישור
            </button>
          </div>
        </Notice>
      )}
      {r.status === 'done' && !undo && <Notice tone="ok">✓ הבקשה הושלמה.</Notice>}

      <div className="handle__grid">
        {/* הבדיקה */}
        <section className="panel">
          <h2>הבדיקה</h2>
          <div className="findings">
            {open.map((f) => (
              <div key={f.key} className={`finding finding--${f.state}`}>
                <div className="finding__title">
                  {f.state === 'missing' ? '✗' : '⚠'} {f.label}
                  {f.state === 'missing' && ' – חסר'}
                  <span className="finding__src">{f.source === 'ai' ? 'AI' : 'מערכת'}</span>
                </div>
                {(f.form || f.found) && (
                  <div className="finding__values">
                    {f.form && <span>בטופס: {f.form}</span>}
                    {f.found && <span>{f.source === 'ai' ? 'במסמך' : 'במערכת'}: {f.found}</span>}
                  </div>
                )}
                {f.guidance && <div className="finding__guide">💡 {f.guidance}</div>}
                <div className="finding__actions">
                  {f.docId && (
                    <button type="button" className="link" onClick={() => show(f.docId!, f.field)}>
                      הצג במסמך
                    </button>
                  )}
                  {active && resolving !== f.key && (
                    <button type="button" className="link" onClick={() => { setResolving(f.key); setNote('') }}>
                      בדקתי, תקין
                    </button>
                  )}
                </div>
                {resolving === f.key && (
                  <div className="resolve">
                    <textarea className="input" rows={2} placeholder="למה זה תקין? (חובה)" value={note} onChange={(e) => setNote(e.target.value)} />
                    <div className="finding__actions">
                      <button type="button" className="secondary" onClick={() => resolve(f)} disabled={!note.trim()}>
                        שמירה
                      </button>
                      <button type="button" className="link" onClick={() => setResolving(null)}>
                        ביטול
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {resolved.map((f) => (
              <div key={f.key} className="finding finding--resolved">
                ✓ {f.label} – נבדק ידנית: {r.resolutions[f.key].note}
                <span className="muted"> ({r.resolutions[f.key].by})</span>
              </div>
            ))}

            <button type="button" className="finding finding--ok" onClick={() => setShowOk((s) => !s)} aria-expanded={showOk}>
              ✓ {okCount} פריטים תואמים {showOk ? '▾' : '◂'}
            </button>
            {showOk &&
              findings
                .filter((f) => f.state === 'ok')
                .map((f) => (
                  <div key={f.key} className="finding finding--ok-row">
                    <span>
                      {f.label}: {f.found ?? f.form}
                    </span>
                    <span className="finding__src">{f.source === 'ai' ? 'AI' : 'מערכת'}</span>
                    {f.docId && (
                      <button type="button" className="link" onClick={() => show(f.docId!, f.field)}>
                        הצג
                      </button>
                    )}
                  </div>
                ))}
          </div>
        </section>

        {/* המסמך */}
        <section className="panel">
          <h2>המסמכים</h2>
          <div className="doc-tabs">
            {docs.map((x) => (
              <button
                key={x.docId + x.label}
                type="button"
                className={`doc-tab ${viewer.docId === x.docId ? 'is-active' : ''}`}
                onClick={() => show(x.docId)}
              >
                {x.label}
              </button>
            ))}
          </div>
          <DocViewer docId={viewer.docId} field={viewer.field} />
        </section>
      </div>

      {/* הפעולה */}
      {active && (
        <section className="panel">
          <div className="actions">
            <button type="button" className="secondary" onClick={() => setPanel(panel === 'complete' ? 'none' : 'complete')} disabled={open.length === 0}>
              בקשת השלמה
            </button>
            <button type="button" className="primary" onClick={approve}>
              {open.length > 0 ? '🔒 ' : ''}אישור והשלמה
            </button>
            <button type="button" className="link" onClick={() => setPanel(panel === 'transfer' ? 'none' : 'transfer')}>
              העברה לנציג אחר
            </button>
            {!r.escalation && (
              <button type="button" className="link" onClick={() => setPanel(panel === 'escalate' ? 'none' : 'escalate')}>
                להכרעת המנהל/ת
              </button>
            )}
          </div>

          {panel === 'approve-blocked' && (
            <Notice tone="warn">
              אי אפשר לאשר כל עוד {open.length === 1 ? 'יש חריגה פתוחה' : `יש ${open.length} חריגות פתוחות`}. כל חריגה נסגרת
              בבקשת השלמה או ב"בדקתי, תקין" עם הסבר.
            </Notice>
          )}

          {panel === 'complete' && (
            <div className="compose">
              <p className="field__label">מה לבקש מהפונה?</p>
              {open.map((f) => (
                <label key={f.key} className="checkbox">
                  <input
                    type="checkbox"
                    checked={selected.includes(f.key)}
                    onChange={(e) => {
                      const next = e.target.checked ? [...selected, f.key] : selected.filter((k) => k !== f.key)
                      setSelected(next)
                      setMessage(completionText(open.filter((x) => next.includes(x.key))))
                    }}
                  />
                  {f.label}
                </label>
              ))}
              <label className="field">
                <span className="field__label">ההודעה לפונה (אפשר לערוך)</span>
                <textarea className="input input--wide" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
              </label>
              <button type="button" className="primary" onClick={sendCompletion}>
                שליחת בקשת השלמה
              </button>
            </div>
          )}

          {panel === 'escalate' && (
            <div className="compose">
              <label className="field">
                <span className="field__label">מה השאלה למנהל/ת?</span>
                <textarea
                  className="input input--wide"
                  rows={3}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="למשל: שני הצדדים מסכימים על התאריך, אבל אין הסכם מכר. לאשר?"
                />
              </label>
              <button type="button" className="secondary" onClick={escalate} disabled={!question.trim()}>
                שליחה להכרעה
              </button>
            </div>
          )}

          {panel === 'transfer' && (
            <div className="compose">
              <label className="field">
                <span className="field__label">למי להעביר?</span>
                <select className="input" value={transferTo} onChange={(e) => setTransferTo(e.target.value)}>
                  <option value="">בחרו נציג…</option>
                  {AGENTS.filter((a) => a.id !== r.assignee && a.available).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className="secondary" onClick={transfer} disabled={!transferTo}>
                העברה
              </button>
            </div>
          )}
        </section>
      )}

      {/* הרציפות */}
      <section className="panel">
        <h2>הרציפות</h2>
        <ol className="history">
          {r.history.map((h, i) => (
            <li key={i}>
              <span className="history__at">{formatDate(h.at)}</span> {h.text}
              <span className="muted"> · {actorOf(h)}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
