import React, { useState, useEffect } from 'react';
import { useAppContext } from '../App';
import { useNavigate } from 'react-router-dom';
import { BrandIdentity, Client, Service } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { LayoutDashboard, Users, Calendar, Settings, LogOut, Plus, Edit, Trash2, DollarSign, X, Clock, Tag, Image as ImageIcon, Search, ChevronLeft, ChevronRight, Bell, Mail, MessageSquare, Shield, Globe, Menu, Scissors, Sparkles, Smile, Zap, Heart, Share2, RotateCcw, ChevronDown, Lock, Camera, Store, User as UserIcon, Palette, Check, CreditCard, Receipt, BarChart3, Phone, Headphones, ExternalLink, List } from 'lucide-react';
import { MOCK_APPOINTMENTS } from '../constants';
import { createProfissionalApi, deleteProfissionalApi, updateProfissionalApi } from '../services/profissionaisApi';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const safeInitial = (value?: string | null) => (value && value.length > 0 ? value.charAt(0) : '?');
const safeDateBr = (value?: string | null) => (value ? value.split('-').reverse().join('/') : 'N/A');
const safeMoney = (value?: number | null) => Number(value || 0).toFixed(2);
const safeFirstName = (value?: string | null) => (value ? value.split(' ')[0] : 'Profissional');
const safeAvatarSrc = (value?: string | null) => {
  if (!value || typeof value !== 'string') return undefined;
  if (value.length > 300000) return undefined;
  if (value.startsWith('data:image/') || value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }
  return undefined;
};

const normalizeAppointmentStatus = (status?: string) => {
  if ((status || '').toUpperCase() === 'COMPLETED') return 'COMPLETED_OP';
  return (status || '').toUpperCase();
};

const getAppointmentStatusLabel = (status?: string) => {
  switch (normalizeAppointmentStatus(status)) {
    case 'PENDING_PAYMENT': return 'Aguardando';
    case 'CONFIRMED': return 'Confirmado';
    case 'IN_PROGRESS': return 'Em atendimento';
    case 'COMPLETED_OP': return 'Concluído (Op.)';
    case 'COMPLETED_FIN': return 'Concluído (Fin.)';
    case 'REOPENED': return 'Reaberto';
    case 'CANCELLED': return 'Cancelado';
    case 'BLOCKED': return 'Bloqueado';
    default: return status || 'N/A';
  }
};

const getAppointmentStatusChipClass = (status?: string) => {
  switch (normalizeAppointmentStatus(status)) {
    case 'CONFIRMED': return 'bg-green-100 text-green-700';
    case 'PENDING_PAYMENT': return 'bg-yellow-100 text-yellow-700';
    case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700';
    case 'COMPLETED_OP': return 'bg-violet-100 text-violet-700';
    case 'COMPLETED_FIN': return 'bg-emerald-100 text-emerald-700';
    case 'REOPENED': return 'bg-orange-100 text-orange-700';
    case 'CANCELLED': return 'bg-red-100 text-red-700';
    case 'BLOCKED': return 'bg-gray-200 text-gray-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const ServiceIcon = ({ name, className }: { name?: string, className?: string }) => {
  switch (name) {
    case 'Scissors': return <Scissors className={className} />;
    case 'User': return <Users className={className} />;
    case 'Sparkles': return <Sparkles className={className} />;
    case 'Smile': return <Smile className={className} />;
    case 'Zap': return <Zap className={className} />;
    case 'Heart': return <Heart className={className} />;
    default: return <Scissors className={className} />;
  }
};

const BrandIcon = ({ name, className }: { name?: string, className?: string }) => {
  switch ((name || '').toLowerCase()) {
    case 'store': return <Store className={className} />;
    case 'user': return <UserIcon className={className} />;
    case 'sparkles': return <Sparkles className={className} />;
    case 'heart': return <Heart className={className} />;
    case 'zap': return <Zap className={className} />;
    case 'scissors':
    default:
      return <Scissors className={className} />;
  }
};

const DashboardHome = ({ onViewAllRecent }: { onViewAllRecent: () => void }) => {
  const { appointments, services, professionals, clients } = useAppContext();
  const [recentSearchTerm, setRecentSearchTerm] = useState('');
  
  // Quick Stats Calculation
  const totalRevenue = appointments.reduce((acc, curr) => acc + curr.totalValue, 0);
  const totalBookings = appointments.length;
  const pending = appointments.filter(a => a.status === 'PENDING_PAYMENT').length;
  
  // Mock Data for Charts
  const dailyData = [
    { name: 'Seg', uv: 4000 },
    { name: 'Ter', uv: 3000 },
    { name: 'Qua', uv: 2000 },
    { name: 'Qui', uv: 2780 },
    { name: 'Sex', uv: 1890 },
    { name: 'Sab', uv: 2390 },
    { name: 'Dom', uv: 3490 },
  ];

  const serviceData = [
    { name: 'Cabelo', value: 400 },
    { name: 'Barba', value: 300 },
    { name: 'Combo', value: 300 },
    { name: 'Estética', value: 200 },
  ];

  const recentAppointments = appointments.filter(apt => {
    const service = services.find(s => s.id === apt.serviceId);
    const professional = professionals.find(p => p.id === apt.professionalId);
    const client = clients.find(c => c.id === apt.clientId);

    const haystack = [
      client?.name || '',
      service?.title || '',
      professional?.name || '',
      apt.status || '',
      apt.date || '',
      apt.time || '',
    ].join(' ').toLowerCase();

    return haystack.includes(recentSearchTerm.trim().toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
          <p className="text-sm text-gray-500">Faturamento Mensal</p>
          <h3 className="text-2xl font-bold text-gray-800">R$ {totalRevenue.toFixed(2)}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500">
          <p className="text-sm text-gray-500">Agendamentos</p>
          <h3 className="text-2xl font-bold text-gray-800">{totalBookings}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-yellow-500">
          <p className="text-sm text-gray-500">Pendentes</p>
          <h3 className="text-2xl font-bold text-gray-800">{pending}</h3>
        </div>
         <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-purple-500">
          <p className="text-sm text-gray-500">Ticket Médio</p>
          <h3 className="text-2xl font-bold text-gray-800">R$ {(totalRevenue/totalBookings || 0).toFixed(0)}</h3>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4">Agendamentos por Dia</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="uv" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4">Serviços Mais Procurados</h3>
           <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={serviceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {serviceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center">
            <h3 className="font-bold text-gray-800">Agendamentos Recentes</h3>
            <button onClick={onViewAllRecent} className="text-sm text-blue-600 hover:underline">Ver Todos</button>
        </div>
        <div className="px-6 py-3 border-b bg-gray-50/60">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Pesquisar agendamentos recentes..."
              value={recentSearchTerm}
              onChange={(e) => setRecentSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-medium">
              <tr>
                <th className="px-6 py-3">Cliente</th>
                <th className="px-6 py-3">Serviço</th>
                <th className="px-6 py-3">Profissional</th>
                <th className="px-6 py-3">Data/Hora</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recentAppointments.slice(0, 5).map(apt => {
                    const service = services.find(s => s.id === apt.serviceId);
                    const professional = professionals.find(p => p.id === apt.professionalId);
                  const client = clients.find(c => c.id === apt.clientId);
                    return (
                        <tr key={apt.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium">{client?.name || 'Cliente não encontrado'}</td>
                            <td className="px-6 py-3">{service?.title || 'Serviço não encontrado'}</td>
                            <td className="px-6 py-3">{professional?.name || 'Não atribuído'}</td>
                            <td className="px-6 py-3">{safeDateBr(apt.date)} - {apt.time || '--:--'}</td>
                            <td className="px-6 py-3">
                                 <span className={`text-xs px-2 py-1 rounded-full ${getAppointmentStatusChipClass(apt.status)}`}>
                                {getAppointmentStatusLabel(apt.status)}
                                 </span>
                            </td>
                        </tr>
                    );
                })}
                {recentAppointments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      Nenhum agendamento encontrado para o filtro informado.
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const ServicesManagement = () => {
  const { services, deleteService, addService, updateService, categories } = useAppContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [isDeletingService, setIsDeletingService] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        price: '',
        durationMinutes: '30',
        category: categories[0]?.name || 'Geral',
        iconName: 'Scissors'
    });

    useEffect(() => {
        if (!formData.category && categories.length > 0) {
            setFormData(prev => ({ ...prev, category: categories[0].name }));
        }
    }, [categories]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
      const servicePayload = {
        id: selectedServiceId || Date.now().toString(),
            title: formData.title,
            description: formData.description,
            price: parseFloat(formData.price),
            durationMinutes: parseInt(formData.durationMinutes),
            category: formData.category,
            iconName: formData.iconName
        };
      if (selectedServiceId) {
        updateService(servicePayload);
      } else {
        addService(servicePayload);
      }
        setIsModalOpen(false);
      setSelectedServiceId(null);
        setFormData({
            title: '',
            description: '',
            price: '',
            durationMinutes: '30',
            category: 'Cabelo',
            iconName: 'Scissors'
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-xl font-bold text-gray-800">Gerenciar Serviços</h2>
                <button 
                  onClick={() => {
                    setSelectedServiceId(null);
                    setIsModalOpen(true);
                  }}
                    className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"
                >
                    <Plus size={18} /> Novo Serviço
                </button>
            </div>
            
            {/* Create Service Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-900">{selectedServiceId ? 'Editar Serviço' : 'Criar Novo Serviço'}</h3>
                            <button onClick={() => {
                              setIsModalOpen(false);
                              setSelectedServiceId(null);
                            }} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Serviço</label>
                                <input 
                                    required
                                    type="text" 
                                    value={formData.title}
                                    onChange={e => setFormData({...formData, title: e.target.value})}
                                    placeholder="Ex: Corte Degradê"
                                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                                <textarea 
                                    required
                                    value={formData.description}
                                    onChange={e => setFormData({...formData, description: e.target.value})}
                                    placeholder="Breve descrição do serviço..."
                                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all h-20 resize-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$)</label>
                                    <input 
                                        required
                                        type="number" 
                                        step="0.01"
                                        value={formData.price}
                                        onChange={e => setFormData({...formData, price: e.target.value})}
                                        placeholder="0,00"
                                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Duração (min)</label>
                                    <select 
                                        value={formData.durationMinutes}
                                        onChange={e => setFormData({...formData, durationMinutes: e.target.value})}
                                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white"
                                    >
                                        <option value="15">15 min</option>
                                        <option value="30">30 min</option>
                                        <option value="45">45 min</option>
                                        <option value="60">60 min</option>
                                        <option value="90">90 min</option>
                                        <option value="120">120 min</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                                    <select 
                                        value={formData.category}
                                        onChange={e => setFormData({...formData, category: e.target.value})}
                                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white"
                                    >
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                                        ))}
                                        {categories.length === 0 && <option value="Geral">Geral</option>}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Ícone</label>
                                    <select 
                                        value={formData.iconName}
                                        onChange={e => setFormData({...formData, iconName: e.target.value})}
                                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white"
                                    >
                                        <option value="Scissors">Tesoura</option>
                                        <option value="User">Usuário</option>
                                        <option value="Sparkles">Brilho</option>
                                        <option value="Smile">Sorriso</option>
                                        <option value="Zap">Raio</option>
                                        <option value="Heart">Coração</option>
                                    </select>
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button 
                                    type="button"
                                  onClick={() => {
                                    setIsModalOpen(false);
                                    setSelectedServiceId(null);
                                  }}
                                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-md shadow-blue-200"
                                >
                                    {selectedServiceId ? 'Salvar Alterações' : 'Criar Serviço'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isDeleteModalOpen && serviceToDelete && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
                  <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-900">Confirmar exclusão</h3>
                    <button
                      onClick={() => {
                        setIsDeleteModalOpen(false);
                        setServiceToDelete(null);
                        setDeleteError(null);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-600">
                      Deseja realmente excluir o serviço <span className="font-semibold text-gray-900">{serviceToDelete.title || 'Sem nome'}</span>?
                    </p>
                    <p className="text-xs text-gray-500">
                      Se houver agendamentos vinculados, a API bloqueará a exclusão e exibirá a mensagem de erro.
                    </p>
                    {deleteError && (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {deleteError}
                      </div>
                    )}
                    <div className="pt-2 flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setIsDeleteModalOpen(false);
                          setServiceToDelete(null);
                          setDeleteError(null);
                        }}
                        className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!serviceToDelete || isDeletingService) return;
                          setIsDeletingService(true);
                          const result = await deleteService(serviceToDelete.id);
                          if (!result.success) {
                            setDeleteError(result.error || 'Falha ao excluir serviço.');
                            setIsDeletingService(false);
                            return;
                          }
                          setIsDeleteModalOpen(false);
                          setServiceToDelete(null);
                          setDeleteError(null);
                          setIsDeletingService(false);
                        }}
                        className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        disabled={isDeletingService}
                      >
                        {isDeletingService ? 'Excluindo...' : 'Excluir'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600 font-medium">
                    <tr>
                        <th className="px-6 py-3">Serviço</th>
                        <th className="px-6 py-3">Preço</th>
                        <th className="px-6 py-3">Duração</th>
                        <th className="px-6 py-3 text-right">Ações</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y">
                        {services.map(service => (
                            <tr key={service.id} className="hover:bg-gray-50">
                                <td className="px-6 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                            <ServiceIcon name={service.iconName} className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{service.title || 'Serviço sem nome'}</p>
                                            <p className="text-xs text-gray-500">{service.category || 'Sem categoria'}</p>
                                        </div>
                                    </div>
                                </td>
                                      <td className="px-6 py-3">R$ {Number(service.price || 0).toFixed(2)}</td>
                                      <td className="px-6 py-3">{Number(service.durationMinutes || 0)} min</td>
                                <td className="px-6 py-3 text-right space-x-3">
                                  <button
                                    onClick={() => {
                                      setSelectedServiceId(service.id);
                                      setFormData({
                                        title: service.title,
                                        description: service.description,
                                        price: service.price.toString(),
                                        durationMinutes: service.durationMinutes.toString(),
                                        category: service.category,
                                        iconName: service.iconName || 'Scissors',
                                      });
                                      setIsModalOpen(true);
                                    }}
                                    className="text-blue-600 hover:text-blue-800"
                                  ><Edit size={18} /></button>
                                    <button
                                      onClick={() => {
                                        setDeleteError(null);
                                        setServiceToDelete(service);
                                        setIsDeleteModalOpen(true);
                                      }}
                                      className="text-red-600 hover:text-red-800"
                                    ><Trash2 size={18} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const ClientsManagement = () => {
  const { clients, addClient, updateClient, deleteClient } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
    const [isDeletingClient, setIsDeletingClient] = useState(false);
    const [isBulkDeletingClients, setIsBulkDeletingClients] = useState(false);
    const [deleteClientError, setDeleteClientError] = useState<string | null>(null);
    const [bulkDeleteClientError, setBulkDeleteClientError] = useState<string | null>(null);
    const [modalMode, setModalMode] = useState<'ADD' | 'EDIT' | 'VIEW'>('ADD');
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
    const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        birthday: '',
        totalSpent: '0',
        haircutsCount: '0',
        lastVisit: ''
    });

    const filteredClients = clients.filter(c => 
      (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (c.phone || '').includes(searchTerm)
    );

    const selectedCount = selectedClientIds.length;
    const allFilteredSelected = filteredClients.length > 0 && filteredClients.every(client => selectedClientIds.includes(client.id));

    useEffect(() => {
      setSelectedClientIds(prev => prev.filter(id => clients.some(client => client.id === id)));
    }, [clients]);

    const toggleClientSelection = (id: string) => {
      setSelectedClientIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
    };

    const toggleSelectAllFiltered = () => {
      if (allFilteredSelected) {
        const filteredIds = new Set(filteredClients.map(client => client.id));
        setSelectedClientIds(prev => prev.filter(id => !filteredIds.has(id)));
        return;
      }

      setSelectedClientIds(prev => {
        const merged = new Set([...prev, ...filteredClients.map(client => client.id)]);
        return Array.from(merged);
      });
    };

    const openModal = (mode: 'ADD' | 'EDIT' | 'VIEW', client?: Client) => {
        setModalMode(mode);
        if (client) {
            setSelectedClient(client);
            setFormData({
                name: client.name,
                phone: client.phone,
                birthday: client.birthday || '',
                totalSpent: client.totalSpent.toString(),
                haircutsCount: client.haircutsCount.toString(),
                lastVisit: client.lastVisit || ''
            });
        } else {
            setSelectedClient(null);
            setFormData({
                name: '',
                phone: '',
                birthday: '',
                totalSpent: '0',
                haircutsCount: '0',
                lastVisit: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const clientData: Client = {
            id: selectedClient?.id || Date.now().toString(),
            name: formData.name,
            phone: formData.phone,
            birthday: formData.birthday,
            totalSpent: parseFloat(formData.totalSpent),
            haircutsCount: parseInt(formData.haircutsCount),
            lastVisit: formData.lastVisit || selectedClient?.lastVisit
        };

        if (modalMode === 'ADD') {
            addClient(clientData);
        } else {
            updateClient(clientData);
        }
        setIsModalOpen(false);
    };

    const handleDelete = (id: string) => {
      const targetClient = clients.find(c => c.id === id) || null;
      setDeleteClientError(null);
      setClientToDelete(targetClient);
      setIsDeleteModalOpen(true);
    };

    const confirmDeleteClient = async () => {
      if (!clientToDelete) return;
      if (isDeletingClient) return;
      setIsDeletingClient(true);
      const result = await deleteClient(clientToDelete.id);
      if (!result.success) {
        setDeleteClientError(result.error || 'Falha ao excluir cliente.');
        setIsDeletingClient(false);
        return;
      }
      setIsDeleteModalOpen(false);
      setClientToDelete(null);
      setDeleteClientError(null);
      setIsDeletingClient(false);
      setIsModalOpen(false);
      setSelectedClientIds(prev => prev.filter(id => id !== clientToDelete.id));
    };

    const confirmBulkDeleteClients = async () => {
      if (selectedClientIds.length === 0 || isBulkDeletingClients) return;
      setBulkDeleteClientError(null);
      setIsBulkDeletingClients(true);

      const failedClientIds: string[] = [];
      let successCount = 0;

      for (const clientId of selectedClientIds) {
        const result = await deleteClient(clientId);
        if (result.success) {
          successCount += 1;
        } else {
          failedClientIds.push(clientId);
        }
      }

      if (failedClientIds.length > 0) {
        setSelectedClientIds(failedClientIds);
        setBulkDeleteClientError(
          `${successCount} cliente(s) excluído(s). ${failedClientIds.length} não puderam ser excluídos por vínculo com agendamentos ou erro de API.`
        );
        setIsBulkDeletingClients(false);
        return;
      }

      setSelectedClientIds([]);
      setIsBulkDeleteModalOpen(false);
      setBulkDeleteClientError(null);
      setIsBulkDeletingClients(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <h2 className="text-xl font-bold text-gray-800">Gerenciar Clientes</h2>
                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                    <div className="relative flex-1 sm:flex-none">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Buscar cliente..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-64"
                        />
                    </div>
                    <button 
                        onClick={() => openModal('ADD')}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Plus size={18} /> Adicionar Cliente
                    </button>
                </div>
            </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-gray-100 rounded-xl p-3">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAllFiltered}
                      disabled={filteredClients.length === 0}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    Selecionar todos ({filteredClients.length})
                  </label>

                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">Selecionados: <span className="font-semibold text-gray-900">{selectedCount}</span></span>
                    <button
                      onClick={() => {
                        setBulkDeleteClientError(null);
                        setIsBulkDeleteModalOpen(true);
                      }}
                      disabled={selectedCount === 0}
                      className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Excluir selecionados
                    </button>
                  </div>
                </div>
            
                <div className="md:hidden space-y-3">
                  {filteredClients.map(client => (
                    <div key={client.id} className="bg-white rounded-xl border border-gray-100 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedClientIds.includes(client.id)}
                            onChange={() => toggleClientSelection(client.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="font-medium text-gray-900">{client.name}</span>
                        </label>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => openModal('EDIT', client)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(client.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-gray-500">Telefone</p>
                          <p className="text-gray-700">{client.phone}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Cortes</p>
                          <p className="text-gray-700 font-medium">{client.haircutsCount}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Total Gasto</p>
                          <p className="text-gray-900 font-semibold">R$ {safeMoney(client.totalSpent)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Última Visita</p>
                          <p className="text-gray-700">{safeDateBr(client.lastVisit)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredClients.length === 0 && (
                    <div className="bg-white rounded-xl border border-gray-100 p-6 text-center text-sm text-gray-500">
                      Nenhum cliente encontrado.
                    </div>
                  )}
                </div>

                <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                  <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left min-w-[860px]">
                    <thead className="bg-gray-50 text-gray-600 font-medium">
                    <tr>
                      <th className="px-6 py-3 w-14">
                        <input
                          type="checkbox"
                          checked={allFilteredSelected}
                          onChange={toggleSelectAllFiltered}
                          disabled={filteredClients.length === 0}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                        <th className="px-6 py-3">Cliente</th>
                        <th className="px-6 py-3">Telefone</th>
                        <th className="px-6 py-3">Cortes</th>
                        <th className="px-6 py-3">Total Gasto</th>
                        <th className="px-6 py-3">Última Visita</th>
                        <th className="px-6 py-3 text-right">Ações</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y">
                        {filteredClients.map(client => (
                            <tr key={client.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <input
                                type="checkbox"
                                checked={selectedClientIds.includes(client.id)}
                                onChange={() => toggleClientSelection(client.id)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                      {safeInitial(client.name)}
                                        </div>
                                        <div className="font-medium text-gray-900">{client.name}</div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-gray-600">{client.phone}</td>
                                <td className="px-6 py-4 text-gray-600 font-medium">{client.haircutsCount}</td>
                                <td className="px-6 py-4 font-semibold text-gray-900">R$ {safeMoney(client.totalSpent)}</td>
                                <td className="px-6 py-4 text-gray-600">{safeDateBr(client.lastVisit)}</td>
                                <td className="px-6 py-4 text-right space-x-3">
                                    <button 
                                    onClick={() => openModal('EDIT', client)}
                                    className="text-blue-600 hover:text-blue-800"
                                    >
                                    <Edit size={18} />
                                    </button>
                                    <button 
                                    onClick={() => handleDelete(client.id)}
                                    className="text-red-600 hover:text-red-800"
                                    >
                                    <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                    </div>
            </div>

            {/* Client Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-900">
                                {modalMode === 'ADD' ? 'Adicionar Novo Cliente' : 
                                 modalMode === 'EDIT' ? 'Editar Cliente' : 'Perfil do Cliente'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-6">
                            {modalMode === 'VIEW' ? (
                                <div className="space-y-6">
                                    <div className="flex flex-col items-center gap-3 pb-6 border-b">
                                        <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-3xl font-bold">
                                            {safeInitial(selectedClient?.name)}
                                        </div>
                                        <div className="text-center">
                                            <h4 className="text-xl font-bold text-gray-900">{selectedClient?.name}</h4>
                                            <p className="text-gray-500">{selectedClient?.phone}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 bg-gray-50 rounded-lg">
                                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Aniversário</p>
                                            <p className="font-medium">{selectedClient?.birthday ? safeDateBr(selectedClient.birthday) : 'Não informado'}</p>
                                        </div>
                                        <div className="p-3 bg-gray-50 rounded-lg">
                                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Última Visita</p>
                                            <p className="font-medium">{safeDateBr(selectedClient?.lastVisit)}</p>
                                        </div>
                                        <div className="p-3 bg-gray-50 rounded-lg">
                                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Total de Cortes</p>
                                            <p className="text-xl font-bold text-gray-900">{selectedClient?.haircutsCount}</p>
                                        </div>
                                        <div className="p-3 bg-gray-50 rounded-lg">
                                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Total Gasto</p>
                                            <p className="text-xl font-bold text-blue-600">R$ {safeMoney(selectedClient?.totalSpent)}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <button 
                                            onClick={() => setModalMode('EDIT')}
                                            className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                                        >
                                            Editar Perfil
                                        </button>
                                        <button 
                                          onClick={() => selectedClient && handleDelete(selectedClient.id)}
                                            className="flex-1 bg-red-50 text-red-600 py-2 rounded-lg font-medium hover:bg-red-100 transition-colors"
                                        >
                                            Excluir Cliente
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                                        <input 
                                            required
                                            type="text" 
                                            value={formData.name}
                                            onChange={e => setFormData({...formData, name: e.target.value})}
                                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Telefone / WhatsApp</label>
                                        <input 
                                            required
                                            type="text" 
                                            value={formData.phone}
                                            onChange={e => setFormData({...formData, phone: e.target.value})}
                                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Data de Nascimento</label>
                                            <input 
                                                type="date" 
                                                value={formData.birthday}
                                                onChange={e => setFormData({...formData, birthday: e.target.value})}
                                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Qtd. de Cortes</label>
                                            <input 
                                                type="number" 
                                                value={formData.haircutsCount}
                                                onChange={e => setFormData({...formData, haircutsCount: e.target.value})}
                                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Total Gasto (R$)</label>
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            value={formData.totalSpent}
                                            onChange={e => setFormData({...formData, totalSpent: e.target.value})}
                                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Última Visita</label>
                                        <input 
                                            type="date" 
                                            value={formData.lastVisit}
                                            onChange={e => setFormData({...formData, lastVisit: e.target.value})}
                                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                    
                                    <div className="pt-4 flex gap-3">
                                        <button 
                                            type="button"
                                            onClick={() => setIsModalOpen(false)}
                                            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                                        >
                                            Cancelar
                                        </button>
                                        <button 
                                            type="submit"
                                            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-md"
                                        >
                                            {modalMode === 'ADD' ? 'Adicionar Cliente' : 'Salvar Alterações'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}

              {isDeleteModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
                    <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold text-gray-900">Confirmar exclusão</h3>
                      <button
                        onClick={() => {
                          setIsDeleteModalOpen(false);
                          setClientToDelete(null);
                          setDeleteClientError(null);
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div className="p-6 space-y-4">
                      <p className="text-sm text-gray-700">
                        Tem certeza que deseja excluir o cliente
                        <span className="font-semibold text-gray-900"> {clientToDelete?.name || 'selecionado'}</span>?
                      </p>
                      <p className="text-xs text-gray-500">
                        Esta ação não pode ser desfeita.
                      </p>
                      {deleteClientError && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                          {deleteClientError}
                        </div>
                      )}

                      <div className="pt-2 flex gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setIsDeleteModalOpen(false);
                            setClientToDelete(null);
                            setDeleteClientError(null);
                          }}
                          className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={confirmDeleteClient}
                          className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          disabled={isDeletingClient}
                        >
                          {isDeletingClient ? 'Excluindo...' : 'Excluir'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {isBulkDeleteModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
                    <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold text-gray-900">Confirmar exclusão em lote</h3>
                      <button
                        onClick={() => {
                          setIsBulkDeleteModalOpen(false);
                          setBulkDeleteClientError(null);
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div className="p-6 space-y-4">
                      <p className="text-sm text-gray-700">
                        Deseja excluir os <span className="font-semibold text-gray-900">{selectedCount}</span> cliente(s) selecionado(s)?
                      </p>
                      <p className="text-xs text-gray-500">
                        Clientes com agendamentos vinculados não serão excluídos.
                      </p>
                      {bulkDeleteClientError && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                          {bulkDeleteClientError}
                        </div>
                      )}

                      <div className="pt-2 flex gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setIsBulkDeleteModalOpen(false);
                            setBulkDeleteClientError(null);
                          }}
                          className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={confirmBulkDeleteClients}
                          disabled={isBulkDeletingClients || selectedCount === 0}
                          className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {isBulkDeletingClients ? 'Excluindo...' : 'Excluir selecionados'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
        </div>
    );
};

const CalendarManagement = ({
  navigationRequest,
}: {
  navigationRequest?: { date: string; viewMode: 'DAY' | 'WEEK' | 'MONTH'; nonce: number } | null;
}) => {
  const { user, appointments, services, professionals, clients, addAppointment, updateAppointment, transitionAppointmentStatus, deleteAppointment, businessHours } = useAppContext();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedProfessionalId, setSelectedProfessionalId] = useState<string | 'ALL'>('ALL');
    const [viewMode, setViewMode] = useState<'DAY' | 'WEEK' | 'MONTH'>('DAY');
    const [isProfessionalDropdownOpen, setIsProfessionalDropdownOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [appointmentSubmitError, setAppointmentSubmitError] = useState<string | null>(null);
    const [isSavingAppointment, setIsSavingAppointment] = useState(false);
    const [isTransitioningStatus, setIsTransitioningStatus] = useState(false);
    const [isTransitionModalOpen, setIsTransitionModalOpen] = useState(false);
    const [pendingTransitionTarget, setPendingTransitionTarget] = useState<'COMPLETED_FIN' | 'REOPENED' | null>(null);
    const [transitionPaymentMethod, setTransitionPaymentMethod] = useState('PIX');
    const [transitionReason, setTransitionReason] = useState('');
    const [transitionTotalValue, setTransitionTotalValue] = useState('');
    const [clientSearchTerm, setClientSearchTerm] = useState('');
    const [isClientSearchOpen, setIsClientSearchOpen] = useState(false);
    const [selectedAptId, setSelectedAptId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        clientId: '',
        serviceId: '',
        professionalId: '',
        date: new Date().toISOString().split('T')[0],
        time: '09:00',
      endTime: '09:30',
        isBlocked: false,
        isAllDay: false,
        blockReason: ''
    });

    const selectedApt = appointments.find(a => a.id === selectedAptId);
    const isEmployeeUser = user?.role === 'EMPLOYEE';
    const employeeProfessionalId = user?.id || '';
    const canManageSelectedAppointment = !selectedApt || !isEmployeeUser || selectedApt.professionalId === employeeProfessionalId;

    const filteredClients = clients
      .filter(client => {
        const search = clientSearchTerm.trim().toLowerCase();
        if (!search) return true;
        return client.name.toLowerCase().includes(search) || client.phone.toLowerCase().includes(search);
      })
      .slice(0, 8);

    const toMinutes = (time: string): number => {
      const normalized = typeof time === 'string' && time.includes(':') ? time : '09:00';
      const [hours, minutes] = normalized.split(':').map(Number);
      return (hours * 60) + minutes;
    };

    const toHHMM = (minutes: number): string => {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    const getDayOfWeekFromDate = (dateStr: string): number => {
      const jsDay = new Date(`${dateStr}T12:00:00`).getDay();
      return jsDay === 0 ? 0 : jsDay;
    };

    const getBusinessHourForDate = (dateStr: string) => {
      const weekday = getDayOfWeekFromDate(dateStr);
      return businessHours.find(item => item.dayOfWeek === weekday);
    };

    const buildTimeSlots = (opening: string, closing: string) => {
      const start = toMinutes(opening);
      const end = toMinutes(closing);
      if (end <= start) return ['09:00'];
      const slots: string[] = [];
      let cursor = start;
      while (cursor <= end) {
        slots.push(toHHMM(cursor));
        cursor += 30;
      }
      return slots;
    };

    const selectedDateBusinessHour = getBusinessHourForDate(selectedDate);
    const isSelectedDateOpen = selectedDateBusinessHour ? selectedDateBusinessHour.open : true;
    const dayOpening = isSelectedDateOpen ? (selectedDateBusinessHour?.start || '09:00') : '00:00';
    const dayClosing = isSelectedDateOpen ? (selectedDateBusinessHour?.end || '19:00') : '00:00';
    const TIME_SLOTS = isSelectedDateOpen ? buildTimeSlots(dayOpening, dayClosing) : [];
    const dayStartMinutes = toMinutes(dayOpening);
    const dayEndMinutes = toMinutes(dayClosing);
    const defaultStartTime = TIME_SLOTS[0] || '09:00';
    const defaultEndTime = TIME_SLOTS[1] || toHHMM(toMinutes(defaultStartTime) + 30);

    const SLOT_HEIGHT = 80; // pixels per 30 mins

    const changeDate = (days: number) => {
        const date = new Date(selectedDate + 'T12:00:00');
        if (viewMode === 'WEEK') {
            date.setDate(date.getDate() + (days * 7));
        } else if (viewMode === 'MONTH') {
            date.setMonth(date.getMonth() + days);
        } else {
            date.setDate(date.getDate() + days);
        }
        setSelectedDate(date.toISOString().split('T')[0]);
    };

    const setToday = () => {
        setSelectedDate(new Date().toISOString().split('T')[0]);
    };

    useEffect(() => {
      if (!navigationRequest) return;
      setSelectedDate(navigationRequest.date);
      setViewMode(navigationRequest.viewMode);
      setIsModalOpen(false);
      setIsDetailsModalOpen(false);
      setSelectedAptId(null);
    }, [navigationRequest]);

    useEffect(() => {
      if (!isModalOpen || selectedAptId || !isEmployeeUser) return;
      setFormData(prev => ({
        ...prev,
        professionalId: prev.professionalId || employeeProfessionalId,
      }));
    }, [isModalOpen, selectedAptId, isEmployeeUser, employeeProfessionalId]);

    const formatDateLong = (dateStr: string) => {
        const date = new Date(dateStr + 'T12:00:00');
        if (viewMode === 'MONTH') {
            const month = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(date);
            const year = date.getFullYear();
            return `${month.charAt(0).toUpperCase() + month.slice(1)} / ${year}`;
        }
        if (viewMode === 'WEEK') {
            const weekDays = getWeekDays(dateStr);
            const start = new Date(weekDays[0] + 'T12:00:00');
            const end = new Date(weekDays[6] + 'T12:00:00');
            return `${start.getDate()} - ${end.getDate()} de ${new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(end).replace('.', '')}`;
        }
        const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date).replace('.', '');
        const day = date.getDate();
        const month = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(date);
        const year = date.getFullYear();
        
        const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
        const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
        
        return `${capitalizedWeekday}, ${day}/${capitalizedMonth}/${year}`;
    };

    const getWeekDays = (dateStr: string) => {
        const date = new Date(dateStr + 'T12:00:00');
        const day = date.getDay(); // 0 (Sun) to 6 (Sat)
        const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        const monday = new Date(date.setDate(diff));
        
        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            days.push(d.toISOString().split('T')[0]);
        }
        return days;
    };

    const getMonthDays = (dateStr: string) => {
        const date = new Date(dateStr + 'T12:00:00');
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        const days = [];
        const startPadding = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
        for (let i = startPadding; i > 0; i--) {
            const d = new Date(year, month, 1 - i);
            days.push(d.toISOString().split('T')[0]);
        }
        for (let i = 1; i <= lastDay.getDate(); i++) {
            const d = new Date(year, month, i);
            days.push(d.toISOString().split('T')[0]);
        }
        const endPadding = 42 - days.length;
        for (let i = 1; i <= endPadding; i++) {
            const d = new Date(year, month + 1, i);
            days.push(d.toISOString().split('T')[0]);
        }
        return days;
    };

    const getAppointmentStyle = (apt: any, duration: number) => {
        if (apt.isAllDay) {
            return { top: '0px', height: `${TIME_SLOTS.length * SLOT_HEIGHT}px`, zIndex: 20 };
        }
      const normalizedTime = typeof apt.time === 'string' && apt.time.includes(':') ? apt.time : '09:00';
      const startMinutes = toMinutes(normalizedTime) - dayStartMinutes;
        const top = (startMinutes * SLOT_HEIGHT) / 30;
      const endDuration = apt.endTime ? Math.max(toMinutes(apt.endTime) - toMinutes(normalizedTime), 15) : duration;
      const height = (endDuration * SLOT_HEIGHT) / 30;
        return { top: `${top}px`, height: `${height - 2}px` };
    };

    const getStatusColor = (status: string) => {
      switch (normalizeAppointmentStatus(status)) {
            case 'CONFIRMED': return 'bg-green-100 border-green-200 text-green-800';
            case 'PENDING_PAYMENT': return 'bg-yellow-100 border-yellow-200 text-yellow-800';
      case 'IN_PROGRESS': return 'bg-blue-100 border-blue-200 text-blue-800';
            case 'CANCELLED': return 'bg-red-100 border-red-200 text-red-800';
      case 'COMPLETED_OP': return 'bg-violet-100 border-violet-200 text-violet-800';
        case 'COMPLETED_FIN': return 'bg-emerald-100 border-emerald-200 text-emerald-800';
        case 'REOPENED': return 'bg-orange-100 border-orange-200 text-orange-800';
            case 'BLOCKED': return 'bg-gray-200 border-gray-300 text-gray-600 grayscale';
            default: return 'bg-gray-100 border-gray-200 text-gray-800';
        }
    };

    const getAppointmentRange = (apt: any): { start: number; end: number } => {
      if (apt.status === 'BLOCKED' && apt.isAllDay) {
        return { start: dayStartMinutes, end: dayEndMinutes };
      }
      const start = toMinutes(apt.time || '09:00');
      if (apt.endTime) {
        const end = toMinutes(apt.endTime);
        return { start, end: end > start ? end : start + 30 };
      }
      const aptService = services.find(s => s.id === apt.serviceId);
      const duration = apt.status === 'BLOCKED' ? 30 : (aptService?.durationMinutes || 30);
      return { start, end: start + Math.max(duration, 15) };
    };

    const hasLocalConflict = (candidate: {
      professionalId: string;
      date: string;
      start: number;
      end: number;
      idToIgnore?: string | null;
    }): boolean => {
      return appointments.some(apt => {
        if (apt.professionalId !== candidate.professionalId || apt.date !== candidate.date) return false;
        if (apt.status === 'CANCELLED') return false;
        if (candidate.idToIgnore && apt.id === candidate.idToIgnore) return false;
        const range = getAppointmentRange(apt);
        return candidate.start < range.end && range.start < candidate.end;
      });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
      if (isSavingAppointment) return;
      setAppointmentSubmitError(null);

      if (isEmployeeUser && formData.professionalId !== employeeProfessionalId) {
        setAppointmentSubmitError('Você só pode gerenciar seus próprios agendamentos.');
        return;
      }

      if (!isSelectedDateOpen) {
        setAppointmentSubmitError('A barbearia está fechada nesta data conforme o horário de funcionamento.');
        return;
      }

      if (TIME_SLOTS.length === 0) {
        setAppointmentSubmitError('Não há horários disponíveis para esta data.');
        return;
      }

      if (!formData.isBlocked && !formData.clientId) {
        setAppointmentSubmitError('Selecione um cliente válido para continuar.');
        return;
      }

        const service = services.find(s => s.id === formData.serviceId);
        const candidateStart = formData.isAllDay ? dayStartMinutes : toMinutes(formData.time);
      const candidateDuration = formData.isBlocked
          ? (formData.isAllDay ? (dayEndMinutes - dayStartMinutes) : (toMinutes(formData.endTime) - toMinutes(formData.time)))
        : (service?.durationMinutes || 30);
      const candidateEnd = candidateStart + Math.max(candidateDuration, 15);

        if (formData.isBlocked && !formData.isAllDay && toMinutes(formData.endTime) <= toMinutes(formData.time)) {
          setAppointmentSubmitError('No bloqueio, o horário de fim deve ser maior que o início.');
          return;
        }

      if (hasLocalConflict({
        professionalId: formData.professionalId,
        date: formData.date,
        start: candidateStart,
        end: candidateEnd,
        idToIgnore: selectedAptId,
      })) {
        setAppointmentSubmitError('Este profissional já possui agendamento neste horário. Escolha outro horário.');
        return;
      }

      setIsSavingAppointment(true);
      let result: { success: boolean; error?: string } = { success: true };
        
        if (selectedAptId) {
            // Editing existing
            const currentStatus = (selectedApt?.status || 'CONFIRMED') as any;
            const nextStatus = formData.isBlocked
              ? 'BLOCKED'
              : (currentStatus === 'BLOCKED' ? 'CONFIRMED' : currentStatus);

            const updatedApt = {
                ...selectedApt!,
                clientId: formData.isBlocked ? 'blocked' : formData.clientId,
                serviceId: formData.isBlocked ? 'blocked' : formData.serviceId,
                professionalId: formData.professionalId,
                date: formData.date,
                time: formData.isAllDay ? dayOpening : formData.time,
                endTime: formData.isAllDay ? dayClosing : formData.endTime,
                status: nextStatus,
                totalValue: formData.isBlocked ? 0 : (service?.price || 0),
                isAllDay: formData.isBlocked ? formData.isAllDay : false,
                blockReason: formData.isBlocked ? formData.blockReason : undefined
            };
              result = await updateAppointment(updatedApt);
        } else {
            // Creating new
            const newApt = {
                id: Date.now().toString(),
                clientId: formData.isBlocked ? 'blocked' : formData.clientId,
                serviceId: formData.isBlocked ? 'blocked' : formData.serviceId,
                professionalId: formData.professionalId,
                date: formData.date,
                time: formData.isAllDay ? dayOpening : formData.time,
                endTime: formData.isAllDay ? dayClosing : formData.endTime,
                status: (formData.isBlocked ? 'BLOCKED' : 'CONFIRMED') as any,
                totalValue: formData.isBlocked ? 0 : (service?.price || 0),
                isAllDay: formData.isBlocked ? formData.isAllDay : false,
                blockReason: formData.isBlocked ? formData.blockReason : undefined,
                createdAt: new Date().toISOString()
            };
              result = await addAppointment(newApt);
        }

            if (!result.success) {
              setAppointmentSubmitError(result.error || 'Não foi possível salvar o agendamento.');
              setIsSavingAppointment(false);
              return;
            }
        
        setIsModalOpen(false);
        setSelectedAptId(null);
            setAppointmentSubmitError(null);
            setIsSavingAppointment(false);
        setClientSearchTerm('');
        setIsClientSearchOpen(false);
        setFormData({
            clientId: '',
            serviceId: '',
            professionalId: '',
            date: selectedDate,
            time: defaultStartTime,
            endTime: defaultEndTime,
            isBlocked: false,
            isAllDay: false,
            blockReason: ''
        });
    };

    const handleDelete = () => {
      if (!canManageSelectedAppointment) {
        setAppointmentSubmitError('Você só pode excluir seus próprios agendamentos.');
        setIsDetailsModalOpen(false);
        return;
      }
        if (selectedAptId && window.confirm('Deseja realmente excluir este agendamento?')) {
            deleteAppointment(selectedAptId);
            setIsDetailsModalOpen(false);
            setSelectedAptId(null);
        }
    };

    const openEdit = () => {
        if (selectedApt) {
      if (isEmployeeUser && selectedApt.professionalId !== employeeProfessionalId) {
          setAppointmentSubmitError('Você só pode editar seus próprios agendamentos.');
          return;
      }
        const selectedClient = clients.find(c => c.id === selectedApt.clientId);
            setFormData({
                clientId: selectedApt.clientId === 'blocked' ? '' : selectedApt.clientId,
                serviceId: selectedApt.serviceId === 'blocked' ? '' : selectedApt.serviceId,
                professionalId: selectedApt.professionalId,
                date: selectedApt.date,
                time: selectedApt.time,
                endTime: selectedApt.endTime || '09:30',
                isBlocked: selectedApt.status === 'BLOCKED',
                isAllDay: selectedApt.isAllDay || false,
                blockReason: selectedApt.blockReason || ''
            });
              setClientSearchTerm(selectedClient?.name || '');
              setIsClientSearchOpen(false);
            setIsDetailsModalOpen(false);
            setIsModalOpen(true);
        }
    };

    const getStatusAction = (status?: string): { label: string; target: Appointment['status']; adminOnly?: boolean } | null => {
      switch (normalizeAppointmentStatus(status)) {
        case 'CONFIRMED':
        case 'REOPENED':
          return { label: 'Iniciar Atendimento', target: 'IN_PROGRESS' };
        case 'PENDING_PAYMENT':
          return { label: 'Confirmar Agendamento', target: 'CONFIRMED' };
        case 'IN_PROGRESS':
          return { label: 'Concluir Operacional', target: 'COMPLETED_OP' };
        case 'COMPLETED_OP':
          return { label: 'Concluir Financeiro', target: 'COMPLETED_FIN', adminOnly: true };
        case 'COMPLETED_FIN':
          return { label: 'Reabrir Atendimento', target: 'REOPENED', adminOnly: true };
        default:
          return null;
      }
    };

    const executeStatusTransition = async (
      target: Appointment['status'],
      options: { reason?: string; paymentMethod?: string; totalValue?: number } = {}
    ) => {
      if (!selectedApt || selectedApt.status === 'BLOCKED') return;

      setIsTransitioningStatus(true);
      setAppointmentSubmitError(null);
      const result = await transitionAppointmentStatus(selectedApt.id, target, options);
      setIsTransitioningStatus(false);

      if (!result.success) {
        setAppointmentSubmitError(result.error || 'Não foi possível alterar o status do agendamento.');
        return;
      }

      setIsTransitionModalOpen(false);
      setPendingTransitionTarget(null);
      setTransitionReason('');
      setTransitionTotalValue('');
      setTransitionPaymentMethod('PIX');
    };

    const openTransitionModal = (target: 'COMPLETED_FIN' | 'REOPENED') => {
      setAppointmentSubmitError(null);
      setPendingTransitionTarget(target);
      if (target === 'COMPLETED_FIN') {
        setTransitionPaymentMethod(selectedApt?.paymentMethod || 'PIX');
        setTransitionTotalValue(String(selectedApt?.totalValue ?? 0));
      }
      if (target === 'REOPENED') {
        setTransitionReason('');
      }
      setIsTransitionModalOpen(true);
    };

    const handleStatusTransition = async () => {
      if (!selectedApt || selectedApt.status === 'BLOCKED') return;
      if (!canManageSelectedAppointment) {
        setAppointmentSubmitError('Você só pode gerenciar seus próprios agendamentos.');
        return;
      }

      const action = getStatusAction(selectedApt.status);
      if (!action) return;
      if (action.adminOnly && user?.role !== 'ADMIN') {
        setAppointmentSubmitError('Somente administradores podem executar esta ação.');
        return;
      }

      const options: { reason?: string; paymentMethod?: string; totalValue?: number } = {};

      if (action.target === 'COMPLETED_FIN') {
        openTransitionModal('COMPLETED_FIN');
        return;
      }

      if (action.target === 'REOPENED') {
        openTransitionModal('REOPENED');
        return;
      }

      await executeStatusTransition(action.target, options);
    };

    const handleConfirmTransitionModal = async () => {
      if (!pendingTransitionTarget) return;

      if (pendingTransitionTarget === 'COMPLETED_FIN') {
        const paymentMethod = transitionPaymentMethod.trim();
        if (!paymentMethod) {
          setAppointmentSubmitError('Selecione a forma de pagamento.');
          return;
        }

        const parsedTotalValue = Number(transitionTotalValue);
        if (Number.isNaN(parsedTotalValue) || parsedTotalValue < 0) {
          setAppointmentSubmitError('Informe um valor válido para concluir o financeiro.');
          return;
        }

        await executeStatusTransition('COMPLETED_FIN', {
          paymentMethod,
          totalValue: parsedTotalValue,
        });
        return;
      }

      if (pendingTransitionTarget === 'REOPENED') {
        const reason = transitionReason.trim();
        if (!reason) {
          setAppointmentSubmitError('Informe o motivo da reabertura.');
          return;
        }

        await executeStatusTransition('REOPENED', {
          reason,
        });
      }
    };

    const filteredProfessionals = selectedProfessionalId === 'ALL' 
        ? professionals 
        : professionals.filter(p => p.id === selectedProfessionalId);

    const weekDays = getWeekDays(selectedDate);
    const monthDays = getMonthDays(selectedDate);

    return (
        <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-100">
            {/* Header */}
            <div className="px-3 md:px-6 py-3 md:py-4 border-b flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3 md:gap-4 bg-white relative z-30">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-6">
                    <div className="flex items-center justify-between w-full sm:w-auto">
                        <h2 className="text-lg md:text-xl font-bold text-gray-900">Atendimentos</h2>
                        <div className="flex lg:hidden items-center gap-2">
                            <button className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400"><Bell size={18} /></button>
                            <button 
                                onClick={() => {
                                    setSelectedAptId(null);
                                    setFormData({ 
                                        clientId: '',
                                        serviceId: '',
                                        professionalId: isEmployeeUser ? employeeProfessionalId : '',
                                        date: selectedDate,
                                        time: defaultStartTime,
                                      endTime: defaultEndTime,
                                        isBlocked: false,
                                      isAllDay: false,
                                        blockReason: ''
                                    });
                                    setClientSearchTerm('');
                                    setIsClientSearchOpen(false);
                                    setIsModalOpen(true);
                                }}
                                className="p-1.5 bg-blue-600 text-white rounded-full shadow-sm"
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 md:gap-4 text-sm font-medium text-gray-500 w-full sm:w-auto">
                        <div className="flex items-center gap-2 md:gap-4 overflow-x-auto no-scrollbar pb-1 sm:pb-0 flex-1 sm:flex-none">
                            <button onClick={setToday} className="hover:text-blue-600 uppercase tracking-wider whitespace-nowrap text-[10px] md:text-xs">Hoje</button>
                            <div className="flex items-center gap-0.5">
                                <button onClick={() => changeDate(-1)} className="p-1 hover:bg-gray-100 rounded text-gray-400"><ChevronLeft size={18} /></button>
                                <button onClick={() => changeDate(1)} className="p-1 hover:bg-gray-100 rounded text-gray-400"><ChevronRight size={18} /></button>
                            </div>
                            <span className="text-blue-600 font-bold whitespace-nowrap min-w-[120px] md:min-w-[180px] text-center sm:text-left text-xs md:text-sm">{formatDateLong(selectedDate)}</span>
                        </div>
                        
                        {viewMode !== 'MONTH' && (
                            <div className="relative flex-shrink-0">
                                <button 
                                    onClick={() => setIsProfessionalDropdownOpen(!isProfessionalDropdownOpen)}
                                    className="flex items-center gap-1 hover:text-gray-800 uppercase tracking-wider whitespace-nowrap text-[10px] md:text-xs bg-gray-50 px-2 py-1 rounded border border-gray-100"
                                >
                                    {selectedProfessionalId === 'ALL' ? 'Profissional' : safeFirstName(professionals.find(p => p.id === selectedProfessionalId)?.name)} <ChevronDown size={14} />
                                </button>
                                {isProfessionalDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setIsProfessionalDropdownOpen(false)}></div>
                                        <div className="absolute top-full right-0 sm:left-0 mt-1 bg-white border rounded-lg shadow-xl z-50 min-w-[160px] py-1 animate-in fade-in slide-in-from-top-2 duration-200">
                                            <button 
                                                onClick={() => {
                                                    setSelectedProfessionalId('ALL');
                                                    setIsProfessionalDropdownOpen(false);
                                                }}
                                                className={`w-full text-left px-4 py-2 hover:bg-gray-50 text-sm ${selectedProfessionalId === 'ALL' ? 'text-blue-600 font-bold bg-blue-50/30' : ''}`}
                                            >
                                                Todos os Profissionais
                                            </button>
                                            <div className="h-px bg-gray-100 my-1"></div>
                                            {professionals.map(p => (
                                                <button 
                                                    key={p.id}
                                                    onClick={() => {
                                                        setSelectedProfessionalId(p.id);
                                                        setIsProfessionalDropdownOpen(false);
                                                    }}
                                                    className={`w-full text-left px-4 py-2 hover:bg-gray-50 text-sm ${selectedProfessionalId === p.id ? 'text-blue-600 font-bold bg-blue-50/30' : ''}`}
                                                >
                                                    {p.name}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center justify-between lg:justify-end gap-4">
                    <div className="hidden lg:flex items-center gap-2 text-gray-400">
                        <button className="p-2 hover:bg-gray-100 rounded-full transition-colors"><Share2 size={20} /></button>
                        <button className="p-2 hover:bg-gray-100 rounded-full transition-colors"><Bell size={20} /></button>
                        <button className="p-2 hover:bg-gray-100 rounded-full transition-colors"><RotateCcw size={20} /></button>
                    </div>
                    <div className="hidden lg:block h-6 w-px bg-gray-200"></div>
                    
                    <div className="flex items-center gap-3">
                        <div className="bg-gray-100 rounded-lg p-1 flex">
                            <button 
                                onClick={() => setViewMode('DAY')}
                                className={`px-3 py-1.5 text-[10px] md:text-xs font-bold rounded shadow-sm transition-all ${viewMode === 'DAY' ? 'bg-white text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Dia
                            </button>
                            <button 
                                onClick={() => setViewMode('WEEK')}
                                className={`px-3 py-1.5 text-[10px] md:text-xs font-bold rounded shadow-sm transition-all ${viewMode === 'WEEK' ? 'bg-white text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Semana
                            </button>
                            <button 
                                onClick={() => setViewMode('MONTH')}
                                className={`px-3 py-1.5 text-[10px] md:text-xs font-bold rounded shadow-sm transition-all ${viewMode === 'MONTH' ? 'bg-white text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Mês
                            </button>
                        </div>
                        <button 
                            onClick={() => {
                                setSelectedAptId(null);
                                setFormData({ 
                                    clientId: '',
                                    serviceId: '',
                                    professionalId: isEmployeeUser ? employeeProfessionalId : '',
                                    date: selectedDate,
                                    time: defaultStartTime,
                                  endTime: defaultEndTime,
                                    isBlocked: false,
                                  isAllDay: false,
                                    blockReason: ''
                                });
                                setClientSearchTerm('');
                                setIsClientSearchOpen(false);
                                setIsModalOpen(true);
                            }}
                            className="hidden sm:flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-blue-700 transition-colors shadow-md uppercase tracking-wider whitespace-nowrap"
                        >
                            <Plus size={16} /> Adicionar
                        </button>
                    </div>
                </div>
            </div>

            {/* Grid Container */}
            <div className="flex-1 overflow-auto relative touch-pan-x touch-pan-y rounded-b-xl">
                {viewMode === 'DAY' && (
                    <div style={{ width: `${60 + (filteredProfessionals.length * 150)}px` }} className="min-w-full">
                        {/* Professionals Header */}
                        <div className="sticky top-0 z-20 bg-white border-b flex">
                            <div className="w-14 md:w-20 flex-shrink-0 border-r bg-gray-50"></div>
                            {filteredProfessionals.map(prof => (
                                <div key={prof.id} className="w-[150px] p-2 md:p-4 border-r flex items-center gap-2 md:gap-3 flex-shrink-0">
                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold overflow-hidden flex-shrink-0">
                                        {prof.avatar ? (
                                            <img src={prof.avatar} alt={prof.name} className="w-full h-full object-cover" />
                                        ) : (
                                          safeInitial(prof.name)
                                        )}
                                    </div>
                                      <span className="font-bold text-gray-800 text-xs md:text-base truncate">{safeFirstName(prof.name)}</span>
                                </div>
                            ))}
                        </div>

                        {/* Time Grid */}
                        <div className="relative flex">
                            <div className="w-14 md:w-20 flex-shrink-0 bg-gray-50 border-r">
                                {TIME_SLOTS.map(time => (
                                    <div key={time} className="h-[80px] border-b border-gray-100 flex items-start justify-center pt-2">
                                        <span className="text-[10px] md:text-[11px] font-bold text-gray-400">{time}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex-1 flex relative">
                                {filteredProfessionals.map(prof => (
                                    <div key={prof.id} className="w-[150px] flex-shrink-0 border-r relative bg-grid-pattern">
                                        {TIME_SLOTS.map(time => (
                                            <div key={time} className="h-[80px] border-b border-gray-100"></div>
                                        ))}

                                        {appointments
                                            .filter(apt => apt.date === selectedDate && apt.professionalId === prof.id)
                                            .map(apt => {
                                                const service = services.find(s => s.id === apt.serviceId);
                                                const client = clients.find(c => c.id === apt.clientId);
                                                const style = getAppointmentStyle(apt, service?.durationMinutes || 30);
                                                
                                                return (
                                                    <div 
                                                        key={apt.id}
                                                        style={style}
                                                        onClick={() => {
                                                            setSelectedAptId(apt.id);
                                                            setIsDetailsModalOpen(true);
                                                        }}
                                                        className={`absolute left-1 right-1 rounded-lg border-l-4 p-2 md:p-3 shadow-sm z-10 overflow-hidden transition-all hover:shadow-md cursor-pointer ${getStatusColor(apt.status)}`}
                                                    >
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className="text-[9px] md:text-[10px] font-bold opacity-70">{apt.isAllDay ? 'DIA TODO' : apt.time}</span>
                                                            {apt.status === 'CONFIRMED' && <MessageSquare size={10} className="opacity-50" />}
                                                            {apt.status === 'BLOCKED' && <Lock size={10} className="opacity-50" />}
                                                        </div>
                                                        <p className="text-[10px] md:text-xs font-bold truncate">
                                                            {apt.status === 'BLOCKED' ? (apt.isAllDay ? 'DIA DE FOLGA / BLOQUEADO' : 'HORÁRIO BLOQUEADO') : (client?.name || 'Cliente')}
                                                        </p>
                                                        <p className="text-[9px] md:text-[10px] opacity-80 truncate">
                                                            {apt.status === 'BLOCKED' ? 'Indisponível para clientes' : service?.title}
                                                        </p>
                                                    </div>
                                                );
                                            })
                                        }
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {viewMode === 'WEEK' && (
                    <div style={{ width: `${60 + (7 * 140)}px` }} className="min-w-full">
                        {/* Days Header */}
                        <div className="sticky top-0 z-20 bg-white border-b flex">
                            <div className="w-14 md:w-20 flex-shrink-0 border-r bg-gray-50"></div>
                            {weekDays.map(day => {
                                const d = new Date(day + 'T12:00:00');
                                const isToday = day === new Date().toISOString().split('T')[0];
                                return (
                          <div
                            key={day}
                            onClick={() => {
                            setSelectedDate(day);
                            setViewMode('DAY');
                            }}
                            className={`w-[140px] flex-shrink-0 p-2 md:p-4 border-r text-center cursor-pointer transition-colors hover:bg-gray-50 ${isToday ? 'bg-blue-50/30' : ''}`}
                          >
                                        <p className={`text-[10px] md:text-xs font-bold uppercase tracking-wider ${isToday ? 'text-blue-600' : 'text-gray-400'}`}>
                                            {new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(d).replace('.', '')}
                                        </p>
                                        <p className={`text-base md:text-xl font-bold ${isToday ? 'text-blue-600' : 'text-gray-800'}`}>{d.getDate()}</p>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Time Grid */}
                        <div className="relative flex">
                            <div className="w-14 md:w-20 flex-shrink-0 bg-gray-50 border-r">
                                {TIME_SLOTS.map(time => (
                                    <div key={time} className="h-[80px] border-b border-gray-100 flex items-start justify-center pt-2">
                                        <span className="text-[10px] md:text-[11px] font-bold text-gray-400">{time}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex-1 flex relative">
                                {weekDays.map(day => (
                                    <div key={day} className="w-[140px] flex-shrink-0 border-r relative bg-grid-pattern">
                                        {TIME_SLOTS.map(time => (
                                            <div key={time} className="h-[80px] border-b border-gray-100"></div>
                                        ))}

                                        {appointments
                                            .filter(apt => apt.date === day && (selectedProfessionalId === 'ALL' || apt.professionalId === selectedProfessionalId))
                                            .map(apt => {
                                                const service = services.find(s => s.id === apt.serviceId);
                                                const client = clients.find(c => c.id === apt.clientId);
                                                const style = getAppointmentStyle(apt, service?.durationMinutes || 30);
                                                
                                                return (
                                                    <div 
                                                        key={apt.id}
                                                        style={style}
                                                        onClick={() => {
                                                            setSelectedAptId(apt.id);
                                                            setIsDetailsModalOpen(true);
                                                        }}
                                                        className={`absolute left-1 right-1 rounded-lg border-l-4 p-1 md:p-2 shadow-sm z-10 overflow-hidden transition-all hover:shadow-md cursor-pointer ${getStatusColor(apt.status)}`}
                                                    >
                                                        <div className="flex justify-between items-start mb-0.5">
                                                            <span className="text-[8px] md:text-[9px] font-bold opacity-70">{apt.isAllDay ? 'DIA TODO' : apt.time}</span>
                                                            {apt.status === 'BLOCKED' && <Lock size={8} className="opacity-50" />}
                                                        </div>
                                                        <p className="text-[9px] md:text-[11px] font-bold truncate leading-tight">
                                                            {apt.status === 'BLOCKED' ? (apt.isAllDay ? 'Folga' : 'Bloqueado') : client?.name}
                                                        </p>
                                                        <p className="text-[8px] md:text-[9px] opacity-80 truncate">
                                                            {apt.status === 'BLOCKED' ? 'Indisponível' : service?.title}
                                                        </p>
                                                    </div>
                                                );
                                            })
                                        }
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {viewMode === 'MONTH' && (
                    <div className="h-full flex flex-col min-w-[600px] md:min-w-[800px]">
                        {/* Weekday Labels */}
                        <div className="grid grid-cols-7 bg-gray-50 border-b">
                            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(d => (
                                <div key={d} className="p-2 md:p-3 text-center text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest">{d}</div>
                            ))}
                        </div>
                        {/* Calendar Grid */}
                        <div className="flex-1 grid grid-cols-7 grid-rows-6">
                            {monthDays.map((day, idx) => {
                                const d = new Date(day + 'T12:00:00');
                                const isCurrentMonth = d.getMonth() === new Date(selectedDate + 'T12:00:00').getMonth();
                                const isToday = day === new Date().toISOString().split('T')[0];
                                const dayAppointments = appointments.filter(apt => apt.date === day);
                                
                                return (
                                    <div
                                      key={day}
                                      onClick={() => {
                                        setSelectedDate(day);
                                        setViewMode('DAY');
                                      }}
                                      className={`border-r border-b p-1 md:p-2 min-h-[80px] md:min-h-[100px] transition-colors hover:bg-gray-50/50 cursor-pointer ${!isCurrentMonth ? 'bg-gray-50/30' : ''} ${isToday ? 'bg-blue-50/10' : ''}`}
                                    >
                                        <div className="flex justify-between items-center mb-1 md:mb-2">
                                            <span className={`text-xs md:text-sm font-bold w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : isCurrentMonth ? 'text-gray-700' : 'text-gray-300'}`}>
                                                {d.getDate()}
                                            </span>
                                            {dayAppointments.length > 0 && (
                                                <span className="text-[8px] md:text-[10px] font-bold text-gray-400">{dayAppointments.length}</span>
                                            )}
                                        </div>
                                        <div className="space-y-0.5 md:space-y-1 overflow-y-auto max-h-[60px] md:max-h-[80px] custom-scrollbar">
                                            {dayAppointments.slice(0, 2).map(apt => {
                                                const service = services.find(s => s.id === apt.serviceId);
                                                return (
                                                    <div 
                                                        key={apt.id} 
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedAptId(apt.id);
                                                        setIsDetailsModalOpen(true);
                                                      }}
                                                        className={`text-[8px] md:text-[10px] px-1 py-0.5 rounded border-l-2 truncate cursor-pointer transition-colors hover:brightness-95 ${getStatusColor(apt.status)}`}
                                                    >
                                                        <span className="font-bold mr-0.5">{apt.time}</span>
                                                        {apt.status === 'BLOCKED' ? 'Bloqueado' : service?.title}
                                                    </div>
                                                );
                                            })}
                                            {dayAppointments.length > 2 && (
                                                <div className="text-[8px] text-center text-gray-400 font-bold py-0.5">+ {dayAppointments.length - 2}</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Add Appointment Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-900">
                                {selectedAptId ? (formData.isBlocked ? 'Editar Bloqueio' : 'Editar Agendamento') : (formData.isBlocked ? 'Bloquear Horário' : 'Novo Agendamento')}
                            </h3>
                            <button onClick={() => { setIsModalOpen(false); setSelectedAptId(null); setAppointmentSubmitError(null); }} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-6">
                            <form onSubmit={handleSubmit} className="space-y-4">
                              {appointmentSubmitError && (
                                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                  {appointmentSubmitError}
                                </div>
                              )}
                                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-100 mb-4">
                                    <div className="flex items-center gap-2">
                                        <Lock size={16} className="text-blue-600" />
                                        <span className="text-sm font-bold text-blue-900">Bloquear este horário?</span>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => setFormData({...formData, isBlocked: !formData.isBlocked, isAllDay: !formData.isBlocked ? formData.isAllDay : false, endTime: !formData.isBlocked && formData.isAllDay ? dayClosing : formData.endTime})}
                                        className={`w-10 h-5 rounded-full relative transition-colors ${formData.isBlocked ? 'bg-blue-600' : 'bg-gray-300'}`}
                                    >
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${formData.isBlocked ? 'right-1' : 'left-1'}`}></div>
                                    </button>
                                </div>

                                {formData.isBlocked && (
                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200 mb-4">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={16} className="text-gray-600" />
                                            <span className="text-sm font-bold text-gray-700">Bloquear o dia todo?</span>
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => setFormData({...formData, isAllDay: !formData.isAllDay, time: !formData.isAllDay ? dayOpening : formData.time, endTime: !formData.isAllDay ? dayClosing : formData.endTime})}
                                            className={`w-10 h-5 rounded-full relative transition-colors ${formData.isAllDay ? 'bg-gray-700' : 'bg-gray-300'}`}
                                        >
                                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${formData.isAllDay ? 'right-1' : 'left-1'}`}></div>
                                        </button>
                                    </div>
                                )}

                                {!formData.isBlocked ? (
                                    <>
                                        <div className="relative">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                                            <input
                                              type="text"
                                              required
                                              value={clientSearchTerm}
                                              onFocus={() => setIsClientSearchOpen(true)}
                                              onChange={(e) => {
                                                setClientSearchTerm(e.target.value);
                                                setFormData({ ...formData, clientId: '' });
                                                setIsClientSearchOpen(true);
                                              }}
                                              placeholder="Digite para buscar cliente..."
                                              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            />

                                            {isClientSearchOpen && (
                                              <div className="absolute left-0 right-0 mt-1 max-h-44 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg z-20">
                                                {filteredClients.length > 0 ? (
                                                  filteredClients.map(client => (
                                                    <button
                                                      key={client.id}
                                                      type="button"
                                                      onClick={() => {
                                                        setFormData({ ...formData, clientId: client.id });
                                                        setClientSearchTerm(client.name);
                                                        setIsClientSearchOpen(false);
                                                      }}
                                                      className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                                                    >
                                                      <p className="text-sm font-medium text-gray-900">{client.name}</p>
                                                      <p className="text-xs text-gray-500">{client.phone}</p>
                                                    </button>
                                                  ))
                                                ) : (
                                                  <div className="px-3 py-2 text-sm text-gray-500">Nenhum cliente encontrado.</div>
                                                )}
                                              </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Serviço</label>
                                            <select 
                                                required
                                                value={formData.serviceId}
                                                onChange={e => setFormData({...formData, serviceId: e.target.value})}
                                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            >
                                                <option value="">Selecionar Serviço</option>
                                                {services.map(s => (
                                                    <option key={s.id} value={s.id}>{s.title || 'Serviço'} - R$ {Number(s.price || 0).toFixed(2)}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </>
                                ) : (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Motivo do Bloqueio (Opcional)</label>
                                        <input 
                                            type="text"
                                            placeholder="Ex: Almoço, Intervalo, etc."
                                            value={formData.blockReason}
                                            onChange={e => setFormData({...formData, blockReason: e.target.value})}
                                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Profissional</label>
                                    <select 
                                        required
                                    disabled={isEmployeeUser}
                                        value={formData.professionalId}
                                        onChange={e => setFormData({...formData, professionalId: e.target.value})}
                                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="">Selecionar Profissional</option>
                                        {professionals.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                                        <input 
                                            required
                                            type="date" 
                                            value={formData.date}
                                            onChange={e => setFormData({...formData, date: e.target.value})}
                                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                        {!formData.isBlocked ? (
                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Horário</label>
                                            <select 
                                              required
                                              disabled={TIME_SLOTS.length === 0}
                                              value={formData.time}
                                              onChange={e => setFormData({...formData, time: e.target.value})}
                                              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            >
                                              {TIME_SLOTS.length === 0 && (
                                                <option value="">Fechado</option>
                                              )}
                                              {TIME_SLOTS.map(time => (
                                                <option key={time} value={time}>{time}</option>
                                              ))}
                                            </select>
                                          </div>
                                        ) : (
                                          <div className="grid grid-cols-2 gap-4 col-span-1 sm:col-span-1">
                                            <div>
                                              <label className="block text-sm font-medium text-gray-700 mb-1">Início</label>
                                              <select 
                                                required
                                                disabled={formData.isAllDay || TIME_SLOTS.length === 0}
                                                value={formData.time}
                                                onChange={e => setFormData({...formData, time: e.target.value})}
                                                className={`w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${formData.isAllDay ? 'bg-gray-50 text-gray-400' : ''}`}
                                              >
                                                {TIME_SLOTS.length === 0 && (
                                                  <option value="">Fechado</option>
                                                )}
                                                {TIME_SLOTS.map(time => (
                                                  <option key={time} value={time}>{time}</option>
                                                ))}
                                              </select>
                                            </div>
                                            <div>
                                              <label className="block text-sm font-medium text-gray-700 mb-1">Fim</label>
                                              <select 
                                                required
                                                disabled={formData.isAllDay || TIME_SLOTS.length === 0}
                                                value={formData.endTime}
                                                onChange={e => setFormData({...formData, endTime: e.target.value})}
                                                className={`w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${formData.isAllDay ? 'bg-gray-50 text-gray-400' : ''}`}
                                              >
                                                {TIME_SLOTS.length === 0 && (
                                                  <option value="">Fechado</option>
                                                )}
                                                {TIME_SLOTS.map(time => (
                                                  <option key={time} value={time}>{time}</option>
                                                ))}
                                              </select>
                                            </div>
                                          </div>
                                        )}
                                </div>
                                
                                <div className="pt-4 flex gap-3">
                                    <button 
                                        type="button"
                                      onClick={() => { setIsModalOpen(false); setSelectedAptId(null); setAppointmentSubmitError(null); setIsClientSearchOpen(false); }}
                                        className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        type="submit"
                                      disabled={isSavingAppointment}
                                      className={`flex-1 px-4 py-2.5 text-white rounded-lg font-medium transition-colors shadow-md disabled:opacity-60 disabled:cursor-not-allowed ${formData.isBlocked ? 'bg-gray-700 hover:bg-gray-800' : 'bg-blue-600 hover:bg-blue-700'}`}
                                    >
                                      {isSavingAppointment ? 'Salvando...' : (selectedAptId ? 'Salvar' : (formData.isBlocked ? 'Bloquear' : 'Agendar'))}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {isDetailsModalOpen && selectedApt && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-900">Detalhes do {selectedApt.status === 'BLOCKED' ? 'Bloqueio' : 'Agendamento'}</h3>
                            <button onClick={() => { setIsDetailsModalOpen(false); setSelectedAptId(null); }} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            <div className="flex items-center gap-4">
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${selectedApt.status === 'BLOCKED' ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-600'}`}>
                                    {selectedApt.status === 'BLOCKED' ? <Lock size={32} /> : (safeInitial(clients.find(c => c.id === selectedApt.clientId)?.name) || 'C')}
                                </div>
                                <div>
                                    <h4 className="text-xl font-bold text-gray-900">
                                        {selectedApt.status === 'BLOCKED' ? 'Horário Bloqueado' : (clients.find(c => c.id === selectedApt.clientId)?.name || 'Cliente')}
                                    </h4>
                                    <p className="text-gray-500">{selectedApt.status === 'BLOCKED' ? 'Indisponível para clientes' : (clients.find(c => c.id === selectedApt.clientId)?.phone || '')}</p>
                                    <div className="mt-2">
                                      <span className={`text-xs px-2 py-1 rounded-full ${getAppointmentStatusChipClass(selectedApt.status)}`}>
                                        {getAppointmentStatusLabel(selectedApt.status)}
                                      </span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Data e Hora</p>
                                    <p className="font-medium text-gray-900">
                                        {safeDateBr(selectedApt.date)} 
                                      {selectedApt.isAllDay ? ' (Dia Todo)' : ` às ${selectedApt.time}${selectedApt.endTime ? ` - ${selectedApt.endTime}` : ''}`}
                                    </p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Profissional</p>
                                    <p className="font-medium text-gray-900">{professionals.find(p => p.id === selectedApt.professionalId)?.name || 'Não atribuído'}</p>
                                </div>
                                {selectedApt.status !== 'BLOCKED' && (
                                    <>
                                        <div className="p-3 bg-gray-50 rounded-lg">
                                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Serviço</p>
                                            <p className="font-medium text-gray-900">{services.find(s => s.id === selectedApt.serviceId)?.title || 'N/A'}</p>
                                        </div>
                                        <div className="p-3 bg-gray-50 rounded-lg">
                                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Valor</p>
                                            <p className="font-bold text-blue-600">R$ {safeMoney(selectedApt.totalValue)}</p>
                                        </div>
                                    </>
                                )}
                                {selectedApt.status === 'BLOCKED' && selectedApt.blockReason && (
                                    <div className="col-span-2 p-3 bg-gray-50 rounded-lg">
                                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">Motivo</p>
                                        <p className="font-medium text-gray-900">{selectedApt.blockReason}</p>
                                    </div>
                                )}
                            </div>

                            {appointmentSubmitError && (
                              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                {appointmentSubmitError}
                              </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                {selectedApt.status !== 'BLOCKED' && (() => {
                                  const action = getStatusAction(selectedApt.status);
                                  if (!action) return null;
                                  const disabled = !canManageSelectedAppointment || isTransitioningStatus || (action.adminOnly && user?.role !== 'ADMIN');
                                  return (
                                    <button
                                      onClick={handleStatusTransition}
                                      disabled={disabled}
                                      className="flex-1 bg-emerald-600 text-white py-2.5 rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {isTransitioningStatus ? 'Atualizando...' : action.label}
                                    </button>
                                  );
                                })()}
                                <button 
                                    onClick={openEdit}
                                disabled={!canManageSelectedAppointment}
                                className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Edit size={18} /> Editar
                                </button>
                                <button 
                                    onClick={handleDelete}
                                disabled={!canManageSelectedAppointment}
                                className="flex-1 bg-red-50 text-red-600 py-2.5 rounded-lg font-medium hover:bg-red-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Trash2 size={18} /> Excluir
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isTransitionModalOpen && selectedApt && pendingTransitionTarget && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
                  <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-900">
                      {pendingTransitionTarget === 'COMPLETED_FIN' ? 'Concluir Financeiro' : 'Reabrir Atendimento'}
                    </h3>
                    <button
                      onClick={() => {
                        setIsTransitionModalOpen(false);
                        setPendingTransitionTarget(null);
                        setAppointmentSubmitError(null);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="p-6 space-y-4">
                    {pendingTransitionTarget === 'COMPLETED_FIN' ? (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Forma de pagamento</label>
                          <select
                            value={transitionPaymentMethod}
                            onChange={(e) => setTransitionPaymentMethod(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          >
                            <option value="PIX">PIX</option>
                            <option value="CREDIT_CARD">Cartão de Crédito</option>
                            <option value="DEBIT_CARD">Cartão de Débito</option>
                            <option value="CASH">Dinheiro</option>
                            <option value="TRANSFER">Transferência</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Valor final (R$)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={transitionTotalValue}
                            onChange={(e) => setTransitionTotalValue(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                      </>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Motivo da reabertura</label>
                        <textarea
                          value={transitionReason}
                          onChange={(e) => setTransitionReason(e.target.value)}
                          rows={4}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    )}

                    {appointmentSubmitError && (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {appointmentSubmitError}
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => {
                          setIsTransitionModalOpen(false);
                          setPendingTransitionTarget(null);
                          setAppointmentSubmitError(null);
                        }}
                        className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                      >
                        Voltar
                      </button>
                      <button
                        onClick={() => void handleConfirmTransitionModal()}
                        disabled={isTransitioningStatus}
                        className="flex-1 bg-emerald-600 text-white py-2.5 rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isTransitioningStatus ? 'Salvando...' : 'Confirmar'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <style>{`
                .bg-grid-pattern {
                    background-image: linear-gradient(to bottom, #f9fafb 1px, transparent 1px);
                    background-size: 100% 40px;
                }
                .animate-fade-in {
                    animation: fadeIn 0.2s ease-out;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e5e7eb;
                    border-radius: 10px;
                }
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
};

const UserModal = ({ isOpen, onClose, onSave, userToEdit, entityLabel = 'Usuário' }: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSave: (user: any) => Promise<{ success: boolean; error?: string }>;
  userToEdit?: any;
  entityLabel?: string;
}) => {
  const [formData, setFormData] = useState({
    name: userToEdit?.name || '',
    phone: userToEdit?.phone || '',
    email: userToEdit?.email || '',
    password: '',
    role: userToEdit?.role || 'EMPLOYEE',
    avatar: userToEdit?.avatar || ''
  });
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setFormData({
      name: userToEdit?.name || '',
      phone: userToEdit?.phone || '',
      email: userToEdit?.email || '',
      password: '',
      role: userToEdit?.role || 'EMPLOYEE',
      avatar: userToEdit?.avatar || ''
    });
    setSaveError(null);
    setIsSaving(false);
  }, [isOpen, userToEdit]);

  const handleSave = async () => {
    if (isSaving) return;
    setSaveError(null);

    if (!formData.name.trim() || !formData.phone.trim() || !formData.email.trim()) {
      setSaveError('Nome, telefone e email são obrigatórios.');
      return;
    }

    if (!userToEdit && !formData.password) {
      setSaveError(`Senha é obrigatória para novo ${entityLabel.toLowerCase()}.`);
      return;
    }

    setIsSaving(true);
    const result = await onSave({
      ...formData,
      email: formData.email.trim().toLowerCase(),
      password: formData.password || undefined,
    });

    if (!result.success) {
      setSaveError(result.error || `Falha ao salvar ${entityLabel.toLowerCase()}.`);
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const maxSizeInBytes = 1024 * 1024;
      if (file.size > maxSizeInBytes) {
        alert('A imagem é muito grande. Use um arquivo de até 1MB.');
        return;
      }

      if (!file.type.startsWith('image/')) {
        alert('Arquivo inválido. Selecione uma imagem.');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden animate-fade-in shadow-2xl">
        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
          <h3 className="text-xl font-bold text-gray-800">{userToEdit ? `Editar ${entityLabel}` : `Novo ${entityLabel}`}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="flex flex-col items-center gap-4 mb-4">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                {safeAvatarSrc(formData.avatar) ? (
                  <img src={safeAvatarSrc(formData.avatar)} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <ImageIcon size={32} className="text-gray-400" />
                )}
              </div>
              <label className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full cursor-pointer shadow-lg hover:bg-blue-700 transition-colors">
                <Plus size={16} />
                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
              </label>
            </div>
            <p className="text-xs text-gray-500">Clique no ícone para carregar uma foto</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Nome Completo</label>
            <input 
              type="text" 
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="Ex: João Silva"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Telefone / WhatsApp</label>
            <input 
              type="text" 
              value={formData.phone}
              onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="(00) 00000-0000"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
            <input 
              type="email" 
              value={formData.email}
              onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="usuario@empresa.com"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Senha {userToEdit ? '(opcional para alterar)' : ''}</label>
            <input 
              type="password" 
              value={formData.password}
              onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder={userToEdit ? '•••••••• (deixe em branco para manter)' : '••••••••'}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Nível de Acesso</label>
            <select 
              value={formData.role}
              onChange={e => setFormData(prev => ({ ...prev, role: e.target.value as any }))}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            >
              <option value="ADMIN">Administrador</option>
              <option value="EMPLOYEE">Funcionário / Equipe</option>
            </select>
          </div>

          {saveError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {saveError}
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-white transition-all"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Salvando...' : `Salvar ${entityLabel}`}
          </button>
        </div>
      </div>
    </div>
  );
};

const ProfessionalModal = ({ isOpen, onClose, onSave, professionalToEdit }: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: any) => Promise<{ success: boolean; error?: string }>;
  professionalToEdit?: any;
}) => {
  const linkedUser = professionalToEdit?.linkedUser;
  const [formData, setFormData] = useState({
    name: professionalToEdit?.name || '',
    phone: professionalToEdit?.linkedPhone || professionalToEdit?.phone || '',
    cargo: professionalToEdit?.role || 'Profissional',
    avatar: professionalToEdit?.avatar || '',
    hasAccess: Boolean(linkedUser),
    email: professionalToEdit?.linkedEmail || '',
    password: '',
    accessRole: professionalToEdit?.linkedAccessRole || 'EMPLOYEE',
  });
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const existingLinkedUser = professionalToEdit?.linkedUser;
    setFormData({
      name: professionalToEdit?.name || '',
      phone: professionalToEdit?.linkedPhone || professionalToEdit?.phone || '',
      cargo: professionalToEdit?.role || 'Profissional',
      avatar: professionalToEdit?.avatar || '',
      hasAccess: Boolean(existingLinkedUser),
      email: professionalToEdit?.linkedEmail || '',
      password: '',
      accessRole: professionalToEdit?.linkedAccessRole || 'EMPLOYEE',
    });
    setSaveError(null);
    setIsSaving(false);
  }, [isOpen, professionalToEdit]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const maxSizeInBytes = 1024 * 1024;
      if (file.size > maxSizeInBytes) {
        alert('A imagem é muito grande. Use um arquivo de até 1MB.');
        return;
      }

      if (!file.type.startsWith('image/')) {
        alert('Arquivo inválido. Selecione uma imagem.');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    setSaveError(null);

    if (!formData.name.trim()) {
      setSaveError('Nome é obrigatório.');
      return;
    }

    if (formData.hasAccess && !formData.email.trim()) {
      setSaveError('Email é obrigatório para criar acesso ao sistema.');
      return;
    }

    if (formData.hasAccess && !professionalToEdit?.linkedUser && !formData.password) {
      setSaveError('Defina uma senha para criar o acesso ao sistema.');
      return;
    }

    setIsSaving(true);
    const result = await onSave({
      ...formData,
      email: formData.email.trim().toLowerCase(),
      password: formData.password || undefined,
    });

    if (!result.success) {
      setSaveError(result.error || 'Falha ao salvar profissional.');
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden animate-fade-in shadow-2xl">
        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
          <h3 className="text-xl font-bold text-gray-800">{professionalToEdit ? 'Editar Profissional' : 'Novo Profissional'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex flex-col items-center gap-4 mb-4">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                {safeAvatarSrc(formData.avatar) ? (
                  <img src={safeAvatarSrc(formData.avatar)} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <ImageIcon size={32} className="text-gray-400" />
                )}
              </div>
              <label className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full cursor-pointer shadow-lg hover:bg-blue-700 transition-colors">
                <Plus size={16} />
                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
              </label>
            </div>
            <p className="text-xs text-gray-500">Clique no ícone para carregar uma foto</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Nome Completo</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="Ex: João Silva"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Telefone / WhatsApp</label>
            <input
              type="text"
              value={formData.phone}
              onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="(00) 00000-0000"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Cargo</label>
            <input
              type="text"
              value={formData.cargo}
              onChange={e => setFormData(prev => ({ ...prev, cargo: e.target.value }))}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="Ex: Barbeiro"
            />
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-blue-900">Permitir acesso ao sistema</p>
                <p className="text-xs text-blue-700">Quando ativo, o profissional poderá fazer login na aba Administrador/Equipe.</p>
              </div>
              <button
                type="button"
                disabled={Boolean(linkedUser)}
                onClick={() => setFormData(prev => ({ ...prev, hasAccess: !prev.hasAccess }))}
                className={`w-11 h-6 rounded-full relative transition-colors ${formData.hasAccess ? 'bg-blue-600' : 'bg-gray-300'} ${linkedUser ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.hasAccess ? 'right-1' : 'left-1'}`} />
              </button>
            </div>
            {linkedUser && (
              <p className="text-[11px] text-blue-700 mt-2">Acesso já vinculado. Para remover acesso, use a gestão de usuários.</p>
            )}
          </div>

          {formData.hasAccess && (
            <>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Email de acesso</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="usuario@empresa.com"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Senha {linkedUser ? '(opcional para alterar)' : ''}</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder={linkedUser ? '•••••••• (deixe em branco para manter)' : '••••••••'}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Nível de acesso</label>
                <select
                  value={formData.accessRole}
                  onChange={e => setFormData(prev => ({ ...prev, accessRole: e.target.value as any }))}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                >
                  <option value="EMPLOYEE">Funcionário / Equipe</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
            </>
          )}

          {saveError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {saveError}
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-white transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Salvando...' : 'Salvar Profissional'}
          </button>
        </div>
      </div>
    </div>
  );
};

const WhatsAppIntegration = () => {
  const [status, setStatus] = useState<'DISCONNECTED' | 'LOADING' | 'QR_CODE' | 'CONNECTED'>('DISCONNECTED');
  const [qrCode, setQrCode] = useState<string | null>(null);

  const generateQR = () => {
    setStatus('LOADING');
    setTimeout(() => {
      setQrCode('https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=AgendeFacilWhatsAppIntegration');
      setStatus('QR_CODE');
    }, 1500);
  };

  const connect = () => {
    setStatus('CONNECTED');
  };

  const disconnect = () => {
    if (confirm('Tem certeza que deseja desconectar sua conta do WhatsApp?')) {
      setStatus('DISCONNECTED');
      setQrCode(null);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 flex items-start justify-between border-b border-gray-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-gray-800">WhatsApp</h3>
              <div className="mt-1">
                {status === 'CONNECTED' ? (
                  <span className="inline-flex items-center gap-1.5 py-0.5 px-2 rounded-full text-[10px] font-bold bg-green-100 text-green-700 uppercase tracking-wider border border-green-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 py-0.5 px-2 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500 uppercase tracking-wider border border-gray-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                    Disconnected
                  </span>
                )}
              </div>
            </div>
          </div>
          {status === 'CONNECTED' && (
            <button 
              onClick={disconnect}
              className="text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
            >
              Disconnect
            </button>
          )}
        </div>

        <div className="p-8 flex flex-col items-center text-center">
          {status === 'DISCONNECTED' && (
            <div className="space-y-6 max-w-sm">
              <p className="text-gray-600">
                Connect your WhatsApp account to send and receive messages from the platform.
              </p>
              <button 
                onClick={generateQR}
                className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-100 transition-all flex items-center justify-center gap-2"
              >
                Generate QR Code
              </button>
            </div>
          )}

          {status === 'LOADING' && (
            <div className="py-12 flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-green-100 border-t-green-600 rounded-full animate-spin"></div>
              <p className="text-gray-500 font-medium">Generating secure QR Code...</p>
            </div>
          )}

          {status === 'QR_CODE' && (
            <div className="space-y-6">
              <div className="p-4 bg-white border-2 border-dashed border-gray-200 rounded-2xl inline-block">
                <img 
                  src={qrCode!} 
                  alt="WhatsApp QR Code" 
                  className="w-48 h-48 cursor-pointer"
                  onClick={connect}
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="space-y-2">
                <p className="font-bold text-gray-800">Scan the QR Code using WhatsApp on your phone</p>
                <p className="text-sm text-gray-500">Open WhatsApp {'>'} Settings {'>'} Linked Devices</p>
              </div>
              <button 
                onClick={generateQR}
                className="text-green-600 font-bold text-sm hover:underline"
              >
                Regenerate QR Code
              </button>
            </div>
          )}

          {status === 'CONNECTED' && (
            <div className="space-y-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mx-auto">
                <Smile size={40} />
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-gray-900">+55 11 99999-9999</p>
                <p className="text-gray-500">Account connected and active</p>
              </div>
              <div className="flex items-center gap-2 justify-center bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm font-medium">
                <Zap size={16} />
                Ready to send notifications
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100 flex gap-3">
        <div className="text-blue-600 mt-0.5">
          <Shield size={20} />
        </div>
        <div className="text-sm text-blue-800">
          <p className="font-bold mb-1">Security Information</p>
          <p>Your connection is encrypted. We do not store your messages, only use the connection to send automated appointment reminders.</p>
        </div>
      </div>
    </div>
  );
};

const EmailIntegration = () => {
  const [mode, setMode] = useState<'SMTP' | 'API'>('SMTP');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'SUCCESS' | 'ERROR' | null>(null);

  const handleTest = () => {
    setIsTesting(true);
    setTestResult(null);
    setTimeout(() => {
      setIsTesting(false);
      setTestResult('SUCCESS');
    }, 2000);
  };

  return (
    <div className="max-w-2xl mt-8">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 flex items-start justify-between border-b border-gray-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <Mail size={24} />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">E-mail</h3>
              <p className="text-xs text-gray-500 mt-1">Configure SMTP or API keys for notifications</p>
            </div>
          </div>
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button 
              onClick={() => setMode('SMTP')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'SMTP' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              SMTP
            </button>
            <button 
              onClick={() => setMode('API')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'API' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              API Key
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {mode === 'SMTP' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Host SMTP</label>
                <input type="text" placeholder="smtp.example.com" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Porta</label>
                <input type="text" placeholder="587" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Segurança</label>
                <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm">
                  <option>TLS</option>
                  <option>SSL</option>
                  <option>Nenhum</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Usuário</label>
                <input type="text" placeholder="user@example.com" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Senha</label>
                <input type="password" placeholder="••••••••" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm" />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Provedor de Serviço</label>
                <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm">
                  <option>SendGrid</option>
                  <option>Mailgun</option>
                  <option>Postmark</option>
                  <option>Amazon SES</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Chave de API (API Key)</label>
                <input type="password" placeholder="SG.xxxxxxxxxxxxxxxxxxxx" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm" />
              </div>
            </div>
          )}

          <div className="pt-4 flex flex-col md:flex-row gap-3">
            <button 
              onClick={handleTest}
              disabled={isTesting}
              className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-all flex items-center justify-center gap-2 text-sm"
            >
              {isTesting ? (
                <><RotateCcw size={16} className="animate-spin" /> Testando...</>
              ) : (
                <><Zap size={16} /> Testar Conexão</>
              )}
            </button>
            <button className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all text-sm">
              Salvar Configuração
            </button>
          </div>

          {testResult === 'SUCCESS' && (
            <div className="p-3 bg-green-50 text-green-700 rounded-xl text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
              <Smile size={14} /> Conexão estabelecida com sucesso! E-mail de teste enviado.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SettingsManagement = () => {
  const navigate = useNavigate();
  const { users, professionals, addUser, updateUser, deleteUser, categories, addCategory, updateCategory, deleteCategory, businessHours, saveBusinessHours, brandIdentity, saveBrandIdentity } = useAppContext();
  const [activeSubTab, setActiveSubTab] = useState<'PROFESSIONALS' | 'ALERTS' | 'PROFILES' | 'HOURS' | 'INTEGRATIONS' | 'OTHER' | 'BILLING' | 'CONTACT' | 'CATEGORIES'>('PROFESSIONALS');

  const [isProfessionalModalOpen, setIsProfessionalModalOpen] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<any>(null);
  const [isDeleteProfessionalModalOpen, setIsDeleteProfessionalModalOpen] = useState(false);
  const [professionalToDelete, setProfessionalToDelete] = useState<any>(null);
  const [deleteProfessionalError, setDeleteProfessionalError] = useState<string | null>(null);
  const [isDeletingProfessional, setIsDeletingProfessional] = useState(false);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [isDeleteCategoryModalOpen, setIsDeleteCategoryModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<any>(null);
  const [deleteCategoryError, setDeleteCategoryError] = useState<string | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);

  const [localBusinessHours, setLocalBusinessHours] = useState(businessHours);
  const [hoursSaveError, setHoursSaveError] = useState<string | null>(null);
  const [hoursSaveSuccess, setHoursSaveSuccess] = useState<string | null>(null);
  const [isSavingHours, setIsSavingHours] = useState(false);
  const [identityForm, setIdentityForm] = useState<BrandIdentity>(brandIdentity);
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [identitySuccess, setIdentitySuccess] = useState<string | null>(null);
  const [isSavingIdentity, setIsSavingIdentity] = useState(false);

  const identityPalettes = [
    { name: 'Modern Blue', primary: '#2563eb', secondary: '#eff6ff', label: 'Confiança' },
    { name: 'Luxury Gold', primary: '#854d0e', secondary: '#fefce8', label: 'Premium' },
    { name: 'Classic Black', primary: '#171717', secondary: '#f5f5f5', label: 'Elegante' },
    { name: 'Vibrant Emerald', primary: '#059669', secondary: '#ecfdf5', label: 'Fresco' },
    { name: 'Royal Purple', primary: '#7c3aed', secondary: '#f5f3ff', label: 'Criativo' },
    { name: 'Warm Terracotta', primary: '#c2410c', secondary: '#fff7ed', label: 'Acolhedor' },
  ];

  useEffect(() => {
    setLocalBusinessHours(businessHours);
  }, [businessHours]);

  useEffect(() => {
    setIdentityForm(brandIdentity);
  }, [brandIdentity]);

  const toggleDay = (id: number) => {
    setLocalBusinessHours(prev => prev.map(h => h.dayOfWeek === id ? { ...h, open: !h.open } : h));
    setHoursSaveError(null);
    setHoursSaveSuccess(null);
  };

  const updateTime = (id: number, field: 'start' | 'end', value: string) => {
    setLocalBusinessHours(prev => prev.map(h => h.dayOfWeek === id ? { ...h, [field]: value } : h));
    setHoursSaveError(null);
    setHoursSaveSuccess(null);
  };

  const handleSaveBusinessHours = async () => {
    if (isSavingHours) return;
    setIsSavingHours(true);
    setHoursSaveError(null);
    setHoursSaveSuccess(null);

    const invalid = localBusinessHours.find(item => item.open && item.end <= item.start);
    if (invalid) {
      setHoursSaveError(`No dia ${invalid.day}, o horário de fim deve ser maior que o de início.`);
      setIsSavingHours(false);
      return;
    }

    const result = await saveBusinessHours(localBusinessHours);
    if (!result.success) {
      setHoursSaveError(result.error || 'Falha ao salvar horários.');
      setIsSavingHours(false);
      return;
    }

    setHoursSaveSuccess('Horários salvos com sucesso.');
    setIsSavingHours(false);
  };

  const handleSaveIdentity = async () => {
    if (isSavingIdentity) return;
    setIdentityError(null);
    setIdentitySuccess(null);

    const name = (identityForm.name || '').trim();
    if (!name) {
      setIdentityError('Informe o nome da empresa.');
      return;
    }

    setIsSavingIdentity(true);
    const result = await saveBrandIdentity({
      name,
      logoUrl: identityForm.logoUrl?.trim() || undefined,
      iconName: identityForm.iconName || 'scissors',
      primaryColor: identityForm.primaryColor || '#2563eb',
      secondaryColor: identityForm.secondaryColor || '#eff6ff',
    });

    if (!result.success) {
      setIdentityError(result.error || 'Falha ao salvar identidade visual.');
      setIsSavingIdentity(false);
      return;
    }

    setIdentitySuccess('Identidade visual atualizada com sucesso.');
    setIsSavingIdentity(false);
  };

  const handleSaveProfessional = async (data: any): Promise<{ success: boolean; error?: string }> => {
    const nome = (data.name || '').trim();
    const telefone = (data.phone || '').trim();
    const cargo = (data.cargo || '').trim() || 'Profissional';
    const fotoUrl = safeAvatarSrc(data.avatar) || null;

    if (!nome) {
      return { success: false, error: 'Nome é obrigatório.' };
    }

    const linkedUser = selectedProfessional?.linkedUser || null;

    if (selectedProfessional) {
      const profissionalResult = await updateProfissionalApi(selectedProfessional.id, {
        nome,
        cargo,
        telefone,
        foto_url: fotoUrl,
        ativo: true,
      });

      if (!profissionalResult.success) {
        return { success: false, error: ('error' in profissionalResult && profissionalResult.error) ? profissionalResult.error : 'Falha ao atualizar profissional.' };
      }
    } else if (!data.hasAccess) {
      const profissionalResult = await createProfissionalApi({
        nome,
        cargo,
        telefone,
        foto_url: fotoUrl,
        ativo: true,
      });

      if (!profissionalResult.success) {
        return { success: false, error: ('error' in profissionalResult && profissionalResult.error) ? profissionalResult.error : 'Falha ao criar profissional.' };
      }
    }

    if (data.hasAccess) {
      const accessPayload = {
        name: nome,
        phone: telefone,
        email: (data.email || '').trim().toLowerCase(),
        password: data.password,
        role: data.accessRole === 'ADMIN' ? 'ADMIN' : 'EMPLOYEE',
        avatar: data.avatar,
      };

      if (selectedProfessional && linkedUser) {
        const result = await updateUser({ ...linkedUser, ...accessPayload });
        if (!result.success) {
          return result;
        }
      } else if (selectedProfessional && !linkedUser) {
        if (!accessPayload.password) {
          return { success: false, error: 'Defina uma senha para criar o acesso do profissional.' };
        }
        const result = await addUser({
          ...accessPayload,
          id: selectedProfessional.id,
        });
        if (!result.success) {
          return result;
        }
      } else {
        if (!accessPayload.password) {
          return { success: false, error: 'Defina uma senha para criar o acesso do profissional.' };
        }
        const result = await addUser(accessPayload);
        if (!result.success) {
          return result;
        }
      }
    }

    setIsProfessionalModalOpen(false);
    setSelectedProfessional(null);
    return { success: true };
  };

  const openNewProfessional = () => {
    setSelectedProfessional(null);
    setIsProfessionalModalOpen(true);
  };

  const openEditProfessional = (professional: any) => {
    setSelectedProfessional(professional);
    setIsProfessionalModalOpen(true);
  };

  const openDeleteProfessional = (professional: any) => {
    setDeleteProfessionalError(null);
    setProfessionalToDelete(professional);
    setIsDeleteProfessionalModalOpen(true);
  };

  const confirmDeleteProfessional = async () => {
    if (!professionalToDelete || isDeletingProfessional) return;
    setIsDeletingProfessional(true);

    const linkedUser = users.find(user => user.id === professionalToDelete.id);

    const result = linkedUser
      ? await deleteUser(professionalToDelete.id)
      : await deleteProfissionalApi(professionalToDelete.id);
    if (!result.success) {
      setDeleteProfessionalError(result.error || 'Falha ao excluir profissional.');
      setIsDeletingProfessional(false);
      return;
    }

    setIsDeleteProfessionalModalOpen(false);
    setProfessionalToDelete(null);
    setDeleteProfessionalError(null);
    setIsDeletingProfessional(false);
  };

  const handleSaveCategory = (data: any) => {
    if (selectedCategory) {
      updateCategory({ ...selectedCategory, ...data });
    } else {
      addCategory({
        id: Date.now().toString(),
        ...data
      });
    }
    setIsCategoryModalOpen(false);
    setSelectedCategory(null);
  };

  const openNewCategory = () => {
    setSelectedCategory(null);
    setIsCategoryModalOpen(true);
  };

  const openEditCategory = (c: any) => {
    setSelectedCategory(c);
    setIsCategoryModalOpen(true);
  };

  const openDeleteCategory = (c: any) => {
    setDeleteCategoryError(null);
    setCategoryToDelete(c);
    setIsDeleteCategoryModalOpen(true);
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete || isDeletingCategory) return;
    setIsDeletingCategory(true);
    const result = await deleteCategory(categoryToDelete.id);
    if (!result.success) {
      setDeleteCategoryError(result.error || 'Falha ao excluir categoria.');
      setIsDeletingCategory(false);
      return;
    }
    setIsDeleteCategoryModalOpen(false);
    setCategoryToDelete(null);
    setDeleteCategoryError(null);
    setIsDeletingCategory(false);
  };

  const tabs = [
    { id: 'PROFESSIONALS', label: 'Profissionais', icon: <Scissors size={18} />, desc: 'Equipe de atendimento' },
    { id: 'CATEGORIES', label: 'Categorias', icon: <Tag size={18} />, desc: 'Organize serviços' },
    { id: 'ALERTS', label: 'Alertas', icon: <Bell size={18} />, desc: 'WhatsApp e e-mail' },
    { id: 'PROFILES', label: 'Perfis', icon: <Shield size={18} />, desc: 'Níveis de permissão' },
    { id: 'HOURS', label: 'Horários', icon: <Clock size={18} />, desc: 'Funcionamento' },
    { id: 'INTEGRATIONS', label: 'Integrações', icon: <Zap size={18} />, desc: 'APIs externas' },
    { id: 'BILLING', label: 'Faturamento', icon: <CreditCard size={18} />, desc: 'Assinatura e faturas' },
    { id: 'CONTACT', label: 'Fale Conosco', icon: <Headphones size={18} />, desc: 'Suporte e ajuda' },
    { id: 'OTHER', label: 'Identidade', icon: <Settings size={18} />, desc: 'Marca e cores' },
  ];

  const adminUsersCount = users.filter(u => u.role === 'ADMIN').length;
  const employeeUsersCount = users.filter(u => u.role !== 'ADMIN').length;
  const settingsProfessionals = professionals.map((professional) => {
    const linkedUser = users.find(user => user.id === professional.id);
    return {
      ...professional,
      linkedUser,
      linkedAccessRole: linkedUser?.role,
      linkedEmail: linkedUser?.email,
      linkedPhone: linkedUser?.phone,
    };
  });

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Sidebar Navigation */}
      <aside className="lg:w-64 flex-shrink-0">
        <div className="lg:sticky lg:top-6 space-y-6">
          <div className="flex items-center justify-between lg:block">
            <h2 className="text-xl font-bold text-gray-800 lg:mb-6">Configurações</h2>
            <div className="lg:hidden">
              <select 
                value={activeSubTab}
                onChange={(e) => setActiveSubTab(e.target.value as any)}
                className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
              >
                {tabs.map(tab => (
                  <option key={tab.id} value={tab.id}>{tab.label}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Desktop Sidebar */}
          <nav className="hidden lg:block space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group ${
                  activeSubTab === tab.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <div className={`transition-colors ${activeSubTab === tab.id ? 'text-white' : 'text-gray-400 group-hover:text-blue-600'}`}>
                  {tab.icon}
                </div>
                <div className="text-left">
                  <p className="font-bold leading-none">{tab.label}</p>
                  <p className={`text-[10px] mt-1 ${activeSubTab === tab.id ? 'text-blue-100' : 'text-gray-400'}`}>{tab.desc}</p>
                </div>
              </button>
            ))}
          </nav>

          {/* Mobile Horizontal Scroll */}
          <nav className="lg:hidden flex overflow-x-auto pb-2 gap-2 no-scrollbar -mx-4 px-4 sticky top-0 bg-gray-100 z-10">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  activeSubTab === tab.id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                    : 'bg-white border border-gray-100 text-gray-500'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 min-h-[500px]">
          {activeSubTab === 'PROFESSIONALS' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-gray-800">Profissionais</h3>
                <button 
                  onClick={openNewProfessional}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 text-sm"
                >
                  <Plus size={16} /> Novo Profissional
                </button>
              </div>
              <div className="divide-y">
                {settingsProfessionals.map((professional) => (
                  <div key={professional.id} className="py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                    <div className="flex items-center gap-3">
                      {safeAvatarSrc(professional.avatar) ? (
                        <img src={safeAvatarSrc(professional.avatar)} alt={professional.name} className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold">
                          {safeInitial(professional.name)}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{professional.name}</p>
                        <p className="text-xs text-gray-500">
                          {professional.role || 'Profissional'}
                          {(professional.linkedEmail || professional.linkedPhone)
                            ? ` • ${professional.linkedEmail || professional.linkedPhone}`
                            : ' • Sem acesso ao sistema'}
                        </p>
                        <span className={`inline-flex mt-1 items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${professional.linkedUser ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {professional.linkedUser ? 'Com acesso' : 'Sem acesso'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button 
                        onClick={() => openEditProfessional(professional)}
                        className="text-blue-600 hover:text-blue-800 p-2"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => openDeleteProfessional(professional)}
                        className="text-red-600 hover:text-red-800 p-2"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
                {settingsProfessionals.length === 0 && (
                  <div className="py-6 text-sm text-gray-500">Nenhum profissional cadastrado.</div>
                )}
              </div>
            </div>
          )}

          {activeSubTab === 'CATEGORIES' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-gray-800">Categorias de Serviços</h3>
                <button 
                  onClick={openNewCategory}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 text-sm"
                >
                  <Plus size={16} /> Nova Categoria
                </button>
              </div>
              <div className="divide-y">
                {categories.map((c) => (
                  <div key={c.id} className="py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                        <Tag size={20} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{c.name}</p>
                        <p className="text-xs text-gray-500">{c.description || 'Sem descrição'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button 
                        onClick={() => openEditCategory(c)}
                        className="text-blue-600 hover:text-blue-800 p-2"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => openDeleteCategory(c)}
                        className="text-red-600 hover:text-red-800 p-2"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <ProfessionalModal 
            isOpen={isProfessionalModalOpen}
            onClose={() => setIsProfessionalModalOpen(false)}
            onSave={handleSaveProfessional}
            professionalToEdit={selectedProfessional}
          />

          <CategoryModal 
            isOpen={isCategoryModalOpen}
            onClose={() => setIsCategoryModalOpen(false)}
            onSave={handleSaveCategory}
            categoryToEdit={selectedCategory}
          />

          {isDeleteProfessionalModalOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
                <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                  <h3 className="font-bold text-gray-900">Confirmar exclusão</h3>
                  <button
                    onClick={() => {
                      if (isDeletingProfessional) return;
                      setIsDeleteProfessionalModalOpen(false);
                      setProfessionalToDelete(null);
                      setDeleteProfessionalError(null);
                    }}
                    className="p-2 rounded-full hover:bg-gray-200 transition-colors"
                  >
                    <X size={18} className="text-gray-500" />
                  </button>
                </div>
                <div className="px-6 py-5 space-y-3">
                  <p className="text-sm text-gray-700">
                    Deseja realmente excluir o profissional <span className="font-semibold">{professionalToDelete?.name}</span>?
                  </p>
                  {deleteProfessionalError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {deleteProfessionalError}
                    </div>
                  )}
                </div>
                <div className="px-6 py-4 bg-gray-50 border-t flex gap-3">
                  <button
                    onClick={() => {
                      if (isDeletingProfessional) return;
                      setIsDeleteProfessionalModalOpen(false);
                      setProfessionalToDelete(null);
                      setDeleteProfessionalError(null);
                    }}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-white transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmDeleteProfessional}
                    disabled={isDeletingProfessional}
                    className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isDeletingProfessional ? 'Excluindo...' : 'Excluir'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {isDeleteCategoryModalOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
                <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                  <h3 className="font-bold text-gray-900">Confirmar exclusão</h3>
                  <button
                    onClick={() => {
                      setIsDeleteCategoryModalOpen(false);
                      setCategoryToDelete(null);
                      setDeleteCategoryError(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <p className="text-sm text-gray-700">
                    Tem certeza que deseja excluir a categoria
                    <span className="font-semibold text-gray-900"> {categoryToDelete?.name || 'selecionada'}</span>?
                  </p>
                  <p className="text-xs text-gray-500">
                    Esta ação não pode ser desfeita. Se houver serviços vinculados, a exclusão será bloqueada.
                  </p>
                  {deleteCategoryError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {deleteCategoryError}
                    </div>
                  )}

                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsDeleteCategoryModalOpen(false);
                        setCategoryToDelete(null);
                        setDeleteCategoryError(null);
                      }}
                      className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={confirmDeleteCategory}
                      disabled={isDeletingCategory}
                      className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isDeletingCategory ? 'Excluindo...' : 'Excluir'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'ALERTS' && (
            <div className="space-y-6">
              <h3 className="font-bold text-gray-800">Configuração de Notificações</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 text-green-600 rounded-lg"><MessageSquare size={20} /></div>
                    <div>
                      <p className="font-medium text-gray-900">WhatsApp (API Oficial)</p>
                      <p className="text-xs text-gray-500">Lembretes automáticos 2h antes do agendamento</p>
                    </div>
                  </div>
                  <div className="w-12 h-6 bg-blue-600 rounded-full relative cursor-pointer">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Mail size={20} /></div>
                    <div>
                      <p className="font-medium text-gray-900">E-mail de Confirmação</p>
                      <p className="text-xs text-gray-500">Enviar e-mail assim que o agendamento for criado</p>
                    </div>
                  </div>
                  <div className="w-12 h-6 bg-blue-600 rounded-full relative cursor-pointer">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'PROFILES' && (
            <div className="space-y-6">
              <h3 className="font-bold text-gray-800">Níveis de Acesso</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {[
                  {
                    title: 'Administrador',
                    desc: 'Acesso total ao sistema e financeiro',
                    icon: <Shield className="text-purple-600" />,
                    count: adminUsersCount,
                  },
                  {
                    title: 'Funcionário / Equipe',
                    desc: 'Gestão da agenda e operações do dia a dia',
                    icon: <Users className="text-blue-600" />,
                    count: employeeUsersCount,
                  }
                ].map((p, i) => (
                  <div key={i} className="p-4 border rounded-xl hover:border-blue-300 transition-colors cursor-pointer">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      {p.icon}
                      <span className="text-xs font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                        {p.count} usuário{p.count === 1 ? '' : 's'}
                      </span>
                    </div>
                    <p className="font-bold text-gray-900">{p.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{p.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSubTab === 'HOURS' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-gray-800">Horário de Funcionamento</h3>
                  <p className="text-xs text-gray-500">Defina os dias e horários que sua barbearia recebe clientes</p>
                </div>
                <div className="hidden sm:block px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  Horário Padrão
                </div>
              </div>

              <div className="space-y-3">
                {localBusinessHours.map((h) => (
                  <div 
                    key={h.dayOfWeek} 
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all ${h.open ? 'bg-white border-gray-100' : 'bg-gray-50 border-transparent opacity-60'}`}
                  >
                    <div className="flex items-center gap-4 mb-3 sm:mb-0">
                      <button 
                        onClick={() => toggleDay(h.dayOfWeek)}
                        className={`w-12 h-6 rounded-full relative transition-colors ${h.open ? 'bg-blue-600' : 'bg-gray-300'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${h.open ? 'right-1' : 'left-1'}`}></div>
                      </button>
                      <span className={`font-bold text-sm ${h.open ? 'text-gray-800' : 'text-gray-400'}`}>{h.day}</span>
                    </div>

                    {h.open ? (
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-gray-400" />
                          <input 
                            type="time" 
                            value={h.start}
                            onChange={(e) => updateTime(h.dayOfWeek, 'start', e.target.value)}
                            className="p-1.5 border border-gray-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <span className="text-gray-300">até</span>
                        <div className="flex items-center gap-2">
                          <input 
                            type="time" 
                            value={h.end}
                            onChange={(e) => updateTime(h.dayOfWeek, 'end', e.target.value)}
                            className="p-1.5 border border-gray-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Fechado</span>
                    )}
                  </div>
                ))}
              </div>

              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3">
                <div className="p-2 bg-amber-100 text-amber-600 rounded-lg h-fit">
                  <Clock size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-900">Dica de Gestão</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Os horários definidos aqui serão usados como base para a agenda online dos seus clientes. 
                  </p>
                </div>
              </div>

              {hoursSaveError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {hoursSaveError}
                </div>
              )}

              {hoursSaveSuccess && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                  {hoursSaveSuccess}
                </div>
              )}

              <div className="pt-4 flex justify-end">
                <button
                  onClick={handleSaveBusinessHours}
                  disabled={isSavingHours}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSavingHours ? 'Salvando...' : 'Salvar Horários'}
                </button>
              </div>
            </div>
          )}

          {activeSubTab === 'BILLING' && (
            <div className="space-y-8">
              {/* Subscription Plan */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 p-6 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl text-white shadow-lg shadow-blue-100 relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <p className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-1">Plano Atual</p>
                        <h4 className="text-2xl font-bold">Profissional Plus</h4>
                      </div>
                      <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold uppercase">Ativo</span>
                    </div>
                    
                    <div className="flex items-end gap-2 mb-6">
                      <span className="text-4xl font-bold">R$ 89,90</span>
                      <span className="text-blue-200 text-sm mb-1">/ mês</span>
                    </div>

                    <div className="flex flex-wrap gap-4 pt-4 border-t border-white/10">
                      <div className="flex items-center gap-2">
                        <Check size={14} className="text-blue-300" />
                        <span className="text-xs text-blue-50">Agendamentos ilimitados</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check size={14} className="text-blue-300" />
                        <span className="text-xs text-blue-50">Até 5 profissionais</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check size={14} className="text-blue-300" />
                        <span className="text-xs text-blue-50">WhatsApp API inclusa</span>
                      </div>
                    </div>
                  </div>
                  {/* Decorative circles */}
                  <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                  <div className="absolute -left-10 -top-10 w-40 h-40 bg-blue-400/20 rounded-full blur-3xl" />
                </div>

                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Próximo Vencimento</p>
                    <div className="flex items-center gap-3 mb-2">
                      <Calendar size={20} className="text-blue-600" />
                      <span className="text-lg font-bold text-gray-800">15 Abr, 2024</span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">Sua assinatura será renovada automaticamente usando seu método de pagamento padrão.</p>
                  </div>
                  <button className="w-full mt-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all">
                    Alterar Plano
                  </button>
                </div>
              </div>

              {/* Usage Stats */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <BarChart3 size={18} className="text-gray-500" />
                  <h4 className="font-bold text-gray-700">Uso do Sistema (Mês Atual)</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 bg-white border border-gray-100 rounded-xl space-y-3">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-gray-600">Agendamentos</span>
                      <span className="text-blue-600">452 / ∞</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: '45%' }} />
                    </div>
                  </div>
                  <div className="p-4 bg-white border border-gray-100 rounded-xl space-y-3">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-gray-600">Profissionais Ativos</span>
                      <span className="text-blue-600">3 / 5</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: '60%' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <CreditCard size={18} className="text-gray-500" />
                    <h4 className="font-bold text-gray-700">Métodos de Pagamento</h4>
                  </div>
                  <button className="text-blue-600 text-xs font-bold hover:underline flex items-center gap-1">
                    <Plus size={14} /> Adicionar Novo
                  </button>
                </div>
                <div className="p-4 border border-blue-100 bg-blue-50/30 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-8 bg-white border border-gray-200 rounded flex items-center justify-center shadow-sm">
                      <span className="text-[10px] font-black italic text-blue-800">VISA</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">Visa terminando em 4242</p>
                      <p className="text-xs text-gray-500">Expira em 12/2026 • Principal</p>
                    </div>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600">
                    <Edit size={16} />
                  </button>
                </div>
              </div>

              {/* Billing History */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Receipt size={18} className="text-gray-500" />
                  <h4 className="font-bold text-gray-700">Histórico de Faturamento</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-gray-400 text-[10px] font-bold uppercase tracking-wider border-b border-gray-100">
                        <th className="pb-3 font-bold">Data</th>
                        <th className="pb-3 font-bold">Valor</th>
                        <th className="pb-3 font-bold">Status</th>
                        <th className="pb-3 font-bold text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {[
                        { date: '15 Mar, 2024', amount: 'R$ 89,90', status: 'Pago' },
                        { date: '15 Fev, 2024', amount: 'R$ 89,90', status: 'Pago' },
                        { date: '15 Jan, 2024', amount: 'R$ 89,90', status: 'Pago' }
                      ].map((invoice, i) => (
                        <tr key={i} className="group">
                          <td className="py-4 font-medium text-gray-700">{invoice.date}</td>
                          <td className="py-4 font-bold text-gray-900">{invoice.amount}</td>
                          <td className="py-4">
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold">
                              {invoice.status}
                            </span>
                          </td>
                          <td className="py-4 text-right">
                            <button className="text-gray-400 hover:text-blue-600 transition-colors">
                              <Receipt size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'INTEGRATIONS' && (
            <div className="space-y-8">
              <WhatsAppIntegration />
              <EmailIntegration />
            </div>
          )}

          {activeSubTab === 'CONTACT' && (
            <div className="space-y-8">
              <div className="text-center max-w-md mx-auto space-y-4 py-6">
                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
                  <Headphones size={40} />
                </div>
                <h3 className="text-2xl font-bold text-gray-800">Como podemos ajudar?</h3>
                <p className="text-gray-500 text-sm">Nossa equipe de suporte está disponível de segunda a sexta, das 09h às 18h, para garantir que sua barbearia nunca pare.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* WhatsApp Contact */}
                <a 
                  href="https://wa.me/5511999999999" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-green-200 transition-all group text-center"
                >
                  <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <MessageSquare size={24} />
                  </div>
                  <h4 className="font-bold text-gray-800 mb-1">WhatsApp</h4>
                  <p className="text-xs text-gray-500 mb-4">Resposta em até 15 min</p>
                  <div className="flex items-center justify-center gap-2 text-green-600 font-bold text-sm">
                    Iniciar conversa <ExternalLink size={14} />
                  </div>
                </a>

                {/* Email Contact */}
                <a 
                  href="mailto:suporte@agendefacil.com.br" 
                  className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all group text-center"
                >
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Mail size={24} />
                  </div>
                  <h4 className="font-bold text-gray-800 mb-1">E-mail</h4>
                  <p className="text-xs text-gray-500 mb-4">Para casos complexos</p>
                  <div className="flex items-center justify-center gap-2 text-blue-600 font-bold text-sm">
                    Enviar e-mail <ExternalLink size={14} />
                  </div>
                </a>

                {/* Phone Contact */}
                <a 
                  href="tel:+551140028922" 
                  className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-purple-200 transition-all group text-center"
                >
                  <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Phone size={24} />
                  </div>
                  <h4 className="font-bold text-gray-800 mb-1">Telefone</h4>
                  <p className="text-xs text-gray-500 mb-4">Atendimento imediato</p>
                  <div className="flex items-center justify-center gap-2 text-purple-600 font-bold text-sm">
                    Ligar agora <ExternalLink size={14} />
                  </div>
                </a>
              </div>

              {/* FAQ / Help Center Link */}
              <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-center sm:text-left">
                  <div className="p-3 bg-white rounded-xl shadow-sm text-blue-600">
                    <Globe size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">Central de Ajuda</h4>
                    <p className="text-xs text-gray-500">Acesse tutoriais e vídeos sobre como usar o sistema.</p>
                  </div>
                </div>
                <button className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all whitespace-nowrap">
                  Acessar Central
                </button>
              </div>
            </div>
          )}

          {activeSubTab === 'OTHER' && (
            <div className="space-y-8">
              <div className="space-y-6">
                <h3 className="font-bold text-gray-800">Identidade Visual</h3>
                
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700">Logo ou Ícone da Barbearia</label>
                  
                  <div className="flex flex-wrap gap-6 items-start">
                    <div className="w-24 h-24 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 overflow-hidden relative group">
                      {identityForm.logoUrl ? (
                        <img src={identityForm.logoUrl} alt="Logo da barbearia" className="w-full h-full object-cover" />
                      ) : (
                        <BrandIcon name={identityForm.iconName} className="w-10 h-10" />
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold uppercase">
                        Preview
                      </div>
                    </div>

                    <div className="flex-1 space-y-4 min-w-[280px]">
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">URL da logo (opcional)</label>
                        <div className="flex items-center gap-2">
                          <span className="p-2 bg-gray-100 rounded-lg text-gray-500"><Camera size={14} /></span>
                          <input
                            type="text"
                            value={identityForm.logoUrl || ''}
                            onChange={(e) => {
                              setIdentityForm(prev => ({ ...prev, logoUrl: e.target.value }));
                              setIdentityError(null);
                              setIdentitySuccess(null);
                            }}
                            placeholder="https://... ou data:image/..."
                            className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Ou escolha um ícone tradicional</p>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { id: 'scissors', icon: Scissors },
                            { id: 'store', icon: Store },
                            { id: 'user', icon: UserIcon },
                            { id: 'sparkles', icon: Sparkles },
                            { id: 'heart', icon: Heart },
                            { id: 'zap', icon: Zap }
                          ].map((item) => (
                            <button 
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setIdentityForm(prev => ({ ...prev, iconName: item.id }));
                                setIdentityError(null);
                                setIdentitySuccess(null);
                              }}
                              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all border ${identityForm.iconName === item.id ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600'}`}
                            >
                              <item.icon size={20} />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6 pt-6 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <Palette size={18} className="text-gray-500" />
                    <h4 className="font-bold text-gray-700">Cores da Marca</h4>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Paletas Sugeridas</p>
                      <div className="grid grid-cols-2 gap-3">
                        {identityPalettes.map((palette) => (
                          <button 
                            key={palette.name}
                            type="button"
                            onClick={() => {
                              setIdentityForm(prev => ({
                                ...prev,
                                primaryColor: palette.primary,
                                secondaryColor: palette.secondary,
                              }));
                              setIdentityError(null);
                              setIdentitySuccess(null);
                            }}
                            className={`p-3 rounded-xl border text-left transition-all group hover:shadow-md ${identityForm.primaryColor === palette.primary && identityForm.secondaryColor === palette.secondary ? 'border-blue-200 bg-blue-50/30 ring-1 ring-blue-100' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex gap-1">
                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: palette.primary }} />
                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: palette.secondary }} />
                              </div>
                              {identityForm.primaryColor === palette.primary && identityForm.secondaryColor === palette.secondary && <Check size={12} className="text-blue-600" />}
                            </div>
                            <p className="text-[11px] font-bold text-gray-700">{palette.name}</p>
                            <p className="text-[10px] text-gray-400">{palette.label}</p>
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Cor Primária</label>
                          <input
                            type="text"
                            value={identityForm.primaryColor || ''}
                            onChange={(e) => {
                              setIdentityForm(prev => ({ ...prev, primaryColor: e.target.value }));
                              setIdentityError(null);
                              setIdentitySuccess(null);
                            }}
                            placeholder="#2563eb"
                            className="w-full p-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Cor Secundária</label>
                          <input
                            type="text"
                            value={identityForm.secondaryColor || ''}
                            onChange={(e) => {
                              setIdentityForm(prev => ({ ...prev, secondaryColor: e.target.value }));
                              setIdentityError(null);
                              setIdentitySuccess(null);
                            }}
                            placeholder="#eff6ff"
                            className="w-full p-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Preview da Interface</p>
                      <div className="rounded-2xl p-6 border border-gray-100 space-y-4" style={{ backgroundColor: identityForm.secondaryColor || '#f9fafb' }}>
                        <div className="flex gap-2">
                          <button className="px-4 py-2 text-white rounded-lg text-xs font-bold" style={{ backgroundColor: identityForm.primaryColor || '#2563eb' }}>
                            Agendar Agora
                          </button>
                          <button className="px-4 py-2 bg-white rounded-lg text-xs font-bold" style={{ border: `1px solid ${identityForm.primaryColor || '#2563eb'}`, color: identityForm.primaryColor || '#2563eb' }}>
                            Cancelar
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <span className="px-2 py-1 rounded-full text-[10px] font-bold" style={{ backgroundColor: identityForm.secondaryColor || '#eff6ff', color: identityForm.primaryColor || '#2563eb' }}>
                            Confirmado
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-gray-100">
                  <div className="bg-blue-50 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-blue-900">Configuração Inicial</h4>
                      <p className="text-sm text-blue-700">Deseja refazer o passo a passo de configuração da sua barbearia?</p>
                    </div>
                    <button 
                      onClick={() => {
                        localStorage.setItem('manual_onboarding_request', 'true');
                        localStorage.setItem('onboarding_completed', 'false');
                        navigate('/onboarding');
                      }}
                      className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 whitespace-nowrap"
                    >
                      Iniciar Onboarding
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-6 pt-6 border-t border-gray-100">
                <h3 className="font-bold text-gray-800">Outras Preferências</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Empresa</label>
                    <input
                      type="text"
                      value={identityForm.name || ''}
                      onChange={(e) => {
                        setIdentityForm(prev => ({ ...prev, name: e.target.value }));
                        setIdentityError(null);
                        setIdentitySuccess(null);
                      }}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>

                  {identityError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {identityError}
                    </div>
                  )}

                  {identitySuccess && (
                    <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                      {identitySuccess}
                    </div>
                  )}

                  <div className="pt-4">
                    <button
                      onClick={handleSaveIdentity}
                      disabled={isSavingIdentity}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isSavingIdentity ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const CategoryModal = ({ isOpen, onClose, onSave, categoryToEdit }: { isOpen: boolean, onClose: () => void, onSave: (data: any) => void, categoryToEdit?: any }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    iconName: 'Tag'
  });

  useEffect(() => {
    if (categoryToEdit) {
      setFormData({
        name: categoryToEdit.name,
        description: categoryToEdit.description || '',
        iconName: categoryToEdit.iconName || 'Tag'
      });
    } else {
      setFormData({
        name: '',
        description: '',
        iconName: 'Tag'
      });
    }
  }, [categoryToEdit, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
          <h3 className="text-xl font-bold text-gray-800">{categoryToEdit ? 'Editar Categoria' : 'Nova Categoria'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Nome da Categoria</label>
            <input 
              type="text" 
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Ex: Cabelo, Barba, Estética..."
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Descrição (Opcional)</label>
            <textarea 
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all h-24 resize-none"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Breve descrição da categoria..."
            />
          </div>
        </div>
        <div className="p-6 bg-gray-50 border-t flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-100 transition-all">Cancelar</button>
          <button 
            onClick={() => onSave(formData)}
            disabled={!formData.name}
            className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-100"
          >
            Salvar Categoria
          </button>
        </div>
      </div>
    </div>
  );
};

export const AdminDashboard: React.FC = () => {
  const { user, logout, brandIdentity } = useAppContext();
  const isAdminUser = user?.role === 'ADMIN';
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'SERVICES' | 'USERS' | 'AGENDA' | 'SETTINGS'>(isAdminUser ? 'DASHBOARD' : 'AGENDA');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [agendaNavigationRequest, setAgendaNavigationRequest] = useState<{
    date: string;
    viewMode: 'DAY' | 'WEEK' | 'MONTH';
    nonce: number;
  } | null>(null);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  useEffect(() => {
    if (!isAdminUser) {
      setActiveTab('AGENDA');
    }
  }, [isAdminUser]);

  const handleTabChange = (tab: 'DASHBOARD' | 'SERVICES' | 'USERS' | 'AGENDA' | 'SETTINGS') => {
    if (!isAdminUser && tab !== 'AGENDA') {
      return;
    }
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  const handleViewAllRecent = () => {
    const today = new Date().toISOString().split('T')[0];
    setAgendaNavigationRequest({
      date: today,
      viewMode: 'DAY',
      nonce: Date.now(),
    });
    setActiveTab('AGENDA');
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex relative">
      {/* Sidebar Overlay (Mobile) */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:shadow-md flex flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: brandIdentity.primaryColor || '#2563eb' }}>
              <BrandIcon name={brandIdentity.iconName} className="w-6 h-6" />
              {brandIdentity.name || 'AgendeFácil'}
            </h1>
            <p className="text-xs text-gray-500 mt-1">Painel Administrativo</p>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-gray-500">
            <X size={24} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {isAdminUser && (
            <button 
              onClick={() => handleTabChange('DASHBOARD')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'DASHBOARD' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <LayoutDashboard size={20} /> Visão Geral
            </button>
          )}
          <button 
             onClick={() => handleTabChange('AGENDA')}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'AGENDA' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Calendar size={20} /> Agenda
          </button>
          {isAdminUser && (
            <>
              <button 
                 onClick={() => handleTabChange('SERVICES')}
                 className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'SERVICES' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <DollarSign size={20} /> Serviços
              </button>
              <button 
                onClick={() => handleTabChange('USERS')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'USERS' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <Users size={20} /> Clientes
              </button>
              <button 
                onClick={() => handleTabChange('SETTINGS')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'SETTINGS' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <Settings size={20} /> Configurações
              </button>
            </>
          )}
        </nav>

        <div className="p-4 border-t">
          <div className="flex items-center gap-3 mb-4">
             <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <Users size={20} />
             </div>
             <div className="overflow-hidden">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                <p className="text-xs text-gray-500">Unidade Matriz</p>
             </div>
          </div>
          <button onClick={logout} className="flex items-center gap-2 text-red-600 text-sm font-medium hover:text-red-700">
            <LogOut size={16} /> Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 flex flex-col ${activeTab === 'AGENDA' ? 'h-screen overflow-hidden' : 'overflow-y-auto'}`}>
         {/* Mobile Header */}
         <header className="bg-white p-4 shadow-sm md:hidden flex justify-between items-center sticky top-0 z-20">
             <div className="flex items-center gap-3">
                <button onClick={toggleMobileMenu} className="p-1 text-gray-600">
                    <Menu size={24} />
                </button>
                <h1 className="font-bold text-gray-800">Admin</h1>
             </div>
             <button onClick={logout}><LogOut size={20} className="text-red-500" /></button>
         </header>

         <div className={`p-4 md:p-6 ${activeTab === 'AGENDA' ? 'flex-1 overflow-hidden' : ''}`}>
          {activeTab === 'DASHBOARD' && isAdminUser && <DashboardHome onViewAllRecent={handleViewAllRecent} />}
          {activeTab === 'SERVICES' && isAdminUser && <ServicesManagement />}
          {activeTab === 'USERS' && isAdminUser && <ClientsManagement />}
            {activeTab === 'AGENDA' && <CalendarManagement navigationRequest={agendaNavigationRequest} />}
          {activeTab === 'SETTINGS' && isAdminUser && <SettingsManagement />}
         </div>
      </main>
    </div>
  );
};