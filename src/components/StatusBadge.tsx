import type { CSSProperties } from 'react'
import type { RowStatus } from '../types'
import { STATUS_LABELS } from '../types'

/**
 * Cor do indicador (bolinha) de cada status. Servem só como reforço visual —
 * o texto do rótulo (STATUS_LABELS) é sempre exibido junto, então a
 * informação nunca depende só da cor.
 */
const DOT_COLORS: Record<RowStatus, string> = {
  entrada: 'var(--status-good)',
  saida: 'var(--status-critical)',
  alterado: 'var(--status-warning)',
  permanece: 'var(--status-neutral)',
}

/**
 * Selo colorido que mostra o status de uma linha de resultado (Entrada,
 * Saída, Alterado ou Permanece), com uma bolinha indicativa + o nome por
 * extenso.
 */
export function StatusBadge({ status }: { status: RowStatus }) {
  const style = { '--dot-color': DOT_COLORS[status] } as CSSProperties
  return (
    <span className="badge" style={style}>
      {STATUS_LABELS[status]}
    </span>
  )
}
