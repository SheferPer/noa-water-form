// אישור להורדה: דף נקי שנפתח בחלון נפרד, ומשם "הדפסה" או "שמירה כ-PDF".
// בלי ספרייה חיצונית – הדפדפן כבר יודע לייצר PDF.

import { agentName } from '../data/agents'
import { formatPhone } from '../data/format'
import { getDoc } from '../data/ocr'
import { digitalReading, fullAddress, getProperty } from '../data/properties'
import type { SubmittedRequest } from '../data/store'
import { formatDate } from '../data/verify'
import { REQUEST_TYPES } from '../requestTypes'
import { identificationPhoto } from './draft'

const escape = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!)

function rows(r: SubmittedRequest): [string, string][] {
  const d = r.draft
  const property = getProperty(d.identification.propertyId)
  const reading =
    d.reading.source === 'digital' && property ? digitalReading(property, d.switchDate) : Number(d.reading.manualValue) || null

  const out: [string, string][] = [
    ['מספר פנייה', String(r.number)],
    ['תאריך ההגשה', formatDate(r.submittedAt)],
    ['סוג הבקשה', REQUEST_TYPES.find((t) => t.id === d.route)?.label ?? ''],
    ['הנכס', property ? fullAddress(property) : ''],
    ['מספר חשבון חוזה', property?.accountNumber ?? ''],
  ]
  if (d.switchDate) out.push(['תאריך ההחלפה', formatDate(d.switchDate)])
  if (reading) out.push(['קריאת מונה', `${reading.toLocaleString('he-IL')} מ״ק${d.reading.source === 'digital' ? ' (מונה מרחוק)' : ''}`])
  out.push(
    ['מגיש/ת הבקשה', `${d.me.firstName} ${d.me.lastName}`],
    ['נייד', formatPhone(d.me.phone)],
    ['דוא״ל', d.me.email],
  )
  if (d.proxy.enabled) out.push(['הוגש על ידי', `${d.proxy.name} · ${formatPhone(d.proxy.phone)}`])
  if (d.party.name) out.push(['הצד השני בבקשה', `${d.party.name} · ${formatPhone(d.party.phone)}`])
  if (d.nextTenant.known) out.push(['הדייר/ת הנכנס/ת', `${d.nextTenant.name} · ${formatPhone(d.nextTenant.phone)}`])
  if (d.mailing.street) out.push(['כתובת למשלוח החשבון הסופי', `${d.mailing.street}, ${d.mailing.city}`])
  out.push(['מטפל/ת בבקשה', agentName(r.assignee)])
  return out
}

function documents(r: SubmittedRequest): string[] {
  const d = r.draft
  const ids = [
    d.identification.billDocId,
    d.me.idDocId,
    d.reading.photoDocId ?? identificationPhoto(d),
    d.contractDocId,
    d.proxy.poaDocId,
    ...d.residents.docIds,
  ]
  return [...new Set(ids.filter(Boolean) as string[])].map((id) => getDoc(id)?.fileName ?? id)
}

export function receiptHtml(r: SubmittedRequest): string {
  const items = rows(r)
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><th>${escape(k)}</th><td>${escape(v)}</td></tr>`)
    .join('')
  const docs = documents(r)
  const pending = r.pending.map((p) => `<li>${escape(p)}</li>`).join('')

  return `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8">
<title>אישור הגשה ${r.number}</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;max-width:720px;margin:0 auto;padding:32px 24px;color:#0f1113;line-height:1.6}
  h1{font-size:1.5rem;margin:0 0 4px}
  .ref{font-size:2rem;letter-spacing:.04em;direction:ltr;display:inline-block}
  .sub{color:#5d6272;margin:0 0 20px}
  table{width:100%;border-collapse:collapse;margin:14px 0}
  th,td{padding:8px 10px;border-bottom:1px solid #e3e5ec;text-align:right;vertical-align:top}
  th{width:38%;font-weight:600;color:#5d6272}
  h2{font-size:1.05rem;margin:22px 0 6px}
  ul{margin:4px 0;padding-inline-start:20px}
  .foot{margin-top:26px;padding-top:12px;border-top:1px solid #c0c3cc;color:#5d6272;font-size:.85rem}
  .print{margin:18px 0;padding:10px 18px;font-size:1rem;border:1px solid #0f1113;border-radius:8px;background:#fff;cursor:pointer}
  @media print{.print{display:none}}
</style></head><body>
<h1>אישור הגשת בקשה להחלפת משלמים</h1>
<p class="sub">מי העיר · תרגול. מסמך זה הופק מהמערכת ב-${formatDate(r.submittedAt)}.</p>
<div class="ref">${r.number}</div>
<button class="print" onclick="window.print()">הדפסה או שמירה כ-PDF</button>
<table>${items}</table>
${docs.length ? `<h2>מסמכים שצורפו</h2><ul>${docs.map((f) => `<li>${escape(f)}</li>`).join('')}</ul>` : ''}
${pending ? `<h2>מה ממתין</h2><ul>${pending}</ul>` : ''}
<h2>מעקב</h2>
<p>https://mayim.example/r/${r.number} · נדרשים מספר הפנייה והנייד שהוזן בבקשה.</p>
<p class="foot">ההצהרה על נכונות הפרטים אושרה בעת ההגשה ונשמרה ביומן הבקשה. אישור זה מעיד על קליטת הבקשה, ואינו אישור על השלמת ההחלפה.</p>
<script>window.addEventListener('load', function () { setTimeout(function () { window.print() }, 250) })</script>
</body></html>`
}

/** פותח את האישור בחלון חדש. false = הדפדפן חסם חלונות קופצים */
export function openReceipt(r: SubmittedRequest): boolean {
  const w = window.open('', '_blank')
  if (!w) return false
  w.document.write(receiptHtml(r))
  w.document.close()
  return true
}
