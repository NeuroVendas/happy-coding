# Happy Coding =] — próximos passos

Direção confirmada: navegador/workspace funcional para programadores, game devs, estudantes e criadores, com ferramentas úteis, IA, comunidade e versão desktop. Custo zero como prioridade e segurança como requisito.

## Estado concluído em 2026-09-08

- Tema original grafite/verde-lima preservado. Não redesenhar sem pedido explícito.
- Comunidade conectada ao Supabase com RLS, posts pendentes, moderação admin + MFA/AAL2 e denúncias.
- Conta principal separada da Comunidade em `account.html`.
- Existe 1 conta real confirmada, 1 fator MFA verificado e 1 membro admin.
- `admin-suite` aplicada no Supabase (`20260908214303`): diretório, sanções, anúncios, eventos e audit log.
- Testes transacionais com rollback passaram para timeout, ban, remoção de sanção, bloqueio de post/denúncia, proteção contra auto-sanção, anúncios/eventos públicos e audit log.
- `project_sync_notes` aplicada (`20260908214414`): `hc_projects.notes` + `updated_at`.
- RLS das notas testada: dono lê/edita; outro usuário não lê nem altera; limite de 20.000 caracteres confirmado.
- `account-sync.js` agora sincroniza perfil, favoritos, projetos e notas quando o usuário ativa a sincronização.
- `bootstrap-admin` foi fechado permanentemente na versão 2: sem código/hash antigo e sem uso de `service_role`; responde `bootstrap_closed`.
- O service worker foi elevado para cache `v7` após a mudança do shell.

## Próximas prioridades

### 1. Fechar o ciclo de conta/sincronização

- Testar sincronização real em dois navegadores/dispositivos com a conta existente.
- Validar conflitos de notas/projetos entre dois dispositivos e definir estratégia explícita de resolução.
- Manter sincronização opt-in; histórico continua local.
- Revisar exportação dos dados sincronizados.
- Habilitar proteção contra senhas vazadas no Supabase Auth quando houver ferramenta/configuração disponível; hoje o Security Advisor mostra esse único aviso.

### 2. Admin mais forte

- Criar suspensão GLOBAL server-side da conta, separada de timeout/ban da comunidade.
- Exigir admin + MFA/AAL2 para suspensão e reversão.
- Registrar suspensão/reversão no audit log.
- Melhorar tratamento de erros no painel admin para nunca mostrar sucesso quando uma operação falhar.
- Continuar evoluindo denúncias, rotina de revisão, eventos e anúncios.

### 3. Editor / workspace real

- Editor de arquivos por projeto.
- Arquivos e snippets salvos com segurança.
- Preview web isolado/sandboxed.
- Importar/exportar projetos sem executar código automaticamente.
- IA recebe somente arquivos/trechos escolhidos explicitamente pelo usuário.

### 4. IA =]

- Melhorar progresso e compatibilidade da IA local.
- Melhorar ajuda com erros, código e contexto do projeto escolhido.
- Nunca baixar modelo automaticamente nem acessar arquivos sem seleção explícita.

### 5. Navegador desktop real

A base Electron em `/desktop` continua sendo o caminho para um browser Windows real.

Pendências:
- abas múltiplas reais;
- downloads seguros;
- histórico/favoritos integrados;
- filtros no processo principal;
- testes Windows;
- instalador e atualização segura.

## Regra permanente

Não chamar o PWA de navegador desktop completo. Não prometer filtragem perfeita da internet. Não ativar serviços pagos, domínio, SMS ou APIs pagas sem aprovação explícita.
