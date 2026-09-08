# Happy Coding =] — Project Context / Work Handoff

> Leia este arquivo antes de alterar o projeto. Continue o produto existente; não reinvente nem redesenhe.

## Projeto correto

- Nome: **Happy Coding =]**
- GitHub: `NeuroVendas/happy-coding`, branch `main`
- Site LIVE: https://neurovendas.github.io/happy-coding/
- Supabase correto: **Happy Coding** — `vzfnoaixjgyifutklpwn` — `sa-east-1`
- NÃO tocar em `NeuroVendas/evolution-neuro`.
- NÃO tocar no Supabase antigo `xzskhfhjyvroyzydetot`.
- Custo 0 como prioridade; não ativar serviços pagos sem aprovação.

## Identidade / regras permanentes

- Não redesenhar sem pedido explícito.
- Preservar grafite/escuro, lime `#b7f34a`, marca `happy coding =]`, mascote `=]`, aparência browser/workspace.
- IA só recebe arquivos/trechos escolhidos explicitamente; não executa código automaticamente.
- Nunca expor `service_role`/secrets no frontend.
- Admin sensível exige membership real + MFA/AAL2 no banco.
- Filtro adulto e SafeSearch não podem ser desligados.
- Desktop remoto nunca recebe Node.js/Electron APIs nem filesystem.
- Não desativar `webSecurity`, sandbox ou context isolation para fazer site funcionar.

## Conta/Supabase — estado preservado

- Conta real admin: `tr.negocios.2022@gmail.com`.
- E-mail confirmado, MFA/TOTP verificado e membership em `hc_admin_members` intacta.
- Sessão web persistente no navegador; MFA não concede admin.
- `delete-account` ativa com JWT.
- `bootstrap-admin` v2 permanentemente fechado.
- Admin suite e `project_sync_notes` aplicadas/testadas.
- Suspensão GLOBAL ainda não implementada.
- Security Advisor conhecido: **Leaked Password Protection Disabled**.

## Web/PWA

- Service worker permanece em cache `v8`.
- Web/PWA e desktop são frentes diferentes; não chamar o PWA de navegador desktop completo.

# Navegador desktop — estado atual v0.6.0

Pasta `/desktop`.

Arquivos principais:
- `main.js`, `preload.js`, `chrome.html`, `chrome.js`;
- `browser-core.js`, `download-core.js`, `library-core.js`, `session-core.js`;
- testes correspondentes em `desktop/tests`.

## Arquitetura de segurança

- `BaseWindow` hospeda chrome local privilegiado + `WebContentsView` remoto por aba.
- Remoto: `nodeIntegration:false`, `contextIsolation:true`, `sandbox:true`, `webSecurity:true`, `allowRunningInsecureContent:false`.
- `app.enableSandbox()` ativo.
- Permissões sensíveis negadas por padrão.
- IPC valida `sender`; apenas `chromeView` local pode usar ações privilegiadas.

## Abas / navegação

Implementado:
- criar, ativar e fechar abas reais;
- até 20 abas abertas;
- restaurar última aba fechada;
- popups/new-window viram abas controladas;
- título, URL, loading, erro e back/forward por aba;
- `webContents.navigationHistory` para voltar/avançar;
- `happy://home` -> Home;
- domínio sem esquema -> HTTPS;
- `http://` -> upgrade para HTTPS;
- texto -> Google com `safe=active`;
- esquemas perigosos/não suportados não carregam diretamente.

Atalhos: `Ctrl+L`, `Ctrl+T`, `Ctrl+W`, `Ctrl+Tab`, `Ctrl+Shift+Tab`, `Ctrl+Shift+T`, `Ctrl+R`, `Ctrl+D`, `Alt+Left`, `Alt+Right`. `Ctrl+J`/`Ctrl+H` funcionam no chrome local; podem ser estendidos para foco remoto depois.

# Downloads — v0.4+

- Controlados no processo principal por `session.defaultSession.on('will-download')`.
- Só downloads vindos de aba remota conhecida são aceitos.
- Nome de arquivo é limpo/limitado.
- Não existe `setSavePath` automático; usa diálogo nativo para usuário escolher onde salvar.
- Download sem gesto direto detectado recebe confirmação extra.
- Extensões sensíveis recebem confirmação extra, incluindo `.exe`, `.msi`, `.bat`, `.cmd`, `.ps1`, `.lnk`, `.jar`, `.iso` e demais da lista interna.
- Painel local mostra origem, bytes, progresso e estado; permite pausar/retomar quando suportado, cancelar e mostrar na pasta.
- Renderer não recebe caminho completo salvo; processo principal mantém o caminho.
- Lista de downloads fica somente em memória nesta versão.
- Classificação de extensão NÃO é antivírus.

# Histórico e favoritos — v0.5+

Persistência local: `app.getPath('userData')/browser-library.json`.

- Processo principal é dono dos dados; página remota não consegue ler a biblioteca.
- Apenas URLs HTTPS são aceitas ao normalizar/persistir.
- Até 500 favoritos e 1000 entradas de histórico.
- Histórico registra navegações reais e deduplica apenas repetições consecutivas da mesma URL.
- Título do item de histórico é atualizado quando o título real da página chega.
- Favorito pode ser adicionado/removido pela estrela ou `Ctrl+D`.
- Painel Biblioteca local possui Favoritos/Histórico, abrir item, remover favorito e limpar histórico.
- Arquivo corrompido é renomeado para `.corrupt-<timestamp>` em vez de ser confiado.
- Biblioteca é local, ainda não sincronizada com conta.

# Restauração de sessão — v0.6.0

Persistência local: `app.getPath('userData')/browser-session.json`.

Regras:
- salva URLs HTTPS das abas e índice da aba ativa;
- no máximo 10 abas são restauradas;
- dados são novamente normalizados antes de restaurar;
- no início do app, a sessão é marcada imediatamente como `cleanExit:false`;
- fechamento normal salva `cleanExit:true`;
- se a execução anterior terminou sem `cleanExit:true`, **não restaura automaticamente** e abre somente a Home;
- isso existe para evitar loop de crash causado por uma aba/página problemática;
- arquivo de sessão inválido/corrompido é isolado com sufixo `.corrupt-<timestamp>`.

Ainda precisa de teste real no Windows para confirmar ciclo completo de fechar/reabrir e encerramento abrupto.

# Testes / CI

`.github/workflows/pages.yml` executa:
- checks de sintaxe web;
- teste do service worker;
- checks de sintaxe desktop para `main`, preload, chrome e todos os cores;
- `node --test desktop/tests/*.test.cjs`;
- deploy Pages.

Testes desktop cobrem atualmente:
- normalização de navegação/títulos/ciclo de abas;
- classificação/limpeza/progresso de downloads;
- biblioteca HTTPS-only, limites, histórico e toggle de favoritos;
- sessão HTTPS-only, limite de restauração e bloqueio após saída não limpa.

Nunca afirmar distribuição/Windows validado sem teste real no Windows.

# Próximas prioridades desktop

1. Permissões granulares por site, mantendo câmera/mic/localização negados por padrão.
2. Teste real Windows de abas, downloads, biblioteca e restauração de sessão.
3. Filtro de navegação no processo principal.
4. Empacotamento/instalador e atualização segura; qualquer custo/assinatura precisa de aprovação.
5. Persistir lista de downloads futuramente sem expor caminho a remoto.

# Outras frentes pendentes

- Conta/sync: teste real em dois dispositivos e conflitos.
- Admin: suspensão GLOBAL server-side + reversão MFA/audit log; melhorar erros.
- Editor/workspace: arquivos/snippets, preview isolado, import/export sem execução automática.
- IA: seleção explícita de arquivos/snippets e melhora de qualidade local.

# Não fazer

- não renomear/redesenhar sem pedido;
- não tocar repo/Supabase errados;
- não expor secrets/service_role;
- não desativar confirmação de e-mail, filtro adulto ou SafeSearch;
- não dar filesystem/Node/Electron a páginas remotas;
- não executar código automaticamente;
- não afirmar feature testada fora do que o CI/Windows realmente verificou;
- não apagar dados existentes;
- conferir HEAD antes de writes.
