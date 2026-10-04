import type { RequestType } from '../requestTypes'

export type StepId =
  | 'property'
  | 'route'
  | 'proxy'
  | 'date'
  | 'me'
  | 'party'
  | 'next'
  | 'docs'
  | 'residents'
  | 'mailing'
  | 'summary'

export type Lookup = 'none' | 'found' | 'not-found' | 'mismatch' | 'main-meter' | 'unknown-meter'

export interface Draft {
  step: StepId
  identification: {
    /** 'account' – מספר חשבון חוזה (מוקלד, או שנקרא מחשבון שהועלה); 'meter' – מונה + ת.ז. */
    method: 'account' | 'meter'
    /** צילום חשבון מים – ה-OCR מוציא ממנו את מספר החשבון */
    billDocId: string | null
    accountNumber: string
    meterDocId: string | null
    meterNumber: string
    verifierId: string
    lookup: Lookup
    propertyId: string | null
    confirmed: boolean | null
  }
  route: RequestType | null
  /** קנייה: מי יגור בדירה. מכירה: האם גר בה שוכר */
  occupancy: 'self' | 'tenant' | null
  proxy: {
    enabled: boolean
    name: string
    phone: string
    kind: '' | 'family' | 'lawyer' | 'broker'
    idNumber: string
    poaDocId: string | null
  }
  switchDate: string
  reading: {
    source: 'digital' | 'manual' | null
    manualValue: string
    photoDocId: string | null
  }
  me: {
    firstName: string
    lastName: string
    phone: string
    email: string
    idNumber: string
    idDocId: string | null
    /** "הטופס נכון" – הפונה אישר שהמספר בטופס נכון למרות אי-התאמה ל-OCR */
    idConfirmed: boolean
    prefilled: boolean
  }
  party: { name: string; phone: string; idNumber: string }
  nextTenant: { known: boolean | null; name: string; phone: string }
  contractDocId: string | null
  residents: { wantsDiscount: boolean | null; others: string; docIds: (string | null)[] }
  mailing: { street: string; city: string }
  /** הערה חופשית לנציג */
  notes: string
  declarations: { accurate: boolean; terms: boolean; marketing: boolean }
}

export function emptyDraft(): Draft {
  return {
    step: 'property',
    identification: {
      method: 'account',
      billDocId: null,
      accountNumber: '',
      meterDocId: null,
      meterNumber: '',
      verifierId: '',
      lookup: 'none',
      propertyId: null,
      confirmed: null,
    },
    route: null,
    occupancy: null,
    proxy: { enabled: false, name: '', phone: '', kind: '', idNumber: '', poaDocId: null },
    switchDate: '',
    reading: { source: null, manualValue: '', photoDocId: null },
    me: { firstName: '', lastName: '', phone: '', email: '', idNumber: '', idDocId: null, idConfirmed: false, prefilled: false },
    party: { name: '', phone: '', idNumber: '' },
    nextTenant: { known: null, name: '', phone: '' },
    contractDocId: null,
    residents: { wantsDiscount: null, others: '', docIds: [] },
    mailing: { street: '', city: '' },
    notes: '',
    declarations: { accurate: false, terms: false, marketing: false },
  }
}

/** צילום המונה משלב הזיהוי – רק אם הזיהוי באמת נעשה לפי מונה (ולא שארית מניסיון קודם) */
export const identificationPhoto = (d: Draft) => (d.identification.method === 'meter' ? d.identification.meterDocId : null)

export type DraftUpdate =(recipe: (d: Draft) => void) => void
