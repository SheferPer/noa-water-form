import { useState } from 'react'
import { TellThem } from '../components/TellThem'
import { Notice, Phone } from '../components/ui'
import { agentName } from '../data/agents'
import { secondPartyOf } from '../data/secondParty'
import { loadSms, type SubmittedRequest } from '../data/store'
import { openReceipt } from './receipt'
import { formatDate } from './steps'

interface Props {
  request: SubmittedRequest
  onNew: () => void
  onTrack: () => void
}

export function Confirmation({ request, onNew, onTrack }: Props) {
  const sms = loadSms().filter((s) => s.text.includes(String(request.number)))
  const [blocked, setBlocked] = useState(false)

  return (
    <section className="panel confirmation">
      <p className="panel__count">הבקשה נשלחה</p>
      <h1>
        מספר פנייה: <span className="ref">{request.number}</span>
      </h1>
      <p className="lead">
        שלחנו את מספר הפנייה וקישור לבקשה לנייד <Phone value={request.draft.me.phone} />.
      </p>

      <h2>מה קורה עכשיו</h2>
      <ol className="timeline">
        <li className="timeline__item timeline__item--done">✓ הבקשה נקלטה</li>
        {(request.draft.route === 'rent-end' || request.draft.route === 'sell') && request.draft.switchDate && (
          <li className="timeline__item timeline__item--done">
            ✓ החשבון יוצא משמך מ-{formatDate(request.draft.switchDate)} – לא צריך לחכות לאף אחד
          </li>
        )}
        {request.pending.map((p) => (
          <li key={p} className="timeline__item">
            ⏳ {p}
          </li>
        ))}
      </ol>
      <p className="muted">לא נדרשת ממך פעולה כרגע. אם נצטרך משהו – נשלח SMS עם קישור ישיר למה שחסר.</p>

      {request.secondParty && (
        <TellThem name={request.secondParty.name} phone={request.secondParty.phone} acquainted={secondPartyOf(request.draft)?.kind === 'incoming'} />
      )}

      {blocked && <Notice tone="warn">הדפדפן חסם את חלון האישור. אפשרו חלונות קופצים לאתר ונסו שוב.</Notice>}

      <details className="sim">
        <summary>סימולציה: הודעות SMS שנשלחו ({sms.length})</summary>
        <ul>
          {sms.map((s, i) => (
            <li key={i}>
              <strong>
                <Phone value={s.to} />
              </strong>
              : {s.text}
            </li>
          ))}
        </ul>
        <p>הבקשה שויכה אוטומטית לנציג/ה: {agentName(request.assignee)}</p>
        {request.flags.length > 0 && <p>סימונים שהנציג יראה: {request.flags.join(' · ')}</p>}
      </details>

      <div className="actions">
        <button type="button" className="primary" onClick={onTrack}>
          מעקב אחרי הבקשה
        </button>
        {/* משהו ביד: אישור עם מספר הפנייה, לשמירה או להעברה לצד השני */}
        <button type="button" className="secondary" onClick={() => setBlocked(!openReceipt(request))}>
          שמירת אישור (PDF)
        </button>
        <button type="button" className="link" onClick={onNew}>
          בקשה חדשה
        </button>
      </div>
    </section>
  )
}
