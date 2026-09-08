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

O ciclo começou no HEAD `94028ba4fdc3b028fd6d3b38f192a57350976974`.

Alterações deste ciclo incluem:
- sincronização de notas em `account-sync.js`;
- cache do service worker elevado para `v7` e teste correspondente;
- documentação atualizada para refletir estado real;
- `backend/project-sync-notes.sql` marcado como aplicado.

### Supabase

Projeto usado e verificado: `vzfnoaixjgyifutklpwn`.

Estado confirmado:
- 1 usuário real;
- e-mail confirmado;
- 1 fator MFA verificado;
- 1 membro em `hc_admin_members`;
- 1 usuário no diretório administrativo após backfill;
- `delete-account` ativa com JWT;
- `bootstrap-admin` ativa na versão 2, mas permanentemente fechada.

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

`account-sync.js` agora sincroniza, quando o usuário ativa o opt-in:
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

`account.js` já faz upsert do próprio usuário em `hc_user_directory` após sessão válida. O backfill atual inseriu o usuário real existente no diretório.

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

Estado atual do cache esperado após este ciclo: `v7`.

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
2. Testar sincronização real em dois navegadores/dispositivos.
3. Testar admin pelo frontend real com uma segunda conta quando disponível.
4. Implementar suspensão GLOBAL server-side com MFA + audit log.
5. Melhorar tratamento de erro do admin para nunca registrar/mostrar sucesso após falha.
6. Seguir para editor/arquivos/preview isolado.
7. Evoluir IA com seleção explícita de arquivos.
8. Evoluir browser desktop real.

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
