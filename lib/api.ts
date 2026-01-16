export async function apiFetch<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    credentials: "include", // 🔥 THIS IS THE KEY
  });

  if (!res.ok) {
    throw new Error("API request failed");
  }

  return res.json();
}
