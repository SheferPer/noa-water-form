import { Notice, Phone } from './ui'

/**
 * ה-SMS לצד השני עלול ליפול בספאם או להיראות כמו הונאה.
 * הודעה קצרה מהפונה עצמו מזרזת את הטיפול יותר מכל תזכורת מהמערכת.
 */
export function TellThem({ name, phone, acquainted = true }: { name: string; phone?: string; acquainted?: boolean }) {
  return (
    <Notice tone="info">
      <strong>שלחנו ל{name} הודעת SMS עם קישור.</strong>
      <div>
        {acquainted
          ? 'שווה שגם אתם תודיעו לו/ה בשיחה או בהודעה – הודעה ממספר לא מוכר נוטה ליפול בספאם או להיראות חשודה. דקה אחת שלכם יכולה לחסוך כמה ימי המתנה.'
          : 'אם יש לכם דרך ליצור קשר – שווה לעדכן גם ישירות. הודעה ממספר לא מוכר נוטה ליפול בספאם, ואישור מהיר שלו/ה מקצר את הטיפול.'}
        {phone && (
          <span className="muted">
            {' '}
            נשלח ל-<Phone value={phone} />.
          </span>
        )}
      </div>
    </Notice>
  )
}
