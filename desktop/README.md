# Happy Coding =] Desktop

Protótipo do navegador desktop real para Windows. Esta pasta é separada do site/PWA.

## Estado atual — v0.3.0

- Interface privilegiada local (`chrome.html`) separada das páginas externas.
- Conteúdo remoto usa um `WebContentsView` por aba, com `nodeIntegration:false`, `contextIsolation:true`, `sandbox:true` e `webSecurity:true`.
- Abas múltiplas reais, com criação, ativação, fechamento e restauração da última aba fechada.
- Links/popup que pedem nova janela são convertidos em nova aba controlada; a janela remota não recebe privilégios Electron.
- Back/forward são independentes por aba usando `webContents.navigationHistory`.
- A barra recebe URL, título, estado de carregamento, erro e disponibilidade de voltar/avançar da aba ativa.
- Atalhos: `Ctrl+L`, `Ctrl+T`, `Ctrl+W`, `Ctrl+Tab`, `Ctrl+Shift+Tab`, `Ctrl+Shift+T`, `Ctrl+R`, `Alt+Left` e `Alt+Right`.
- Permissões de câmera, microfone, localização e similares continuam negadas por padrão nesta etapa.
- Navegação direta prioriza HTTPS. Endereços `http://` são elevados para HTTPS; esquemas perigosos/não suportados viram pesquisa.
- Textos viram pesquisa Google com SafeSearch ativo.
- IPC expõe apenas operações específicas e o processo principal valida o `sender`.
- O core de normalização de URL/título/ciclo de abas tem testes unitários em `desktop/tests` e é executado no CI do repositório.

## Ainda não pronto

- Downloads seguros com confirmação, progresso e lista de downloads.
- Favoritos/histórico persistentes integrados ao app desktop.
- Sessão de abas restaurada após reiniciar o aplicativo.
- Gerenciamento granular de permissões por site.
- Perfil e comunidade integrados sem misturar privilégios com páginas externas.
- Filtro de conteúdo em nível de rede/navegação.
- Atualização automática assinada e instalador Windows.
- Persistência segura de credenciais e testes end-to-end no Windows.

## Executar em desenvolvimento

Requer Node.js e npm:

```bash
cd desktop
npm install
npm run check
npm test
npm start
```

Nunca habilite Node.js para páginas externas e não desative `webSecurity` para "fazer funcionar". O frontend privilegiado deve continuar local e separado do conteúdo web.
