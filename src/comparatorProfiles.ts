import type { IdentityFieldDef } from './types'

/** Configuração de uma das seções do app (Fatura, Matriz, etc.). */
export interface ComparatorProfile {
  /** Id curto e único do perfil — usado como prefixo de ids de elementos e de nome de arquivo exportado. */
  id: string
  sectionTitle: string
  uploadPreviousLabel: string
  uploadCurrentLabel: string
  uploadDescription: string
  /**
   * Campos de identidade do perfil, na ordem em que devem ser exibidos e
   * exportados. Essa ordem também define o formato da chave de casamento
   * entre as duas planilhas (ver `buildRecords` em lib/compare.ts) — não
   * reordenar sem necessidade.
   */
  identityFields: IdentityFieldDef[]
}

export const FATURA_PROFILE: ComparatorProfile = {
  id: 'fatura',
  sectionTitle: 'Comparador de Faturas',
  uploadPreviousLabel: 'Fatura anterior',
  uploadCurrentLabel: 'Fatura atual',
  uploadDescription:
    'Formatos aceitos: .xls e .xlsx. As duas faturas devem ser da mesma operadora e do mesmo tipo de plano (saúde, vida ou previdência).',
  identityFields: [
    { key: 'cpf', label: 'CPF', keywords: ['cpf'], isCpf: true },
    { key: 'carteirinha', label: 'Nº da carteirinha', keywords: ['carteirinha', 'carteira', 'matricula', 'matrícula'] },
  ],
}

export const MATRIZ_PROFILE: ComparatorProfile = {
  id: 'matriz',
  sectionTitle: 'Comparador de Matriz',
  uploadPreviousLabel: 'Matriz anterior',
  uploadCurrentLabel: 'Matriz atual',
  uploadDescription: 'Formatos aceitos: .xls e .xlsx. As duas planilhas de matriz devem ser da mesma empresa.',
  identityFields: [
    { key: 'cpf', label: 'C.P.F.', keywords: ['c.p.f', 'cpf'], isCpf: true },
    { key: 'nometitular', label: 'Nometitular', keywords: ['nometitular', 'nome titular', 'titular'] },
    { key: 'nomedependente', label: 'Nomedependente', keywords: ['nomedependente', 'nome dependente', 'dependente'] },
    { key: 'plano', label: 'Plano', keywords: ['plano'] },
  ],
}
