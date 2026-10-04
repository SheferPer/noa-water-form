import { DocUpload, type DocCheck } from '../../components/DocUpload'
import { Notice } from '../../components/ui'
import { scannedFields } from '../../data/ocr'
import { contractFindings, formatDate } from '../../data/verify'
import type { Draft, DraftUpdate } from '../draft'
import { docKind, docRequired } from '../steps'

/** אותן השוואות שהנציג רואה – כאן הפונה מתקן בעצמו לפני ההגשה */
function contractChecks(d: Draft, update: DraftUpdate): DocCheck[] {
  const startDate = scannedFields(d.contractDocId)?.startDate
  return contractFindings(d).map((f) => ({
    label: f.label,
    ok: f.state === 'ok',
    detail: f.form ? `במסמך: ${f.found} · בטופס: ${f.form}` : f.found,
    actions:
      f.key === 'contract-date' && startDate
        ? [{ label: `לעדכן בטופס ל-${formatDate(startDate)}`, onClick: () => update((draft) => (draft.switchDate = startDate)) }]
        : undefined,
  }))
}

export function DocsStep({ d, update }: { d: Draft; update: DraftUpdate }) {
  const kind = docKind(d)
  const label = kind === 'rent-contract' ? 'חוזה השכירות – כל החוזה' : kind === 'sale-contract' ? 'הסכם המכר – כל ההסכם' : 'אישור על סיום השכירות'

  return (
    <>
      <Notice tone="info">
        {docRequired(d) ? 'ככל שהמסמך ברור ומלא יותר, כך הבקשה מטופלת מהר יותר.' : 'מומלץ לצרף – המסמך מזרז את הטיפול. אפשר להמשיך גם בלעדיו.'}
      </Notice>
      <DocUpload
        kind={kind}
        label={label}
        value={d.contractDocId}
        onChange={(docId) => update((draft) => (draft.contractDocId = docId))}
        checks={contractChecks(d, update)}
      />
    </>
  )
}
