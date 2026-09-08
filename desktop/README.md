# Happy Coding =] Desktop

Protótipo do navegador desktop real para Windows. Esta pasta é separada do site/PWA.

## Estado atual

- Interface privilegiada local (`chrome.html`) separada das páginas externas.
- Conteúdo remoto usa `WebContentsView` com `nodeIntegration:false`, `contextIsolation:true`, `sandbox:true` e `webSecurity:true`.
- Permissões de câmera, microfone, localização e similares são negadas por padrão nesta etapa.
- Popups são bloqueados e transformados em navegação controlada na mesma aba.
- Navegação direta aceita HTTPS; textos viram pesquisa Google com SafeSearch.
- IPC expõe apenas operações específicas de navegar/voltar/avançar/recarregar e valida o `sender` no processo principal.

## Ainda não pronto

- Abas múltiplas reais.
- Downloads com quarentena/aviso e lista de downloads.
- Favoritos/histórico integrados ao app desktop.
- Perfil e comunidade integrados sem misturar privilégios com páginas externas.
- Filtro de conteúdo em nível de rede/navegação.
- Atualização automática assinada e instalador Windows.
- Persistência segura de credenciais e testes end-to-end no Windows.

## Executar em desenvolvimento

Requer Node.js e npm:

```bash
cd desktop
npm install
npm start
```

Nunca habilite Node.js para páginas externas e não desative `webSecurity` para "fazer funcionar". O frontend privilegiado deve continuar local e separado do conteúdo web.