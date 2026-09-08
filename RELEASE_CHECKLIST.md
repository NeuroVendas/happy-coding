# Happy Coding =] — Checklist de lançamento

Atualizado em 2026-09-08 com estado verificado no GitHub e no Supabase.

## Pronto / implementado

- [x] Site público no GitHub Pages e PWA com tema original.
- [x] Conta, comunidade, MFA/admin, admin suite e sync opt-in de perfil/favoritos/projetos/notas.
- [x] Base do navegador desktop isolando UI local de conteúdo remoto.
- [x] Desktop v0.6.0 com abas múltiplas reais e back/forward por aba.
- [x] Remoto mantém `nodeIntegration:false`, `contextIsolation:true`, `sandbox:true`, `webSecurity:true`.
- [x] Popups remotos viram abas controladas.
- [x] Atalhos principais de navegação e `Ctrl+D` para favorito.
- [x] Downloads controlados no processo principal, com diálogo nativo, progresso, controles e aviso extra para fluxos/arquivos sensíveis.
- [x] Histórico/favoritos desktop persistentes em arquivo local de `userData`, inacessível às páginas remotas.
- [x] Histórico limitado e limpável; favoritos adicionáveis/removíveis pela UI local.
- [x] Restauração de sessão guarda apenas URLs HTTPS e no máximo 10 abas.
- [x] Restauração automática ocorre somente após fechamento limpo; execução anterior não limpa abre Home para evitar loop de crash.
- [x] Cores de navegação/download/biblioteca/sessão possuem testes unitários no CI.
- [x] Service worker web permanece no cache `v8`.

## Segurança — estado atual

- [x] RLS/admin sensível continua exigindo membership + AAL2.
- [x] Conteúdo remoto desktop não recebe Node/Electron APIs nem filesystem.
- [x] Permissões remotas sensíveis continuam negadas por padrão.
- [x] Navegação desktop normaliza para HTTPS/SafeSearch e esquemas não permitidos não são carregados diretamente.
- [x] Caminho completo de download não é exposto ao renderer remoto.
- [x] Histórico/favoritos e sessão aceitam somente URLs HTTPS ao carregar/persistir.
- [x] Classificação de extensão de download é camada de proteção, não antivírus.
- [ ] Security Advisor ainda mostra **Leaked Password Protection Disabled**.

## Precisa de teste real adicional

- [ ] Sincronização em dois navegadores/dispositivos e conflitos de notas/projetos.
- [ ] Admin web real com segunda conta para sanções/eventos/anúncios.
- [ ] Desktop v0.6.0 em Windows: abas, atalhos, sites, login/cookies e popups.
- [ ] Favoritos/histórico persistindo após fechar/reabrir o desktop.
- [ ] Sessão de abas restaurando após fechamento normal.
- [ ] Encerramento abrupto/crash abrindo somente a Home no próximo início.
- [ ] Downloads reais no Windows: diálogo, pequeno/grande, cancelar, pausar/retomar, sensível e automático.
- [ ] Crash/reload/render process em páginas reais.

## Próximo desenvolvimento web

- [ ] Suspensão GLOBAL server-side separada do ban da comunidade.
- [ ] Reversão da suspensão com MFA e audit log.
- [ ] Exportação completa dos dados sincronizados.
- [ ] Editor/preview isolado e escolha explícita de arquivos para a IA.

## Navegador desktop — próxima etapa

- [x] Abas múltiplas reais.
- [x] Downloads seguros/controlados.
- [x] Histórico/favoritos persistentes locais.
- [x] Restauração segura das abas após fechamento limpo.
- [ ] Permissões granulares por site.
- [ ] Filtro de navegação no processo principal.
- [ ] Testes end-to-end no Windows.
- [ ] Instalador Windows testado.
- [ ] Atualização automática segura.
- [ ] Assinatura somente com estratégia/custo aprovado.

## Regra de produto

Não redesenhar a identidade do Happy Coding sem pedido explícito. Segurança é requisito. Não ativar cobrança, plano pago, domínio, SMS ou API paga sem aprovação explícita.
