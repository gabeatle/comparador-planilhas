import './App.css'
import { useTheme } from './hooks/useTheme'
import { ThemeToggle } from './components/ThemeToggle'
import { ComparatorSection } from './components/ComparatorSection'
import { FATURA_PROFILE, MATRIZ_PROFILE } from './comparatorProfiles'

/**
 * Componente raiz do app: renderiza o cabeçalho (uma vez) e as seções de
 * comparação — hoje Fatura e Matriz —, cada uma com seu próprio fluxo
 * completo e independente (ver `ComparatorSection`).
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
        <ComparatorSection profile={FATURA_PROFILE} />
        <ComparatorSection profile={MATRIZ_PROFILE} />
      </main>
    </div>
  )
}

export default App
