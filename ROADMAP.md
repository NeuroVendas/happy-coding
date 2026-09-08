# Happy Coding =] — próximos passos

Direção confirmada pelo usuário: navegador funcional para programadores/game devs, com ferramentas úteis, IA e comunidade. Custo zero como prioridade e segurança das pessoas como limite.

## Entregue neste ciclo

- Tema original grafite/verde-lima recuperado a partir do protótipo.
- Favoritos e histórico com listas e remoção; navegação interna com URLs e controles Voltar/Avançar; navegação móvel e atalhos para ferramentas.
- Comunidade conectada ao Supabase: feed público, filtros, envios de código/projetos/conversas, copiar código, excluir o próprio post e revisão manual.
- Permissões no servidor: sem publicação direta por usuários; revisão depende de membro admin com MFA/AAL2.

## Pendências para abrir a comunidade a mais pessoas

1. Concluir e validar envio de confirmação/recuperação por e-mail e redirects para `https://neurovendas.github.io/happy-coding/`. Não remover confirmação de e-mail como atalho.
2. Desenvolvedor criar conta, verificar identidade e associar essa conta a `hc_admin_members`; configurar TOTP na tela Minha conta. Nenhuma conta ganha admin pelo nome nem por ser a primeira.
3. Fazer um teste real de cadastro → confirmação → envio → revisão → leitura por outra pessoa. Testes de RLS já passaram com fixtures revertidas, mas não comprovam entrega de e-mail.
4. Definir rotina de revisão e critérios claros para conteúdo permitido. Adicionar denúncias, medidas contra abuso e política de privacidade antes de ampliar a distribuição.

## Ferramentas e IA

- Editor de arquivos por projeto, com salvamento local, exportação e prévia isolada. Não executar código na origem que guarda as sessões de conta.
- Oferecer ao usuário a escolha explícita de quais arquivos/trechos compartilhar com o assistente.
- Melhorar compatibilidade e mensagens de progresso da IA local. Modelo continua opcional; não baixar automaticamente.
- Login opcional para sincronização; projetos locais não devem ser enviados silenciosamente.

## Navegador desktop real

O site/PWA é o workspace web. Ele não controla páginas abertas em outras abas do navegador hospedeiro.

A próxima etapa de navegador exige um projeto desktop para Windows, inicialmente, com motor web mantido e:

- abas, endereços, voltar/avançar e downloads reais;
- interface privilegiada separada das páginas externas;
- permissões de câmera/microfone/localização negadas por padrão e solicitadas por origem;
- bloqueio de navegação/downloads aplicado fora do JavaScript das páginas;
- atualização segura, armazenamento de credenciais e teste do instalador no Windows.

Não chamar um iframe ou link externo de navegador completo. Não prometer filtragem perfeita da internet. O caminho desktop deve manter o visual e reutilizar comunidade/ferramentas sem expor permissões do sistema ao conteúdo web.
