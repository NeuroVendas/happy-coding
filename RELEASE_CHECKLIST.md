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
- [x] Limite de posts e denúncias aplicado no backend da comunidade.
- [x] Denúncias com fila de moderação.
- [x] Página de privacidade e regras da comunidade.
- [x] Edge Function autenticada para exclusão da própria conta.
- [x] Conta principal em `account.html`, independente da Comunidade.
- [x] Existe 1 conta real confirmada.
- [x] Existe 1 fator MFA verificado.
- [x] Existe 1 administrador real em `hc_admin_members`.
- [x] Bootstrap inicial encerrado permanentemente na Edge Function `bootstrap-admin` v2.
- [x] Admin suite aplicada: diretório, timeout/ban da comunidade, anúncios, eventos e audit log.
- [x] Testes transacionais de autorização da admin suite passaram e foram revertidos.
- [x] Migração de notas aplicada em `hc_projects`.
- [x] RLS das notas testada com usuário dono e outro usuário.
- [x] Sincronização opt-in agora inclui perfil, favoritos, projetos e notas.
- [x] Base do navegador desktop criada em `/desktop` usando isolamento de conteúdo remoto.
- [x] Service worker usa cache `v7` após a atualização da sincronização.

## Segurança — estado atual

- [x] Todas as tabelas novas da admin suite estão com RLS ativo.
- [x] Admin suite exige membership + AAL2 nas políticas sensíveis.
- [x] Usuário sancionado não consegue publicar nem denunciar durante a sanção.
- [x] Admin não consegue sancionar a própria conta pelo modelo atual.
- [x] Audit log não possui política de update/delete para clientes autenticados.
- [ ] Security Advisor ainda mostra 1 aviso: **Leaked Password Protection Disabled**.

## Precisa de teste real adicional

- [ ] Sincronização em dois navegadores/dispositivos com a conta real.
- [ ] Alterar notas em um dispositivo e confirmar recuperação no outro.
- [ ] Validar conflito quando os dois dispositivos editam o mesmo projeto/nota.
- [ ] Testar anúncio/evento pelo painel web real com sessão AAL2, além do teste SQL transacional.
- [ ] Testar timeout/ban/revogação pelo painel web real contra uma segunda conta real.
- [ ] Testes end-to-end em desktop e mobile.

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
- [ ] Melhorar compatibilidade/progresso/qualidade da IA local.
- [ ] Reforçar classificação de conteúdo sem prometer detecção perfeita.

## Navegador desktop

Base criada em `/desktop`.

- [x] UI privilegiada local separada das páginas externas.
- [x] `nodeIntegration:false` para remoto.
- [x] `contextIsolation:true`.
- [x] `sandbox:true`.
- [x] `webSecurity:true`.
- [x] Permissões sensíveis negadas por padrão na primeira etapa.
- [x] Popups limitados.
- [x] Navegação HTTPS + pesquisa SafeSearch.
- [ ] Abas múltiplas reais.
- [ ] Downloads seguros e lista de downloads.
- [ ] Histórico/favoritos integrados ao desktop.
- [ ] Filtro de navegação em nível do processo principal.
- [ ] Instalador Windows assinado/testado.
- [ ] Atualização automática segura.

## Regra de produto

Não redesenhar a identidade do Happy Coding sem pedido explícito. Segurança é requisito. Não ativar cobrança, plano pago, domínio, SMS ou API paga sem aprovação explícita.
