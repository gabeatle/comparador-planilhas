import { useMemo, useState } from 'react'
import type { ComparisonResult } from '../types'
import { ISSUE_LABELS } from '../types'
import { exportComparison } from '../lib/exportResult'
import { StatusBadge } from './StatusBadge'

type TabKey = 'todos' | 'diferencas' | 'entrada' | 'saida' | 'alterado'

/** Abas de filtro exibidas acima da tabela de resultado, na ordem em que aparecem na tela. */
const TABS: { key: TabKey; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'diferencas', label: 'Diferenças' },
  { key: 'entrada', label: 'Entradas' },
  { key: 'saida', label: 'Saídas' },
  { key: 'alterado', label: 'Alterados' },
]

interface ResultStepProps {
  /** Prefixo único da seção (perfil), usado para evitar colisão de ids de elementos quando duas seções coexistem na página. */
  sectionId: string
  result: ComparisonResult
  onReset: () => void
}

/**
 * Passo 3 (final) do fluxo: mostra os totais da comparação, uma tabela
 * filtrável por categoria (Todos/Entradas/Saídas/Alterados) e o botão de
 * exportação da planilha final.
 */
export function ResultStep({ sectionId, result, onReset }: ResultStepProps) {
  const [tab, setTab] = useState<TabKey>('todos')
  const [format, setFormat] = useState<'xlsx' | 'xls'>('xlsx')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  /** Dispara a geração/download da planilha final e trata erros do processo. */
  const handleExport = async () => {
    setExporting(true)
    setExportError(null)
    try {
      await exportComparison(result, format, sectionId)
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Não foi possível gerar o arquivo.')
    } finally {
      setExporting(false)
    }
  }

  /** Linhas visíveis na tabela, filtradas pela aba selecionada. */
  const rows = useMemo(() => {
    if (tab === 'todos') return result.rows
    if (tab === 'diferencas') return result.rows.filter((row) => row.status !== 'permanece')
    return result.rows.filter((row) => row.status === tab)
  }, [result, tab])

  /** Contagem exibida entre parênteses em cada aba. */
  const counts: Record<TabKey, number> = {
    todos: result.rows.length,
    diferencas: result.summary.entradas + result.summary.saidas + result.summary.alterados,
    entrada: result.summary.entradas,
    saida: result.summary.saidas,
    alterado: result.summary.alterados,
  }

  return (
    <div className="card">
      <div>
        <h2>3. Resultado da comparação</h2>
        <p className="card-subtitle">
          Confira entradas, saídas e alterações antes de exportar a planilha atualizada.
        </p>
      </div>

      <div className="summary-grid">
        <div className="summary-tile" data-tone="good">
          <span className="summary-tile__value">{result.summary.entradas}</span>
          <span className="summary-tile__label">Entradas</span>
        </div>
        <div className="summary-tile" data-tone="critical">
          <span className="summary-tile__value">{result.summary.saidas}</span>
          <span className="summary-tile__label">Saídas</span>
        </div>
        <div className="summary-tile" data-tone="warning">
          <span className="summary-tile__value">{result.summary.alterados}</span>
          <span className="summary-tile__label">Alterados</span>
        </div>
        <div className="summary-tile" data-tone="primary">
          <span className="summary-tile__value">{result.summary.totalAtivos}</span>
          <span className="summary-tile__label">Total de ativos</span>
        </div>
      </div>

      <div role="tablist" className="tabs" aria-label="Filtrar resultado">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            className="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
          >
            {label} <span className="tab__count">({counts[key]})</span>
          </button>
        ))}
      </div>

      <div className="result-table-wrap">
        {rows.length === 0 ? (
          <p className="empty-state">Nenhum registro nesta categoria.</p>
        ) : (
          <table className="result-table">
            <thead>
              <tr>
                <th>Status</th>
                {result.identityFields.map((field) => (
                  <th key={field.key}>{field.label}</th>
                ))}
                {result.fields.map((field) => (
                  <th key={field.id}>{field.label}</th>
                ))}
                <th>Alterações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.status}-${index}`}>
                  <td>
                    <StatusBadge status={row.status} />
                  </td>
                  {result.identityFields.map((field) => (
                    <td key={field.key}>{row.identity[field.key] ?? ''}</td>
                  ))}
                  {result.fields.map((field) => (
                    <td key={field.id}>{row.values[field.id] ?? ''}</td>
                  ))}
                  <td className="changes-cell">
                    {row.changes.map((change) => (
                      <div key={change.fieldId}>
                        {change.label}: {change.before} → {change.after}
                      </div>
                    ))}
                    {row.issues.length > 0 && (
                      <span className="issue-note">
                        ⚠ {row.issues.map((issue) => ISSUE_LABELS[issue]).join('; ')}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="actions-row" style={{ justifyContent: 'space-between' }}>
        <button type="button" className="btn btn-ghost" onClick={onReset}>
          Nova comparação
        </button>
        <div className="export-row">
          <label htmlFor={`${sectionId}-export-format`}>Formato</label>
          <select
            id={`${sectionId}-export-format`}
            value={format}
            onChange={(event) => setFormat(event.target.value as 'xlsx' | 'xls')}
          >
            <option value="xlsx">.xlsx</option>
            <option value="xls">.xls</option>
          </select>
          <button type="button" className="btn btn-primary" disabled={exporting} onClick={handleExport}>
            {exporting ? 'Gerando arquivo…' : 'Baixar planilha atualizada'}
          </button>
          {exportError && <span className="field-error">{exportError}</span>}
        </div>
      </div>
    </div>
  )
}
