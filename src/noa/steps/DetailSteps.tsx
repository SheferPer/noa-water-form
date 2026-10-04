import { useEffect } from 'react'
import { DocUpload } from '../../components/DocUpload'
import { IdentityBlock } from '../../components/IdentityBlock'
import { Choice, Field, Notice, TextInput } from '../../components/ui'
import { cleanEmail, cleanName } from '../../data/format'
import { getProperty } from '../../data/properties'
import type { Draft, DraftUpdate } from '../draft'
import { isStop, partyRole, who } from '../steps'
import { emailError, idError, phoneError, requiredError, useFieldErrors } from '../validation'

type StepProps = { d: Draft; update: DraftUpdate }

export function ProxyStep({ d, update }: StepProps) {
  const p = d.proxy
  const { blur, error } = useFieldErrors()
  const nameErr = error('name', requiredError(p.name, 'חסר שם מלא'))
  const phoneErr = error('phone', phoneError(p.phone))
  const idErr = error('id', idError(p.idNumber))
  return (
    <>
      <Field label="שם מלא" error={nameErr}>
        <TextInput
          value={p.name}
          onChange={(v) => update((draft) => (draft.proxy.name = v))}
          onBlur={() => {
            blur('name')()
            update((draft) => (draft.proxy.name = cleanName(draft.proxy.name)))
          }}
          invalid={Boolean(nameErr)}
        />
      </Field>
      <Field label="נייד" error={phoneErr}>
        <TextInput
          type="tel"
          format="phone"
          value={p.phone}
          onChange={(v) => update((draft) => (draft.proxy.phone = v))}
          onBlur={blur('phone')}
          invalid={Boolean(phoneErr)}
          dir="ltr"
          placeholder="050-123-4567"
        />
      </Field>
      <Field label="בתור מה את/ה מגיש/ה?">
        <Choice
          name="proxy-kind"
          value={p.kind || null}
          options={[
            { value: 'family', label: 'קרוב משפחה' },
            { value: 'lawyer', label: 'עו"ד' },
            { value: 'broker', label: 'מתווך' },
          ]}
          onChange={(v) => update((draft) => (draft.proxy.kind = v))}
        />
      </Field>
      <Field label="ת.ז." error={idErr}>
        <TextInput
          value={p.idNumber}
          onChange={(v) => update((draft) => (draft.proxy.idNumber = v))}
          onBlur={blur('id')}
          invalid={Boolean(idErr)}
          format="id"
          inputMode="numeric"
          dir="ltr"
        />
      </Field>
      <DocUpload
        kind="poa"
        label="ייפוי כוח חתום (אפשר להשלים אחרי ההגשה)"
        value={p.poaDocId}
        onChange={(docId) => update((draft) => (draft.proxy.poaDocId = docId))}
      />
      <p className="muted">עדכונים על הבקשה יישלחו גם אליך וגם למבקש/ת השירות.</p>
    </>
  )
}

export function MeStep({ d, update }: StepProps) {
  const property = getProperty(d.identification.propertyId)
  const { blur, error } = useFieldErrors()

  // מסיימים לשלם: החשבון על שם הפונה, אז ממלאים מראש מהמערכת.
  // רק אם הזדהה בזיהוי הנכס עם הת.ז. של המשלם – מספר חשבון לבדו לא מספיק כדי לחשוף שם ות.ז.
  useEffect(() => {
    if (!isStop(d) || d.me.prefilled || !property || d.proxy.enabled) return
    if (property.payer.id !== d.identification.verifierId.trim()) return
    const [firstName, ...rest] = property.payer.name.split(' ')
    update((draft) => {
      draft.me.firstName ||= firstName
      draft.me.lastName ||= rest.join(' ')
      draft.me.idNumber ||= property.payer.id
      draft.me.prefilled = true
    })
  }, [d, property, update])

  const me = d.me
  const phoneErr = error('phone', phoneError(me.phone))
  const emailErr = error('email', emailError(me.email))

  return (
    <>
      {me.prefilled && <Notice tone="info">מילאנו את הפרטים מהחשבון – בדקו ותקנו אם צריך.</Notice>}

      {/* הצילום ראשון: ה-OCR ממלא שם ות.ז., ואפשר לתקן או למלא ידנית */}
      <IdentityBlock
        label={who(d, 'צילום ת.ז. + ספח פתוח', 'צילום ת.ז. של מבקש/ת השירות + ספח פתוח')}
        value={{ firstName: me.firstName, lastName: me.lastName, idNumber: me.idNumber, idDocId: me.idDocId }}
        onChange={(next) =>
          update((draft) => {
            Object.assign(draft.me, next)
            draft.me.idConfirmed = false
          })
        }
      />

      <div className="grid-2">
        <Field label="נייד" hint="לכאן יישלחו מספר הפנייה והעדכונים" error={phoneErr}>
          <TextInput
            type="tel"
            format="phone"
            value={me.phone}
            onChange={(v) => update((draft) => (draft.me.phone = v))}
            onBlur={blur('phone')}
            invalid={Boolean(phoneErr)}
            dir="ltr"
            placeholder="050-123-4567"
          />
        </Field>
        <Field label="דוא״ל" error={emailErr}>
          <TextInput
            type="email"
            value={me.email}
            onChange={(v) => update((draft) => (draft.me.email = v))}
            onBlur={() => {
              blur('email')()
              update((draft) => (draft.me.email = cleanEmail(draft.me.email)))
            }}
            invalid={Boolean(emailErr)}
            dir="ltr"
            placeholder="name@example.com"
          />
        </Field>
      </div>
    </>
  )
}

export function PartyStep({ d, update }: StepProps) {
  const property = getProperty(d.identification.propertyId)
  const { blur, error } = useFieldErrors()
  const knownOwnerId =
    (d.route === 'rent-start' || d.route === 'buy') &&
    property?.owner?.id === d.identification.verifierId.trim()

  useEffect(() => {
    if (knownOwnerId && !d.party.idNumber) update((draft) => (draft.party.idNumber = draft.identification.verifierId.trim()))
  }, [knownOwnerId, d.party.idNumber, update])

  const role = partyRole(d)
  const prefilledFromLookup = knownOwnerId && d.party.idNumber === d.identification.verifierId.trim()
  const nameErr = error('name', requiredError(d.party.name, `חסר השם של ${role}`))
  const phoneErr = error('phone', phoneError(d.party.phone))
  const idErr = error('id', idError(d.party.idNumber))
  return (
    <>
      <Field label={`שם ${role}`} error={nameErr}>
        <TextInput
          value={d.party.name}
          onChange={(v) => update((draft) => (draft.party.name = v))}
          onBlur={() => {
            blur('name')()
            update((draft) => (draft.party.name = cleanName(draft.party.name)))
          }}
          invalid={Boolean(nameErr)}
        />
      </Field>
      <Field label="נייד" error={phoneErr}>
        <TextInput
          type="tel"
          format="phone"
          value={d.party.phone}
          onChange={(v) => update((draft) => (draft.party.phone = v))}
          onBlur={blur('phone')}
          invalid={Boolean(phoneErr)}
          dir="ltr"
          placeholder="050-123-4567"
        />
      </Field>
      {d.route !== 'rent-end' && (
        // ההודעה על המילוי האוטומטי צמודה לשדה עצמו
        <Field label="ת.ז." hint={prefilledFromLookup ? '✓ מולאה מזיהוי הנכס – אפשר לתקן' : undefined} error={idErr}>
          <TextInput
            value={d.party.idNumber}
            onChange={(v) => update((draft) => (draft.party.idNumber = v))}
            onBlur={blur('id')}
            invalid={Boolean(idErr)}
            format="id"
            inputMode="numeric"
            dir="ltr"
          />
        </Field>
      )}
      {d.route === 'sell' && <p className="muted">לקונה יישלח SMS לאישור הקריאה ולהשלמת הפרטים.</p>}
      {d.route === 'rent-end' && <p className="muted">נעדכן את בעל הנכס על היציאה שלך.</p>}
    </>
  )
}

export function NextTenantStep({ d, update }: StepProps) {
  const n = d.nextTenant
  const { blur, error } = useFieldErrors()
  const nameErr = error('name', requiredError(n.name, 'חסר השם של הדייר/ת הנכנס/ת'))
  const phoneErr = error('phone', phoneError(n.phone))
  return (
    <>
      <Notice tone="ok">
        <strong>היציאה שלך כבר בתוקף מתאריך היציאה – לא צריך לחכות לאף אחד.</strong>
        <div>
          השלב הזה לא חובה, אבל אם ידוע לך מי נכנס אחריך – שנייה אחת של הקלדה חוסכת ימים של טיפול: הוא מאשר את הקריאה שלך, ואין על מה
          להתווכח אחר כך.
        </div>
      </Notice>
      <Field label="ידוע לך מי נכנס לדירה אחריך?">
        <Choice
          name="next-known"
          value={n.known}
          options={[
            { value: true, label: 'כן' },
            { value: false, label: 'לא' },
          ]}
          onChange={(v) => update((draft) => (draft.nextTenant.known = v))}
        />
      </Field>
      {n.known === true && (
        <>
          <Field label="שם הדייר/ת הנכנס/ת" error={nameErr}>
            <TextInput
              value={n.name}
              onChange={(v) => update((draft) => (draft.nextTenant.name = v))}
              onBlur={() => {
                blur('name')()
                update((draft) => (draft.nextTenant.name = cleanName(draft.nextTenant.name)))
              }}
              invalid={Boolean(nameErr)}
            />
          </Field>
          <Field label="הנייד" error={phoneErr}>
            <TextInput
              type="tel"
              format="phone"
              value={n.phone}
              onChange={(v) => update((draft) => (draft.nextTenant.phone = v))}
              onBlur={blur('phone')}
              invalid={Boolean(phoneErr)}
              dir="ltr"
              placeholder="050-123-4567"
            />
          </Field>
          <p className="muted">יישלח אליו/ה SMS לאישור הקריאה ולהשלמת הפרטים. כשזה יקרה – נעדכן אותך.</p>
        </>
      )}
      {n.known === false && <Notice tone="info">נשלח את הבקשה לבעל הנכס. אם יש לו שוכר חדש, הוא יעביר אליו.</Notice>}
    </>
  )
}

export function MailingStep({ d, update }: StepProps) {
  const { blur, error } = useFieldErrors()
  const streetErr = error('street', requiredError(d.mailing.street, 'חסר רחוב ומספר'))
  const cityErr = error('city', requiredError(d.mailing.city, 'חסר יישוב'))
  return (
    <>
      <Field label="רחוב ומספר" error={streetErr}>
        <TextInput
          value={d.mailing.street}
          onChange={(v) => update((draft) => (draft.mailing.street = v))}
          onBlur={() => {
            blur('street')()
            update((draft) => (draft.mailing.street = cleanName(draft.mailing.street)))
          }}
          invalid={Boolean(streetErr)}
        />
      </Field>
      <Field label="יישוב" error={cityErr}>
        <TextInput
          value={d.mailing.city}
          onChange={(v) => update((draft) => (draft.mailing.city = v))}
          onBlur={() => {
            blur('city')()
            update((draft) => (draft.mailing.city = cleanName(draft.mailing.city)))
          }}
          invalid={Boolean(cityErr)}
        />
      </Field>
    </>
  )
}
