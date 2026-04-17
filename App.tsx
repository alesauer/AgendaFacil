import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { User, AppNotification, Appointment, Service, Professional, Client, Category, BusinessHour, BrandIdentity } from './types';
import { MOCK_NOTIFICATIONS } from './constants';
import { AgendamentoApi, cancelAgendamentoPublicApi, createAgendamentoApi, createAgendamentoPublicApi, createBloqueioApi, deleteAgendamentoApi, deleteBloqueioApi, listAgendamentosApi, listAgendamentosPublicByClientApi, transitionAgendamentoStatusApi, updateAgendamentoApi, updateAgendamentoPublicApi, updateBloqueioApi } from './services/agendamentosApi';
import { AuthUser, createAuthUserApi, deleteAuthUserApi, listAuthUsersApi, loginApi, meApi, updateAuthUserApi } from './services/authApi';
import { masterLoginApi, masterMeApi } from './services/authApi';
import { CategoriaApi, createCategoriaApi, deleteCategoriaApi, listCategoriasApi, updateCategoriaApi } from './services/categoriasApi';
import { ClienteApi, createClienteApi, deleteClienteApi, findClienteByPhonePublicApi, listClientesApi, updateClienteApi } from './services/clientesApi';
import { createProfissionalApi, deleteProfissionalApi, listProfissionaisApi, listProfissionaisPublicApi, ProfissionalApi, updateProfissionalApi } from './services/profissionaisApi';
import { createServicoApi, deleteServicoApi, listServicosApi, listServicosPublicApi, reorderServicosApi, ServicoApi, updateServicoApi } from './services/servicosApi';
import { HorarioFuncionamentoApi, listHorariosFuncionamentoApi, listHorariosFuncionamentoPublicApi, saveHorariosFuncionamentoApi } from './services/horariosApi';
import { getIdentidadeApi, getIdentidadePublicaApi, IdentidadeApi, saveIdentidadeApi } from './services/identidadeApi';
import { Login } from './views/Login';
import { ClientPortal } from './views/ClientPortal';
import { AdminDashboard } from './views/AdminDashboard';
import { MasterDashboard } from './views/MasterDashboard';
import { MasterLogin } from './views/MasterLogin';
import { Onboarding } from './views/Onboarding';

// --- Contexts ---

type ClientImportInput = {
  name: string;
  phone: string;
  email?: string;
  birthday?: string;
};

interface AppContextType {
  user: User | null;
  login: (phone: string, role: 'CLIENT' | 'ADMIN' | 'EMPLOYEE' | 'MASTER', password?: string) => Promise<void>;
  logout: () => void;
  notifications: AppNotification[];
  markNotificationRead: (id: string) => void;
  appointments: Appointment[];
  addAppointment: (apt: Appointment) => Promise<{ success: boolean; error?: string }>;
  updateAppointment: (apt: Appointment) => Promise<{ success: boolean; error?: string }>;
  transitionAppointmentStatus: (appointmentId: string, status: Appointment['status'], options?: { reason?: string; paymentMethod?: string; totalValue?: number; observation?: string; }) => Promise<{ success: boolean; error?: string }>;
  deleteAppointment: (id: string) => void;
  services: Service[];
  updateService: (service: Service) => void;
  deleteService: (id: string) => Promise<{ success: boolean; error?: string }>;
  addService: (service: Service) => void;
  reorderServices: (orderedServiceIds: string[]) => Promise<{ success: boolean; error?: string }>;
  categories: Category[];
  addCategory: (category: Category) => void;
  updateCategory: (category: Category) => void;
  deleteCategory: (id: string) => Promise<{ success: boolean; error?: string }>;
  professionals: Professional[];
  clients: Client[];
  addClient: (client: Client) => void;
  importClients: (clientsToImport: ClientImportInput[]) => Promise<{ successCount: number; failed: Array<{ index: number; name: string; phone: string; error: string }> }>;
  updateClient: (client: Client) => void;
  deleteClient: (id: string) => Promise<{ success: boolean; error?: string }>;
  users: User[];
  addUser: (user: User & { password?: string; commissionPercentage?: number }) => Promise<{ success: boolean; error?: string }>;
  updateUser: (user: User & { password?: string; commissionPercentage?: number }) => Promise<{ success: boolean; error?: string }>;
  deleteUser: (id: string) => Promise<{ success: boolean; error?: string }>;
  deactivateProfessional: (id: string) => Promise<{ success: boolean; error?: string }>;
  businessHours: BusinessHour[];
  saveBusinessHours: (hours: BusinessHour[]) => Promise<{ success: boolean; error?: string }>;
  brandIdentity: BrandIdentity;
  saveBrandIdentity: (identity: BrandIdentity) => Promise<{ success: boolean; error?: string }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within an AppProvider');
  return context;
};

// --- LGPD Banner Component ---
const LGPDBanner = () => {
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('lgpd_consent');
    if (consent) setAccepted(true);
  }, []);

  const handleAccept = () => {
    localStorage.setItem('lgpd_consent', 'true');
    setAccepted(true);
  };

  if (accepted) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 z-50 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-lg border-t border-gray-700">
      <p className="text-sm text-center sm:text-left max-w-2xl">
        Utilizamos cookies para melhorar sua experiência e para fins de segurança, conforme nossa Política de Privacidade e LGPD.
      </p>
      <button 
        onClick={handleAccept}
        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors text-sm whitespace-nowrap"
      >
        Concordo e Fechar
      </button>
    </div>
  );
};

type OnboardingAccessGuardProps = {
  user: User | null;
  isOnboardingCompleted: () => boolean;
  getCurrentTenantSlug: () => string;
};

const OnboardingAccessGuard: React.FC<OnboardingAccessGuardProps> = ({
  user,
  isOnboardingCompleted,
  getCurrentTenantSlug,
}) => {
  const [confirmedRestart, setConfirmedRestart] = useState(false);
  const [cancelledRestart, setCancelledRestart] = useState(false);
  const manualRestartRequested = localStorage.getItem('manual_onboarding_request') === 'true';

  if (!(user && user.role === 'ADMIN')) {
    return <Navigate to="/login" />;
  }

  if (cancelledRestart) {
    localStorage.removeItem('manual_onboarding_request');
    return <Navigate to="/admin" />;
  }

  if (!isOnboardingCompleted() || confirmedRestart) {
    return <Onboarding />;
  }

  if (!manualRestartRequested) {
    return <Navigate to="/admin" />;
  }

  const handleConfirmRestart = () => {
    const tenantSlug = getCurrentTenantSlug();
    localStorage.setItem('manual_onboarding_request', 'true');
    localStorage.setItem(`onboarding_completed:${tenantSlug}`, 'false');
    localStorage.removeItem(`onboarding_completed_at:${tenantSlug}`);

    if (tenantSlug === 'demo') {
      localStorage.setItem('onboarding_completed', 'false');
      localStorage.removeItem('onboarding_completed_at');
    }

    setConfirmedRestart(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Refazer onboarding?</h2>
          <p className="text-sm text-gray-600 mt-2">
            Refazer o onboarding pode zerar configurações da barbearia e afetar a operação.
          </p>
        </div>
        <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setCancelledRestart(true)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmRestart}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            Confirmar e iniciar
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---

const App: React.FC = () => {
  const MAX_AVATAR_URL_LENGTH = 300000;
  const DEFAULT_PRIMARY_COLOR = '#2563eb';
  const DEFAULT_SECONDARY_COLOR = '#eff6ff';
  const weekDayLabels: Record<number, string> = {
    0: 'Domingo',
    1: 'Segunda-feira',
    2: 'Terça-feira',
    3: 'Quarta-feira',
    4: 'Quinta-feira',
    5: 'Sexta-feira',
    6: 'Sábado',
  };

  const defaultBusinessHours: BusinessHour[] = [
    { dayOfWeek: 1, day: weekDayLabels[1], open: true, start: '09:00', end: '19:00' },
    { dayOfWeek: 2, day: weekDayLabels[2], open: true, start: '09:00', end: '19:00' },
    { dayOfWeek: 3, day: weekDayLabels[3], open: true, start: '09:00', end: '19:00' },
    { dayOfWeek: 4, day: weekDayLabels[4], open: true, start: '09:00', end: '19:00' },
    { dayOfWeek: 5, day: weekDayLabels[5], open: true, start: '09:00', end: '20:00' },
    { dayOfWeek: 6, day: weekDayLabels[6], open: true, start: '08:00', end: '18:00' },
    { dayOfWeek: 0, day: weekDayLabels[0], open: false, start: '00:00', end: '00:00' },
  ];

  const normalizeAvatar = (avatar?: string | null) => {
    if (!avatar) return undefined;
    if (typeof avatar !== 'string') return undefined;
    if (avatar.length > MAX_AVATAR_URL_LENGTH) return undefined;
    if (avatar.startsWith('data:image/') || avatar.startsWith('http://') || avatar.startsWith('https://')) {
      return avatar;
    }
    return undefined;
  };

  const [user, setUser] = useState<User | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>(MOCK_NOTIFICATIONS);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const isBackofficeSyncingRef = useRef(false);
  const [adminBootstrapChecked, setAdminBootstrapChecked] = useState(false);
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>(defaultBusinessHours);
  const [brandIdentity, setBrandIdentity] = useState<BrandIdentity>(() => {
    try {
      const raw = localStorage.getItem('brand_identity');
      if (raw) {
        const parsed = JSON.parse(raw) as BrandIdentity;
        return {
          name: parsed.name || 'AgendeFácil Barbearia',
          phone: parsed.phone || undefined,
          city: parsed.city || undefined,
          logoUrl: parsed.logoUrl,
          loginLogoUrl: parsed.loginLogoUrl,
          loginBackgroundUrl: parsed.loginBackgroundUrl,
          churnRiskDaysThreshold: Number(parsed.churnRiskDaysThreshold || 45),
          allowEmployeeConfirmAppointment: Boolean(parsed.allowEmployeeConfirmAppointment),
          allowEmployeeCreateAppointment: parsed.allowEmployeeCreateAppointment !== undefined ? Boolean(parsed.allowEmployeeCreateAppointment) : true,
          allowEmployeeViewFinance: Boolean(parsed.allowEmployeeViewFinance),
          allowEmployeeViewReports: Boolean(parsed.allowEmployeeViewReports),
          allowEmployeeViewUsers: Boolean(parsed.allowEmployeeViewUsers),
          iconName: parsed.iconName || 'scissors',
          primaryColor: parsed.primaryColor || DEFAULT_PRIMARY_COLOR,
          secondaryColor: parsed.secondaryColor || DEFAULT_SECONDARY_COLOR,
        };
      }
    } catch {
      // ignore parse errors
    }

    return {
      name: 'AgendeFácil Barbearia',
      churnRiskDaysThreshold: 45,
      allowEmployeeConfirmAppointment: false,
      allowEmployeeCreateAppointment: true,
      allowEmployeeViewFinance: false,
      allowEmployeeViewReports: false,
      allowEmployeeViewUsers: false,
      iconName: 'scissors',
      primaryColor: DEFAULT_PRIMARY_COLOR,
      secondaryColor: DEFAULT_SECONDARY_COLOR,
    };
  });

  const normalizeHexColor = (value?: string): string | null => {
    if (!value) return null;
    const normalized = value.trim();
    if (/^#([A-Fa-f0-9]{6})$/.test(normalized)) {
      return normalized;
    }
    return null;
  };

  const shiftHexColor = (hex: string, delta: number): string => {
    const normalized = hex.replace('#', '');
    const red = parseInt(normalized.slice(0, 2), 16);
    const green = parseInt(normalized.slice(2, 4), 16);
    const blue = parseInt(normalized.slice(4, 6), 16);
    const clamp = (value: number) => Math.max(0, Math.min(255, value));
    const toHex = (value: number) => value.toString(16).padStart(2, '0');
    return `#${toHex(clamp(red + delta))}${toHex(clamp(green + delta))}${toHex(clamp(blue + delta))}`;
  };

  const isAdminApiSession = () => {
    return user?.role === 'ADMIN' && !!localStorage.getItem('auth_token');
  };

  const isBackofficeApiSession = () => {
    return (user?.role === 'ADMIN' || user?.role === 'EMPLOYEE') && !!localStorage.getItem('auth_token');
  };

  const pushErrorNotification = (message: string) => {
    const newNotif: AppNotification = {
      id: Date.now().toString(),
      title: 'Falha de sincronização',
      message,
      type: 'ERROR',
      read: false,
      timestamp: 'Agora',
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const mapCategoria = (categoria: CategoriaApi): Category => ({
    id: categoria.id,
    name: categoria.nome,
    description: categoria.descricao || undefined,
    iconName: 'Tag',
  });

  const mapServico = (servico: ServicoApi, categoriasAtuais: Category[]): Service => {
    const categoria = categoriasAtuais.find(c => c.id === servico.categoria_id);
    return {
      id: servico.id,
      title: servico.nome,
      description: servico.nome,
      price: Number(servico.preco || 0),
      durationMinutes: servico.duracao_min,
      category: categoria?.name || 'Geral',
      sortOrder: Number(servico.sort_order || 0),
      iconName: 'Scissors',
    };
  };

  const mapProfissional = (profissional: ProfissionalApi): Professional => ({
    id: profissional.id,
    name: profissional.nome,
    role: profissional.cargo || 'Profissional',
    active: profissional.ativo,
    avatar: normalizeAvatar(profissional.foto_url),
    commissionPercentage: Number(profissional.comissao_percentual || 0),
    specialties: [],
  });

  const mapProfissionalToUser = (profissional: ProfissionalApi): User => ({
    id: profissional.id,
    name: profissional.nome,
    phone: profissional.telefone || '',
    email: '',
    role: 'EMPLOYEE',
    active: profissional.ativo,
    avatar: normalizeAvatar(profissional.foto_url),
  });

  const mapAuthUserToUser = (authUser: AuthUser, avatar?: string): User => ({
    id: authUser.id,
    name: authUser.nome,
    phone: authUser.telefone || '',
    email: authUser.email || '',
    role: authUser.role === 'ADMIN' ? 'ADMIN' : 'EMPLOYEE',
    active: authUser.ativo,
    avatar: normalizeAvatar(avatar),
  });

  const mapClient = (client: ClienteApi): Client => ({
    id: client.id,
    name: client.nome,
    phone: client.telefone,
    birthday: client.data_nascimento || undefined,
    totalSpent: Number(client.total_gasto || 0),
    haircutsCount: Number(client.cortes_count || 0),
    lastVisit: client.ultima_visita || undefined,
  });

  const mapAgendamento = (agendamento: AgendamentoApi, servicosAtuais: Service[]): Appointment => {
    const servico = servicosAtuais.find(item => item.id === agendamento.servico_id);
    const dataNormalizada = String(agendamento.data).slice(0, 10);
    const horaNormalizada = String(agendamento.hora_inicio).slice(0, 5);
    const horaFimNormalizada = String(agendamento.hora_fim || '').slice(0, 5);
    const isBlocked = (agendamento.status as Appointment['status']) === 'BLOCKED' || agendamento.is_bloqueio;
    const normalizedStatus = agendamento.status === 'COMPLETED' ? 'COMPLETED_OP' : agendamento.status;
    return {
      id: agendamento.id,
      serviceId: isBlocked ? 'blocked' : agendamento.servico_id,
      professionalId: agendamento.profissional_id,
      clientId: isBlocked ? 'blocked' : agendamento.cliente_id,
      date: dataNormalizada,
      time: horaNormalizada,
      endTime: horaFimNormalizada || undefined,
      status: (normalizedStatus as Appointment['status']) || 'CONFIRMED',
      totalValue: isBlocked ? 0 : Number(agendamento.valor_final ?? (servico?.price || 0)),
      paymentMethod: agendamento.forma_pagamento || undefined,
      paidAt: agendamento.pago_em || undefined,
      discount: Number(agendamento.desconto || 0),
      isCourtesy: Boolean(agendamento.cortesia),
      isRefunded: Boolean(agendamento.estornado),
      operationalCompletedAt: agendamento.concluido_operacional_em || undefined,
      financialCompletedAt: agendamento.concluido_financeiro_em || undefined,
      blockReason: isBlocked ? (agendamento.block_reason || undefined) : undefined,
      createdAt: `${dataNormalizada}T${horaNormalizada}:00`,
    };
  };

  const mapHorarioFuncionamento = (horario: HorarioFuncionamentoApi): BusinessHour => ({
    dayOfWeek: Number(horario.dia_semana),
    day: weekDayLabels[Number(horario.dia_semana)] || 'Dia',
    open: Boolean(horario.aberto),
    start: String(horario.hora_inicio || '00:00').slice(0, 5),
    end: String(horario.hora_fim || '00:00').slice(0, 5),
  });

  const mapIdentidade = (identidade: IdentidadeApi): BrandIdentity => ({
    name: identidade.nome,
    phone: identidade.telefone || undefined,
    city: identidade.cidade || undefined,
    logoUrl: identidade.logo_url || undefined,
    loginLogoUrl: identidade.login_logo_url || undefined,
    loginBackgroundUrl: identidade.login_background_url || undefined,
    churnRiskDaysThreshold: Number(identidade.churn_risk_days_threshold || 45),
    allowEmployeeConfirmAppointment: Boolean(identidade.allow_employee_confirm_appointment),
    allowEmployeeCreateAppointment: identidade.allow_employee_create_appointment === undefined || identidade.allow_employee_create_appointment === null ? true : Boolean(identidade.allow_employee_create_appointment),
    allowEmployeeViewFinance: Boolean(identidade.allow_employee_view_finance),
    allowEmployeeViewReports: Boolean(identidade.allow_employee_view_reports),
    allowEmployeeViewUsers: Boolean(identidade.allow_employee_view_users),
    iconName: identidade.icone_marca || 'scissors',
    primaryColor: identidade.cor_primaria || '#2563eb',
    secondaryColor: identidade.cor_secundaria || '#eff6ff',
  });

  const getHoraFimByServiceDuration = (horaInicio: string, durationMinutes: number): string => {
    const [hourStr, minuteStr] = horaInicio.split(':');
    const initialMinutes = (parseInt(hourStr || '0', 10) * 60) + parseInt(minuteStr || '0', 10);
    const endMinutes = initialMinutes + Math.max(durationMinutes, 15);
    const hours = Math.floor(endMinutes / 60) % 24;
    const minutes = endMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const syncAdminData = async (options?: { silent?: boolean }) => {
    const categoriasResult = await listCategoriasApi();
    const categoriasAtuais = categoriasResult.success
      ? categoriasResult.data.map(mapCategoria)
      : categories;

    if (categoriasResult.success) {
      setCategories(categoriasAtuais);
    }

    const [servicosResult, profissionaisResult, clientesResult] = await Promise.all([
      listServicosApi(),
      listProfissionaisApi(),
      listClientesApi(),
    ]);
    const authUsersResult = isAdminApiSession() && user?.role === 'ADMIN' ? await listAuthUsersApi() : null;

    const horariosResult = await listHorariosFuncionamentoApi();
    const identidadeResult = user?.role === 'ADMIN'
      ? await getIdentidadeApi()
      : await getIdentidadePublicaApi();

    if (servicosResult.success) {
      setServices(servicosResult.data.map(item => mapServico(item, categoriasAtuais)));
    }

    if (profissionaisResult.success) {
      setProfessionals(
        profissionaisResult.data
          .filter(item => item.ativo !== false)
          .map(mapProfissional)
      );
    }

    if (authUsersResult?.success) {
      const profissionaisById = new Map(
        (profissionaisResult.success ? profissionaisResult.data : []).map(item => [item.id, item])
      );
      setUsers(authUsersResult.data.map(item => mapAuthUserToUser(item, profissionaisById.get(item.id)?.foto_url || undefined)));
    }

    if (clientesResult.success) {
      setClients(clientesResult.data.map(mapClient));
    }

    if (horariosResult.success) {
      setBusinessHours(horariosResult.data.map(mapHorarioFuncionamento));
    }

    if (identidadeResult.success) {
      const mapped: BrandIdentity = {
        name: identidadeResult.data.nome,
        phone: identidadeResult.data.telefone || undefined,
        city: identidadeResult.data.cidade || undefined,
        logoUrl: identidadeResult.data.logo_url || undefined,
        loginLogoUrl: identidadeResult.data.login_logo_url || undefined,
        loginBackgroundUrl: identidadeResult.data.login_background_url || undefined,
        churnRiskDaysThreshold: Number(identidadeResult.data.churn_risk_days_threshold || 45),
        allowEmployeeConfirmAppointment: Boolean(identidadeResult.data.allow_employee_confirm_appointment),
        allowEmployeeCreateAppointment: identidadeResult.data.allow_employee_create_appointment === undefined || identidadeResult.data.allow_employee_create_appointment === null ? true : Boolean(identidadeResult.data.allow_employee_create_appointment),
        allowEmployeeViewFinance: Boolean(identidadeResult.data.allow_employee_view_finance),
        allowEmployeeViewReports: Boolean(identidadeResult.data.allow_employee_view_reports),
        allowEmployeeViewUsers: Boolean(identidadeResult.data.allow_employee_view_users),
        iconName: identidadeResult.data.icone_marca || 'scissors',
        primaryColor: identidadeResult.data.cor_primaria || '#2563eb',
        secondaryColor: identidadeResult.data.cor_secundaria || '#eff6ff',
      };
      setBrandIdentity(mapped);
    }

    const servicosMapeados = servicosResult.success
      ? servicosResult.data.map(item => mapServico(item, categoriasAtuais))
      : services;

    const agendamentosResult = await listAgendamentosApi();
    if (agendamentosResult.success) {
      setAppointments(agendamentosResult.data.map(item => mapAgendamento(item, servicosMapeados)));
    }

    const tenantSlug = getCurrentTenantSlug();
    const tenantCompletedKey = `onboarding_completed:${tenantSlug}`;
    const alreadyCompleted =
      localStorage.getItem(tenantCompletedKey) === 'true' ||
      (tenantSlug === 'demo' && localStorage.getItem('onboarding_completed') === 'true');

    const hasExistingSetup = Boolean(
      (servicosResult.success && servicosResult.data.length > 0) ||
      (profissionaisResult.success && profissionaisResult.data.length > 0) ||
      (clientesResult.success && clientesResult.data.length > 0) ||
      (agendamentosResult.success && agendamentosResult.data.length > 0)
    );

    if (!alreadyCompleted && hasExistingSetup) {
      const nowIso = new Date().toISOString();
      localStorage.setItem(tenantCompletedKey, 'true');
      localStorage.setItem(`onboarding_completed_at:${tenantSlug}`, nowIso);
      if (tenantSlug === 'demo') {
        localStorage.setItem('onboarding_completed', 'true');
        localStorage.setItem('onboarding_completed_at', nowIso);
      }
    }

    const errors: string[] = [];
    if (!categoriasResult.success) errors.push('categorias');
    if (!servicosResult.success) errors.push('serviços');
    if (!profissionaisResult.success) errors.push('profissionais');
    if (authUsersResult && !authUsersResult.success) errors.push('usuários');
    if (!clientesResult.success) errors.push('clientes');
    if (!horariosResult.success) errors.push('horários de funcionamento');
    if (!identidadeResult.success && user?.role === 'ADMIN') errors.push('identidade visual');
    if (!agendamentosResult.success) errors.push('agendamentos');

    if (errors.length > 0 && !options?.silent) {
      pushErrorNotification(`Não foi possível sincronizar: ${errors.join(', ')}. Exibindo fallback local.`);
    }
  };

  const syncClientPortalData = async () => {
    const [categoriasResult, servicosResult, profissionaisResult, horariosResult] = await Promise.all([
      listCategoriasApi(),
      listServicosPublicApi(),
      listProfissionaisPublicApi(),
      listHorariosFuncionamentoPublicApi(),
    ]);

    const categoriasAtuais = categoriasResult.success
      ? categoriasResult.data.map(mapCategoria)
      : categories;

    if (categoriasResult.success) {
      setCategories(categoriasAtuais);
    }

    if (servicosResult.success) {
      setServices(servicosResult.data.map(item => mapServico(item, categoriasAtuais)));
    }

    if (profissionaisResult.success) {
      setProfessionals(
        profissionaisResult.data
          .filter(item => item.ativo !== false)
          .map(mapProfissional)
      );
    }

    if (horariosResult.success) {
      setBusinessHours(horariosResult.data.map(mapHorarioFuncionamento));
    }

    if (user?.id && user.id !== '__new_client__') {
      const agendamentosResult = await listAgendamentosPublicByClientApi(user.id);
      if (agendamentosResult.success) {
        const servicosMapeados = servicosResult.success
          ? servicosResult.data.map(item => mapServico(item, categoriasAtuais))
          : services;
        setAppointments(agendamentosResult.data.map(item => mapAgendamento(item, servicosMapeados)));
      }
    }
  };

  // Check for session cookie simulation
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (token) {
          let result = await meApi();
          if (!result.success) {
            result = await masterMeApi();
          }
          if (result.success) {
            const restoredUser: User = {
              id: result.data.id,
              name: result.data.nome,
              phone: result.data.telefone,
              email: result.data.email || '',
              role: result.data.role,
              active: result.data.ativo,
            };
            setUser(restoredUser);
            localStorage.setItem('app_user', JSON.stringify(restoredUser));
            return;
          }
          localStorage.removeItem('auth_token');
        }

        const savedUser = localStorage.getItem('app_user');
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser) as User;
          const isBackofficeUser = parsedUser.role === 'ADMIN' || parsedUser.role === 'EMPLOYEE' || parsedUser.role === 'MASTER';
          if (isBackofficeUser) {
            localStorage.removeItem('app_user');
          } else {
            setUser(parsedUser);
          }
        }
      } finally {
        setAuthInitialized(true);
      }
    };

    restoreSession();
  }, []);

  useEffect(() => {
    if (!authInitialized || !isBackofficeApiSession()) {
      setAdminBootstrapChecked(false);
      return;
    }

    let cancelled = false;
    setAdminBootstrapChecked(false);

    const sync = async () => {
      try {
        await syncAdminData();
      } catch {
        if (!cancelled) {
          pushErrorNotification('Erro ao carregar dados do painel. Mantendo dados locais como fallback.');
        }
      } finally {
        if (!cancelled) {
          setAdminBootstrapChecked(true);
        }
      }
    };

    sync();

    return () => {
      cancelled = true;
    };
  }, [authInitialized, user?.id, user?.role]);

  useEffect(() => {
    if (!authInitialized || !isBackofficeApiSession()) {
      return;
    }

    let disposed = false;

    const runSilentSync = async () => {
      if (disposed || isBackofficeSyncingRef.current) {
        return;
      }

      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }

      isBackofficeSyncingRef.current = true;
      try {
        await syncAdminData({ silent: true });
      } catch {
        // silently ignore background sync errors
      } finally {
        isBackofficeSyncingRef.current = false;
      }
    };

    const intervalId = window.setInterval(() => {
      void runSilentSync();
    }, 15000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void runSilentSync();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [authInitialized, user?.id, user?.role]);

  useEffect(() => {
    if (!authInitialized || user?.role !== 'CLIENT') {
      return;
    }

    let cancelled = false;

    const sync = async () => {
      try {
        await syncClientPortalData();
      } catch {
        if (!cancelled) {
          pushErrorNotification('Erro ao carregar serviços para agendamento.');
        }
      }
    };

    void sync();

    return () => {
      cancelled = true;
    };
  }, [authInitialized, user?.id, user?.role]);

  useEffect(() => {
    if (!authInitialized) {
      return;
    }

    let cancelled = false;
    const syncPublicIdentity = async () => {
      const result = await getIdentidadePublicaApi();
      if (!cancelled && result.success) {
        const mapped: BrandIdentity = {
          name: result.data.nome,
          phone: brandIdentity.phone,
          city: brandIdentity.city,
          logoUrl: result.data.logo_url || undefined,
          loginLogoUrl: result.data.login_logo_url || undefined,
          loginBackgroundUrl: result.data.login_background_url || undefined,
          churnRiskDaysThreshold: Number(result.data.churn_risk_days_threshold || 45),
          allowEmployeeConfirmAppointment: Boolean(result.data.allow_employee_confirm_appointment),
          allowEmployeeCreateAppointment: result.data.allow_employee_create_appointment === undefined || result.data.allow_employee_create_appointment === null ? true : Boolean(result.data.allow_employee_create_appointment),
          allowEmployeeViewFinance: Boolean(result.data.allow_employee_view_finance),
          allowEmployeeViewReports: Boolean(result.data.allow_employee_view_reports),
          allowEmployeeViewUsers: Boolean(result.data.allow_employee_view_users),
          iconName: result.data.icone_marca || 'scissors',
          primaryColor: result.data.cor_primaria || DEFAULT_PRIMARY_COLOR,
          secondaryColor: result.data.cor_secundaria || DEFAULT_SECONDARY_COLOR,
        };
        setBrandIdentity(mapped);
      }
    };

    void syncPublicIdentity();
    return () => {
      cancelled = true;
    };
  }, [authInitialized, brandIdentity.phone, brandIdentity.city]);

  useEffect(() => {
    const root = document.documentElement;
    const primary = normalizeHexColor(brandIdentity.primaryColor) || DEFAULT_PRIMARY_COLOR;
    const secondary = normalizeHexColor(brandIdentity.secondaryColor) || DEFAULT_SECONDARY_COLOR;

    root.style.setProperty('--brand-primary', primary);
    root.style.setProperty('--brand-primary-dark', shiftHexColor(primary, -20));
    root.style.setProperty('--brand-primary-light', shiftHexColor(primary, 20));
    root.style.setProperty('--brand-secondary', secondary);

    try {
      localStorage.setItem('brand_identity', JSON.stringify(brandIdentity));
    } catch {
      // ignore storage errors
    }
  }, [brandIdentity]);

  const login = async (phone: string, role: 'CLIENT' | 'ADMIN' | 'EMPLOYEE' | 'MASTER', password?: string) => {
    if (role === 'MASTER') {
      const result = await masterLoginApi({
        login: phone,
        senha: password || '',
      });

      if (!result.success) {
        throw new Error(('error' in result && result.error) ? result.error : 'Falha na autenticação master');
      }

      const authenticatedUser: User = {
        id: result.data.user.id,
        name: result.data.user.nome,
        phone: result.data.user.telefone,
        email: result.data.user.email || '',
        role: 'MASTER',
        active: result.data.user.ativo,
      };

      localStorage.setItem('auth_token', result.data.token);
      localStorage.setItem('app_user', JSON.stringify(authenticatedUser));
      setUser(authenticatedUser);
      return;
    }

    if (role !== 'CLIENT') {
      const result = await loginApi({
        login: phone,
        senha: password || '',
      });

      if (!result.success) {
        const message = ('error' in result && result.error) ? result.error : 'Falha na autenticação';
        throw {
          message,
          code: (result as any).code,
          details: (result as any).details,
          status: (result as any).status,
        };
      }

      const authenticatedUser: User = {
        id: result.data.user.id,
        name: result.data.user.nome,
        phone: result.data.user.telefone,
        email: result.data.user.email || '',
        role: result.data.user.role,
        active: result.data.user.ativo,
      };

      localStorage.setItem('auth_token', result.data.token);
      localStorage.setItem('app_user', JSON.stringify(authenticatedUser));
      setUser(authenticatedUser);
      return;
    }

    const lookup = await findClienteByPhonePublicApi(phone);
    if (!lookup.success) {
      throw new Error(('error' in lookup && lookup.error) ? lookup.error : 'Falha ao validar cliente');
    }

    const existingClient = lookup.data.exists ? lookup.data.cliente : null;
    const clientUser: User = existingClient
      ? {
          id: existingClient.id,
          name: existingClient.nome,
          phone: existingClient.telefone,
          email: existingClient.email || '',
          role: 'CLIENT',
        }
      : {
          id: '__new_client__',
          name: 'Cadastro Pendente',
          phone,
          role: 'CLIENT',
        };

    setUser(clientUser);
    localStorage.setItem('app_user', JSON.stringify(clientUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('app_user');
    localStorage.removeItem('impersonation_master_token');
    localStorage.removeItem('impersonation_master_user');
    localStorage.removeItem('impersonation_tenant_name');
    localStorage.removeItem('impersonation_tenant_slug');
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const addAppointment = async (apt: Appointment): Promise<{ success: boolean; error?: string }> => {
    if (isBackofficeApiSession()) {
      if (user?.role === 'EMPLOYEE' && apt.professionalId !== user.id) {
        return { success: false, error: 'Você só pode gerenciar seus próprios agendamentos.' };
      }

      if (apt.status === 'BLOCKED') {
        const result = await createBloqueioApi({
          profissional_id: apt.professionalId,
          data: apt.date,
          hora_inicio: apt.time,
          hora_fim: apt.endTime || apt.time,
          motivo: apt.blockReason || null,
        });
        if (!result.success) {
          const message = ('error' in result && result.error) ? result.error : 'Falha ao criar bloqueio.';
          pushErrorNotification(message);
          return { success: false, error: message };
        }
        setAppointments(prev => [mapAgendamento(result.data, services), ...prev]);
        return { success: true };
      }

      const service = services.find(item => item.id === apt.serviceId);
      const result = await createAgendamentoApi({
        cliente_id: apt.clientId,
        profissional_id: apt.professionalId,
        servico_id: apt.serviceId,
        data: apt.date,
        hora_inicio: apt.time,
        hora_fim: getHoraFimByServiceDuration(apt.time, service?.durationMinutes || 30),
        status: apt.status,
      });
      if (!result.success) {
        const message = ('error' in result && result.error) ? result.error : 'Falha ao criar agendamento.';
        pushErrorNotification(message);
        return { success: false, error: message };
      }
      setAppointments(prev => [mapAgendamento(result.data, services), ...prev]);
      return { success: true };
    }

    const service = services.find(item => item.id === apt.serviceId);
    const result = await createAgendamentoPublicApi({
      cliente_id: apt.clientId,
      profissional_id: apt.professionalId,
      servico_id: apt.serviceId,
      data: apt.date,
      hora_inicio: apt.time,
      hora_fim: getHoraFimByServiceDuration(apt.time, service?.durationMinutes || 30),
      status: apt.status,
    });

    if (!result.success) {
      const message = ('error' in result && result.error) ? result.error : 'Falha ao criar agendamento.';
      return { success: false, error: message };
    }

    setAppointments(prev => [mapAgendamento(result.data, services), ...prev]);

    const newNotif: AppNotification = {
      id: Date.now().toString(),
      title: 'Novo Agendamento',
      message: `Agendamento confirmado para ${apt.date} às ${apt.time}`,
      type: 'SUCCESS',
      read: false,
      timestamp: 'Agora'
    };
    setNotifications(prev => [newNotif, ...prev]);
    return { success: true };
  };

  const updateAppointment = async (updatedApt: Appointment): Promise<{ success: boolean; error?: string }> => {
    if (isBackofficeApiSession()) {
      if (user?.role === 'EMPLOYEE' && updatedApt.professionalId !== user.id) {
        return { success: false, error: 'Você só pode gerenciar seus próprios agendamentos.' };
      }

      if (updatedApt.status === 'BLOCKED') {
        const bloqueioId = updatedApt.id.startsWith('bloqueio:') ? updatedApt.id.replace('bloqueio:', '') : updatedApt.id;
        const result = await updateBloqueioApi(bloqueioId, {
          profissional_id: updatedApt.professionalId,
          data: updatedApt.date,
          hora_inicio: updatedApt.time,
          hora_fim: updatedApt.endTime || updatedApt.time,
          motivo: updatedApt.blockReason || null,
        });
        if (!result.success) {
          const message = ('error' in result && result.error) ? result.error : 'Falha ao atualizar bloqueio.';
          pushErrorNotification(message);
          return { success: false, error: message };
        }
        const mapped = mapAgendamento(result.data, services);
        setAppointments(prev => prev.map(item => item.id === mapped.id ? mapped : item));
        return { success: true };
      }

      const service = services.find(item => item.id === updatedApt.serviceId);
      const result = await updateAgendamentoApi(updatedApt.id, {
        cliente_id: updatedApt.clientId,
        profissional_id: updatedApt.professionalId,
        servico_id: updatedApt.serviceId,
        data: updatedApt.date,
        hora_inicio: updatedApt.time,
        hora_fim: getHoraFimByServiceDuration(updatedApt.time, service?.durationMinutes || 30),
        status: updatedApt.status,
      });
      if (!result.success) {
        const message = ('error' in result && result.error) ? result.error : 'Falha ao atualizar agendamento.';
        pushErrorNotification(message);
        return { success: false, error: message };
      }
      const mapped = mapAgendamento(result.data, services);
      setAppointments(prev => prev.map(item => item.id === mapped.id ? mapped : item));
      return { success: true };
    }

    const service = services.find(item => item.id === updatedApt.serviceId);
    const result = await updateAgendamentoPublicApi(updatedApt.id, {
      cliente_id: updatedApt.clientId,
      data: updatedApt.date,
      hora_inicio: updatedApt.time,
      hora_fim: getHoraFimByServiceDuration(updatedApt.time, service?.durationMinutes || 30),
    });

    if (!result.success) {
      const message = ('error' in result && result.error) ? result.error : 'Falha ao remarcar agendamento.';
      return { success: false, error: message };
    }

    setAppointments(prev => prev.map(a => a.id === updatedApt.id ? mapAgendamento(result.data, services) : a));
    return { success: true };
  };

  const transitionAppointmentStatus = async (
    appointmentId: string,
    status: Appointment['status'],
    options?: { reason?: string; paymentMethod?: string; totalValue?: number; observation?: string; }
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isBackofficeApiSession()) {
      if (user?.role !== 'CLIENT') {
        setAppointments(prev => prev.map(item => item.id === appointmentId ? { ...item, status } : item));
        return { success: true };
      }

      if (status !== 'CANCELLED') {
        return { success: false, error: 'Ação não permitida.' };
      }

      const current = appointments.find(item => item.id === appointmentId);
      if (!current) {
        return { success: false, error: 'Agendamento não encontrado.' };
      }

      const result = await cancelAgendamentoPublicApi(appointmentId, {
        cliente_id: current.clientId,
        motivo: options?.reason,
      });

      if (!result.success) {
        const message = ('error' in result && result.error) ? result.error : 'Falha ao cancelar agendamento.';
        return { success: false, error: message };
      }

      setAppointments(prev => prev.map(item => item.id === appointmentId ? mapAgendamento(result.data, services) : item));
      return { success: true };
    }

    const current = appointments.find(item => item.id === appointmentId);
    if (!current) {
      return { success: false, error: 'Agendamento não encontrado.' };
    }

    if (user?.role === 'EMPLOYEE' && current.professionalId !== user.id) {
      return { success: false, error: 'Você só pode gerenciar seus próprios agendamentos.' };
    }

    const result = await transitionAgendamentoStatusApi(appointmentId, {
      status,
      motivo: options?.reason,
      forma_pagamento: options?.paymentMethod,
      valor_final: options?.totalValue,
      observacao: options?.observation,
    });

    if (!result.success) {
      const message = ('error' in result && result.error) ? result.error : 'Falha ao atualizar status do agendamento.';
      pushErrorNotification(message);
      return { success: false, error: message };
    }

    setAppointments(prev => prev.map(item => item.id === appointmentId ? mapAgendamento(result.data, services) : item));
    return { success: true };
  };

  const deleteAppointment = (id: string) => {
    if (isBackofficeApiSession()) {
      void (async () => {
        const current = appointments.find(item => item.id === id);
        if (user?.role === 'EMPLOYEE' && current && current.professionalId !== user.id) {
          pushErrorNotification('Você só pode excluir seus próprios agendamentos.');
          return;
        }

        const isBloqueio = id.startsWith('bloqueio:');
        const rawId = isBloqueio ? id.replace('bloqueio:', '') : id;
        const result = isBloqueio
          ? await deleteBloqueioApi(rawId)
          : await deleteAgendamentoApi(rawId);
        if (!result.success) {
          pushErrorNotification(('error' in result && result.error) ? result.error : (isBloqueio ? 'Falha ao excluir bloqueio.' : 'Falha ao cancelar agendamento.'));
          return;
        }
        setAppointments(prev => prev.filter(a => a.id !== id));
      })();
      return;
    }

    setAppointments(prev => prev.filter(a => a.id !== id));
  };

  const updateService = (updatedService: Service) => {
    if (!isAdminApiSession()) {
      setServices(prev => prev.map(s => s.id === updatedService.id ? updatedService : s));
      return;
    }

    void (async () => {
      const category = categories.find(c => c.name === updatedService.category);
      const result = await updateServicoApi(updatedService.id, {
        nome: updatedService.title,
        categoria_id: category?.id || null,
        duracao_min: updatedService.durationMinutes,
        preco: updatedService.price,
      });

      if (!result.success) {
        pushErrorNotification(('error' in result && result.error) ? result.error : 'Falha ao atualizar serviço.');
        return;
      }

      const mapped = {
        ...mapServico(result.data, categories),
        description: updatedService.description,
        iconName: updatedService.iconName,
      };
      setServices(prev => prev.map(s => s.id === mapped.id ? mapped : s));
    })();
  };

  const addService = (newService: Service) => {
    if (!isAdminApiSession()) {
      setServices(prev => [...prev, { ...newService, sortOrder: prev.length + 1 }]);
      return;
    }

    void (async () => {
      const category = categories.find(c => c.name === newService.category);
      const result = await createServicoApi({
        nome: newService.title,
        categoria_id: category?.id || null,
        duracao_min: newService.durationMinutes,
        preco: newService.price,
      });

      if (!result.success) {
        pushErrorNotification(('error' in result && result.error) ? result.error : 'Falha ao criar serviço.');
        return;
      }

      const mapped = {
        ...mapServico(result.data, categories),
        description: newService.description,
        iconName: newService.iconName,
      };
      setServices(prev => [...prev, mapped]);
    })();
  };

  const deleteService = async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (!isAdminApiSession()) {
      setServices(prev => prev.filter(s => s.id !== id));
      return { success: true };
    }

    const result = await deleteServicoApi(id);
    if (!result.success) {
      const message = ('error' in result && result.error) ? result.error : 'Falha ao excluir serviço.';
      pushErrorNotification(message);
      return { success: false, error: message };
    }
    setServices(prev => prev.filter(s => s.id !== id));
    return { success: true };
  };

  const reorderServices = async (orderedServiceIds: string[]): Promise<{ success: boolean; error?: string }> => {
    if (orderedServiceIds.length !== services.length) {
      return { success: false, error: 'A ordenação enviada está incompleta.' };
    }

    const servicesById = new Map(services.map(service => [service.id, service]));
    if (orderedServiceIds.some(id => !servicesById.has(id))) {
      return { success: false, error: 'A ordenação contém serviços inválidos.' };
    }

    const reorderedLocal = orderedServiceIds.map((serviceId, index) => {
      const current = servicesById.get(serviceId)!;
      return {
        ...current,
        sortOrder: index + 1,
      };
    });

    const previous = services;
    setServices(reorderedLocal);

    if (!isAdminApiSession()) {
      return { success: true };
    }

    const result = await reorderServicosApi(orderedServiceIds);
    if (!result.success) {
      setServices(previous);
      const message = ('error' in result && result.error) ? result.error : 'Falha ao salvar ordenação de serviços.';
      pushErrorNotification(message);
      return { success: false, error: message };
    }

    const previousById = new Map(previous.map(service => [service.id, service]));
    const mapped = result.data.map((item) => {
      const base = mapServico(item, categories);
      const existing = previousById.get(base.id);
      return {
        ...base,
        description: existing?.description || base.description,
        iconName: existing?.iconName || base.iconName,
      };
    });
    setServices(mapped);
    return { success: true };
  };

  const addCategory = (newCategory: Category) => {
    if (!isAdminApiSession()) {
      setCategories(prev => [...prev, newCategory]);
      return;
    }

    void (async () => {
      const result = await createCategoriaApi({
        nome: newCategory.name,
        descricao: newCategory.description || null,
      });

      if (!result.success) {
        pushErrorNotification(('error' in result && result.error) ? result.error : 'Falha ao criar categoria.');
        return;
      }

      setCategories(prev => [...prev, mapCategoria(result.data)]);
    })();
  };

  const updateCategory = (updatedCategory: Category) => {
    if (!isAdminApiSession()) {
      setCategories(prev => prev.map(c => c.id === updatedCategory.id ? updatedCategory : c));
      return;
    }

    void (async () => {
      const result = await updateCategoriaApi(updatedCategory.id, {
        nome: updatedCategory.name,
        descricao: updatedCategory.description || null,
      });

      if (!result.success) {
        pushErrorNotification(('error' in result && result.error) ? result.error : 'Falha ao atualizar categoria.');
        return;
      }

      setCategories(prev => prev.map(c => c.id === updatedCategory.id ? mapCategoria(result.data) : c));
    })();
  };

  const deleteCategory = async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (!isAdminApiSession()) {
      setCategories(prev => prev.filter(c => c.id !== id));
      return { success: true };
    }

    const result = await deleteCategoriaApi(id);
    if (!result.success) {
      const message = ('error' in result && result.error) ? result.error : 'Falha ao excluir categoria.';
      pushErrorNotification(message);
      return { success: false, error: message };
    }
    setCategories(prev => prev.filter(c => c.id !== id));
    return { success: true };
  };

  const addClient = (newClient: Client) => {
    if (!isBackofficeApiSession()) {
      setClients(prev => [...prev, newClient]);
      return;
    }

    void (async () => {
      const result = await createClienteApi({
        nome: newClient.name,
        telefone: newClient.phone,
        data_nascimento: newClient.birthday || null,
      });

      if (!result.success) {
        pushErrorNotification(('error' in result && result.error) ? result.error : 'Falha ao criar cliente.');
        return;
      }

      const mappedClient: Client = {
        ...mapClient(result.data),
      };
      setClients(prev => [...prev, mappedClient]);
    })();
  };

  const importClients = async (
    clientsToImport: ClientImportInput[]
  ): Promise<{ successCount: number; failed: Array<{ index: number; name: string; phone: string; error: string }> }> => {
    if (clientsToImport.length === 0) {
      return { successCount: 0, failed: [] };
    }

    if (!isBackofficeApiSession()) {
      const now = Date.now();
      const mappedClients: Client[] = clientsToImport.map((item, index) => ({
        id: `${now}-${index}`,
        name: item.name,
        phone: item.phone,
        birthday: item.birthday || undefined,
        totalSpent: 0,
        haircutsCount: 0,
        lastVisit: undefined,
      }));
      setClients(prev => [...prev, ...mappedClients]);
      return { successCount: mappedClients.length, failed: [] };
    }

    const failed: Array<{ index: number; name: string; phone: string; error: string }> = [];
    const createdClients: Client[] = [];

    for (let index = 0; index < clientsToImport.length; index += 1) {
      const current = clientsToImport[index];
      const result = await createClienteApi({
        nome: current.name,
        telefone: current.phone,
        email: current.email || null,
        data_nascimento: current.birthday || null,
      });

      if (!result.success) {
        failed.push({
          index: index + 1,
          name: current.name,
          phone: current.phone,
          error: ('error' in result && result.error) ? result.error : 'Falha ao importar cliente.',
        });
        continue;
      }

      createdClients.push({
        ...mapClient(result.data),
      });
    }

    if (createdClients.length > 0) {
      setClients(prev => [...prev, ...createdClients]);
    }

    return { successCount: createdClients.length, failed };
  };

  const updateClient = (updatedClient: Client) => {
    if (!isBackofficeApiSession()) {
      setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
      return;
    }

    void (async () => {
      const result = await updateClienteApi(updatedClient.id, {
        nome: updatedClient.name,
        telefone: updatedClient.phone,
        data_nascimento: updatedClient.birthday || null,
      });

      if (!result.success) {
        pushErrorNotification(('error' in result && result.error) ? result.error : 'Falha ao atualizar cliente.');
        return;
      }

      const mappedClient: Client = {
        ...mapClient(result.data),
      };
      setClients(prev => prev.map(c => c.id === updatedClient.id ? mappedClient : c));
    })();
  };

  const deleteClient = async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (!isBackofficeApiSession()) {
      setClients(prev => prev.filter(c => c.id !== id));
      return { success: true };
    }

    const result = await deleteClienteApi(id);
    if (!result.success) {
      const message = ('error' in result && result.error) ? result.error : 'Falha ao excluir cliente.';
      pushErrorNotification(message);
      return { success: false, error: message };
    }
    setClients(prev => prev.filter(c => c.id !== id));
    return { success: true };
  };

  const addUser = async (newUser: User & { password?: string; commissionPercentage?: number }): Promise<{ success: boolean; error?: string }> => {
    if (!isAdminApiSession()) {
      setUsers(prev => [...prev, newUser]);
      return { success: true };
    }

    if (newUser.avatar && newUser.avatar.length > MAX_AVATAR_URL_LENGTH) {
      const message = 'Imagem de avatar muito grande. Use uma imagem menor.';
      pushErrorNotification(message);
      return { success: false, error: message };
    }

    const email = (newUser.email || '').trim().toLowerCase();
    if (!email || !newUser.password) {
      const message = 'Email e senha são obrigatórios para criar usuário.';
      pushErrorNotification(message);
      return { success: false, error: message };
    }

    const authResult = await createAuthUserApi({
      id: newUser.id,
      nome: newUser.name,
      telefone: newUser.phone,
      email,
      senha: newUser.password,
      role: newUser.role === 'ADMIN' ? 'ADMIN' : 'EMPLOYEE',
      ativo: newUser.active ?? true,
    });

    if (!authResult.success) {
      const message = ('error' in authResult && authResult.error) ? authResult.error : 'Falha ao criar usuário.';
      pushErrorNotification(message);
      return { success: false, error: message };
    }

    const existingProfessional = professionals.find(p => p.id === authResult.data.id);
    const hasProfissional = Boolean(existingProfessional);
    const commissionPercentage = Number(
      typeof newUser.commissionPercentage === 'number'
        ? newUser.commissionPercentage
        : (existingProfessional?.commissionPercentage || 0)
    );
    const profissionalPayload = {
      id: authResult.data.id,
      nome: newUser.name,
      cargo: newUser.role === 'ADMIN' ? 'Administrador' : 'Profissional',
      telefone: newUser.phone,
      foto_url: normalizeAvatar(newUser.avatar) || null,
      comissao_percentual: Number(commissionPercentage.toFixed(2)),
      ativo: true,
    };

    const profissionalResult = hasProfissional
      ? await updateProfissionalApi(authResult.data.id, profissionalPayload)
      : await createProfissionalApi(profissionalPayload);

    if (!profissionalResult.success) {
      await deleteAuthUserApi(authResult.data.id);
      const message = ('error' in profissionalResult && profissionalResult.error) ? profissionalResult.error : 'Falha ao criar profissional associado.';
      pushErrorNotification(message);
      return { success: false, error: message };
    }

    setUsers(prev => [...prev, mapAuthUserToUser(authResult.data, profissionalResult.data.foto_url || undefined)]);
    setProfessionals(prev => {
      const mapped = mapProfissional(profissionalResult.data);
      if (hasProfissional) {
        return prev.map(p => p.id === mapped.id ? mapped : p);
      }
      return [...prev, mapped];
    });
    return { success: true };
  };

  const updateUser = async (updatedUser: User & { password?: string; commissionPercentage?: number }): Promise<{ success: boolean; error?: string }> => {
    if (!isAdminApiSession()) {
      setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
      return { success: true };
    }

    if (updatedUser.avatar && updatedUser.avatar.length > MAX_AVATAR_URL_LENGTH) {
      const message = 'Imagem de avatar muito grande. Use uma imagem menor.';
      pushErrorNotification(message);
      return { success: false, error: message };
    }

    const email = (updatedUser.email || '').trim().toLowerCase();
    if (!email) {
      const message = 'Email é obrigatório.';
      pushErrorNotification(message);
      return { success: false, error: message };
    }

    const authResult = await updateAuthUserApi(updatedUser.id, {
      nome: updatedUser.name,
      telefone: updatedUser.phone,
      email,
      senha: updatedUser.password,
      role: updatedUser.role === 'ADMIN' ? 'ADMIN' : 'EMPLOYEE',
      ativo: updatedUser.active ?? true,
    });

    if (!authResult.success) {
      const message = ('error' in authResult && authResult.error) ? authResult.error : 'Falha ao atualizar usuário.';
      pushErrorNotification(message);
      return { success: false, error: message };
    }

    const existingProfessional = professionals.find(p => p.id === updatedUser.id);
    const hasProfissional = Boolean(existingProfessional);
    const commissionPercentage = Number(
      typeof updatedUser.commissionPercentage === 'number'
        ? updatedUser.commissionPercentage
        : (existingProfessional?.commissionPercentage || 0)
    );
    const profissionalPayload = {
      id: updatedUser.id,
      nome: updatedUser.name,
      cargo: updatedUser.role === 'ADMIN' ? 'Administrador' : 'Profissional',
      telefone: updatedUser.phone,
      foto_url: normalizeAvatar(updatedUser.avatar) || null,
      comissao_percentual: Number(commissionPercentage.toFixed(2)),
      ativo: updatedUser.active ?? true,
    };

    const profissionalResult = hasProfissional
      ? await updateProfissionalApi(updatedUser.id, profissionalPayload)
      : await createProfissionalApi(profissionalPayload);

    if (!profissionalResult.success) {
      const message = ('error' in profissionalResult && profissionalResult.error) ? profissionalResult.error : 'Falha ao sincronizar profissional.';
      pushErrorNotification(message);
      setUsers(prev => prev.map(u => u.id === updatedUser.id ? mapAuthUserToUser(authResult.data, updatedUser.avatar) : u));
      return { success: false, error: message };
    }

    setUsers(prev => prev.map(u => u.id === updatedUser.id ? mapAuthUserToUser(authResult.data, profissionalResult.data.foto_url || undefined) : u));
    setProfessionals(prev => {
      const mapped = mapProfissional(profissionalResult.data);
      if (mapped.active === false) {
        return prev.filter(p => p.id !== updatedUser.id);
      }
      if (hasProfissional) {
        return prev.map(p => p.id === updatedUser.id ? mapped : p);
      }
      return [...prev, mapped];
    });
    return { success: true };
  };

  const deleteUser = async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (!isAdminApiSession()) {
      setUsers(prev => prev.filter(u => u.id !== id));
      return { success: true };
    }

    const authResult = await deleteAuthUserApi(id);
    if (!authResult.success) {
      const message = ('error' in authResult && authResult.error) ? authResult.error : 'Falha ao excluir usuário.';
      pushErrorNotification(message);
      return { success: false, error: message };
    }

    const profissionalResult = await deleteProfissionalApi(id);
    if (!profissionalResult.success) {
      pushErrorNotification(('error' in profissionalResult && profissionalResult.error) ? profissionalResult.error : 'Usuário removido, mas não foi possível excluir profissional vinculado.');
    }

    setUsers(prev => prev.filter(u => u.id !== id));
    setProfessionals(prev => prev.filter(p => p.id !== id));
    return { success: true };
  };

  const deactivateProfessional = async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (!isAdminApiSession()) {
      setProfessionals(prev => prev.filter(p => p.id !== id));
      return { success: true };
    }

    const result = await deleteProfissionalApi(id);
    if (!result.success) {
      const message = ('error' in result && result.error) ? result.error : 'Falha ao inativar profissional.';
      pushErrorNotification(message);
      return { success: false, error: message };
    }

    setProfessionals(prev => prev.filter(p => p.id !== id));
    return { success: true };
  };

  const saveBusinessHours = async (hours: BusinessHour[]): Promise<{ success: boolean; error?: string }> => {
    if (!isAdminApiSession()) {
      setBusinessHours(hours);
      return { success: true };
    }

    const payload: HorarioFuncionamentoApi[] = hours.map(item => ({
      dia_semana: item.dayOfWeek,
      aberto: item.open,
      hora_inicio: item.open ? item.start : '00:00',
      hora_fim: item.open ? item.end : '00:00',
    }));

    const result = await saveHorariosFuncionamentoApi(payload);
    if (!result.success) {
      const message = ('error' in result && result.error) ? result.error : 'Falha ao salvar horários de funcionamento.';
      pushErrorNotification(message);
      return { success: false, error: message };
    }

    setBusinessHours(result.data.map(mapHorarioFuncionamento));
    return { success: true };
  };

  const saveBrandIdentity = async (identity: BrandIdentity): Promise<{ success: boolean; error?: string }> => {
    if (!isAdminApiSession()) {
      setBrandIdentity(identity);
      return { success: true };
    }

    const result = await saveIdentidadeApi({
      nome: identity.name,
      telefone: identity.phone || null,
      cidade: identity.city || null,
      logo_url: identity.logoUrl || null,
      login_logo_url: identity.loginLogoUrl || null,
      login_background_url: identity.loginBackgroundUrl || null,
      churn_risk_days_threshold: Math.max(1, Math.min(365, Number(identity.churnRiskDaysThreshold || 45))),
      allow_employee_confirm_appointment: Boolean(identity.allowEmployeeConfirmAppointment),
      allow_employee_create_appointment: identity.allowEmployeeCreateAppointment === undefined ? true : Boolean(identity.allowEmployeeCreateAppointment),
      allow_employee_view_finance: Boolean(identity.allowEmployeeViewFinance),
      allow_employee_view_reports: Boolean(identity.allowEmployeeViewReports),
      allow_employee_view_users: Boolean(identity.allowEmployeeViewUsers),
      icone_marca: identity.iconName || 'scissors',
      cor_primaria: identity.primaryColor || '#2563eb',
      cor_secundaria: identity.secondaryColor || '#eff6ff',
    });

    if (!result.success) {
      const message = ('error' in result && result.error) ? result.error : 'Falha ao salvar identidade visual.';
      pushErrorNotification(message);
      return { success: false, error: message };
    }

    const mapped = mapIdentidade(result.data);
    setBrandIdentity(mapped);
    return { success: true };
  };

  const isStripeSubscriptionActive = () => localStorage.getItem('stripe_subscription_active') === 'true';
  const getCurrentTenantSlug = () => {
    const pathSegment = window.location.pathname.split('/').filter(Boolean)[0];
    if (pathSegment && /^[a-z0-9-]+$/i.test(pathSegment)) {
      return pathSegment.toLowerCase();
    }

    const hashPath = (window.location.hash || '').replace(/^#\/?/, '');
    const hashSegment = hashPath.split('/').filter(Boolean)[0];
    if (hashSegment && /^[a-z0-9-]+$/i.test(hashSegment) && !['login', 'admin', 'client', 'master', 'onboarding'].includes(hashSegment.toLowerCase())) {
      return hashSegment.toLowerCase();
    }

    const localTenant = localStorage.getItem('tenant_slug');
    if (localTenant && localTenant.trim()) {
      return localTenant.trim().toLowerCase();
    }

    return ((import.meta as any).env?.VITE_DEFAULT_TENANT_SLUG || 'demo').toLowerCase();
  };

  const isOnboardingCompleted = () => {
    const tenantSlug = getCurrentTenantSlug();
    const tenantScoped = localStorage.getItem(`onboarding_completed:${tenantSlug}`) === 'true';
    const legacyDefault = tenantSlug === 'demo' && localStorage.getItem('onboarding_completed') === 'true';
    return tenantScoped || legacyDefault;
  };

  const shouldOpenOnboarding = Boolean(
    user &&
    user.role === 'ADMIN' &&
    adminBootstrapChecked &&
    !isOnboardingCompleted()
  );

  if (!authInitialized) {
    return <div className="min-h-screen bg-gray-50" />;
  }

  return (
    <AppContext.Provider value={{ 
      user, login, logout, notifications, markNotificationRead, 
      appointments, addAppointment, updateAppointment, transitionAppointmentStatus, deleteAppointment,
      services, updateService, addService, deleteService, reorderServices,
      categories, addCategory, updateCategory, deleteCategory,
      professionals, clients, addClient, importClients, updateClient, deleteClient,
      users, addUser, updateUser, deleteUser, deactivateProfessional,
      businessHours, saveBusinessHours,
      brandIdentity, saveBrandIdentity
    }}>
      <HashRouter>
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
          <Routes>
            <Route path="/login" element={!user ? <Login /> : <Navigate to={shouldOpenOnboarding ? '/onboarding' : (user.role === 'MASTER' ? '/master' : ((user.role === 'ADMIN' || user.role === 'EMPLOYEE') ? '/admin' : '/client'))} />} />
            
            <Route path="/client/*" element={
              user && user.role === 'CLIENT' ? <ClientPortal /> : <Navigate to="/login" />
            } />
            
            <Route path="/admin/*" element={
              user && (user.role === 'ADMIN' || user.role === 'EMPLOYEE')
                ? (shouldOpenOnboarding ? <Navigate to="/onboarding" /> : <AdminDashboard />)
                : <Navigate to="/login" />
            } />

            <Route path="/master/*" element={
              user
                ? (user.role === 'MASTER' ? <MasterDashboard onLogout={logout} /> : <Navigate to={user.role === 'CLIENT' ? '/client' : '/admin'} />)
                : <MasterLogin />
            } />

            <Route path="/onboarding" element={
              <OnboardingAccessGuard
                user={user}
                isOnboardingCompleted={isOnboardingCompleted}
                getCurrentTenantSlug={getCurrentTenantSlug}
              />
            } />

            <Route path="/" element={<Navigate to="/login" />} />
          </Routes>
          <LGPDBanner />
        </div>
      </HashRouter>
    </AppContext.Provider>
  );
};

export default App;