import { BillHint } from '../../components/DocExample'
import { DocUpload } from '../../components/DocUpload'
import { Field, Notice, TextInput } from '../../components/ui'
import { scannedFields } from '../../data/ocr'
import { findByAccount, fullAddress, getProperty, maskedAddress, verifyMeter } from '../../data/properties'
import { PROPERTIES } from '../../data/seed'
import type { Draft, DraftUpdate } from '../draft'
import { validId } from '../steps'
import { useFieldErrors } from '../validation'

/**
 * דרך אחת לזהות את הנכס: מספר חשבון חוזה.
 * מי שאין לו את המספר מעלה חשבון מים ואנחנו מוציאים אותו משם – זו לא דרך אחרת,
 * זו רק דרך אחרת למלא את אותו שדה. מי שאין לו גם חשבון עובר לזיהוי לפי מונה.
 */
export function PropertyStep({ d, update }: { d: Draft; update: DraftUpdate }) {
  const i = d.identification
  const property = getProperty(i.propertyId)
  const { blur, error } = useFieldErrors()
  // כאן השדה עוד לא "חובה" – מציינים רק כשמה שהוקלד לא יכול להיות ת.ז.
  const verifierErr = error('verifier', i.verifierId.trim() && !validId(i.verifierId) ? 'ת.ז. לא תקינה – תשע ספרות' : '')
  const byMeter = i.method === 'meter'

  /** כל שינוי בנתוני הזיהוי מבטל חיפוש קודם */
  const edit = (recipe: (id: Draft['identification']) => void) =>
    update((draft) => {
      recipe(draft.identification)
      draft.identification.lookup = 'none'
      draft.identification.propertyId = null
      draft.identification.confirmed = null
    })

  /** חוזרים לזיהוי לפי חשבון – צילום המונה מהניסיון הקודם לא נגרר לשלב הקריאה */
  function forgetMeterPhoto() {
    update((draft) => {
      const old = draft.identification.meterDocId
      if (old && draft.reading.photoDocId === old) {
        draft.reading.photoDocId = null
        if (draft.reading.manualValue === scannedFields(old)?.reading) draft.reading.manualValue = ''
      }
      draft.identification.meterDocId = null
    })
  }

  function setMeterMode(on: boolean) {
    edit((id) => (id.method = on ? 'meter' : 'account'))
    if (!on) forgetMeterPhoto()
  }

  function search() {
    update((draft) => {
      const id = draft.identification
      if (id.method !== 'meter') {
        const p = findByAccount(id.accountNumber)
        id.lookup = p ? 'found' : 'not-found'
        id.propertyId = p?.id ?? null
      } else {
        const r = verifyMeter(id.meterNumber, id.verifierId)
        id.lookup = r.result === 'ok' ? 'found' : r.result
        id.propertyId = r.result === 'ok' ? r.property.id : null
      }
      id.confirmed = null
    })
  }

  const billFields = scannedFields(i.billDocId)
  const billAddress = i.billDocId ? billFields?.address : undefined
  const fromBill = Boolean(billFields?.accountNumber) && billFields?.accountNumber === i.accountNumber

  const canSearch = byMeter ? i.meterNumber.trim() && validId(i.verifierId) : i.accountNumber.trim().length > 0

  return (
    <>
      {!byMeter ? (
        <>
          {/* הדוגמה צמודה לשדה. הסמל מחוץ ל-<label>, כי כפתור בתוכו "חוטף" לחיצות על התווית */}
          <div className="field-with-hint">
            <Field label="מספר חשבון חוזה" hint={fromBill ? 'זוהה מהחשבון שהעליתם – אפשר לתקן' : undefined}>
              <TextInput
                value={i.accountNumber}
                onChange={(v) => edit((id) => (id.accountNumber = v))}
                format="digits"
                inputMode="numeric"
                dir="ltr"
                placeholder="5500123"
              />
            </Field>
            <BillHint />
          </div>

          {/* ההעלאה היא עזרה למי שאין לו את המספר, ולכן היא שקטה יותר מהשדה */}
          <div className="alt-path">
            <p className="alt-path__lead">אין לך את המספר? העלו חשבון מים ונוציא אותו משם.</p>
            {/* ההבהרה צמודה להזמנה עצמה – שם עולה השאלה "איזה חשבון?" */}
            <p className="muted">כל חשבון של הנכס מתאים – גם ישן, וגם על שם אחר.</p>
            <DocUpload
              kind="bill"
              label="חשבון מים של הנכס"
              value={i.billDocId}
              onChange={(docId) =>
                edit((id) => {
                  id.billDocId = docId
                  const fields = scannedFields(docId)
                  if (fields?.accountNumber) id.accountNumber = fields.accountNumber
                })
              }
            />
          </div>
        </>
      ) : (
        <>
          <Notice tone="info">
            אל דאגה – נמצא את הנכס יחד לפי המונה. צריך את מספר המונה, ות.ז. של בעל הנכס או של מי שמשלם היום את חשבון המים.
          </Notice>
          <DocUpload
            kind="meter"
            label="צילום מונה המים"
            value={i.meterDocId}
            onChange={(docId) =>
              edit((id) => {
                id.meterDocId = docId
                const fields = scannedFields(docId)
                if (fields?.meterNumber) id.meterNumber = fields.meterNumber
              })
            }
          />
          <Field label="מספר מונה" hint={i.meterDocId && scannedFields(i.meterDocId) ? 'זוהה מהצילום – אפשר לתקן' : 'אפשר גם להקליד ידנית'}>
            <TextInput value={i.meterNumber} onChange={(v) => edit((id) => (id.meterNumber = v))} dir="ltr" placeholder="21-004871" />
          </Field>
          <Field label="ת.ז. של בעל הנכס או של מי שמשלם היום את חשבון המים" error={verifierErr}>
            <TextInput
              value={i.verifierId}
              onChange={(v) => edit((id) => (id.verifierId = v))}
              onBlur={blur('verifier')}
              invalid={Boolean(verifierErr)}
              format="id"
              inputMode="numeric"
              dir="ltr"
            />
          </Field>
        </>
      )}

      {i.lookup !== 'found' && (
        <>
          <button type="button" className="secondary" onClick={search} disabled={!canSearch}>
            חיפוש הנכס
          </button>

          {/* המוצא, שקט – רוב האנשים לא צריכים אותו, ומי שכן צריך שיידע שזה בסדר */}
          {byMeter ? (
            <button type="button" className="link" onClick={() => setMeterMode(false)}>
              מצאתי את מספר חשבון החוזה, או שיש לי חשבון מים – חזרה
            </button>
          ) : (
            <button type="button" className="escape" onClick={() => setMeterMode(true)}>
              <strong>אני לא מוצא/ת את מספר חשבון החוזה, וגם אין לי חשבון מים</strong>
              <span>אל דאגה – נזהה את הנכס יחד, לפי מונה המים</span>
            </button>
          )}
        </>
      )}

      {i.lookup === 'not-found' && <Notice tone="error">לא מצאנו חשבון עם המספר הזה. בדקו את המספר ונסו שוב.</Notice>}
      {i.lookup === 'unknown-meter' && (
        <Notice tone="error">לא מצאנו מונה עם המספר הזה. בדקו את המספר, או חפשו לפי מספר חשבון חוזה.</Notice>
      )}
      {i.lookup === 'main-meter' && <Notice tone="error">זה המונה הראשי של הבניין. חפשו את המונה עם מספר הדירה שלכם.</Notice>}
      {i.lookup === 'mismatch' && (
        <Notice tone="error">
          המונה והת.ז. לא תואמים. נסו לפי מספר חשבון חוזה – אפשר לקבל אותו מבעל הנכס, מהשוכר הקודם או מחשבון ישן.
          <div className="notice__actions">
            <button type="button" className="link" onClick={() => setMeterMode(false)}>
              חיפוש לפי מספר חשבון חוזה
            </button>
            <span className="muted">אין דרך להשיג אותו? שירות לקוחות: ‎*2345</span>
          </div>
        </Notice>
      )}

      {i.lookup === 'found' && property && i.confirmed !== true && (
        <Notice tone="info">
          <strong>{maskedAddress(property)}</strong> – זה הנכס?
          {/* בחשבון יש גם כתובת – הצלבה שנותנת ודאות מעבר למספר לבדו */}
          {billAddress &&
            (billAddress === fullAddress(property) ? (
              <div className="muted">✓ תואם לכתובת שבחשבון שהעליתם.</div>
            ) : (
              <div className="muted">שימו לב: בחשבון שהעליתם כתוב {billAddress}.</div>
            ))}
          <div className="notice__actions">
            <button type="button" className="secondary" onClick={() => update((draft) => (draft.identification.confirmed = true))}>
              כן, זה הנכס
            </button>
            <button type="button" className="link" onClick={() => update((draft) => (draft.identification.confirmed = false))}>
              לא, זה לא הנכס שלי
            </button>
          </div>
        </Notice>
      )}

      {i.confirmed === false && (
        <Notice tone="error">
          {!byMeter
            ? 'המספר שהזנתם שייך לנכס אחר. בדקו את מספר החשבון בחשבון המים – אולי נפלה טעות בספרה.'
            : 'המונה והת.ז. שהזנתם מובילים לנכס הזה. אם זה לא הנכס שלכם, כנראה נפלה טעות באחד מהם.'}
          <div>
            הדרך הבטוחה ביותר היא <strong>מספר חשבון חוזה</strong>: אפשר לבקש אותו מבעל הנכס או מהמשלם הקודם, והוא מזהה את הנכס בוודאות
            בלי ניחושים.
          </div>
          <div className="notice__actions">
            <button type="button" className="link" onClick={() => edit(() => {})}>
              תיקון הפרטים
            </button>
            <span className="muted">לא מצליחים? שירות לקוחות: ‎*2345</span>
          </div>
        </Notice>
      )}

      {i.confirmed === true && property && <Notice tone="ok">✓ הנכס זוהה: {fullAddress(property)}</Notice>}

      <details className="sim">
        <summary>סימולציה: נתוני דמה לזיהוי</summary>
        <table className="sim-table">
          <thead>
            <tr>
              <th>נכס</th>
              <th>מספר חשבון חוזה</th>
              <th>מספר מונה</th>
              <th>ת.ז. שעובדת</th>
            </tr>
          </thead>
          <tbody>
            {PROPERTIES.map((p) => (
              <tr key={p.id}>
                <td>{fullAddress(p)}</td>
                <td dir="ltr">{p.accountNumber}</td>
                <td dir="ltr">{p.meterNumber}</td>
                <td dir="ltr">
                  {p.mainMeter ? '— (מונה ראשי)' : [p.owner?.id, p.payer.id].filter((x, n, a) => x && a.indexOf(x) === n).join(' / ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>ת.ז. של נועה ל"הפרטים שלך": 123456782</p>
        <p>
          מכרתי דירה: הרצל 3, ת.ז. 055555556 (שרה אלון – בעלת הנכס והמשלמת). הקונה: נועה כהן. בשלב המסמכים בוחרים "הסכם מכר – הרצל 3" ואת
          "ת.ז. של שרה אלון".
        </p>
      </details>
    </>
  )
}
