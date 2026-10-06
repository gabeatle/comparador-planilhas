import './App.css'
import { useTheme } from './hooks/useTheme'
import { ThemeToggle } from './components/ThemeToggle'
import { ComparatorSection } from './components/ComparatorSection'
import { UnifySection } from './components/UnifySection'
import { PdfMergeSection } from './components/PdfMergeSection'
import { FATURA_PROFILE, MATRIZ_PROFILE, PDF_PROFILE, PDF_VS_SHEET_PROFILE } from './comparatorProfiles'

/**
 * Componente raiz do app: renderiza o cabeçalho (uma vez), as seções de
 * comparação — Fatura, Matriz, PDF e PDF × Planilha —, cada uma com seu
 * próprio fluxo completo e independente (ver `ComparatorSection`), o
 * Unificador de planilhas (ver `UnifySection`) e o Juntar PDFs (ver
 * `PdfMergeSection`). As seções ficam numa grade de duas colunas, em pares
 * relacionados (Fatura | Matriz, PDF | PDF × Planilha, Unificador | Juntar
 * PDFs); em telas estreitas a grade vira uma coluna só (ver `.sections`).
 */
function App() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__title">
          Comparador de <span>Planilhas</span> <small>· Benefícios</small>
        </div>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>

      <main className="app-main">
        <div className="sections">
          <ComparatorSection profile={FATURA_PROFILE} />
          <ComparatorSection profile={MATRIZ_PROFILE} />
          <ComparatorSection profile={PDF_PROFILE} />
          <ComparatorSection profile={PDF_VS_SHEET_PROFILE} />
          <UnifySection />
          <PdfMergeSection />
        </div>
      </main>
    </div>
  )
}

export default App
