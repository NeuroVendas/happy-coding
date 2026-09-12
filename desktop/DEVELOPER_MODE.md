# Happy Coding v0.11.0 — prévia do Modo Desenvolvedor

Abra **</> Dev** na barra nativa ou pressione **Ctrl+Shift+D**. O painel fica na janela existente. F12 / Ctrl+Shift+I abre DevTools da página; clique direito oferece Inspecionar.

## Fluxo implementado

1. Abra um projeto HTTPS ou localhost na área Testar.
2. Telas cria três ambientes a 390/768/1440 pixels, reduzidos para caber. Contas cria três sessões independentes para login manual. Todas são temporárias e separadas da navegação normal.
3. Escolha a tela e simule conexão normal, lenta ou offline. Sincronização opcional em Telas replica endereço e rolagem, nunca formulários/cliques.
4. Diagnóstico verifica rótulos, imagens, overflow e contraste simples em fundos sólidos. Inspecionar abre o elemento nas ferramentas Chromium.
5. Capture antes/depois. A interface mostra mistura das imagens e diferenças de pixels; animações e conteúdo dinâmico também contam como diferenças.
6. Prepare um relato com título, passos, esperado e resultado. Logs e screenshot são opt-in. Revise o JSON antes de exportar. Texto pode ser copiado para uma issue ou assistente.
7. Salve configurações de projeto com URL, engine/versão, documentação escolhida e referências com notas/licença. Metadados e testes ficam em `developer-projects.json`; não migra arquivos dos projetos anteriores.
8. API faz requisições explícitas, sem cookies do navegador. Bearer opcional fica só em memória durante a requisição. Escritas pedem confirmação nativa. Limites: 15 s e 1 MB; sem redirects.
9. Automação inicial grava cliques em links/botões de localhost e verificações de texto por seletor. Não grava entradas digitadas/senhas. Replay pede confirmação por clique e para ao sair da origem local.
10. Playtest marca observações com tempo. Convite copiável abre a comunidade existente para revisão/publicação manual. Os registros podem entrar no relato.

## Limites explícitos desta prévia

- Não simula outros motores: as três telas usam Chromium. Não prova compatibilidade com Safari/Firefox ou aparelhos reais.
- Auditoria é parcial, sem certificação de acessibilidade. Contraste com transparência, imagens, gradientes e herança complexa exige inspeção manual.
- Gravação é experimental, limitada a navegação, cliques e texto esperado no documento principal. Não automatiza login digitado, canvas, iframes, upload ou produção. Não equivale ao Playwright.
- IA contextual nesta etapa é uma pergunta preparada/copied com relato revisado e referências escolhidas. Não há agente automático que lê todo o projeto ou aplica correções.
- Comunidade de playtest reutiliza posts existentes. Hospedagem de builds, comentários ligados a frames, ciclo de resolução e edição colaborativa ainda não estão implementados.
- Requisições de API não têm cofre de credenciais nem coleção persistente nesta etapa. O token não é salvo em projetos, logs ou relatos.
- Central localhost verifica uma URL cadastrada; não descobre portas nem inicia processos silenciosamente.
- Filtro de endereços básico não é classificação universal de conteúdo. A proteção/SafeSearch existente não foi removida; os ambientes novos recusam esquemas inseguros, HTTP externo e domínios adultos conhecidos. Isso não garante detecção de todo conteúdo adulto.
- Sessões temporárias são limpas ao fechar os ambientes. Configurações do projeto precisam ser salvas explicitamente. Capturas, logs e resposta de API ficam em memória nesta janela.

## Verificação

- `npm ci` e `npm run check` em desktop; `node --test desktop/tests/*.test.cjs tests/*.test.cjs` na raiz.
- `npx --no-install electron developer-smoke.cjs` em desktop executa Electron real contra fixture HTTP local: separação de sessões, ausência do bridge no remoto, emulação, auditoria, captura, API local, controles de rede, persistência e relato opt-in.
- Windows CI produz prévia e executa startup do pacote. Isso não substitui testar uso diário, atualização instalada e projetos Godot reais.

## Próximos critérios antes de uma release pública

Testar no Windows do usuário: abrir/fechar bancada, trocar abas, comparar capturas, entrar em duas contas de teste, gravar/repetir um fluxo simples, revisar/exportar relato e conferir que a navegação normal preserva as sessões. Validar também o shell web atualizado antes do deploy público.
