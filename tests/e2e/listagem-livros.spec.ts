import { test, expect } from '@playwright/test';
import { excluirLivro } from '../../Support/livros';

const ADMIN = {
  email: 'admin@biblioteca.com',
  senha: 'Admin@123',
};

const LEITOR = {
  email: 'leitor@biblioteca.com',
  senha: 'Leitor@123',
};

type Sessao = {
  token: string;
  usuario: {
    id: number;
    nome: string;
    email: string;
    perfil: string;
  };
};

let livroId: number | undefined;
let tokenAdmin: string | undefined;
let tituloLivro: string;
let sessaoLeitor: Sessao;

test.describe('Listagem de livros', () => {

  test.beforeEach(async ({ request }) => {

    // 1. Autenticar o administrador
    const loginAdmin = await request.post('/api/auth/login', {
      data: ADMIN,
    });

    expect(loginAdmin.status()).toBe(200);

    const dadosAdmin = await loginAdmin.json();
    tokenAdmin = dadosAdmin.token;

    // 2. Criar um livro pela API
    const timestamp = Date.now();

    tituloLivro = `Livro E2E ${timestamp}`;

    const dadosLivro = {
      titulo: tituloLivro,
      autor: 'Autor de Testes E2E',
      isbn: `978${timestamp.toString().slice(-10)}`,
      anoPublicacao: 2020,
      quantidade: 1,
    };

    const respostaCadastro = await request.post('/api/livros', {
      headers: {
        Authorization: `Bearer ${tokenAdmin}`,
      },
      data: dadosLivro,
    });

    const livroCriado = await respostaCadastro.json();

    if (typeof livroCriado.id === 'number') {
      livroId = livroCriado.id;
    }

    expect(respostaCadastro.status()).toBe(201);

    // 3. Autenticar o leitor pela API
    const loginLeitor = await request.post('/api/auth/login', {
      data: LEITOR,
    });

    expect(loginLeitor.status()).toBe(200);

    sessaoLeitor = await loginLeitor.json();

  });

  test('exibe o livro criado pela API na listagem', async ({ page }) => {

    // 4. Inserir a sessão do leitor no navegador
    await page.addInitScript((sessao) => {
      localStorage.setItem('token', sessao.token);
      localStorage.setItem('usuario', JSON.stringify(sessao.usuario));
    }, sessaoLeitor);

    // 5. Abrir a listagem de livros
    await page.goto('/livros');

    // 6. Confirmar que o livro aparece na tela
    await expect(
      page.getByTestId(`livro-linha-${livroId}`)
    ).toBeVisible();

    await expect(
      page.getByTestId(`livro-titulo-${livroId}`)
    ).toHaveText(tituloLivro);

    await expect(
      page.getByTestId(`livro-autor-${livroId}`)
    ).toHaveText('Autor de Testes E2E');

    await expect(
      page.getByTestId(`livro-disponibilidade-${livroId}`)
    ).toHaveText('Disponível');

  });

  test.afterEach(async ({ request }) => {

    // 7. Excluir o livro depois do teste
    if (livroId !== undefined && tokenAdmin) {
      await excluirLivro(request, livroId, tokenAdmin);
    }

  });

});