import type { Draft } from '../noa/draft'

/** מי מילא מה – ביומן של הנציג מופיע התפקיד ואחריו השם */
export function applicantActor(d: Draft): string {
  const role =
    d.route === 'rent-end' ? 'הדייר היוצא' : d.route === 'sell' ? 'המוכר/ת' : d.route === 'buy' ? 'הקונה' : 'הדייר הנכנס'
  return `${role} (${d.me.firstName} ${d.me.lastName})`
}
