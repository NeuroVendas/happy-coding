# Happy Coding =] — Checklist de lançamento

Atualizado em 2026-09-08 com estado verificado no GitHub e no Supabase.

## Pronto / implementado

- [x] Site público no GitHub Pages.
- [x] PWA instalável e shell offline restrito aos arquivos públicos do app.
- [x] Tema original preservado.
- [x] Visitante pode usar sem conta.
- [x] Projetos e notas locais.
- [x] Favoritos e histórico locais com telas próprias.
- [x] Ferramentas JSON, cores, Regex e Focus.
- [x] IA local opcional, sem chave de API e sem custo por mensagem.
- [x] Comunidade beta no Supabase com RLS.
- [x] Posts entram como `pending` e não publicam automaticamente.
- [x] Moderação de posts exige membro de `hc_admin_members` + MFA/AAL2.
- [x] Denúncias com fila de moderação.
- [x] Conta principal em `account.html`, independente da Comunidade.
- [x] Conta administrativa real confirmada, com MFA verificado e membership admin ativa.
- [x] Sessão de autenticação persistente no navegador sem transformar MFA em privilégio admin.
- [x] Bootstrap inicial encerrado permanentemente na Edge Function `bootstrap-admin` v2.
- [x] Admin suite aplicada e testada transacionalmente.
- [x] Migração e RLS de notas aplicadas/testadas.
- [x] Sincronização opt-in inclui perfil, favoritos, projetos e notas.
- [x] Base do navegador desktop criada em `/desktop` usando isolamento de conteúdo remoto.
- [x] Navegador desktop v0.3.0 possui abas múltiplas reais.
- [x] Cada aba remota mantém `nodeIntegration:false`, `contextIsolation:true`, `sandbox:true` e `webSecurity:true`.
- [x] Back/forward desktop usa `webContents.navigationHistory` por aba.
- [x] Popups remotos viram novas abas controladas em vez de novas janelas privilegiadas.
- [x] Atalhos principais de navegador implementados no desktop.
- [x] Core de URL/título/ciclo de abas tem testes unitários e está incluído no CI.
- [x] Service worker web permanece no cache `v8`.

## Segurança — estado atual

- [x] Todas as tabelas novas da admin suite estão com RLS ativo.
- [x] Admin suite exige membership + AAL2 nas políticas sensíveis.
- [x] Usuário sancionado não consegue publicar nem denunciar durante a sanção.
- [x] Admin não consegue sancionar a própria conta pelo modelo atual.
- [x] Audit log não possui política de update/delete para clientes autenticados.
- [x] Persistência do login não altera as regras de autorização.
- [x] Conteúdo web remoto no desktop não recebe Node/Electron APIs.
- [x] Permissões remotas sensíveis são negadas por padrão nesta etapa.
- [x] Navegação desktop normaliza para HTTPS/SafeSearch e não carrega `javascript:`, `data:`, `file:` ou outros esquemas não permitidos.
- [ ] Security Advisor ainda mostra 1 aviso: **Leaked Password Protection Disabled**.

## Precisa de teste real adicional

- [ ] Sincronização em dois navegadores/dispositivos com a conta real.
- [ ] Validar conflito de notas/projetos entre dispositivos.
- [ ] Testar anúncio/evento pelo painel web real com sessão AAL2.
- [ ] Testar timeout/ban/revogação pelo painel web real contra uma segunda conta real.
- [ ] Testar desktop v0.3.0 em Windows: criar muitas abas, fechar, restaurar, trocar com atalhos e navegar em sites reais.
- [ ] Testes end-to-end de crash/reload/render process no desktop.

## Bloqueado / etapa futura com custo externo

- [ ] SMTP de produção para confirmação e recuperação de senha em escala pública.
- [ ] Domínio próprio para e-mail de produção.
- [ ] Login por telefone/SMS.

## Próximo desenvolvimento web

- [ ] Suspensão GLOBAL da conta via server-side/Edge Function, separada do ban da comunidade.
- [ ] Reversão da suspensão global com MFA e audit log.
- [ ] Exportação completa dos dados sincronizados.
- [ ] Editor de arquivos por projeto.
- [ ] Preview isolado de projetos web.
- [ ] Escolha explícita de arquivos/trechos a compartilhar com o assistente.

## Navegador desktop — próxima etapa

- [x] UI privilegiada local separada das páginas externas.
- [x] `nodeIntegration:false` para remoto.
- [x] `contextIsolation:true`.
- [x] `sandbox:true`.
- [x] `webSecurity:true`.
- [x] Permissões sensíveis negadas por padrão.
- [x] Abas múltiplas reais.
- [x] Popup/new-window convertido em nova aba controlada.
- [x] Back/forward por aba com API atual do Electron.
- [x] Atalhos principais de abas/navegação.
- [ ] Downloads seguros com confirmação, progresso e lista de downloads.
- [ ] Histórico/favoritos integrados ao desktop.
- [ ] Restaurar abas/sessão após reiniciar o app.
- [ ] Permissões granulares por site.
- [ ] Filtro de navegação em nível do processo principal.
- [ ] Instalador Windows assinado/testado.
- [ ] Atualização automática segura.

## Regra de produto

Não redesenhar a identidade do Happy Coding sem pedido explícito. Segurança é requisito. Não ativar cobrança, plano pago, domínio, SMS ou API paga sem aprovação explícita.
