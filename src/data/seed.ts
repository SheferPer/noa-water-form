// נתוני דמה. אפשר לערוך כאן נכסים ומסמכים לדוגמה – "איפוס" באתר מחזיר למצב שמוגדר בקובץ הזה.

/** "היום" של הסימולציה, כדי שהתאריכים והקריאות יהיו צפויים */
export const MOCK_TODAY = '2026-09-22'
/** תחילת תקופת החיוב הנוכחית – תאריך החלפה מוקדם ממנו הוא "רטרואקטיבי" */
export const BILLING_PERIOD_START = '2026-09-01'

export interface Property {
  id: string
  street: string
  house: string
  apt?: string
  city: string
  accountNumber: string
  meterNumber: string
  /** מונה שמשדר קריאות מרחוק */
  digitalMeter: boolean
  /** המונה הראשי של הבניין (לא של דירה) */
  mainMeter?: boolean
  /** בעל הנכס – לא תמיד רשום אצל התאגיד */
  owner?: { id: string; name: string; phone: string }
  /** מי שמשלם היום את החשבון. הנייד שמור אצל התאגיד – הוא לקוח רשום */
  payer: { id: string; name: string; phone: string }
  /** קריאת המונה ב-BILLING_PERIOD_START; הצריכה היומית מחושבת ממנה */
  readingAtPeriodStart: number
  dailyUsage: number
}

export const PROPERTIES: Property[] = [
  {
    id: 'bialik-12-4',
    street: 'ביאליק',
    house: '12',
    apt: '4',
    city: 'רמת גן',
    accountNumber: '5500123',
    meterNumber: '21-004871',
    digitalMeter: true,
    owner: { id: '034567891', name: 'דוד לוי', phone: '0547654321' },
    payer: { id: '011111118', name: 'אורי שמש', phone: '0503334444' },
    readingAtPeriodStart: 1226,
    dailyUsage: 0.4,
  },
  {
    id: 'bialik-12-3',
    street: 'ביאליק',
    house: '12',
    apt: '3',
    city: 'רמת גן',
    accountNumber: '5500122',
    meterNumber: '21-004870',
    digitalMeter: false,
    owner: { id: '022222226', name: 'רחל כץ', phone: '0541112233' },
    payer: { id: '022222226', name: 'רחל כץ', phone: '0541112233' },
    readingAtPeriodStart: 880,
    dailyUsage: 0.3,
  },
  {
    id: 'bialik-12-main',
    street: 'ביאליק',
    house: '12',
    city: 'רמת גן',
    accountNumber: '5500100',
    meterNumber: '21-000100',
    digitalMeter: false,
    mainMeter: true,
    payer: { id: '580000001', name: 'ועד הבית ביאליק 12', phone: '0509990000' },
    readingAtPeriodStart: 15400,
    dailyUsage: 3,
  },
  {
    id: 'jabotinsky-40-7',
    street: "ז'בוטינסקי",
    house: '40',
    apt: '7',
    city: 'רמת גן',
    accountNumber: '5500456',
    meterNumber: '33-118822',
    digitalMeter: false,
    // בעל הנכס לא רשום אצל התאגיד
    payer: { id: '123456782', name: 'נועה כהן', phone: '0521234567' },
    readingAtPeriodStart: 2300,
    dailyUsage: 0.35,
  },
  {
    id: 'herzl-3',
    street: 'הרצל',
    house: '3',
    city: 'רמת גן',
    accountNumber: '5500789',
    meterNumber: '12-777001',
    digitalMeter: true,
    owner: { id: '055555556', name: 'שרה אלון', phone: '0525556666' },
    payer: { id: '055555556', name: 'שרה אלון', phone: '0525556666' },
    readingAtPeriodStart: 540,
    dailyUsage: 0.5,
  },
]

export type DocKind = 'bill' | 'meter' | 'id' | 'rent-contract' | 'sale-contract' | 'lease-end' | 'poa'

export interface SampleDoc {
  id: string
  kind: DocKind
  /** שם הקובץ שמוצג אחרי "העלאה" */
  fileName: string
  /** תיאור בבורר המסמכים לדוגמה – מה מיוחד במסמך הזה */
  description: string
  /** צילום לא ברור – ה-OCR לא מצליח לקרוא */
  unreadable?: boolean
  /** מה ה-OCR "מחלץ" מהמסמך */
  fields: Record<string, string>
}

export const SAMPLE_DOCS: SampleDoc[] = [
  // חשבונות מים
  { id: 'bill-bialik-4', kind: 'bill', fileName: 'חשבון_מים.pdf', description: 'חשבון של ביאליק 12, דירה 4', fields: { accountNumber: '5500123', address: 'ביאליק 12, דירה 4', customer: 'אורי שמש' } },
  { id: 'bill-bialik-3', kind: 'bill', fileName: 'חשבון_מים.pdf', description: 'חשבון של ביאליק 12, דירה 3', fields: { accountNumber: '5500122', address: 'ביאליק 12, דירה 3', customer: 'רחל כץ' } },
  { id: 'bill-jabotinsky', kind: 'bill', fileName: 'חשבון_מים.pdf', description: "חשבון של ז'בוטינסקי 40, דירה 7", fields: { accountNumber: '5500456', address: "ז'בוטינסקי 40, דירה 7", customer: 'נועה כהן' } },
  { id: 'bill-herzl', kind: 'bill', fileName: 'חשבון_מים.pdf', description: 'חשבון של הרצל 3', fields: { accountNumber: '5500789', address: 'הרצל 3', customer: 'שרה אלון' } },
  { id: 'bill-blurry', kind: 'bill', fileName: 'חשבון_מטושטש.jpg', description: 'צילום מטושטש', unreadable: true, fields: {} },

  // מונים
  { id: 'meter-bialik-4', kind: 'meter', fileName: 'מונה.jpg', description: 'המונה של ביאליק 12, דירה 4', fields: { meterNumber: '21-004871', reading: '1234' } },
  { id: 'meter-bialik-3', kind: 'meter', fileName: 'מונה.jpg', description: 'המונה של ביאליק 12, דירה 3', fields: { meterNumber: '21-004870', reading: '886' } },
  { id: 'meter-main', kind: 'meter', fileName: 'מונה.jpg', description: 'המונה הראשי של הבניין', fields: { meterNumber: '21-000100', reading: '15463' } },
  { id: 'meter-jabotinsky', kind: 'meter', fileName: 'מונה.jpg', description: "המונה של ז'בוטינסקי 40, דירה 7", fields: { meterNumber: '33-118822', reading: '2307' } },
  { id: 'meter-blurry', kind: 'meter', fileName: 'מונה_מטושטש.jpg', description: 'צילום מטושטש', unreadable: true, fields: {} },

  // תעודות זהות
  { id: 'id-noa', kind: 'id', fileName: 'תז_נועה.pdf', description: 'ת.ז. של נועה כהן + ספח', fields: { idNumber: '123456782', firstName: 'נועה', lastName: 'כהן' } },
  { id: 'id-resident', kind: 'id', fileName: 'תז_דייר.pdf', description: 'ת.ז. של בן הזוג (תומר כהן) + ספח', fields: { idNumber: '200000009', firstName: 'תומר', lastName: 'כהן' } },
  { id: 'id-dana', kind: 'id', fileName: 'תז_דנה.pdf', description: 'ת.ז. של דנה ישראלי + ספח', fields: { idNumber: '300000007', firstName: 'דנה', lastName: 'ישראלי' } },
  { id: 'id-yossi', kind: 'id', fileName: 'תז_יוסי.pdf', description: 'ת.ז. של יוסי לוין + ספח', fields: { idNumber: '211111110', firstName: 'יוסי', lastName: 'לוין' } },
  { id: 'id-sara', kind: 'id', fileName: 'תז_שרה.pdf', description: 'ת.ז. של שרה אלון + ספח', fields: { idNumber: '055555556', firstName: 'שרה', lastName: 'אלון' } },
  { id: 'id-blurry', kind: 'id', fileName: 'תז_מטושטש.jpg', description: 'צילום מטושטש', unreadable: true, fields: {} },

  // חוזי שכירות
  { id: 'rent-ok', kind: 'rent-contract', fileName: 'חוזה_שכירות.pdf', description: 'חוזה תקין – ביאליק 12/4, מ-1.9', fields: { tenant: 'נועה כהן', owner: 'דוד לוי', address: 'ביאליק 12, דירה 4', startDate: '2026-09-01', signed: 'yes' } },
  { id: 'rent-date', kind: 'rent-contract', fileName: 'חוזה_שכירות.pdf', description: 'חוזה שבו השכירות מתחילה ב-15.9', fields: { tenant: 'נועה כהן', owner: 'דוד לוי', address: 'ביאליק 12, דירה 4', startDate: '2026-09-15', signed: 'yes' } },
  { id: 'rent-dana', kind: 'rent-contract', fileName: 'חוזה_שכירות.pdf', description: 'חוזה של דנה – ביאליק 12/3, מ-10.9', fields: { tenant: 'דנה ישראלי', owner: 'רחל כץ', address: 'ביאליק 12, דירה 3', startDate: '2026-09-10', signed: 'yes' } },
  { id: 'rent-unsigned', kind: 'rent-contract', fileName: 'חוזה_שכירות.pdf', description: 'חוזה בלי חתימות', fields: { tenant: 'נועה כהן', owner: 'דוד לוי', address: 'ביאליק 12, דירה 4', startDate: '2026-09-01', signed: 'no' } },

  // הסכמי מכר
  { id: 'sale-herzl', kind: 'sale-contract', fileName: 'הסכם_מכר.pdf', description: 'הסכם מכר – הרצל 3, שרה אלון מוכרת לנועה כהן, מסירה ב-10.9', fields: { buyer: 'נועה כהן', seller: 'שרה אלון', address: 'הרצל 3', startDate: '2026-09-10', signed: 'yes' } },
  { id: 'sale-herzl-late', kind: 'sale-contract', fileName: 'הסכם_מכר.pdf', description: 'הסכם מכר – הרצל 3, מסירה ב-20.9', fields: { buyer: 'נועה כהן', seller: 'שרה אלון', address: 'הרצל 3', startDate: '2026-09-20', signed: 'yes' } },

  // סיום שכירות
  { id: 'lease-end-letter', kind: 'lease-end', fileName: 'אישור_סיום.pdf', description: 'אישור בעל הנכס על סיום השכירות', fields: {} },

  // ייפוי כוח
  { id: 'poa-noa', kind: 'poa', fileName: 'ייפוי_כוח.pdf', description: 'ייפוי כוח חתום על ידי נועה כהן', fields: { grantor: 'נועה כהן' } },
]

/** מה צריך להופיע במסמך – מוצג ב"הצג דוגמה" */
export const DOC_EXAMPLES: Record<DocKind, { title: string; mustShow: string[] }> = {
  bill: { title: 'חשבון מים', mustShow: ['מספר חשבון חוזה – בראש החשבון', 'כתובת הנכס'] },
  meter: { title: 'צילום מונה המים', mustShow: ['המספר הסידורי של המונה (מוטבע על גוף המונה)', 'הספרות של הקריאה – כל הספרות השחורות'] },
  id: { title: 'תעודת זהות + ספח פתוח', mustShow: ['צד התמונה של התעודה', 'הספח פתוח – כולל רשימת הילדים'] },
  'rent-contract': { title: 'חוזה שכירות – כל החוזה', mustShow: ['שמות השוכר ובעל הנכס', 'כתובת הנכס', 'תאריך תחילת השכירות', 'חתימות שני הצדדים'] },
  'sale-contract': { title: 'הסכם מכר – כל ההסכם', mustShow: ['שמות הקונה והמוכר', 'כתובת הנכס', 'תאריך מסירת החזקה', 'חתימות שני הצדדים'] },
  'lease-end': { title: 'אישור על סיום השכירות', mustShow: ['למשל: מכתב מבעל הנכס, או החוזה עם תאריך הסיום'] },
  poa: { title: 'ייפוי כוח חתום', mustShow: ['שם מבקש השירות ומספר ת.ז.', 'שם מיופה הכוח', 'חתימת מבקש השירות'] },
}
