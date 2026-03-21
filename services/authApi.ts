import { apiRequest } from './apiClient';

export type LoginPayload = {
  telefone?: string;
  email?: string;
  login?: string;
  senha: string;
};

export type SignupPayload = {
  nome: string;
  telefone: string;
  email?: string;
  senha: string;
  role?: 'ADMIN' | 'EMPLOYEE' | 'CLIENT';
};

export type AuthUser = {
  id: string;
  barbearia_id: string;
  nome: string;
  telefone: string;
  email?: string | null;
  role: 'ADMIN' | 'EMPLOYEE' | 'CLIENT' | 'MASTER';
  ativo: boolean;
};

export type TeamUserPayload = {
  id?: string;
  nome: string;
  telefone: string;
  email: string;
  senha?: string;
  role: 'ADMIN' | 'EMPLOYEE';
  ativo?: boolean;
};

export type AuthResult = {
  token: string;
  user: AuthUser;
};

export async function loginApi(payload: LoginPayload) {
  return apiRequest<AuthResult>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function signupApi(payload: SignupPayload) {
  return apiRequest<AuthResult>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function meApi() {
  return apiRequest<AuthUser>('/auth/me', {
    method: 'GET',
  });
}

export async function masterLoginApi(payload: LoginPayload) {
  return apiRequest<AuthResult>('/auth/master/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function masterMeApi() {
  return apiRequest<AuthUser>('/auth/master/me', {
    method: 'GET',
  });
}

export async function listAuthUsersApi() {
  return apiRequest<AuthUser[]>('/auth/users', {
    method: 'GET',
  });
}

export async function createAuthUserApi(payload: TeamUserPayload) {
  return apiRequest<AuthUser>('/auth/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAuthUserApi(userId: string, payload: TeamUserPayload) {
  return apiRequest<AuthUser>(`/auth/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteAuthUserApi(userId: string) {
  return apiRequest<{ id: string }>(`/auth/users/${userId}`, {
    method: 'DELETE',
  });
}
