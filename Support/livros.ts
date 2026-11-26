import {
  expect,
  type APIRequestContext,
} from '@playwright/test';

export async function excluirLivro(
  request: APIRequestContext,
  livroId: number,
  token: string,
): Promise<void> {

  const resposta = await request.delete(
    `/api/livros/${livroId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  expect(resposta.status()).toBe(204);
}