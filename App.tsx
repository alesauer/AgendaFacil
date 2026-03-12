import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { User, AppNotification, Appointment, Service, Professional, Client, Category } from './types';
import { MOCK_NOTIFICATIONS } from './constants';
import { AgendamentoApi, createAgendamentoApi, deleteAgendamentoApi, listAgendamentosApi, updateAgendamentoApi } from './services/agendamentosApi';
import { loginApi, meApi } from './services/authApi';
import { CategoriaApi, createCategoriaApi, deleteCategoriaApi, listCategoriasApi, updateCategoriaApi } from './services/categoriasApi';
import { ClienteApi, createClienteApi, deleteClienteApi, listClientesApi, updateClienteApi } from './services/clientesApi';
import { createProfissionalApi, deleteProfissionalApi, listProfissionaisApi, ProfissionalApi, updateProfissionalApi } from './services/profissionaisApi';
import { createServicoApi, deleteServicoApi, listServicosApi, ServicoApi, updateServicoApi } from './services/servicosApi';
import { Login } from './views/Login';
import { ClientPortal } from './views/ClientPortal';
import { AdminDashboard } from './views/AdminDashboard';
import { Onboarding } from './views/Onboarding';

// --- Contexts ---

interface AppContextType {
  user: User | null;
  login: (phone: string, role: 'CLIENT' | 'ADMIN', password?: string) => Promise<void>;
  logout: () => void;
  notifications: AppNotification[];
  markNotificationRead: (id: string) => void;
  appointments: Appointment[];
  addAppointment: (apt: Appointment) => void;
  updateAppointment: (apt: Appointment) => void;
  deleteAppointment: (id: string) => void;
  services: Service[];
  updateService: (service: Service) => void;
  deleteService: (id: string) => void;
  addService: (service: Service) => void;
  categories: Category[];
  addCategory: (category: Category) => void;
  updateCategory: (category: Category) => void;
  deleteCategory: (id: string) => void;
  professionals: Professional[];
  clients: Client[];
  addClient: (client: Client) => void;
  updateClient: (client: Client) => void;
  deleteClient: (id: string) => void;
  users: User[];
  addUser: (user: User) => void;
  updateUser: (user: User) => void;
  deleteUser: (id: string) => void;
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

// --- Main App Component ---

const App: React.FC = () => {
  const MAX_AVATAR_URL_LENGTH = 300000;

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

  const isAdminApiSession = () => {
    return user?.role === 'ADMIN' && !!localStorage.getItem('auth_token');
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
      iconName: 'Scissors',
    };
  };

  const mapProfissional = (profissional: ProfissionalApi): Professional => ({
    id: profissional.id,
    name: profissional.nome,
    role: profissional.cargo || 'Profissional',
    avatar: normalizeAvatar(profissional.foto_url),
    specialties: [],
  });

  const mapProfissionalToUser = (profissional: ProfissionalApi): User => ({
    id: profissional.id,
    name: profissional.nome,
    phone: profissional.telefone || '',
    role: 'EMPLOYEE',
    avatar: normalizeAvatar(profissional.foto_url),
  });

  const mapClient = (client: ClienteApi): Client => ({
    id: client.id,
    name: client.nome,
    phone: client.telefone,
    birthday: client.data_nascimento || undefined,
    totalSpent: 0,
    haircutsCount: 0,
    lastVisit: undefined,
  });

  const mapAgendamento = (agendamento: AgendamentoApi, servicosAtuais: Service[]): Appointment => {
    const servico = servicosAtuais.find(item => item.id === agendamento.servico_id);
    const dataNormalizada = String(agendamento.data).slice(0, 10);
    const horaNormalizada = String(agendamento.hora_inicio).slice(0, 5);
    return {
      id: agendamento.id,
      serviceId: agendamento.servico_id,
      professionalId: agendamento.profissional_id,
      clientId: agendamento.cliente_id,
      date: dataNormalizada,
      time: horaNormalizada,
      status: (agendamento.status as Appointment['status']) || 'CONFIRMED',
      totalValue: servico?.price || 0,
      createdAt: `${dataNormalizada}T${horaNormalizada}:00`,
    };
  };

  const getHoraFimByServiceDuration = (horaInicio: string, durationMinutes: number): string => {
    const [hourStr, minuteStr] = horaInicio.split(':');
    const initialMinutes = (parseInt(hourStr || '0', 10) * 60) + parseInt(minuteStr || '0', 10);
    const endMinutes = initialMinutes + Math.max(durationMinutes, 15);
    const hours = Math.floor(endMinutes / 60) % 24;
    const minutes = endMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const syncAdminData = async () => {
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

    if (servicosResult.success) {
      setServices(servicosResult.data.map(item => mapServico(item, categoriasAtuais)));
    }

    if (profissionaisResult.success) {
      setProfessionals(profissionaisResult.data.map(mapProfissional));
      setUsers(profissionaisResult.data.map(mapProfissionalToUser));
    }

    if (clientesResult.success) {
      setClients(clientesResult.data.map(mapClient));
    }

    const servicosMapeados = servicosResult.success
      ? servicosResult.data.map(item => mapServico(item, categoriasAtuais))
      : services;

    const agendamentosResult = await listAgendamentosApi();
    if (agendamentosResult.success) {
      setAppointments(agendamentosResult.data.map(item => mapAgendamento(item, servicosMapeados)));
    }

    const errors: string[] = [];
    if (!categoriasResult.success) errors.push('categorias');
    if (!servicosResult.success) errors.push('serviços');
    if (!profissionaisResult.success) errors.push('profissionais');
    if (!clientesResult.success) errors.push('clientes');
    if (!agendamentosResult.success) errors.push('agendamentos');

    if (errors.length > 0) {
      pushErrorNotification(`Não foi possível sincronizar: ${errors.join(', ')}. Exibindo fallback local.`);
    }
  };

  // Check for session cookie simulation
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (token) {
          const result = await meApi();
          if (result.success) {
            const restoredUser: User = {
              id: result.data.id,
              name: result.data.nome,
              phone: result.data.telefone,
              role: result.data.role,
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
          if (parsedUser.role === 'ADMIN') {
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
    if (!authInitialized || !isAdminApiSession()) {
      return;
    }

    let cancelled = false;

    const sync = async () => {
      try {
        await syncAdminData();
      } catch {
        if (!cancelled) {
          pushErrorNotification('Erro ao carregar dados do painel. Mantendo dados locais como fallback.');
        }
      }
    };

    sync();

    return () => {
      cancelled = true;
    };
  }, [authInitialized, user?.id, user?.role]);

  const login = async (phone: string, role: 'CLIENT' | 'ADMIN', password?: string) => {
    if (role === 'ADMIN') {
      const result = await loginApi({
        telefone: phone,
        senha: password || '',
      });

      if (!result.success) {
        throw new Error(('error' in result && result.error) ? result.error : 'Falha na autenticação');
      }

      const authenticatedUser: User = {
        id: result.data.user.id,
        name: result.data.user.nome,
        phone: result.data.user.telefone,
        role: result.data.user.role,
      };

      localStorage.setItem('auth_token', result.data.token);
      localStorage.setItem('app_user', JSON.stringify(authenticatedUser));
      setUser(authenticatedUser);
      return;
    }

    const mockClientUser: User = {
      id: 'client1',
      name: 'João Cliente',
      phone,
      role: 'CLIENT',
      avatar: 'https://ui-avatars.com/api/?name=Client&background=random'
    };
    setUser(mockClientUser);
    localStorage.setItem('app_user', JSON.stringify(mockClientUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('app_user');
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const addAppointment = (apt: Appointment) => {
    if (isAdminApiSession()) {
      void (async () => {
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
          pushErrorNotification(('error' in result && result.error) ? result.error : 'Falha ao criar agendamento.');
          return;
        }
        setAppointments(prev => [mapAgendamento(result.data, services), ...prev]);
      })();
      return;
    }

    setAppointments(prev => [apt, ...prev]);
    // Simulate notification
    const newNotif: AppNotification = {
      id: Date.now().toString(),
      title: 'Novo Agendamento',
      message: `Agendamento confirmado para ${apt.date} às ${apt.time}`,
      type: 'SUCCESS',
      read: false,
      timestamp: 'Agora'
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const updateAppointment = (updatedApt: Appointment) => {
    if (isAdminApiSession()) {
      void (async () => {
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
          pushErrorNotification(('error' in result && result.error) ? result.error : 'Falha ao atualizar agendamento.');
          return;
        }
        const mapped = mapAgendamento(result.data, services);
        setAppointments(prev => prev.map(item => item.id === mapped.id ? mapped : item));
      })();
      return;
    }

    setAppointments(prev => prev.map(a => a.id === updatedApt.id ? updatedApt : a));
  };

  const deleteAppointment = (id: string) => {
    if (isAdminApiSession()) {
      void (async () => {
        const result = await deleteAgendamentoApi(id);
        if (!result.success) {
          pushErrorNotification(('error' in result && result.error) ? result.error : 'Falha ao cancelar agendamento.');
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
      setServices(prev => [...prev, newService]);
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

  const deleteService = (id: string) => {
    if (!isAdminApiSession()) {
      setServices(prev => prev.filter(s => s.id !== id));
      return;
    }

    void (async () => {
      const result = await deleteServicoApi(id);
      if (!result.success) {
        const message = ('error' in result && result.error) ? result.error : 'Falha ao excluir serviço.';
        pushErrorNotification(message);
        alert(message);
        return;
      }
      setServices(prev => prev.filter(s => s.id !== id));
    })();
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

  const deleteCategory = (id: string) => {
    if (!isAdminApiSession()) {
      setCategories(prev => prev.filter(c => c.id !== id));
      return;
    }

    void (async () => {
      const result = await deleteCategoriaApi(id);
      if (!result.success) {
        pushErrorNotification(('error' in result && result.error) ? result.error : 'Falha ao excluir categoria.');
        return;
      }
      setCategories(prev => prev.filter(c => c.id !== id));
    })();
  };

  const addClient = (newClient: Client) => {
    if (!isAdminApiSession()) {
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
        totalSpent: newClient.totalSpent,
        haircutsCount: newClient.haircutsCount,
        lastVisit: newClient.lastVisit,
      };
      setClients(prev => [...prev, mappedClient]);
    })();
  };

  const updateClient = (updatedClient: Client) => {
    if (!isAdminApiSession()) {
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
        totalSpent: updatedClient.totalSpent,
        haircutsCount: updatedClient.haircutsCount,
        lastVisit: updatedClient.lastVisit,
      };
      setClients(prev => prev.map(c => c.id === updatedClient.id ? mappedClient : c));
    })();
  };

  const deleteClient = (id: string) => {
    if (!isAdminApiSession()) {
      setClients(prev => prev.filter(c => c.id !== id));
      return;
    }

    void (async () => {
      const result = await deleteClienteApi(id);
      if (!result.success) {
        const message = ('error' in result && result.error) ? result.error : 'Falha ao excluir cliente.';
        pushErrorNotification(message);
        alert(message);
        return;
      }
      setClients(prev => prev.filter(c => c.id !== id));
    })();
  };

  const addUser = (newUser: User) => {
    if (!isAdminApiSession()) {
      setUsers(prev => [...prev, newUser]);
      return;
    }

    void (async () => {
      if (newUser.avatar && newUser.avatar.length > MAX_AVATAR_URL_LENGTH) {
        pushErrorNotification('Imagem de avatar muito grande. Use uma imagem menor.');
        return;
      }

      const result = await createProfissionalApi({
        nome: newUser.name,
        cargo: newUser.role === 'ADMIN' ? 'Administrador' : 'Profissional',
        telefone: newUser.phone,
        foto_url: normalizeAvatar(newUser.avatar) || null,
      });

      if (!result.success) {
        pushErrorNotification(('error' in result && result.error) ? result.error : 'Falha ao criar profissional.');
        return;
      }

      setUsers(prev => [...prev, mapProfissionalToUser(result.data)]);
      setProfessionals(prev => [...prev, mapProfissional(result.data)]);
    })();
  };

  const updateUser = (updatedUser: User) => {
    if (!isAdminApiSession()) {
      setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
      return;
    }

    void (async () => {
      if (updatedUser.avatar && updatedUser.avatar.length > MAX_AVATAR_URL_LENGTH) {
        pushErrorNotification('Imagem de avatar muito grande. Use uma imagem menor.');
        return;
      }

      const result = await updateProfissionalApi(updatedUser.id, {
        nome: updatedUser.name,
        cargo: updatedUser.role === 'ADMIN' ? 'Administrador' : 'Profissional',
        telefone: updatedUser.phone,
        foto_url: normalizeAvatar(updatedUser.avatar) || null,
        ativo: true,
      });

      if (!result.success) {
        pushErrorNotification(('error' in result && result.error) ? result.error : 'Falha ao atualizar profissional.');
        return;
      }

      setUsers(prev => prev.map(u => u.id === updatedUser.id ? mapProfissionalToUser(result.data) : u));
      setProfessionals(prev => prev.map(p => p.id === updatedUser.id ? mapProfissional(result.data) : p));
    })();
  };

  const deleteUser = (id: string) => {
    if (!isAdminApiSession()) {
      setUsers(prev => prev.filter(u => u.id !== id));
      return;
    }

    void (async () => {
      const result = await deleteProfissionalApi(id);
      if (!result.success) {
        pushErrorNotification(('error' in result && result.error) ? result.error : 'Falha ao excluir profissional.');
        return;
      }
      setUsers(prev => prev.filter(u => u.id !== id));
      setProfessionals(prev => prev.filter(p => p.id !== id));
    })();
  };

  const isStripeSubscriptionActive = () => localStorage.getItem('stripe_subscription_active') === 'true';
  const isOnboardingCompleted = () => localStorage.getItem('onboarding_completed') === 'true';
  const isManualOnboardingRequested = () => localStorage.getItem('manual_onboarding_request') === 'true';

  const shouldOpenOnboarding = Boolean(
    user &&
    user.role === 'ADMIN' &&
    isStripeSubscriptionActive() &&
    !isOnboardingCompleted()
  );

  if (!authInitialized) {
    return <div className="min-h-screen bg-gray-50" />;
  }

  return (
    <AppContext.Provider value={{ 
      user, login, logout, notifications, markNotificationRead, 
      appointments, addAppointment, updateAppointment, deleteAppointment,
      services, updateService, addService, deleteService,
      categories, addCategory, updateCategory, deleteCategory,
      professionals, clients, addClient, updateClient, deleteClient,
      users, addUser, updateUser, deleteUser
    }}>
      <HashRouter>
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
          <Routes>
            <Route path="/login" element={!user ? <Login /> : <Navigate to={shouldOpenOnboarding ? '/onboarding' : (user.role === 'ADMIN' ? '/admin' : '/client')} />} />
            
            <Route path="/client/*" element={
              user && user.role === 'CLIENT' ? <ClientPortal /> : <Navigate to="/login" />
            } />
            
            <Route path="/admin/*" element={
              user && user.role === 'ADMIN'
                ? (shouldOpenOnboarding ? <Navigate to="/onboarding" /> : <AdminDashboard />)
                : <Navigate to="/login" />
            } />

            <Route path="/onboarding" element={
              user && user.role === 'ADMIN'
                ? ((isStripeSubscriptionActive() || isManualOnboardingRequested())
                    ? (isOnboardingCompleted() ? <Navigate to="/admin" /> : <Onboarding />)
                    : <Navigate to="/admin" />)
                : <Navigate to="/login" />
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