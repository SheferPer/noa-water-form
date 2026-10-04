import { useState } from 'react'
import { IdentityBlock } from '../components/IdentityBlock'
import { Field, Notice, TextInput } from '../components/ui'
import { digitalReading, fullAddress, getProperty, maskedAddress } from '../data/properties'
import { MOCK_TODAY } from '../data/seed'
import { SILENT_APPROVAL_DAYS, firstName, isDigital, readingOf, secondPartyOf, silentlyApproved } from '../data/secondParty'
import { addSms, loadRequests, updateRequest, type SubmittedRequest } from '../data/store'
import { formatDate } from '../data/verify'
import { validEmail, validId } from './steps'

type Stage = 'intro' | 'identify' | 'review' | 'change' | 'details' | 'sent'
type Path = 'confirm' | 'coordinate' | 'agent'

/** הודעה לצד הראשון – כך הוא יודע שהמספר שהזין נכון ושהצד השני פעל */
function notifyFirst(r: SubmittedRequest, text: string) {
  addSms([{ at: MOCK_TODAY, to: r.draft.me.phone, text: `פנייה ${r.number}: ${text} https://mayim.example/r/${r.number}` }])
}

export function PartyView({ number }: { number: number }) {
  const [version, setVersion] = useState(0)
  const request = loadRequests().find((r) => r.number === number)
  const [stage, setStage] = useState<Stage>('intro')
  const [idNumber, setIdNumber] = useState('')
  const [idError, setIdError] = useState('')
  const [path, setPath] = useState<Path>('confirm')
  const [date, setDate] = useState(request?.draft.switchDate ?? '')
  const [reading, setReading] = useState(request ? readingOf(request.draft) : '')
  const invited = (request?.secondParty?.name ?? '').split(/\s+/)
  const [given, setGiven] = useState(invited[0] ?? '')
  const [family, setFamily] = useState(invited.slice(1).join(' '))
  const name = `${given} ${family}`.trim()
  const [email, setEmail] = useState('')
  const [idDocId, setIdDocId] = useState<string | null>(null)
  // הת.ז. שנקראה מהתעודה (או תוקנה ידנית) – לצד זו שהוזנה בזיהוי
  const [typedId, setTypedId] = useState('')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [showMissing, setShowMissing] = useState(false)

  if (!request || !request.secondParty) return <Notice tone="error">הבקשה לא נמצאה.</Notice>
  const d = request.draft
  const s = request.secondParty
  const who = secondPartyOf(d)!
  const property = getProperty(d.identification.propertyId)!
  const first = firstName(d.me.firstName)
  const digital = isDigital(d)
  const effectiveReading = digital ? String(digitalReading(property, date) ?? '') : reading
  const changed = date !== d.switchDate || effectiveReading !== readingOf(d)

  // הבקשה כבר טופלה מהצד הזה
  if (stage !== 'sent' && s.status !== 'invited') {
    const text: Record<string, string> = {
      done: '✓ השלמת את החלק שלך. הבקשה אצל נציג/ה.',
      proposed: `שלחת ל${first} את הפרטים המתוקנים. ברגע שיאשר/תאשר – הבקשה תמשיך.`,
      dispute: 'נציג/ה בודק/ת את הפרטים של שני הצדדים. נעדכן אותך ב-SMS.',
      'not-me': 'סימנת שהבקשה לא שייכת לך. תודה – עדכנו את מי שהגיש אותה.',
      failed: 'הבקשה ממתינה לעדכון מצד מי שהגיש אותה.',
    }
    return (
      <section className="panel status">
        <p className="panel__count">פנייה {request.number}</p>
        <Notice tone={s.status === 'done' ? 'ok' : 'info'}>{text[s.status]}</Notice>
      </section>
    )
  }

  function notMe() {
    updateRequest(number, (r) => {
      r.secondParty!.status = 'not-me'
      r.pending = r.pending.filter((p) => !p.startsWith('מחכים ש'))
      r.pending.unshift(`${who.name} סימן/ה שהבקשה לא שייכת לו/ה. בדקו את מספר הנייד`)
      r.history.push({ at: MOCK_TODAY, text: 'המספר שהוזן שייך למישהו אחר ("זה לא אני")', actor: `${who.role} (${who.name})`, public: true })
    })
    notifyFirst(request!, `המספר שהזנת ל${who.name} שייך למישהו אחר. בדקו אותו:`)
    setVersion(version + 1)
  }

  function identify() {
    if (!validId(idNumber)) return setIdError('מספר ת.ז. צריך להכיל 9 ספרות')
    // במכירה המוכר הזין את הת.ז. של הקונה – חייבת להתאים
    if (who.idNumber && who.idNumber !== idNumber.trim()) {
      return setIdError('הת.ז. לא תואמת למה שרשום אצלנו. אם הבקשה לא שייכת לך – לחצו "זה לא אני".')
    }
    setIdError('')
    updateRequest(number, (r) => {
      if (r.secondParty && !r.secondParty.viewedAt) r.secondParty.viewedAt = MOCK_TODAY
    })
    setStage('review')
  }

  const outgoing = who.kind === 'outgoing'
  const missing: string[] = []
  if (outgoing) {
    if (!street.trim() || !city.trim()) missing.push('כתובת למשלוח החשבון הסופי')
  } else {
    if (!given.trim() || !family.trim()) missing.push('שם פרטי ושם משפחה')
    if (!validEmail(email)) missing.push('דוא״ל תקין')
    if (!idDocId) missing.push('צילום ת.ז. + ספח')
  }

  function send() {
    if (missing.length > 0) return setShowMissing(true)
    const proposal = { switchDate: date, reading: effectiveReading }
    updateRequest(number, (r) => {
      const sp = r.secondParty!
      Object.assign(sp, { name: name.trim(), idNumber: (typedId || idNumber).trim(), email: email.trim(), idDocId })
      if (outgoing) sp.mailing = { street: street.trim(), city: city.trim() }
      r.pending = r.pending.filter((p) => !p.startsWith('מחכים ש'))
      if (path === 'confirm') {
        sp.status = 'done'
        r.status = 'new'
        r.history.push({ at: MOCK_TODAY, text: 'אישר/ה את הפרטים והשלים/ה את החלק שלו/ה', actor: `${who.role} (${name.trim()})`, public: true })
      } else if (path === 'coordinate') {
        sp.status = 'proposed'
        sp.proposal = proposal
        r.pending.unshift(`${firstName(name)} שלח/ה פרטים מתוקנים שתיאמתם – צריך את האישור שלך`)
        r.history.push({ at: MOCK_TODAY, text: 'שלח/ה פרטים מתוקנים לאישור', actor: `${who.role} (${name.trim()})`, public: true })
      } else {
        sp.status = 'dispute'
        sp.proposal = proposal
        r.status = 'new'
        if (!r.flags.includes('מחלוקת')) r.flags.push('מחלוקת')
        r.history.push({ at: MOCK_TODAY, text: 'ביקש/ה שנציג/ה יבדוק – יש מחלוקת על הפרטים', actor: `${who.role} (${name.trim()})`, public: true })
      }
    })
    notifyFirst(
      request!,
      path === 'confirm'
        ? `${firstName(name)} אישר/ה והשלים/ה את החלק שלו/ה. הבקשה עברה לנציג.`
        : path === 'coordinate'
          ? `${firstName(name)} שלח/ה פרטים מתוקנים שתיאמתם. צריך את האישור שלך:`
          : `${firstName(name)} לא מסכים/ה עם הפרטים – נציג יבדוק את שתי הגרסאות.`,
    )
    setStage('sent')
  }

  return (
    <section className="panel status">
      <p className="panel__count">פנייה {request.number}</p>

      {stage === 'intro' && (
        <>
          <h1>שלום {firstName(s.name)}</h1>
          {silentlyApproved(request) && (
            <Notice tone="warn">
              עברו {SILENT_APPROVAL_DAYS} ימי עסקים מאז ששלחנו, והקריאה נרשמה כמאושרת. עדיין אפשר לאשר אותה, או לערער – נבדוק.
            </Notice>
          )}
          <p className="lead">
            {who.kind === 'outgoing'
              ? `${first} דיווח/ה שנכנס/ה לנכס ב${maskedAddress(property)} מ-${formatDate(d.switchDate)}. לפי הדיווח, חשבון המים יוצא משמך מאותו תאריך.`
              : d.route === 'sell'
                ? `${first} דיווח/ה שמכר/ה לך את הדירה ב${maskedAddress(property)}.`
                : `${first} דיווח/ה שעזב/ה את הדירה ב${maskedAddress(property)}, ושאת/ה נכנס/ת לגור בה.`}{' '}
            {who.kind === 'outgoing' ? 'נשמח שתאשרו את הקריאה – זה לוקח כ-2 דקות.' : 'כדי שחשבון המים יעבור על שמך, צריך את האישור שלך. זה לוקח כ-2 דקות.'}
          </p>
          <div className="actions">
            <button type="button" className="primary" onClick={() => setStage('identify')}>
              כן, זה אני – נמשיך
            </button>
            <button type="button" className="link" onClick={notMe}>
              זה לא אני / אני לא מכיר/ה את הבקשה
            </button>
          </div>
        </>
      )}

      {stage === 'identify' && (
        <>
          <h1>קודם, נוודא שזה את/ה</h1>
          <p className="lead">רק אחרי הזיהוי נציג את פרטי ההחלפה.</p>
          <div className="panel__body">
            <Field label="מספר ת.ז.">
              <TextInput value={idNumber} onChange={setIdNumber} format="id" inputMode="numeric" dir="ltr" invalid={Boolean(idError)} />
            </Field>
            {idError && <Notice tone="error">{idError}</Notice>}
          </div>
          <div className="actions">
            <button type="button" className="primary" onClick={identify}>
              המשך
            </button>
          </div>
        </>
      )}

      {stage === 'review' && (
        <>
          <h1>{first} כבר מילא/ה את הבקשה – נשאר רק לאשר</h1>
          <p className="lead">
            {first} הזין/ה את הפרטים האלה{outgoing ? ', ולפיהם ייסגר החשבון שלך' : ''}. אם הם נכונים, לחיצה אחת מסיימת את החלק שלך.
          </p>
          <dl className="summary">
            <div className="summary__row">
              <dt>הנכס</dt>
              <dd>{fullAddress(property)}</dd>
            </div>
            <div className="summary__row">
              <dt>{d.route === 'sell' ? 'תאריך המסירה' : 'תאריך ההחלפה'}</dt>
              <dd>{formatDate(d.switchDate)}</dd>
            </div>
            <div className="summary__row">
              <dt>קריאת המונה</dt>
              <dd>
                {Number(readingOf(d)).toLocaleString('he-IL')} מ״ק{digital && ' – מהמונה הדיגיטלי'}
              </dd>
            </div>
          </dl>
          <div className="actions">
            <button
              type="button"
              className="primary"
              onClick={() => {
                setPath('confirm')
                setStage('details')
              }}
            >
              כן, הפרטים נכונים
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                // ברירת המחדל היא תיאום – הדרך המומלצת
                setPath('coordinate')
                setStage('change')
              }}
            >
              משהו לא נכון
            </button>
          </div>
        </>
      )}

      {stage === 'change' && (
        <>
          <h1>מה לא נכון?</h1>
          <p className="lead">תקנו את מה שצריך.</p>
          <div className="panel__body">
            <Field label={d.route === 'sell' ? 'תאריך המסירה' : 'תאריך ההחלפה'}>
              <TextInput type="date" value={date} onChange={setDate} />
            </Field>
            {digital ? (
              <Notice tone="info">
                המונה בנכס דיגיטלי, והקריאה מגיעה ישירות ממנו: ל-{formatDate(date)} – {Number(effectiveReading).toLocaleString('he-IL')} מ״ק. אם
                התאריך לא נכון, שנו אותו והקריאה תתעדכן לפיו.
              </Notice>
            ) : (
              <Field label="קריאת המונה (מ״ק)">
                <TextInput value={reading} onChange={setReading} format="digits" inputMode="numeric" dir="ltr" />
              </Field>
            )}

            {changed && (
              <>
                <p className="field__label">הפרטים שלך שונים ממה ש{first} הזין/ה. איך נמשיך?</p>
                <button
                  type="button"
                  className={`path-card ${path === 'coordinate' ? 'is-selected' : ''}`}
                  onClick={() => setPath('coordinate')}
                  aria-pressed={path === 'coordinate'}
                >
                  <span className="path-card__badge">מומלץ – הכי מהיר</span>
                  <strong>נתאם בינינו</strong>
                  <span>
                    שיחה קצרה עם {first}, ואז תזינו את הפרטים שסיכמתם. ל{first} נשאר רק לאשר – והבקשה ממשיכה עוד היום.
                  </span>
                </button>
                <button
                  type="button"
                  className={`path-alt ${path === 'agent' ? 'is-selected' : ''}`}
                  onClick={() => setPath('agent')}
                  aria-pressed={path === 'agent'}
                >
                  {path === 'agent' ? '✓ ' : ''}לא הצלחנו להסכים – אבקש שנציג/ה יבדוק (עד 7 ימי עסקים)
                </button>
              </>
            )}
          </div>
          <div className="actions">
            <button
              type="button"
              className="primary"
              onClick={() => {
                if (!changed) return setStage('review')
                setStage('details')
              }}
            >
              המשך
            </button>
            <button type="button" className="link" onClick={() => setStage('review')}>
              חזרה
            </button>
          </div>
        </>
      )}

      {stage === 'details' && (
        <>
          <h1>{outgoing ? 'לאן לשלוח את החשבון הסופי?' : 'הפרטים שלך'}</h1>
          <p className="lead">{outgoing ? 'החשבון האחרון עד תאריך ההחלפה יישלח לכתובת הזו.' : 'כדי שהחשבון יעבור על שמך.'}</p>
          <div className="panel__body">
            {outgoing ? (
              <div className="grid-2">
                <Field label="רחוב ומספר" error={showMissing && !street.trim() ? 'חסר רחוב ומספר' : ''}>
                  <TextInput value={street} onChange={setStreet} invalid={showMissing && !street.trim()} />
                </Field>
                <Field label="יישוב" error={showMissing && !city.trim() ? 'חסר יישוב' : ''}>
                  <TextInput value={city} onChange={setCity} invalid={showMissing && !city.trim()} />
                </Field>
                <Field label="דוא״ל (רשות)">
                  <TextInput type="email" value={email} onChange={setEmail} dir="ltr" placeholder="name@example.com" />
                </Field>
              </div>
            ) : (
              <>
                {/* הצילום ראשון; הזיהוי כבר נעשה עם מספר ת.ז., וכאן רק נרשמים */}
                <IdentityBlock
                  label="צילום ת.ז. + ספח פתוח"
                  expectedIdNumber={idNumber}
                  value={{ firstName: given, lastName: family, idNumber: typedId, idDocId }}
                  onChange={(next) => {
                    if (next.firstName !== undefined) setGiven(next.firstName)
                    if (next.lastName !== undefined) setFamily(next.lastName)
                    if (next.idNumber !== undefined) setTypedId(next.idNumber)
                    if (next.idDocId !== undefined) setIdDocId(next.idDocId)
                  }}
                />
                <Field label="דוא״ל" error={showMissing && !validEmail(email) ? 'כתובת דוא״ל לא תקינה' : ''}>
                  <TextInput type="email" value={email} onChange={setEmail} invalid={showMissing && !validEmail(email)} dir="ltr" placeholder="name@example.com" />
                </Field>
              </>
            )}
            {path !== 'confirm' && (
              <Notice tone="info">
                {path === 'coordinate'
                  ? `אחרי השליחה ${first} יקבל/תקבל את הפרטים המתוקנים לאישור.`
                  : 'אחרי השליחה נציג/ה יבדוק/תבדוק את הגרסה שלך ואת הגרסה של ' + first + '.'}
              </Notice>
            )}
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
          </div>
          <div className="actions">
            <button type="button" className="primary" onClick={send}>
              שליחה
            </button>
          </div>
        </>
      )}

      {stage === 'sent' && (
        <>
          <h1>{path === 'confirm' ? '✓ תודה, זהו' : 'נשלח'}</h1>
          <Notice tone={path === 'confirm' ? 'ok' : 'info'}>
            {path === 'confirm' &&
              (outgoing
                ? `תודה. החשבון ייסגר על שמך בתאריך שאושר, והחשבון הסופי יישלח לכתובת שהזנת.`
                : `עדכנו את ${first}, והבקשה עברה לנציג. נעדכן אותך ב-SMS כשהחשבון יעבור על שמך.`)}
            {path === 'coordinate' && `שלחנו ל${first} את הפרטים שסיכמתם. ברגע שיאשר/תאשר – הבקשה עוברת לנציג.`}
            {path === 'agent' && 'נציג/ה יבדוק/תבדוק את שתי הגרסאות ויחליט/ה. נעדכן את שניכם ב-SMS.'}
          </Notice>
        </>
      )}
    </section>
  )
}
