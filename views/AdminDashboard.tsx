import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppContext } from '../App';
import { useNavigate } from 'react-router-dom';
import { Appointment, BrandIdentity, Client, Service } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { LayoutDashboard, Users, Calendar, Settings, LogOut, Plus, Edit, Trash2, DollarSign, X, Clock, Tag, Image as ImageIcon, Search, ChevronLeft, ChevronRight, Bell, Mail, MessageSquare, Shield, Globe, Menu, Scissors, Sparkles, Smile, Zap, Heart, Share2, RotateCcw, ChevronDown, Lock, Camera, Store, User as UserIcon, Palette, Check, CreditCard, Receipt, BarChart3, Phone, Headphones, ExternalLink, List, Upload } from 'lucide-react';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { createProfissionalApi, deleteProfissionalApi, listProfissionaisApi, updateProfissionalApi } from '../services/profissionaisApi';
import {
  listRecebiveisApi,
  registrarEstornoRecebivelApi,
  registrarPagamentoRecebivelApi,
  RecebivelApi,
  FinanceiroResumoApi,
} from '../services/financeiroApi';
import { DashboardInsightsApi, getDashboardInsightsApi } from '../services/dashboardApi';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const LOGIN_LOGO_TEMPLATES = [
  {
    id: 'cone',
    name: 'Cone',
    url: 'https://eczbkkriebkwsepvlnuu.supabase.co/storage/v1/object/public/logo-templates/logos/cone.png',
  },
  {
    id: 'cone-preto-branco',
    name: 'Cone preto e branco',
    url: 'https://eczbkkriebkwsepvlnuu.supabase.co/storage/v1/object/public/logo-templates/logos/cone1.png',
  },
  {
    id: 'espuma',
    name: 'Espuma',
    url: 'https://eczbkkriebkwsepvlnuu.supabase.co/storage/v1/object/public/logo-templates/logos/espuma.png',
  },
  {
    id: 'homem',
    name: 'Homem',
    url: 'https://eczbkkriebkwsepvlnuu.supabase.co/storage/v1/object/public/logo-templates/logos/men1.png',
  },
  {
    id: 'oculos-bigode',
    name: 'Óculos Bigode',
    url: 'https://eczbkkriebkwsepvlnuu.supabase.co/storage/v1/object/public/logo-templates/logos/oculos-bigode.png',
  },
  {
    id: 'oculos-pente',
    name: 'Óculos Pente',
    url: 'https://eczbkkriebkwsepvlnuu.supabase.co/storage/v1/object/public/logo-templates/logos/oculos-pente.png',
  },
  {
    id: 'tesoura-preta',
    name: 'Tesoura Preta',
    url: 'https://eczbkkriebkwsepvlnuu.supabase.co/storage/v1/object/public/logo-templates/logos/tesoura1.png',
  },
  {
    id: 'tesoura-aberta',
    name: 'Tesoura Aberta',
    url: 'https://eczbkkriebkwsepvlnuu.supabase.co/storage/v1/object/public/logo-templates/logos/tesoura2.png',
  },
];

const LOGIN_BACKGROUND_TEMPLATES = [
  {
    id: 'fundo1',
    name: 'Fundo 1',
    url: 'https://eczbkkriebkwsepvlnuu.supabase.co/storage/v1/object/public/logo-templates/fundos/fundo1.jpg',
  },
  {
    id: 'fundo2',
    name: 'Fundo 2',
    url: 'https://eczbkkriebkwsepvlnuu.supabase.co/storage/v1/object/public/logo-templates/fundos/fundo2.jpg',
  },
  {
    id: 'fundo3',
    name: 'Fundo 3',
    url: 'https://eczbkkriebkwsepvlnuu.supabase.co/storage/v1/object/public/logo-templates/fundos/fundo3.png',
  },
  {
    id: 'fundo4',
    name: 'Fundo 4',
    url: 'https://eczbkkriebkwsepvlnuu.supabase.co/storage/v1/object/public/logo-templates/fundos/fundo4.jpg',
  },
  {
    id: 'fundo5',
    name: 'Fundo 5',
    url: 'https://eczbkkriebkwsepvlnuu.supabase.co/storage/v1/object/public/logo-templates/fundos/fundo5.png',
  },
  {
    id: 'fundo6',
    name: 'Fundo 6',
    url: 'https://eczbkkriebkwsepvlnuu.supabase.co/storage/v1/object/public/logo-templates/fundos/fundo6.jpg',
  },
];

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
    case 'NO_SHOW': return 'No-show';
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
    case 'NO_SHOW': return 'bg-slate-200 text-slate-700';
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
  const { appointments, services, professionals, clients, brandIdentity, businessHours } = useAppContext();
  const churnRiskDaysThreshold = Math.max(1, Math.min(365, Number(brandIdentity.churnRiskDaysThreshold || 45)));
  const [dashboardInsights, setDashboardInsights] = useState<DashboardInsightsApi>({
    top_clientes_frequentes: [],
    top_clientes_faturamento: [],
    clientes_risco_churn: [],
  });
  
  // Quick Stats Calculation
  const totalRevenue = appointments.reduce((acc, curr) => acc + curr.totalValue, 0);
  const totalBookings = appointments.length;
  const pending = appointments.filter(a => a.status === 'PENDING_PAYMENT').length;

  const chartColors = ['#2563eb', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

  const getWeekdayFromIsoDate = (isoDate: string): number => {
    const date = new Date(`${isoDate}T12:00:00`);
    return Number.isNaN(date.getTime()) ? -1 : date.getDay();
  };

  const professionalSeries = useMemo(() => {
    const dateKeys = new Set<string>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let offset = 6; offset >= 0; offset -= 1) {
      const current = new Date(today);
      current.setDate(today.getDate() - offset);
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      dateKeys.add(`${year}-${month}-${day}`);
    }

    const totalsByProfessional = new Map<string, number>();
    appointments.forEach((appointment) => {
      if (!appointment.professionalId) return;
      if (normalizeAppointmentStatus(appointment.status) === 'BLOCKED') return;

      const key = String(appointment.date || '').slice(0, 10);
      if (!dateKeys.has(key)) return;

      totalsByProfessional.set(
        appointment.professionalId,
        (totalsByProfessional.get(appointment.professionalId) || 0) + 1,
      );
    });

    return Array.from(totalsByProfessional.entries())
      .map(([professionalId, total], index) => {
        const professional = professionals.find((item) => item.id === professionalId);
        if (!professional) return null;
        return {
          id: professional.id,
          name: professional.name,
          key: `professional_${professional.id}`,
          total,
          color: chartColors[index % chartColors.length],
        };
      })
      .filter((item): item is { id: string; name: string; key: string; total: number; color: string } => Boolean(item))
      .sort((left, right) => right.total - left.total);
  }, [appointments, professionals]);
  
  const dailyData = useMemo(() => {
    const dateKeys: string[] = [];
    const data: Array<Record<string, string | number>> = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let offset = 6; offset >= 0; offset -= 1) {
      const current = new Date(today);
      current.setDate(today.getDate() - offset);

      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      const key = `${year}-${month}-${day}`;
      const weekday = getWeekdayFromIsoDate(key);
      const dayConfig = businessHours.find((item) => item.dayOfWeek === weekday);
      const isClosed = dayConfig ? !Boolean(dayConfig.open) : false;

      dateKeys.push(key);
      const row: Record<string, string | number> = {
        name: `${day}/${month}`,
        uv: 0,
        fullDate: key,
        isClosed: isClosed ? 1 : 0,
      };

      professionalSeries.forEach((series) => {
        row[series.key] = 0;
      });

      data.push(row);
    }

    const indexByDate = new Map<string, number>(dateKeys.map((key, index) => [key, index]));
    const seriesKeyByProfessionalId = new Map<string, string>(professionalSeries.map((series) => [series.id, series.key]));

    appointments.forEach((appointment) => {
      if (normalizeAppointmentStatus(appointment.status) === 'BLOCKED') return;
      const key = String(appointment.date || '').slice(0, 10);
      if (!indexByDate.has(key)) return;

      const index = indexByDate.get(key);
      if (typeof index !== 'number') return;

      const isClosed = Number(data[index].isClosed || 0) === 1;
      if (isClosed) return;

      const currentTotal = Number(data[index].uv || 0);
      data[index].uv = currentTotal + 1;

      const seriesKey = seriesKeyByProfessionalId.get(appointment.professionalId);
      if (!seriesKey) return;
      data[index][seriesKey] = Number(data[index][seriesKey] || 0) + 1;
    });

    return data;
  }, [appointments, professionalSeries, businessHours]);

  const isClosedByLabel = useMemo(() => {
    return new Map(
      dailyData.map((row) => [
        String(row.name || ''),
        Number(row.isClosed || 0) === 1,
      ]),
    );
  }, [dailyData]);

  const serviceData = useMemo(() => {
    const appointmentsByService = new Map<string, number>();

    appointments.forEach((appointment) => {
      if (!appointment.serviceId) return;
      if (normalizeAppointmentStatus(appointment.status) === 'BLOCKED') return;

      appointmentsByService.set(
        appointment.serviceId,
        (appointmentsByService.get(appointment.serviceId) || 0) + 1,
      );
    });

    return Array.from(appointmentsByService.entries())
      .map(([serviceId, total]) => {
        const service = services.find((item) => item.id === serviceId);
        if (!service) return null;
        return {
          id: service.id,
          name: service.title,
          value: total,
        };
      })
      .filter((item): item is { id: string; name: string; value: number } => Boolean(item))
      .sort((left, right) => right.value - left.value)
      .slice(0, 5);
  }, [appointments, services]);

  const topProfessionals = useMemo(() => {
    const appointmentsByProfessional = new Map<string, number>();

    appointments.forEach((appointment) => {
      if (!appointment.professionalId) return;
      if (normalizeAppointmentStatus(appointment.status) === 'BLOCKED') return;

      appointmentsByProfessional.set(
        appointment.professionalId,
        (appointmentsByProfessional.get(appointment.professionalId) || 0) + 1,
      );
    });

    return Array.from(appointmentsByProfessional.entries())
      .map(([professionalId, total]) => {
        const professional = professionals.find((item) => item.id === professionalId);
        if (!professional) return null;
        return {
          id: professional.id,
          name: professional.name,
          role: professional.role,
          avatar: professional.avatar,
          total,
        };
      })
      .filter((item): item is { id: string; name: string; role: string; avatar: string | undefined; total: number } => item !== null)
      .sort((left, right) => right.total - left.total)
      .slice(0, 5);
  }, [appointments, professionals]);

  const localInsights = useMemo<DashboardInsightsApi>(() => {
    const byClientFrequency = new Map<string, { cliente_id: string; cliente_nome: string; total_agendamentos: number; ultima_visita?: string | null }>();
    const byClientRevenue = new Map<string, { cliente_id: string; cliente_nome: string; total_faturado: number; total_agendamentos: number; ultima_visita?: string | null }>();
    const byClientLastVisit = new Map<string, { cliente_id: string; cliente_nome: string; ultima_visita?: string | null; dias_sem_retorno: number }>();
    const now = new Date();

    appointments.forEach((appointment) => {
      if (!appointment.clientId) return;
      if (normalizeAppointmentStatus(appointment.status) === 'BLOCKED') return;

      const client = clients.find((item) => item.id === appointment.clientId);
      const cliente_nome = client?.name || 'Cliente';
      const currentDate = String(appointment.date || '').slice(0, 10);

      const freq = byClientFrequency.get(appointment.clientId) || {
        cliente_id: appointment.clientId,
        cliente_nome,
        total_agendamentos: 0,
        ultima_visita: currentDate,
      };
      freq.total_agendamentos += 1;
      if (!freq.ultima_visita || currentDate > String(freq.ultima_visita || '')) {
        freq.ultima_visita = currentDate;
      }
      byClientFrequency.set(appointment.clientId, freq);

      if (normalizeAppointmentStatus(appointment.status) !== 'CANCELLED') {
        const rev = byClientRevenue.get(appointment.clientId) || {
          cliente_id: appointment.clientId,
          cliente_nome,
          total_faturado: 0,
          total_agendamentos: 0,
          ultima_visita: currentDate,
        };
        rev.total_faturado += Number(appointment.totalValue || 0);
        rev.total_agendamentos += 1;
        if (!rev.ultima_visita || currentDate > String(rev.ultima_visita || '')) {
          rev.ultima_visita = currentDate;
        }
        byClientRevenue.set(appointment.clientId, rev);

        const churn = byClientLastVisit.get(appointment.clientId) || {
          cliente_id: appointment.clientId,
          cliente_nome,
          ultima_visita: currentDate,
          dias_sem_retorno: 0,
        };
        if (!churn.ultima_visita || currentDate > String(churn.ultima_visita || '')) {
          churn.ultima_visita = currentDate;
        }
        byClientLastVisit.set(appointment.clientId, churn);
      }
    });

    const top_clientes_frequentes = Array.from(byClientFrequency.values())
      .sort((a, b) => b.total_agendamentos - a.total_agendamentos)
      .slice(0, 5);

    const top_clientes_faturamento = Array.from(byClientRevenue.values())
      .sort((a, b) => b.total_faturado - a.total_faturado)
      .slice(0, 5)
      .map((item) => ({ ...item, total_faturado: Number(item.total_faturado.toFixed(2)) }));

    const clientes_risco_churn = Array.from(byClientLastVisit.values())
      .map((item) => {
        const date = item.ultima_visita ? new Date(`${item.ultima_visita}T00:00:00`) : null;
        const dias_sem_retorno = date && !Number.isNaN(date.getTime())
          ? Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        return { ...item, dias_sem_retorno };
      })
      .filter((item) => item.dias_sem_retorno >= churnRiskDaysThreshold)
      .sort((a, b) => b.dias_sem_retorno - a.dias_sem_retorno)
      .slice(0, 5);

    return {
      top_clientes_frequentes,
      top_clientes_faturamento,
      clientes_risco_churn,
    };
  }, [appointments, clients, churnRiskDaysThreshold]);

  useEffect(() => {
    let isMounted = true;

    const loadInsights = async () => {
      const response = await getDashboardInsightsApi();
      if (!isMounted) return;
      if (response.success) {
        setDashboardInsights(response.data || {
          top_clientes_frequentes: [],
          top_clientes_faturamento: [],
          clientes_risco_churn: [],
        });
      }
    };

    loadInsights();
    return () => {
      isMounted = false;
    };
  }, [appointments.length]);

  const insights = {
    top_clientes_frequentes: dashboardInsights.top_clientes_frequentes?.length
      ? dashboardInsights.top_clientes_frequentes
      : localInsights.top_clientes_frequentes,
    top_clientes_faturamento: dashboardInsights.top_clientes_faturamento?.length
      ? dashboardInsights.top_clientes_faturamento
      : localInsights.top_clientes_faturamento,
    clientes_risco_churn: dashboardInsights.clientes_risco_churn?.length
      ? dashboardInsights.clientes_risco_churn
      : localInsights.clientes_risco_churn,
  };

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4">Agendamentos (Últimos 7 dias)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  tickFormatter={(value) => {
                    const label = String(value || '');
                    const isClosed = Boolean(isClosedByLabel.get(label));
                    return isClosed ? `${label} 🔒` : label;
                  }}
                />
                <YAxis />
                <Tooltip
                  formatter={(value, name, props) => {
                    const payload = props?.payload as Record<string, unknown> | undefined;
                    const isClosed = Number(payload?.isClosed || 0) === 1;
                    if (isClosed) {
                      return ['Estabelecimento fechado neste dia', 'Status'];
                    }
                    return [`${value} agendamentos`, String(name)];
                  }}
                  labelFormatter={(label, payload) => {
                    const first = Array.isArray(payload) && payload.length > 0 ? payload[0] : undefined;
                    const point = first?.payload as Record<string, unknown> | undefined;
                    const isClosed = Number(point?.isClosed || 0) === 1;
                    return isClosed ? `Data: ${label} • Fechado` : `Data: ${label}`;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {professionalSeries.length > 0 ? (
                  professionalSeries.map((series, index) => (
                    <Bar
                      key={series.id}
                      dataKey={series.key}
                      name={series.name}
                      stackId="appointments"
                      fill={series.color}
                      radius={index === professionalSeries.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    >
                      {dailyData.map((entry) => {
                        const closed = Number(entry.isClosed || 0) === 1;
                        return <Cell key={`${series.id}-${String(entry.fullDate)}`} fill={closed ? '#d1d5db' : series.color} />;
                      })}
                    </Bar>
                  ))
                ) : (
                  <Bar dataKey="uv" fill={brandIdentity.primaryColor || '#3B82F6'} radius={[4, 4, 0, 0]}>
                    {dailyData.map((entry) => {
                      const closed = Number(entry.isClosed || 0) === 1;
                      return <Cell key={`default-${String(entry.fullDate)}`} fill={closed ? '#d1d5db' : (brandIdentity.primaryColor || '#3B82F6')} />;
                    })}
                  </Bar>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-gray-500">🔒 indica dia fechado no horário de funcionamento.</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4">Serviços Mais Procurados</h3>
           <div className="space-y-4">
            <div className="h-44">
            {serviceData.length > 0 ? (
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
                      <Cell key={`cell-${entry.id}-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} agendamentos`, 'Quantidade']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center rounded-lg border border-dashed border-gray-200 text-sm text-gray-500">
                Sem dados de serviços.
              </div>
            )}
            </div>

            {serviceData.length > 0 && (
              <div className="space-y-2">
                {serviceData.map((item, index) => (
                  <div key={`service-rank-${item.id}`} className="flex items-center justify-between text-sm border border-gray-100 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-xs font-bold text-gray-400 w-5">#{index + 1}</span>
                      <span className="text-gray-700 font-medium truncate">{item.name}</span>
                    </div>
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-2 py-1 whitespace-nowrap">
                      {item.value} ag.
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4">Top 5 Profissionais</h3>
          <div className="space-y-3">
            {topProfessionals.map((professional, index) => (
              <div key={professional.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 text-xs font-bold text-gray-400 text-center">#{index + 1}</span>
                  {safeAvatarSrc(professional.avatar) ? (
                    <img src={safeAvatarSrc(professional.avatar)} alt={professional.name} className="w-9 h-9 rounded-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-sm">
                      {safeInitial(professional.name)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{professional.name}</p>
                    <p className="text-xs text-gray-500 truncate">{professional.role || 'Profissional'}</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-2 py-1 whitespace-nowrap">
                  {professional.total} ag.
                </span>
              </div>
            ))}

            {topProfessionals.length === 0 && (
              <div className="h-64 flex items-center justify-center rounded-lg border border-dashed border-gray-200 text-sm text-gray-500">
                Sem agendamentos para ranking.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800">Top 5 Clientes Frequentes</h3>
            <button onClick={onViewAllRecent} className="text-xs text-blue-600 hover:underline">Ver agenda</button>
          </div>
          <div className="space-y-2">
            {insights.top_clientes_frequentes.map((item, index) => (
              <div key={item.cliente_id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2.5">
                <div className="min-w-0 flex items-center gap-2">
                  <span className="w-5 text-xs font-bold text-gray-400">#{index + 1}</span>
                  <p className="text-sm font-medium text-gray-800 truncate">{item.cliente_nome}</p>
                </div>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-2 py-1 whitespace-nowrap">
                  {item.total_agendamentos} visitas
                </span>
              </div>
            ))}
            {insights.top_clientes_frequentes.length === 0 && (
              <div className="rounded-lg border border-dashed border-gray-200 px-3 py-8 text-sm text-gray-500 text-center">
                Sem dados de frequência.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-bold text-gray-800 mb-4">Top 5 Clientes por Faturamento</h3>
          <div className="space-y-2">
            {insights.top_clientes_faturamento.map((item, index) => (
              <div key={item.cliente_id} className="rounded-lg border border-gray-100 px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="w-5 text-xs font-bold text-gray-400">#{index + 1}</span>
                    <p className="text-sm font-medium text-gray-800 truncate">{item.cliente_nome}</p>
                  </div>
                  <span className="text-xs font-bold text-green-700 bg-green-50 border border-green-100 rounded-full px-2 py-1 whitespace-nowrap">
                    R$ {safeMoney(item.total_faturado)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">{item.total_agendamentos} agendamentos</p>
              </div>
            ))}
            {insights.top_clientes_faturamento.length === 0 && (
              <div className="rounded-lg border border-dashed border-gray-200 px-3 py-8 text-sm text-gray-500 text-center">
                Sem dados de faturamento.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-bold text-gray-800 mb-1">Clientes em Risco de Churn</h3>
          <p className="text-xs text-gray-500 mb-3">Sem retorno há {churnRiskDaysThreshold}+ dias</p>
          <div className="space-y-2">
            {insights.clientes_risco_churn.map((item) => (
              <div key={item.cliente_id} className="rounded-lg border border-amber-100 bg-amber-50/40 px-3 py-2.5">
                <p className="text-sm font-medium text-gray-800 truncate">{item.cliente_nome}</p>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className="text-gray-500">Última visita: {safeDateBr(item.ultima_visita || null)}</span>
                  <span className="font-bold text-amber-700">{item.dias_sem_retorno} dias</span>
                </div>
              </div>
            ))}
            {insights.clientes_risco_churn.length === 0 && (
              <div className="rounded-lg border border-dashed border-gray-200 px-3 py-8 text-sm text-gray-500 text-center">
                Nenhum cliente em risco no momento.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

type AgendaNavigationPayload = {
  date: string;
  viewMode: 'DAY' | 'WEEK' | 'MONTH';
  appointmentId?: string;
  openDetails?: boolean;
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
  const { clients, addClient, importClients, updateClient, deleteClient } = useAppContext();
    type ImportResult = {
      successCount: number;
      failed: Array<{ index: number; name: string; phone: string; error: string }>;
    };
    type ImportClientDraft = {
      name: string;
      phone: string;
      email?: string;
      birthday?: string;
    };
    type ClientSortKey = 'name' | 'phone' | 'haircutsCount' | 'totalSpent' | 'lastVisit';
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<ClientSortKey>('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importRows, setImportRows] = useState<ImportClientDraft[]>([]);
    const [importFileName, setImportFileName] = useState('');
    const [importError, setImportError] = useState<string | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
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
    const [currentPage, setCurrentPage] = useState(1);
    const CLIENTS_PER_PAGE = 10;
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

    const sortedFilteredClients = useMemo(() => {
      const normalizedDirection = sortDirection === 'asc' ? 1 : -1;
      const list = [...filteredClients];

      const getComparableValue = (client: Client) => {
        switch (sortBy) {
          case 'name':
            return (client.name || '').toLowerCase();
          case 'phone':
            return (client.phone || '').toLowerCase();
          case 'haircutsCount':
            return Number(client.haircutsCount || 0);
          case 'totalSpent':
            return Number(client.totalSpent || 0);
          case 'lastVisit':
            return client.lastVisit ? Date.parse(client.lastVisit) : null;
          default:
            return '';
        }
      };

      list.sort((left, right) => {
        const leftValue = getComparableValue(left);
        const rightValue = getComparableValue(right);

        if (leftValue === null && rightValue === null) return 0;
        if (leftValue === null) return 1;
        if (rightValue === null) return -1;

        if (leftValue < rightValue) return -1 * normalizedDirection;
        if (leftValue > rightValue) return 1 * normalizedDirection;
        return 0;
      });

      return list;
    }, [filteredClients, sortBy, sortDirection]);

    const handleSort = (key: ClientSortKey) => {
      if (sortBy === key) {
        setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
        return;
      }

      setSortBy(key);
      setSortDirection('asc');
    };

    const getSortIndicator = (key: ClientSortKey) => {
      if (sortBy !== key) return '↕';
      return sortDirection === 'asc' ? '↑' : '↓';
    };

    const selectedCount = selectedClientIds.length;
    const allFilteredSelected = filteredClients.length > 0 && filteredClients.every(client => selectedClientIds.includes(client.id));
    const totalPages = Math.max(1, Math.ceil(sortedFilteredClients.length / CLIENTS_PER_PAGE));
    const paginatedClients = useMemo(() => {
      const start = (currentPage - 1) * CLIENTS_PER_PAGE;
      return sortedFilteredClients.slice(start, start + CLIENTS_PER_PAGE);
    }, [sortedFilteredClients, currentPage]);

    useEffect(() => {
      setSelectedClientIds(prev => prev.filter(id => clients.some(client => client.id === id)));
    }, [clients]);

    useEffect(() => {
      setCurrentPage(1);
    }, [searchTerm, sortBy, sortDirection]);

    useEffect(() => {
      if (currentPage > totalPages) {
        setCurrentPage(totalPages);
      }
    }, [currentPage, totalPages]);

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

    const importTemplate = `nome,telefone,email,data_nascimento\nJoão Silva,(11)98888-7777,joao@email.com,1990-05-15\nMaria Oliveira,(11)97777-6666,maria@email.com,1985-10-20\n`;

    const parseCsvLine = (line: string): string[] => {
      const values: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let index = 0; index < line.length; index += 1) {
        const char = line[index];
        const next = line[index + 1];

        if (char === '"') {
          if (inQuotes && next === '"') {
            current += '"';
            index += 1;
            continue;
          }
          inQuotes = !inQuotes;
          continue;
        }

        if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
          continue;
        }

        current += char;
      }

      values.push(current.trim());
      return values;
    };

    const normalizeHeader = (value: string) => value.trim().toLowerCase();

    const handleImportFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      setImportResult(null);
      setImportError(null);
      setImportRows([]);

      if (!file) {
        setImportFileName('');
        return;
      }

      setImportFileName(file.name);
      const content = await file.text();
      const lines = content
        .replace(/^\uFEFF/, '')
        .split(/\r?\n/)
        .filter(line => line.trim().length > 0);

      if (lines.length < 2) {
        setImportError('Arquivo CSV sem dados suficientes. Inclua cabeçalho e pelo menos 1 linha.');
        return;
      }

      const headers = parseCsvLine(lines[0]).map(normalizeHeader);
      const nameIndex = headers.indexOf('nome');
      const phoneIndex = headers.indexOf('telefone');
      const emailIndex = headers.indexOf('email');
      const birthdayIndex = headers.indexOf('data_nascimento');

      if (nameIndex === -1 || phoneIndex === -1) {
        setImportError('Cabeçalho inválido. Use ao menos: nome, telefone.');
        return;
      }

      const parsedRows: ImportClientDraft[] = [];
      const parseErrors: string[] = [];
      const seenPhones = new Set<string>();

      for (let lineNumber = 2; lineNumber <= lines.length; lineNumber += 1) {
        const row = parseCsvLine(lines[lineNumber - 1]);
        const name = (row[nameIndex] || '').trim();
        const phone = (row[phoneIndex] || '').trim();
        const email = emailIndex >= 0 ? (row[emailIndex] || '').trim() : '';
        const birthday = birthdayIndex >= 0 ? (row[birthdayIndex] || '').trim() : '';

        if (!name && !phone && !email && !birthday) {
          continue;
        }

        if (!name || !phone) {
          parseErrors.push(`Linha ${lineNumber}: nome e telefone são obrigatórios.`);
          continue;
        }

        if (birthday && !/^\d{4}-\d{2}-\d{2}$/.test(birthday)) {
          parseErrors.push(`Linha ${lineNumber}: data_nascimento deve estar em YYYY-MM-DD.`);
          continue;
        }

        const normalizedPhone = phone.replace(/\s+/g, '');
        if (seenPhones.has(normalizedPhone)) {
          parseErrors.push(`Linha ${lineNumber}: telefone duplicado no arquivo.`);
          continue;
        }

        seenPhones.add(normalizedPhone);
        parsedRows.push({
          name,
          phone,
          email: email || undefined,
          birthday: birthday || undefined,
        });
      }

      if (parseErrors.length > 0) {
        setImportError(parseErrors.slice(0, 6).join(' '));
      }

      if (parsedRows.length === 0) {
        if (parseErrors.length === 0) {
          setImportError('Nenhum cliente válido encontrado no CSV.');
        }
        return;
      }

      setImportRows(parsedRows);
    };

    const handleDownloadTemplate = () => {
      const blob = new Blob([importTemplate], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'modelo_clientes.csv';
      anchor.click();
      URL.revokeObjectURL(url);
    };

    const handleImportClients = async () => {
      if (importRows.length === 0 || isImporting) return;
      setIsImporting(true);
      setImportError(null);

      const result = await importClients(importRows);
      setImportResult(result);
      setIsImporting(false);
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
                    <button
                      onClick={() => {
                        setIsImportModalOpen(true);
                        setImportResult(null);
                        setImportError(null);
                      }}
                      className="bg-white text-gray-800 border border-gray-300 px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors shadow-sm"
                    >
                      <Upload size={18} /> Importar CSV
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

                <div className="flex items-center justify-between px-1">
                  <span className="text-sm text-gray-600">
                    Mostrando {paginatedClients.length} de {sortedFilteredClients.length} cliente(s) • Página {currentPage} de {totalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
            
                <div className="md:hidden space-y-3">
                  {paginatedClients.map(client => (
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
                        <th className="px-6 py-3">
                          <button
                            type="button"
                            onClick={() => handleSort('name')}
                            className="inline-flex items-center gap-1 hover:text-gray-900"
                          >
                            Cliente <span aria-hidden>{getSortIndicator('name')}</span>
                          </button>
                        </th>
                        <th className="px-6 py-3">
                          <button
                            type="button"
                            onClick={() => handleSort('phone')}
                            className="inline-flex items-center gap-1 hover:text-gray-900"
                          >
                            Telefone <span aria-hidden>{getSortIndicator('phone')}</span>
                          </button>
                        </th>
                        <th className="px-6 py-3">
                          <button
                            type="button"
                            onClick={() => handleSort('haircutsCount')}
                            className="inline-flex items-center gap-1 hover:text-gray-900"
                          >
                            Cortes <span aria-hidden>{getSortIndicator('haircutsCount')}</span>
                          </button>
                        </th>
                        <th className="px-6 py-3">
                          <button
                            type="button"
                            onClick={() => handleSort('totalSpent')}
                            className="inline-flex items-center gap-1 hover:text-gray-900"
                          >
                            Total Gasto <span aria-hidden>{getSortIndicator('totalSpent')}</span>
                          </button>
                        </th>
                        <th className="px-6 py-3">
                          <button
                            type="button"
                            onClick={() => handleSort('lastVisit')}
                            className="inline-flex items-center gap-1 hover:text-gray-900"
                          >
                            Última Visita <span aria-hidden>{getSortIndicator('lastVisit')}</span>
                          </button>
                        </th>
                        <th className="px-6 py-3 text-right">Ações</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y">
                      {paginatedClients.map(client => (
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

            {isImportModalOpen && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-fade-in">
                  <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-900">Importar clientes via CSV</h3>
                    <button
                      onClick={() => {
                        setIsImportModalOpen(false);
                        setImportRows([]);
                        setImportFileName('');
                        setImportError(null);
                        setImportResult(null);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="p-6 space-y-5">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Arquivo CSV</label>
                      <input
                        type="file"
                        accept=".csv,text/csv"
                        onChange={handleImportFileChange}
                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                      />
                      {importFileName && (
                        <p className="text-xs text-gray-500">Arquivo selecionado: {importFileName}</p>
                      )}
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-gray-800">Formato esperado do CSV</p>
                        <button
                          type="button"
                          onClick={handleDownloadTemplate}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Baixar modelo CSV
                        </button>
                      </div>
                      <p className="text-xs text-gray-600">Colunas: nome, telefone, email, data_nascimento</p>
                      <pre className="text-xs bg-white border border-gray-200 rounded-md p-3 overflow-x-auto text-gray-700">{importTemplate.trim()}</pre>
                    </div>

                    {importError && (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {importError}
                      </div>
                    )}

                    {importRows.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-800">Pré-visualização ({importRows.length} cliente(s))</p>
                        <div className="max-h-48 overflow-auto border border-gray-200 rounded-lg">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-gray-600">
                              <tr>
                                <th className="px-3 py-2 text-left">Nome</th>
                                <th className="px-3 py-2 text-left">Telefone</th>
                                <th className="px-3 py-2 text-left">Email</th>
                                <th className="px-3 py-2 text-left">Nascimento</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {importRows.slice(0, 20).map((row, index) => (
                                <tr key={`${row.phone}-${index}`}>
                                  <td className="px-3 py-2">{row.name}</td>
                                  <td className="px-3 py-2">{row.phone}</td>
                                  <td className="px-3 py-2">{row.email || '-'}</td>
                                  <td className="px-3 py-2">{row.birthday || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {importRows.length > 20 && (
                          <p className="text-xs text-gray-500">Mostrando 20 de {importRows.length} linhas.</p>
                        )}
                      </div>
                    )}

                    {importResult && (
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2 text-sm">
                        <p className="text-gray-800">
                          Importação concluída: <span className="font-semibold text-green-700">{importResult.successCount}</span> sucesso(s)
                          {' '}e <span className="font-semibold text-red-700">{importResult.failed.length}</span> falha(s).
                        </p>
                        {importResult.failed.length > 0 && (
                          <ul className="space-y-1 text-xs text-red-700 max-h-24 overflow-auto">
                            {importResult.failed.slice(0, 6).map(item => (
                              <li key={`${item.index}-${item.phone}`}>Linha {item.index} ({item.name || item.phone}): {item.error}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="px-6 py-4 border-t bg-gray-50 flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setIsImportModalOpen(false);
                        setImportRows([]);
                        setImportFileName('');
                        setImportError(null);
                        setImportResult(null);
                      }}
                      className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-white"
                    >
                      Fechar
                    </button>
                    <button
                      type="button"
                      onClick={handleImportClients}
                      disabled={importRows.length === 0 || isImporting}
                      className="px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isImporting ? 'Importando...' : `Importar ${importRows.length} cliente(s)`}
                    </button>
                  </div>
                </div>
              </div>
            )}

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
  navigationRequest?: (AgendaNavigationPayload & { nonce: number }) | null;
}) => {
  const { user, appointments, services, professionals, clients, addAppointment, updateAppointment, transitionAppointmentStatus, deleteAppointment, businessHours, brandIdentity } = useAppContext();
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
    const [transitionObservation, setTransitionObservation] = useState('');
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
      const dayViewScrollRef = useRef<HTMLDivElement | null>(null);

    const isCancelledAppointment = (apt: Appointment) => normalizeAppointmentStatus(apt.status) === 'CANCELLED';
    const visibleAgendaAppointments = appointments.filter(apt => !isCancelledAppointment(apt));
    const selectedApt = visibleAgendaAppointments.find(a => a.id === selectedAptId);
    const isEmployeeUser = user?.role === 'EMPLOYEE';
    const allowEmployeeConfirmAppointment = Boolean(brandIdentity.allowEmployeeConfirmAppointment);
    const allowEmployeeCreateAppointment = brandIdentity.allowEmployeeCreateAppointment === undefined ? true : Boolean(brandIdentity.allowEmployeeCreateAppointment);
    const canEmployeeCreateAppointment = !isEmployeeUser || allowEmployeeCreateAppointment;
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

    const getOperatingWindowForDate = (dateStr: string) => {
      const config = getBusinessHourForDate(dateStr);
      const isOpen = config ? config.open : true;
      if (!isOpen) {
        return {
          isOpen: false,
          opening: '00:00',
          closing: '00:00',
          startMinutes: 0,
          endMinutes: 0,
          slots: [] as string[],
        };
      }

      const opening = config?.start || '09:00';
      const closing = config?.end || '19:00';
      return {
        isOpen: true,
        opening,
        closing,
        startMinutes: toMinutes(opening),
        endMinutes: toMinutes(closing),
        slots: buildTimeSlots(opening, closing),
      };
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

    const selectedDateWindow = getOperatingWindowForDate(selectedDate);
    const isSelectedDateOpen = selectedDateWindow.isOpen;
    const dayOpening = selectedDateWindow.opening;
    const dayClosing = selectedDateWindow.closing;
    const TIME_SLOTS = selectedDateWindow.slots;
    const dayStartMinutes = selectedDateWindow.startMinutes;
    const dayEndMinutes = selectedDateWindow.endMinutes;
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
      setSelectedAptId(navigationRequest.appointmentId || null);
      setIsDetailsModalOpen(Boolean(navigationRequest.openDetails && navigationRequest.appointmentId));
    }, [navigationRequest]);

    useEffect(() => {
      if (viewMode !== 'DAY') return;
      if (!isSelectedDateOpen || TIME_SLOTS.length === 0) return;

      const today = new Date().toISOString().split('T')[0];
      if (selectedDate !== today) return;

      const container = dayViewScrollRef.current;
      if (!container) return;

      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const startMinutes = dayStartMinutes;
      const endMinutes = dayEndMinutes;

      const clampedNow = Math.min(Math.max(nowMinutes, startMinutes), endMinutes);
      const pixelsPerMinute = SLOT_HEIGHT / 30;
      const offsetFromStart = (clampedNow - startMinutes) * pixelsPerMinute;
      const targetScrollTop = Math.max(offsetFromStart - 140, 0);

      window.requestAnimationFrame(() => {
        container.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
      });
    }, [viewMode, selectedDate, isSelectedDateOpen, TIME_SLOTS.length, dayStartMinutes, dayEndMinutes]);

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
      case 'NO_SHOW': return 'bg-slate-200 border-slate-300 text-slate-800';
            case 'BLOCKED': return 'bg-gray-200 border-gray-300 text-gray-600 grayscale';
            default: return 'bg-gray-100 border-gray-200 text-gray-800';
        }
    };

    const getAppointmentRange = (apt: any): { start: number; end: number } => {
      const aptWindow = getOperatingWindowForDate(String(apt.date || selectedDate));
      if (apt.status === 'BLOCKED' && apt.isAllDay) {
        return { start: aptWindow.startMinutes, end: aptWindow.endMinutes };
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
        if (isCancelledAppointment(apt)) return false;
        if (candidate.idToIgnore && apt.id === candidate.idToIgnore) return false;
        const range = getAppointmentRange(apt);
        return candidate.start < range.end && range.start < candidate.end;
      });
    };

    const canFitServiceWindow = (candidate: {
      professionalId: string;
      date: string;
      start: number;
      durationMinutes: number;
      idToIgnore?: string | null;
    }): boolean => {
      const window = getOperatingWindowForDate(candidate.date);
      if (!window.isOpen || window.slots.length === 0) return false;

      const safeDuration = Math.max(Number(candidate.durationMinutes || 0), 15);
      const end = candidate.start + safeDuration;
      if (candidate.start < window.startMinutes || end > window.endMinutes) {
        return false;
      }

      if (!candidate.professionalId) return true;

      return !hasLocalConflict({
        professionalId: candidate.professionalId,
        date: candidate.date,
        start: candidate.start,
        end,
        idToIgnore: candidate.idToIgnore,
      });
    };

    const modalDateWindow = useMemo(
      () => getOperatingWindowForDate(formData.date || selectedDate),
      [formData.date, selectedDate, businessHours]
    );

    const modalTimeSlots = modalDateWindow.slots;

    const selectedServiceDuration = useMemo(() => {
      if (formData.isBlocked) return 30;
      const service = services.find((item) => item.id === formData.serviceId);
      return Math.max(Number(service?.durationMinutes || 30), 15);
    }, [services, formData.serviceId, formData.isBlocked]);

    const availableStartTimes = useMemo(() => {
      if (formData.isBlocked) return modalTimeSlots;
      if (!formData.serviceId) return modalTimeSlots;

      return modalTimeSlots.filter((time) => {
        const start = toMinutes(time);
        return canFitServiceWindow({
          professionalId: formData.professionalId,
          date: formData.date,
          start,
          durationMinutes: selectedServiceDuration,
          idToIgnore: selectedAptId,
        });
      });
    }, [formData.isBlocked, formData.serviceId, formData.professionalId, formData.date, modalTimeSlots, selectedServiceDuration, selectedAptId]);

    const hasNoServiceWindow = !formData.isBlocked && Boolean(formData.serviceId) && Boolean(formData.professionalId) && availableStartTimes.length === 0;

    const formatStartOptionLabel = (startTime: string) => {
      if (!formData.serviceId || formData.isBlocked) return startTime;
      const endTime = toHHMM(toMinutes(startTime) + selectedServiceDuration);
      return `${startTime} (até ${endTime})`;
    };

    useEffect(() => {
      if (!isModalOpen || formData.isBlocked) return;
      if (!formData.serviceId || !formData.professionalId) return;

      if (availableStartTimes.includes(formData.time)) return;

      const fallbackStart = availableStartTimes[0];
      if (!fallbackStart) return;

      const fallbackEnd = toHHMM(toMinutes(fallbackStart) + selectedServiceDuration);
      setFormData((prev) => {
        if (prev.time === fallbackStart && prev.endTime === fallbackEnd) return prev;
        return {
          ...prev,
          time: fallbackStart,
          endTime: fallbackEnd,
        };
      });
    }, [isModalOpen, formData.isBlocked, formData.serviceId, formData.professionalId, formData.time, availableStartTimes, selectedServiceDuration]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
      if (isSavingAppointment) return;
      setAppointmentSubmitError(null);

      if (isEmployeeUser && formData.professionalId !== employeeProfessionalId) {
        setAppointmentSubmitError('Você só pode gerenciar seus próprios agendamentos.');
        return;
      }

      if (!selectedAptId && isEmployeeUser && !allowEmployeeCreateAppointment) {
        setAppointmentSubmitError('Seu perfil não possui permissão para criar agendamentos.');
        return;
      }

      const submitWindow = getOperatingWindowForDate(formData.date);

      if (!submitWindow.isOpen) {
        setAppointmentSubmitError('A barbearia está fechada nesta data conforme o horário de funcionamento.');
        return;
      }

      if (submitWindow.slots.length === 0) {
        setAppointmentSubmitError('Não há horários disponíveis para esta data.');
        return;
      }

      if (!formData.isBlocked && !formData.clientId) {
        setAppointmentSubmitError('Selecione um cliente válido para continuar.');
        return;
      }

      const service = services.find(s => s.id === formData.serviceId);
      if (!formData.isBlocked && !service) {
        setAppointmentSubmitError('Selecione um serviço válido para continuar.');
        return;
      }

        const candidateStart = formData.isAllDay ? submitWindow.startMinutes : toMinutes(formData.time);
      const candidateDuration = formData.isBlocked
          ? (formData.isAllDay ? (submitWindow.endMinutes - submitWindow.startMinutes) : (toMinutes(formData.endTime) - toMinutes(formData.time)))
        : (service?.durationMinutes || 30);
      const candidateEnd = candidateStart + Math.max(candidateDuration, 15);

      if (!formData.isBlocked) {
        const canFit = canFitServiceWindow({
          professionalId: formData.professionalId,
          date: formData.date,
          start: candidateStart,
          durationMinutes: candidateDuration,
          idToIgnore: selectedAptId,
        });
        if (!canFit) {
          setAppointmentSubmitError('Este serviço não cabe na janela de horário selecionada. Escolha outro horário.');
          return;
        }
      }

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
        case 'PENDING_PAYMENT':
        case 'CONFIRMED':
        case 'REOPENED':
          return { label: 'Confirmar Atendimento', target: 'COMPLETED_FIN', adminOnly: !allowEmployeeConfirmAppointment };
        case 'COMPLETED_FIN':
          return { label: 'Reabrir Atendimento', target: 'REOPENED', adminOnly: true };
        default:
          return null;
      }
    };

    const canMarkNoShow = (status?: string) => {
      const normalized = normalizeAppointmentStatus(status);
      return normalized === 'PENDING_PAYMENT' || normalized === 'CONFIRMED' || normalized === 'REOPENED';
    };

    const executeStatusTransition = async (
      target: Appointment['status'],
      options: { reason?: string; paymentMethod?: string; totalValue?: number; observation?: string } = {}
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
      setTransitionObservation('');
      setTransitionTotalValue('');
      setTransitionPaymentMethod('PIX');

      if (target === 'COMPLETED_FIN') {
        setIsDetailsModalOpen(false);
        setSelectedAptId(null);
      }
    };

    const openTransitionModal = (target: 'COMPLETED_FIN' | 'REOPENED') => {
      setAppointmentSubmitError(null);
      setPendingTransitionTarget(target);
      if (target === 'COMPLETED_FIN') {
        setTransitionPaymentMethod(selectedApt?.paymentMethod || 'PIX');
        setTransitionTotalValue(String(selectedApt?.totalValue ?? 0));
        setTransitionObservation('');
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

      if (action.target === 'COMPLETED_FIN') {
        openTransitionModal('COMPLETED_FIN');
        return;
      }

      if (action.target === 'REOPENED') {
        openTransitionModal('REOPENED');
        return;
      }

      await executeStatusTransition(action.target);
    };

    const handleNoShowTransition = async () => {
      if (!selectedApt || selectedApt.status === 'BLOCKED') return;
      if (!canManageSelectedAppointment) {
        setAppointmentSubmitError('Você só pode gerenciar seus próprios agendamentos.');
        return;
      }
      if (!canMarkNoShow(selectedApt.status)) {
        return;
      }

      await executeStatusTransition('NO_SHOW');
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
          observation: transitionObservation.trim() || undefined,
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

    const openCreateAppointmentModal = (prefill?: { date?: string; time?: string; professionalId?: string; endTime?: string }) => {
      if (!canEmployeeCreateAppointment) {
        setAppointmentSubmitError('Seu perfil não possui permissão para criar agendamentos.');
        return;
      }

      const date = prefill?.date || selectedDate;
      const time = prefill?.time || defaultStartTime;
      const slotMinutes = toMinutes(time);
      const nextSlot = TIME_SLOTS.find((slot) => toMinutes(slot) > slotMinutes);
      const endTime = prefill?.endTime || nextSlot || toHHMM(slotMinutes + 30);
      const professionalId = prefill?.professionalId || (isEmployeeUser ? employeeProfessionalId : '');

      if (isEmployeeUser && professionalId !== employeeProfessionalId) {
        setAppointmentSubmitError('Você só pode criar agendamentos para seu perfil.');
        return;
      }

      setSelectedAptId(null);
      setAppointmentSubmitError(null);
      setFormData({
        clientId: '',
        serviceId: '',
        professionalId,
        date,
        time,
        endTime,
        isBlocked: false,
        isAllDay: false,
        blockReason: ''
      });
      setClientSearchTerm('');
      setIsClientSearchOpen(false);
      setIsModalOpen(true);
    };

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
                                onClick={() => openCreateAppointmentModal()}
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
                        {canEmployeeCreateAppointment && (
                          <button 
                              onClick={() => openCreateAppointmentModal()}
                              className="hidden sm:flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-blue-700 transition-colors shadow-md uppercase tracking-wider whitespace-nowrap"
                          >
                              <Plus size={16} /> Adicionar
                          </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Grid Container */}
            <div ref={dayViewScrollRef} className="flex-1 overflow-auto relative touch-pan-x touch-pan-y rounded-b-xl">
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
                                            <button
                                              key={time}
                                              type="button"
                                              onClick={() => openCreateAppointmentModal({
                                                date: selectedDate,
                                                time,
                                                professionalId: prof.id,
                                              })}
                                              className="h-[80px] w-full border-b border-gray-100 hover:bg-blue-50/30 transition-colors cursor-pointer"
                                              aria-label={`Novo agendamento ${safeFirstName(prof.name)} às ${time}`}
                                            ></button>
                                        ))}

                                        {visibleAgendaAppointments
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

                                        {visibleAgendaAppointments
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
                                const dayAppointments = visibleAgendaAppointments.filter(apt => apt.date === day);
                                
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
                                              disabled={availableStartTimes.length === 0}
                                              value={formData.time}
                                              onChange={e => setFormData({...formData, time: e.target.value, endTime: toHHMM(toMinutes(e.target.value) + selectedServiceDuration)})}
                                              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            >
                                              {availableStartTimes.length === 0 && (
                                                <option value="">Sem horário compatível</option>
                                              )}
                                              {availableStartTimes.map(time => (
                                                <option key={time} value={time}>{formatStartOptionLabel(time)}</option>
                                              ))}
                                            </select>
                                            {hasNoServiceWindow && (
                                              <p className="mt-1 text-xs text-amber-700">Nenhuma janela disponível para a duração deste serviço neste profissional/data.</p>
                                            )}
                                          </div>
                                        ) : (
                                          <div className="grid grid-cols-2 gap-4 col-span-1 sm:col-span-1">
                                            <div>
                                              <label className="block text-sm font-medium text-gray-700 mb-1">Início</label>
                                              <select 
                                                required
                                                disabled={formData.isAllDay || modalTimeSlots.length === 0}
                                                value={formData.time}
                                                onChange={e => setFormData({...formData, time: e.target.value})}
                                                className={`w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${formData.isAllDay ? 'bg-gray-50 text-gray-400' : ''}`}
                                              >
                                                {modalTimeSlots.length === 0 && (
                                                  <option value="">Fechado</option>
                                                )}
                                                {modalTimeSlots.map(time => (
                                                  <option key={time} value={time}>{time}</option>
                                                ))}
                                              </select>
                                            </div>
                                            <div>
                                              <label className="block text-sm font-medium text-gray-700 mb-1">Fim</label>
                                              <select 
                                                required
                                                disabled={formData.isAllDay || modalTimeSlots.length === 0}
                                                value={formData.endTime}
                                                onChange={e => setFormData({...formData, endTime: e.target.value})}
                                                className={`w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${formData.isAllDay ? 'bg-gray-50 text-gray-400' : ''}`}
                                              >
                                                {modalTimeSlots.length === 0 && (
                                                  <option value="">Fechado</option>
                                                )}
                                                {modalTimeSlots.map(time => (
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

                            {selectedApt.status !== 'BLOCKED' && canMarkNoShow(selectedApt.status) && (
                              <div className="pt-1">
                                <button
                                  onClick={handleNoShowTransition}
                                  disabled={!canManageSelectedAppointment || isTransitioningStatus}
                                  className="w-full bg-slate-100 text-slate-700 py-2.5 rounded-lg font-medium hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Marcar como No-show
                                </button>
                              </div>
                            )}
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
                        setTransitionObservation('');
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
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Observação</label>
                          <textarea
                            value={transitionObservation}
                            onChange={(e) => setTransitionObservation(e.target.value)}
                            rows={3}
                            placeholder="Opcional"
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
                          setTransitionObservation('');
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
    commissionPercentage: professionalToEdit?.commissionPercentage !== undefined ? String(professionalToEdit.commissionPercentage) : '',
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
      commissionPercentage: professionalToEdit?.commissionPercentage !== undefined ? String(professionalToEdit.commissionPercentage) : '',
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

    const comissao = Number(String(formData.commissionPercentage || '').replace(',', '.'));
    if (Number.isNaN(comissao) || comissao < 0 || comissao > 100) {
      setSaveError('Comissão inválida. Informe um percentual entre 0 e 100.');
      return;
    }

    setIsSaving(true);
    const result = await onSave({
      ...formData,
      commissionPercentage: Number(comissao.toFixed(2)),
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
    <div className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center z-[60] p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)] overflow-hidden animate-fade-in shadow-2xl flex flex-col my-auto">
        <div className="p-4 sm:p-6 border-b flex justify-between items-center bg-gray-50 shrink-0">
          <h3 className="text-xl font-bold text-gray-800">{professionalToEdit ? 'Editar Profissional' : 'Novo Profissional'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
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

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Comissão (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={formData.commissionPercentage}
              onChange={e => setFormData(prev => ({ ...prev, commissionPercentage: e.target.value }))}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="Ex: 40"
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

        <div className="p-4 sm:p-6 bg-gray-50 border-t flex gap-3 shrink-0">
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
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-gray-800">WhatsApp</h3>
              <div className="mt-1">
                {status === 'CONNECTED' ? (
                  <span className="inline-flex items-center gap-1.5 py-0.5 px-2 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 uppercase tracking-wider border border-blue-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
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
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2"
              >
                Generate QR Code
              </button>
            </div>
          )}

          {status === 'LOADING' && (
            <div className="py-12 flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
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
                className="text-blue-600 font-bold text-sm hover:underline"
              >
                Regenerate QR Code
              </button>
            </div>
          )}

          {status === 'CONNECTED' && (
            <div className="space-y-6">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mx-auto">
                <Smile size={40} />
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-gray-900">+55 11 99999-9999</p>
                <p className="text-gray-500">Account connected and active</p>
              </div>
              <div className="flex items-center gap-2 justify-center bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium">
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
    <div className="max-w-2xl">
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
  const [activeSubTab, setActiveSubTab] = useState<'PROFESSIONALS' | 'SERVICES' | 'ALERTS' | 'PROFILES' | 'HOURS' | 'INTEGRATIONS' | 'OTHER' | 'ONBOARDING' | 'BILLING' | 'CONTACT'>('PROFESSIONALS');
  const [activeServiceTab, setActiveServiceTab] = useState<'SERVICES' | 'CATEGORIES'>('SERVICES');
  const [activeIntegrationTab, setActiveIntegrationTab] = useState<'WHATSAPP' | 'EMAIL'>('WHATSAPP');
  const [activeBillingTab, setActiveBillingTab] = useState<'PLAN' | 'UTILIZATION' | 'PAYMENT' | 'INVOICING'>('PLAN');
  const [activeIdentityTab, setActiveIdentityTab] = useState<'LOGO' | 'COLORS' | 'OTHER_PREFERENCES'>('LOGO');

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
  const [isEmployeeProfileModalOpen, setIsEmployeeProfileModalOpen] = useState(false);
  const [allowEmployeeConfirmAppointment, setAllowEmployeeConfirmAppointment] = useState(Boolean(brandIdentity.allowEmployeeConfirmAppointment));
  const [allowEmployeeCreateAppointment, setAllowEmployeeCreateAppointment] = useState(
    brandIdentity.allowEmployeeCreateAppointment === undefined ? true : Boolean(brandIdentity.allowEmployeeCreateAppointment)
  );
  const [allowEmployeeViewFinance, setAllowEmployeeViewFinance] = useState(Boolean(brandIdentity.allowEmployeeViewFinance));
  const [allowEmployeeViewReports, setAllowEmployeeViewReports] = useState(Boolean(brandIdentity.allowEmployeeViewReports));
  const [profileSettingsError, setProfileSettingsError] = useState<string | null>(null);
  const [profileSettingsSuccess, setProfileSettingsSuccess] = useState<string | null>(null);
  const [isSavingProfileSettings, setIsSavingProfileSettings] = useState(false);
  const [churnRiskDaysThreshold, setChurnRiskDaysThreshold] = useState<number>(Math.max(1, Math.min(365, Number(brandIdentity.churnRiskDaysThreshold || 45))));
  const [churnSettingsError, setChurnSettingsError] = useState<string | null>(null);
  const [churnSettingsSuccess, setChurnSettingsSuccess] = useState<string | null>(null);
  const [isSavingChurnSettings, setIsSavingChurnSettings] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const loginLogoInputRef = useRef<HTMLInputElement | null>(null);
  const loginBackgroundInputRef = useRef<HTMLInputElement | null>(null);

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

  useEffect(() => {
    setAllowEmployeeConfirmAppointment(Boolean(brandIdentity.allowEmployeeConfirmAppointment));
  }, [brandIdentity.allowEmployeeConfirmAppointment]);

  useEffect(() => {
    setAllowEmployeeCreateAppointment(
      brandIdentity.allowEmployeeCreateAppointment === undefined
        ? true
        : Boolean(brandIdentity.allowEmployeeCreateAppointment)
    );
  }, [brandIdentity.allowEmployeeCreateAppointment]);

  useEffect(() => {
    setAllowEmployeeViewFinance(Boolean(brandIdentity.allowEmployeeViewFinance));
  }, [brandIdentity.allowEmployeeViewFinance]);

  useEffect(() => {
    setAllowEmployeeViewReports(Boolean(brandIdentity.allowEmployeeViewReports));
  }, [brandIdentity.allowEmployeeViewReports]);

  useEffect(() => {
    setChurnRiskDaysThreshold(Math.max(1, Math.min(365, Number(brandIdentity.churnRiskDaysThreshold || 45))));
  }, [brandIdentity.churnRiskDaysThreshold]);

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
      loginLogoUrl: identityForm.loginLogoUrl?.trim() || undefined,
      loginBackgroundUrl: identityForm.loginBackgroundUrl?.trim() || undefined,
      allowEmployeeConfirmAppointment: Boolean(identityForm.allowEmployeeConfirmAppointment),
      allowEmployeeCreateAppointment: identityForm.allowEmployeeCreateAppointment === undefined ? true : Boolean(identityForm.allowEmployeeCreateAppointment),
      allowEmployeeViewFinance: Boolean(identityForm.allowEmployeeViewFinance),
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

  const handleSaveEmployeeProfileSettings = async () => {
    if (isSavingProfileSettings) return;
    setIsSavingProfileSettings(true);
    setProfileSettingsError(null);
    setProfileSettingsSuccess(null);

    const result = await saveBrandIdentity({
      ...brandIdentity,
      name: (brandIdentity.name || 'AgendeFácil Barbearia').trim(),
      iconName: brandIdentity.iconName || 'scissors',
      primaryColor: brandIdentity.primaryColor || '#2563eb',
      secondaryColor: brandIdentity.secondaryColor || '#eff6ff',
      allowEmployeeConfirmAppointment,
      allowEmployeeCreateAppointment,
      allowEmployeeViewFinance,
      allowEmployeeViewReports,
    });

    if (!result.success) {
      setProfileSettingsError(result.error || 'Falha ao salvar permissões do perfil Funcionário / Equipe.');
      setIsSavingProfileSettings(false);
      return;
    }

    setProfileSettingsSuccess('Permissões atualizadas com sucesso.');
    setIsSavingProfileSettings(false);
  };

  const handleSaveChurnSettings = async () => {
    if (isSavingChurnSettings) return;
    setChurnSettingsError(null);
    setChurnSettingsSuccess(null);

    const threshold = Number(churnRiskDaysThreshold);
    if (!Number.isInteger(threshold) || threshold < 1 || threshold > 365) {
      setChurnSettingsError('Informe um valor inteiro entre 1 e 365 dias.');
      return;
    }

    setIsSavingChurnSettings(true);
    const result = await saveBrandIdentity({
      ...brandIdentity,
      name: (brandIdentity.name || 'AgendeFácil Barbearia').trim(),
      iconName: brandIdentity.iconName || 'scissors',
      primaryColor: brandIdentity.primaryColor || '#2563eb',
      secondaryColor: brandIdentity.secondaryColor || '#eff6ff',
      churnRiskDaysThreshold: threshold,
    });

    if (!result.success) {
      setChurnSettingsError(result.error || 'Falha ao salvar configuração de churn.');
      setIsSavingChurnSettings(false);
      return;
    }

    setChurnSettingsSuccess('Configuração de churn atualizada com sucesso.');
    setIsSavingChurnSettings(false);
  };

  const handleIdentityImageUpload =
    (field: 'logoUrl' | 'loginLogoUrl' | 'loginBackgroundUrl') =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;

      const maxFileSize = field === 'loginBackgroundUrl' ? 2 * 1024 * 1024 : 1024 * 1024;
      const maxDataUrlLength = field === 'loginBackgroundUrl' ? 3200000 : 300000;

      if (!file.type.startsWith('image/')) {
        setIdentityError('Arquivo inválido. Selecione uma imagem.');
        setIdentitySuccess(null);
        return;
      }

      if (file.size > maxFileSize) {
        setIdentityError(field === 'loginBackgroundUrl'
          ? 'A imagem de fundo é muito grande. Use um arquivo de até 2MB.'
          : 'A imagem é muito grande. Use um arquivo de até 1MB.');
        setIdentitySuccess(null);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        if (!result.startsWith('data:image/')) {
          setIdentityError('Arquivo inválido. Selecione uma imagem.');
          setIdentitySuccess(null);
          return;
        }

        if (result.length > maxDataUrlLength) {
          setIdentityError(field === 'loginBackgroundUrl'
            ? 'A imagem de fundo ficou grande para salvar. Use uma imagem menor.'
            : 'A imagem ficou grande para salvar. Use uma imagem menor.');
          setIdentitySuccess(null);
          return;
        }

        setIdentityForm(prev => ({ ...prev, [field]: result }));
        setIdentityError(null);
        setIdentitySuccess(null);
      };
      reader.onerror = () => {
        setIdentityError('Não foi possível ler o arquivo selecionado.');
        setIdentitySuccess(null);
      };
      reader.readAsDataURL(file);
    };

  const safeIdentityAssetSrc = (value?: string | null, maxLength = 300000) => {
    if (!value || typeof value !== 'string') return undefined;
    if (value.length > maxLength) return undefined;
    if (value.startsWith('data:image/') || value.startsWith('http://') || value.startsWith('https://')) {
      return value;
    }
    return undefined;
  };

  const handleSaveProfessional = async (data: any): Promise<{ success: boolean; error?: string }> => {
    const nome = (data.name || '').trim();
    const telefone = (data.phone || '').trim();
    const cargo = (data.cargo || '').trim() || 'Profissional';
    const comissaoPercentual = Number(data.commissionPercentage || 0);
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
        comissao_percentual: Number(comissaoPercentual.toFixed(2)),
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
        comissao_percentual: Number(comissaoPercentual.toFixed(2)),
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
        commissionPercentage: Number(comissaoPercentual.toFixed(2)),
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
    { id: 'SERVICES', label: 'Serviços', icon: <DollarSign size={18} />, desc: 'Gerencie os serviços' },
    { id: 'ALERTS', label: 'Alertas', icon: <Bell size={18} />, desc: 'WhatsApp e e-mail' },
    { id: 'PROFILES', label: 'Perfis', icon: <Shield size={18} />, desc: 'Níveis de permissão' },
    { id: 'HOURS', label: 'Horários', icon: <Clock size={18} />, desc: 'Funcionamento' },
    { id: 'INTEGRATIONS', label: 'Integrações', icon: <Zap size={18} />, desc: 'APIs externas' },
    { id: 'BILLING', label: 'Faturamento', icon: <CreditCard size={18} />, desc: 'Assinatura e faturas' },
    { id: 'OTHER', label: 'Identidade', icon: <Settings size={18} />, desc: 'Marca e cores' },
    { id: 'ONBOARDING', label: 'Onboarding', icon: <List size={18} />, desc: 'Configuração inicial' },
    { id: 'CONTACT', label: 'Fale Conosco', icon: <Headphones size={18} />, desc: 'Suporte e ajuda' },
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
                          {professional.role || 'Profissional'} • Comissão: {Number(professional.commissionPercentage || 0).toFixed(2)}%
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

          {activeSubTab === 'SERVICES' && (
            <div className="space-y-6">
              <nav className="flex overflow-x-auto pb-2 gap-2 no-scrollbar -mx-2 px-2">
                <button
                  onClick={() => setActiveServiceTab('SERVICES')}
                  className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                    activeServiceTab === 'SERVICES'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                      : 'bg-white border border-gray-200 text-gray-600'
                  }`}
                >
                  Serviços
                </button>
                <button
                  onClick={() => setActiveServiceTab('CATEGORIES')}
                  className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                    activeServiceTab === 'CATEGORIES'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                      : 'bg-white border border-gray-200 text-gray-600'
                  }`}
                >
                  Categorias
                </button>
              </nav>

              {activeServiceTab === 'SERVICES' && <ServicesManagement />}

              {activeServiceTab === 'CATEGORIES' && (
                <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <h3 className="font-bold text-gray-800">Categorias de Serviços</h3>
                    <button 
                      onClick={openNewCategory}
                      className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 text-sm"
                    >
                      <Plus size={16} /> Nova Categoria
                    </button>
                  </div>

                  {categories.length === 0 ? (
                    <div className="py-2 text-sm text-gray-500">Nenhuma categoria cadastrada.</div>
                  ) : (
                    <div className="divide-y">
                      {categories.map((c) => (
                        <div key={c.id} className="py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                              <Tag size={20} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate">{c.name}</p>
                              <p className="text-xs text-gray-500 truncate">{c.description || 'Sem descrição'}</p>
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
                  )}
                </div>
              )}
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
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><MessageSquare size={20} /></div>
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
                    key: 'ADMIN',
                  },
                  {
                    title: 'Funcionário / Equipe',
                    desc: 'Gestão da agenda e operações do dia a dia',
                    icon: <Users className="text-blue-600" />,
                    count: employeeUsersCount,
                    key: 'EMPLOYEE',
                  }
                ].map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      if (p.key !== 'EMPLOYEE') return;
                      setProfileSettingsError(null);
                      setProfileSettingsSuccess(null);
                      setAllowEmployeeConfirmAppointment(Boolean(brandIdentity.allowEmployeeConfirmAppointment));
                      setAllowEmployeeCreateAppointment(
                        brandIdentity.allowEmployeeCreateAppointment === undefined
                          ? true
                          : Boolean(brandIdentity.allowEmployeeCreateAppointment)
                      );
                      setAllowEmployeeViewFinance(Boolean(brandIdentity.allowEmployeeViewFinance));
                      setAllowEmployeeViewReports(Boolean(brandIdentity.allowEmployeeViewReports));
                      setIsEmployeeProfileModalOpen(true);
                    }}
                    className={`w-full text-left p-4 border rounded-xl transition-colors ${p.key === 'EMPLOYEE' ? 'hover:border-blue-300 cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      {p.icon}
                      <span className="text-xs font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                        {p.count} usuário{p.count === 1 ? '' : 's'}
                      </span>
                    </div>
                    <p className="font-bold text-gray-900">{p.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{p.desc}</p>
                    {p.key === 'EMPLOYEE' && (
                      <p className="text-[11px] text-blue-600 font-bold mt-3">Configurar permissões</p>
                    )}
                  </button>
                ))}
              </div>

              <div className="rounded-2xl border border-gray-200 p-5 space-y-4">
                <div>
                  <h4 className="font-bold text-gray-900">Risco de Churn</h4>
                  <p className="text-xs text-gray-500 mt-1">Defina quantos dias sem retorno classificam o cliente como risco de churn na Visão Geral.</p>
                </div>

                <div className="max-w-xs">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Dias sem retorno</label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    step={1}
                    value={churnRiskDaysThreshold}
                    onChange={(event) => setChurnRiskDaysThreshold(Number(event.target.value || 0))}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {churnSettingsError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {churnSettingsError}
                  </div>
                )}

                {churnSettingsSuccess && (
                  <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                    {churnSettingsSuccess}
                  </div>
                )}

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => void handleSaveChurnSettings()}
                    disabled={isSavingChurnSettings}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSavingChurnSettings ? 'Salvando...' : 'Salvar limite de churn'}
                  </button>
                </div>
              </div>

              {isEmployeeProfileModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in">
                    <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold text-gray-900">Funcionário / Equipe</h3>
                      <button
                        onClick={() => {
                          if (isSavingProfileSettings) return;
                          setIsEmployeeProfileModalOpen(false);
                          setProfileSettingsError(null);
                          setProfileSettingsSuccess(null);
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div className="p-6 space-y-4">
                      <div className="rounded-xl border border-gray-200 p-4 flex items-start justify-between gap-4">
                        <div>
                          <p className="font-bold text-gray-900 text-sm">Permitir confirmar atendimento na Agenda</p>
                          <p className="text-xs text-gray-500 mt-1">Quando ativado, usuários do perfil Funcionário / Equipe podem concluir atendimento nos próprios agendamentos.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAllowEmployeeConfirmAppointment(prev => !prev)}
                          className={`w-12 h-6 rounded-full relative transition-colors shrink-0 ${allowEmployeeConfirmAppointment ? 'bg-blue-600' : 'bg-gray-300'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${allowEmployeeConfirmAppointment ? 'right-1' : 'left-1'}`}></div>
                        </button>
                      </div>

                      <div className="rounded-xl border border-gray-200 p-4 flex items-start justify-between gap-4">
                        <div>
                          <p className="font-bold text-gray-900 text-sm">Permitir criar agendamento na Agenda</p>
                          <p className="text-xs text-gray-500 mt-1">Quando ativado, usuários do perfil Funcionário / Equipe veem o botão Adicionar e podem cadastrar novos agendamentos.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAllowEmployeeCreateAppointment(prev => !prev)}
                          className={`w-12 h-6 rounded-full relative transition-colors shrink-0 ${allowEmployeeCreateAppointment ? 'bg-blue-600' : 'bg-gray-300'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${allowEmployeeCreateAppointment ? 'right-1' : 'left-1'}`}></div>
                        </button>
                      </div>

                      <div className="rounded-xl border border-gray-200 p-4 flex items-start justify-between gap-4">
                        <div>
                          <p className="font-bold text-gray-900 text-sm">Permitir visualizar Financeiro</p>
                          <p className="text-xs text-gray-500 mt-1">Quando ativado, usuários do perfil Funcionário / Equipe terão acesso à aba Financeiro apenas com seus próprios dados.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAllowEmployeeViewFinance(prev => !prev)}
                          className={`w-12 h-6 rounded-full relative transition-colors shrink-0 ${allowEmployeeViewFinance ? 'bg-blue-600' : 'bg-gray-300'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${allowEmployeeViewFinance ? 'right-1' : 'left-1'}`}></div>
                        </button>
                      </div>

                      <div className="rounded-xl border border-gray-200 p-4 flex items-start justify-between gap-4">
                        <div>
                          <p className="font-bold text-gray-900 text-sm">Permitir visualizar Relatórios</p>
                          <p className="text-xs text-gray-500 mt-1">Quando ativado, usuários do perfil Funcionário / Equipe terão acesso à aba Relatórios.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAllowEmployeeViewReports(prev => !prev)}
                          className={`w-12 h-6 rounded-full relative transition-colors shrink-0 ${allowEmployeeViewReports ? 'bg-blue-600' : 'bg-gray-300'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${allowEmployeeViewReports ? 'right-1' : 'left-1'}`}></div>
                        </button>
                      </div>

                      {profileSettingsError && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                          {profileSettingsError}
                        </div>
                      )}

                      {profileSettingsSuccess && (
                        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                          {profileSettingsSuccess}
                        </div>
                      )}

                      <div className="pt-2 flex gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            if (isSavingProfileSettings) return;
                            setIsEmployeeProfileModalOpen(false);
                            setProfileSettingsError(null);
                            setProfileSettingsSuccess(null);
                          }}
                          className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                        >
                          Fechar
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleSaveEmployeeProfileSettings()}
                          disabled={isSavingProfileSettings}
                          className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {isSavingProfileSettings ? 'Salvando...' : 'Salvar'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
              <div className="space-y-4">
                <h3 className="font-bold text-gray-800">Faturamento</h3>

                <nav className="flex overflow-x-auto pb-2 gap-2 no-scrollbar -mx-2 px-2">
                  <button
                    onClick={() => setActiveBillingTab('PLAN')}
                    className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                      activeBillingTab === 'PLAN'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                        : 'bg-white border border-gray-200 text-gray-600'
                    }`}
                  >
                    Plano
                  </button>
                  <button
                    onClick={() => setActiveBillingTab('UTILIZATION')}
                    className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                      activeBillingTab === 'UTILIZATION'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                        : 'bg-white border border-gray-200 text-gray-600'
                    }`}
                  >
                    Utilização
                  </button>
                  <button
                    onClick={() => setActiveBillingTab('PAYMENT')}
                    className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                      activeBillingTab === 'PAYMENT'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                        : 'bg-white border border-gray-200 text-gray-600'
                    }`}
                  >
                    Pagamento
                  </button>
                  <button
                    onClick={() => setActiveBillingTab('INVOICING')}
                    className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                      activeBillingTab === 'INVOICING'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                        : 'bg-white border border-gray-200 text-gray-600'
                    }`}
                  >
                    Faturamento
                  </button>
                </nav>
              </div>

              {activeBillingTab === 'PLAN' && (
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
              )}

              {activeBillingTab === 'UTILIZATION' && (
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
              )}

              {activeBillingTab === 'PAYMENT' && (
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
              )}

              {activeBillingTab === 'INVOICING' && (
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
              )}
            </div>
          )}

          {activeSubTab === 'INTEGRATIONS' && (
            <div className="space-y-8">
              <div className="space-y-4">
                <h3 className="font-bold text-gray-800">Integrações</h3>

                <nav className="flex overflow-x-auto pb-2 gap-2 no-scrollbar -mx-2 px-2">
                  <button
                    onClick={() => setActiveIntegrationTab('WHATSAPP')}
                    className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                      activeIntegrationTab === 'WHATSAPP'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                        : 'bg-white border border-gray-200 text-gray-600'
                    }`}
                  >
                    WhatsApp
                  </button>
                  <button
                    onClick={() => setActiveIntegrationTab('EMAIL')}
                    className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                      activeIntegrationTab === 'EMAIL'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                        : 'bg-white border border-gray-200 text-gray-600'
                    }`}
                  >
                    Email
                  </button>
                </nav>
              </div>

              {activeIntegrationTab === 'WHATSAPP' && <WhatsAppIntegration />}
              {activeIntegrationTab === 'EMAIL' && <EmailIntegration />}
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
                  className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all group text-center"
                >
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <MessageSquare size={24} />
                  </div>
                  <h4 className="font-bold text-gray-800 mb-1">WhatsApp</h4>
                  <p className="text-xs text-gray-500 mb-4">Resposta em até 15 min</p>
                  <div className="flex items-center justify-center gap-2 text-blue-600 font-bold text-sm">
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
                  className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all group text-center"
                >
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Phone size={24} />
                  </div>
                  <h4 className="font-bold text-gray-800 mb-1">Telefone</h4>
                  <p className="text-xs text-gray-500 mb-4">Atendimento imediato</p>
                  <div className="flex items-center justify-center gap-2 text-blue-600 font-bold text-sm">
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

                <nav className="flex overflow-x-auto pb-2 gap-2 no-scrollbar -mx-2 px-2">
                  <button
                    onClick={() => setActiveIdentityTab('LOGO')}
                    className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                      activeIdentityTab === 'LOGO'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                        : 'bg-white border border-gray-200 text-gray-600'
                    }`}
                  >
                    Logo
                  </button>
                  <button
                    onClick={() => setActiveIdentityTab('COLORS')}
                    className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                      activeIdentityTab === 'COLORS'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                        : 'bg-white border border-gray-200 text-gray-600'
                    }`}
                  >
                    Cores
                  </button>
                  <button
                    onClick={() => setActiveIdentityTab('OTHER_PREFERENCES')}
                    className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                      activeIdentityTab === 'OTHER_PREFERENCES'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                        : 'bg-white border border-gray-200 text-gray-600'
                    }`}
                  >
                    Outras Preferências
                  </button>
                </nav>

                {activeIdentityTab === 'LOGO' && (
                  <>
                    <div className="space-y-4">
                      <label className="block text-sm font-medium text-gray-700">Logo da Barbearia</label>

                      <div className="flex flex-wrap gap-6 items-start">
                        <div className="w-24 h-24 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 overflow-hidden relative group">
                          {safeIdentityAssetSrc(identityForm.logoUrl, 300000) ? (
                            <img src={safeIdentityAssetSrc(identityForm.logoUrl, 300000)} alt="Logo da barbearia" className="w-full h-full object-cover" />
                          ) : (
                            <BrandIcon name={identityForm.iconName} className="w-10 h-10" />
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold uppercase">
                            Preview
                          </div>
                        </div>

                        <div className="flex-1 space-y-4 min-w-[280px]">
                          <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleIdentityImageUpload('logoUrl')}
                            className="hidden"
                          />
                          <div className="flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={() => logoInputRef.current?.click()}
                              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-fit"
                            >
                              <Upload size={14} /> Upload da logo
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIdentityForm(prev => ({ ...prev, logoUrl: undefined }));
                                setIdentityError(null);
                                setIdentitySuccess(null);
                              }}
                              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-fit disabled:opacity-50"
                              disabled={!identityForm.logoUrl}
                            >
                              Remover
                            </button>
                            <p className="text-xs text-gray-500">Use uma imagem de até 1MB.</p>
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
                                    setIdentityForm(prev => ({ ...prev, iconName: item.id, logoUrl: undefined }));
                                    setIdentityError(null);
                                    setIdentitySuccess(null);
                                  }}
                                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all border ${identityForm.iconName === item.id && !identityForm.logoUrl ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600'}`}
                                >
                                  <item.icon size={20} />
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
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
                  </>
                )}

                {activeIdentityTab === 'COLORS' && (
                  <>
                    <div className="space-y-6 pt-2">
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
                  </>
                )}
                {activeIdentityTab === 'OTHER_PREFERENCES' && (
                  <div className="space-y-4 pt-2">
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

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Logo da Tela de Login (opcional)</label>
                      <input
                        ref={loginLogoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleIdentityImageUpload('loginLogoUrl')}
                        className="hidden"
                      />
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden">
                          {safeIdentityAssetSrc(identityForm.loginLogoUrl, 300000) ? (
                            <img src={safeIdentityAssetSrc(identityForm.loginLogoUrl, 300000)} alt="Logo login" className="w-full h-full object-contain" />
                          ) : (
                            <Camera size={22} className="text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => loginLogoInputRef.current?.click()}
                            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-fit"
                          >
                            <Upload size={14} /> Upload da logo
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIdentityForm(prev => ({ ...prev, loginLogoUrl: undefined }));
                              setIdentityError(null);
                              setIdentitySuccess(null);
                            }}
                            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-fit disabled:opacity-50"
                            disabled={!identityForm.loginLogoUrl}
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                      <div className="mt-4">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Ou selecione um modelo</p>
                        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                          {LOGIN_LOGO_TEMPLATES.map((item) => {
                            const isSelected = identityForm.loginLogoUrl === item.url;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                  setIdentityForm(prev => ({ ...prev, loginLogoUrl: item.url }));
                                  setIdentityError(null);
                                  setIdentitySuccess(null);
                                }}
                                className={`h-12 rounded-lg border p-1 bg-white transition-all ${isSelected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200 hover:border-gray-300'}`}
                                title={item.name}
                                aria-label={`Selecionar modelo ${item.name}`}
                              >
                                <img src={item.url} alt={item.name} className="w-full h-full object-contain" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Imagem de Fundo da Tela de Login (opcional)</label>
                      <input
                        ref={loginBackgroundInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleIdentityImageUpload('loginBackgroundUrl')}
                        className="hidden"
                      />
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => loginBackgroundInputRef.current?.click()}
                          className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-fit"
                        >
                          <Upload size={14} /> Upload do fundo
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIdentityForm(prev => ({ ...prev, loginBackgroundUrl: undefined }));
                            setIdentityError(null);
                            setIdentitySuccess(null);
                          }}
                          className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-fit disabled:opacity-50"
                          disabled={!identityForm.loginBackgroundUrl}
                        >
                          Remover
                        </button>
                      </div>
                      <div
                        className="mt-3 h-24 rounded-lg border border-gray-200 bg-cover bg-center flex items-center justify-center bg-gray-50"
                        style={safeIdentityAssetSrc(identityForm.loginBackgroundUrl, 3200000)
                          ? { backgroundImage: `url('${safeIdentityAssetSrc(identityForm.loginBackgroundUrl, 3200000)}')` }
                          : undefined}
                      >
                        {!safeIdentityAssetSrc(identityForm.loginBackgroundUrl, 3200000) && <Camera size={22} className="text-gray-400" />}
                      </div>
                      <div className="mt-4">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Ou selecione um modelo de fundo</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {LOGIN_BACKGROUND_TEMPLATES.map((item) => {
                            const isSelected = identityForm.loginBackgroundUrl === item.url;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                  setIdentityForm(prev => ({ ...prev, loginBackgroundUrl: item.url }));
                                  setIdentityError(null);
                                  setIdentitySuccess(null);
                                }}
                                className={`h-16 rounded-lg border overflow-hidden bg-white transition-all ${isSelected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200 hover:border-gray-300'}`}
                                title={item.name}
                                aria-label={`Selecionar ${item.name}`}
                              >
                                <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
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
                )}
              </div>
            </div>
          )}

          {activeSubTab === 'ONBOARDING' && (
            <div className="space-y-8">
              <div className="space-y-6">
                <h3 className="font-bold text-gray-800">Onboarding</h3>
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
          )}
        </div>
      </div>
    </div>
  );
};

const FinanceManagement = () => {
  type FinancePeriod = 'TODAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'THIS_MONTH' | 'CUSTOM';

  const { user, brandIdentity } = useAppContext();
  const isAdminFinanceUser = user?.role === 'ADMIN';
  const isEmployeeFinanceUser = user?.role === 'EMPLOYEE';
  const employeeCanViewFinance = Boolean(brandIdentity.allowEmployeeViewFinance);
  const isReadOnlyFinance = !isAdminFinanceUser;
  const [receivables, setReceivables] = useState<RecebivelApi[]>([]);
  const [professionalFilter, setProfessionalFilter] = useState<string>('ALL');
  const [professionalOptions, setProfessionalOptions] = useState<Array<{ id: string; nome: string }>>([]);
  const [period, setPeriod] = useState<FinancePeriod>('LAST_30_DAYS');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'LAST_ATTENDANCE' | 'DESCRIPTION' | 'PROFESSIONAL' | 'BRUTO' | 'RECEBIDO' | 'ESTORNADO' | 'SALDO' | 'COMMISSION' | 'STATUS'>('LAST_ATTENDANCE');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [actionModal, setActionModal] = useState<{
    open: boolean;
    type: 'PAYMENT' | 'REFUND';
    receivable: RecebivelApi | null;
  }>({
    open: false,
    type: 'PAYMENT',
    receivable: null,
  });
  const [paymentValue, setPaymentValue] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [actionReason, setActionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const PAGE_SIZE = 10;
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    if (!customEndDate) {
      setCustomEndDate(todayIso);
    }
    if (!customStartDate) {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      setCustomStartDate(d.toISOString().slice(0, 10));
    }
  }, [customEndDate, customStartDate, todayIso]);

  useEffect(() => {
    const end = new Date();
    end.setHours(0, 0, 0, 0);

    if (period === 'TODAY') {
      const iso = end.toISOString().slice(0, 10);
      setStartDateFilter(iso);
      setEndDateFilter(iso);
      return;
    }

    if (period === 'LAST_7_DAYS') {
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      setStartDateFilter(start.toISOString().slice(0, 10));
      setEndDateFilter(end.toISOString().slice(0, 10));
      return;
    }

    if (period === 'LAST_30_DAYS') {
      const start = new Date(end);
      start.setDate(start.getDate() - 29);
      setStartDateFilter(start.toISOString().slice(0, 10));
      setEndDateFilter(end.toISOString().slice(0, 10));
      return;
    }

    if (period === 'THIS_MONTH') {
      const monthStart = new Date(end.getFullYear(), end.getMonth(), 1);
      setStartDateFilter(monthStart.toISOString().slice(0, 10));
      setEndDateFilter(end.toISOString().slice(0, 10));
      return;
    }

    setStartDateFilter(customStartDate || todayIso);
    setEndDateFilter(customEndDate || todayIso);
  }, [period, customStartDate, customEndDate, todayIso]);

  const loadFinanceData = async () => {
    if (!isAdminFinanceUser && (!isEmployeeFinanceUser || !employeeCanViewFinance)) {
      setIsLoading(false);
      setReceivables([]);
      setErrorMessage('Seu perfil não possui acesso ao Financeiro.');
      return;
    }

    const token = localStorage.getItem('auth_token');
    if (!token) {
      setIsLoading(false);
      setReceivables([]);
      setErrorMessage('Sessão expirada. Faça login novamente para acessar o Financeiro.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const receivablesResponse = await listRecebiveisApi({
      profissional_id: isAdminFinanceUser
        ? (professionalFilter === 'ALL' ? undefined : professionalFilter)
        : undefined,
      data_inicio: startDateFilter || undefined,
      data_fim: endDateFilter || undefined,
      limit: 500,
    });

    if (!receivablesResponse.success) {
      setErrorMessage('error' in receivablesResponse ? receivablesResponse.error : 'Falha ao carregar recebíveis.');
      setIsLoading(false);
      return;
    }

    if (isAdminFinanceUser) {
      const professionalsResponse = await listProfissionaisApi();
      if (professionalsResponse.success) {
        setProfessionalOptions(
          (professionalsResponse.data || []).map((item) => ({
            id: String(item.id || ''),
            nome: String(item.nome || 'Profissional'),
          })),
        );
      }
    } else {
      setProfessionalOptions([]);
    }

    setReceivables(receivablesResponse.data || []);
    setCurrentPage(1);
    setIsLoading(false);
  };

  useEffect(() => {
    loadFinanceData();
  }, [professionalFilter, startDateFilter, endDateFilter, isAdminFinanceUser, isEmployeeFinanceUser, employeeCanViewFinance]);

  const clearFilters = () => {
    setProfessionalFilter('ALL');
    setPeriod('LAST_30_DAYS');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  const openPaymentModal = (receivable: RecebivelApi) => {
    setActionModal({ open: true, type: 'PAYMENT', receivable });
    const saldo = Math.max(
      Number(receivable.valor_bruto || 0) - Number(receivable.valor_recebido || 0) + Number(receivable.valor_estornado || 0),
      0,
    );
    setPaymentValue(saldo > 0 ? saldo.toFixed(2) : '0.00');
    setPaymentMethod('PIX');
    setActionReason('');
  };

  const openRefundModal = (receivable: RecebivelApi) => {
    setActionModal({ open: true, type: 'REFUND', receivable });
    const maxRefund = Math.max(Number(receivable.valor_recebido || 0) - Number(receivable.valor_estornado || 0), 0);
    setPaymentValue(maxRefund > 0 ? maxRefund.toFixed(2) : '0.00');
    setPaymentMethod('ESTORNO');
    setActionReason('');
  };

  const closeActionModal = () => {
    setActionModal({ open: false, type: 'PAYMENT', receivable: null });
    setPaymentValue('');
    setPaymentMethod('PIX');
    setActionReason('');
    setIsSubmitting(false);
  };

  const handleSubmitAction = async () => {
    if (!actionModal.receivable) return;

    const numericValue = Number(paymentValue);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      setErrorMessage('Informe um valor válido maior que zero.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    if (actionModal.type === 'PAYMENT') {
      const response = await registrarPagamentoRecebivelApi(actionModal.receivable.id, {
        valor: numericValue,
        metodo_pagamento: paymentMethod,
        motivo: actionReason || undefined,
      });

      if (!response.success) {
        setErrorMessage('error' in response ? response.error : 'Falha ao registrar pagamento.');
        setIsSubmitting(false);
        return;
      }
    } else {
      if (!actionReason.trim()) {
        setErrorMessage('Informe o motivo do estorno.');
        setIsSubmitting(false);
        return;
      }

      const response = await registrarEstornoRecebivelApi(actionModal.receivable.id, {
        valor: numericValue,
        motivo: actionReason.trim(),
      });

      if (!response.success) {
        setErrorMessage('error' in response ? response.error : 'Falha ao registrar estorno.');
        setIsSubmitting(false);
        return;
      }
    }

    closeActionModal();
    await loadFinanceData();
  };

  const totalSaldoLista = useMemo(
    () =>
      receivables.reduce((acc, row) => {
        const saldo = Number(row.valor_bruto || 0) - Number(row.valor_recebido || 0) + Number(row.valor_estornado || 0);
        return acc + Math.max(saldo, 0);
      }, 0),
    [receivables],
  );

  const getLastAttendanceTimestamp = (row: RecebivelApi) => {
    const date = String(row.agendamento_data || '').slice(0, 10);
    const time = String(row.agendamento_hora_inicio || '').slice(0, 5) || '00:00';
    if (date) {
      const value = Date.parse(`${date}T${time}:00`);
      if (!Number.isNaN(value)) return value;
    }
    return Date.parse(row.created_at || '') || 0;
  };

  const getRowSaldo = (row: RecebivelApi) => {
    return Math.max(
      Number(row.valor_bruto || 0) - Number(row.valor_recebido || 0) + Number(row.valor_estornado || 0),
      0,
    );
  };

  const getRowCommissionEstimate = (row: RecebivelApi) => {
    if (typeof row.comissao_estimada === 'number') {
      return Number(row.comissao_estimada || 0);
    }

    const percentual = Number(row.comissao_percentual || 0);
    const recebidoLiquido = Math.max(Number(row.valor_recebido || 0) - Number(row.valor_estornado || 0), 0);
    return Number(((recebidoLiquido * percentual) / 100).toFixed(2));
  };

  const summary = useMemo<FinanceiroResumoApi>(() => {
    const total_recebiveis = receivables.length;
    let a_receber = 0;
    let recebido_bruto = 0;
    let estornado = 0;
    let quitado = 0;
    let comissao_estimada = 0;

    receivables.forEach((row) => {
      const valorBruto = Number(row.valor_bruto || 0);
      const valorRecebido = Number(row.valor_recebido || 0);
      const valorEstornado = Number(row.valor_estornado || 0);
      const status = String(row.status || '');

      if (status === 'OPEN' || status === 'PARTIAL') {
        a_receber += Math.max(valorBruto - valorRecebido + valorEstornado, 0);
      }
      if (status === 'PAID' || status === 'PARTIAL' || status === 'REFUNDED') {
        recebido_bruto += valorRecebido;
      }
      if (status === 'PAID') {
        quitado += valorBruto;
      }
      estornado += valorEstornado;
      comissao_estimada += getRowCommissionEstimate(row);
    });

    return {
      total_recebiveis,
      a_receber,
      recebido_bruto,
      estornado,
      recebido_liquido: recebido_bruto - estornado,
      quitado,
      comissao_estimada,
    };
  }, [receivables]);

  const filteredSortedReceivables = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const filtered = !query
      ? [...receivables]
      : receivables.filter((row) => {
          const statusText = String(row.status || '').toLowerCase();
          const haystack = [
            row.descricao || '',
            row.cliente_nome || '',
            row.servico_nome || '',
            row.profissional_nome || '',
            row.competencia || '',
            row.agendamento_data || '',
            statusText,
          ]
            .join(' ')
            .toLowerCase();
          return haystack.includes(query);
        });

    const multiplier = sortDirection === 'asc' ? 1 : -1;

    filtered.sort((left, right) => {
      if (sortBy === 'LAST_ATTENDANCE') {
        return (getLastAttendanceTimestamp(left) - getLastAttendanceTimestamp(right)) * multiplier;
      }
      if (sortBy === 'DESCRIPTION') {
        return String(left.descricao || '').localeCompare(String(right.descricao || '')) * multiplier;
      }
      if (sortBy === 'PROFESSIONAL') {
        return String(left.profissional_nome || '').localeCompare(String(right.profissional_nome || '')) * multiplier;
      }
      if (sortBy === 'BRUTO') {
        return (Number(left.valor_bruto || 0) - Number(right.valor_bruto || 0)) * multiplier;
      }
      if (sortBy === 'RECEBIDO') {
        return (Number(left.valor_recebido || 0) - Number(right.valor_recebido || 0)) * multiplier;
      }
      if (sortBy === 'ESTORNADO') {
        return (Number(left.valor_estornado || 0) - Number(right.valor_estornado || 0)) * multiplier;
      }
      if (sortBy === 'SALDO') {
        return (getRowSaldo(left) - getRowSaldo(right)) * multiplier;
      }
      if (sortBy === 'COMMISSION') {
        return (getRowCommissionEstimate(left) - getRowCommissionEstimate(right)) * multiplier;
      }
      if (sortBy === 'STATUS') {
        return String(left.status || '').localeCompare(String(right.status || '')) * multiplier;
      }
      return 0;
    });

    return filtered;
  }, [receivables, searchTerm, sortBy, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filteredSortedReceivables.length / PAGE_SIZE));
  const paginatedReceivables = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredSortedReceivables.slice(start, start + PAGE_SIZE);
  }, [filteredSortedReceivables, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, professionalFilter, startDateFilter, endDateFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const toggleSort = (column: 'LAST_ATTENDANCE' | 'DESCRIPTION' | 'PROFESSIONAL' | 'BRUTO' | 'RECEBIDO' | 'ESTORNADO' | 'SALDO' | 'COMMISSION' | 'STATUS') => {
    if (sortBy === column) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(column);
    setSortDirection(column === 'LAST_ATTENDANCE' ? 'desc' : 'asc');
  };

  const sortIndicator = (column: 'LAST_ATTENDANCE' | 'DESCRIPTION' | 'PROFESSIONAL' | 'BRUTO' | 'RECEBIDO' | 'ESTORNADO' | 'SALDO' | 'COMMISSION' | 'STATUS') => {
    if (sortBy !== column) return '↕';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const statusChip = (status: RecebivelApi['status']) => {
    switch (status) {
      case 'OPEN':
        return 'bg-yellow-100 text-yellow-700';
      case 'PARTIAL':
        return 'bg-blue-100 text-blue-700';
      case 'PAID':
        return 'bg-green-100 text-green-700';
      case 'REFUNDED':
        return 'bg-red-100 text-red-700';
      case 'CANCELLED':
        return 'bg-gray-200 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const statusLabel = (status: RecebivelApi['status']) => {
    switch (status) {
      case 'OPEN':
        return 'Em aberto';
      case 'PARTIAL':
        return 'Parcial';
      case 'PAID':
        return 'Quitado';
      case 'REFUNDED':
        return 'Estornado';
      case 'CANCELLED':
        return 'Cancelado';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Financeiro</h2>
          <p className="text-sm text-gray-500">
            {isReadOnlyFinance
              ? 'Visualização dos seus detalhes financeiros e comissão estimada.'
              : 'Recebimentos, pagamentos parciais e estornos.'}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Pesquisar por cliente, serviço, profissional..."
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm sm:col-span-2"
          />
          {isAdminFinanceUser && (
            <select
              value={professionalFilter}
              onChange={(event) => setProfessionalFilter(event.target.value)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
            >
              <option value="ALL">Todos os profissionais</option>
              {professionalOptions.map((item) => (
                <option key={item.id} value={item.id}>{item.nome}</option>
              ))}
            </select>
          )}
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value as FinancePeriod)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
            aria-label="Período"
          >
            <option value="TODAY">Hoje</option>
            <option value="LAST_7_DAYS">Últimos 7 dias</option>
            <option value="LAST_30_DAYS">Últimos 30 dias</option>
            <option value="THIS_MONTH">Este mês</option>
            <option value="CUSTOM">Personalizado</option>
          </select>
        </div>

        {period === 'CUSTOM' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="date"
              value={customStartDate}
              max={customEndDate || undefined}
              onChange={(event) => setCustomStartDate(event.target.value)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
              aria-label="Data inicial"
            />
            <input
              type="date"
              value={customEndDate}
              min={customStartDate || undefined}
              onChange={(event) => setCustomEndDate(event.target.value)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
              aria-label="Data final"
            />
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <button
            onClick={loadFinanceData}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Atualizar
          </button>
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Limpar filtros
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-yellow-500">
            <p className="text-xs text-gray-500">A receber</p>
            <p className="text-2xl font-bold text-gray-800">R$ {safeMoney(summary.a_receber)}</p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-green-500">
            <p className="text-xs text-gray-500">Recebido líquido</p>
            <p className="text-2xl font-bold text-gray-800">R$ {safeMoney(summary.recebido_liquido)}</p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-blue-500">
            <p className="text-xs text-gray-500">Quitado</p>
            <p className="text-2xl font-bold text-gray-800">R$ {safeMoney(summary.quitado)}</p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-indigo-500">
            <p className="text-xs text-gray-500">Comissão estimada</p>
            <p className="text-2xl font-bold text-gray-800">R$ {safeMoney(summary.comissao_estimada)}</p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-red-500">
            <p className="text-xs text-gray-500">Estornado</p>
            <p className="text-2xl font-bold text-gray-800">R$ {safeMoney(summary.estornado)}</p>
          </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50/60 flex justify-between items-center">
          <h3 className="font-bold text-gray-800">Recebíveis</h3>
          <span className="text-sm text-gray-500">Saldo em lista: R$ {safeMoney(totalSaldoLista)} • {filteredSortedReceivables.length} registro(s)</span>
        </div>

        {errorMessage && (
          <div className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-medium">
              <tr>
                <th className="px-6 py-3">
                  <button onClick={() => toggleSort('LAST_ATTENDANCE')} className="font-medium hover:text-gray-800">
                    Último atendimento {sortIndicator('LAST_ATTENDANCE')}
                  </button>
                </th>
                <th className="px-6 py-3">
                  <button onClick={() => toggleSort('DESCRIPTION')} className="font-medium hover:text-gray-800">
                    Descrição {sortIndicator('DESCRIPTION')}
                  </button>
                </th>
                <th className="px-6 py-3">
                  <button onClick={() => toggleSort('PROFESSIONAL')} className="font-medium hover:text-gray-800">
                    Profissional {sortIndicator('PROFESSIONAL')}
                  </button>
                </th>
                <th className="px-6 py-3">
                  <button onClick={() => toggleSort('BRUTO')} className="font-medium hover:text-gray-800">
                    Bruto {sortIndicator('BRUTO')}
                  </button>
                </th>
                <th className="px-6 py-3">
                  <button onClick={() => toggleSort('RECEBIDO')} className="font-medium hover:text-gray-800">
                    Recebido {sortIndicator('RECEBIDO')}
                  </button>
                </th>
                <th className="px-6 py-3">
                  <button onClick={() => toggleSort('ESTORNADO')} className="font-medium hover:text-gray-800">
                    Estornado {sortIndicator('ESTORNADO')}
                  </button>
                </th>
                <th className="px-6 py-3">
                  <button onClick={() => toggleSort('SALDO')} className="font-medium hover:text-gray-800">
                    Saldo {sortIndicator('SALDO')}
                  </button>
                </th>
                <th className="px-6 py-3">
                  <button onClick={() => toggleSort('COMMISSION')} className="font-medium hover:text-gray-800">
                    Comissão estimada {sortIndicator('COMMISSION')}
                  </button>
                </th>
                <th className="px-6 py-3">
                  <button onClick={() => toggleSort('STATUS')} className="font-medium hover:text-gray-800">
                    Status {sortIndicator('STATUS')}
                  </button>
                </th>
                {!isReadOnlyFinance && <th className="px-6 py-3 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading && (
                <tr>
                  <td colSpan={isReadOnlyFinance ? 9 : 10} className="px-6 py-8 text-center text-gray-500">Carregando financeiro...</td>
                </tr>
              )}

              {!isLoading && paginatedReceivables.map((row) => {
                const saldo = getRowSaldo(row);
                const canPay = ['OPEN', 'PARTIAL'].includes(row.status) && saldo > 0;
                const canRefund = Number(row.valor_recebido || 0) - Number(row.valor_estornado || 0) > 0;

                return (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="font-medium text-gray-800">{safeDateBr(row.agendamento_data || null)}</div>
                      <div className="text-xs text-gray-500">{String(row.agendamento_hora_inicio || '').slice(0, 5) || '--:--'}</div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="font-medium text-gray-800">{row.descricao}</div>
                      <div className="text-xs text-gray-500">
                        {row.cliente_nome ? `${row.cliente_nome} • ` : ''}
                        {row.servico_nome || 'Serviço'}
                      </div>
                    </td>
                    <td className="px-6 py-3">{row.profissional_nome || 'Não informado'}</td>
                    <td className="px-6 py-3">R$ {safeMoney(row.valor_bruto)}</td>
                    <td className="px-6 py-3">R$ {safeMoney(row.valor_recebido)}</td>
                    <td className="px-6 py-3">R$ {safeMoney(row.valor_estornado)}</td>
                    <td className="px-6 py-3 font-semibold">R$ {safeMoney(saldo)}</td>
                    <td className="px-6 py-3">
                      <div className="font-semibold">R$ {safeMoney(getRowCommissionEstimate(row))}</div>
                      <div className="text-xs text-gray-500">{Number(row.comissao_percentual || 0).toFixed(2)}%</div>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${statusChip(row.status)}`}>
                        {statusLabel(row.status)}
                      </span>
                    </td>
                    {!isReadOnlyFinance && (
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openPaymentModal(row)}
                            disabled={!canPay}
                            className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Receber
                          </button>
                          <button
                            onClick={() => openRefundModal(row)}
                            disabled={!canRefund}
                            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Estornar
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}

              {!isLoading && paginatedReceivables.length === 0 && (
                <tr>
                  <td colSpan={isReadOnlyFinance ? 9 : 10} className="px-6 py-8 text-center text-gray-500">Nenhum recebível encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredSortedReceivables.length > 0 && (
          <div className="px-6 py-4 border-t bg-gray-50/60 flex flex-col md:flex-row items-center justify-between gap-3">
            <span className="text-sm text-gray-600">
              Página {currentPage} de {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {!isReadOnlyFinance && actionModal.open && actionModal.receivable && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800">
                {actionModal.type === 'PAYMENT' ? 'Registrar Pagamento' : 'Registrar Estorno'}
              </h3>
              <button onClick={closeActionModal} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-sm font-medium text-gray-700">{actionModal.receivable.descricao}</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Valor</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={paymentValue}
                  onChange={(event) => setPaymentValue(event.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {actionModal.type === 'PAYMENT' && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Forma de Pagamento</label>
                  <select
                    value={paymentMethod}
                    onChange={(event) => setPaymentMethod(event.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="PIX">PIX</option>
                    <option value="DINHEIRO">Dinheiro</option>
                    <option value="CARTAO_DEBITO">Cartão Débito</option>
                    <option value="CARTAO_CREDITO">Cartão Crédito</option>
                    <option value="TRANSFERENCIA">Transferência</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  {actionModal.type === 'PAYMENT' ? 'Observação (opcional)' : 'Motivo do Estorno'}
                </label>
                <textarea
                  value={actionReason}
                  onChange={(event) => setActionReason(event.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                />
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t flex gap-3">
              <button
                onClick={closeActionModal}
                className="flex-1 py-3 border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitAction}
                disabled={isSubmitting}
                className={`flex-1 py-3 text-white font-bold rounded-xl ${actionModal.type === 'PAYMENT' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} disabled:opacity-60`}
              >
                {isSubmitting ? 'Salvando...' : actionModal.type === 'PAYMENT' ? 'Confirmar Pagamento' : 'Confirmar Estorno'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

type AppointmentCenterPeriod = 'TODAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'THIS_MONTH' | 'CUSTOM';

const AppointmentCenterManagement = ({
  onOpenAgenda,
}: {
  onOpenAgenda: (payload: AgendaNavigationPayload) => void;
}) => {
  const { user, appointments, professionals, services, clients, transitionAppointmentStatus, brandIdentity } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [professionalFilter, setProfessionalFilter] = useState<string>('ALL');
  const [period, setPeriod] = useState<AppointmentCenterPeriod>('LAST_30_DAYS');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const PAGE_SIZE = 12;

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const isEmployeeUser = user?.role === 'EMPLOYEE';
  const allowEmployeeConfirmAppointment = Boolean(brandIdentity.allowEmployeeConfirmAppointment);

  useEffect(() => {
    if (!customEndDate) {
      setCustomEndDate(todayIso);
    }
    if (!customStartDate) {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      setCustomStartDate(d.toISOString().slice(0, 10));
    }
  }, [customEndDate, customStartDate, todayIso]);

  const dateRange = useMemo(() => {
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const start = new Date(end);

    if (period === 'TODAY') {
      const same = end.toISOString().slice(0, 10);
      return { startDate: same, endDate: same };
    }

    if (period === 'LAST_7_DAYS') {
      start.setDate(start.getDate() - 6);
      return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
    }

    if (period === 'LAST_30_DAYS') {
      start.setDate(start.getDate() - 29);
      return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
    }

    if (period === 'THIS_MONTH') {
      const monthStart = new Date(end.getFullYear(), end.getMonth(), 1);
      return { startDate: monthStart.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
    }

    return {
      startDate: customStartDate || end.toISOString().slice(0, 10),
      endDate: customEndDate || end.toISOString().slice(0, 10),
    };
  }, [period, customStartDate, customEndDate]);

  const professionalsById = useMemo(() => {
    const byId = new Map<string, string>();
    professionals.forEach((professional) => byId.set(professional.id, professional.name));
    return byId;
  }, [professionals]);

  const servicesById = useMemo(() => {
    const byId = new Map<string, string>();
    services.forEach((service) => byId.set(service.id, service.title));
    return byId;
  }, [services]);

  const clientsById = useMemo(() => {
    const byId = new Map<string, { name: string; phone: string }>();
    clients.forEach((client) => byId.set(client.id, { name: client.name, phone: client.phone }));
    return byId;
  }, [clients]);

  const canTransitionStatus = (currentStatus: string, targetStatus: Appointment['status']) => {
    const normalizedCurrent = normalizeAppointmentStatus(currentStatus);
    const transitions: Record<string, Appointment['status'][]> = {
      PENDING_PAYMENT: ['CONFIRMED', 'CANCELLED', 'NO_SHOW', 'COMPLETED_FIN'],
      CONFIRMED: ['IN_PROGRESS', 'CANCELLED', 'REOPENED', 'NO_SHOW', 'COMPLETED_FIN'],
      IN_PROGRESS: ['COMPLETED_OP', 'CANCELLED', 'NO_SHOW', 'COMPLETED_FIN'],
      COMPLETED_OP: ['COMPLETED_FIN', 'REOPENED'],
      COMPLETED_FIN: ['REOPENED'],
      REOPENED: ['IN_PROGRESS', 'CANCELLED', 'NO_SHOW', 'COMPLETED_FIN'],
      NO_SHOW: ['REOPENED'],
    };
    return (transitions[normalizedCurrent] || []).includes(targetStatus);
  };

  const filteredAppointments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    const rows = appointments.filter((appointment) => {
      if (isEmployeeUser && appointment.professionalId !== user?.id) {
        return false;
      }

      const date = String(appointment.date || '').slice(0, 10);
      if (date < dateRange.startDate || date > dateRange.endDate) {
        return false;
      }

      const normalizedStatus = normalizeAppointmentStatus(appointment.status);
      if (statusFilter !== 'ALL' && normalizedStatus !== statusFilter) {
        return false;
      }

      if (professionalFilter !== 'ALL' && appointment.professionalId !== professionalFilter) {
        return false;
      }

      if (!query) return true;

      const client = clientsById.get(appointment.clientId);
      const professionalName = professionalsById.get(appointment.professionalId) || '';
      const serviceName = servicesById.get(appointment.serviceId) || '';
      const statusLabel = getAppointmentStatusLabel(appointment.status);
      const dateBr = safeDateBr(appointment.date);
      const haystack = [
        client?.name || '',
        client?.phone || '',
        professionalName,
        serviceName,
        statusLabel,
        appointment.date || '',
        dateBr,
        appointment.time || '',
      ].join(' ').toLowerCase();

      return haystack.includes(query);
    });

    rows.sort((left, right) => {
      const leftKey = `${left.date || ''}T${left.time || '00:00'}`;
      const rightKey = `${right.date || ''}T${right.time || '00:00'}`;
      return rightKey.localeCompare(leftKey);
    });

    return rows;
  }, [appointments, searchTerm, statusFilter, professionalFilter, dateRange, isEmployeeUser, user?.id, clientsById, professionalsById, servicesById]);

  const totalPages = Math.max(1, Math.ceil(filteredAppointments.length / PAGE_SIZE));
  const paginatedAppointments = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredAppointments.slice(start, start + PAGE_SIZE);
  }, [filteredAppointments, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, professionalFilter, period, customStartDate, customEndDate]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleTransition = async (appointment: Appointment, target: Appointment['status']) => {
    if (isTransitioning) return;
    setActionError(null);

    if (isEmployeeUser && appointment.professionalId !== user?.id) {
      setActionError('Você só pode gerenciar seus próprios agendamentos.');
      return;
    }

    if (!canTransitionStatus(appointment.status, target)) {
      setActionError('Transição de status inválida para este agendamento.');
      return;
    }

    if (target === 'COMPLETED_FIN' && isEmployeeUser && !allowEmployeeConfirmAppointment) {
      setActionError('Seu perfil não possui permissão para concluir financeiro.');
      return;
    }

    const needsConfirm = target === 'CANCELLED' || target === 'REOPENED' || target === 'COMPLETED_FIN';
    if (needsConfirm && !window.confirm(`Confirmar ação: ${getAppointmentStatusLabel(target)}?`)) {
      return;
    }

    const options = target === 'COMPLETED_FIN'
      ? {
          paymentMethod: appointment.paymentMethod || 'PIX',
          totalValue: Number(appointment.totalValue || 0),
          observation: 'Concluído pela Central de Agendamentos',
        }
      : target === 'CANCELLED'
        ? { reason: 'Cancelado pela Central de Agendamentos' }
        : target === 'REOPENED'
          ? { reason: 'Reaberto pela Central de Agendamentos' }
          : {};

    setIsTransitioning(true);
    const result = await transitionAppointmentStatus(appointment.id, target, options);
    setIsTransitioning(false);

    if (!result.success) {
      setActionError(result.error || 'Não foi possível atualizar o status.');
    }
  };

  const openInAgenda = (appointment: Appointment, openDetails = false) => {
    onOpenAgenda({
      date: appointment.date,
      viewMode: 'DAY',
      appointmentId: appointment.id,
      openDetails,
    });
  };

  const statusOptions = [
    'ALL',
    'PENDING_PAYMENT',
    'CONFIRMED',
    'IN_PROGRESS',
    'COMPLETED_OP',
    'COMPLETED_FIN',
    'REOPENED',
    'NO_SHOW',
    'CANCELLED',
    'BLOCKED',
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Central de Agendamentos</h2>
        <p className="text-sm text-gray-500">Busca, filtros avançados e ações operacionais em uma única tela.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 md:p-5 border border-gray-100 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="xl:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Buscar</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Cliente, telefone, profissional, serviço, data ou horário"
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>{status === 'ALL' ? 'Todos' : getAppointmentStatusLabel(status)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Profissional</label>
            <select
              value={professionalFilter}
              onChange={(event) => setProfessionalFilter(event.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
            >
              <option value="ALL">Todos</option>
              {professionals
                .filter((professional) => !isEmployeeUser || professional.id === user?.id)
                .map((professional) => (
                  <option key={professional.id} value={professional.id}>{professional.name}</option>
                ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Período</label>
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value as AppointmentCenterPeriod)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
            >
              <option value="TODAY">Hoje</option>
              <option value="LAST_7_DAYS">Últimos 7 dias</option>
              <option value="LAST_30_DAYS">Últimos 30 dias</option>
              <option value="THIS_MONTH">Este mês</option>
              <option value="CUSTOM">Personalizado</option>
            </select>
          </div>
          {period === 'CUSTOM' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Data inicial</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(event) => setCustomStartDate(event.target.value)}
                  max={customEndDate || undefined}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Data final</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(event) => setCustomEndDate(event.target.value)}
                  min={customStartDate || undefined}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                />
              </div>
            </>
          )}
        </div>

        {actionError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {actionError}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="px-6 py-4 border-b bg-gray-50/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h3 className="font-bold text-gray-800">Agendamentos</h3>
          <span className="text-sm text-gray-500">{filteredAppointments.length} registro(s)</span>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-medium">
              <tr>
                <th className="px-6 py-3">Data / Hora</th>
                <th className="px-6 py-3">Cliente</th>
                <th className="px-6 py-3">Serviço</th>
                <th className="px-6 py-3">Profissional</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Valor</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paginatedAppointments.map((appointment) => {
                const status = normalizeAppointmentStatus(appointment.status);
                const canCompleteFin = canTransitionStatus(status, 'COMPLETED_FIN') && (!isEmployeeUser || allowEmployeeConfirmAppointment);
                const canCancel = canTransitionStatus(status, 'CANCELLED');
                const canReopen = canTransitionStatus(status, 'REOPENED') && !isEmployeeUser;
                const clientInfo = clientsById.get(appointment.clientId);

                return (
                  <tr key={appointment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="font-medium text-gray-800">{safeDateBr(appointment.date)}</div>
                      <div className="text-xs text-gray-500">{appointment.time}{appointment.endTime ? ` - ${appointment.endTime}` : ''}</div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="font-medium text-gray-800">{status === 'BLOCKED' ? 'Horário bloqueado' : (clientInfo?.name || 'Cliente removido')}</div>
                      <div className="text-xs text-gray-500">{status === 'BLOCKED' ? (appointment.blockReason || 'Indisponível para clientes') : (clientInfo?.phone || '')}</div>
                    </td>
                    <td className="px-6 py-3">{status === 'BLOCKED' ? 'Bloqueio de agenda' : (servicesById.get(appointment.serviceId) || 'Serviço removido')}</td>
                    <td className="px-6 py-3">{professionalsById.get(appointment.professionalId) || 'Profissional removido'}</td>
                    <td className="px-6 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${getAppointmentStatusChipClass(status)}`}>
                        {getAppointmentStatusLabel(status)}
                      </span>
                    </td>
                    <td className="px-6 py-3">R$ {safeMoney(appointment.totalValue)}</td>
                    <td className="px-6 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openInAgenda(appointment, true)}
                          className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs hover:bg-gray-50"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => openInAgenda(appointment, false)}
                          className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs hover:bg-gray-50"
                        >
                          Agenda
                        </button>
                        <button
                          onClick={() => handleTransition(appointment, 'COMPLETED_FIN')}
                          disabled={!canCompleteFin || isTransitioning}
                          className="px-2.5 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => handleTransition(appointment, 'CANCELLED')}
                          disabled={!canCancel || isTransitioning}
                          className="px-2.5 py-1.5 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleTransition(appointment, 'REOPENED')}
                          disabled={!canReopen || isTransitioning}
                          className="px-2.5 py-1.5 bg-orange-500 text-white rounded-lg text-xs hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Reabrir
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {paginatedAppointments.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">Nenhum agendamento encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y">
          {paginatedAppointments.map((appointment) => {
            const status = normalizeAppointmentStatus(appointment.status);
            const canCompleteFin = canTransitionStatus(status, 'COMPLETED_FIN') && (!isEmployeeUser || allowEmployeeConfirmAppointment);
            const canCancel = canTransitionStatus(status, 'CANCELLED');
            const canReopen = canTransitionStatus(status, 'REOPENED') && !isEmployeeUser;
            const clientInfo = clientsById.get(appointment.clientId);

            return (
              <div key={appointment.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-800">{status === 'BLOCKED' ? 'Horário bloqueado' : (clientInfo?.name || 'Cliente removido')}</p>
                    <p className="text-xs text-gray-500">{safeDateBr(appointment.date)} • {appointment.time}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${getAppointmentStatusChipClass(status)}`}>
                    {getAppointmentStatusLabel(status)}
                  </span>
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  <p><span className="font-medium">Profissional:</span> {professionalsById.get(appointment.professionalId) || 'Profissional removido'}</p>
                  <p><span className="font-medium">Serviço:</span> {status === 'BLOCKED' ? 'Bloqueio de agenda' : (servicesById.get(appointment.serviceId) || 'Serviço removido')}</p>
                  <p><span className="font-medium">Valor:</span> R$ {safeMoney(appointment.totalValue)}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => openInAgenda(appointment, true)} className="px-3 py-2 border border-gray-200 rounded-lg text-xs">Editar</button>
                  <button onClick={() => openInAgenda(appointment, false)} className="px-3 py-2 border border-gray-200 rounded-lg text-xs">Agenda</button>
                  <button onClick={() => handleTransition(appointment, 'COMPLETED_FIN')} disabled={!canCompleteFin || isTransitioning} className="px-3 py-2 bg-green-600 text-white rounded-lg text-xs disabled:opacity-40">Confirmar</button>
                  <button onClick={() => handleTransition(appointment, 'CANCELLED')} disabled={!canCancel || isTransitioning} className="px-3 py-2 bg-red-600 text-white rounded-lg text-xs disabled:opacity-40">Cancelar</button>
                  <button onClick={() => handleTransition(appointment, 'REOPENED')} disabled={!canReopen || isTransitioning} className="px-3 py-2 bg-orange-500 text-white rounded-lg text-xs disabled:opacity-40 col-span-2">Reabrir</button>
                </div>
              </div>
            );
          })}

          {paginatedAppointments.length === 0 && (
            <div className="px-6 py-8 text-center text-gray-500 text-sm">Nenhum agendamento encontrado.</div>
          )}
        </div>

        {filteredAppointments.length > 0 && (
          <div className="px-6 py-4 border-t bg-gray-50/60 flex flex-col md:flex-row items-center justify-between gap-3">
            <span className="text-sm text-gray-600">Página {currentPage} de {totalPages}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
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

type ReportKey = 'FINANCIAL' | 'OCCUPANCY' | 'PROFESSIONAL' | 'CLIENTS' | 'SERVICES';
type ReportPeriod = 'TODAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'THIS_MONTH' | 'CUSTOM';

type ReportColumn = {
  key: string;
  label: string;
};

type ReportCard = {
  label: string;
  value: string;
};

type ReportData = {
  title: string;
  description: string;
  columns: ReportColumn[];
  rows: Array<Record<string, string | number>>;
  cards: ReportCard[];
};

const ReportsManagement = () => {
  const { appointments, professionals, services, clients, brandIdentity } = useAppContext();
  const [selectedReport, setSelectedReport] = useState<ReportKey>('FINANCIAL');
  const [sortBy, setSortBy] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [period, setPeriod] = useState<ReportPeriod>('LAST_30_DAYS');
  const [professionalFilter, setProfessionalFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  const reportOptions: Array<{ key: ReportKey; title: string; description: string }> = [
    { key: 'FINANCIAL', title: 'Faturamento e Recebimentos', description: 'Receita, ticket médio e volume de atendimentos.' },
    { key: 'OCCUPANCY', title: 'Agenda e Ocupação', description: 'Ocupação, no-show e cancelamentos por profissional.' },
    { key: 'PROFESSIONAL', title: 'Desempenho por Profissional', description: 'Produção, faturamento e comissão estimada.' },
    { key: 'CLIENTS', title: 'Clientes (CRM)', description: 'Recorrência, gasto e risco de churn.' },
    { key: 'SERVICES', title: 'Serviços e Mix de Vendas', description: 'Serviços mais vendidos e faturamento por serviço.' },
  ];

  const statusOptions = [
    'ALL',
    'PENDING_PAYMENT',
    'CONFIRMED',
    'IN_PROGRESS',
    'COMPLETED_OP',
    'COMPLETED_FIN',
    'REOPENED',
    'NO_SHOW',
    'CANCELLED',
  ];

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    if (!customEndDate) {
      setCustomEndDate(todayIso);
    }
    if (!customStartDate) {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      setCustomStartDate(d.toISOString().slice(0, 10));
    }
  }, [customEndDate, customStartDate, todayIso]);

  const dateRange = useMemo(() => {
    const end = new Date();
    end.setHours(0, 0, 0, 0);

    const start = new Date(end);

    if (period === 'TODAY') {
      return { startDate: end.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
    }

    if (period === 'LAST_7_DAYS') {
      start.setDate(start.getDate() - 6);
      return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
    }

    if (period === 'LAST_30_DAYS') {
      start.setDate(start.getDate() - 29);
      return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
    }

    if (period === 'THIS_MONTH') {
      const monthStart = new Date(end.getFullYear(), end.getMonth(), 1);
      return { startDate: monthStart.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
    }

    return {
      startDate: customStartDate || end.toISOString().slice(0, 10),
      endDate: customEndDate || end.toISOString().slice(0, 10),
    };
  }, [period, customStartDate, customEndDate]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      const status = normalizeAppointmentStatus(appointment.status);
      if (status === 'BLOCKED') return false;

      if (professionalFilter !== 'ALL' && appointment.professionalId !== professionalFilter) {
        return false;
      }

      if (statusFilter !== 'ALL' && status !== statusFilter) {
        return false;
      }

      const date = String(appointment.date || '').slice(0, 10);
      return date >= dateRange.startDate && date <= dateRange.endDate;
    });
  }, [appointments, professionalFilter, statusFilter, dateRange]);

  const completedStatuses = new Set(['COMPLETED_OP', 'COMPLETED_FIN', 'COMPLETED']);

  const reportData = useMemo<ReportData>(() => {
    if (selectedReport === 'FINANCIAL') {
      const commissionByProfessional = new Map<string, number>(
        professionals.map((professional) => [professional.id, Number(professional.commissionPercentage || 0)])
      );
      const byDate = new Map<string, { total: number; profissional: number; barbearia: number; atendimentos: number }>();

      filteredAppointments.forEach((appointment) => {
        const normalizedStatus = normalizeAppointmentStatus(appointment.status);
        if (!completedStatuses.has(normalizedStatus)) return;

        const date = String(appointment.date || '').slice(0, 10);
        const current = byDate.get(date) || { total: 0, profissional: 0, barbearia: 0, atendimentos: 0 };
        const totalValue = Number(appointment.totalValue || 0);
        const commissionRate = Number(commissionByProfessional.get(appointment.professionalId) || 0);
        const professionalRevenue = totalValue * (commissionRate / 100);
        const barbershopRevenue = totalValue - professionalRevenue;

        current.total += totalValue;
        current.profissional += professionalRevenue;
        current.barbearia += barbershopRevenue;
        current.atendimentos += 1;
        byDate.set(date, current);
      });

      const rows = Array.from(byDate.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, values]) => ({
          Data: safeDateBr(date),
          Atendimentos: values.atendimentos,
          'Faturamento Barbearia': Number(values.barbearia.toFixed(2)),
          'Faturamento Profissional': Number(values.profissional.toFixed(2)),
          'Faturamento Total': Number(values.total.toFixed(2)),
          'Ticket Médio': values.atendimentos > 0 ? Number((values.total / values.atendimentos).toFixed(2)) : 0,
        }));

      const totalRevenue = rows.reduce((sum, row) => sum + Number(row['Faturamento Total'] || 0), 0);
      const totalBarbershopRevenue = rows.reduce((sum, row) => sum + Number(row['Faturamento Barbearia'] || 0), 0);
      const totalProfessionalRevenue = rows.reduce((sum, row) => sum + Number(row['Faturamento Profissional'] || 0), 0);
      const totalAppointments = rows.reduce((sum, row) => sum + Number(row.Atendimentos || 0), 0);
      const avgTicket = totalAppointments > 0 ? totalRevenue / totalAppointments : 0;
      const barbershopMargin = totalRevenue > 0 ? (totalBarbershopRevenue / totalRevenue) * 100 : 0;

      return {
        title: 'Faturamento e Recebimentos',
        description: 'Consolidação financeira por data no período filtrado.',
        columns: [
          { key: 'Data', label: 'Data' },
          { key: 'Atendimentos', label: 'Atendimentos' },
          { key: 'Faturamento Barbearia', label: 'Faturamento Barbearia (R$)' },
          { key: 'Faturamento Profissional', label: 'Faturamento Profissional (R$)' },
          { key: 'Faturamento Total', label: 'Faturamento Total (R$)' },
          { key: 'Ticket Médio', label: 'Ticket Médio (R$)' },
        ],
        rows,
        cards: [
          { label: 'Faturamento barbearia', value: `R$ ${safeMoney(totalBarbershopRevenue)}` },
          { label: 'Faturamento profissional', value: `R$ ${safeMoney(totalProfessionalRevenue)}` },
          { label: 'Faturamento total', value: `R$ ${safeMoney(totalRevenue)}` },
          { label: 'Margem barbearia', value: `${barbershopMargin.toFixed(1)}%` },
          { label: 'Atendimentos concluídos', value: `${totalAppointments}` },
          { label: 'Ticket médio', value: `R$ ${safeMoney(avgTicket)}` },
        ],
      };
    }

    if (selectedReport === 'OCCUPANCY') {
      const rows = professionals.map((professional) => {
        const items = filteredAppointments.filter((appointment) => appointment.professionalId === professional.id);
        const total = items.length;
        const noShow = items.filter((appointment) => normalizeAppointmentStatus(appointment.status) === 'NO_SHOW').length;
        const cancelled = items.filter((appointment) => normalizeAppointmentStatus(appointment.status) === 'CANCELLED').length;
        const concluded = items.filter((appointment) => completedStatuses.has(normalizeAppointmentStatus(appointment.status))).length;
        const occupancy = total > 0 ? (concluded / total) * 100 : 0;

        return {
          Profissional: professional.name,
          Agendamentos: total,
          Concluídos: concluded,
          'No-show': noShow,
          Cancelados: cancelled,
          'Taxa Ocupação (%)': Number(occupancy.toFixed(1)),
        };
      });

      return {
        title: 'Agenda e Ocupação',
        description: 'Eficiência operacional por profissional.',
        columns: [
          { key: 'Profissional', label: 'Profissional' },
          { key: 'Agendamentos', label: 'Agendamentos' },
          { key: 'Concluídos', label: 'Concluídos' },
          { key: 'No-show', label: 'No-show' },
          { key: 'Cancelados', label: 'Cancelados' },
          { key: 'Taxa Ocupação (%)', label: 'Taxa Ocupação (%)' },
        ],
        rows,
        cards: [
          { label: 'Agendamentos totais', value: `${rows.reduce((sum, row) => sum + Number(row.Agendamentos || 0), 0)}` },
          { label: 'No-show total', value: `${rows.reduce((sum, row) => sum + Number(row['No-show'] || 0), 0)}` },
          { label: 'Cancelamentos', value: `${rows.reduce((sum, row) => sum + Number(row.Cancelados || 0), 0)}` },
        ],
      };
    }

    if (selectedReport === 'PROFESSIONAL') {
      const rows = professionals.map((professional) => {
        const items = filteredAppointments.filter((appointment) => appointment.professionalId === professional.id);
        const concluded = items.filter((appointment) => completedStatuses.has(normalizeAppointmentStatus(appointment.status)));
        const revenue = concluded.reduce((sum, appointment) => sum + Number(appointment.totalValue || 0), 0);
        const avgTicket = concluded.length > 0 ? revenue / concluded.length : 0;
        const commissionRate = Number(professional.commissionPercentage || 0);
        const commissionEstimate = revenue * (commissionRate / 100);

        return {
          Profissional: professional.name,
          'Atendimentos Concluídos': concluded.length,
          Faturamento: Number(revenue.toFixed(2)),
          'Ticket Médio': Number(avgTicket.toFixed(2)),
          'Comissão %': Number(commissionRate.toFixed(2)),
          'Comissão Estimada': Number(commissionEstimate.toFixed(2)),
        };
      });

      return {
        title: 'Desempenho por Profissional',
        description: 'Resultados de produção e potencial de comissão.',
        columns: [
          { key: 'Profissional', label: 'Profissional' },
          { key: 'Atendimentos Concluídos', label: 'Atendimentos Concluídos' },
          { key: 'Faturamento', label: 'Faturamento (R$)' },
          { key: 'Ticket Médio', label: 'Ticket Médio (R$)' },
          { key: 'Comissão %', label: 'Comissão (%)' },
          { key: 'Comissão Estimada', label: 'Comissão Estimada (R$)' },
        ],
        rows,
        cards: [
          { label: 'Faturamento total', value: `R$ ${safeMoney(rows.reduce((sum, row) => sum + Number(row.Faturamento || 0), 0))}` },
          { label: 'Atendimentos concluídos', value: `${rows.reduce((sum, row) => sum + Number(row['Atendimentos Concluídos'] || 0), 0)}` },
          { label: 'Comissão estimada', value: `R$ ${safeMoney(rows.reduce((sum, row) => sum + Number(row['Comissão Estimada'] || 0), 0))}` },
        ],
      };
    }

    if (selectedReport === 'CLIENTS') {
      const rows = clients
        .map((client) => {
          const items = filteredAppointments.filter((appointment) => appointment.clientId === client.id);
          const concluded = items.filter((appointment) => completedStatuses.has(normalizeAppointmentStatus(appointment.status)));
          const cancelled = items.filter((appointment) => normalizeAppointmentStatus(appointment.status) === 'CANCELLED').length;
          const spent = concluded.reduce((sum, appointment) => sum + Number(appointment.totalValue || 0), 0);
          const lastVisit = concluded
            .map((appointment) => String(appointment.date || '').slice(0, 10))
            .sort()
            .pop();

          let churnDays = 0;
          if (lastVisit) {
            const last = new Date(`${lastVisit}T00:00:00`);
            const end = new Date(`${dateRange.endDate}T00:00:00`);
            churnDays = Math.max(Math.floor((end.getTime() - last.getTime()) / 86400000), 0);
          }

          return {
            Cliente: client.name,
            Visitas: concluded.length,
            Cancelamentos: cancelled,
            'Total Gasto': Number(spent.toFixed(2)),
            'Última Visita': lastVisit ? safeDateBr(lastVisit) : 'N/A',
            'Dias sem retorno': churnDays,
          };
        })
        .filter((row) => Number(row.Visitas || 0) > 0)
        .sort((a, b) => Number(b['Total Gasto'] || 0) - Number(a['Total Gasto'] || 0));

      return {
        title: 'Clientes (CRM)',
        description: 'Recorrência, valor e sinais de churn no período.',
        columns: [
          { key: 'Cliente', label: 'Cliente' },
          { key: 'Visitas', label: 'Visitas' },
          { key: 'Cancelamentos', label: 'Cancelamentos' },
          { key: 'Total Gasto', label: 'Total Gasto (R$)' },
          { key: 'Última Visita', label: 'Última Visita' },
          { key: 'Dias sem retorno', label: 'Dias sem retorno' },
        ],
        rows,
        cards: [
          { label: 'Clientes ativos', value: `${rows.length}` },
          { label: 'Cancelamentos no período', value: `${rows.reduce((sum, row) => sum + Number(row.Cancelamentos || 0), 0)}` },
          { label: 'Total gasto', value: `R$ ${safeMoney(rows.reduce((sum, row) => sum + Number(row['Total Gasto'] || 0), 0))}` },
          { label: 'Clientes em risco (45+ dias)', value: `${rows.filter((row) => Number(row['Dias sem retorno'] || 0) >= 45).length}` },
        ],
      };
    }

    const serviceRows = services.map((service) => {
      const items = filteredAppointments.filter((appointment) => appointment.serviceId === service.id);
      const concluded = items.filter((appointment) => completedStatuses.has(normalizeAppointmentStatus(appointment.status)));
      const revenue = concluded.reduce((sum, appointment) => sum + Number(appointment.totalValue || 0), 0);

      return {
        Serviço: service.title,
        'Qtd. Vendas': concluded.length,
        Faturamento: Number(revenue.toFixed(2)),
        'Preço Médio': concluded.length > 0 ? Number((revenue / concluded.length).toFixed(2)) : 0,
      };
    }).sort((a, b) => Number(b.Faturamento || 0) - Number(a.Faturamento || 0));

    return {
      title: 'Serviços e Mix de Vendas',
      description: 'Performance comercial por serviço no período.',
      columns: [
        { key: 'Serviço', label: 'Serviço' },
        { key: 'Qtd. Vendas', label: 'Qtd. Vendas' },
        { key: 'Faturamento', label: 'Faturamento (R$)' },
        { key: 'Preço Médio', label: 'Preço Médio (R$)' },
      ],
      rows: serviceRows,
      cards: [
        { label: 'Serviços com vendas', value: `${serviceRows.filter((row) => Number(row['Qtd. Vendas'] || 0) > 0).length}` },
        { label: 'Faturamento total', value: `R$ ${safeMoney(serviceRows.reduce((sum, row) => sum + Number(row.Faturamento || 0), 0))}` },
        { label: 'Vendas totais', value: `${serviceRows.reduce((sum, row) => sum + Number(row['Qtd. Vendas'] || 0), 0)}` },
      ],
    };
  }, [selectedReport, filteredAppointments, professionals, services, clients, dateRange.endDate]);

  useEffect(() => {
    const firstColumn = reportData.columns[0]?.key || '';
    setSortBy(firstColumn);
    setSortDirection('desc');
  }, [selectedReport]);

  useEffect(() => {
    if (!sortBy) return;
    const hasCurrentColumn = reportData.columns.some((column) => column.key === sortBy);
    if (hasCurrentColumn) return;

    const fallbackColumn = reportData.columns[0]?.key || '';
    setSortBy(fallbackColumn);
    setSortDirection('desc');
  }, [reportData.columns, sortBy]);

  const parseSortableValue = (value: string | number | undefined) => {
    if (typeof value === 'number') return value;
    const text = String(value || '').trim();
    if (!text) return '';

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
      const [day, month, year] = text.split('/');
      return Date.parse(`${year}-${month}-${day}T00:00:00`) || 0;
    }

    const normalized = text.replace(',', '.');
    const maybeNumber = Number(normalized);
    if (!Number.isNaN(maybeNumber)) return maybeNumber;

    return text.toLowerCase();
  };

  const sortedRows = useMemo(() => {
    const rows = [...reportData.rows];
    if (!sortBy) return rows;

    rows.sort((left, right) => {
      const leftValue = parseSortableValue(left[sortBy]);
      const rightValue = parseSortableValue(right[sortBy]);

      if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        return sortDirection === 'asc' ? leftValue - rightValue : rightValue - leftValue;
      }

      const leftText = String(leftValue);
      const rightText = String(rightValue);
      return sortDirection === 'asc'
        ? leftText.localeCompare(rightText)
        : rightText.localeCompare(leftText);
    });

    return rows;
  }, [reportData.rows, sortBy, sortDirection]);

  const handleSort = (columnKey: string) => {
    if (sortBy === columnKey) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(columnKey);
    setSortDirection('asc');
  };

  const getSortIndicator = (columnKey: string) => {
    if (sortBy !== columnKey) return '↕';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(sortedRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatorio');
    const fileName = `relatorio_${selectedReport.toLowerCase()}_${dateRange.startDate}_${dateRange.endDate}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const exportToPdf = async () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 28;
    const footerHeight = 24;
    const tableBottomLimit = pageHeight - footerHeight - 8;

    const moneyLikeRegex = /(R\$|Faturamento|Ticket|Comissão|Total Gasto|Preço Médio|Valor|Receita)/i;
    const percentLikeRegex = /%|Taxa/i;
    const brandLogoUrl = brandIdentity.logoUrl || brandIdentity.loginLogoUrl || '';
    const brandName = brandIdentity.name || 'AgendaFácil';

    const loadLogoDataUrl = async (url: string): Promise<string | null> => {
      if (!url) return null;

      try {
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
          const element = new Image();
          element.crossOrigin = 'anonymous';
          element.onload = () => resolve(element);
          element.onerror = () => reject(new Error('Falha ao carregar logo.'));
          element.src = url;
        });

        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth || 1;
        canvas.height = image.naturalHeight || 1;
        const context = canvas.getContext('2d');
        if (!context) return null;

        context.drawImage(image, 0, 0);
        return canvas.toDataURL('image/png');
      } catch {
        return null;
      }
    };

    const logoDataUrl = await loadLogoDataUrl(brandLogoUrl);

    const formatCellValue = (columnLabel: string, value: string | number | undefined) => {
      if (value === null || value === undefined || value === '') return '-';
      if (typeof value === 'number') {
        if (percentLikeRegex.test(columnLabel)) return value.toFixed(1);
        if (moneyLikeRegex.test(columnLabel)) return `R$ ${safeMoney(value)}`;
        if (Number.isInteger(value)) return String(value);
        return value.toFixed(2);
      }
      return String(value);
    };

    const isNumericColumn = (columnKey: string, columnLabel: string) => {
      if (moneyLikeRegex.test(columnLabel) || percentLikeRegex.test(columnLabel)) return true;
      return sortedRows.some((row) => typeof row[columnKey] === 'number');
    };

    const drawHeaderBlock = () => {
      const headerHeight = 64;
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, pageWidth, headerHeight, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text(reportData.title, margin, 26);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(reportData.description, margin, 42, { maxWidth: pageWidth - margin * 2 });
      doc.text(`Período: ${safeDateBr(dateRange.startDate)} até ${safeDateBr(dateRange.endDate)}`, margin, 56);

      const logoBoxSize = 44;
      const logoBoxX = pageWidth - margin - logoBoxSize;
      const logoBoxY = 10;

      if (logoDataUrl) {
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(logoBoxX, logoBoxY, logoBoxSize, logoBoxSize, 6, 6, 'F');
        doc.addImage(logoDataUrl, 'PNG', logoBoxX + 3, logoBoxY + 3, logoBoxSize - 6, logoBoxSize - 6);
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(brandName, pageWidth - margin - (logoDataUrl ? logoBoxSize + 8 : 0), 24, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Gerado em ${safeDateBr(new Date().toISOString().slice(0, 10))}`, pageWidth - margin - (logoDataUrl ? logoBoxSize + 8 : 0), 39, { align: 'right' });

      doc.setTextColor(31, 41, 55);
      return headerHeight + 14;
    };

    const drawCards = (startY: number) => {
      if (!reportData.cards.length) return startY;

      const cardsPerRow = 3;
      const gap = 10;
      const cardHeight = 46;
      const cardWidth = (pageWidth - margin * 2 - gap * (cardsPerRow - 1)) / cardsPerRow;
      let y = startY;

      reportData.cards.forEach((card, index) => {
        const col = index % cardsPerRow;
        const row = Math.floor(index / cardsPerRow);
        const x = margin + col * (cardWidth + gap);
        y = startY + row * (cardHeight + gap);

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(x, y, cardWidth, cardHeight, 6, 6, 'FD');

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(8);
        doc.text(card.label, x + 8, y + 14, { maxWidth: cardWidth - 16 });

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(11);
        doc.text(card.value, x + 8, y + 31, { maxWidth: cardWidth - 16 });
      });

      const rowsUsed = Math.ceil(reportData.cards.length / cardsPerRow);
      return startY + rowsUsed * (cardHeight + gap) + 8;
    };

    const tableHeaders = reportData.columns.map((column) => column.label);
    const tableBody = sortedRows.map((row) =>
      reportData.columns.map((column) => formatCellValue(column.label, row[column.key]))
    );

    const colCount = Math.max(reportData.columns.length, 1);
    const tableWidth = pageWidth - margin * 2;
    const baseWidth = tableWidth / colCount;
    const colWidths = reportData.columns.map((column) => {
      if (isNumericColumn(column.key, column.label)) return Math.max(baseWidth * 0.9, 86);
      return Math.max(baseWidth * 1.05, 110);
    });

    const totalRawWidth = colWidths.reduce((sum, value) => sum + value, 0);
    const scale = totalRawWidth > 0 ? tableWidth / totalRawWidth : 1;
    const normalizedWidths = colWidths.map((width) => width * scale);

    let y = drawHeaderBlock();
    y = drawCards(y);

    const drawTableHeader = () => {
      const headerHeight = 24;
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.rect(margin, y, tableWidth, headerHeight, 'FD');

      let x = margin;
      reportData.columns.forEach((column, index) => {
        const width = normalizedWidths[index] || baseWidth;
        if (index > 0) {
          doc.setDrawColor(226, 232, 240);
          doc.line(x, y, x, y + headerHeight);
        }

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(51, 65, 85);
        doc.setFontSize(9);
        const headerText = doc.splitTextToSize(column.label, width - 10);
        doc.text(headerText, x + 5, y + 15, { maxWidth: width - 10 });
        x += width;
      });

      y += headerHeight;
    };

    const drawFooter = () => {
      const pages = doc.getNumberOfPages();
      for (let page = 1; page <= pages; page += 1) {
        doc.setPage(page);
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, pageHeight - footerHeight, pageWidth - margin, pageHeight - footerHeight);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(`Relatório ${reportData.title}`, margin, pageHeight - 9);
        doc.text(`Página ${page} de ${pages}`, pageWidth - margin, pageHeight - 9, { align: 'right' });
      }
    };

    drawTableHeader();

    tableBody.forEach((row, rowIndex) => {
      const lineHeights = row.map((cellText, cellIndex) => {
        const width = normalizedWidths[cellIndex] || baseWidth;
        const wrapped = doc.splitTextToSize(cellText, width - 10);
        return Math.max(1, wrapped.length);
      });
      const rowHeight = Math.max(...lineHeights) * 12 + 8;

      if (y + rowHeight > tableBottomLimit) {
        doc.addPage();
        y = drawHeaderBlock();
        drawTableHeader();
      }

      if (rowIndex % 2 === 0) {
        doc.setFillColor(250, 252, 255);
        doc.rect(margin, y, tableWidth, rowHeight, 'F');
      }

      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, tableWidth, rowHeight);

      let x = margin;
      row.forEach((cellText, colIndex) => {
        const width = normalizedWidths[colIndex] || baseWidth;
        if (colIndex > 0) {
          doc.setDrawColor(241, 245, 249);
          doc.line(x, y, x, y + rowHeight);
        }

        const isNumeric = isNumericColumn(reportData.columns[colIndex]?.key || '', reportData.columns[colIndex]?.label || '');
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        doc.setFontSize(9);
        const wrapped = doc.splitTextToSize(cellText, width - 10);
        if (isNumeric) {
          doc.text(wrapped, x + width - 6, y + 14, { align: 'right', maxWidth: width - 10 });
        } else {
          doc.text(wrapped, x + 5, y + 14, { maxWidth: width - 10 });
        }

        x += width;
      });

      y += rowHeight;
    });

    if (tableBody.length === 0) {
      const emptyHeight = 34;
      if (y + emptyHeight > tableBottomLimit) {
        doc.addPage();
        y = drawHeaderBlock();
        drawTableHeader();
      }
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, tableWidth, emptyHeight);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text('Nenhum dado encontrado para os filtros selecionados.', margin + tableWidth / 2, y + 22, { align: 'center' });
      y += emptyHeight;
    }

    drawFooter();

    const fileName = `relatorio_${selectedReport.toLowerCase()}_${dateRange.startDate}_${dateRange.endDate}.pdf`;
    doc.save(fileName);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Relatórios</h2>
        <p className="text-sm text-gray-500">Filtros padrão, visão executiva e exportação PDF/Excel no layout do painel.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 md:p-5 border border-gray-100 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Período</label>
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value as ReportPeriod)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
            >
              <option value="TODAY">Hoje</option>
              <option value="LAST_7_DAYS">Últimos 7 dias</option>
              <option value="LAST_30_DAYS">Últimos 30 dias</option>
              <option value="THIS_MONTH">Este mês</option>
              <option value="CUSTOM">Personalizado</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Profissional</label>
            <select
              value={professionalFilter}
              onChange={(event) => setProfessionalFilter(event.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
            >
              <option value="ALL">Todos</option>
              {professionals.map((professional) => (
                <option key={professional.id} value={professional.id}>{professional.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>{status === 'ALL' ? 'Todos' : getAppointmentStatusLabel(status)}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={exportToPdf}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Exportar PDF
            </button>
            <button
              type="button"
              onClick={exportToExcel}
              className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Exportar Excel
            </button>
          </div>
        </div>

        {period === 'CUSTOM' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Data inicial</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(event) => setCustomStartDate(event.target.value)}
                max={customEndDate || undefined}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Data final</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(event) => setCustomEndDate(event.target.value)}
                min={customStartDate || undefined}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
              />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
        {reportOptions.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setSelectedReport(option.key)}
            className={`p-4 rounded-xl border text-left transition-colors ${selectedReport === option.key ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
          >
            <p className="text-sm font-semibold text-gray-900">{option.title}</p>
            <p className="text-xs text-gray-500 mt-1">{option.description}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {reportData.cards.map((card) => (
          <div key={card.label} className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-blue-500">
            <p className="text-xs text-gray-500">{card.label}</p>
            <p className="text-2xl font-bold text-gray-800">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="px-6 py-4 border-b bg-gray-50/60">
          <h3 className="font-bold text-gray-800">{reportData.title}</h3>
          <p className="text-xs text-gray-500 mt-1">{reportData.description}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-medium">
              <tr>
                {reportData.columns.map((column) => (
                  <th key={column.key} className="px-6 py-3">
                    <button
                      type="button"
                      onClick={() => handleSort(column.key)}
                      className="inline-flex items-center gap-1 hover:text-gray-900"
                    >
                      {column.label} <span aria-hidden>{getSortIndicator(column.key)}</span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedRows.map((row, index) => (
                <tr key={`${index}-${String(row[reportData.columns[0]?.key || ''])}`} className="hover:bg-gray-50">
                  {reportData.columns.map((column) => (
                    <td key={column.key} className="px-6 py-3 text-gray-700">{String(row[column.key] ?? '-')}</td>
                  ))}
                </tr>
              ))}
              {sortedRows.length === 0 && (
                <tr>
                  <td colSpan={reportData.columns.length} className="px-6 py-8 text-center text-gray-500">
                    Nenhum dado encontrado para os filtros selecionados.
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

export const AdminDashboard: React.FC = () => {
  const { user, logout, brandIdentity } = useAppContext();
  const isAdminUser = user?.role === 'ADMIN';
  const canEmployeeViewFinance = user?.role === 'EMPLOYEE' && Boolean(brandIdentity.allowEmployeeViewFinance);
  const canEmployeeViewReports = user?.role === 'EMPLOYEE' && Boolean(brandIdentity.allowEmployeeViewReports);
  const canAccessFinanceTab = isAdminUser || canEmployeeViewFinance;
  const canAccessReportsTab = isAdminUser || canEmployeeViewReports;
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'USERS' | 'AGENDA' | 'APPOINTMENT_CENTER' | 'FINANCE' | 'REPORTS' | 'SETTINGS'>(isAdminUser ? 'DASHBOARD' : 'AGENDA');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [agendaNavigationRequest, setAgendaNavigationRequest] = useState<(AgendaNavigationPayload & { nonce: number }) | null>(null);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  useEffect(() => {
    if (!isAdminUser && activeTab !== 'AGENDA' && activeTab !== 'APPOINTMENT_CENTER' && activeTab !== 'FINANCE' && activeTab !== 'REPORTS') {
      setActiveTab('AGENDA');
    }
    if (!canAccessFinanceTab && activeTab === 'FINANCE') {
      setActiveTab('AGENDA');
    }
    if (!canAccessReportsTab && activeTab === 'REPORTS') {
      setActiveTab('AGENDA');
    }
  }, [isAdminUser, canAccessFinanceTab, canAccessReportsTab, activeTab]);

  const handleTabChange = (tab: 'DASHBOARD' | 'USERS' | 'AGENDA' | 'APPOINTMENT_CENTER' | 'FINANCE' | 'REPORTS' | 'SETTINGS') => {
    if (!isAdminUser && tab !== 'AGENDA' && tab !== 'APPOINTMENT_CENTER' && !(tab === 'FINANCE' && canEmployeeViewFinance) && !(tab === 'REPORTS' && canEmployeeViewReports)) {
      return;
    }
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  const handleOpenAppointmentInAgenda = (payload: AgendaNavigationPayload) => {
    setAgendaNavigationRequest({
      ...payload,
      nonce: Date.now(),
    });
    setActiveTab('AGENDA');
    setIsMobileMenuOpen(false);
  };

  const handleViewAllRecent = () => {
    const today = new Date().toISOString().split('T')[0];
    handleOpenAppointmentInAgenda({
      date: today,
      viewMode: 'DAY',
    });
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
        fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out md:sticky md:top-0 md:inset-y-auto md:h-screen md:translate-x-0 md:shadow-md flex flex-col min-h-0
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
        
        <nav className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2">
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
          <button
             onClick={() => handleTabChange('APPOINTMENT_CENTER')}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'APPOINTMENT_CENTER' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <List size={20} /> Central de Agend.
          </button>
          {canAccessFinanceTab && (
            <button
              onClick={() => handleTabChange('FINANCE')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'FINANCE' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <Receipt size={20} /> Financeiro
            </button>
          )}
          {canAccessReportsTab && (
            <button
              onClick={() => handleTabChange('REPORTS')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'REPORTS' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <BarChart3 size={20} /> Relatórios
            </button>
          )}
          {isAdminUser && (
            <>
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

        <div className="p-4 border-t bg-white shrink-0">
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
          {activeTab === 'FINANCE' && canAccessFinanceTab && <FinanceManagement />}
          {activeTab === 'REPORTS' && canAccessReportsTab && <ReportsManagement />}
          {activeTab === 'USERS' && isAdminUser && <ClientsManagement />}
            {activeTab === 'AGENDA' && <CalendarManagement navigationRequest={agendaNavigationRequest} />}
          {activeTab === 'APPOINTMENT_CENTER' && <AppointmentCenterManagement onOpenAgenda={handleOpenAppointmentInAgenda} />}
          {activeTab === 'SETTINGS' && isAdminUser && <SettingsManagement />}
         </div>
      </main>
    </div>
  );
};