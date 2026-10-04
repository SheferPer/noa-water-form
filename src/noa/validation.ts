// שגיאות ליד השדה, לא רק ברשימה בתחתית:
// השגיאה מופיעה כשעוזבים את השדה, או כשלוחצים "המשך" ומשהו חסר.

import { createContext, useContext, useState } from 'react'
import { validEmail, validId, validPhone } from './steps'

/** true = לוחצים "המשך" ומשהו חסר, אז מציגים את כל השגיאות בבת אחת */
export const ShowErrors = createContext(false)

export function useFieldErrors() {
  const showAll = useContext(ShowErrors)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  return {
    /** onBlur לשדה – מכאן והלאה מותר להציג לו שגיאה */
    blur: (key: string) => () => setTouched((t) => (t[key] ? t : { ...t, [key]: true })),
    /** השגיאה עצמה, אם הגיע הזמן להציג אותה */
    error: (key: string, message: string) => (message && (showAll || touched[key]) ? message : ''),
  }
}

export const phoneError = (v: string) =>
  !v.trim() ? 'חסר מספר נייד' : validPhone(v) ? '' : 'נייד לא תקין – עשר ספרות שמתחילות ב-05'

export const idError = (v: string) => (!v.trim() ? 'חסר מספר ת.ז.' : validId(v) ? '' : 'ת.ז. לא תקינה – תשע ספרות')

export const emailError = (v: string) => (!v.trim() ? 'חסרה כתובת דוא״ל' : validEmail(v) ? '' : 'כתובת דוא״ל לא תקינה – חסר @ או סיומת')

export const requiredError = (v: string, message: string) => (v.trim() ? '' : message)
