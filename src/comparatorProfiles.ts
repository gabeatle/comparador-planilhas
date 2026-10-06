import type { IdentityFieldDef, RowStatus } from './types'
import { STATUS_LABELS } from './types'

/** Extensões de arquivo que um slot de upload aceita (com o ponto, em minúsculas). */
export type FileExtension = '.xls' | '.xlsx' | '.pdf'

export const SPREADSHEET_EXTENSIONS: FileExtension[] = ['.xls', '.xlsx']
export const ALL_EXTENSIONS: FileExtension[] = [...SPREADSHEET_EXTENSIONS, '.pdf']

/**
 * Textos que mudam conforme o significado da comparação. Num comparador mês
 * a mês, quem só aparece no arquivo "atual" é uma entrada; numa conferência
 * PDF × planilha, é alguém que só está na planilha — o cálculo é o mesmo
 * (ver `compareMonths` em lib/compare.ts), só o nome muda.
 */
export interface ComparatorLabels {
  /** Título do painel de mapeamento de cada arquivo. */
  previousPanel: string
  currentPanel: string
  /** Rótulo de cada status no singular (selo na tabela, coluna "Status" do export). */
  status: Record<RowStatus, string>
  /** Rótulo no plural (cartões de totais, abas de filtro, abas do export). */
  plural: Record<RowStatus, string>
  /** Cartão com o total de linhas que não são "saída". */
  totalActive: string
  resultSubtitle: string
}

const MONTHLY_LABELS: ComparatorLabels = {
  previousPanel: 'Mês anterior',
  currentPanel: 'Mês atual',
  status: STATUS_LABELS,
  plural: { entrada: 'Entradas', saida: 'Saídas', alterado: 'Alterados', permanece: 'Permanecem sem alteração' },
  totalActive: 'Total de ativos',
  resultSubtitle: 'Confira entradas, saídas e alterações antes de exportar a planilha atualizada.',
}

/** Configuração de uma das seções do app (Fatura, Matriz, etc.). */
export interface ComparatorProfile {
  /** Id curto e único do perfil — usado como prefixo de ids de elementos e de nome de arquivo exportado. */
  id: string
  sectionTitle: string
  uploadPreviousLabel: string
  uploadCurrentLabel: string
  uploadDescription: string
  /** Formatos aceitos em cada um dos dois uploads. */
  previousAccept: FileExtension[]
  currentAccept: FileExtension[]
  labels: ComparatorLabels
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
    'Formatos aceitos: .xls, .xlsx e .pdf (com texto selecionável). As duas faturas devem ser da mesma operadora e do mesmo tipo de plano (saúde, vida ou previdência).',
  previousAccept: ALL_EXTENSIONS,
  currentAccept: ALL_EXTENSIONS,
  labels: MONTHLY_LABELS,
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
  uploadDescription: 'Formatos aceitos: .xls, .xlsx e .pdf (com texto selecionável). As duas planilhas de matriz devem ser da mesma empresa.',
  previousAccept: ALL_EXTENSIONS,
  currentAccept: ALL_EXTENSIONS,
  labels: MONTHLY_LABELS,
  identityFields: [
    { key: 'cpf', label: 'C.P.F.', keywords: ['c.p.f', 'cpf'], isCpf: true },
    { key: 'nometitular', label: 'Nometitular', keywords: ['nometitular', 'nome titular', 'titular'] },
    { key: 'nomedependente', label: 'Nomedependente', keywords: ['nomedependente', 'nome dependente', 'dependente'] },
    { key: 'plano', label: 'Plano', keywords: ['plano'] },
  ],
}

/**
 * Comparação mês a mês entre dois PDFs. A identidade é só o CPF, porque o
 * layout dos PDFs varia muito entre operadoras e nem todos trazem
 * carteirinha; as demais colunas (nome, plano, valor…) entram como campos
 * de comparação no mapeamento.
 */
export const PDF_PROFILE: ComparatorProfile = {
  id: 'pdf',
  sectionTitle: 'Comparador de PDF',
  uploadPreviousLabel: 'PDF anterior',
  uploadCurrentLabel: 'PDF atual',
  uploadDescription:
    'Envie dois PDFs com texto selecionável (gerados por sistema, não escaneados) — ex: a fatura da operadora do mês anterior e a do mês atual. Os beneficiários são casados pelo CPF.',
  previousAccept: ['.pdf'],
  currentAccept: ['.pdf'],
  labels: MONTHLY_LABELS,
  identityFields: [{ key: 'cpf', label: 'CPF', keywords: ['c.p.f', 'cpf'], isCpf: true }],
}

/**
 * Conferência de um PDF (ex: fatura da operadora) contra uma planilha (ex:
 * matriz da empresa) do mesmo mês: aponta quem está cobrado mas não consta
 * na planilha, quem está na planilha mas não foi cobrado, e quem está nos
 * dois com dados diferentes. Casamento só por CPF, já que fatura e matriz
 * não têm outros campos de identidade em comum.
 */
export const PDF_VS_SHEET_PROFILE: ComparatorProfile = {
  id: 'pdf-planilha',
  sectionTitle: 'Conferência PDF × Planilha',
  uploadPreviousLabel: 'PDF',
  uploadCurrentLabel: 'Planilha',
  uploadDescription:
    'Envie o PDF (ex: fatura da operadora) e a planilha (.xls ou .xlsx, ex: matriz da empresa) do mesmo mês. Os beneficiários são casados pelo CPF.',
  previousAccept: ['.pdf'],
  currentAccept: SPREADSHEET_EXTENSIONS,
  labels: {
    previousPanel: 'PDF',
    currentPanel: 'Planilha',
    status: { entrada: 'Só na planilha', saida: 'Só no PDF', alterado: 'Divergente', permanece: 'Confere' },
    plural: { entrada: 'Só na planilha', saida: 'Só no PDF', alterado: 'Divergentes', permanece: 'Conferem' },
    totalActive: 'Total na planilha',
    resultSubtitle:
      'Confira quem está só no PDF, só na planilha ou nos dois com dados diferentes antes de exportar.',
  },
  identityFields: [{ key: 'cpf', label: 'CPF', keywords: ['c.p.f', 'cpf'], isCpf: true }],
}
