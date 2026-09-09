# Ativar a conexão GitHub do Happy Coding

O fluxo desktop está implementado com Device Flow. Ele pede somente `read:user` e lista repositórios públicos. O token não vai para o renderer nem para Supabase; é salvo com a proteção do sistema operacional.

## Configuração que falta antes da release pública 0.9.1

O proprietário precisa registrar um OAuth App em https://github.com/settings/applications/new:

- Application name: `Happy Coding`
- Homepage URL: `https://neurovendas.github.io/happy-coding/`
- Application description: `Workspace e navegador para desenvolvedores e criadores de jogos.`
- Authorization callback URL: `https://neurovendas.github.io/happy-coding/` (o campo é exigido no cadastro; este fluxo desktop não usa callback).
- Depois de criar, habilitar **Enable Device Flow** e salvar.

Copiar apenas o **Client ID**, que é público, para `githubClientId` em `desktop/integrations.json`. Não gerar nem incluir Client Secret; este fluxo não precisa dele.

Documentação: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow

Sem Client ID, a interface explica a pendência e desabilita a conexão. O usuário ainda pode colar o URL de um repositório no espaço local. Isso não é apresentado como conta autenticada.

## Validação real pendente

1. Na prévia Windows, criar um espaço, salvar notas e links e confirmar persistência após reiniciar.
2. Escolher o executável Godot e um `project.godot` confiável; confirmar o diálogo e testar abertura.
3. Após configurar o Client ID, conectar a própria conta pelo código, escolher um repositório público e testar cancelamento/desconexão.
4. Testar a atualização instalada v0.9.0 → v0.9.1 depois de publicar a release completa.

Os testes unitários usam respostas de GitHub, armazenamento protegido e processo Godot simulados. Eles não comprovam autorização externa nem funcionamento do instalador Windows.

## Escopo e dados

- `dev-workspaces.json`: espaços locais separados dos projetos web/Supabase existentes. Não há importação nem upload automático de projetos anteriores.
- `github-connection.enc`: token protegido pelo sistema. No Windows, essa proteção não impede outro programa malicioso executando com o mesmo usuário de tentar acessá-lo.
- Máximo de 100 espaços e 10 links por espaço. Abrir referências respeita também o limite de abas do navegador.
- Somente o arquivo e executável escolhidos por diálogos nativos podem ser usados na abertura do Godot. A abertura é confirmada e usa `spawn` com `shell:false`.
- Desconectar apaga a cópia local do token; a tela também oferece acesso às permissões no GitHub para revogar a autorização do lado do serviço.
- Não há acesso a repositórios privados, edição de código remoto, sincronização, integração itch.io ou envio de contexto à IA nesta primeira entrega.
