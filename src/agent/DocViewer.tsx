import type { ReactNode } from 'react'
import { getDoc } from '../data/ocr'
import { formatDate } from '../data/verify'

/** מסמך מדומה: מציג את השדות שה-OCR "קרא", ומדגיש את השדה שנבדק */
export function DocViewer({ docId, field }: { docId: string | null; field?: string }) {
  const doc = getDoc(docId)
  if (!doc) return <div className="viewer viewer--empty">בחרו מסמך או "הצג במסמך" ליד ממצא</div>
  if (doc.unreadable) return <div className="viewer viewer--blurry">[{doc.fileName} – צילום מטושטש, לא ניתן לקרוא]</div>

  const f = doc.fields
  const v = (key: string, text?: string): ReactNode => {
    const value = text ?? f[key]
    return key === field ? <mark>{value}</mark> : <strong>{value}</strong>
  }

  let body: ReactNode
  switch (doc.kind) {
    case 'bill':
      body = (
        <>
          <p>מי העיר · חשבון תקופתי</p>
          <p>שם הלקוח: {v('customer')}</p>
          <p>מספר חשבון חוזה: {v('accountNumber')}</p>
          <p>כתובת: {v('address')}</p>
        </>
      )
      break
    case 'meter':
      body = (
        <>
          <p>[צילום מונה מים]</p>
          <p>מספר סידורי: {v('meterNumber')}</p>
          <p>קריאה: {v('reading')} מ״ק</p>
        </>
      )
      break
    case 'id':
      body = (
        <>
          <p>מדינת ישראל · תעודת זהות</p>
          <p>
            שם: {v('firstName')} {v('lastName')}
          </p>
          <p>מספר זהות: {v('idNumber')}</p>
          <p className="muted">ספח: פתוח, מצורף</p>
        </>
      )
      break
    case 'rent-contract':
      body = (
        <>
          <p>הסכם שכירות</p>
          <p>
            שנערך בין {v('owner')} (המשכיר) לבין {v('tenant')} (השוכר), לדירה ב{v('address')}.
          </p>
          <p>…השוכר יחזיק בדירה החל מיום {v('startDate', formatDate(f.startDate))} ועד…</p>
          <p>חתימות: {v('signed', f.signed === 'yes' ? '✍ המשכיר   ✍ השוכר' : '______   ______')}</p>
        </>
      )
      break
    case 'sale-contract':
      body = (
        <>
          <p>הסכם מכר</p>
          <p>
            בין {v('seller')} (המוכר) לבין {v('buyer')} (הקונה), לנכס ב{v('address')}.
          </p>
          <p>…החזקה תימסר לקונה ביום {v('startDate', formatDate(f.startDate))}…</p>
          <p>חתימות: {v('signed', f.signed === 'yes' ? '✍ המוכר   ✍ הקונה' : '______   ______')}</p>
        </>
      )
      break
    case 'poa':
      body = <p>ייפוי כוח · אני, {v('grantor')}, מייפה את כוחו של…</p>
      break
    default:
      body = <p>{doc.description}</p>
  }

  return (
    <div className="viewer">
      <p className="viewer__name">📄 {doc.fileName}</p>
      <div className="viewer__page">{body}</div>
    </div>
  )
}
