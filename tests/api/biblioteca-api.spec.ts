import { test, expect, type APIRequestContext } from '@playwright/test';

const ADMIN = {
  email: 'admin@biblioteca.com',
  senha: 'Admin@123',
};

const LEITOR = {
  email: 'leitor@biblioteca.com',
  senha: 'Leitor@123',
};

async function obterToken(
  api: APIRequestContext,
  credenciais: { email: string; senha: string },
): Promise<string> {
  const resposta = await api.post('/api/auth/login', {
    data: credenciais,
  });

  expect(resposta.status()).toBe(200);

  const corpo = await resposta.json();
  expect(corpo.token).toEqual(expect.any(String));
  expect(corpo.token.length).toBeGreaterThan(0);

  return corpo.token;
}

test('consulta o livro 1 e confirma Dom Casmurro disponível', async ({ request }) => {
  const resposta = await request.get('/api/livros/1');

  expect(resposta.status()).toBe(200);

  const livro = await resposta.json();
  expect(livro.titulo).toBe('Dom Casmurro');
  expect(livro.disponivel).toBe(true);
});

test('administrador cadastra um livro e o exclui ao final do teste', async ({ request }) => {
  const token = await obterToken(request, ADMIN);
  const headers = { Authorization: `Bearer ${token}` };

  // O ISBN dinâmico evita conflito caso o teste seja executado novamente.
  const dadosLivro = {
    titulo: 'Livro criado pelos testes Playwright',
    autor: 'Autor de Testes',
    isbn: `978${Date.now().toString().slice(-10)}`,
    anoPublicacao: 2020,
    quantidade: 2,
  };

  let livroId: number | undefined;

  try {
    const respostaCadastro = await request.post('/api/livros', {
      headers,
      data: dadosLivro,
    });

    const livroCriado = await respostaCadastro.json();
    if (typeof livroCriado.id === 'number') {
      livroId = livroCriado.id;
    }

    expect(respostaCadastro.status()).toBe(201);
    expect(livroCriado).toMatchObject(dadosLivro);
    expect(livroCriado.id).toEqual(expect.any(Number));
    expect(livroCriado.quantidadeDisponivel).toBe(dadosLivro.quantidade);
  } finally {
    // Limpa o registro mesmo quando uma validação falhar após a criação.
    if (livroId !== undefined) {
      const respostaExclusao = await request.delete(`/api/livros/${livroId}`, {
        headers,
      });

      expect(respostaExclusao.status()).toBe(204);
    }
  }
});

test('recusa o cadastro de livro quando a requisição não envia token', async ({ request }) => {
  const resposta = await request.post('/api/livros', {
    data: {
      titulo: 'Livro sem autorização',
      autor: 'Autor de Testes',
      isbn: '9788500000066',
      anoPublicacao: 2020,
      quantidade: 1,
    },
  });

  expect(resposta.status()).toBe(401);

  const erro = await resposta.json();
  expect(erro.erro).toBe('Token não informado');
  expect(erro.status).toBe(401);
});

test('impede o empréstimo de Vidas Secas quando não há exemplares disponíveis', async ({ request }) => {
  const token = await obterToken(request, LEITOR);

  const resposta = await request.post('/api/emprestimos', {
    headers: { Authorization: `Bearer ${token}` },
    data: { livroId: 4 },
  });

  expect(resposta.status()).toBe(409);

  const erro = await resposta.json();
  expect(erro.erro).toBe('Livro indisponível');
  expect(erro.status).toBe(409);
});


test('impede que um leitor consulte a lista de usuários', async ({ request }) => {
  // Autentica como leitor
  const token = await obterToken(request, LEITOR);

  // Tenta acessar um endpoint exclusivo do administrador
  const resposta = await request.get('/api/usuarios', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  // Valida o status de acesso proibido
  expect(resposta.status()).toBe(403);

  // Valida o corpo da resposta
  const erro = await resposta.json();

  expect(erro.erro).toEqual(expect.any(String));
  expect(erro.erro.length).toBeGreaterThan(0);
  expect(erro.status).toBe(403);
  expect(erro.detalhes).toEqual(expect.any(Array));
});
