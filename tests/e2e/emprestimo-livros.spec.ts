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

type SessaoLeitor = {
  token: string;
  usuario: {
    id: number;
    nome: string;
    email: string;
    perfil: string;
  };
};

type Emprestimo = {
  id: number;
  livroId: number;
  usuarioId: number;
  status: string;
};

let livroId: number | undefined;
let tokenAdmin: string | undefined;
let leitorId: number | undefined;
let sessaoLeitor: SessaoLeitor | undefined;
let tituloLivro: string;

test.describe('Empréstimo de livros', () => {

  // SETUP: preparar os dados pela API
  test.beforeEach(async ({ request }) => {

    livroId = undefined;
    tokenAdmin = undefined;
    leitorId = undefined;
    sessaoLeitor = undefined;

    // 1. Login do administrador
    const loginAdmin = await request.post('/api/auth/login', {
      data: ADMIN,
    });

    expect(loginAdmin.status()).toBe(200);

    const dadosAdmin = await loginAdmin.json();
    tokenAdmin = dadosAdmin.token;

    // 2. Criar livro pela API
    const timestamp = Date.now();

    tituloLivro = `Livro Emprestimo ${timestamp}`;

    const respostaLivro = await request.post('/api/livros', {
      headers: {
        Authorization: `Bearer ${tokenAdmin}`,
      },
      data: {
        titulo: tituloLivro,
        autor: 'Autor E2E',
        isbn: `978${timestamp.toString().slice(-10)}`,
        anoPublicacao: 2020,
        quantidade: 1,
      },
    });

    const livroCriado = await respostaLivro.json();

    if (typeof livroCriado.id === 'number') {
      livroId = livroCriado.id;
    }

    expect(respostaLivro.status()).toBe(201);

    // 3. Login do leitor
    const loginLeitor = await request.post('/api/auth/login', {
      data: LEITOR,
    });

    expect(loginLeitor.status()).toBe(200);

    sessaoLeitor = await loginLeitor.json();
    leitorId = sessaoLeitor!.usuario.id;

  });

  // TESTE: realizar empréstimo pela interface
  test('leitor empresta um livro pela tela', async ({ page }) => {

    // 4. Preparar a sessão do leitor no navegador
    await page.addInitScript((sessao) => {
      localStorage.setItem('token', sessao.token);
      localStorage.setItem(
        'usuario',
        JSON.stringify(sessao.usuario),
      );
    }, sessaoLeitor!);

    // 5. Abrir os detalhes do livro
    await page.goto(`/livros/${livroId}`);

    // 6. Clicar no botão de empréstimo
    await page.getByTestId('botao-emprestar').click();

    // 7. Validar mensagem de sucesso
    await expect(
      page.getByTestId('mensagem-sucesso')
    ).toHaveText('Empréstimo realizado com sucesso');

    // 8. Confirmar que o livro ficou indisponível
    await expect(
      page.getByTestId('livro-disponibilidade')
    ).toHaveText('Indisponível');

    await expect(
      page.getByTestId('livro-quantidade-disponivel')
    ).toHaveText('0 de 1');

  });

  // TEARDOWN: excluir primeiro o empréstimo e depois o livro
  test.afterEach(async ({ request }) => {

    if (
  livroId !== undefined &&
  tokenAdmin
) {
      // 9. Consultar os empréstimos ativos pela API
      const respostaEmprestimos = await request.get(
        '/api/emprestimos?status=ativo',
        {
          headers: {
            Authorization: `Bearer ${tokenAdmin}`,
          },
        },
      );

      expect(respostaEmprestimos.status()).toBe(200);

      const emprestimos: Emprestimo[] =
        await respostaEmprestimos.json();

      // 10. Encontrar o empréstimo criado pelo teste
      const emprestimoCriado = emprestimos.find(
        (emprestimo) =>
          emprestimo.livroId === livroId &&
          emprestimo.usuarioId === leitorId &&
          emprestimo.status === 'ativo',
      );

      // 11. Excluir o empréstimo
      if (emprestimoCriado) {

        const respostaExclusaoEmprestimo = await request.delete(
          `/api/emprestimos/${emprestimoCriado.id}`,
          {
            headers: {
              Authorization: `Bearer ${tokenAdmin}`,
            },
          },
        );

        expect(respostaExclusaoEmprestimo.status()).toBe(204);
      }

      // 12. Excluir o livro somente depois do empréstimo
      await excluirLivro(request, livroId, tokenAdmin);

    }

  });

});