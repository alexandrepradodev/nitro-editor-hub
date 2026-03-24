type ApiRequestParams = {
  apiUrl: string;
  path: string;
  token: string | null;
  onUnauthorized?: () => void;
  init?: RequestInit;
};

export async function apiRequest<T>({
  apiUrl,
  path,
  token,
  onUnauthorized,
  init,
}: ApiRequestParams): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const maybeJson = await response.json().catch(() => null);
    if (response.status === 401) {
      onUnauthorized?.();
      throw new Error("Sessao expirada. Faça login novamente.");
    }

    const message = maybeJson?.message ? String(maybeJson.message) : `Erro API: ${response.status}`;
    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
