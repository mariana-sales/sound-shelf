# Sound Shelf

Aplicação web para organizar músicas e álbuns em coleções pessoais. Projeto acadêmico feito com **HTML, CSS e JavaScript puro**, sem frameworks.

- **GitHub Pages:** https://mariana-sales.github.io/sound-shelf/
- **Repositório:** https://github.com/mariana-sales/sound-shelf

## Entidade principal: Coleção

Cada coleção pertence a um usuário e tem **nome**, **descrição**, **tipo** (`musicas` ou `albuns`), **data de criação** e uma lista de **itens**. Cada coleção só aceita itens do seu tipo.

```
Coleção: { id, usuarioId, nome, descricao, tipo, criadaEm, itens: [] }
Item:    { idExterno, titulo, artista, capa, ano, genero }
```

## Funcionalidades (Etapa 3)

| Requisito | Onde |
|---|---|
| Cadastrar, editar e excluir coleções | `colecoes.html` (formulário com validação; exclusão com confirmação em `<dialog>`) |
| Listar dinamicamente | `colecoes.html` (cards gerados pelo JavaScript a partir dos dados salvos) |
| Visualizar detalhes | botão "Ver coleção": `<dialog>` com dados da coleção, itens e capas; remoção de itens |
| Pesquisar | por nome da coleção (sem diferenciar acentos nem maiúsculas) |
| Filtrar | por tipo (músicas ou álbuns) |
| Ordenar | mais recentes, nome ou quantidade de itens |
| Persistência | `localStorage` (dados sobrevivem ao recarregar a página) |
| Consumo de API | `buscar.html` (API do iTunes) |
| Validação e feedback | mensagens por campo e mensagens de sucesso ou erro em todas as operações |

Pesquisa, filtro e ordenação funcionam em conjunto.

## API pública: iTunes Search

`buscar.html` consulta a **iTunes Search API** (`https://itunes.apple.com/search`, sem chave de acesso). A barra de pesquisa do cabeçalho envia o termo para essa página, que busca **músicas** e **álbuns** em abas.

Fluxo:

```
iTunes Search API -> resultado escolhido -> "Adicionar à coleção" -> localStorage
```

O item escolhido é salvo como cópia na coleção (título, artista, capa, ano e gênero). As capas vindas da API aparecem nos cards da lista e nos detalhes. A página trata os estados de carregamento, erro (com "Tentar novamente"), ausência de resultados e capa indisponível (imagem de reserva).

## Conta de usuário (simulação local)

Para que cada pessoa tenha suas próprias coleções, o projeto tem cadastro e login **simulados no navegador**. Não existe servidor: as contas ficam no `localStorage` deste navegador.

- A senha é guardada como hash (PBKDF2 com sal), nunca em texto puro.
- "Manter conectado" guarda a sessão em `localStorage`; sem ele, em `sessionStorage`.
- Coleções, perfil e busca exigem login. Visitantes acessam apenas a home.

> Isso é uma simulação para fins didáticos e **não substitui autenticação real**.

## Dados guardados no `localStorage`

| Chave | Conteúdo |
|---|---|
| `soundshelf:usuarios` | contas cadastradas |
| `soundshelf:sessao` | usuário logado |
| `soundshelf:colecoes` | coleções e seus itens |

## Estrutura

```
index.html      home
cadastro.html   criar conta
login.html      entrar
perfil.html     perfil
colecoes.html   coleções (CRUD, pesquisa, filtro, ordenação, detalhes)
buscar.html     busca na API do iTunes
detalhes.html   página estática de exemplo (protótipo das etapas 1 e 2)
assets/css/style.css
assets/js/script.js
assets/img/
```

O `script.js` é um arquivo único, dividido em seções: armazenamento, usuários e sessão, coleções, formulários, cabeçalho e proteção de páginas, listagem, detalhes e busca na API.

## Como executar

Abra a pasta em um servidor local (por exemplo, a extensão Live Server do VS Code) e acesse `index.html`. É necessário `localhost` ou HTTPS, porque o hash de senha usa a Web Crypto API.

## Limitações conhecidas

- `perfil.html`, `detalhes.html` e o feed da home usam **dados fictícios** das etapas anteriores, e o perfil ainda não reflete os dados da conta.
- Avaliações, favoritos e "Fixar no perfil" são apenas visuais.
- Como os dados ficam no navegador, não são compartilhados entre dispositivos.
