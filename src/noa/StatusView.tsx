import { useState } from 'react'
import { DocUpload } from '../components/DocUpload'
import { TellThem } from '../components/TellThem'
import { Field, Notice, TextInput } from '../components/ui'
import { openReceipt } from './receipt'
import { applicantActor } from '../data/roles'
import { SILENT_APPROVAL_DAYS, firstName, readingOf, secondPartyOf, silentlyApproved } from '../data/secondParty'
import { digitalReading, fullAddress, getProperty } from '../data/properties'
import { MOCK_TODAY } from '../data/seed'
import { addSms, loadRequests, updateRequest, type HistoryEntry, type SubmittedRequest } from '../data/store'
import { formatDate, requestFindings } from '../data/verify'
import { REQUEST_TYPES } from '../requestTypes'
import type { Draft } from './draft'
import { docKind, partyRole, validPhone } from './steps'

interface Props {
  number: number
  onEdit: (r: SubmittedRequest) => void
}

/** היסטוריה בשפה של הפונה – פעולות פנימיות של הנציג לא מוצגות */
function publicHistory(h: HistoryEntry): string | null {
  if (h.public) return h.text
  if (h.text === 'הבקשה הוגשה') return 'הבקשה הוגשה'
  if (h.text === 'נפתחה לטיפול') return 'נציג התחיל לבדוק את הבקשה'
  if (h.text.startsWith('נשלחה בקשת השלמה')) return `התבקשת להשלים: ${h.text.split(': ')[1] ?? ''}`
  if (h.text.startsWith('השלים/ה')) return 'שלחת את ההשלמה'
  if (h.text.startsWith('הודעה:')) return 'שלחת הודעה לנציג'
  if (h.text.startsWith('עדכן/ה את הבקשה')) return 'עדכנת את הבקשה'
  if (h.text.startsWith('אושרה')) return 'הבקשה אושרה'
  return null
}

type Group = 'meter' | 'id' | 'contract' | 'poa' | 'note'

function groupOf(key: string): Group {
  if (key === 'meter-photo' || key === 'meter-number') return 'meter'
  if (key.startsWith('id-')) return 'id'
  if (key.startsWith('contract')) return 'contract'
  if (key === 'poa') return 'poa'
  return 'note'
}

/** מה שקורה מול הצד השני: אישור פרטים מתוקנים, או תיקון מספר נייד שגוי */
function SecondPartyPanel({ request, onDone }: { request: SubmittedRequest; onDone: () => void }) {
  const s = request.secondParty!
  const d = request.draft
  const [name, setName] = useState(s.name)
  const [phone, setPhone] = useState(s.phone)
  const them = firstName(s.name)

  if (s.status === 'proposed' && s.proposal) {
    const p = s.proposal
    function decide(approve: boolean) {
      updateRequest(request.number, (r) => {
        const sp = r.secondParty!
        r.pending = r.pending.filter((x) => !x.includes('צריך את האישור שלך'))
        r.status = 'new'
        if (approve) {
          r.draft.switchDate = p.switchDate
          if (r.draft.reading.source === 'manual') r.draft.reading.manualValue = p.reading
          sp.status = 'done'
          r.history.push({ at: MOCK_TODAY, text: `אישר/ה את הפרטים שתואמו עם ${them}`, actor: applicantActor(d), public: true })
        } else {
          sp.status = 'dispute'
          if (!r.flags.includes('מחלוקת')) r.flags.push('מחלוקת')
          r.history.push({ at: MOCK_TODAY, text: `לא הסכים/ה לפרטים של ${them} – נציג/ה יבדוק את שתי הגרסאות`, actor: applicantActor(d), public: true })
        }
      })
      addSms([
        {
          at: MOCK_TODAY,
          to: s.phone,
          text: approve ? `${firstName(d.me.firstName)} אישר/ה את הפרטים שסיכמתם. הבקשה עברה לנציג.` : `${firstName(d.me.firstName)} לא אישר/ה – נציג יבדוק את שתי הגרסאות.`,
        },
      ])
      onDone()
    }
    return (
      <section className="panel">
        <h2>{them} שלח/ה פרטים מתוקנים שתיאמתם</h2>
        <dl className="summary">
          <div className="summary__row">
            <dt>תאריך</dt>
            <dd>
              {formatDate(p.switchDate)}
              {p.switchDate !== d.switchDate && <span className="muted"> (הזנת {formatDate(d.switchDate)})</span>}
            </dd>
          </div>
          <div className="summary__row">
            <dt>קריאת מונה</dt>
            <dd>
              {Number(p.reading).toLocaleString('he-IL')} מ״ק
              {p.reading !== readingOf(d) && <span className="muted"> (הזנת {readingOf(d)})</span>}
            </dd>
          </div>
        </dl>
        <div className="actions">
          <button type="button" className="primary" onClick={() => decide(true)}>
            מאשר/ת – זה מה שסיכמנו
          </button>
          <button type="button" className="link" onClick={() => decide(false)}>
            לא מסכים/ה – שנציג יבדוק
          </button>
        </div>
      </section>
    )
  }

  if (s.status === 'failed' || s.status === 'not-me') {
    function resend() {
      if (!name.trim() || !validPhone(phone)) return
      updateRequest(request.number, (r) => {
        const sp = r.secondParty!
        sp.name = name.trim()
        sp.phone = phone
        sp.status = 'invited'
        sp.invitedAt = MOCK_TODAY
        if (r.draft.route === 'rent-end') r.draft.nextTenant = { ...r.draft.nextTenant, name: name.trim(), phone }
        else r.draft.party = { ...r.draft.party, name: name.trim(), phone }
        r.pending = [`מחכים ש${name.trim()} יאשר את הקריאה וימלא את החלק שלו`, ...r.pending.filter((x) => !x.includes('בדקו את') && !x.startsWith('מחכים ש'))]
        r.history.push({ at: MOCK_TODAY, text: `עדכן/ה את הנייד של ${name.trim()} ונשלח שוב`, actor: applicantActor(d), public: true })
      })
      addSms([{ at: MOCK_TODAY, to: phone, text: `${firstName(d.me.firstName)} ביקש/ה את האישור שלך להעברת חשבון מים. https://mayim.example/r/${request.number} · זה לא אני` }])
      onDone()
    }
    return (
      <section className="panel">
        <h2>{s.status === 'not-me' ? `המספר שהזנת שייך למישהו אחר` : `ההודעה ל${them} לא נמסרה`}</h2>
        <p className="muted">בדקו את הנייד ונשלח שוב. עד אז הבקשה ממתינה – אבל היציאה שלך כבר בתוקף.</p>
        <div className="panel__body">
          <div className="grid-2">
            <Field label="שם">
              <TextInput value={name} onChange={setName} />
            </Field>
            <Field label="נייד" error={phone && !validPhone(phone) ? 'נייד לא תקין – עשר ספרות שמתחילות ב-05' : ''}>
              <TextInput type="tel" format="phone" value={phone} onChange={setPhone} invalid={Boolean(phone) && !validPhone(phone)} dir="ltr" />
            </Field>
          </div>
          <button type="button" className="primary" onClick={resend}>
            שליחה מחדש
          </button>
        </div>
      </section>
    )
  }
  return null
}

/** מה נדרש מהפונה עכשיו – רק מה שהנציג ביקש */
function CompletionForm({ request, onDone }: { request: SubmittedRequest; onDone: () => void }) {
  const [d, setD] = useState<Draft>(request.draft)
  const [note, setNote] = useState('')
  const [showMissing, setShowMissing] = useState(false)
  const original = request.draft
  const groups = [...new Set((request.completion?.items ?? []).map(groupOf))]
  const set = (recipe: (x: Draft) => void) =>
    setD((prev) => {
      const next = structuredClone(prev)
      recipe(next)
      return next
    })

  const missing: string[] = []
  if (groups.includes('meter') && (!d.reading.photoDocId || d.reading.photoDocId === original.reading.photoDocId)) missing.push('צילום מונה')
  if (groups.includes('id') && d.me.idDocId === original.me.idDocId) missing.push('צילום ת.ז. חדש')
  if (groups.includes('contract') && d.contractDocId === original.contractDocId) missing.push('המסמך המתוקן')
  if (groups.includes('poa') && !d.proxy.poaDocId) missing.push('ייפוי כוח חתום')
  if (groups.includes('note') && !note.trim()) missing.push('הסבר לנציג')

  // מה שה-OCR עדיין מוצא לא תקין במה שהועלה עכשיו
  const stillWrong = requestFindings(d).filter(
    (f) => f.state !== 'ok' && groups.includes(groupOf(f.key)) && groupOf(f.key) !== 'note',
  )

  function send() {
    if (missing.length > 0) {
      setShowMissing(true)
      return
    }
    const what = groups.map((g) => ({ meter: 'צילום מונה', id: 'ת.ז.', contract: 'מסמך', poa: 'ייפוי כוח', note: 'הסבר' })[g]).join(', ')
    updateRequest(request.number, (req) => {
      req.draft = d
      req.status = 'in-review'
      req.completionArrived = true
      req.pending = ['נציג בודק את ההשלמה']
      req.history.push({ at: MOCK_TODAY, text: `השלים/ה: ${what}`, actor: applicantActor(d) })
      if (note.trim()) req.history.push({ at: MOCK_TODAY, text: `הודעה: ${note.trim()}`, actor: applicantActor(d) })
    })
    onDone()
  }

  const r = original.reading
  return (
    <section className="panel">
      <h2>מה צריך להשלים</h2>
      {request.completion && <pre className="message message--box">{request.completion.message}</pre>}

      <div className="panel__body">
        {groups.includes('meter') && (
          <>
            {r.source === 'manual' && (
              <Notice tone="ok">
                ✓ הקריאה שהזנת ({r.manualValue} מ״ק, {formatDate(original.switchDate)}) נשמרה. חסר רק צילום של המונה.
              </Notice>
            )}
            <DocUpload kind="meter" label="צילום המונה" value={d.reading.photoDocId} onChange={(id) => set((x) => (x.reading.photoDocId = id))} />
          </>
        )}
        {groups.includes('id') && (
          <DocUpload kind="id" label="צילום ת.ז. + ספח פתוח" value={d.me.idDocId === original.me.idDocId ? null : d.me.idDocId} onChange={(id) => set((x) => (x.me.idDocId = id ?? original.me.idDocId))} />
        )}
        {groups.includes('contract') && (
          <DocUpload kind={docKind(d)} label="המסמך המתוקן" value={d.contractDocId === original.contractDocId ? null : d.contractDocId} onChange={(id) => set((x) => (x.contractDocId = id ?? original.contractDocId))} />
        )}
        {groups.includes('poa') && (
          <DocUpload kind="poa" label="ייפוי כוח חתום" value={d.proxy.poaDocId} onChange={(id) => set((x) => (x.proxy.poaDocId = id))} />
        )}

        {stillWrong.length > 0 && missing.length === 0 && (
          <Notice tone="warn">
            במסמך שהעלית עדיין יש אי-התאמה: {stillWrong.map((f) => f.label).join(', ')}. אפשר לשלוח בכל זאת – הנציג יבדוק.
          </Notice>
        )}

        <Field label={groups.includes('note') ? 'הסבר לנציג' : 'הערה לנציג (רשות)'}>
          <textarea className="input input--wide" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>

        {showMissing && missing.length > 0 && (
          <Notice tone="error">
            <strong>כדי לשלוח חסר:</strong>
            <ul>
              {missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </Notice>
        )}
        <div className="actions">
          <button type="button" className="primary" onClick={send}>
            שליחה לנציג
          </button>
          <span className="muted">כל שאר הפרטים נשמרו – לא צריך למלא שוב.</span>
        </div>
      </div>
    </section>
  )
}

function MessageForm({ number, onDone }: { number: number; onDone: () => void }) {
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  if (!open)
    return (
      <button type="button" className="link" onClick={() => setOpen(true)}>
        טעיתי במשהו / רוצה לכתוב לנציג
      </button>
    )
  return (
    <div className="compose">
      <p className="muted">הנציג כבר בודק את הבקשה, לכן אי אפשר לערוך אותה – אבל אפשר לכתוב לו מה לתקן.</p>
      <textarea className="input input--wide" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="למשל: טעיתי בתאריך הכניסה, הנכון הוא 5.9" />
      <button
        type="button"
        className="secondary"
        disabled={!text.trim()}
        onClick={() => {
          updateRequest(number, (req) => {
            req.applicantMessage = text.trim()
            req.history.push({ at: MOCK_TODAY, text: `הודעה מהפונה: ${text.trim()}` })
          })
          onDone()
        }}
      >
        שליחה לנציג
      </button>
    </div>
  )
}

export function StatusView({ number, onEdit }: Props) {
  const [version, setVersion] = useState(0)
  const request = loadRequests().find((r) => r.number === number)
  if (!request) return <Notice tone="error">הבקשה לא נמצאה.</Notice>
  const refresh = () => setVersion(version + 1)

  const d = request.draft
  const property = getProperty(d.identification.propertyId)
  const route = REQUEST_TYPES.find((t) => t.id === d.route)?.label
  const reading =
    d.reading.source === 'digital' && property ? digitalReading(property, d.switchDate) : Number(d.reading.manualValue) || null

  // מי צריך לפעול עכשיו
  let who: { tone: 'error' | 'info' | 'ok'; title: string; text: string }
  switch (request.status) {
    case 'waiting-applicant':
      who = { tone: 'error', title: 'נדרשת פעולה ממך', text: 'הנציג ביקש להשלים משהו. עד שתשלימו, הטיפול עצור.' }
      break
    case 'waiting-party': {
      const sp = request.secondParty
      if (sp && (sp.status === 'proposed' || sp.status === 'failed' || sp.status === 'not-me')) {
        who = {
          tone: 'error',
          title: 'נדרשת פעולה ממך',
          text: sp.status === 'proposed' ? `${firstName(sp.name)} שלח/ה פרטים מתוקנים – צריך את האישור שלך.` : 'צריך לבדוק את מספר הנייד של הצד השני.',
        }
      } else {
        who = {
          tone: 'info',
          title: d.route === 'sell' ? `מחכים ל${sp ? firstName(sp.name) : 'קונה'}` : d.nextTenant.known ? `מחכים ל${d.nextTenant.name}` : `מחכים ל${partyRole(d)}`,
          text: 'ברגע שיאשרו – נעדכן אותך ב-SMS. לא נדרשת ממך פעולה.',
        }
      }
      break
    }
    case 'done':
      who = {
        tone: 'ok',
        title: '✓ החשבון עבר',
        text: `מתאריך ${formatDate(d.switchDate)}${reading ? `, מקריאה ${reading.toLocaleString('he-IL')} מ״ק` : ''}.`,
      }
      break
    case 'new':
      who = { tone: 'info', title: 'הבקשה נקלטה', text: 'נציג יבדוק אותה בקרוב. אפשר לערוך אותה עד שנציג או הצד השני פותחים אותה.' }
      break
    default:
      who = {
        tone: 'info',
        title: request.completionArrived ? 'נציג בודק את ההשלמה' : 'נציג בודק את הבקשה',
        text: 'עד 7 ימי עסקים מרגע שהבקשה שלמה. לא נדרשת ממך פעולה.',
      }
  }

  const history = request.history.map((h) => ({ at: h.at, text: publicHistory(h) })).filter((h) => h.text)
  const needsApplicant = who.tone === 'error'
  // עורכים רק כל עוד אף אחד לא נגע בבקשה: לא נציג, ולא הצד השני
  const canEdit =
    request.status === 'new' &&
    !silentlyApproved(request) &&
    (!request.secondParty || (request.secondParty.status === 'invited' && !request.secondParty.viewedAt))

  return (
    <div className="status">
      <section className="panel">
        <p className="panel__count">פנייה {request.number}</p>
        <h1>
          {route} · {property ? fullAddress(property) : ''}
        </h1>
        <div className={`status__who notice notice--${who.tone}`}>
          <strong>{who.title}</strong>
          <span>{who.text}</span>
        </div>

        <ol className="timeline">
          {history.map((h, i) => (
            <li key={i} className="timeline__item timeline__item--done">
              ✓ {formatDate(h.at)} · {h.text}
            </li>
          ))}
          {/* כשנדרשת פעולה – לא מציגים גם את רשימת ההמתנות; היא רק מסיחה */}
          {!needsApplicant &&
            request.status !== 'done' &&
            request.pending.map((p) => (
              <li key={p} className="timeline__item">
                ⏳ {p}
              </li>
            ))}
        </ol>

        <div className="actions">
          {canEdit && (
            <button type="button" className="secondary" onClick={() => onEdit(request)}>
              עריכת הבקשה
            </button>
          )}
          {/* אישור מעודכן למצב הנוכחי – גם אחרי שהבקשה הושלמה */}
          <button type="button" className="link" onClick={() => openReceipt(request)}>
            שמירת אישור (PDF)
          </button>
        </div>
        {request.status === 'in-review' && (
          <div className="actions">
            <MessageForm number={request.number} onDone={refresh} />
          </div>
        )}
      </section>

      {request.secondParty?.status === 'invited' &&
        !needsApplicant &&
        (silentlyApproved(request) ? (
          <Notice tone="ok">
            ✓ {request.secondParty.name} לא הגיב/ה תוך {SILENT_APPROVAL_DAYS} ימי עסקים, והקריאה נרשמה כמאושרת. הבקשה ממשיכה כרגיל.
          </Notice>
        ) : (
          <TellThem name={request.secondParty.name} phone={request.secondParty.phone} acquainted={secondPartyOf(d)?.kind === 'incoming'} />
        ))}
      {request.status === 'waiting-applicant' && <CompletionForm key={version} request={request} onDone={refresh} />}
      {request.secondParty && <SecondPartyPanel key={`sp-${version}`} request={request} onDone={refresh} />}
    </div>
  )
}
