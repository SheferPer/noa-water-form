import { DocUpload } from '../../components/DocUpload'
import { Choice, Field, Notice, TextInput } from '../../components/ui'
import type { Draft, DraftUpdate } from '../draft'
import { who } from '../steps'

export function ResidentsStep({ d, update }: { d: Draft; update: DraftUpdate }) {
  const r = d.residents
  const count = /^\d+$/.test(r.others) ? Math.min(Number(r.others), 10) : 0

  return (
    <>
      <Field label="רוצים הנחה לפי מספר הנפשות בדירה?">
        <Choice
          name="discount"
          value={r.wantsDiscount}
          options={[
            { value: true, label: 'כן' },
            { value: false, label: 'לא עכשיו' },
          ]}
          onChange={(v) => update((draft) => (draft.residents.wantsDiscount = v))}
        />
      </Field>

      {r.wantsDiscount && (
        <>
          <Notice tone="ok">
            {who(d, 'אתם נספרים', 'מבקש/ת השירות נספר/ת')} אוטומטית – הת.ז. כבר צורפה. ילדים מתחת לגיל 16 מופיעים בספח שצורף, לא צריך
            להוסיף אותם.
          </Notice>
          <Field label="כמה בגירים נוספים יגורו בדירה?">
            <TextInput
              value={r.others}
              onChange={(v) => update((draft) => (draft.residents.others = v))}
              inputMode="numeric"
              dir="ltr"
              maxLength={2}
            />
          </Field>
          {Array.from({ length: count }, (_, i) => (
            <DocUpload
              key={i}
              kind="id"
              label={`ת.ז. + ספח – בגיר ${i + 1}`}
              value={r.docIds[i] ?? null}
              onChange={(docId) => update((draft) => (draft.residents.docIds[i] = docId))}
            />
          ))}
        </>
      )}
    </>
  )
}
