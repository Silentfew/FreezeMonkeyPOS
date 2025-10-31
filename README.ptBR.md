# FreezeMonkey POS

FreezeMonkey POS é uma interface de ponto de venda leve e otimizada para toque construída com Next.js e React. Ela concentra o fluxo de trabalho em uma única tela para gerenciar o catálogo de produtos em pequenos comércios ou cafeterias.

## Funcionalidades

- 🔒 **Login por PIN** – Proteja o acesso ao caixa com um PIN configurável.
- 🧾 **Catálogo de Produtos** – Carrega os produtos de um arquivo JSON no servidor.
- ➕ **Adicionar Produtos** – Crie novos itens diretamente na tela principal.
- ✏️ **Editar Produtos** – Atualize as informações com um toque.
- 🗑️ **Excluir Produtos** – Remova itens e mantenha o catálogo organizado.
- 💾 **Persistência** – As alterações são gravadas em `data/products.json`.
- 💸 **Preços com Duas Casas** – Todos os valores aparecem com duas casas decimais.
- 📱 **Interface Touch** – Controles grandes e de alto contraste para tablets.

## Stack Tecnológica

- **Framework**: Next.js 14 (App Router)
- **Linguagem**: TypeScript
- **Estilização**: Tailwind CSS
- **Armazenamento de Dados**: arquivo JSON persistido no servidor

## Como executar

1. Instale as dependências:
   ```bash
   npm install
   ```
2. (Opcional) Defina um PIN personalizado criando um arquivo `.env.local`:
   ```env
   POS_LOGIN_PIN=2468
   ```
   Se não definido, o aplicativo usa `1234` por padrão.
3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
4. Acesse [http://localhost:3000](http://localhost:3000) e entre com o seu PIN.

## Persistência de Dados

- Os produtos ficam em `data/products.json`.
- Toda inclusão, edição ou exclusão atualiza esse arquivo imediatamente.
- Você pode popular o catálogo editando o JSON antes de iniciar o app.

## Estrutura do Projeto

- `src/app/` – Páginas e rotas API do App Router.
- `src/lib/` – Utilitários para persistência em arquivo.
- `data/products.json` – Armazenamento dos produtos.

## Autenticação

A tela `/login` valida o PIN via rota `/api/session`. Após o login, um cookie HTTP-only é enviado e bloqueia o acesso às APIs para usuários não autenticados.

## Contribuições

Sugestões e melhorias são bem-vindas! Abra uma issue ou envie um pull request.

## Licença

Este projeto é open source e está disponível sob a [Licença MIT](LICENSE).
