export type Direction = 'start' | 'stop'

export type RequestType = 'rent-start' | 'buy' | 'rent-end' | 'sell'

export interface RequestTypeOption {
  id: RequestType
  direction: Direction
  label: string
  icon: string
  /** מה זה אומר בפועל – מוצג אחרי הבחירה */
  meaning: string
}

export const DIRECTIONS: { id: Direction; title: string; subtitle: string }[] = [
  { id: 'start', title: 'אני מתחיל לשלם', subtitle: 'חשבון המים יעבור על שמי' },
  { id: 'stop', title: 'אני מסיים לשלם', subtitle: 'חשבון המים יצא משמי' },
]

export const REQUEST_TYPES: RequestTypeOption[] = [
  {
    id: 'rent-start',
    direction: 'start',
    label: 'שכרתי דירה',
    icon: '🔑',
    meaning: 'תצטרכו את חוזה השכירות, פרטי בעל הנכס וקריאת מונה מיום הכניסה.',
  },
  {
    id: 'buy',
    direction: 'start',
    label: 'קניתי דירה',
    icon: '🏠',
    meaning: 'תצטרכו מסמך שמעיד על הקנייה, פרטי המוכר וקריאת מונה מיום המסירה.',
  },
  {
    id: 'rent-end',
    direction: 'stop',
    label: 'סיימתי שכירות',
    icon: '📦',
    meaning: 'תצטרכו כתובת למשלוח חשבון סופי וקריאת מונה מיום היציאה.',
  },
  {
    id: 'sell',
    direction: 'stop',
    label: 'מכרתי דירה',
    icon: '🤝',
    meaning: 'תצטרכו מסמך שמעיד על המכירה, פרטי הקונה וקריאת מונה מיום המסירה.',
  },
]
