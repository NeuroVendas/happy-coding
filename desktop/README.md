# Happy Coding =] Desktop

Protótipo do navegador desktop real para Windows. Esta pasta é separada do site/PWA.

## Estado atual — v0.4.0

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
- Downloads agora são tratados no processo principal via `session.will-download`.
- O usuário escolhe onde salvar por meio do diálogo nativo; o site remoto não recebe o caminho escolhido.
- Downloads iniciados sem gesto direto do usuário recebem confirmação extra.
- Arquivos potencialmente executáveis/perigosos (`.exe`, `.msi`, `.bat`, `.cmd`, `.ps1`, `.lnk`, `.jar`, `.iso` e outros da lista interna) recebem aviso explícito antes de continuar.
- Painel local de downloads mostra progresso, estado, origem e permite pausar/retomar quando o servidor suporta, cancelar e mostrar o arquivo concluído na pasta.
- O core de normalização de URL/título/ciclo de abas e o core de classificação de downloads têm testes unitários em `desktop/tests` e são executados no CI do repositório.

## Ainda não pronto

- Teste end-to-end dos downloads em Windows real, inclusive escolha de pasta, cancelamento e arquivos de diferentes tamanhos.
- Persistência da lista de downloads após reiniciar o aplicativo.
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
