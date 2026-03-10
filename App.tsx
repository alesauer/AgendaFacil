import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { User, AppNotification, Appointment, Service, Professional, Client, Category } from './types';
import { MOCK_NOTIFICATIONS, MOCK_SERVICES, MOCK_APPOINTMENTS, MOCK_PROFESSIONALS, MOCK_CLIENTS, MOCK_CATEGORIES } from './constants';
import { Login } from './views/Login';
import { ClientPortal } from './views/ClientPortal';
import { AdminDashboard } from './views/AdminDashboard';
import { Onboarding } from './views/Onboarding';
import { X } from 'lucide-react';

// --- Contexts ---

interface AppContextType {
  user: User | null;
  login: (phone: string, role: 'CLIENT' | 'ADMIN') => void;
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
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>(MOCK_NOTIFICATIONS);
  const [appointments, setAppointments] = useState<Appointment[]>(MOCK_APPOINTMENTS);
  const [services, setServices] = useState<Service[]>(MOCK_SERVICES);
  const [categories, setCategories] = useState<Category[]>(MOCK_CATEGORIES);
  const [professionals] = useState<Professional[]>(MOCK_PROFESSIONALS);
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);
  const [users, setUsers] = useState<User[]>([
    { id: 'admin1', name: 'Carlos Admin', role: 'ADMIN', phone: '11999999999', avatar: 'https://ui-avatars.com/api/?name=Carlos+Admin&background=random' },
    { id: 'recep1', name: 'Beatriz Silva', role: 'EMPLOYEE', phone: '11888888888', avatar: 'https://ui-avatars.com/api/?name=Beatriz+Silva&background=random' },
    { id: 'barber1', name: 'Ricardo Barber', role: 'EMPLOYEE', phone: '11777777777', avatar: 'https://ui-avatars.com/api/?name=Ricardo+Barber&background=random' }
  ]);

  // Check for session cookie simulation
  useEffect(() => {
    const savedUser = localStorage.getItem('app_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = (phone: string, role: 'CLIENT' | 'ADMIN') => {
    // Simulating auth
    const newUser: User = {
      id: role === 'ADMIN' ? 'admin1' : 'client1',
      name: role === 'ADMIN' ? 'Administrador' : 'João Cliente',
      phone,
      role,
      avatar: `https://ui-avatars.com/api/?name=${role === 'ADMIN' ? 'Admin' : 'Client'}&background=random`
    };
    setUser(newUser);
    localStorage.setItem('app_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('app_user');
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const addAppointment = (apt: Appointment) => {
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
    setAppointments(prev => prev.map(a => a.id === updatedApt.id ? updatedApt : a));
  };

  const deleteAppointment = (id: string) => {
    setAppointments(prev => prev.filter(a => a.id !== id));
  };

  const updateService = (updatedService: Service) => {
    setServices(prev => prev.map(s => s.id === updatedService.id ? updatedService : s));
  };

  const addService = (newService: Service) => {
    setServices(prev => [...prev, newService]);
  };

  const deleteService = (id: string) => {
    setServices(prev => prev.filter(s => s.id !== id));
  };

  const addCategory = (newCategory: Category) => {
    setCategories(prev => [...prev, newCategory]);
  };

  const updateCategory = (updatedCategory: Category) => {
    setCategories(prev => prev.map(c => c.id === updatedCategory.id ? updatedCategory : c));
  };

  const deleteCategory = (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  const addClient = (newClient: Client) => {
    setClients(prev => [...prev, newClient]);
  };

  const updateClient = (updatedClient: Client) => {
    setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
  };

  const deleteClient = (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
  };

  const addUser = (newUser: User) => {
    setUsers(prev => [...prev, newUser]);
  };

  const updateUser = (updatedUser: User) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
  };

  const deleteUser = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
  };

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
            <Route path="/login" element={!user ? <Login /> : <Navigate to={user.role === 'ADMIN' ? '/admin' : '/client'} />} />
            
            <Route path="/client/*" element={
              user && user.role === 'CLIENT' ? <ClientPortal /> : <Navigate to="/login" />
            } />
            
            <Route path="/admin/*" element={
              user && user.role === 'ADMIN' ? <AdminDashboard /> : <Navigate to="/login" />
            } />

            <Route path="/onboarding" element={
              user && user.role === 'ADMIN' ? <Onboarding /> : <Navigate to="/login" />
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