type ApiSuccess<T> = {
  success: true;
  data: T;
};

type ApiError = {
  success: false;
  error: string;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://127.0.0.1:5000';

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

const stripHtml = (value: string): string => {
  return value
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const getFriendlyHttpError = (
  status: number,
  path: string,
  method: string,
  message?: string
): string => {
  const normalizedPath = path.toLowerCase();
  const normalizedMethod = method.toUpperCase();

  if (status === 409) {
    return message || 'Operação bloqueada por vínculo de dados.';
  }

  if (status >= 500 && normalizedMethod === 'DELETE') {
    if (normalizedPath.startsWith('/clientes/')) {
      return 'Não foi possível excluir o cliente. Verifique se há agendamentos vinculados e tente novamente.';
    }
    if (normalizedPath.startsWith('/servicos/')) {
      return 'Não foi possível excluir o serviço. Verifique se há agendamentos vinculados e tente novamente.';
    }
    if (normalizedPath.startsWith('/profissionais/')) {
      return 'Não foi possível excluir o profissional. Verifique se há agendamentos vinculados e tente novamente.';
    }
     if (normalizedPath.startsWith('/categorias/')) {
       return 'Não foi possível excluir a categoria. Verifique se há serviços vinculados e tente novamente.';
     }
  }

  if (status >= 500) {
    return message || 'Erro interno da API. Tente novamente em instantes.';
  }

  return message || `Erro na requisição (${status})`;
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
    const requestMethod = (options.method || 'GET').toUpperCase();
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
      const trimmedRaw = (rawText || '').trim();
      const looksLikeHtml = /<\s*!doctype html|<\s*html/i.test(trimmedRaw);
      const plainText = looksLikeHtml ? stripHtml(trimmedRaw) : trimmedRaw;
      parsedBody = { error: plainText?.slice(0, 300), isHtml: looksLikeHtml };
    }

    if (!response.ok) {
      const apiMessage = parsedBody?.error as string | undefined;
      return {
        success: false,
        error: getFriendlyHttpError(response.status, path, requestMethod, apiMessage),
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
