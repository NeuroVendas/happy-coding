# Happy Coding =] — próximos passos

Direção confirmada: navegador/workspace funcional para programadores, game devs, estudantes e criadores, com ferramentas úteis, IA, comunidade e versão desktop. Custo zero como prioridade e segurança como requisito.

## Estado concluído em 2026-09-08

- Tema original grafite/verde-lima preservado.
- Conta, comunidade, admin/MFA, sync de projetos/notas e admin suite permanecem funcionando no projeto web.
- Service worker web permanece no cache `v8`.
- Navegador desktop `/desktop` avançou para **v0.6.0**.
- Abas múltiplas reais com `WebContentsView`, back/forward por aba, popup controlado e atalhos de navegador.
- Downloads seguros no processo principal com diálogo nativo, progresso, cancelamento e aviso extra para downloads automáticos/extensões sensíveis.
- Histórico e favoritos desktop persistem localmente no diretório `userData`; páginas remotas não têm acesso à biblioteca.
- Favoritos possuem estrela/toggle e lista; histórico registra navegações HTTPS, tem limite e limpeza explícita.
- Sessão das abas persiste somente URLs HTTPS, restaura no máximo 10 abas e somente depois de fechamento limpo.
- Crash/encerramento não limpo desativa a restauração automática no próximo início para evitar loop de crash.
- Cores de navegação, download, biblioteca e sessão possuem testes unitários e fazem parte do CI.

## Prioridade atual — navegador desktop

### 1. Permissões por site

- Continuar negando câmera, microfone e localização por padrão.
- Criar decisão explícita do usuário para permissões específicas e por origem.
- Guardar preferências locais de forma limitada/revogável.
- Página remota nunca pode conceder a própria permissão.

### 2. Validação real no Windows

- Abas, atalhos, popups e login/cookies.
- Restauração após fechamento normal e proteção após encerramento abrupto.
- Favoritos/histórico entre reinicializações.
- Downloads reais: diálogo, progresso, cancelamento, pausa/retomada, arquivo sensível e automático.
- Páginas pesadas e crash de renderer.

### 3. Distribuição

- Empacotamento e instalador Windows.
- Estratégia de assinatura/atualização segura sem custo inesperado; qualquer custo precisa de aprovação.
- Persistir lista de downloads futuramente sem expor caminhos para páginas externas.

## Outras frentes pendentes

### Conta / sincronização
- testar sincronização real em dois dispositivos;
- validar conflitos de notas/projetos;
- proteção contra senhas vazadas do Supabase Auth continua pendente.

### Admin
- suspensão GLOBAL server-side separada de timeout/ban da comunidade;
- reversão com admin + MFA/AAL2 e audit log;
- melhorar tratamento de erros do painel.

### Editor / workspace
- editor de arquivos por projeto;
- snippets e preview isolado;
- import/export sem execução automática.

### IA =]
- melhorar qualidade/compatibilidade local;
- receber somente arquivos/trechos escolhidos explicitamente pelo usuário.

## Regra permanente

Não chamar o PWA de navegador desktop completo. Não prometer filtragem perfeita da internet. Não ativar serviços pagos, domínio, SMS ou APIs pagas sem aprovação explícita.
