import { DocUpload, type DocCheck } from '../../components/DocUpload'
import { Choice, Field, Notice, TextInput } from '../../components/ui'
import { scannedFields } from '../../data/ocr'
import { digitalReading, getProperty } from '../../data/properties'
import { BILLING_PERIOD_START } from '../../data/seed'
import { identificationPhoto, type Draft, type DraftUpdate } from '../draft'
import { dateQuestion, formatDate } from '../steps'

export function DateStep({ d, update }: { d: Draft; update: DraftUpdate }) {
  const property = getProperty(d.identification.propertyId)
  const digital = digitalReading(property!, d.switchDate)
  const retro = d.switchDate !== '' && d.switchDate < BILLING_PERIOD_START
  const reusedPhoto = d.reading.photoDocId !== null && d.reading.photoDocId === identificationPhoto(d)

  /** ממלא את הקריאה מה-OCR של הצילום – רק אם השדה ריק או עדיין מכיל ערך OCR קודם */
  function fillFromPhoto(draft: Draft, previousPhotoId: string | null) {
    const ocr = scannedFields(draft.reading.photoDocId)?.reading
    const previousOcr = scannedFields(previousPhotoId)?.reading
    if (ocr && (!draft.reading.manualValue || draft.reading.manualValue === previousOcr)) draft.reading.manualValue = ocr
  }

  function setDate(value: string) {
    update((draft) => {
      draft.switchDate = value
      if (property?.digitalMeter) {
        draft.reading.source = null
      } else {
        draft.reading.source = 'manual'
        draft.reading.photoDocId ??= identificationPhoto(draft)
        fillFromPhoto(draft, null)
      }
    })
  }

  function chooseSource(source: 'digital' | 'manual') {
    update((draft) => {
      draft.reading.source = source
      if (source === 'manual') {
        draft.reading.photoDocId ??= identificationPhoto(draft)
        fillFromPhoto(draft, null)
      }
    })
  }

  function setPhoto(docId: string | null) {
    update((draft) => {
      const previous = draft.reading.photoDocId
      draft.reading.photoDocId = docId
      fillFromPhoto(draft, previous)
    })
  }

  const ocrReading = scannedFields(d.reading.photoDocId)?.reading
  const fromOcr = ocrReading !== undefined && d.reading.manualValue === ocrReading

  const photoChecks: DocCheck[] = []
  const photo = scannedFields(d.reading.photoDocId)
  if (photo && property && photo.meterNumber !== property.meterNumber) {
    photoChecks.push({ label: 'זה לא המונה של הנכס', ok: false, detail: `בצילום: ${photo.meterNumber} · בנכס: ${property.meterNumber}` })
  }

  return (
    <>
      <Field label={dateQuestion(d)}>
        <TextInput type="date" value={d.switchDate} onChange={setDate} />
      </Field>

      {retro && (
        <Notice tone="warn">
          התאריך מוקדם מתקופת החיוב הנוכחית (מ-{formatDate(BILLING_PERIOD_START)}). אפשר לשלוח – נציג יבדוק אם אפשר להחיל אותו.
        </Notice>
      )}

      {d.switchDate && digital !== null && (
        <Field label="קריאת המונה">
          <Notice tone="info">
            המונה בנכס דיגיטלי. נמצאה קריאה ל-{formatDate(d.switchDate)}: <strong>{digital.toLocaleString('he-IL')} מ״ק</strong>
          </Notice>
          <Choice
            name="reading-source"
            value={d.reading.source}
            options={[
              { value: 'digital', label: 'להסתמך על הקריאה הזו' },
              { value: 'manual', label: 'להזין ידנית' },
            ]}
            onChange={chooseSource}
          />
        </Field>
      )}

      {d.switchDate && d.reading.source === 'manual' && (
        <>
          {/* קודם הצילום – ממנו ה-OCR ממלא את הקריאה */}
          {reusedPhoto ? (
            <Notice tone="ok">
              ✓ הצילום מזיהוי הנכס משמש גם כאן – לא צריך לצלם שוב.{' '}
              <button type="button" className="link" onClick={() => setPhoto(null)}>
                להעלות צילום אחר
              </button>
            </Notice>
          ) : (
            <DocUpload kind="meter" label="צילום המונה" value={d.reading.photoDocId} onChange={setPhoto} checks={photoChecks} />
          )}
          <Field
            label={`קריאת המונה ב-${formatDate(d.switchDate)} (מ״ק)`}
            hint={
              fromOcr
                ? 'זוהה מהצילום – אפשר לתקן. אם הצילום לא צולם ביום ההחלפה, עדכנו לקריאה של אותו יום.'
                : 'הספרות השחורות במונה'
            }
          >
            <TextInput
              value={d.reading.manualValue}
              onChange={(v) => update((draft) => (draft.reading.manualValue = v))}
              inputMode="numeric"
              dir="ltr"
            />
          </Field>
        </>
      )}
    </>
  )
}
