# Happy Coding =] — Checklist de lançamento

Atualizado em 2026-09-08.

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
- [x] Limite de 5 posts por hora por usuário.
- [x] Denúncias de posts no banco com RLS.
- [x] Limite de 10 denúncias por hora por usuário.
- [x] Fila de denúncias preparada para moderadores com MFA.
- [x] Página de privacidade.
- [x] Regras da comunidade.
- [x] Edge Function autenticada para exclusão da própria conta.
- [x] Bootstrap de primeiro admin protegido por código único + MFA + fechamento automático após primeiro admin.
- [x] Security Advisor do Supabase sem alertas após as mudanças.
- [x] Base do navegador desktop criada em `/desktop` usando WebContentsView e isolamento de conteúdo remoto.

## Precisa de ação do responsável

- [ ] Criar a primeira conta real no Happy Coding.
- [ ] Confirmar o e-mail usando o fluxo de teste disponível.
- [ ] Ativar MFA/TOTP na conta.
- [ ] Usar a ferramenta de bootstrap com o código de uso único para vincular a conta como admin.
- [ ] Testar: cadastro → login → post → moderação → publicação → denúncia → revisão.

## Bloqueado por domínio / custo externo

- [ ] SMTP de produção para confirmação e recuperação de senha.
- [ ] Domínio próprio para e-mail de produção no Resend.
- [ ] Login por telefone/SMS (deixar para etapa futura; normalmente envolve custo).

## Próximo desenvolvimento web

- [ ] Sincronização opt-in de favoritos, projetos e configurações com Supabase.
- [ ] Interface completa para exclusão/exportação dos dados sincronizados.
- [ ] Editor de arquivos por projeto.
- [ ] Preview isolado de projetos web.
- [ ] Escolha explícita de arquivos/trechos a compartilhar com o assistente.
- [ ] Melhorar compatibilidade/progresso/qualidade da IA local.
- [ ] Reforçar classificação de conteúdo sem prometer detecção perfeita.
- [ ] Mais medidas antiabuso e ferramentas de moderação.
- [ ] Testes end-to-end em desktop e mobile.

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

Não redesenhar a identidade do Happy Coding sem pedido explícito do usuário. Segurança é requisito do produto. Não ativar cobrança, plano pago, domínio, SMS ou API paga sem aprovação explícita.