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

Preservar a identidade atual:
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

Melhorias devem ser incrementais por cima do visual atual.

## Visão do produto

Happy Coding =] deve evoluir para:
1. workspace web/PWA público, útil sem login obrigatório;
2. comunidade para devs/criadores;
3. conta opcional com sincronização;
4. IA `=]` útil com contexto escolhido explicitamente;
5. editor/projetos reais;
6. painel administrativo;
7. navegador desktop real para Windows.

Prioridade de custo: **0 sempre que possível**. Não ativar cobrança, domínio, SMS ou APIs pagas sem autorização explícita.

## Segurança — regras permanentes

- Sem acesso automático da IA aos arquivos.
- Usuário escolhe explicitamente o que compartilhar.
- Não executar automaticamente código, comandos ou ações sugeridas pela IA.
- Nunca expor `service_role`/secret no frontend.
- Publishable key pode ficar no frontend somente com RLS correto.
- RLS obrigatório em tabelas expostas.
- Autorização de admin deve ser server/db enforced.
- Admin sensível exige MFA/AAL2.
- Não usar `user_metadata` para autorização.
- Filtro adulto e Safe Search não podem ser desligados pelo admin.
- Violência fictícia/horror/profanidade em jogos pode existir com aviso; conteúdo adulto/exploratório e incentivo perigoso real devem ser bloqueados conforme as regras do produto.
- Não prometer segurança ou filtragem perfeita.

## Estado REAL verificado em 2026-09-08

### GitHub

O ciclo anterior começou no HEAD `94028ba4fdc3b028fd6d3b38f192a57350976974`.

Alterações já verificadas:
- sincronização de notas em `account-sync.js`;
- admin suite e sincronização de notas aplicadas no Supabase;
- bootstrap de primeiro admin encerrado;
- correção de persistência de autenticação para evitar perda aparente de conta/admin ao fechar o app;
- cache do service worker elevado para `v8` após a correção de autenticação.

### Supabase

Projeto usado e verificado: `vzfnoaixjgyifutklpwn`.

Estado confirmado:
- 1 usuário real;
- conta real: `tr.negocios.2022@gmail.com`;
- e-mail confirmado;
- 1 fator MFA verificado;
- essa mesma conta continua membro de `hc_admin_members`;
- portanto a reclamação de “perder admin” NÃO era remoção da permissão no banco; era perda da sessão temporária no frontend;
- 1 usuário no diretório administrativo após backfill;
- `delete-account` ativa com JWT;
- `bootstrap-admin` ativa na versão 2, mas permanentemente fechada.

### Persistência da conta / correção 2026-09-08

Problema encontrado:
- `account.js`, `community.js` e `admin.js` forçavam o Supabase Auth a usar `sessionStorage`;
- ao fechar a aba/janela, o navegador apagava essa sessão;
- o banco mantinha a conta/admin, mas o frontend voltava como desconectado;
- `account-entry.js` também lia apenas `sessionStorage`, então o atalho Admin podia desaparecer mesmo com membership correta.

Correção aplicada:
- Conta, Comunidade e Admin usam `localStorage` como storage do Supabase Auth;
- `persistSession: true` e `autoRefreshToken: true` explícitos;
- existe migração automática: se ainda houver sessão antiga em `sessionStorage` e nenhuma persistente, ela é copiada para `localStorage`;
- `account-entry.js` lê primeiro a sessão persistente e faz fallback/migração da sessão antiga;
- `sync-hook.js` agora dispara mudança tanto em `setItem` quanto `removeItem`, e mantém compatibilidade do evento de sessão quando o auth muda em `localStorage`;
- logout remove também qualquer cópia legada em `sessionStorage`;
- cache offline elevado para `v8`.

Importante:
- persistir login NÃO concede admin;
- acesso Admin continua exigindo membership real em `hc_admin_members` + JWT AAL2;
- em computador compartilhado, usuário deve usar “Sair da conta”.

Teste real ainda necessário:
1. entrar com `tr.negocios.2022@gmail.com`;
2. verificar MFA/AAL2;
3. confirmar que o Painel Admin aparece;
4. fechar totalmente o Happy Coding;
5. abrir de novo e confirmar que a conta continua conectada e que o Admin reaparece.

### Migrations aplicadas

Existentes antes deste ciclo:
- `20260908005015 happy_coding_private_data_foundation`
- `20260908012320 add_browser_bookmarks_and_settings`
- `20260908195123 happy_coding_moderated_community`
- `20260908195153 happy_coding_public_feed_policy`

Aplicadas neste ciclo:
- `20260908214303 admin_suite`
- `20260908214414 project_sync_notes`

### Admin suite

Tabelas novas, todas com RLS ativo:
- `hc_user_directory`
- `hc_user_sanctions`
- `hc_announcements`
- `hc_events`
- `hc_admin_audit_log`

Sanções separadas:
- `timeout` da comunidade;
- `ban` da comunidade;
- suspensão GLOBAL ainda NÃO implementada.

Testes transacionais com fixtures revertidos passaram para:
- admin sem MFA não consegue sancionar;
- admin com AAL2 lista diretório e modera;
- timeout;
- ban;
- revogação de sanção;
- usuário sancionado não publica;
- usuário sancionado não denuncia;
- admin não sanciona a própria conta;
- anúncio publicar/despublicar;
- evento publicar/despublicar;
- audit log.

Nenhum fixture desses testes foi mantido.

### Bootstrap admin

O bootstrap antigo continha um hash de código de primeiro admin. Como já existe um admin real e o código antigo foi exposto em conversa anterior, a Edge Function foi atualizada.

Estado atual:
- `bootstrap-admin` versão 2;
- `verify_jwt: true`;
- não contém o hash/código antigo;
- não usa `service_role`;
- responde `bootstrap_closed`.

Não reabrir automaticamente. Não promover “primeiro usuário”.

### Notas de projetos / sincronização

`hc_projects` agora possui:
- `notes text not null default ''`;
- `updated_at timestamptz`;
- limite de 20.000 caracteres para notas.

RLS foi testado em transação:
- dono lê/edita suas notas;
- outro usuário não lê;
- outro usuário não altera;
- limite de tamanho funciona;
- fixtures foram revertidos.

`account-sync.js` sincroniza, quando o usuário ativa o opt-in:
- perfil;
- favoritos;
- projetos;
- notas.

Histórico continua local.

Na primeira mesclagem, uma nota local existente pode preencher a nuvem se a nota cloud estiver vazia. Quando há nota cloud não vazia, ela é usada como fonte na hidratação atual. Ainda falta definir UX/estratégia explícita para conflitos simultâneos entre dois dispositivos.

### Security Advisor

Depois das migrations, não surgiram findings de RLS das novas tabelas.

Há 1 aviso atual:
- **Leaked Password Protection Disabled**.

Este aviso é de configuração do Supabase Auth e continua pendente.

## Conta / autenticação

Área principal: `account.html` + `account.js`.

Deve centralizar:
- login;
- cadastro;
- logout;
- perfil;
- MFA/TOTP;
- sincronização;
- recuperação de senha;
- exclusão da conta;
- acesso ao admin quando autorizado.

A Comunidade pode ter atalhos, mas não pode ser o único lugar para administrar a conta.

`account.js` faz upsert do próprio usuário em `hc_user_directory` após sessão válida. O backfill atual inseriu o usuário real existente no diretório.

## Comunidade

Arquivos principais:
- `community.js`
- `community.css`
- `safety-ui.js`

Regras:
- posts novos entram `pending`;
- só `published` aparece publicamente;
- admin + MFA aprova/rejeita;
- código é exibido como texto, nunca executado automaticamente;
- denúncias usam `hc_community_reports`;
- não criar posts falsos.

## Admin

Arquivos:
- `admin.html`
- `admin.js`

Áreas:
- visão geral;
- usuários;
- moderação;
- denúncias;
- sanções;
- anúncios;
- eventos;
- audit log.

Próximo reforço administrativo:
- suspensão GLOBAL server-side;
- reversão server-side;
- admin + MFA obrigatório;
- audit log obrigatório;
- não expor segredo no browser.

## IA =]

Arquivo principal: `ai-local.js`.

Modelo local atual:
- `HuggingFaceTB/SmolLM2-360M-Instruct`
- Transformers.js

Regras:
- download somente quando o usuário pede;
- sem acesso automático a arquivos;
- comandos de contexto explícito `/projeto`, `/contexto`, `/sem-projeto`;
- contexto pode incluir nome, tecnologia, descrição e notas escolhidas/salvas;
- próxima etapa: seleção explícita de arquivos/snippets.

## Editor / workspace

Próximas funções:
- editor real;
- arquivos por projeto;
- snippets;
- salvar/importar/exportar;
- preview web isolado/sandboxed;
- IA analisar somente arquivos selecionados.

Nunca executar código não confiável no contexto privilegiado da conta/app.

## Browser desktop

Base Electron em `/desktop`.

Segurança planejada/implementada na base:
- `contextIsolation: true`;
- `sandbox: true`;
- `nodeIntegration: false`;
- `webSecurity: true`;
- UI privilegiada separada do conteúdo remoto;
- câmera/mic/geolocation negados por padrão;
- popups controlados.

Ainda falta:
- abas reais completas;
- downloads seguros;
- histórico/favoritos desktop;
- filtros no main process;
- installer Windows;
- testes Windows;
- atualização segura.

Não confundir o PWA com o browser desktop completo.

## PWA / CI / deploy

Arquivos:
- `sw.js`
- `tests/sw.test.cjs`
- `manifest.webmanifest`
- `.github/workflows/pages.yml`

Estado atual do cache esperado após este ciclo: `v8`.

Workflow do Pages executa:
- `node --check` nos módulos JS relevantes;
- `node --test tests/sw.test.cjs`;
- deploy GitHub Pages.

Nunca afirmar deploy concluído até o workflow reportar `success`.

## E-mail

Site URL e redirect devem permanecer:
- `https://neurovendas.github.io/happy-coding/`

Não voltar para localhost.
Não desativar confirmação de e-mail.
SMTP de produção/domínio próprio ficam para etapa futura e não devem gerar custo sem aprovação.

## Próxima ordem de execução

1. Confirmar CI/Pages do HEAD atual.
2. Fazer teste real de fechar/reabrir com a conta admin e verificar persistência.
3. Testar sincronização real em dois navegadores/dispositivos.
4. Testar admin pelo frontend real com uma segunda conta quando disponível.
5. Implementar suspensão GLOBAL server-side com MFA + audit log.
6. Melhorar tratamento de erro do admin para nunca registrar/mostrar sucesso após falha.
7. Seguir para editor/arquivos/preview isolado.
8. Evoluir IA com seleção explícita de arquivos.
9. Evoluir browser desktop real.

## Não fazer

- não renomear Happy Coding;
- não redesenhar sem pedido;
- não tocar `evolution-neuro`;
- não tocar Supabase antigo;
- não criar branch Supabase paga sem autorização;
- não comprar domínio/serviço;
- não expor secrets;
- não colocar `service_role` no frontend;
- não desativar confirmação de e-mail;
- não desativar filtro adulto;
- não dar acesso automático da IA aos arquivos;
- não executar código automaticamente;
- não criar posts fake;
- não afirmar feature funcionando sem teste;
- não apagar dados existentes;
- não substituir `main` sem conferir o HEAD;
- usar `apply_migration` para DDL no Supabase.