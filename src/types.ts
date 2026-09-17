/**
 * Definição de um campo de identidade (parte da chave usada para casar
 * beneficiários entre as duas planilhas). `keywords` são usadas por
 * `guessIdentityMapping` pra pré-preencher o mapeamento; `isCpf` marca o
 * único campo que recebe validação de dígito verificador e formatação de
 * CPF (ver `buildRecords` em lib/compare.ts).
 */
export interface IdentityFieldDef {
  key: string
  label: string
  keywords: string[]
  isCpf?: boolean
}

/** Mapeamento campo de identidade (por `key`) -> nome do cabeçalho escolhido pelo usuário, para uma única planilha. */
export type IdentityMapping = Record<string, string>

/**
 * Um campo definido pelo usuário para comparar entre as duas planilhas (além
 * dos campos de identidade, que são fixos por perfil). `previousColumn`/
 * `currentColumn` guardam, para cada planilha, qual cabeçalho corresponde a
 * este campo — os nomes podem ser diferentes entre as duas planilhas.
 */
export interface ComparisonField {
  id: string
  label: string
  previousColumn: string
  currentColumn: string
}

/** Problemas que uma linha de beneficiário pode ter — sinalizados na UI, nunca bloqueiam o processamento. */
export type IssueCode = 'cpf-vazio' | 'cpf-invalido' | 'chave-duplicada' | 'identidade-vazia'

/** Rótulos em português exibidos para cada tipo de problema, na coluna "Atenção". */
export const ISSUE_LABELS: Record<IssueCode, string> = {
  'cpf-vazio': 'CPF vazio',
  'cpf-invalido': 'CPF inválido',
  'chave-duplicada': 'Chave de identificação duplicada nesta planilha',
  'identidade-vazia': 'Campo de identidade vazio',
}

/**
 * Um beneficiário já normalizado a partir de uma linha de planilha (ver
 * `buildRecords` em lib/compare.ts). É a partir daqui que a comparação entre
 * as duas planilhas é feita.
 */
export interface BeneficiaryRecord {
  /** Identidade usada para casar este registro com o da outra planilha (concatenação dos campos de identidade). */
  key: string
  /** Valores de identidade para exibição, indexados pelo `key` de cada `IdentityFieldDef`. */
  identity: Record<string, string>
  /** Valores dos campos de comparação escolhidos pelo usuário, indexados pelo `id` de cada `ComparisonField`. */
  fields: Record<string, { display: string; numeric: number | null }>
  issues: IssueCode[]
  /** false quando `key` é um valor de fallback (gerado por CPF vazio) — usado só internamente pela checagem de chave duplicada. */
  hasRealKey: boolean
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
  fieldId: string
  label: string
  before: string
  after: string
}

/** Uma linha pronta para a tabela de resultado e para a planilha exportada. */
export interface ComparisonRow {
  status: RowStatus
  /** Valores de identidade exibidos, indexados pelo `key` de cada `IdentityFieldDef`. */
  identity: Record<string, string>
  /** Valores exibidos por campo de comparação, indexados pelo `id` de cada `ComparisonField`. */
  values: Record<string, string>
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
  /** Campos de identidade usados nesta rodada, na ordem em que devem ser exibidos/exportados. */
  identityFields: IdentityFieldDef[]
  /** Campos de comparação usados nesta rodada, na ordem em que devem ser exibidos/exportados. */
  fields: ComparisonField[]
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

/** Um arquivo escolhido pelo usuário e já lido (ver `UploadSlot` em components/UploadStep.tsx). */
export interface LoadedFile {
  file: File
  sheet: ParsedSheet
}

/**
 * Uma coluna do resultado do Unificador: o rótulo escolhido pelo usuário e,
 * para cada planilha enviada (indexada pelo id do slot de upload), qual
 * cabeçalho dela corresponde a esta coluna — vazio se aquela planilha não
 * tiver a informação (ver `lib/unify.ts`).
 */
export interface UnifyField {
  id: string
  label: string
  columnBySource: Record<string, string>
}

/** Uma linha do resultado do Unificador, já com os valores lidos conforme o mapeamento de colunas. */
export interface UnifyRow {
  /** Nome do arquivo de origem desta linha, para diferenciar de onde ela veio depois de empilhada com as outras. */
  sourceFileName: string
  /** Valores desta linha, indexados pelo `id` de cada `UnifyField`. */
  values: Record<string, string>
}
