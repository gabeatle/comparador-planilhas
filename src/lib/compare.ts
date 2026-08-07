import type {
  BeneficiaryRecord,
  CellValue,
  ColumnMapping,
  ComparisonResult,
  ComparisonRow,
  ComparisonSummary,
  FieldChange,
  FieldKey,
  RowStatus,
} from '../types'
import { cellToDisplay, cellToNumber } from './format'
import { formatCpf, isValidCpf, normalizeCpf } from './cpf'

/**
 * Campos que, se mudarem entre as duas planilhas para o mesmo beneficiário,
 * fazem a linha ser classificada como "alterado". CPF e carteirinha não
 * entram aqui porque juntos formam a chave de identidade (ver `buildRecords`).
 */
const COMPARABLE_FIELDS: FieldKey[] = ['operadora', 'plano', 'valor', 'fatura']

/**
 * Contador usado para gerar chaves únicas para linhas sem CPF válido (ver
 * comentário dentro de `buildRecords`). Vive fora da função para garantir
 * que, mesmo comparando várias planilhas na mesma sessão, as chaves nunca
 * se repitam.
 */
let noKeyCounter = 0

/**
 * Converte as linhas cruas de uma planilha (já mapeadas coluna -> campo) em
 * registros de beneficiário prontos para comparação, aplicando o mapeamento
 * de colunas escolhido pelo usuário e validando cada linha.
 *
 * Cada registro recebe uma `key` que identifica o beneficiário entre as duas
 * planilhas: CPF normalizado + número da carteirinha (permite que a mesma
 * pessoa tenha mais de uma carteirinha/plano ativos ao mesmo tempo, cada um
 * tratado como um registro independente). Linhas sem CPF não podem ser
 * casadas com segurança, então recebem uma chave única (nunca vão "casar"
 * com nada na outra planilha) e ficam marcadas com o problema 'cpf-vazio'.
 *
 * Também detecta e marca (sem descartar) linhas com problemas: CPF vazio,
 * CPF com dígito verificador inválido, campos obrigatórios em branco, ou
 * chave duplicada dentro da mesma planilha.
 *
 * @param rows Linhas cruas lidas da planilha (uma por beneficiário).
 * @param mapping Qual coluna da planilha corresponde a cada campo (operadora, cpf, plano...).
 * @returns Lista de registros de beneficiário, cada um com sua lista de problemas encontrados.
 */
export function buildRecords(rows: Record<string, CellValue>[], mapping: ColumnMapping): BeneficiaryRecord[] {
  const records = rows.map((row): BeneficiaryRecord => {
    const cpfDigits = normalizeCpf(row[mapping.cpf])
    const carteirinha = cellToDisplay(row[mapping.carteirinha])
    const operadora = cellToDisplay(row[mapping.operadora])
    const plano = cellToDisplay(row[mapping.plano])
    const fatura = cellToDisplay(row[mapping.fatura])
    const valorDisplay = cellToDisplay(row[mapping.valor])
    const valorNumber = cellToNumber(row[mapping.valor])

    const issues: BeneficiaryRecord['issues'] = []
    if (!cpfDigits) issues.push('cpf-vazio')
    else if (!isValidCpf(cpfDigits)) issues.push('cpf-invalido')
    if (!operadora || !plano || !carteirinha) issues.push('campo-faltando')

    // Sem CPF não há como casar com segurança entre as duas planilhas: cada
    // linha recebe uma chave única para não ser confundida com outra pessoa.
    const key = cpfDigits ? `${cpfDigits}|${carteirinha.trim().toLowerCase()}` : `sem-cpf-${noKeyCounter++}`

    return {
      key,
      operadora,
      cpfDigits,
      cpfDisplay: cpfDigits ? formatCpf(cpfDigits) : cellToDisplay(row[mapping.cpf]),
      plano,
      valorDisplay,
      valorNumber,
      fatura,
      carteirinha,
      issues,
    }
  })

  // Segunda passada: marca como duplicada qualquer chave (CPF+carteirinha)
  // que apareça mais de uma vez na mesma planilha.
  const keyCounts = new Map<string, number>()
  records.forEach((record) => keyCounts.set(record.key, (keyCounts.get(record.key) ?? 0) + 1))
  records.forEach((record) => {
    if (record.cpfDigits && (keyCounts.get(record.key) ?? 0) > 1) {
      record.issues.push('chave-duplicada')
    }
  })

  return records
}

/**
 * Lê o valor de um campo comparável de um registro, devolvendo tanto a
 * versão para exibição (texto) quanto a numérica (só preenchida para
 * "valor", que é o único campo comparado numericamente).
 *
 * @param record Registro de beneficiário.
 * @param field Campo a ser lido.
 * @returns Valor em texto e, se aplicável, em número.
 */
function fieldValue(record: BeneficiaryRecord, field: FieldKey): { display: string; numeric: number | null } {
  switch (field) {
    case 'operadora':
      return { display: record.operadora, numeric: null }
    case 'plano':
      return { display: record.plano, numeric: null }
    case 'fatura':
      return { display: record.fatura, numeric: null }
    case 'valor':
      return { display: record.valorDisplay, numeric: record.valorNumber }
    default:
      return { display: '', numeric: null }
  }
}

/**
 * Compara o mesmo campo entre o registro do mês anterior e do mês atual de
 * um beneficiário, e diz se houve mudança relevante.
 *
 * O campo "valor" é comparado numericamente com uma margem de tolerância
 * (0,005) para absorver diferenças de arredondamento; os demais campos são
 * comparados como texto, ignorando maiúsculas/minúsculas e espaços nas
 * pontas (para não marcar como "alterado" uma diferença só de formatação).
 *
 * @param field Campo a comparar.
 * @param previous Registro do mês anterior.
 * @param current Registro do mês atual.
 * @returns Descrição da mudança (campo + valor antes/depois), ou null se não mudou.
 */
function fieldsDiffer(field: FieldKey, previous: BeneficiaryRecord, current: BeneficiaryRecord): FieldChange | null {
  const before = fieldValue(previous, field)
  const after = fieldValue(current, field)

  if (field === 'valor' && before.numeric !== null && after.numeric !== null) {
    return Math.abs(before.numeric - after.numeric) > 0.005
      ? { field, before: before.display, after: after.display }
      : null
  }

  const normalize = (value: string) => value.trim().toLocaleLowerCase('pt-BR')
  return normalize(before.display) !== normalize(after.display)
    ? { field, before: before.display, after: after.display }
    : null
}

/**
 * Monta uma linha de resultado (o formato usado na tela e na exportação) a
 * partir de um registro de beneficiário e do status já determinado.
 *
 * @param status Categoria da linha: entrada, saída, alterado ou permanece.
 * @param record Registro de beneficiário (do mês atual, exceto em caso de saída, onde é o do mês anterior).
 * @param changes Lista de campos que mudaram (vazio para entrada/saída/permanece).
 * @returns A linha de resultado pronta para exibição/exportação.
 */
function toComparisonRow(status: RowStatus, record: BeneficiaryRecord, changes: FieldChange[] = []): ComparisonRow {
  return {
    status,
    cpfDisplay: record.cpfDisplay,
    carteirinha: record.carteirinha,
    operadora: record.operadora,
    plano: record.plano,
    valorDisplay: record.valorDisplay,
    fatura: record.fatura,
    changes,
    issues: record.issues,
  }
}

/**
 * Função central do app: compara os beneficiários do mês anterior com os do
 * mês atual e classifica cada um em uma categoria.
 *
 * Regra de comparação (casamento por chave CPF+carteirinha, ver `buildRecords`):
 * - Chave só existe no mês atual -> **entrada** (adesão nova).
 * - Chave só existe no mês anterior -> **saída** (cancelamento).
 * - Chave existe nos dois, mas algum campo comparável mudou -> **alterado**.
 * - Chave existe nos dois, sem nenhuma mudança -> **permanece**.
 *
 * O resultado final é ordenado por CPF e inclui um resumo com a contagem de
 * cada categoria, usado nos cartões de totais da tela de resultado.
 *
 * @param previousRecords Registros de beneficiário da planilha do mês anterior.
 * @param currentRecords Registros de beneficiário da planilha do mês atual.
 * @returns As linhas de resultado classificadas e o resumo com os totais.
 */
export function compareMonths(previousRecords: BeneficiaryRecord[], currentRecords: BeneficiaryRecord[]): ComparisonResult {
  const previousMap = new Map(previousRecords.map((record) => [record.key, record]))
  const currentMap = new Map(currentRecords.map((record) => [record.key, record]))
  const allKeys = new Set<string>([...previousMap.keys(), ...currentMap.keys()])

  const rows: ComparisonRow[] = []

  for (const key of allKeys) {
    const previous = previousMap.get(key)
    const current = currentMap.get(key)

    if (current && !previous) {
      rows.push(toComparisonRow('entrada', current))
    } else if (previous && !current) {
      rows.push(toComparisonRow('saida', previous))
    } else if (previous && current) {
      const changes = COMPARABLE_FIELDS.map((field) => fieldsDiffer(field, previous, current)).filter(
        (change): change is FieldChange => change !== null,
      )
      const row = toComparisonRow(changes.length > 0 ? 'alterado' : 'permanece', current, changes)
      row.issues = Array.from(new Set([...previous.issues, ...current.issues]))
      rows.push(row)
    }
  }

  rows.sort((a, b) => a.cpfDisplay.localeCompare(b.cpfDisplay, 'pt-BR'))

  const summary: ComparisonSummary = {
    entradas: rows.filter((row) => row.status === 'entrada').length,
    saidas: rows.filter((row) => row.status === 'saida').length,
    alterados: rows.filter((row) => row.status === 'alterado').length,
    permanecem: rows.filter((row) => row.status === 'permanece').length,
    totalAtivos: rows.filter((row) => row.status !== 'saida').length,
  }

  return { rows, summary }
}
