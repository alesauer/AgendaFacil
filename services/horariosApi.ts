import { apiRequest } from './apiClient';

export type HorarioFuncionamentoApi = {
  id?: string;
  barbearia_id?: string;
  dia_semana: number;
  aberto: boolean;
  hora_inicio: string;
  hora_fim: string;
};

export async function listHorariosFuncionamentoApi() {
  return apiRequest<HorarioFuncionamentoApi[]>('/horarios-funcionamento', {
    method: 'GET',
  });
}

export async function listHorariosFuncionamentoPublicApi() {
  return apiRequest<HorarioFuncionamentoApi[]>('/horarios-funcionamento/publico', {
    method: 'GET',
  });
}

export async function saveHorariosFuncionamentoApi(horarios: HorarioFuncionamentoApi[]) {
  return apiRequest<HorarioFuncionamentoApi[]>('/horarios-funcionamento', {
    method: 'PUT',
    body: JSON.stringify({ horarios }),
  });
}
