import { useMemo, useState } from 'react'
import type { ComparisonResult } from '../types'
import { FIELD_LABELS, ISSUE_LABELS } from '../types'
import { exportComparison } from '../lib/exportResult'
import { StatusBadge } from './StatusBadge'

type TabKey = 'todos' | 'entrada' | 'saida' | 'alterado'

/** Abas de filtro exibidas acima da tabela de resultado, na ordem em que aparecem na tela. */
const TABS: { key: TabKey; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'entrada', label: 'Entradas' },
  { key: 'saida', label: 'Saídas' },
  { key: 'alterado', label: 'Alterados' },
]

interface ResultStepProps {
  result: ComparisonResult
  onReset: () => void
}

/**
 * Passo 3 (final) do fluxo: mostra os totais da comparação, uma tabela
 * filtrável por categoria (Todos/Entradas/Saídas/Alterados) e o botão de
 * exportação da planilha final.
 */
export function ResultStep({ result, onReset }: ResultStepProps) {
  const [tab, setTab] = useState<TabKey>('todos')
  const [format, setFormat] = useState<'xlsx' | 'xls'>('xlsx')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  /** Dispara a geração/download da planilha final e trata erros do processo. */
  const handleExport = async () => {
    setExporting(true)
    setExportError(null)
    try {
      await exportComparison(result, format)
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Não foi possível gerar o arquivo.')
    } finally {
      setExporting(false)
    }
  }

  /** Linhas visíveis na tabela, filtradas pela aba selecionada. */
  const rows = useMemo(() => {
    if (tab === 'todos') return result.rows
    return result.rows.filter((row) => row.status === tab)
  }, [result, tab])

  /** Contagem exibida entre parênteses em cada aba. */
  const counts: Record<TabKey, number> = {
    todos: result.rows.length,
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
                <th>CPF</th>
                <th>Operadora</th>
                <th>Plano</th>
                <th>Valor</th>
                <th>Fatura</th>
                <th>Nº carteirinha</th>
                <th>Alterações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.cpfDisplay}-${row.carteirinha}-${row.status}-${index}`}>
                  <td>
                    <StatusBadge status={row.status} />
                  </td>
                  <td>{row.cpfDisplay}</td>
                  <td>{row.operadora}</td>
                  <td>{row.plano}</td>
                  <td>{row.valorDisplay}</td>
                  <td>{row.fatura}</td>
                  <td>{row.carteirinha}</td>
                  <td className="changes-cell">
                    {row.changes.map((change) => (
                      <div key={change.field}>
                        {FIELD_LABELS[change.field]}: {change.before} → {change.after}
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
          <label htmlFor="export-format">Formato</label>
          <select id="export-format" value={format} onChange={(event) => setFormat(event.target.value as 'xlsx' | 'xls')}>
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
