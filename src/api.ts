export async function api<T>(
  url: string,
  method = "GET",
  data?: unknown,
  csrf?: string,
): Promise<T> {
  const response = await fetch(url, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...(csrf ? { "X-CSRF-Token": csrf } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error ?? "Belum bisa terhubung. Coba lagi.");
  return result;
}
export type Session = {
  admin: boolean;
  guest: boolean;
  csrf: string | null;
  setupAvailable: boolean;
};
