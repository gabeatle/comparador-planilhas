import { useState } from 'react'
import './App.css'
import { useTheme } from './hooks/useTheme'
import { ThemeToggle } from './components/ThemeToggle'
import { ComparatorSection } from './components/ComparatorSection'
import type { Step } from './components/ComparatorSection'
import { UnifySection } from './components/UnifySection'
import { FATURA_PROFILE, MATRIZ_PROFILE } from './comparatorProfiles'

/**
 * Componente raiz do app: renderiza o cabeçalho (uma vez), as seções de
 * comparação — hoje Fatura e Matriz —, cada uma com seu próprio fluxo
 * completo e independente (ver `ComparatorSection`), e o Unificador de
 * planilhas (ver `UnifySection`). Acompanha só o passo atual de cada
 * comparador (não o estado inteiro) para decidir o layout: quando os dois
 * chegam no passo de resultado ao mesmo tempo, eles passam a ficar lado a
 * lado em vez de empilhados, pra não confundir qual resultado é de qual
 * planilha.
 */
function App() {
  const { theme, toggleTheme } = useTheme()
  const [faturaStep, setFaturaStep] = useState<Step>('upload')
  const [matrizStep, setMatrizStep] = useState<Step>('upload')

  const bothAtResult = faturaStep === 'result' && matrizStep === 'result'

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__title">
          Comparador de <span>Planilhas</span> <small>· Benefícios</small>
        </div>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>

      <main className={bothAtResult ? 'app-main app-main--split' : 'app-main'}>
        <div className={bothAtResult ? 'comparators comparators--split' : 'comparators'}>
          <ComparatorSection profile={FATURA_PROFILE} onStepChange={setFaturaStep} />
          <ComparatorSection profile={MATRIZ_PROFILE} onStepChange={setMatrizStep} />
        </div>
        <UnifySection />
      </main>
    </div>
  )
}

export default App
