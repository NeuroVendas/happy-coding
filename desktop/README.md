# Happy Coding =] Desktop

Protótipo do navegador desktop real para Windows. Esta pasta é separada do site/PWA.

## Estado atual — v0.6.0

- UI privilegiada local separada das páginas externas.
- Cada aba remota usa `WebContentsView` com `nodeIntegration:false`, `contextIsolation:true`, `sandbox:true` e `webSecurity:true`.
- Abas múltiplas reais, popup/new-window convertido em aba controlada e back/forward independente por aba.
- Atalhos principais: `Ctrl+L`, `Ctrl+T`, `Ctrl+W`, `Ctrl+Tab`, `Ctrl+Shift+Tab`, `Ctrl+Shift+T`, `Ctrl+R`, `Ctrl+D`, `Alt+Left` e `Alt+Right`.
- Navegação direta prioriza HTTPS; texto vira pesquisa Google com SafeSearch.
- Downloads são controlados no processo principal. O usuário escolhe onde salvar; downloads automáticos e extensões sensíveis recebem aviso extra.
- Painel local de downloads mostra progresso/estado e oferece pausa/retomada quando suportada, cancelamento e “mostrar na pasta”.
- Favoritos e histórico desktop agora são persistidos localmente em `app.getPath('userData')/browser-library.json`.
- A página remota não recebe a biblioteca local; somente o chrome local acessa via IPC estreito.
- Favoritos: adicionar/remover, estrela na barra e lista local. Histórico: registro das navegações HTTPS, limite, painel local e limpeza explícita.
- A sessão das abas é salva em `browser-session.json` e restaura no máximo 10 URLs HTTPS após **fechamento limpo**.
- Se a execução anterior não terminou limpa, a restauração automática é desativada e o navegador abre a Home, evitando loop de crash.
- Cores/identidade Happy Coding preservadas.
- Cores, abas, downloads, biblioteca e sessão têm módulos testáveis no CI.

## Ainda precisa de teste real no Windows

- abrir/fechar/trocar muitas abas e restaurar com `Ctrl+Shift+T`;
- fechar o app normalmente e confirmar restauração das abas;
- simular encerramento abrupto e confirmar que abre apenas a Home;
- favoritos/histórico entre reinicializações;
- downloads pequenos/grandes, cancelar, pausar/retomar, executáveis/scripts e diálogo nativo;
- sites reais, login/cookies, páginas pesadas e crash de renderer.

## Próximas etapas

- permissões granulares por site mantendo câmera/mic/localização negados por padrão;
- filtro de navegação no processo principal;
- testes end-to-end no Windows;
- empacotamento/instalador e atualização segura;
- lista de downloads persistente (a lista atual fica apenas na sessão).

## Executar em desenvolvimento

```bash
cd desktop
npm install
npm run check
npm test
npm start
```

Nunca habilite Node.js para páginas externas e não desative `webSecurity`, sandbox ou context isolation para “fazer funcionar”.
