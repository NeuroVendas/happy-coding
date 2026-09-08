# Happy Coding =] — próximos passos

Direção confirmada: navegador/workspace funcional para programadores, game devs, estudantes e criadores, com ferramentas úteis, IA, comunidade e versão desktop. Custo zero como prioridade e segurança como requisito.

## Estado concluído em 2026-09-08

- Tema original grafite/verde-lima preservado. Não redesenhar sem pedido explícito.
- Comunidade conectada ao Supabase com RLS, posts pendentes, moderação admin + MFA/AAL2 e denúncias.
- Conta principal separada da Comunidade em `account.html`.
- Existe 1 conta real confirmada, 1 fator MFA verificado e 1 membro admin.
- A conta real `tr.negocios.2022@gmail.com` permanece com membership admin; o problema anterior era persistência de sessão, já corrigida no frontend.
- Conta, Comunidade e Admin persistem a sessão do Supabase e ações sensíveis continuam exigindo membership + MFA/AAL2.
- `admin-suite` e `project_sync_notes` estão aplicadas no Supabase.
- `account-sync.js` sincroniza perfil, favoritos, projetos e notas quando o opt-in está ativo.
- `bootstrap-admin` permanece permanentemente fechado na versão 2.
- Service worker web permanece no cache `v8`.
- Navegador desktop `/desktop` avançou para **v0.4.0**.
- Abas múltiplas reais usam um `WebContentsView` isolado por aba.
- Back/forward por aba usa `webContents.navigationHistory`.
- Popups remotos viram novas abas controladas, sem privilégio Electron.
- Atalhos principais de abas/navegação estão implementados.
- Downloads são controlados no processo principal via `session.will-download` / `DownloadItem`.
- Usuário escolhe onde salvar pelo diálogo nativo; páginas remotas não recebem caminho do filesystem.
- Downloads automáticos e extensões sensíveis recebem confirmação extra.
- Painel local de downloads mostra progresso/estado e permite pausar/retomar quando suportado, cancelar e mostrar arquivo concluído na pasta.
- Core de navegação e core de classificação de downloads têm testes unitários e fazem parte do CI.

## Prioridade atual — tornar o navegador desktop realmente utilizável

### 1. Histórico e favoritos desktop

- Persistir localmente em `app.getPath('userData')`, nunca em páginas remotas.
- Histórico baseado em navegações reais, com limite e limpeza explícita.
- Favoritos adicionados/removidos pelo chrome local.
- Página externa nunca lê a biblioteca local.
- Estrutura preparada para futura sincronização opcional, sem misturar credenciais ou privilégios.

### 2. Restaurar sessão do navegador

- Salvar URLs das abas abertas e aba ativa ao fechar.
- Restaurar somente URLs revalidadas por `safeTarget`.
- Limitar número de abas restauradas.
- Tratar crash sem criar loop de restauração.

### 3. Permissões por site

- Continuar negando câmera/mic/localização por padrão.
- Criar UI explícita para o usuário conceder permissões específicas quando necessário.
- Página remota nunca altera a política de permissões.

### 4. Downloads — validação Windows

Implementação existe, mas ainda precisa teste real em Windows para:
- diálogo nativo de salvar;
- download pequeno/grande;
- progresso;
- pausa/retomada em servidor compatível;
- cancelamento;
- arquivo executável/script e aviso extra;
- download iniciado automaticamente;
- mostrar arquivo concluído na pasta.

A classificação por extensão é uma camada de proteção e **não substitui antivírus/análise de malware**.

### 5. Windows / distribuição

- Testes manuais/end-to-end em Windows.
- Empacotamento e instalador.
- Assinatura e atualização automática segura somente com estratégia de custo aprovada.

## Outras frentes pendentes

### Conta / sincronização
- testar sincronização real em dois navegadores/dispositivos;
- validar conflitos de notas/projetos;
- manter sincronização opt-in;
- habilitar proteção contra senhas vazadas no Supabase Auth quando houver configuração disponível.

### Admin
- suspensão GLOBAL server-side separada de timeout/ban da comunidade;
- reversão com admin + MFA/AAL2 e audit log;
- melhorar tratamento de erros no painel.

### Editor / workspace
- editor de arquivos por projeto;
- arquivos/snippets salvos com segurança;
- preview isolado/sandboxed;
- import/export sem execução automática.

### IA =]
- melhorar compatibilidade/qualidade local;
- IA recebe somente arquivos/trechos escolhidos explicitamente pelo usuário.

## Regra permanente

Não chamar o PWA de navegador desktop completo. Não prometer filtragem perfeita da internet. Não ativar serviços pagos, domínio, SMS ou APIs pagas sem aprovação explícita.
