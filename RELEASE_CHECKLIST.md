# Happy Coding =] — Checklist de lançamento

Atualizado em 2026-09-09 com o estado verificado no GitHub, Supabase, CI e testes reais já confirmados no Windows.

## v0.10.0 — implementado / verificado por código e CI

- [x] Identidade visual usa a carinha `=]` verde; build Windows gera `.ico` próprio em 16–256 px e não depende do ícone de átomo do Electron.
- [x] Projetos de exemplo legados `Soulbound`, `Pixel Forge` e `Quiet Forest` são removidos da experiência visível; usuário novo começa sem projetos falsos.
- [x] Busca interna mostra resposta direta baseada nas fontes e mantém resultados numerados abríveis.
- [x] Busca bloqueada retorna explicação segura em vez de apenas esconder resultados.
- [x] Assistente usa IA em nuvem; não exige download local de modelo.
- [x] Contexto de projeto para a IA continua opt-in e explícito: nome, tecnologia, descrição e notas; nenhum arquivo é lido automaticamente.
- [x] Cadeia real validada no CI: cliente público → `ai-chat` → Supabase Vault → Gemini → resposta.
- [x] Cadeia real validada no CI: `web-search` → fontes → `ai-chat` em modo search → resposta fundamentada nas fontes.
- [x] IA prioriza caminho de baixa latência e possui fallback controlado quando o provedor oscila.
- [x] Rate limit local + global em Postgres para IA e busca; identificador de conexão persistido somente como HMAC-SHA256, sem IP em texto.
- [x] Chave Gemini fica somente no Supabase Vault; frontend recebe apenas chave publishable pública do Supabase.
- [x] Edge Functions validam `apikey`, origem permitida, método, payload, limites e recusas server-side para abuso perigoso.
- [x] Código das Edge Functions e migrations está versionado no repositório.
- [x] Perfis públicos opt-in com `@username`, nome e bio; e-mail não é público.
- [x] Busca de pessoas na comunidade.
- [x] `✓ Admin` é derivado de membership server-side; não confia em `user_metadata`.
- [x] Se um post visível não puder ser associado com segurança a um único `author_id`, o selo é omitido.
- [x] `▶ Continuar projeto` reabre repositório/referências e pode iniciar Godot somente pelo fluxo nativo confirmado.
- [x] Issues abertas de repositório público aparecem dentro do espaço do projeto em modo somente leitura.
- [x] GitHub Device Flow mantém escopo mínimo `read:user` para a conexão atual e token criptografado pelo Windows quando disponível.
- [x] Godot continua usando seleção nativa, confirmação e `spawn` com `shell:false`.
- [x] `package-lock.json` do Desktop foi fixado; preview e release usam `npm ci` para builds reproduzíveis.
- [x] Service worker atualizado para a geração v15 da shell v0.10.

## Segurança — estado atual

- [x] RLS/admin sensível continua exigindo membership real; operações administrativas sensíveis permanecem separadas de metadata do cliente.
- [x] MFA/AAL2 continua sendo requisito para ações administrativas sensíveis previstas no backend.
- [x] Conteúdo remoto Desktop não recebe Node/Electron APIs nem filesystem.
- [x] `nodeIntegration:false`, `contextIsolation:true`, `sandbox:true`, `webSecurity:true` para conteúdo remoto.
- [x] Permissões remotas sensíveis negadas por padrão.
- [x] Popups remotos viram abas internas controladas.
- [x] Downloads, histórico, favoritos e sessão continuam no processo/armazenamento privilegiado local, não expostos a páginas remotas.
- [x] Navegação normaliza HTTPS/SafeSearch e bloqueia esquemas não permitidos.
- [x] Security Advisor revalidado após as migrations v0.10 sem novos WARN de schema/RLS.
- [ ] Supabase Auth ainda mostra **Leaked Password Protection Disabled**.

## Validado em runtime pelo usuário no Windows

- [x] v0.9.0 → v0.9.1 por auto-update.
- [x] v0.9.1 → v0.9.2 por auto-update.
- [x] O aviso de update pode levar alguns segundos para aparecer após abrir o app; o mecanismo já funcionou em duas atualizações reais.
- [x] Navegador Desktop básico e atualização automática já foram usados no ambiente real do usuário.

## v0.10.0 — falta teste humano antes do merge/release

- [ ] Instalar/abrir o preview v0.10.0 no Windows e confirmar que o ícone mostrado é `=]` verde, não o átomo.
- [ ] Confirmar que `+` continua ao lado da última aba e `▱ Projetos` continua fácil de encontrar.
- [ ] Confirmar que não aparecem `Soulbound`, `Pixel Forge` nem `Quiet Forest` para a experiência inicial.
- [ ] Fazer uma busca normal e confirmar: resposta direta + links/resultados.
- [ ] Fazer uma busca que deva ser bloqueada e confirmar que aparece explicação segura sem resultado impróprio.
- [ ] Abrir o `=]`, mandar mensagem comum e confirmar resposta em nuvem sem qualquer download de modelo.
- [ ] Criar perfil público, buscar o próprio `@username` e confirmar que e-mail não aparece.
- [ ] Confirmar visualmente `✓ Admin` em um post realmente escrito por admin.
- [ ] Criar espaço `Meu jogo`; salvar notas; fechar/reabrir e confirmar persistência.
- [ ] Salvar abas/referências e usar `▶ Continuar projeto`.
- [ ] GitHub Device Flow real: autorizar, reconhecer conta, listar repositórios públicos e desconectar/reconectar.
- [ ] Vincular repositório público com issue aberta e confirmar lista read-only dentro do projeto.
- [ ] Selecionar `Godot.exe` + `project.godot`, confirmar o diálogo e abrir o projeto correto.
- [ ] Confirmar que navegação normal, abas, voltar/avançar, downloads, histórico/favoritos e restauração continuam funcionando depois das mudanças.

## Depois do teste humano da v0.10

- [ ] Marcar PR #4 como Ready for review.
- [ ] Fazer merge somente se o CI do head final estiver verde.
- [ ] Deixar o workflow oficial gerar a release `v0.10.0` e os assets Squirrel/ZIP.
- [ ] Testar **0.9.2 → 0.10.0 pelo auto-update**, sem instalar manualmente primeiro.
- [ ] Depois do update, repetir smoke rápido de abas, Projetos, busca e IA.

## Backlog posterior

- [ ] Suspensão GLOBAL server-side separada do ban da comunidade.
- [ ] Reversão de suspensão com MFA e audit log.
- [ ] Exportação completa dos dados sincronizados.
- [ ] Editor/preview isolado e escolha explícita de arquivos para a IA.
- [ ] Permissões granulares por site.
- [ ] Testes end-to-end automatizados adicionais no Windows.
- [ ] Assinatura de código somente com estratégia/custo aprovado.

## Regra de produto

Não redesenhar a identidade do Happy Coding sem pedido explícito. Segurança é requisito. Não ativar cobrança, plano pago, domínio, SMS ou API paga sem aprovação explícita. Não liberar uma versão nativa apenas porque o CI passou: mudanças de interface, integração com programas locais e auto-update precisam de validação real no Windows.
