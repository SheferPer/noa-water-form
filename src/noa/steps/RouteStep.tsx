import { Choice, Field, Notice } from '../../components/ui'
import { loadRequests } from '../../data/store'
import { formatDate } from '../../data/verify'
import { DIRECTIONS, REQUEST_TYPES } from '../../requestTypes'
import type { Draft, DraftUpdate } from '../draft'

export function RouteStep({ d, update, onJoin }: { d: Draft; update: DraftUpdate; onJoin?: (number: number) => void }) {
  const selected = REQUEST_TYPES.find((t) => t.id === d.route)

  // בקשה פתוחה על אותו נכס מהכיוון המשלים – סימן שזו אותה החלפה
  const complement: Record<string, string[]> = {
    'rent-start': ['rent-end'],
    'rent-end': ['rent-start'],
    buy: ['sell'],
    sell: ['buy'],
  }
  const twin = d.route
    ? loadRequests().find(
        (r) =>
          r.status !== 'done' &&
          r.draft.identification.propertyId === d.identification.propertyId &&
          r.draft.route !== null &&
          complement[d.route!]?.includes(r.draft.route),
      )
    : undefined

  return (
    <>
      <div className="directions" role="radiogroup" aria-label="סוג הבקשה">
        {DIRECTIONS.map((dir) => (
          <fieldset key={dir.id} className={`direction direction--${dir.id}`}>
            <legend>
              <span className="direction__title">{dir.title}</span>
              <span className="direction__subtitle">{dir.subtitle}</span>
            </legend>
            <div className="options">
              {REQUEST_TYPES.filter((t) => t.direction === dir.id).map((t) => (
                <label key={t.id} className={`option ${d.route === t.id ? 'option--selected' : ''}`}>
                  <input
                    type="radio"
                    name="request-type"
                    checked={d.route === t.id}
                    onChange={() =>
                      update((draft) => {
                        draft.route = t.id
                        draft.occupancy = null
                      })
                    }
                  />
                  <span className="option__icon" aria-hidden="true">
                    {t.icon}
                  </span>
                  <span className="option__label">{t.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      {selected && (
        <p className="meaning">
          <strong>{selected.label}:</strong> {selected.meaning}
        </p>
      )}

      {d.route === 'buy' && (
        <Field label="מי יגור בדירה?">
          <Choice
            name="occupancy"
            value={d.occupancy}
            options={[
              { value: 'self', label: 'אני' },
              { value: 'tenant', label: 'יש בה שוכר' },
            ]}
            onChange={(v) => update((draft) => (draft.occupancy = v))}
          />
        </Field>
      )}
      {d.route === 'sell' && (
        <Field label="גר בדירה שוכר?">
          <Choice
            name="occupancy"
            value={d.occupancy}
            options={[
              { value: 'tenant', label: 'כן' },
              { value: 'self', label: 'לא' },
            ]}
            onChange={(v) => update((draft) => (draft.occupancy = v))}
          />
        </Field>
      )}
      {(d.route === 'buy' || d.route === 'sell') && d.occupancy === 'tenant' && (
        <p className="meaning">השוכר ממשיך לשלם על המים. נעדכן רק מי בעל הנכס – בלי קריאת מונה.</p>
      )}

      {/* הצד השני כבר מילא – עדיף להיכנס לבקשה שלו במקום לפתוח מקבילה */}
      {twin && (
        <Notice tone="warn">
          <strong>
            {twin.draft.me.firstName} כבר פתח/ה בקשה על הנכס הזה (פנייה {twin.number}, מ-{formatDate(twin.submittedAt)}).
          </strong>
          <div>זו כנראה אותה החלפה. אין צורך למלא טופס חדש – נכנסים לבקשה הקיימת ומאשרים את הפרטים.</div>
          <div className="notice__actions">
            {onJoin && (
              <button type="button" className="secondary" onClick={() => onJoin(twin.number)}>
                כניסה לבקשה {twin.number}
              </button>
            )}
            <span className="muted">אם זו החלפה אחרת – אפשר להמשיך כרגיל.</span>
          </div>
        </Notice>
      )}

      <label className="checkbox">
        <input
          type="checkbox"
          checked={d.proxy.enabled}
          onChange={(e) => update((draft) => (draft.proxy.enabled = e.target.checked))}
        />
        אני ממלא בשם מישהו אחר (מיופה כוח, עו"ד, מתווך)
      </label>
    </>
  )
}
