# Happy Coding =] — próximos passos

Direção confirmada: navegador/workspace funcional para programadores, game devs, estudantes e criadores, com ferramentas úteis, IA, comunidade e versão desktop. Custo zero como prioridade e segurança como requisito.

## Estado concluído em 2026-09-08

- Tema original grafite/verde-lima preservado. Não redesenhar sem pedido explícito.
- Comunidade conectada ao Supabase com RLS, posts pendentes, moderação admin + MFA/AAL2 e denúncias.
- Conta principal separada da Comunidade em `account.html`.
- Existe 1 conta real confirmada, 1 fator MFA verificado e 1 membro admin.
- A conta real `tr.negocios.2022@gmail.com` foi verificada no banco como confirmada, com MFA verificado e membership admin intacta; o problema de “perder admin” era persistência da sessão no frontend, não remoção da permissão.
- Conta, Comunidade e Admin persistem a sessão do Supabase no navegador e o acesso Admin continua protegido por membership + MFA/AAL2 nas ações sensíveis.
- `admin-suite` aplicada no Supabase (`20260908214303`): diretório, sanções, anúncios, eventos e audit log.
- `project_sync_notes` aplicada (`20260908214414`): `hc_projects.notes` + `updated_at`.
- `account-sync.js` sincroniza perfil, favoritos, projetos e notas quando o usuário ativa a sincronização.
- `bootstrap-admin` foi fechado permanentemente na versão 2.
- O service worker está no cache `v8` após as correções de autenticação.
- Navegador desktop `/desktop` avançou para v0.3.0 com **abas múltiplas reais** usando um `WebContentsView` isolado por aba.
- Abas desktop têm criar/ativar/fechar/restaurar, título e URL reais, loading/erro e back/forward independentes via `navigationHistory`.
- Popups remotos são transformados em novas abas controladas, sem conceder privilégios Electron à página.
- Atalhos desktop implementados: Ctrl+L, Ctrl+T, Ctrl+W, Ctrl+Tab, Ctrl+Shift+Tab, Ctrl+Shift+T, Ctrl+R e Alt+setas.
- Core de navegação desktop ganhou testes unitários e passou a fazer parte do CI.

## Prioridade atual — tornar o navegador desktop realmente utilizável

### 1. Downloads seguros

- Capturar `will-download` apenas no processo principal.
- Exigir origem/navegação aceitável e evitar downloads silenciosos quando possível.
- Usar diálogo de salvamento do sistema; não salvar executáveis automaticamente.
- Mostrar progresso, concluído/interrompido/cancelado e permitir abrir pasta apenas por ação explícita.
- Não expor filesystem para páginas remotas.

### 2. Histórico e favoritos desktop

- Persistir localmente em `app.getPath('userData')`, não em páginas remotas.
- Histórico por navegação real, com limpeza explícita.
- Favoritos adicionados/removidos pelo chrome local.
- Nunca permitir que página externa leia a biblioteca local.

### 3. Restaurar sessão do navegador

- Salvar abas abertas e aba ativa ao fechar.
- Restaurar somente URLs permitidas pelo normalizador seguro.
- Limitar quantidade de abas restauradas e tratar crash sem loop.

### 4. Permissões por site

- Continuar negando câmera/mic/localização por padrão.
- Criar UI explícita para o usuário conceder permissões específicas quando necessário.
- Nenhuma página remota pode alterar a política de permissões do app.

### 5. Windows real

- Testes manuais/end-to-end em Windows.
- Empacotamento e instalador.
- Assinatura e atualização automática segura somente quando houver uma estratégia sem custo inesperado/aprovada.

## Outras frentes que continuam pendentes

### Conta / sincronização

- Testar sincronização real em dois navegadores/dispositivos.
- Validar conflitos de notas/projetos entre dois dispositivos.
- Manter sincronização opt-in; histórico web continua local.
- Habilitar proteção contra senhas vazadas no Supabase Auth quando houver configuração disponível.

### Admin

- Suspensão GLOBAL server-side separada de timeout/ban da comunidade.
- Reversão com admin + MFA/AAL2 e audit log.
- Melhor tratamento de erros no painel.

### Editor / workspace

- Editor de arquivos por projeto.
- Arquivos e snippets salvos com segurança.
- Preview web isolado/sandboxed.
- Importar/exportar projetos sem executar código automaticamente.

### IA =]

- Melhorar compatibilidade e qualidade da IA local.
- IA recebe somente arquivos/trechos escolhidos explicitamente pelo usuário.

## Regra permanente

Não chamar o PWA de navegador desktop completo. Não prometer filtragem perfeita da internet. Não ativar serviços pagos, domínio, SMS ou APIs pagas sem aprovação explícita.
