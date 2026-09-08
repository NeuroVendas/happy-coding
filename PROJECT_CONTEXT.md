# Happy Coding =] — Project Context / Work Handoff

> Leia este arquivo antes de alterar o projeto. Ele existe para permitir que outra sessão continue o desenvolvimento sem reinventar o produto.

## Projeto correto

- Nome: **Happy Coding =]**
- GitHub: `NeuroVendas/happy-coding`
- Branch principal: `main`
- Site LIVE: https://neurovendas.github.io/happy-coding/
- Supabase correto: **Happy Coding** — `vzfnoaixjgyifutklpwn` — `sa-east-1`
- NÃO tocar em `NeuroVendas/evolution-neuro`.
- NÃO tocar no Supabase antigo `xzskhfhjyvroyzydetot` (`NeuroVendas's Project`).

## Regra de design mais importante

**NÃO redesenhar o Happy Coding sem pedido explícito.**

Preservar:
- grafite/escuro;
- lime `#b7f34a`;
- marca `happy coding =]`;
- mascote `=]`;
- aparência browser/workspace;
- sidebar;
- Workspace Online;
- “O que vamos criar hoje?”;
- cards Soulbound, Pixel Forge e Quiet Forest;
- ferramentas e Dev Pulse.

## Visão do produto

Happy Coding =] deve evoluir para:
1. workspace web/PWA público;
2. comunidade;
3. conta opcional com sincronização;
4. IA `=]` com contexto escolhido explicitamente;
5. editor/projetos reais;
6. painel administrativo;
7. **navegador desktop real para Windows**.

Prioridade de custo: **0 sempre que possível**. Não ativar cobrança, domínio, SMS ou APIs pagas sem autorização explícita.

## Segurança — regras permanentes

- IA nunca acessa arquivos automaticamente.
- Usuário escolhe explicitamente o que compartilhar.
- Não executar automaticamente código/comandos sugeridos pela IA.
- Nunca expor `service_role`/secret no frontend.
- Publishable key só com RLS correto.
- RLS obrigatório em tabelas expostas.
- Autorização admin deve ser server/db enforced.
- Ações admin sensíveis exigem MFA/AAL2.
- Não usar `user_metadata` para autorização.
- Filtro adulto e Safe Search não podem ser desligados.
- Não prometer segurança/filtragem perfeita.
- Conteúdo remoto do desktop nunca recebe Node.js/Electron APIs.
- Não desativar `webSecurity`, sandbox ou context isolation para “fazer funcionar”.

## Estado real — conta/Supabase

Projeto usado: `vzfnoaixjgyifutklpwn`.

Confirmado:
- conta real `tr.negocios.2022@gmail.com`;
- e-mail confirmado;
- 1 MFA/TOTP verificado;
- membership admin ativa em `hc_admin_members`;
- `delete-account` ativa com JWT;
- `bootstrap-admin` versão 2 permanentemente fechada.

O problema anterior de “perder admin” era sessão temporária no frontend, não perda de permissionamento no banco.

Correção aplicada:
- Conta, Comunidade e Admin usam sessão persistente no navegador;
- migração de sessão legada de `sessionStorage` para `localStorage`;
- logout limpa cópia persistente/legada;
- interface pode reconhecer membership admin antes do MFA para mostrar o acesso;
- **ações administrativas continuam exigindo membership + AAL2 no banco**.

Admin suite já aplicada e testada:
- `hc_user_directory`;
- `hc_user_sanctions`;
- `hc_announcements`;
- `hc_events`;
- `hc_admin_audit_log`.

Sanções continuam distintas:
- timeout de comunidade;
- ban da comunidade;
- suspensão GLOBAL ainda não implementada.

`hc_projects` possui notas sincronizáveis com limite de 20.000 caracteres e RLS testado.

Security Advisor ainda tinha 1 aviso conhecido:
- **Leaked Password Protection Disabled**.

## Web/PWA

Arquivos principais:
- `index.html`
- `app.js`
- `account.html` / `account.js`
- `community.js`
- `admin.html` / `admin.js`
- `account-sync.js`
- `sw.js`

Estado do service worker web: cache `v8`.

Não confundir o PWA com o browser desktop completo.

## Navegador desktop — estado atual v0.3.0

Pasta: `/desktop`.

Arquivos principais:
- `desktop/main.js`
- `desktop/preload.js`
- `desktop/chrome.html`
- `desktop/chrome.js`
- `desktop/browser-core.js`
- `desktop/tests/browser-core.test.cjs`
- `desktop/package.json`

### Arquitetura

- `BaseWindow` hospeda o chrome local privilegiado e views remotas separadas.
- `chrome.html` é local e usa preload mínimo.
- Cada aba remota é um **`WebContentsView` separado**.
- Remoto: `nodeIntegration:false`.
- Remoto: `contextIsolation:true`.
- Remoto: `sandbox:true`.
- Remoto: `webSecurity:true`.
- Remoto: `allowRunningInsecureContent:false`.
- `app.enableSandbox()` permanece ativo.
- Permissões sensíveis são negadas por padrão nesta etapa.
- IPC valida `sender` e expõe apenas ações específicas de navegador.

### Abas reais implementadas

- criar nova aba;
- ativar aba;
- fechar aba;
- até 20 abas nesta versão;
- restaurar última aba fechada (stack de até 10 URLs);
- popup/new-window remoto vira nova aba controlada;
- cada aba tem título real, URL, loading, erro, canGoBack e canGoForward;
- cada aba preserva seu próprio histórico Chromium;
- views inativas ficam invisíveis, não são recriadas ao trocar de aba.

### Navegação

`desktop/browser-core.js` centraliza normalização:
- `happy://home` -> site Happy Coding;
- domínio sem esquema -> HTTPS;
- `http://` -> tentativa de upgrade para HTTPS;
- HTTPS permitido;
- texto comum -> Google Search com `safe=active`;
- `javascript:`, `data:`, `file:`, `ftp:` e esquemas não permitidos não são carregados diretamente; viram pesquisa segura.

Back/forward usam `webContents.navigationHistory`, não as APIs antigas depreciadas de `webContents.goBack/canGoBack`.

### Atalhos desktop

Implementados tanto quando foco está no chrome quanto quando foco está na página remota:
- `Ctrl+L` foco na barra;
- `Ctrl+T` nova aba;
- `Ctrl+W` fechar aba;
- `Ctrl+Tab` próxima aba;
- `Ctrl+Shift+Tab` aba anterior;
- `Ctrl+Shift+T` restaurar aba fechada;
- `Ctrl+R` recarregar;
- `Alt+Left` voltar;
- `Alt+Right` avançar.

### Testes desktop

`desktop/tests/browser-core.test.cjs` testa:
- home alias;
- domínio -> HTTPS;
- upgrade HTTP -> HTTPS;
- HTTPS normal;
- SafeSearch;
- bloqueio/normalização de esquemas perigosos;
- limite de entrada;
- normalização de títulos;
- ciclo de abas.

`.github/workflows/pages.yml` agora também executa:
- `node --check` nos JS do desktop;
- `node --test desktop/tests/*.test.cjs`.

### O que NÃO foi validado ainda

Não afirmar que o desktop está pronto para distribuição até teste real em Windows.

Ainda falta teste manual real de:
- abrir muitas abas;
- alternar e fechar abas;
- Ctrl+Shift+T;
- popups/new-window;
- páginas pesadas;
- crash de renderer;
- comportamento ao fechar a última aba;
- login/cookies em sites reais.

## Próxima prioridade do navegador desktop

### 1. Downloads seguros

Implementar no processo principal usando `session.on('will-download')` / `DownloadItem`:
- nunca expor filesystem para remoto;
- diálogo de salvar controlado pelo sistema;
- evitar download silencioso quando possível;
- acompanhar progresso/status;
- lista de downloads no chrome local;
- abrir pasta/arquivo apenas por ação explícita do usuário;
- atenção extra a executáveis/scripts.

### 2. Histórico e favoritos desktop

- persistir no `app.getPath('userData')`;
- escrita/leitura somente no processo principal;
- chrome local consulta via IPC estreito;
- página remota nunca lê histórico/favoritos;
- limpeza explícita do histórico.

### 3. Restaurar sessão de abas

- persistir URLs abertas + aba ativa;
- restaurar somente URLs revalidadas por `safeTarget`;
- limite de abas restauradas;
- proteção contra loop de crash.

### 4. Permissões por site

- negar por padrão continua sendo a regra;
- criar prompt/UI explícita para câmera/mic/localização quando necessário;
- decisão fica no chrome/processo principal, nunca na página remota.

### 5. Windows / distribuição

- teste real no Windows;
- empacotamento;
- instalador;
- atualização segura;
- assinatura somente com estratégia de custo aprovada.

## Outras frentes pendentes

### Conta / sincronização
- teste real em dois navegadores/dispositivos;
- conflitos de notas/projetos;
- exportação dos dados sincronizados.

### Admin
- suspensão GLOBAL server-side;
- reversão com MFA + audit log;
- melhorar tratamento de erros do painel.

### Editor/workspace
- editor real;
- arquivos/snippets;
- preview isolado;
- import/export sem execução automática.

### IA =]
- seleção explícita de arquivos/snippets;
- melhorar qualidade/compatibilidade local;
- nunca baixar modelo automaticamente.

## PWA / CI / deploy

Workflow do Pages executa:
- checks JS web;
- teste do service worker;
- checks JS desktop;
- testes unitários do desktop core;
- deploy GitHub Pages.

Nunca afirmar deploy/CI concluído até o workflow do HEAD final reportar `success`.

## Não fazer

- não renomear Happy Coding;
- não redesenhar sem pedido;
- não tocar `evolution-neuro`;
- não tocar Supabase antigo;
- não criar branch Supabase paga sem autorização;
- não comprar domínio/serviço;
- não expor secrets/service_role;
- não desativar confirmação de e-mail;
- não desativar filtro adulto/SafeSearch;
- não dar acesso automático da IA aos arquivos;
- não executar código automaticamente;
- não criar posts fake;
- não afirmar feature funcionando sem teste;
- não apagar dados existentes;
- não substituir `main` sem conferir o HEAD;
- não dar Node/Electron APIs a páginas remotas;
- usar `apply_migration` para DDL no Supabase.
