import type {
  BeneficiaryRecord,
  CellValue,
  ComparisonField,
  ComparisonResult,
  ComparisonRow,
  ComparisonSummary,
  FieldChange,
  IdentityFieldDef,
  IdentityMapping,
  RowStatus,
} from '../types'
import { cellToDisplay, cellToNumber } from './format'
import { formatCpf, isValidCpf, normalizeCpf } from './cpf'

/**
 * Contador usado para gerar chaves únicas para linhas sem CPF válido (ver
 * comentário dentro de `buildRecords`). Vive fora da função para garantir
 * que, mesmo comparando várias planilhas na mesma sessão, as chaves nunca
 * se repitam.
 */
let noKeyCounter = 0

/**
 * Converte as linhas cruas de uma planilha em registros de beneficiário
 * prontos para comparação, aplicando o mapeamento de identidade do perfil
 * (CPF + carteirinha em Fatura, CPF + nome + plano em Matriz, etc.) e os
 * campos de comparação escolhidos pelo usuário, e validando cada linha.
 *
 * Cada registro recebe uma `key` que identifica o beneficiário entre as duas
 * planilhas: a concatenação dos valores de todos os campos de identidade, na
 * ordem de `identityFields` (permite que a mesma pessoa apareça mais de uma
 * vez com identidade diferente — ex: dois planos — cada uma tratada como um
 * registro independente). O campo com `isCpf: true` recebe validação extra
 * (dígito verificador); se estiver vazio, a linha não pode ser casada com
 * segurança e recebe uma chave única (nunca vai "casar" com nada na outra
 * planilha).
 *
 * Também detecta e marca (sem descartar) linhas com problemas: CPF vazio,
 * CPF com dígito verificador inválido, algum outro campo de identidade em
 * branco, ou chave duplicada dentro da mesma planilha.
 *
 * @param rows Linhas cruas lidas da planilha (uma por beneficiário).
 * @param identity Qual coluna da planilha corresponde a cada campo de identidade.
 * @param identityFields Campos de identidade do perfil (define quais colunas formam a chave e a ordem delas).
 * @param fields Campos de comparação escolhidos pelo usuário, com a coluna desta planilha para cada um.
 * @param side Se estas linhas são da planilha do mês anterior ou do mês atual (define qual coluna de `fields` ler).
 * @returns Lista de registros de beneficiário, cada um com sua lista de problemas encontrados.
 */
export function buildRecords(
  rows: Record<string, CellValue>[],
  identity: IdentityMapping,
  identityFields: IdentityFieldDef[],
  fields: ComparisonField[],
  side: 'previous' | 'current',
): BeneficiaryRecord[] {
  const records = rows.map((row): BeneficiaryRecord => {
    const issues: BeneficiaryRecord['issues'] = []
    const identityValues: Record<string, string> = {}
    const keyParts: string[] = []
    let hasRealKey = true

    for (const field of identityFields) {
      const rawValue = row[identity[field.key]]
      if (field.isCpf) {
        const digits = normalizeCpf(rawValue)
        identityValues[field.key] = digits ? formatCpf(digits) : cellToDisplay(rawValue)
        if (!digits) {
          issues.push('cpf-vazio')
          hasRealKey = false
        } else if (!isValidCpf(digits)) {
          issues.push('cpf-invalido')
        }
        keyParts.push(digits)
      } else {
        const display = cellToDisplay(rawValue)
        identityValues[field.key] = display
        if (!display) issues.push('identidade-vazia')
        keyParts.push(display.trim().toLowerCase())
      }
    }

    // Sem uma identidade completa (CPF vazio) não há como casar com
    // segurança entre as duas planilhas: a linha recebe uma chave única
    // para não ser confundida com outra pessoa.
    const key = hasRealKey ? keyParts.join('|') : `sem-chave-${noKeyCounter++}`

    const fieldValues: BeneficiaryRecord['fields'] = {}
    for (const field of fields) {
      const column = side === 'previous' ? field.previousColumn : field.currentColumn
      fieldValues[field.id] = {
        display: cellToDisplay(row[column]),
        numeric: cellToNumber(row[column]),
      }
    }

    return {
      key,
      identity: identityValues,
      fields: fieldValues,
      issues,
      hasRealKey,
    }
  })

  // Segunda passada: marca como duplicada qualquer chave real (identidade
  // completa) que apareça mais de uma vez na mesma planilha.
  const keyCounts = new Map<string, number>()
  records.forEach((record) => keyCounts.set(record.key, (keyCounts.get(record.key) ?? 0) + 1))
  records.forEach((record) => {
    if (record.hasRealKey && (keyCounts.get(record.key) ?? 0) > 1) {
      record.issues.push('chave-duplicada')
    }
  })

  return records
}

/**
 * Compara o mesmo campo entre o registro do mês anterior e do mês atual de
 * um beneficiário, e diz se houve mudança relevante.
 *
 * Quando o campo é reconhecido como número dos dois lados (ver
 * `cellToNumber`), a comparação é numérica com uma margem de tolerância
 * (0,005) para absorver diferenças de arredondamento; caso contrário, é
 * comparado como texto, ignorando maiúsculas/minúsculas e espaços nas pontas
 * (para não marcar como "alterado" uma diferença só de formatação).
 *
 * @param field Campo de comparação.
 * @param previous Registro do mês anterior.
 * @param current Registro do mês atual.
 * @returns Descrição da mudança (campo + valor antes/depois), ou null se não mudou.
 */
function fieldsDiffer(field: ComparisonField, previous: BeneficiaryRecord, current: BeneficiaryRecord): FieldChange | null {
  const before = previous.fields[field.id]
  const after = current.fields[field.id]

  if (before.numeric !== null && after.numeric !== null) {
    return Math.abs(before.numeric - after.numeric) > 0.005
      ? { fieldId: field.id, label: field.label, before: before.display, after: after.display }
      : null
  }

  /** Ignora espaço nas pontas e caixa, para não marcar como diferença uma variação só de formatação. */
  const normalize = (value: string) => value.trim().toLocaleLowerCase('pt-BR')
  return normalize(before.display) !== normalize(after.display)
    ? { fieldId: field.id, label: field.label, before: before.display, after: after.display }
    : null
}

/**
 * Monta uma linha de resultado (o formato usado na tela e na exportação) a
 * partir de um registro de beneficiário e do status já determinado.
 *
 * @param status Categoria da linha: entrada, saída, alterado ou permanece.
 * @param record Registro de beneficiário (do mês atual, exceto em caso de saída, onde é o do mês anterior).
 * @param fields Campos de comparação, na ordem em que devem aparecer na linha.
 * @param changes Lista de campos que mudaram (vazio para entrada/saída/permanece).
 * @returns A linha de resultado pronta para exibição/exportação.
 */
function toComparisonRow(
  status: RowStatus,
  record: BeneficiaryRecord,
  fields: ComparisonField[],
  changes: FieldChange[] = [],
): ComparisonRow {
  const values: Record<string, string> = {}
  for (const field of fields) {
    values[field.id] = record.fields[field.id]?.display ?? ''
  }

  return {
    status,
    identity: record.identity,
    values,
    changes,
    issues: record.issues,
  }
}

/**
 * Função central do app: compara os beneficiários do mês anterior com os do
 * mês atual e classifica cada um em uma categoria.
 *
 * Regra de comparação (casamento pela chave de identidade, ver `buildRecords`):
 * - Chave só existe no mês atual -> **entrada** (adesão nova).
 * - Chave só existe no mês anterior -> **saída** (cancelamento).
 * - Chave existe nos dois, mas algum campo de comparação mudou -> **alterado**.
 * - Chave existe nos dois, sem nenhuma mudança -> **permanece**.
 *
 * O resultado final é ordenado pelo campo de identidade marcado como CPF (ou
 * pelo primeiro campo de identidade, se nenhum for CPF) e inclui um resumo
 * com a contagem de cada categoria, usado nos cartões de totais da tela de
 * resultado.
 *
 * @param previousRecords Registros de beneficiário da planilha do mês anterior.
 * @param currentRecords Registros de beneficiário da planilha do mês atual.
 * @param identityFields Campos de identidade do perfil.
 * @param fields Campos de comparação escolhidos pelo usuário.
 * @returns As linhas de resultado classificadas, os campos usados e o resumo com os totais.
 */
export function compareMonths(
  previousRecords: BeneficiaryRecord[],
  currentRecords: BeneficiaryRecord[],
  identityFields: IdentityFieldDef[],
  fields: ComparisonField[],
): ComparisonResult {
  const previousMap = new Map(previousRecords.map((record) => [record.key, record]))
  const currentMap = new Map(currentRecords.map((record) => [record.key, record]))
  const allKeys = new Set<string>([...previousMap.keys(), ...currentMap.keys()])

  const rows: ComparisonRow[] = []

  for (const key of allKeys) {
    const previous = previousMap.get(key)
    const current = currentMap.get(key)

    if (current && !previous) {
      rows.push(toComparisonRow('entrada', current, fields))
    } else if (previous && !current) {
      rows.push(toComparisonRow('saida', previous, fields))
    } else if (previous && current) {
      const changes = fields
        .map((field) => fieldsDiffer(field, previous, current))
        .filter((change): change is FieldChange => change !== null)
      const row = toComparisonRow(changes.length > 0 ? 'alterado' : 'permanece', current, fields, changes)
      row.issues = Array.from(new Set([...previous.issues, ...current.issues]))
      rows.push(row)
    }
  }

  const sortField = identityFields.find((field) => field.isCpf) ?? identityFields[0]
  rows.sort((a, b) => a.identity[sortField.key].localeCompare(b.identity[sortField.key], 'pt-BR'))

  const summary: ComparisonSummary = {
    entradas: rows.filter((row) => row.status === 'entrada').length,
    saidas: rows.filter((row) => row.status === 'saida').length,
    alterados: rows.filter((row) => row.status === 'alterado').length,
    permanecem: rows.filter((row) => row.status === 'permanece').length,
    totalAtivos: rows.filter((row) => row.status !== 'saida').length,
  }

  return { rows, identityFields, fields, summary }
}
