import { useState } from 'react'
import { RequestScreen } from '../agent/RequestScreen'
import { MANAGER_ID } from '../data/agents'
import { loadRequests } from '../data/store'
import { AllRequests, type Focus } from './AllRequests'
import { AuditLog } from './AuditLog'
import { Control } from './Control'
import { Performance } from './Performance'
import { Permissions } from './Permissions'
import { Trend } from './Trend'

const TABS = [
  { id: 'control', label: 'בקרה' },
  { id: 'all', label: 'כל הבקשות' },
  { id: 'performance', label: 'ביצועים ומגמה' },
  { id: 'log', label: 'יומן פעולות' },
  { id: 'permissions', label: 'הרשאות' },
] as const

type Tab = (typeof TABS)[number]['id']

/** initialTab / initialOpen – נחיתה ישירה מתוך "קפיצה לתרחיש" */
export function AdminView({ initialTab, initialOpen }: { initialTab?: Tab; initialOpen?: number }) {
  const [tab, setTab] = useState<Tab>(initialTab ?? 'control')
  const [focus, setFocus] = useState<Focus>(null)
  const [openNumber, setOpenNumber] = useState<number | null>(initialOpen ?? null)
  // המנהל/ת צופה בלבד, עד שבוחר/ת לטפל בעצמו/ה
  const [acting, setActing] = useState(false)
  // הנתונים נקראים מהאחסון בכל רינדור; מספר הגרסה מכריח רינדור אחרי פעולה
  const [version, setVersion] = useState(0)
  const refresh = () => setVersion((v) => v + 1)
  const current = openNumber === null ? undefined : loadRequests().find((r) => r.number === openNumber)

  if (current) {
    return (
      <>
        <div className="agent-bar">
          {acting ? (
            <button type="button" className="link" onClick={() => setActing(false)}>
              חזרה לצפייה בלבד
            </button>
          ) : (
            <button type="button" className="secondary" onClick={() => setActing(true)}>
              טיפול כמנהל/ת בבקשה הזו
            </button>
          )}
        </div>
        <RequestScreen
          key={`${current.number}-${version}-${acting}`}
          request={current}
          agentId={MANAGER_ID}
          readOnly={!acting}
          onBack={() => {
            setActing(false)
            setOpenNumber(null)
          }}
          onChange={refresh}
        />
      </>
    )
  }

  return (
    <>
      <nav className="subnav" aria-label="תצוגת מנהל">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={tab === t.id ? 'is-active' : ''} onClick={() => {
              setTab(t.id)
              if (t.id !== 'all') setFocus(null)
            }}>
            {t.label}
          </button>
        ))}
      </nav>
      {tab === 'control' && (
        <Control
          key={version}
          onChange={refresh}
          onDrill={(f) => {
            setFocus(f)
            setTab('all')
          }}
        />
      )}
      {tab === 'all' && (
        <AllRequests key={version} onOpen={setOpenNumber} onChange={refresh} focus={focus} onClearFocus={() => setFocus(null)} />
      )}
      {tab === 'performance' && (
        <>
          <Trend key={version} />
          <Performance />
        </>
      )}
      {tab === 'log' && <AuditLog key={version} onOpen={setOpenNumber} />}
      {tab === 'permissions' && <Permissions />}
    </>
  )
}
