/** Os 6 campos que toda planilha de benefícios precisa ter mapeado. */
export const FIELD_KEYS = ['operadora', 'cpf', 'plano', 'valor', 'fatura', 'carteirinha'] as const

export type FieldKey = (typeof FIELD_KEYS)[number]

/** Rótulos em português exibidos na UI para cada campo (tela de mapeamento, tabela de resultado, export). */
export const FIELD_LABELS: Record<FieldKey, string> = {
  operadora: 'Operadora',
  cpf: 'CPF',
  plano: 'Plano',
  valor: 'Valor',
  fatura: 'Fatura',
  carteirinha: 'Nº da carteirinha',
}

/** Mapeamento campo -> nome do cabeçalho da planilha escolhido pelo usuário (ou '' se ainda não definido). */
export type ColumnMapping = Record<FieldKey, string>

/** Problemas que uma linha de beneficiário pode ter — sinalizados na UI, nunca bloqueiam o processamento. */
export type IssueCode = 'cpf-vazio' | 'cpf-invalido' | 'chave-duplicada' | 'campo-faltando'

/** Rótulos em português exibidos para cada tipo de problema, na coluna "Atenção". */
export const ISSUE_LABELS: Record<IssueCode, string> = {
  'cpf-vazio': 'CPF vazio',
  'cpf-invalido': 'CPF inválido',
  'chave-duplicada': 'CPF + carteirinha duplicado nesta planilha',
  'campo-faltando': 'Campo obrigatório vazio',
}

/**
 * Um beneficiário já normalizado a partir de uma linha de planilha (ver
 * `buildRecords` em lib/compare.ts). É a partir daqui que a comparação entre
 * as duas planilhas é feita.
 */
export interface BeneficiaryRecord {
  /** Identidade usada para casar este registro com o da outra planilha: `${cpfDigits}|${carteirinha}`. */
  key: string
  operadora: string
  /** CPF só com dígitos, usado para validação e para montar `key`. */
  cpfDigits: string
  /** CPF formatado (000.000.000-00) para exibição. */
  cpfDisplay: string
  plano: string
  /** Valor formatado para exibição (ex: "250,00"). */
  valorDisplay: string
  /** Valor convertido para número, usado na comparação; null se não foi possível interpretar. */
  valorNumber: number | null
  fatura: string
  carteirinha: string
  issues: IssueCode[]
}

/** Categoria de uma linha de resultado, atribuída por `compareMonths` em lib/compare.ts. */
export type RowStatus = 'entrada' | 'saida' | 'alterado' | 'permanece'

/** Rótulos em português exibidos para cada status (badges, abas, planilha exportada). */
export const STATUS_LABELS: Record<RowStatus, string> = {
  entrada: 'Entrada',
  saida: 'Saída',
  alterado: 'Alterado',
  permanece: 'Permanece',
}

/** Uma mudança de campo detectada entre o mês anterior e o mês atual (só existe em linhas "alterado"). */
export interface FieldChange {
  field: FieldKey
  before: string
  after: string
}

/** Uma linha pronta para a tabela de resultado e para a planilha exportada. */
export interface ComparisonRow {
  status: RowStatus
  cpfDisplay: string
  carteirinha: string
  operadora: string
  plano: string
  valorDisplay: string
  fatura: string
  /** Lista de campos que mudaram; vazia para entrada, saída e permanece. */
  changes: FieldChange[]
  issues: IssueCode[]
}

/** Contagem por categoria, exibida nos cartões de totais da tela de resultado e na aba "Resumo" do export. */
export interface ComparisonSummary {
  entradas: number
  saidas: number
  alterados: number
  /** Sem nenhuma mudança nos campos comparáveis. */
  permanecem: number
  /** Entradas + alterados + permanece (ou seja, todo mundo exceto quem saiu). */
  totalAtivos: number
}

export interface ComparisonResult {
  rows: ComparisonRow[]
  summary: ComparisonSummary
}

/** Tipos de valor que uma célula de planilha pode assumir depois de lida pelo SheetJS. */
export type CellValue = string | number | Date | undefined | null

/** Uma planilha lida e organizada em cabeçalhos + linhas (ver `readSpreadsheet` em lib/excel.ts). */
export interface ParsedSheet {
  fileName: string
  headers: string[]
  /** Cada linha é um objeto {nomeDoCabeçalho: valor}, na ordem em que aparecem na planilha original. */
  rows: Record<string, CellValue>[]
}
