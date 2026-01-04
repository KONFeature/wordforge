interface WPRestResponse<T> {
  data: T | null;
  total?: number;
  error?: string;
}

export async function wpFetch<T>(
  restUrl: string,
  endpoint: string,
  auth: string,
  params: Record<string, string> = {},
): Promise<WPRestResponse<T>> {
  const url = new URL(endpoint, restUrl.replace('/wp-abilities/v1', ''));
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return { data: null, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    const total = response.headers.get('X-WP-Total');

    return {
      data: data as T,
      total: total ? Number.parseInt(total, 10) : undefined,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
