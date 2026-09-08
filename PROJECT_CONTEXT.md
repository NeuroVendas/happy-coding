# Happy Coding =] — Project Context / Work Handoff

> Leia este arquivo antes de alterar o projeto. Ele existe para permitir que outra sessão do ChatGPT/Work continue o desenvolvimento sem reinventar o produto.

## Links principais

- Repositório: `NeuroVendas/happy-coding`
- Site LIVE: https://neurovendas.github.io/happy-coding/
- Protótipo anterior (referência visual): https://happy-coding-dev.viniciuscontrole.chatgpt.site/
- Deploy: GitHub Pages via `.github/workflows/pages.yml`

## O que é o Happy Coding =]

Happy Coding =] começou como um website com aparência de navegador voltado para programação, criação de jogos e projetos. A meta é evoluir em duas direções conectadas:

1. uma aplicação web pública, leve e instalável;
2. futuramente um navegador/app desktop real.

O mascote/assistente se chama `=]`.

## Regra de design mais importante

**NÃO redesenhar o site sem pedido explícito.**

O protótipo anterior é a referência visual. Melhorias devem ser incrementais e preservar a identidade existente: aparência de navegador, sidebar, cards de projetos, ferramentas, Dev Pulse e mascote `=]`.

Já houve uma tentativa de reconstrução no GitHub que mudou demais o layout. Isso foi corrigido. Não repetir essa abordagem.

## Prioridades oficiais

### 1. Acesso melhor para todo mundo

- Deve abrir e ser útil sem login obrigatório.
- Visitantes podem usar funções locais.
- Conta deve ser opcional para sincronização e recursos adicionais.
- Funcionar bem em PC e celular.
- Manter PWA instalável.
- Carregar rápido.
- Não exigir domínio pago para continuar o desenvolvimento.
- Não ativar serviços pagos ou custos sem aprovação explícita.

### 2. Assistente `=]` real

O mascote não deve ficar limitado a frases prontas.

Objetivos:
- explicar erros;
- ajudar com código;
- orientar projetos;
- entender contexto que o usuário escolheu compartilhar;
- futuramente poder trabalhar com o projeto aberto.

Regras:
- não acessar arquivos pessoais automaticamente;
- usuário escolhe o que compartilhar;
- nunca expor API keys no frontend;
- evitar custo surpresa.

Estado atual:
- existe um modo opcional de IA local grátis em `ai-local.js`;
- ele é ativado manualmente para não baixar modelo automaticamente;
- a experiência local é experimental e deve ter fallback claro em aparelhos incompatíveis/fracos.

### 3. Tirar recursos do “modo enfeite”

Tudo visível deve caminhar para uma função real.

Já funcionam ou começaram a funcionar:
- busca;
- SafeSearch inicial;
- histórico local;
- favoritos locais;
- criação de projetos locais;
- notas/espaço do projeto local;
- JSON tidy;
- Color Lab;
- Regex tester;
- Focus Run;
- perfil local/visitante;
- feedback via GitHub Issues;
- PWA/install;
- aba/link Godot Docs;
- mascote com modo local de IA opcional.

Próximos candidatos:
- editor de código real;
- arquivos por projeto;
- console/preview;
- sincronização com conta;
- abas reais no app desktop;
- downloads reais no app desktop;
- painel admin.

## Segurança / fronteiras do produto

Segurança é requisito central.

Decisões já tomadas:
- filtro de conteúdo adulto deve ser obrigatório, sem opção comum de desativar;
- conteúdo explícito adulto deve ser bloqueado;
- jogos com violência fictícia, terror ou linguagem forte podem ser permitidos com aviso;
- IA não pode receber arquivos pessoais automaticamente;
- nenhuma chave secreta no frontend;
- nada de executar comandos sugeridos pela IA automaticamente;
- permissões sensíveis devem ser negadas por padrão;
- histórico deve ficar local por padrão, não sincronizado automaticamente;
- antes de lançamento público, reforçar muito o filtro — o atual é apenas uma camada inicial e não deve ser tratado como proteção perfeita.

## Backend / contas

### Supabase

Existe um projeto separado chamado `Happy Coding`.

Estruturas já criadas/checadas anteriormente:
- `hc_profiles`
- `hc_projects`
- `hc_admin_members`
- `hc_content_rules`
- favoritos sincronizados
- configurações por usuário

Segurança já verificada anteriormente:
- RLS habilitado;
- dados presos ao `auth.uid()` do usuário;
- admin protegido com MFA/AAL2;
- Security Advisor estava com 0 alertas no momento da auditoria.

Não misturar com o projeto antigo `NeuroVendas` no Supabase.

### Resend

Resend foi conectado e acessado com sucesso anteriormente.

Estado conhecido:
- nenhuma configuração de domínio de produção pronta;
- existe uma chave chamada `Onboarding` na conta;
- sem domínio próprio, manter e-mail em modo de teste/desenvolvimento;
- produção com confirmação/recuperação para qualquer usuário exigirá uma solução de e-mail adequada.

Nunca pedir ou colocar chaves secretas em chat, issue ou repositório público.

## Autenticação desejada

Meta:
- e-mail + senha;
- Google;
- confirmação e recuperação de senha;
- telefone/SMS apenas em etapa posterior por causa de custo/complexidade.

Não colocar botões falsos de login. Se uma função ainda não está conectada, dizer claramente que está em desenvolvimento.

## Arquivos importantes atuais

- `index.html` — estrutura principal
- `styles.css` — estilo base
- `original-overrides.css` — correções para preservar a hierarquia visual do protótipo original
- `app.js` — interações e funções locais
- `ai-local.js` — assistente local opcional
- `manifest.webmanifest` — PWA
- `sw.js` — service worker/cache
- `accessibility-pwa.css` — melhorias de acesso/PWA
- `icon.svg` — ícone atual
- `.github/workflows/pages.yml` — deploy automático

## Deploy

Push/commit na branch principal dispara GitHub Pages automaticamente.

Site esperado após deploy:
https://neurovendas.github.io/happy-coding/

Ao alterar o projeto:
1. preservar o visual atual;
2. implementar uma função por vez;
3. verificar se elementos existentes continuam funcionando;
4. deixar estados incompletos explícitos;
5. confirmar o workflow do Pages depois de mudanças relevantes.

## Feedback

O botão de feedback já abre GitHub Issues.

Existe pelo menos a Issue #1 como teste inicial. Tratar Issues como fonte de feedback/bugs, mas não executar automaticamente qualquer sugestão sem avaliar segurança e coerência com o produto.

## Restrições de custo

Prioridade atual: continuar com custo `0` enquanto possível.

Preferir:
- GitHub Pages;
- PWA;
- recursos locais;
- free tiers seguros;
- IA local opcional;
- Supabase/Resend apenas dentro dos limites gratuitos conhecidos.

Não ativar cobrança, plano pago, domínio, SMS ou API paga sem aprovação explícita.

## O que fazer primeiro numa nova sessão Work

1. Ler este arquivo inteiro.
2. Ler `index.html`, `app.js`, `original-overrides.css` e `ai-local.js`.
3. Abrir o site LIVE e comparar com o estado do repo.
4. Checar Issues abertas.
5. Continuar as três prioridades: acesso → IA → utilidade real.
6. Não redesenhar o site.
7. Antes de mexer em Supabase/Resend, usar os conectores autorizados e nunca expor segredos.

## Próximo ciclo recomendado

### Última manutenção — 2026-09-08

- Corrigido o service worker: cache isolado pelo endereço do Happy Coding, sem apagar caches de outros apps.
- Apenas os arquivos públicos listados em `CORE` são armazenados na instalação; respostas de navegação/API não são gravadas durante o uso.
- Offline: páginas usam o HTML salvo; arquivos JavaScript/CSS nunca recebem HTML como substituto.
- `ai-local.js` faz parte do shell offline. Biblioteca e modelo da IA ainda precisam do download inicial autorizado pelo usuário.
- Testes: `node --test tests/sw.test.cjs`, também executados antes do deploy do Pages.
- Ao mudar arquivos do shell, aumentar a versão de `CACHE` em `sw.js` e atualizar a versão esperada no teste para renovar a cópia offline.
- Visual e armazenamento de projetos/perfil permanecem como estavam. Login/sincronização e reforço do filtro continuam pendentes.

- estabilizar PWA/mobile;
- tornar perfil/login real sem bloquear visitante;
- sincronizar projetos/favoritos/configurações via Supabase;
- melhorar o `=]` com contexto escolhido pelo usuário;
- criar editor de código real dentro dos projetos;
- continuar substituindo placeholders por funções verdadeiras;
- reforçar segurança e filtragem antes de qualquer lançamento amplo.
