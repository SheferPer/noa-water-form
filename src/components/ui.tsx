import { useId, type ReactNode } from 'react'
import { digitsOnly, formatPhone } from '../data/format'

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: ReactNode
  /** שגיאה ליד השדה עצמו – מוצגת במקום הרמז, כדי שלא יהיו שתי שורות מתחרות */
  error?: string
  children: ReactNode
}) {
  return (
    <label className={`field ${error ? 'field--error' : ''}`}>
      <span className="field__label">{label}</span>
      {children}
      {error ? (
        <span className="field__error" role="alert">
          {error}
        </span>
      ) : (
        hint && <span className="field__hint">{hint}</span>
      )}
    </label>
  )
}

interface TextInputProps {
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'tel' | 'email' | 'date' | 'number'
  inputMode?: 'numeric' | 'tel' | 'email' | 'text'
  placeholder?: string
  maxLength?: number
  dir?: 'ltr' | 'rtl'
  min?: string
  max?: string
  /** ניקוי הקלט תוך כדי הקלדה: 'phone' גם מוסיף מקפים לקריאוּת */
  format?: 'phone' | 'id' | 'digits'
  /** בדרך כלל: לסמן את השדה כ"נגעו בו" ולהציג שגיאה */
  onBlur?: () => void
  invalid?: boolean
}

export function TextInput({ value, onChange, format, invalid, ...rest }: TextInputProps) {
  const shown = format === 'phone' ? formatPhone(value) : value
  const clean = (v: string) =>
    format === 'phone' ? digitsOnly(v, 10) : format === 'id' ? digitsOnly(v, 9) : format === 'digits' ? digitsOnly(v) : v

  return (
    <input
      className="input"
      value={shown}
      aria-invalid={invalid || undefined}
      onChange={(e) => onChange(clean(e.target.value))}
      {...rest}
    />
  )
}

interface ChoiceProps<T extends string | boolean> {
  name: string
  value: T | null
  options: { value: T; label: string; hint?: string }[]
  onChange: (value: T) => void
}

/** בחירה אחת מתוך כמה, בכפתורים גדולים */
export function Choice<T extends string | boolean>({ name, value, options, onChange }: ChoiceProps<T>) {
  return (
    <div className="choice" role="radiogroup">
      {options.map((o) => (
        <label key={String(o.value)} className={`choice__opt ${value === o.value ? 'is-selected' : ''}`}>
          <input type="radio" name={name} checked={value === o.value} onChange={() => onChange(o.value)} />
          <span>
            {o.label}
            {o.hint && <span className="choice__hint">{o.hint}</span>}
          </span>
        </label>
      ))}
    </div>
  )
}

export function Notice({ tone, children }: { tone: 'info' | 'ok' | 'warn' | 'error'; children: ReactNode }) {
  return <div className={`notice notice--${tone}`}>{children}</div>
}

/** מספר נייד בתצוגה אחידה, תמיד משמאל לימין */
export function Phone({ value }: { value: string }) {
  return <span dir="ltr">{formatPhone(value)}</span>
}

/** מד התקדמות עם תווית – משמש גם בטופס וגם במסכי הניהול */
export function Meter({ value, max, label }: { value: number; max: number; label: string }) {
  const id = useId()
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="meter" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-labelledby={id}>
      <span className="meter__label" id={id}>
        {label}
      </span>
      <span className="meter__track">
        <span className="meter__fill" style={{ width: `${pct}%` }} />
      </span>
    </div>
  )
}
