// השוואת הבקשה למסמכים. משמש גם את נועה (לפני ההגשה) וגם את הנציג (בבדיקה).

import type { Draft } from '../noa/draft'
import { getDoc, scannedFields } from './ocr'
import { digitalReading, fullAddress, getProperty } from './properties'
import { BILLING_PERIOD_START } from './seed'

export interface Finding {
  key: string
  label: string
  state: 'ok' | 'mismatch' | 'missing'
  /** הערך בטופס */
  form?: string
  /** הערך שחולץ מהמסמך / מהמערכת */
  found?: string
  /** המסמך שממנו חולץ הערך, והשדה להדגשה בו */
  docId?: string | null
  field?: string
  /** 'ai' – חולץ ב-OCR; 'system' – נבדק מול נתוני התאגיד */
  source: 'ai' | 'system'
  /** המלצה לנציג: האם להתעקש על החריגה או שאפשר לאשר בלעדיה */
  guidance?: string
}

const same = (a: string | undefined, b: string) => (a ?? '').trim() === b.trim()

export function formatDate(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${Number(d)}.${Number(m)}.${y}`
}

/** חוזה שכירות / הסכם מכר: צדדים, כתובת, תאריך, חתימות */
export function contractFindings(d: Draft): Finding[] {
  const docId = d.contractDocId
  const f = scannedFields(docId)
  const property = getProperty(d.identification.propertyId)
  if (!f || !property || d.route === 'rent-end') return []

  const optionalDoc = d.route === 'rent-start'
  const rentGuidance = optionalDoc
    ? 'בשכירות המסמך אינו חובה. להתעקש רק אם יש סתירה נוספת בבקשה, או סימן למחלוקת בין הצדדים – אחרת אפשר לאשר.'
    : undefined
  const myName = `${d.me.firstName} ${d.me.lastName}`
  const [mineKey, theirsKey] =
    d.route === 'rent-start' ? ['tenant', 'owner'] : d.route === 'buy' ? ['buyer', 'seller'] : ['seller', 'buyer']
  const result: Finding[] = [
    { key: 'contract-me', label: 'שם הפונה בחוזה', state: same(f[mineKey], myName) ? 'ok' : 'mismatch', form: myName, found: f[mineKey], docId, field: mineKey, source: 'ai' },
    { key: 'contract-party', label: 'שם הצד השני בחוזה', state: same(f[theirsKey], d.party.name) ? 'ok' : 'mismatch', form: d.party.name, found: f[theirsKey], docId, field: theirsKey, source: 'ai' },
    { key: 'contract-address', label: 'כתובת הנכס בחוזה', state: same(f.address, fullAddress(property)) ? 'ok' : 'mismatch', form: fullAddress(property), found: f.address, docId, field: 'address', source: 'ai' },
  ]
  if (d.switchDate) {
    result.push({
      key: 'contract-date',
      label: d.route === 'rent-start' ? 'תאריך תחילת שכירות' : 'תאריך מסירה',
      state: f.startDate === d.switchDate ? 'ok' : 'mismatch',
      form: formatDate(d.switchDate),
      found: formatDate(f.startDate),
      docId,
      field: 'startDate',
      source: 'ai',
      guidance: 'תאריך ההחלפה קובע ממתי מחויב כל צד. אם הצד השני אישר את התאריך שבטופס – אפשר לאשר; אחרת כדאי לברר.',
    })
  }
  result.push({
    key: 'contract-signed',
    label: 'חתימות על החוזה',
    state: f.signed === 'yes' ? 'ok' : 'mismatch',
    found: f.signed === 'yes' ? 'חתום' : 'לא חתום',
    docId,
    field: 'signed',
    source: 'ai',
    guidance: rentGuidance,
  })
  return result
}

/** כל מה שהנציג צריך לבדוק בבקשה */
export function requestFindings(d: Draft): Finding[] {
  const out: Finding[] = []
  const property = getProperty(d.identification.propertyId)

  out.push({
    key: 'property',
    label: 'זיהוי הנכס',
    state: 'ok',
    found:
      d.identification.method === 'meter'
        ? 'לפי מונה + ת.ז. – תואמים במערכת'
        : d.identification.billDocId
          ? 'לפי מספר חשבון חוזה שנקרא מחשבון מים שצורף'
          : 'לפי מספר חשבון חוזה',
    source: 'system',
  })

  // ת.ז. הפונה
  const idDoc = getDoc(d.me.idDocId)
  const id = scannedFields(d.me.idDocId)
  if (!idDoc) out.push({ key: 'id-doc', label: 'צילום ת.ז. + ספח', state: 'missing', source: 'ai' })
  else if (!id) out.push({ key: 'id-doc', label: 'צילום ת.ז.', state: 'mismatch', found: 'הצילום לא קריא', docId: d.me.idDocId, source: 'ai' })
  else {
    out.push({ key: 'id-number', label: 'מספר ת.ז.', state: same(id.idNumber, d.me.idNumber) ? 'ok' : 'mismatch', form: d.me.idNumber, found: id.idNumber, docId: d.me.idDocId, field: 'idNumber', source: 'ai' })
    out.push({ key: 'id-name', label: 'שם בת.ז.', state: same(id.lastName, d.me.lastName) ? 'ok' : 'mismatch', form: `${d.me.firstName} ${d.me.lastName}`, found: `${id.firstName} ${id.lastName}`, docId: d.me.idDocId, field: 'lastName', source: 'ai' })
  }

  // קריאת מונה
  if (d.route && !((d.route === 'buy' || d.route === 'sell') && d.occupancy === 'tenant')) {
    if (d.reading.source === 'digital' && property) {
      out.push({ key: 'reading', label: 'קריאת מונה', state: 'ok', found: `${digitalReading(property, d.switchDate)?.toLocaleString('he-IL')} מ״ק – מהמונה הדיגיטלי`, source: 'system' })
    } else if (!d.reading.photoDocId) {
      out.push({ key: 'meter-photo', label: 'צילום מונה', state: 'missing', form: `קריאה: ${d.reading.manualValue} מ״ק`, source: 'ai' })
    } else {
      const photo = scannedFields(d.reading.photoDocId)
      if (!photo) out.push({ key: 'meter-photo', label: 'צילום מונה', state: 'mismatch', found: 'הצילום לא קריא', docId: d.reading.photoDocId, source: 'ai' })
      else {
        out.push({ key: 'meter-number', label: 'מספר המונה בצילום', state: photo.meterNumber === property?.meterNumber ? 'ok' : 'mismatch', form: property?.meterNumber, found: photo.meterNumber, docId: d.reading.photoDocId, field: 'meterNumber', source: 'ai' })
      }
    }
  }

  // חוזה / הסכם – חסר נחשב ממצא רק כשהמסמך חובה (העברת בעלות)
  if (d.route) {
    const required = d.route === 'buy' || d.route === 'sell'
    if (!d.contractDocId && required) out.push({ key: 'contract', label: 'הסכם מכר', state: 'missing', source: 'ai' })
    else if (d.contractDocId) out.push(...contractFindings(d))
  }

  // ייפוי כוח
  if (d.proxy.enabled) {
    out.push(
      d.proxy.poaDocId
        ? { key: 'poa', label: 'ייפוי כוח', state: 'ok', found: 'צורף', docId: d.proxy.poaDocId, source: 'ai' }
        : {
            key: 'poa',
            label: 'ייפוי כוח חתום',
            state: 'missing',
            form: `הוגש על ידי ${d.proxy.name}`,
            source: 'ai',
            guidance: 'ייצוג בלי ייפוי כוח – זו חריגה שכדאי להתעקש עליה, כי היא נוגעת לזהות מי שמוסמך לפעול בשם הפונה.',
          },
    )
  }

  // תאריך רטרואקטיבי – החלטת נציג
  if (d.switchDate && d.switchDate < BILLING_PERIOD_START) {
    out.push({
      key: 'retro',
      label: 'תאריך רטרואקטיבי',
      state: 'mismatch',
      form: formatDate(d.switchDate),
      found: `תקופת החיוב הנוכחית מ-${formatDate(BILLING_PERIOD_START)}`,
      source: 'system',
      guidance: 'שיקול דעת: קריאה מהמונה הדיגיטלי או אישור של הצד השני מחזקים את הבקשה. חיוב רטרואקטיבי משנה חשבונות שכבר יצאו.',
    })
  }

  return out
}
