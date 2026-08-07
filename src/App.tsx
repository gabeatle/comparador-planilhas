import { useMemo, useState } from 'react'
import './App.css'
import { useTheme } from './hooks/useTheme'
import { ThemeToggle } from './components/ThemeToggle'
import { UploadStep } from './components/UploadStep'
import type { LoadedFile } from './components/UploadStep'
import { MappingStep } from './components/MappingStep'
import { ResultStep } from './components/ResultStep'
import { guessMapping } from './lib/mapping'
import { buildRecords, compareMonths } from './lib/compare'
import type { ColumnMapping } from './types'

type Step = 'upload' | 'mapping' | 'result'

/** Ordem fixa dos passos do fluxo, usada para navegação e para os indicadores no topo da tela. */
const STEP_ORDER: Step[] = ['upload', 'mapping', 'result']

/** Rótulos exibidos nos indicadores de passo no topo da tela. */
const STEP_LABELS: Record<Step, string> = {
  upload: '1. Upload',
  mapping: '2. Mapeamento',
  result: '3. Resultado',
}

/**
 * Componente raiz do app: guarda o estado do fluxo inteiro (passo atual,
 * arquivos carregados, mapeamento de colunas) e decide qual tela mostrar.
 * O resultado da comparação só é calculado (e recalculado, se o usuário
 * voltar e mudar algo) quando o usuário chega ao passo "result".
 */
function App() {
  const { theme, toggleTheme } = useTheme()
  const [step, setStep] = useState<Step>('upload')

  const [previous, setPrevious] = useState<LoadedFile | null>(null)
  const [current, setCurrent] = useState<LoadedFile | null>(null)
  const [previousMapping, setPreviousMapping] = useState<ColumnMapping | null>(null)
  const [currentMapping, setCurrentMapping] = useState<ColumnMapping | null>(null)

  /**
   * Resultado da comparação, recalculado só quando o usuário está no passo
   * "result" (evita processar as planilhas antes da hora, por exemplo
   * enquanto ele ainda está ajustando o mapeamento de colunas).
   */
  const comparisonResult = useMemo(() => {
    if (step !== 'result' || !previous || !current || !previousMapping || !currentMapping) return null
    const previousRecords = buildRecords(previous.sheet.rows, previousMapping)
    const currentRecords = buildRecords(current.sheet.rows, currentMapping)
    return compareMonths(previousRecords, currentRecords)
  }, [step, previous, current, previousMapping, currentMapping])

  /**
   * Avança do upload para o mapeamento, pré-preenchendo o mapeamento de
   * colunas com a melhor tentativa automática (`guessMapping`) — mas só na
   * primeira vez (`existing ?? ...`), para não sobrescrever ajustes manuais
   * do usuário caso ele volte a este passo depois.
   */
  const handleGoToMapping = () => {
    if (!previous || !current) return
    setPreviousMapping((existing) => existing ?? guessMapping(previous.sheet.headers))
    setCurrentMapping((existing) => existing ?? guessMapping(current.sheet.headers))
    setStep('mapping')
  }

  /** Limpa todo o estado e volta para o início, para o usuário fazer uma nova comparação. */
  const handleReset = () => {
    setStep('upload')
    setPrevious(null)
    setCurrent(null)
    setPreviousMapping(null)
    setCurrentMapping(null)
  }

  const currentIndex = STEP_ORDER.indexOf(step)

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__title">
          Comparador de <span>Planilhas</span> <small>· Benefícios</small>
        </div>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>

      <main className="app-main">
        <div className="steps">
          {STEP_ORDER.map((s, index) => (
            <span key={s} className="step-pill" data-active={s === step} data-done={index < currentIndex}>
              {STEP_LABELS[s]}
            </span>
          ))}
        </div>

        {step === 'upload' && (
          <UploadStep
            previous={previous}
            current={current}
            onPreviousChange={setPrevious}
            onCurrentChange={setCurrent}
            onContinue={handleGoToMapping}
          />
        )}

        {step === 'mapping' && previous && current && previousMapping && currentMapping && (
          <MappingStep
            previousSheet={previous.sheet}
            currentSheet={current.sheet}
            previousMapping={previousMapping}
            currentMapping={currentMapping}
            onPreviousMappingChange={setPreviousMapping}
            onCurrentMappingChange={setCurrentMapping}
            onBack={() => setStep('upload')}
            onContinue={() => setStep('result')}
          />
        )}

        {step === 'result' && comparisonResult && <ResultStep result={comparisonResult} onReset={handleReset} />}
      </main>
    </div>
  )
}

export default App
