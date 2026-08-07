import type { ColumnMapping, ParsedSheet } from '../types'
import { FIELD_KEYS, FIELD_LABELS } from '../types'

interface MappingPanelProps {
  panelId: string
  title: string
  sheet: ParsedSheet
  mapping: ColumnMapping
  onChange: (mapping: ColumnMapping) => void
}

/**
 * Painel de mapeamento de uma das duas planilhas: um <select> por campo
 * (Operadora, CPF, Plano, Valor, Fatura, Carteirinha) para o usuário indicar
 * qual coluna da planilha corresponde a cada campo, além de uma prévia das
 * 3 primeiras linhas para conferência visual.
 */
function MappingPanel({ panelId, title, sheet, mapping, onChange }: MappingPanelProps) {
  const previewRows = sheet.rows.slice(0, 3)

  return (
    <div className="mapping-panel">
      <h3>{title}</h3>
      <p className="mapping-panel__file">
        {sheet.fileName} · {sheet.rows.length} linhas
      </p>

      {FIELD_KEYS.map((field) => (
        <div className="field-row" key={field}>
          <label htmlFor={`${panelId}-${field}`}>{FIELD_LABELS[field]}</label>
          <select
            id={`${panelId}-${field}`}
            value={mapping[field]}
            onChange={(event) => onChange({ ...mapping, [field]: event.target.value })}
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
    </div>
  )
}

/**
 * Verifica se todos os 6 campos obrigatórios foram mapeados para alguma
 * coluna. Usado para só liberar o botão "Comparar planilhas" quando o
 * mapeamento das duas planilhas estiver completo.
 */
function isMappingComplete(mapping: ColumnMapping): boolean {
  return FIELD_KEYS.every((field) => mapping[field])
}

interface MappingStepProps {
  previousSheet: ParsedSheet
  currentSheet: ParsedSheet
  previousMapping: ColumnMapping
  currentMapping: ColumnMapping
  onPreviousMappingChange: (mapping: ColumnMapping) => void
  onCurrentMappingChange: (mapping: ColumnMapping) => void
  onBack: () => void
  onContinue: () => void
}

/**
 * Passo 2 do fluxo: confirmação/ajuste do mapeamento de colunas para as
 * duas planilhas antes de rodar a comparação. Os mapeamentos já vêm
 * pré-preenchidos por `guessMapping` (chamado no App ao entrar neste passo);
 * aqui o usuário só confere e corrige o que for necessário.
 */
export function MappingStep({
  previousSheet,
  currentSheet,
  previousMapping,
  currentMapping,
  onPreviousMappingChange,
  onCurrentMappingChange,
  onBack,
  onContinue,
}: MappingStepProps) {
  const canContinue = isMappingComplete(previousMapping) && isMappingComplete(currentMapping)

  return (
    <div className="card">
      <div>
        <h2>2. Mapeie as colunas</h2>
        <p className="card-subtitle">
          Indicamos automaticamente onde conseguimos reconhecer as colunas — confira e ajuste antes de
          comparar.
        </p>
      </div>

      <div className="mapping-grid">
        <MappingPanel
          panelId="previous"
          title="Mês anterior"
          sheet={previousSheet}
          mapping={previousMapping}
          onChange={onPreviousMappingChange}
        />
        <MappingPanel
          panelId="current"
          title="Mês atual"
          sheet={currentSheet}
          mapping={currentMapping}
          onChange={onCurrentMappingChange}
        />
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
