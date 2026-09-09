# Happy Coding =] Desktop

Navegador desktop real para Windows, separado da camada web/PWA do workspace.

## Estado atual — v0.9.0

- UI privilegiada local separada das páginas externas.
- Cada aba remota usa `WebContentsView` com `nodeIntegration:false`, `contextIsolation:true`, `sandbox:true` e `webSecurity:true`.
- Abas múltiplas reais na mesma janela, com criar, ativar, fechar, restaurar aba fechada e popup/new-window convertido em aba interna controlada.
- Back/forward são independentes por aba usando `navigationHistory`.
- Atalhos principais: `Ctrl+L`, `Ctrl+T`, `Ctrl+W`, `Ctrl+Tab`, `Ctrl+Shift+Tab`, `Ctrl+Shift+T`, `Ctrl+R`, `Ctrl+D`, `Ctrl+J`, `Ctrl+H`, `Alt+Left` e `Alt+Right`.
- A Home detecta o Electron e não desenha uma segunda barra de navegador falsa.
- Texto digitado na barra Desktop é encaminhado para a Busca Happy Coding; a interface não expõe o provedor de busca como parte da marca.
- Navegação direta prioriza HTTPS e páginas externas continuam isoladas.
- Downloads são controlados no processo principal. O usuário escolhe onde salvar; downloads automáticos e extensões sensíveis recebem aviso extra.
- Painel local de downloads mostra progresso/estado e oferece pausa/retomada quando suportada, cancelamento e “mostrar na pasta”.
- Favoritos e histórico Desktop são persistidos localmente em `app.getPath('userData')/browser-library.json`.
- A página remota não recebe a biblioteca local; somente o chrome local acessa via IPC estreito.
- A sessão das abas é salva em `browser-session.json` e restaura no máximo 10 URLs HTTPS após fechamento limpo.
- Se a execução anterior não terminou limpa, a restauração automática é desativada e o navegador abre a Home, evitando loop de crash.
- Windows x64 é empacotado com Electron Forge + Squirrel.Windows e ZIP portátil.
- A partir da v0.9.0, builds instaladas pelo `HappyCoding-Setup.exe` possuem verificação automática de atualização para releases públicas do repositório.
- O updater verifica após a inicialização e depois periodicamente. Quando uma atualização termina de baixar, oferece “Reiniciar e atualizar” ou “Depois”.
- Releases nativas são imutáveis: para publicar nova build Desktop é obrigatório incrementar a versão; o CI não sobrescreve uma tag já publicada.
- A build continua sem assinatura digital paga nesta fase; auto-update não substitui code signing.
- Contratos automatizados no CI impedem controles estáticos de navegador sem implementação e validam o fluxo de atualização.

## Regra de atualização

Existem duas camadas:

1. **Web/PWA:** Home, comunidade, busca e demais arquivos hospedados podem atualizar com o deploy do site e service worker.
2. **Desktop nativo:** Electron, tabs, preload, downloads e demais recursos embutidos no instalador só mudam através de uma nova versão (`0.9.1`, `0.10.0` etc.). O workflow gera uma GitHub Release com `HappyCoding-Setup.exe`, `RELEASES` e o pacote Squirrel necessário para o updater.

A v0.8.0 não contém o updater e não pode ganhá-lo retroativamente. Portanto a v0.9.0 é a última migração que exige instalação manual; versões posteriores podem ser recebidas pelo próprio app, desde que a release correspondente seja publicada com sucesso.

## Ainda precisa de teste real no Windows

- instalar v0.9.0 e confirmar inicialização normal após o bootstrap Squirrel;
- publicar uma versão posterior de teste e confirmar download + diálogo “Reiniciar e atualizar” end-to-end;
- abrir/fechar/trocar muitas abas e restaurar com `Ctrl+Shift+T`;
- fechar o app normalmente e confirmar restauração das abas;
- simular encerramento abrupto e confirmar que abre apenas a Home;
- favoritos/histórico entre reinicializações;
- downloads pequenos/grandes, cancelar, pausar/retomar, executáveis/scripts e diálogo nativo;
- sites reais, login/cookies, páginas pesadas e crash de renderer.

## Próximas etapas

- validar o primeiro auto-update real v0.9.0 → versão posterior no Windows;
- permissões granulares por site mantendo câmera/mic/localização negados por padrão;
- filtro de navegação no processo principal;
- `Ctrl+F`/encontrar na página, zoom, favicons e reordenação de abas;
- testes end-to-end no Windows;
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
