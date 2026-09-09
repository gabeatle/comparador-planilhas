import type { ComparisonField, IdentityFieldDef, IdentityMapping, ParsedSheet } from '../types'
import { normalizeHeader } from '../lib/mapping'

type Side = 'previous' | 'current'

/** Chave do `ComparisonField` que guarda a coluna deste lado (planilha anterior ou atual). */
function columnKey(side: Side): 'previousColumn' | 'currentColumn' {
  return side === 'previous' ? 'previousColumn' : 'currentColumn'
}

interface MappingPanelProps {
  panelId: string
  title: string
  sheet: ParsedSheet
  identityFields: IdentityFieldDef[]
  identity: IdentityMapping
  onIdentityChange: (identity: IdentityMapping) => void
  fields: ComparisonField[]
  side: Side
  availableHeaders: string[]
  onToggleColumn: (side: Side, column: string, checked: boolean) => void
}

/**
 * Painel de mapeamento de uma das duas planilhas: um select por campo de
 * identidade do perfil (fixos, com rótulo — CPF/carteirinha em Fatura,
 * CPF/nome/plano em Matriz), seguidos de uma lista com checkbox para cada
 * coluna desta planilha ("árvore" de seleção). Marcar uma coluna aqui pareia
 * automaticamente com a coluna de mesmo nome no outro painel (ver
 * `onToggleColumn` em `MappingStep`).
 */
function MappingPanel({
  panelId,
  title,
  sheet,
  identityFields,
  identity,
  onIdentityChange,
  fields,
  side,
  availableHeaders,
  onToggleColumn,
}: MappingPanelProps) {
  const key = columnKey(side)
  const selected = new Set(fields.map((field) => field[key]).filter(Boolean))

  return (
    <div className="mapping-panel">
      <h3>{title}</h3>
      <p className="mapping-panel__file">
        {sheet.fileName} · {sheet.rows.length} linhas
      </p>

      {identityFields.map((identityField) => (
        <div className="field-row" key={identityField.key}>
          <label htmlFor={`${panelId}-${identityField.key}`}>{identityField.label}</label>
          <select
            id={`${panelId}-${identityField.key}`}
            value={identity[identityField.key] ?? ''}
            onChange={(event) => onIdentityChange({ ...identity, [identityField.key]: event.target.value })}
          >
            <option value="">Selecione a coluna…</option>
            {sheet.headers.map((header) => (
              <option key={header} value={header}>
                {header}
              </option>
            ))}
          </select>
        </div>
      ))}

      <span className="field-row__label">Selecione as colunas a comparar</span>
      <div className="column-checklist">
        {availableHeaders.map((header) => (
          <label className="column-checklist__item" key={header}>
            <input
              type="checkbox"
              checked={selected.has(header)}
              onChange={(event) => onToggleColumn(side, header, event.target.checked)}
            />
            {header}
          </label>
        ))}
      </div>
    </div>
  )
}

interface PreviewPanelProps {
  sheet: ParsedSheet
}

/** Prévia das 3 primeiras linhas de uma planilha, para conferência visual do mapeamento. */
function PreviewPanel({ sheet }: PreviewPanelProps) {
  const previewRows = sheet.rows.slice(0, 3)

  return (
    <div className="preview-table-wrap">
      <table className="preview-table">
        <thead>
          <tr>
            {sheet.headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {previewRows.map((row, index) => (
            <tr key={index}>
              {sheet.headers.map((header) => (
                <td key={header}>{String(row[header] ?? '')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Verifica se todos os campos de identidade do perfil foram mapeados para alguma coluna. */
function isIdentityComplete(identity: IdentityMapping, identityFields: IdentityFieldDef[]): boolean {
  return identityFields.every((field) => identity[field.key])
}

let editorFieldIdCounter = 0

interface MappingStepProps {
  /** Prefixo único da seção (perfil), usado para evitar colisão de ids de elementos quando duas seções coexistem na página. */
  sectionId: string
  identityFields: IdentityFieldDef[]
  previousSheet: ParsedSheet
  currentSheet: ParsedSheet
  previousIdentity: IdentityMapping
  currentIdentity: IdentityMapping
  onPreviousIdentityChange: (identity: IdentityMapping) => void
  onCurrentIdentityChange: (identity: IdentityMapping) => void
  fields: ComparisonField[]
  onFieldsChange: (fields: ComparisonField[]) => void
  onBack: () => void
  onContinue: () => void
}

/**
 * Passo 2 do fluxo: confirmação/ajuste do mapeamento de identidade (definida
 * pelo perfil — CPF+carteirinha em Fatura, CPF+nome+plano em Matriz) e das
 * colunas de comparação para as duas planilhas antes de rodar a comparação.
 * A identidade já vem pré-preenchida (por `guessIdentityMapping`, chamado no
 * `ComparatorSection` ao entrar neste passo); aqui o usuário só confere e
 * corrige o que for necessário, além de marcar quais outras colunas comparar.
 */
export function MappingStep({
  sectionId,
  identityFields,
  previousSheet,
  currentSheet,
  previousIdentity,
  currentIdentity,
  onPreviousIdentityChange,
  onCurrentIdentityChange,
  fields,
  onFieldsChange,
  onBack,
  onContinue,
}: MappingStepProps) {
  const canContinue =
    isIdentityComplete(previousIdentity, identityFields) && isIdentityComplete(currentIdentity, identityFields)

  // As colunas já usadas para campos de identidade não aparecem na lista de colunas a comparar.
  const previousAvailableHeaders = previousSheet.headers.filter(
    (header) => !Object.values(previousIdentity).includes(header),
  )
  const currentAvailableHeaders = currentSheet.headers.filter(
    (header) => !Object.values(currentIdentity).includes(header),
  )

  /**
   * Marca ou desmarca uma coluna num dos painéis. Ao marcar, pareia
   * automaticamente com a coluna de mesmo nome (ignorando acento/caixa/
   * espaço) da outra planilha, se existir, criando um único campo de
   * comparação para o par. Ao desmarcar, remove o campo correspondente por
   * completo (dos dois lados).
   */
  const handleToggleColumn = (side: Side, column: string, checked: boolean) => {
    const key = columnKey(side)

    if (!checked) {
      onFieldsChange(fields.filter((field) => field[key] !== column))
      return
    }

    const otherKey = side === 'previous' ? 'currentColumn' : 'previousColumn'
    const otherHeaders = side === 'previous' ? currentAvailableHeaders : previousAvailableHeaders
    const normalizedColumn = normalizeHeader(column)
    const matchingOtherHeader = otherHeaders.find(
      (header) => normalizeHeader(header) === normalizedColumn && !fields.some((field) => field[otherKey] === header),
    )

    onFieldsChange([
      ...fields,
      {
        id: `field-${editorFieldIdCounter++}`,
        label: side === 'current' ? column : (matchingOtherHeader ?? column),
        previousColumn: side === 'previous' ? column : (matchingOtherHeader ?? ''),
        currentColumn: side === 'current' ? column : (matchingOtherHeader ?? ''),
      },
    ])
  }

  return (
    <div className="card">
      <div>
        <h2>2. Mapeie as colunas</h2>
        <p className="card-subtitle">
          Indicamos automaticamente as colunas de identidade — confira e ajuste antes de comparar. Marque
          abaixo quais outras colunas entram na comparação; colunas com o mesmo nome nas duas planilhas se
          pareiam automaticamente.
        </p>
      </div>

      <div className="mapping-grid">
        <MappingPanel
          panelId={`${sectionId}-previous`}
          title="Mês anterior"
          sheet={previousSheet}
          identityFields={identityFields}
          identity={previousIdentity}
          onIdentityChange={onPreviousIdentityChange}
          fields={fields}
          side="previous"
          availableHeaders={previousAvailableHeaders}
          onToggleColumn={handleToggleColumn}
        />
        <MappingPanel
          panelId={`${sectionId}-current`}
          title="Mês atual"
          sheet={currentSheet}
          identityFields={identityFields}
          identity={currentIdentity}
          onIdentityChange={onCurrentIdentityChange}
          fields={fields}
          side="current"
          availableHeaders={currentAvailableHeaders}
          onToggleColumn={handleToggleColumn}
        />
      </div>

      <div className="mapping-grid">
        <PreviewPanel sheet={previousSheet} />
        <PreviewPanel sheet={currentSheet} />
      </div>

      <div className="actions-row">
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          Voltar
        </button>
        <button type="button" className="btn btn-primary" disabled={!canContinue} onClick={onContinue}>
          Comparar planilhas
        </button>
      </div>
    </div>
  )
}
