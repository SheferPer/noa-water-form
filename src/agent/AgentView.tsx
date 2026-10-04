import { useCallback, useState } from 'react'
import { AGENTS } from '../data/agents'
import { loadRequests, type SubmittedRequest } from '../data/store'
import { Queue } from './Queue'
import { RequestScreen } from './RequestScreen'

/** initialAgent / initialOpen – נחיתה ישירה מתוך "קפיצה לתרחיש" */
export function AgentView({ initialAgent, initialOpen }: { initialAgent?: string; initialOpen?: number }) {
  const [agentId, setAgentId] = useState(initialAgent ?? 'michal')
  const [requests, setRequests] = useState<SubmittedRequest[]>(() => loadRequests())
  const [openNumber, setOpenNumber] = useState<number | null>(initialOpen ?? null)

  const onChange = useCallback((all: SubmittedRequest[]) => setRequests(all), [])
  const mine = requests.filter((r) => r.assignee === agentId)
  const current = requests.find((r) => r.number === openNumber)

  return (
    <>
      <div className="agent-bar">
        <label>
          מחובר/ת כ:{' '}
          <select className="input input--inline" value={agentId} onChange={(e) => { setAgentId(e.target.value); setOpenNumber(null) }}>
            {AGENTS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {a.available ? '' : ' (לא זמין/ה)'}
              </option>
            ))}
          </select>
        </label>
      </div>
      {current ? (
        <RequestScreen key={current.number} request={current} agentId={agentId} onBack={() => setOpenNumber(null)} onChange={onChange} />
      ) : (
        <Queue requests={mine} onOpen={setOpenNumber} />
      )}
    </>
  )
}
