type ApiSuccess<T> = {
  success: true;
  data: T;
};

type ApiError = {
  success: false;
  error: string;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000';

const getTenantSlug = (): string => {
  const explicitTenant = (import.meta as any).env?.VITE_TENANT_SLUG || localStorage.getItem('tenant_slug');
  if (explicitTenant) {
    return explicitTenant;
  }

  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return (import.meta as any).env?.VITE_DEFAULT_TENANT_SLUG || 'demo';
  }
  const parts = host.split('.');
  return parts.length >= 3 ? parts[0] : ((import.meta as any).env?.VITE_DEFAULT_TENANT_SLUG || 'demo');
};

const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-Barbearia-Slug': getTenantSlug(),
    ...(options.headers || {}),
  };

  if (token) {
    (headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    let parsedBody: any = null;
    if (isJson) {
      try {
        parsedBody = await response.json();
      } catch {
        parsedBody = null;
      }
    } else {
      const rawText = await response.text();
      parsedBody = { error: rawText?.slice(0, 300) };
    }

    if (!response.ok) {
      return {
        success: false,
        error: parsedBody?.error || `Erro na requisição (${response.status})`,
      };
    }

    if (!parsedBody) {
      return {
        success: false,
        error: 'Resposta inválida da API',
      };
    }

    return parsedBody as ApiResponse<T>;
  } catch {
    return {
      success: false,
      error: 'Falha de conexão com a API',
    };
  }
}
