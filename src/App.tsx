import { useState } from 'react'
import { AdminView } from './admin/AdminView'
import { AgentView } from './agent/AgentView'
import { SCENARIOS, type Scenario, type ScenarioTarget } from './data/scenarios'
import { resetAll } from './data/store'
import { ApplicantView } from './noa/ApplicantView'

type Role = 'applicant' | 'agent' | 'admin'

function App() {
  const [role, setRole] = useState<Role>('applicant')
  // מפתח חדש = הכל מאפס אחרי "איפוס הסימולציה" או אחרי קפיצה לתרחיש
  const [resetKey, setResetKey] = useState(0)
  const [target, setTarget] = useState<ScenarioTarget | null>(null)
  const [showScenarios, setShowScenarios] = useState(false)

  function reset() {
    resetAll()
    setTarget(null)
    setResetKey((k) => k + 1)
  }

  /** התרחיש מכין את הנתונים, ואנחנו נוחתים ישר במסך הנכון */
  function run(s: Scenario) {
    const next = s.run()
    setTarget(next)
    setRole(next.role)
    setShowScenarios(false)
    setResetKey((k) => k + 1)
  }

  function pickRole(next: Role) {
    setRole(next)
    setTarget(null)
  }

  return (
    <>
      <header className="topbar">
        <span className="brand">מי העיר · תרגול</span>
        <nav className="roles" aria-label="תפקיד בסימולציה">
          <button type="button" className={role === 'applicant' ? 'is-active' : ''} onClick={() => pickRole('applicant')}>
            פונה (נועה)
          </button>
          <button type="button" className={role === 'agent' ? 'is-active' : ''} onClick={() => pickRole('agent')}>
            נציג
          </button>
          <button type="button" className={role === 'admin' ? 'is-active' : ''} onClick={() => pickRole('admin')}>
            מנהל
          </button>
        </nav>
        <button type="button" className="link" onClick={() => setShowScenarios((s) => !s)} aria-expanded={showScenarios}>
          קפיצה לתרחיש
        </button>
        <button type="button" className="link topbar__reset" onClick={reset}>
          איפוס הסימולציה
        </button>
      </header>

      {showScenarios && (
        <div className="scenarios">
          <p className="scenarios__lead">בחירת תרחיש מאפסת את הסימולציה, מכינה את הנתונים ופותחת את המסך הרלוונטי.</p>
          <div className="scenarios__list">
            {SCENARIOS.map((s) => (
              <button key={s.id} type="button" className="scenario" onClick={() => run(s)}>
                <strong>{s.label}</strong>
                <span>{s.hint}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <main className="page">
        {role === 'agent' && <AgentView key={resetKey} initialAgent={target?.agentId} initialOpen={target?.open} />}
        {role === 'admin' && <AdminView key={resetKey} initialTab={target?.adminTab} initialOpen={target?.open} />}
        {role === 'applicant' && <ApplicantView key={resetKey} initial={target?.applicant} />}
      </main>
    </>
  )
}

export default App
