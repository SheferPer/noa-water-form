const ROLES = ['הנציג המטפל', 'נציג אחר', 'מנהל/ת']

const MATRIX: { what: string; allowed: [boolean, boolean, boolean] }[] = [
  { what: 'צפייה בפרטי הבקשה', allowed: [true, true, true] },
  { what: 'צפייה בצילומי תעודות זהות', allowed: [true, false, true] },
  { what: 'שינוי פרטים ופעולות בבקשה (השלמה, אישור)', allowed: [true, false, false] },
  { what: 'העברת בקשה לנציג אחר', allowed: [true, false, true] },
  { what: 'צפייה ביומן הפעולות', allowed: [false, false, true] },
]

/** לפי סעיף 15 בקובץ ההחלטות */
export function Permissions() {
  return (
    <section className="panel">
      <h2>הרשאות</h2>
      <table className="queue">
        <thead>
          <tr>
            <th />
            {ROLES.map((r) => (
              <th key={r}>{r}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MATRIX.map((row) => (
            <tr key={row.what} className="no-hover">
              <td>{row.what}</td>
              {row.allowed.map((ok, i) => (
                <td key={i} className={ok ? 'yes' : 'no'} aria-label={ok ? 'מותר' : 'אסור'}>
                  {ok ? '✓' : '✗'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted">כל צפייה בצילום תעודת זהות נרשמת ביומן הפעולות – כך מזהים צפייה שלא לצורך.</p>
    </section>
  )
}
