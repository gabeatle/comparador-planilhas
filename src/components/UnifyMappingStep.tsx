import type { ParsedSheet, UnifyField } from '../types'

export interface UnifyMappingSource {
  id: string
  label: string
  sheet: ParsedSheet
}

/** Duas colunas com o mesmo nome (ignorando maiúsculas/minúsculas e espaço nas pontas) colidiriam na exportação. */
function hasDuplicateLabels(fields: UnifyField[]): boolean {
  const seen = new Set<string>()
  for (const field of fields) {
    const label = field.label.trim().toLocaleLowerCase('pt-BR')
    if (seen.has(label)) return true
    seen.add(label)
  }
  return false
}

let mappingFieldIdCounter = 0

interface UnifyMappingStepProps {
  sources: UnifyMappingSource[]
  fields: UnifyField[]
  onFieldsChange: (fields: UnifyField[]) => void
  onBack: () => void
  onContinue: () => void
}

/**
 * Passo 2 do fluxo do Unificador: cada linha da tabela abaixo vira uma
 * coluna do resultado unificado. O usuário confirma/ajusta, para cada
 * planilha enviada, qual cabeçalho dela corresponde a cada coluna (já
 * pré-preenchido por `guessUnifyFields`), e pode adicionar ou remover
 * colunas. Uma planilha sem cabeçalho correspondente fica em branco naquela
 * coluna — não bloqueia a unificação.
 */
export function UnifyMappingStep({ sources, fields, onFieldsChange, onBack, onContinue }: UnifyMappingStepProps) {
  const duplicateLabels = hasDuplicateLabels(fields)
  const canContinue =
    fields.length > 0 &&
    !duplicateLabels &&
    fields.every((field) => field.label.trim() !== '' && Object.values(field.columnBySource).some(Boolean))

  const handleLabelChange = (fieldId: string, label: string) => {
    onFieldsChange(fields.map((field) => (field.id === fieldId ? { ...field, label } : field)))
  }

  const handleColumnChange = (fieldId: string, sourceId: string, column: string) => {
    onFieldsChange(
      fields.map((field) =>
        field.id === fieldId ? { ...field, columnBySource: { ...field.columnBySource, [sourceId]: column } } : field,
      ),
    )
  }

  const handleAddField = () => {
    onFieldsChange([...fields, { id: `unify-mapping-field-${mappingFieldIdCounter++}`, label: '', columnBySource: {} }])
  }

  const handleRemoveField = (fieldId: string) => {
    onFieldsChange(fields.filter((field) => field.id !== fieldId))
  }

  return (
    <div className="card">
      <div>
        <h2>2. Mapeie as colunas</h2>
        <p className="card-subtitle">
          Cada linha vira uma coluna na planilha unificada. Escolha, para cada planilha enviada, qual coluna
          corresponde a ela — deixe em "—" se aquela planilha não tiver essa informação.
        </p>
      </div>

      <div className="unify-mapping-table-wrap">
        <table className="unify-mapping-table">
          <thead>
            <tr>
              <th>Coluna unificada</th>
              {sources.map((source) => (
                <th key={source.id}>{source.label}</th>
              ))}
              <th aria-label="Remover" />
            </tr>
          </thead>
          <tbody>
            {fields.map((field) => (
              <tr key={field.id}>
                <td>
                  <input
                    type="text"
                    value={field.label}
                    placeholder="Nome da coluna"
                    onChange={(event) => handleLabelChange(field.id, event.target.value)}
                  />
                </td>
                {sources.map((source) => (
                  <td key={source.id}>
                    <select
                      value={field.columnBySource[source.id] ?? ''}
                      onChange={(event) => handleColumnChange(field.id, source.id, event.target.value)}
                    >
                      <option value="">—</option>
                      {source.sheet.headers.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </td>
                ))}
                <td>
                  <button
                    type="button"
                    className="unify-remove-field"
                    aria-label="Remover coluna"
                    onClick={() => handleRemoveField(field.id)}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {duplicateLabels && <span className="field-error">Duas colunas unificadas não podem ter o mesmo nome.</span>}

      <div className="actions-row" style={{ justifyContent: 'space-between' }}>
        <button type="button" className="btn btn-ghost" onClick={handleAddField}>
          + Adicionar coluna
        </button>
        <div className="actions-row">
          <button type="button" className="btn btn-ghost" onClick={onBack}>
            Voltar
          </button>
          <button type="button" className="btn btn-primary" disabled={!canContinue} onClick={onContinue}>
            Unificar planilhas
          </button>
        </div>
      </div>
    </div>
  )
}
