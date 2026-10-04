import { useState } from 'react'
import { cleanName } from '../data/format'
import { getDoc, scannedFields } from '../data/ocr'
import { idError, requiredError, useFieldErrors } from '../noa/validation'
import { Field, Notice, TextInput } from './ui'
import { DocUpload } from './DocUpload'

export interface Identity {
  firstName: string
  lastName: string
  idNumber: string
  idDocId: string | null
}

interface Props {
  value: Identity
  onChange: (next: Partial<Identity>) => void
  label: string
  /** ת.ז. שכבר ידועה (למשל שהוזנה בזיהוי) – נבדקת מול התעודה */
  expectedIdNumber?: string
}

/**
 * צילום התעודה קודם, וה-OCR ממלא את הפרטים.
 * מי שאין לו צילום ממלא ידנית – אחרת הוא נתקע.
 */
export function IdentityBlock({ value, onChange, label, expectedIdNumber }: Props) {
  const doc = getDoc(value.idDocId)
  const ocr = scannedFields(value.idDocId)
  const [manual, setManual] = useState(false)
  const [editing, setEditing] = useState(false)
  const { blur, error } = useFieldErrors()

  function onDoc(docId: string | null) {
    const fields = scannedFields(docId)
    if (fields) {
      // הפרטים מגיעים מהתעודה; תמיד אפשר לתקן
      onChange({ idDocId: docId, firstName: fields.firstName, lastName: fields.lastName, idNumber: fields.idNumber })
      setEditing(false)
    } else {
      onChange({ idDocId: docId })
    }
  }

  const mismatch = expectedIdNumber && ocr && ocr.idNumber !== expectedIdNumber.trim()
  const edited = ocr && (ocr.firstName !== value.firstName || ocr.lastName !== value.lastName || ocr.idNumber !== value.idNumber)
  const showFields = manual || editing || (doc && !ocr) || !value.idDocId

  return (
    <>
      <DocUpload kind="id" label={label} value={value.idDocId} onChange={onDoc} />

      {doc && !ocr && <p className="muted">לא הצלחנו לקרוא ממנו את הפרטים – מלאו אותם ידנית למטה.</p>}

      {ocr && !showFields && (
        <div className="identity">
          <div className="identity__head">
            <strong>הפרטים שקראנו מהתעודה</strong>
            <button type="button" className="link" onClick={() => setEditing(true)}>
              תיקון פרטים
            </button>
          </div>
          <p className="identity__line">
            שם: <strong>{value.firstName} {value.lastName}</strong>
          </p>
          <p className="identity__line">
            מספר ת.ז.: <strong dir="ltr">{value.idNumber}</strong>
          </p>
          {edited && <p className="muted">שינית את מה שנקרא מהתעודה – נציג יראה את שתי הגרסאות.</p>}
          {mismatch && <Notice tone="warn">הת.ז. בתעודה ({ocr.idNumber}) שונה מזו שהזנתם קודם ({expectedIdNumber}).</Notice>}
        </div>
      )}

      {showFields && (
        <>
          {!value.idDocId && !manual && (
            <button type="button" className="link" onClick={() => setManual(true)}>
              אין לי צילום עכשיו – למלא ידנית
            </button>
          )}
          {(manual || editing || (doc && !ocr)) && (
            <div className="grid-2">
              <Field label="שם פרטי" hint="כמו בת.ז." error={error('first', requiredError(value.firstName, 'חסר שם פרטי'))}>
                <TextInput
                  value={value.firstName}
                  onChange={(v) => onChange({ firstName: v })}
                  onBlur={() => {
                    blur('first')()
                    onChange({ firstName: cleanName(value.firstName) })
                  }}
                  invalid={Boolean(error('first', requiredError(value.firstName, 'x')))}
                />
              </Field>
              <Field label="שם משפחה" hint="כמו בת.ז." error={error('last', requiredError(value.lastName, 'חסר שם משפחה'))}>
                <TextInput
                  value={value.lastName}
                  onChange={(v) => onChange({ lastName: v })}
                  onBlur={() => {
                    blur('last')()
                    onChange({ lastName: cleanName(value.lastName) })
                  }}
                  invalid={Boolean(error('last', requiredError(value.lastName, 'x')))}
                />
              </Field>
              <Field label="מספר ת.ז." error={error('id', idError(value.idNumber))}>
                <TextInput
                  value={value.idNumber}
                  onChange={(v) => onChange({ idNumber: v })}
                  onBlur={blur('id')}
                  invalid={Boolean(error('id', idError(value.idNumber)))}
                  format="id"
                  inputMode="numeric"
                  dir="ltr"
                />
              </Field>
            </div>
          )}
          {manual && !value.idDocId && <p className="muted">אפשר להעלות את הצילום גם אחר כך – נבקש אותו בהמשך.</p>}
          {editing && (
            <button type="button" className="link" onClick={() => setEditing(false)}>
              סיימתי לתקן
            </button>
          )}
        </>
      )}
    </>
  )
}
