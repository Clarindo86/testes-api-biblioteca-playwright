# Testes de API — Biblioteca com Playwright

Projeto de automação da Biblioteca API usando Playwright, TypeScript e `APIRequestContext`.
A API usada como base é: https://github.com/Brencosta/api-testing-playwright

## Cenários implementados

1. **Consulta de livro:** chama `GET /api/livros/1` e valida HTTP 200, título `Dom Casmurro` e `disponivel: true`.
2. **Cadastro com administrador:** faz login, cadastra um livro e valida HTTP 201, os campos enviados, o `id` e a quantidade disponível. O livro criado é apagado no bloco `finally`, evitando deixar dados de teste no banco.
3. **Cadastro sem token:** chama `POST /api/livros` sem autenticação e valida HTTP 401 e `erro: "Token não informado"`.
4. **Empréstimo sem estoque:** autentica como leitor, tenta emprestar o livro 4 (`Vidas Secas`) e valida HTTP 409 e `erro: "Livro indisponível"`.

Todos os testes validam o status HTTP e pelo menos um campo do corpo da resposta.

## Pré-requisitos

- Node.js 18 ou superior.
- A Biblioteca API em execução, com o seed padrão aplicado.

## Executar os testes

### 1. Iniciar a API

Em um terminal, dentro da pasta do projeto da Biblioteca API:

```bash
npm install
npm run dev
```

A API deve ficar disponível em `http://localhost:3000`.

### 2. Instalar dependências deste projeto

Em outro terminal, dentro da pasta deste projeto:

```bash
npm install
```

### 3. Executar

```bash
npm run test:api
```

O projeto usa somente requisições HTTP, então não é necessário instalar navegadores do Playwright.

### Usar outra URL para a API

PowerShell:

```powershell
$env:API_BASE_URL="http://localhost:4000"
npm run test:api
```

Linux/macOS:

```bash
API_BASE_URL=http://localhost:4000 npm run test:api
```

## Credenciais do seed

As credenciais são as fornecidas no README da API de referência:

- Administrador: `admin@biblioteca.com` / `Admin@123`
- Leitor: `leitor@biblioteca.com` / `Leitor@123`

Os tokens são obtidos durante os testes e não são gravados no projeto.

## Estrutura

```text
.
├── tests/
│   └── api/
│       └── biblioteca-api.spec.ts
├── .gitignore
├── package.json
├── playwright.config.ts
└── tsconfig.json
```
