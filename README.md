# React + TypeScript + Vite

Este modelo fornece uma configuração mínima para fazer o React funcionar no Vite com HMR e algumas regras do Oxlint.

Atualmente, dois plugins oficiais estão disponíveis:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## Compilador React

O compilador React não está habilitado neste modelo devido ao seu impacto no desempenho de desenvolvimento e compilação. Para adicioná-lo,[consulte esta documentação](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

Se você estiver desenvolvendo um aplicativo de produção, recomendamos habilitar as regras de lint com reconhecimento de tipos instalando ``oxlint-tsgolinte`` editando ``.oxlintrc.json``:
```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

Consulte a [documentação das regras do Oxlint ](https://oxc.rs/docs/guide/usage/linter/rules) para obter a lista completa de regras e categorias.
