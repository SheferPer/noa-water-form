export interface Agent {
  id: string
  name: string
  available: boolean
}

export const AGENTS: Agent[] = [
  { id: 'michal', name: 'מיכל', available: true },
  { id: 'avi', name: 'אבי', available: true },
  { id: 'rotem', name: 'רותם', available: false },
]

export const MANAGER_ID = 'admin'

export const agentName = (id: string) => (id === MANAGER_ID ? 'מנהל/ת' : (AGENTS.find((a) => a.id === id)?.name ?? id))
