import { apiRequest } from './apiClient';

export type LoginPayload = {
  telefone: string;
  senha: string;
};

export type SignupPayload = {
  nome: string;
  telefone: string;
  senha: string;
  role?: 'ADMIN' | 'EMPLOYEE' | 'CLIENT';
};

export type AuthUser = {
  id: string;
  barbearia_id: string;
  nome: string;
  telefone: string;
  role: 'ADMIN' | 'EMPLOYEE' | 'CLIENT';
  ativo: boolean;
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
