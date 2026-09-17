import { useState } from 'react'
import type { UnifyField, UnifyRow } from '../types'
import { exportUnified } from '../lib/exportUnify'

interface UnifyResultStepProps {
  rows: UnifyRow[]
  fields: UnifyField[]
  onReset: () => void
}

/**
 * Passo 3 (final) do fluxo do Unificador: mostra a tabela com todas as
 * linhas já unificadas e o botão de exportação da planilha final.
 */
export function UnifyResultStep({ rows, fields, onReset }: UnifyResultStepProps) {
  const [format, setFormat] = useState<'xlsx' | 'xls'>('xlsx')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  /** Dispara a geração/download da planilha unificada e trata erros do processo. */
  const handleExport = async () => {
    setExporting(true)
    setExportError(null)
    try {
      await exportUnified(rows, fields, format)
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Não foi possível gerar o arquivo.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="card">
      <div>
        <h2>3. Planilha unificada</h2>
        <p className="card-subtitle">
          {rows.length} linha{rows.length === 1 ? '' : 's'} juntando todas as planilhas enviadas.
        </p>
      </div>

      <div className="result-table-wrap">
        {rows.length === 0 ? (
          <p className="empty-state">Nenhuma linha encontrada nas planilhas enviadas.</p>
        ) : (
          <table className="result-table">
            <thead>
              <tr>
                <th>Origem</th>
                {fields.map((field) => (
                  <th key={field.id}>{field.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index}>
                  <td>{row.sourceFileName}</td>
                  {fields.map((field) => (
                    <td key={field.id}>{row.values[field.id] ?? ''}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="actions-row" style={{ justifyContent: 'space-between' }}>
        <button type="button" className="btn btn-ghost" onClick={onReset}>
          Nova unificação
        </button>
        <div className="export-row">
          <label htmlFor="unify-export-format">Formato</label>
          <select
            id="unify-export-format"
            value={format}
            onChange={(event) => setFormat(event.target.value as 'xlsx' | 'xls')}
          >
            <option value="xlsx">.xlsx</option>
            <option value="xls">.xls</option>
          </select>
          <button type="button" className="btn btn-primary" disabled={exporting} onClick={handleExport}>
            {exporting ? 'Gerando arquivo…' : 'Baixar planilha unificada'}
          </button>
          {exportError && <span className="field-error">{exportError}</span>}
        </div>
      </div>
    </div>
  )
}
