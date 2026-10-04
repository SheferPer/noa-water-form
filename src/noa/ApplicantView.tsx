import { useState } from 'react'
import { Notice, Phone } from '../components/ui'
import { MOCK_TODAY } from '../data/seed'
import { updateRequest, type SubmittedRequest } from '../data/store'
import { Confirmation } from './Confirmation'
import { PartyView } from './PartyView'
import { applicantActor } from '../data/roles'
import { StatusView } from './StatusView'
import { TrackLogin } from './TrackLogin'
import { Wizard } from './Wizard'

type Screen =
  | { name: 'new' }
  | { name: 'submitted'; request: SubmittedRequest }
  /** "שמירה והמשך אחר כך" – הטופס נשמר ונשלח קישור */
  | { name: 'saved'; phone: string }
  | { name: 'login'; prefill?: number }
  /** saved: true – נשמר; false – ניסיון עריכה אחרי שנציג פתח */
  | { name: 'status'; number: number; saved?: boolean }
  | { name: 'edit'; request: SubmittedRequest }
  /** הצד השני (שוכר הבא / קונה) נכנס מהקישור ב-SMS */
  | { name: 'party'; number: number }

/** initial – נחיתה ישירה מתוך "קפיצה לתרחיש" */
export function ApplicantView({ initial }: { initial?: { screen: 'new' | 'status'; number?: number } }) {
  const [screen, setScreen] = useState<Screen>(() =>
    initial?.screen === 'status' && initial.number ? { name: 'status', number: initial.number } : { name: 'new' },
  )
  const [wizardKey, setWizardKey] = useState(0)

  const tab = screen.name === 'new' || screen.name === 'submitted' || screen.name === 'saved' ? 'new' : 'track'

  return (
    <>
      <nav className="subnav" aria-label="פעולות">
        <button
          type="button"
          className={tab === 'new' ? 'is-active' : ''}
          onClick={() => {
            setWizardKey((k) => k + 1)
            setScreen({ name: 'new' })
          }}
        >
          בקשה חדשה
        </button>
        <button type="button" className={tab === 'track' ? 'is-active' : ''} onClick={() => setScreen({ name: 'login' })}>
          מעקב אחרי בקשה קיימת
        </button>
      </nav>

      {screen.name === 'new' && (
        <Wizard
          key={wizardKey}
          onSubmitted={(request) => setScreen({ name: 'submitted', request })}
          onJoin={(number) => setScreen({ name: 'login', prefill: number })}
          onSaveExit={(phone) => setScreen({ name: 'saved', phone })}
        />
      )}

      {screen.name === 'saved' && (
        <section className="panel">
          <p className="panel__count">הטופס נשמר</p>
          <h1>שמרנו לך את הטופס</h1>
          <p className="lead">
            שלחנו קישור לנייד <Phone value={screen.phone} />. אפשר להמשיך מכל מכשיר – מה שמילאת מחכה שם.
          </p>
          <ul className="timeline">
            <li className="timeline__item timeline__item--done">✓ כל מה שמילאת נשמר, כולל המסמכים שהעלית</li>
            <li className="timeline__item">⏳ הקישור בתוקף 30 יום. יומיים לפני שהוא פג נשלח תזכורת</li>
          </ul>
          <p className="muted">הבקשה עוד לא הוגשה – היא תגיע לתאגיד רק אחרי השליחה בסוף הטופס.</p>
          <div className="actions">
            <button type="button" className="primary" onClick={() => setScreen({ name: 'new' })}>
              חזרה לטופס
            </button>
          </div>
        </section>
      )}

      {screen.name === 'submitted' && (
        <Confirmation
          request={screen.request}
          onTrack={() => setScreen({ name: 'status', number: screen.request.number })}
          onNew={() => {
            setWizardKey((k) => k + 1)
            setScreen({ name: 'new' })
          }}
        />
      )}

      {screen.name === 'login' && (
        <TrackLogin
          prefill={screen.prefill}
          onEnter={(number, role) => setScreen(role === 'party' ? { name: 'party', number } : { name: 'status', number })}
        />
      )}

      {screen.name === 'party' && <PartyView key={screen.number} number={screen.number} />}

      {screen.name === 'status' && (
        <>
          {screen.saved === true && <Notice tone="ok">✓ השינויים נשמרו.</Notice>}
          {screen.saved === false && (
            <Notice tone="warn">הנציג התחיל לבדוק את הבקשה בינתיים, ולכן השינויים לא נשמרו. אפשר לכתוב לו מה לתקן.</Notice>
          )}
          <StatusView key={screen.number} number={screen.number} onEdit={(request) => setScreen({ name: 'edit', request })} />
        </>
      )}

      {screen.name === 'edit' && (
        <Wizard
          editing={{
            draft: { ...screen.request.draft, step: 'summary' },
            onSave: (draft) => {
              let saved = false
              updateRequest(screen.request.number, (req) => {
                // נציג פתח בינתיים – כבר אי אפשר לערוך, רק לשלוח לו הודעה
                if (req.status !== 'new') return
                req.draft = draft
                req.history.push({ at: MOCK_TODAY, text: 'עדכן/ה את הבקשה לפני שנפתחה לטיפול', actor: applicantActor(draft) })
                saved = true
              })
              setScreen({ name: 'status', number: screen.request.number, saved })
            },
          }}
        />
      )}
    </>
  )
}
