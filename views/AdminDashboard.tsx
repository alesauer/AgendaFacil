import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppContext } from '../App';
import { useNavigate } from 'react-router-dom';
import { Appointment, BrandIdentity, Client, Service } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { LayoutDashboard, Users, Calendar, Settings, LogOut, Plus, Edit, Trash2, DollarSign, X, Clock, Tag, Image as ImageIcon, Search, ChevronLeft, ChevronRight, Bell, Mail, MessageSquare, Shield, Globe, Menu, Scissors, Sparkles, Smile, Zap, Heart, Share2, RotateCcw, ChevronDown, Lock, Camera, Store, User as UserIcon, Palette, Check, CreditCard, Receipt, BarChart3, Phone, Headphones, ExternalLink, List, Upload } from 'lucide-react';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { createProfissionalApi, listProfissionaisApi, updateProfissionalApi } from '../services/profissionaisApi';
import {
  listRecebiveisApi,
  registrarEstornoRecebivelApi,
  registrarPagamentoRecebivelApi,
  RecebivelApi,
  FinanceiroResumoApi,
} from '../services/financeiroApi';
import { DashboardInsightsApi, getDashboardInsightsApi } from '../services/dashboardApi';
import { AssinaturaApi, createCheckoutApi, getAssinaturaApi, saveAssinaturaApi } from '../services/assinaturaApi';
import {
  cancelAssinaturaClienteApi,
  ClienteComAssinaturaApi,
  AssinaturaClientePlanoApi,
  AssinaturaClienteResumoApi,
  AssinaturaClientePagamentoApi,
  createPagamentoAssinaturaClienteApi,
  createPlanoAssinaturaClienteApi,
  deletePlanoAssinaturaClienteApi,
  getAssinaturaClienteApi,
  listClientesComAssinaturaApi,
  listPagamentosAssinaturaClienteApi,
  listPlanosAssinaturaClienteApi,
  updateStatusAssinaturaClienteApi,
  updatePlanoAssinaturaClienteApi,
  upsertAssinaturaClienteApi,
} from '../services/clientesApi';
import { createEvolutionInstanceApi, disconnectEvolutionInstanceApi, getEvolutionIntegrationStateApi } from '../services/whatsappApi';
import type { WhatsAppIntegrationStatus } from '../services/whatsappApi';
import { getNotificationChannelSettingsApi, saveNotificationChannelSettingsApi } from '../services/notificationSettingsApi';
import { sendSupportContactApi } from '../services/supportApi';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

type BillingCycle = 'MONTHLY' | 'YEARLY';
type PlanTier = 'ESSENCIAL' | 'PROFISSIONAL' | 'AVANCADO';

type PlanCard = {
  tier: PlanTier;
  title: string;
  subtitle: string;
  monthlyCents: number;
  yearlyCents: number;
  limitLabel: string;
  features: string[];
  footer: string;
};

const PLAN_CARDS: PlanCard[] = [
  {
    tier: 'ESSENCIAL',
    title: 'Essencial',
    subtitle: 'Para quem está começando ou tem uma base menor de clientes',
    monthlyCents: 2990,
    yearlyCents: 26990,
    limitLabel: 'Até 400 clientes cadastrados',
    features: [
      'Acesso a todas as funcionalidades',
      'Agenda inteligente completa',
      'Financeiro, CRM e relatórios',
      'Notificações por WhatsApp e e-mail',
      'Personalização da marca',
    ],
    footer: 'Ideal para organizar sua operação sem pagar além do necessário.',
  },
  {
    tier: 'PROFISSIONAL',
    title: 'Profissional',
    subtitle: 'Para barbearias em crescimento',
    monthlyCents: 3990,
    yearlyCents: 35990,
    limitLabel: 'Até 1000 clientes cadastrados',
    features: [
      'Todas as funcionalidades liberadas',
      'Mais capacidade para crescer com segurança',
      'Suporte prioritário',
    ],
    footer: 'O plano ideal para quem quer escalar sem limitações no curto prazo.',
  },
  {
    tier: 'AVANCADO',
    title: 'Avançado',
    subtitle: 'Para operações maiores ou em expansão',
    monthlyCents: 4990,
    yearlyCents: 44990,
    limitLabel: 'Clientes ilimitados',
    features: [
      'Todas as funcionalidades liberadas',
      'Liberdade total para crescimento',
      'Ideal para múltiplas unidades',
    ],
    footer: 'Perfeito para barbearias com alto volume ou múltiplas unidades.',
  },
];

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
                <button type="button" onClick={onViewAllRecent} className="text-xs text-blue-600 hover:underline">Ver agenda</button>
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
  const { services, deleteService, addService, updateService, reorderServices, categories } = useAppContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [isDeletingService, setIsDeletingService] = useState(false);
    const [isReorderingServices, setIsReorderingServices] = useState(false);
    const [reorderError, setReorderError] = useState<string | null>(null);
    const [draggedServiceId, setDraggedServiceId] = useState<string | null>(null);
    const [dropTargetServiceId, setDropTargetServiceId] = useState<string | null>(null);
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

    const moveService = async (sourceId: string, targetId: string) => {
      if (!sourceId || !targetId || sourceId === targetId || isReorderingServices) {
        return;
      }

      const ids = services.map(service => service.id);
      const sourceIndex = ids.indexOf(sourceId);
      const targetIndex = ids.indexOf(targetId);
      if (sourceIndex < 0 || targetIndex < 0) {
        return;
      }

      const nextIds = [...ids];
      const [moved] = nextIds.splice(sourceIndex, 1);
      nextIds.splice(targetIndex, 0, moved);

      setReorderError(null);
      setIsReorderingServices(true);
      const result = await reorderServices(nextIds);
      if (!result.success) {
        setReorderError(result.error || 'Falha ao reordenar serviços.');
      }
      setIsReorderingServices(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Gerenciar Serviços</h2>
                  <p className="text-sm text-gray-500 mt-1">Arraste e solte pela alça para definir a ordem exibida ao cliente.</p>
                </div>
                <button 
                  type="button"
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
                            <button type="button" onClick={() => {
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
                          if (!serviceToDelete || isDeletingService || isReorderingServices) return;
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
                        disabled={isDeletingService || isReorderingServices}
                      >
                        {isDeletingService ? 'Excluindo...' : 'Excluir'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {reorderError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {reorderError}
              </div>
            )}
            
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600 font-medium">
                    <tr>
                        <th className="px-6 py-3 w-10"></th>
                        <th className="px-6 py-3">Serviço</th>
                        <th className="px-6 py-3">Preço</th>
                        <th className="px-6 py-3">Duração</th>
                        <th className="px-6 py-3 text-right">Ações</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y">
                        {services.map(service => (
                            <tr
                              key={service.id}
                              className={`hover:bg-gray-50 ${dropTargetServiceId === service.id ? 'bg-blue-50' : ''}`}
                              draggable={!isReorderingServices}
                              onDragStart={() => {
                                setDraggedServiceId(service.id);
                                setDropTargetServiceId(service.id);
                                setReorderError(null);
                              }}
                              onDragOver={(event) => {
                                event.preventDefault();
                                if (draggedServiceId && draggedServiceId !== service.id) {
                                  setDropTargetServiceId(service.id);
                                }
                              }}
                              onDrop={async (event) => {
                                event.preventDefault();
                                const sourceId = draggedServiceId;
                                setDraggedServiceId(null);
                                setDropTargetServiceId(null);
                                if (!sourceId) return;
                                await moveService(sourceId, service.id);
                              }}
                              onDragEnd={() => {
                                setDraggedServiceId(null);
                                setDropTargetServiceId(null);
                              }}
                            >
                                <td className="px-6 py-3 text-gray-400">
                                  <span className="inline-flex items-center justify-center" title="Arrastar para reordenar">
                                    <List size={16} />
                                  </span>
                                </td>
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
    const [dayMobileLayout, setDayMobileLayout] = useState<'LIST' | 'GRID'>('LIST');
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
    const [appointmentSubscriptionPreview, setAppointmentSubscriptionPreview] = useState<AssinaturaClienteResumoApi | null>(null);
    const [isLoadingAppointmentSubscriptionPreview, setIsLoadingAppointmentSubscriptionPreview] = useState(false);
    const [appointmentSubscriptionPreviewError, setAppointmentSubscriptionPreviewError] = useState<string | null>(null);
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
    const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim());

    const filteredClients = clients
      .filter(client => {
        const search = clientSearchTerm.trim().toLowerCase();
        if (!search) return true;
        return client.name.toLowerCase().includes(search) || client.phone.toLowerCase().includes(search);
      })
      .slice(0, 8);

    useEffect(() => {
      if (!isModalOpen || formData.isBlocked || !formData.clientId) {
        setAppointmentSubscriptionPreview(null);
        setAppointmentSubscriptionPreviewError(null);
        setIsLoadingAppointmentSubscriptionPreview(false);
        return;
      }

      if (!isUuid(formData.clientId)) {
        setAppointmentSubscriptionPreview(null);
        setAppointmentSubscriptionPreviewError('Selecione um cliente válido para continuar.');
        setIsLoadingAppointmentSubscriptionPreview(false);
        return;
      }

      let cancelled = false;
      const run = async () => {
        setIsLoadingAppointmentSubscriptionPreview(true);
        setAppointmentSubscriptionPreviewError(null);

        const result = await getAssinaturaClienteApi(formData.clientId);
        if (cancelled) return;

        if (!result.success) {
          setAppointmentSubscriptionPreview(null);
          setAppointmentSubscriptionPreviewError(('error' in result && result.error) || 'Falha ao carregar assinatura do cliente.');
          setIsLoadingAppointmentSubscriptionPreview(false);
          return;
        }

        setAppointmentSubscriptionPreview(result.data || null);
        setIsLoadingAppointmentSubscriptionPreview(false);
      };

      run();
      return () => {
        cancelled = true;
      };
    }, [formData.clientId, formData.isBlocked, isModalOpen]);

    const selectedServiceForPreview = useMemo(
      () => services.find((service) => service.id === formData.serviceId) || null,
      [services, formData.serviceId],
    );

    const appointmentCoveragePreview = useMemo(() => {
      if (formData.isBlocked || !formData.clientId || !selectedServiceForPreview) return null;

      if (!appointmentSubscriptionPreview) {
        return {
          type: 'AVULSO' as const,
          message: 'Cliente sem assinatura ativa para este agendamento.',
        };
      }

      const status = String(appointmentSubscriptionPreview.subscription?.status || '').toUpperCase();
      if (!['ACTIVE', 'GRACE'].includes(status)) {
        const statusLabelMap: Record<string, string> = {
          ACTIVE: 'Ativa',
          GRACE: 'Em carência',
          PAST_DUE: 'Inadimplente',
          PAUSED: 'Pausada',
          CANCELLED: 'Cancelada',
        };
        return {
          type: 'INELEGIVEL' as const,
          message: `Assinatura em status ${statusLabelMap[status] || status}: atendimento seguirá como avulso.`,
        };
      }

      const benefit = appointmentSubscriptionPreview.beneficios.find(
        (item) => String(item.servico_id) === String(selectedServiceForPreview.id)
      );

      if (!benefit) {
        return {
          type: 'AVULSO' as const,
          message: 'Serviço não coberto pelo plano deste cliente.',
        };
      }

      const restante = Number(benefit.quantidade_restante || 0);
      const consumida = Number(benefit.quantidade_consumida || 0);
      const incluida = Number(benefit.quantidade_incluida || 0);

      if (restante > 0) {
        return {
          type: 'COBERTO' as const,
          message: `Coberto pela assinatura. Uso do ciclo: ${consumida}/${incluida} (restante ${restante}).`,
        };
      }

      return {
        type: 'ESGOTADO' as const,
        message: `Franquia esgotada para este serviço (${consumida}/${incluida}). Atendimento será avulso.`,
      };
    }, [appointmentSubscriptionPreview, formData.clientId, formData.isBlocked, selectedServiceForPreview]);

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

      if (!formData.isBlocked && !isUuid(formData.clientId)) {
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
                    <>
                      <div className="md:hidden sticky top-0 z-30 bg-white border-b px-3 py-2 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Visualização</span>
                        <div className="bg-gray-100 rounded-lg p-1 flex">
                          <button
                            onClick={() => setDayMobileLayout('LIST')}
                            className={`px-3 py-1 text-xs font-bold rounded transition-all ${dayMobileLayout === 'LIST' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                          >
                            Lista
                          </button>
                          <button
                            onClick={() => setDayMobileLayout('GRID')}
                            className={`px-3 py-1 text-xs font-bold rounded transition-all ${dayMobileLayout === 'GRID' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                          >
                            Colunas
                          </button>
                        </div>
                      </div>

                      <div className="md:hidden">
                        {dayMobileLayout === 'LIST' ? (
                          <div className="p-2 space-y-2">
                            {filteredProfessionals.map((prof) => {
                              const professionalAppointments = visibleAgendaAppointments
                                .filter(apt => apt.date === selectedDate && apt.professionalId === prof.id)
                                .sort((a, b) => toMinutes(a.time || '00:00') - toMinutes(b.time || '00:00'));

                              return (
                                <div key={prof.id} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                                  <div className="px-3 py-2 border-b bg-gray-50 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold overflow-hidden flex-shrink-0">
                                        {prof.avatar ? (
                                          <img src={prof.avatar} alt={prof.name} className="w-full h-full object-cover" />
                                        ) : (
                                          safeInitial(prof.name)
                                        )}
                                      </div>
                                      <span className="text-sm font-bold text-gray-800 truncate">{prof.name}</span>
                                    </div>
                                    {canEmployeeCreateAppointment && (
                                      <button
                                        type="button"
                                        onClick={() => openCreateAppointmentModal({ date: selectedDate, professionalId: prof.id })}
                                        className="px-2 py-1 text-[11px] rounded-md bg-blue-600 text-white font-bold"
                                      >
                                        + Novo
                                      </button>
                                    )}
                                  </div>

                                  <div className="p-2 space-y-2">
                                    {professionalAppointments.length === 0 && (
                                      <div className="text-xs text-gray-500 px-1 py-2">Sem agendamentos neste dia.</div>
                                    )}

                                    {professionalAppointments.map((apt) => {
                                      const service = services.find(s => s.id === apt.serviceId);
                                      const client = clients.find(c => c.id === apt.clientId);
                                      return (
                                        <button
                                          key={apt.id}
                                          type="button"
                                          onClick={() => {
                                            setSelectedAptId(apt.id);
                                            setIsDetailsModalOpen(true);
                                          }}
                                          className={`w-full text-left rounded-lg border-l-4 px-2 py-2 ${getStatusColor(apt.status)}`}
                                        >
                                          <div className="flex items-center justify-between gap-2">
                                            <span className="text-xs font-bold">{apt.isAllDay ? 'DIA TODO' : `${apt.time}${apt.endTime ? ` - ${apt.endTime}` : ''}`}</span>
                                            <span className="text-[10px] opacity-70">{getAppointmentStatusLabel(apt.status)}</span>
                                          </div>
                                          <p className="text-xs font-bold truncate mt-0.5">
                                            {apt.status === 'BLOCKED' ? (apt.isAllDay ? 'DIA BLOQUEADO' : 'HORÁRIO BLOQUEADO') : (client?.name || 'Cliente')}
                                          </p>
                                          <p className="text-[11px] opacity-80 truncate">
                                            {apt.status === 'BLOCKED' ? 'Indisponível para clientes' : service?.title}
                                          </p>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div style={{ width: `${56 + (filteredProfessionals.length * 120)}px` }} className="min-w-full">
                            <div className="sticky top-0 z-20 bg-white border-b flex">
                              <div className="w-14 flex-shrink-0 border-r bg-gray-50"></div>
                              {filteredProfessionals.map(prof => (
                                <div key={prof.id} className="w-[120px] p-2 border-r flex items-center gap-2 flex-shrink-0">
                                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold overflow-hidden flex-shrink-0">
                                    {prof.avatar ? (
                                      <img src={prof.avatar} alt={prof.name} className="w-full h-full object-cover" />
                                    ) : (
                                      safeInitial(prof.name)
                                    )}
                                  </div>
                                  <span className="font-bold text-gray-800 text-xs truncate">{safeFirstName(prof.name)}</span>
                                </div>
                              ))}
                            </div>

                            <div className="relative flex">
                              <div className="w-14 flex-shrink-0 bg-gray-50 border-r">
                                {TIME_SLOTS.map(time => (
                                  <div key={time} className="h-[64px] border-b border-gray-100 flex items-start justify-center pt-2">
                                    <span className="text-[10px] font-bold text-gray-400">{time}</span>
                                  </div>
                                ))}
                              </div>

                              <div className="flex-1 flex relative">
                                {filteredProfessionals.map(prof => (
                                  <div key={prof.id} className="w-[120px] flex-shrink-0 border-r relative bg-grid-pattern">
                                    {TIME_SLOTS.map(time => (
                                      <button
                                        key={time}
                                        type="button"
                                        onClick={() => openCreateAppointmentModal({
                                          date: selectedDate,
                                          time,
                                          professionalId: prof.id,
                                        })}
                                        className="h-[64px] w-full border-b border-gray-100 hover:bg-blue-50/30 transition-colors cursor-pointer"
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
                                            className={`absolute left-1 right-1 rounded-lg border-l-4 p-2 shadow-sm z-10 overflow-hidden transition-all hover:shadow-md cursor-pointer ${getStatusColor(apt.status)}`}
                                          >
                                            <div className="flex justify-between items-start mb-1">
                                              <span className="text-[9px] font-bold opacity-70">{apt.isAllDay ? 'DIA TODO' : apt.time}</span>
                                              {apt.status === 'BLOCKED' && <Lock size={10} className="opacity-50" />}
                                            </div>
                                            <p className="text-[10px] font-bold truncate">
                                              {apt.status === 'BLOCKED' ? (apt.isAllDay ? 'DIA BLOQ.' : 'BLOQ.') : (client?.name || 'Cliente')}
                                            </p>
                                          </div>
                                        );
                                      })}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="hidden md:block">
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
                      </div>
                    </>
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

                                            {isLoadingAppointmentSubscriptionPreview && formData.clientId && (
                                              <p className="mt-2 text-xs text-gray-500">Verificando cobertura da assinatura...</p>
                                            )}

                                            {appointmentSubscriptionPreviewError && formData.clientId && (
                                              <p className="mt-2 text-xs text-amber-700">{appointmentSubscriptionPreviewError}</p>
                                            )}

                                            {appointmentCoveragePreview && (
                                              <div className={`mt-2 rounded-lg border px-3 py-2 text-xs ${
                                                appointmentCoveragePreview.type === 'COBERTO'
                                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                  : appointmentCoveragePreview.type === 'INELEGIVEL'
                                                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                                                    : appointmentCoveragePreview.type === 'ESGOTADO'
                                                      ? 'border-orange-200 bg-orange-50 text-orange-700'
                                                      : 'border-slate-200 bg-slate-50 text-slate-700'
                                              }`}>
                                                {appointmentCoveragePreview.message}
                                              </div>
                                            )}
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
  const normalizeIntegrationStatus = (
    raw: string | null | undefined,
    fallback: WhatsAppIntegrationStatus = 'DISCONNECTED',
  ): WhatsAppIntegrationStatus => {
    const normalized = String(raw || '').trim().toUpperCase();
    if (
      normalized === 'DISCONNECTED' ||
      normalized === 'CONNECTING' ||
      normalized === 'QR_READY' ||
      normalized === 'AWAITING_CONNECTION' ||
      normalized === 'CONNECTED' ||
      normalized === 'ERROR'
    ) {
      return normalized;
    }
    return fallback;
  };

  const integrationStatusLabel = (value: WhatsAppIntegrationStatus | null): string | null => {
    if (!value) return null;
    if (value === 'DISCONNECTED') return 'Desconectado';
    if (value === 'CONNECTING') return 'Conectando';
    if (value === 'QR_READY') return 'QR pronto';
    if (value === 'AWAITING_CONNECTION') return 'Aguardando conexão';
    if (value === 'CONNECTED') return 'Conectado';
    if (value === 'ERROR') return 'Erro';
    return value;
  };

  const loadCachedConnectedState = (): { status: 'CONNECTED' | 'LOADING'; instanceName: string | null } => {
    try {
      const raw = localStorage.getItem('agf.whatsapp.integration.cache');
      if (!raw) return { status: 'LOADING', instanceName: null };
      const parsed = JSON.parse(raw) as { status?: string; instanceName?: string | null };
      const cachedStatus = String(parsed?.status || '').toUpperCase();
      const cachedInstance = String(parsed?.instanceName || '').trim() || null;
      if (cachedStatus === 'CONNECTED' && cachedInstance) {
        return { status: 'CONNECTED', instanceName: cachedInstance };
      }
    } catch {
      return { status: 'LOADING', instanceName: null };
    }
    return { status: 'LOADING', instanceName: null };
  };

  const initialCached = loadCachedConnectedState();
  const [status, setStatus] = useState<'DISCONNECTED' | 'LOADING' | 'QR_CODE' | 'CONNECTED'>(initialCached.status);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [instanceName, setInstanceName] = useState('');
  const [connectedNumber, setConnectedNumber] = useState<string | null>(initialCached.instanceName);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [isPollingStatus, setIsPollingStatus] = useState(false);
  const [integrationStatus, setIntegrationStatus] = useState<WhatsAppIntegrationStatus | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [lastBackendError, setLastBackendError] = useState<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartedAtRef = useRef<number | null>(null);
  const isRefreshingStateRef = useRef(false);
  const connectionStatusRef = useRef<string | null>(null);

  const persistCachedState = (nextStatus: 'DISCONNECTED' | 'LOADING' | 'QR_CODE' | 'CONNECTED', nextInstanceName?: string | null) => {
    try {
      if (nextStatus === 'CONNECTED' && nextInstanceName) {
        localStorage.setItem('agf.whatsapp.integration.cache', JSON.stringify({ status: 'CONNECTED', instanceName: nextInstanceName }));
        return;
      }
      localStorage.removeItem('agf.whatsapp.integration.cache');
    } catch {
      return;
    }
  };

  const stopStatePolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    pollStartedAtRef.current = null;
    setIsPollingStatus(false);
  };

  const syncStateFromBackend = async (): Promise<'CONNECTED' | 'HAS_INTEGRATION' | 'DISCONNECTED' | 'ERROR'> => {
    if (isRefreshingStateRef.current) return 'ERROR';
    isRefreshingStateRef.current = true;

    const response = await getEvolutionIntegrationStateApi();
    isRefreshingStateRef.current = false;

    if (!response.success) {
      return 'ERROR';
    }

    const state = response.data;
    const savedInstance = String(state.instance_name || '').trim();
    if (savedInstance) {
      setConnectedNumber(savedInstance);
      setInstanceName(savedInstance);
    }

    const nextIntegrationStatus = normalizeIntegrationStatus(state.integration_status || null, savedInstance ? 'AWAITING_CONNECTION' : 'DISCONNECTED');
    setIntegrationStatus(nextIntegrationStatus);
    const currentConnectionStatus = String(state.connection_status || '').trim() || null;
    setConnectionStatus(currentConnectionStatus);
    connectionStatusRef.current = currentConnectionStatus;
    setLastSyncAt(String(state.last_sync_at || '').trim() || null);
    setLastBackendError(String(state.last_error || '').trim() || null);

    if (state.is_connected) {
      setStatus('CONNECTED');
      setQrCode(null);
      setApiError(null);
      persistCachedState('CONNECTED', savedInstance);
      return 'CONNECTED';
    }

    if (state.has_integration && !savedInstance) {
      setStatus('DISCONNECTED');
      setConnectedNumber(null);
      setQrCode(null);
      setConnectionStatus(null);
      connectionStatusRef.current = null;
      persistCachedState('DISCONNECTED');
      return 'DISCONNECTED';
    }

    if (state.has_integration) {
      setStatus('QR_CODE');
      return 'HAS_INTEGRATION';
    }

    setStatus('DISCONNECTED');
    setConnectedNumber(null);
    setQrCode(null);
    setConnectionStatus(null);
    connectionStatusRef.current = null;
    persistCachedState('DISCONNECTED');
    return 'DISCONNECTED';
  };

  const startStatePolling = () => {
    if (pollTimerRef.current) return;

    pollStartedAtRef.current = Date.now();
    setIsPollingStatus(true);

    pollTimerRef.current = setInterval(async () => {
      const syncResult = await syncStateFromBackend();
      const elapsed = Date.now() - (pollStartedAtRef.current || Date.now());

      if (syncResult === 'CONNECTED' || syncResult === 'DISCONNECTED') {
        stopStatePolling();
        return;
      }

      if (elapsed >= 180000) {
        stopStatePolling();
        const normalizedConnection = String(connectionStatusRef.current || '').toLowerCase();
        if (normalizedConnection === 'connecting') {
          setApiError('A instância ainda está conectando na Evolution. Se você já escaneou, o QR pode ter expirado. Clique em “Regenerar QR Code”.');
        } else {
          setApiError('Aguardando confirmação da conexão. Clique em “Verificar conexão agora”.');
        }
      }
    }, 2500);
  };

  useEffect(() => {
    let mounted = true;

    const loadState = async () => {
      const syncResult = await syncStateFromBackend();
      if (!mounted) return;

      if (syncResult === 'HAS_INTEGRATION') {
        startStatePolling();
      }
      setIsInitializing(false);
    };

    loadState();

    return () => {
      mounted = false;
      stopStatePolling();
    };
  }, []);

  const toQrImageSrc = (raw: string | null) => {
    const text = String(raw || '').trim();
    if (!text) return null;
    if (text.startsWith('http://') || text.startsWith('https://')) return text;
    if (text.startsWith('data:image/')) return text;
    return `data:image/png;base64,${text}`;
  };

  const generateQR = async () => {
    setApiError(null);
    setStatus('LOADING');
    persistCachedState('LOADING');
    stopStatePolling();
    const response = await createEvolutionInstanceApi({
      instance_name: instanceName.trim() || undefined,
    });

    if (!response.success) {
      setStatus('DISCONNECTED');
      persistCachedState('DISCONNECTED');
      const errorMessage = 'error' in response ? response.error : 'Falha ao criar instância na Evolution.';
      setApiError(errorMessage || 'Falha ao criar instância na Evolution.');
      return;
    }

    const normalizedQr = toQrImageSrc(response.data.qr_code || null);
    setConnectedNumber(response.data.instance_name || null);
    setIntegrationStatus(normalizeIntegrationStatus(response.data.integration_status || null, normalizedQr ? 'QR_READY' : 'AWAITING_CONNECTION'));
    setLastSyncAt(String(response.data.last_sync_at || '').trim() || null);
    setLastBackendError(null);
    setQrCode(normalizedQr);
    setStatus(normalizedQr ? 'QR_CODE' : 'LOADING');
    persistCachedState(normalizedQr ? 'QR_CODE' : 'LOADING', response.data.instance_name || null);
    startStatePolling();
  };

  const disconnect = async () => {
    setShowDisconnectModal(false);
    setApiError(null);
    stopStatePolling();
    setIsDisconnecting(true);
    const response = await disconnectEvolutionInstanceApi();
    setIsDisconnecting(false);

    if (!response.success) {
      const fallback = 'Falha ao desconectar instância na Evolution.';
      let errorMessage = 'error' in response ? (response.error || fallback) : fallback;
      if ('details' in response && response.details && typeof response.details === 'object') {
        const providerResponse = (response.details as Record<string, unknown>).provider_response as Record<string, unknown> | undefined;
        const providerStatus = providerResponse && typeof providerResponse.status === 'number' ? providerResponse.status : null;
        if (providerStatus) {
          errorMessage = `${errorMessage} (Evolution HTTP ${providerStatus})`;
        }
      }

      const syncAfterFailure = await syncStateFromBackend();
      if (syncAfterFailure === 'DISCONNECTED') {
        setApiError(null);
        setLastBackendError(null);
        return;
      }

      setApiError(errorMessage);
      setLastBackendError(errorMessage);
      return;
    }

    setStatus('DISCONNECTED');
    persistCachedState('DISCONNECTED');
    setQrCode(null);
    setConnectedNumber(null);
    setInstanceName('');
    setIntegrationStatus('DISCONNECTED');
    setConnectionStatus(null);
    connectionStatusRef.current = null;
    setLastSyncAt(null);
    setLastBackendError(null);
    setApiError(null);
  };

  return (
    <>
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
                    Conectado
                  </span>
                ) : isInitializing ? (
                  <span className="inline-flex items-center gap-1.5 py-0.5 px-2 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 uppercase tracking-wider border border-gray-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-pulse"></span>
                    Sincronizando
                  </span>
                ) : status === 'QR_CODE' || status === 'LOADING' ? (
                  <span className="inline-flex items-center gap-1.5 py-0.5 px-2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 uppercase tracking-wider border border-amber-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    Aguardando conexão
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 py-0.5 px-2 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500 uppercase tracking-wider border border-gray-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                    Desconectado
                  </span>
                )}
              </div>
            </div>
          </div>
            {status === 'CONNECTED' && (
              <button
                onClick={() => setShowDisconnectModal(true)}
                disabled={isDisconnecting}
                className="text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isDisconnecting ? 'Desconectando...' : 'Disconnect'}
              </button>
            )}
        </div>

        <div className="p-8 flex flex-col items-center text-center">
          {apiError && status !== 'DISCONNECTED' && (
            <div className="mb-4 w-full max-w-xl rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {apiError}
            </div>
          )}

          {!isInitializing && status === 'DISCONNECTED' && (
            <div className="space-y-6 max-w-sm">
              <p className="text-gray-600">Crie sua instância no Evolution para conectar o WhatsApp da barbearia.</p>
              <input
                value={instanceName}
                onChange={(event) => setInstanceName(event.target.value)}
                placeholder="Nome da instância (opcional)"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
              <button 
                onClick={generateQR}
                disabled={isPollingStatus}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2"
              >
                Criar instância + gerar QR Code
              </button>
              {apiError && <p className="text-sm text-red-600">{apiError}</p>}
            </div>
          )}

          {(status === 'LOADING' || isInitializing) && (
            <div className="py-12 flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
              <p className="text-gray-500 font-medium">{isInitializing ? 'Carregando integração...' : 'Criando instância e QR Code...'}</p>
            </div>
          )}

          {status === 'QR_CODE' && (
            <div className="space-y-6">
              {qrCode ? (
                <div className="p-4 bg-white border-2 border-dashed border-gray-200 rounded-2xl inline-block">
                  <img 
                    src={qrCode}
                    alt="WhatsApp QR Code" 
                    className="w-48 h-48"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl inline-block text-amber-800 text-sm font-medium">
                  Instância criada. Aguardando confirmação de conexão na Evolution...
                </div>
              )}
              <div className="space-y-2">
                <p className="font-bold text-gray-800">Escaneie o QR Code no WhatsApp do celular</p>
                {connectedNumber && (
                  <p className="text-sm text-gray-600">Instância: <span className="font-semibold">{connectedNumber}</span></p>
                )}
                {integrationStatus && (
                  <p className="text-xs text-gray-500">Status da integração: {integrationStatusLabel(integrationStatus)}</p>
                )}
                {connectionStatus && (
                  <p className="text-xs text-gray-500">Status da conexão na Evolution: {connectionStatus}</p>
                )}
                {lastSyncAt && (
                  <p className="text-xs text-gray-500">Última sincronização: {new Date(lastSyncAt).toLocaleString('pt-BR')}</p>
                )}
                {lastBackendError && (
                  <p className="text-xs text-red-600">{lastBackendError}</p>
                )}
                <p className="text-sm text-gray-500">WhatsApp {'>'} Configurações {'>'} Aparelhos conectados</p>
              </div>
              <div className="flex items-center justify-center gap-4">
                <button 
                  onClick={generateQR}
                  className="text-blue-600 font-bold text-sm hover:underline"
                >
                  Regenerar QR Code
                </button>
                <button
                  onClick={syncStateFromBackend}
                  className="text-blue-600 font-bold text-sm hover:underline"
                >
                  Verificar conexão agora
                </button>
              </div>
              {isPollingStatus && <p className="text-xs text-amber-700">Monitorando conexão automaticamente (até 3 minutos)...</p>}
            </div>
          )}

          {status === 'CONNECTED' && (
            <div className="space-y-6">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mx-auto">
                <Smile size={40} />
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-gray-900">{connectedNumber || 'Instância criada'}</p>
                <p className="text-gray-500">Conta conectada e ativa</p>
              </div>
              <div className="flex items-center gap-2 justify-center bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium">
                <Zap size={16} />
                Pronto para enviar notificações
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
            <p className="font-bold mb-1">Informação de segurança</p>
            <p>A conexão usa criptografia. A plataforma utiliza o canal apenas para disparos automáticos de notificação.</p>
          </div>
        </div>
      </div>

      {showDisconnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-100 overflow-hidden">
            <div className="p-6">
              <h4 className="text-lg font-bold text-gray-900">Desconectar WhatsApp</h4>
              <p className="mt-2 text-sm text-gray-600">
                Tem certeza que deseja desconectar o WhatsApp desta barbearia?
              </p>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowDisconnectModal(false)}
                disabled={isDisconnecting}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={disconnect}
                disabled={isDisconnecting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isDisconnecting ? 'Desconectando...' : 'Desconectar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const SettingsManagement = () => {
  const navigate = useNavigate();
  const { users, professionals, clients, services, addUser, updateUser, deleteUser, deactivateProfessional, categories, addCategory, updateCategory, deleteCategory, businessHours, saveBusinessHours, brandIdentity, saveBrandIdentity } = useAppContext();
  const [activeSubTab, setActiveSubTab] = useState<'PROFESSIONALS' | 'SERVICES' | 'PROFILES' | 'HOURS' | 'INTEGRATIONS' | 'OTHER' | 'ONBOARDING' | 'BILLING' | 'SUBSCRIPTIONS' | 'CONTACT'>('PROFESSIONALS');
  const [activeServiceTab, setActiveServiceTab] = useState<'SERVICES' | 'CATEGORIES'>('SERVICES');
  const [isWhatsappAlertsEnabled, setIsWhatsappAlertsEnabled] = useState<boolean>(true);
  const [isEmailAlertsEnabled, setIsEmailAlertsEnabled] = useState<boolean>(true);
  const [isLoadingAlertSettings, setIsLoadingAlertSettings] = useState<boolean>(true);
  const [isSavingAlertSettings, setIsSavingAlertSettings] = useState<boolean>(false);
  const [alertSettingsError, setAlertSettingsError] = useState<string | null>(null);
  const [activeBillingTab, setActiveBillingTab] = useState<'PLAN' | 'UTILIZATION' | 'PAYMENT' | 'INVOICING' | 'B2C'>('PLAN');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('MONTHLY');
  const [billingPlanSearchTerm, setBillingPlanSearchTerm] = useState('');
  const [billingPlanSortField, setBillingPlanSortField] = useState<'NOME' | 'VALOR' | 'CLIENTES'>('NOME');
  const [billingPlanSortDirection, setBillingPlanSortDirection] = useState<'ASC' | 'DESC'>('ASC');
  const [selectedPlanDetails, setSelectedPlanDetails] = useState<PlanCard | null>(null);
  const [activeSubscriptionsTab, setActiveSubscriptionsTab] = useState<'CREATE_PLANS' | 'LINK_PLANS' | 'CLIENTS_LIST'>('CREATE_PLANS');
  const [activeIdentityTab, setActiveIdentityTab] = useState<'LOGO' | 'COLORS' | 'OTHER_PREFERENCES' | 'DISCLOSURE'>('LOGO');
  const [isHelpCenterOpen, setIsHelpCenterOpen] = useState(false);
  const [helpCenterSearchTerm, setHelpCenterSearchTerm] = useState('');
  const [selectedHelpArticleId, setSelectedHelpArticleId] = useState('');
  const [isHelpArticleOpen, setIsHelpArticleOpen] = useState(false);
  const [isSupportEmailModalOpen, setIsSupportEmailModalOpen] = useState(false);
  const [supportContactBarbeariaName, setSupportContactBarbeariaName] = useState('');
  const [supportContactName, setSupportContactName] = useState('');
  const [supportContactMessage, setSupportContactMessage] = useState('');
  const [supportContactError, setSupportContactError] = useState<string | null>(null);
  const [supportContactSuccess, setSupportContactSuccess] = useState<string | null>(null);
  const [isSendingSupportContact, setIsSendingSupportContact] = useState(false);
  const [isGeneratingDisclosurePdf, setIsGeneratingDisclosurePdf] = useState(false);
  const [disclosureError, setDisclosureError] = useState<string | null>(null);
  const [disclosureSuccess, setDisclosureSuccess] = useState<string | null>(null);

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
  const [allowEmployeeViewUsers, setAllowEmployeeViewUsers] = useState(Boolean(brandIdentity.allowEmployeeViewUsers));
  const [profileSettingsError, setProfileSettingsError] = useState<string | null>(null);
  const [profileSettingsSuccess, setProfileSettingsSuccess] = useState<string | null>(null);
  const [isSavingProfileSettings, setIsSavingProfileSettings] = useState(false);
  const [churnRiskDaysThreshold, setChurnRiskDaysThreshold] = useState<number>(Math.max(1, Math.min(365, Number(brandIdentity.churnRiskDaysThreshold || 45))));
  const [churnSettingsError, setChurnSettingsError] = useState<string | null>(null);
  const [churnSettingsSuccess, setChurnSettingsSuccess] = useState<string | null>(null);
  const [isSavingChurnSettings, setIsSavingChurnSettings] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<AssinaturaApi | null>(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(false);
  const [isSavingSubscription, setIsSavingSubscription] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [subscriptionSuccess, setSubscriptionSuccess] = useState<string | null>(null);
  const [b2cPlans, setB2cPlans] = useState<AssinaturaClientePlanoApi[]>([]);
  const [isLoadingB2cPlans, setIsLoadingB2cPlans] = useState(false);
  const [b2cMessage, setB2cMessage] = useState<string | null>(null);
  const [b2cError, setB2cError] = useState<string | null>(null);
  const [b2cPlanName, setB2cPlanName] = useState('Plano Mensal');
  const [b2cPlanDescription, setB2cPlanDescription] = useState('');
  const [b2cPlanPriceReais, setB2cPlanPriceReais] = useState('99,00');
  const [b2cPlanGraceDays, setB2cPlanGraceDays] = useState('7');
  const [b2cPlanServiceId, setB2cPlanServiceId] = useState('');
  const [b2cPlanServiceQty, setB2cPlanServiceQty] = useState('1');
  const [b2cPlanBenefits, setB2cPlanBenefits] = useState<Array<{ servico_id: string; quantidade_mensal: number }>>([]);
  const [editingB2cPlanId, setEditingB2cPlanId] = useState<string | null>(null);
  const [b2cPlanSearchTerm, setB2cPlanSearchTerm] = useState('');
  const [b2cPlanSortField, setB2cPlanSortField] = useState<'NOME' | 'VALOR' | 'CARENCIA' | 'SERVICOS' | 'CLIENTES' | 'STATUS'>('NOME');
  const [b2cPlanSortDirection, setB2cPlanSortDirection] = useState<'ASC' | 'DESC'>('ASC');
  const [b2cPlanPriorityId, setB2cPlanPriorityId] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadAlertSettings = async () => {
      const response = await getNotificationChannelSettingsApi();
      if (!mounted) return;
      if (!response.success) {
        setAlertSettingsError(('error' in response ? response.error : '') || 'Falha ao carregar configurações de alertas.');
        setIsLoadingAlertSettings(false);
        return;
      }

      setIsWhatsappAlertsEnabled(Boolean(response.data.whatsapp_enabled));
      setIsEmailAlertsEnabled(Boolean(response.data.email_enabled));
      setAlertSettingsError(null);
      setIsLoadingAlertSettings(false);
    };

    loadAlertSettings();

    return () => {
      mounted = false;
    };
  }, []);

  const updateAlertChannelSettings = async (nextWhatsappEnabled: boolean, nextEmailEnabled: boolean) => {
    setIsSavingAlertSettings(true);
    setAlertSettingsError(null);

    const response = await saveNotificationChannelSettingsApi({
      whatsapp_enabled: nextWhatsappEnabled,
      email_enabled: nextEmailEnabled,
    });

    if (!response.success) {
      setAlertSettingsError(('error' in response ? response.error : '') || 'Falha ao salvar configurações de alertas.');
      setIsSavingAlertSettings(false);
      return false;
    }

    setIsWhatsappAlertsEnabled(Boolean(response.data.whatsapp_enabled));
    setIsEmailAlertsEnabled(Boolean(response.data.email_enabled));
    setIsSavingAlertSettings(false);
    return true;
  };

  const handleToggleWhatsappAlerts = async () => {
    if (isSavingAlertSettings) return;
    const previousWhatsapp = isWhatsappAlertsEnabled;
    const previousEmail = isEmailAlertsEnabled;
    const nextWhatsapp = !previousWhatsapp;

    setIsWhatsappAlertsEnabled(nextWhatsapp);
    const saved = await updateAlertChannelSettings(nextWhatsapp, previousEmail);
    if (!saved) {
      setIsWhatsappAlertsEnabled(previousWhatsapp);
      setIsEmailAlertsEnabled(previousEmail);
    }
  };

  const handleToggleEmailAlerts = async () => {
    if (isSavingAlertSettings) return;
    const previousWhatsapp = isWhatsappAlertsEnabled;
    const previousEmail = isEmailAlertsEnabled;
    const nextEmail = !previousEmail;

    setIsEmailAlertsEnabled(nextEmail);
    const saved = await updateAlertChannelSettings(previousWhatsapp, nextEmail);
    if (!saved) {
      setIsWhatsappAlertsEnabled(previousWhatsapp);
      setIsEmailAlertsEnabled(previousEmail);
    }
  };

  const openSupportEmailModal = () => {
    setSupportContactBarbeariaName(String(brandIdentity.name || '').trim());
    setSupportContactName('');
    setSupportContactMessage('');
    setSupportContactError(null);
    setSupportContactSuccess(null);
    setIsSupportEmailModalOpen(true);
  };

  const closeSupportEmailModal = () => {
    if (isSendingSupportContact) return;
    setIsSupportEmailModalOpen(false);
  };

  const submitSupportContact = async () => {
    const contactName = supportContactName.trim();
    const message = supportContactMessage.trim();

    if (!contactName) {
      setSupportContactError('Informe seu nome para contato.');
      return;
    }
    if (!message) {
      setSupportContactError('Descreva sua mensagem para o suporte.');
      return;
    }

    setIsSendingSupportContact(true);
    setSupportContactError(null);
    setSupportContactSuccess(null);

    const response = await sendSupportContactApi({
      contact_name: contactName,
      message,
    });

    if (!response.success) {
      setSupportContactError(('error' in response ? response.error : '') || 'Falha ao enviar mensagem para o suporte.');
      setIsSendingSupportContact(false);
      return;
    }

    setSupportContactSuccess('Mensagem enviada com sucesso para suporte@barbeiros.app.');
    setSupportContactMessage('');
    setIsSendingSupportContact(false);
  };
  const [isB2cPlanModalOpen, setIsB2cPlanModalOpen] = useState(false);
  const [isB2cDeleteModalOpen, setIsB2cDeleteModalOpen] = useState(false);
  const [b2cPlanToDelete, setB2cPlanToDelete] = useState<AssinaturaClientePlanoApi | null>(null);
  const [selectedB2cClientId, setSelectedB2cClientId] = useState('');
  const [b2cClientSearchText, setB2cClientSearchText] = useState('');
  const [isB2cClientSearchOpen, setIsB2cClientSearchOpen] = useState(false);
  const [selectedB2cPlanId, setSelectedB2cPlanId] = useState('');
  const [selectedClientSubscription, setSelectedClientSubscription] = useState<AssinaturaClienteResumoApi | null>(null);
  const [selectedClientPayments, setSelectedClientPayments] = useState<AssinaturaClientePagamentoApi[]>([]);
  const [b2cSubscribedClients, setB2cSubscribedClients] = useState<ClienteComAssinaturaApi[]>([]);
  const [b2cSubscribedClientSearchTerm, setB2cSubscribedClientSearchTerm] = useState('');
  const [b2cSubscribedClientStatusFilter, setB2cSubscribedClientStatusFilter] = useState<'ALL' | 'ACTIVE' | 'GRACE' | 'PAST_DUE' | 'PAUSED' | 'CANCELLED'>('ALL');
  const [b2cSubscribedClientPlanFilter, setB2cSubscribedClientPlanFilter] = useState('ALL');
  const [b2cSubscribedClientSortField, setB2cSubscribedClientSortField] = useState<'CLIENTE' | 'PLANO' | 'STATUS' | 'CICLO' | 'UTILIZACAO'>('CLIENTE');
  const [b2cSubscribedClientSortDirection, setB2cSubscribedClientSortDirection] = useState<'ASC' | 'DESC'>('ASC');
  const [isLoadingB2cSubscribedClients, setIsLoadingB2cSubscribedClients] = useState(false);
  const [isSavingB2c, setIsSavingB2c] = useState(false);
  const [manualPaymentMethod, setManualPaymentMethod] = useState('DINHEIRO');
  const [manualPaymentAmountReais, setManualPaymentAmountReais] = useState('');
  const [manualPaymentNote, setManualPaymentNote] = useState('');
  const [isB2cEditSubscriptionModalOpen, setIsB2cEditSubscriptionModalOpen] = useState(false);
  const [isB2cPaymentModalOpen, setIsB2cPaymentModalOpen] = useState(false);
  const [isB2cCancelSubscriptionModalOpen, setIsB2cCancelSubscriptionModalOpen] = useState(false);
  const [isB2cFlowHelpModalOpen, setIsB2cFlowHelpModalOpen] = useState(false);
  const [b2cSubscriptionToCancel, setB2cSubscriptionToCancel] = useState<ClienteComAssinaturaApi | null>(null);
  const [editingB2cClientSubscription, setEditingB2cClientSubscription] = useState<ClienteComAssinaturaApi | null>(null);
  const [editingB2cSubscriptionPlanId, setEditingB2cSubscriptionPlanId] = useState('');
  const [editingB2cSubscriptionStatus, setEditingB2cSubscriptionStatus] = useState<'ACTIVE' | 'PAUSED' | 'CANCELLED'>('ACTIVE');
  const [editingB2cSubscriptionReason, setEditingB2cSubscriptionReason] = useState('');
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const loginLogoInputRef = useRef<HTMLInputElement | null>(null);
  const loginBackgroundInputRef = useRef<HTMLInputElement | null>(null);
  const identityFormDirtyRef = useRef(false);

  const identityPalettes = [
    { name: 'Modern Blue', primary: '#2563eb', secondary: '#eff6ff', label: 'Confiança' },
    { name: 'Luxury Gold', primary: '#854d0e', secondary: '#fefce8', label: 'Premium' },
    { name: 'Classic Black', primary: '#171717', secondary: '#f5f5f5', label: 'Elegante' },
    { name: 'Vibrant Emerald', primary: '#059669', secondary: '#ecfdf5', label: 'Fresco' },
    { name: 'Royal Purple', primary: '#7c3aed', secondary: '#f5f3ff', label: 'Criativo' },
    { name: 'Warm Terracotta', primary: '#c2410c', secondary: '#fff7ed', label: 'Acolhedor' },
  ];

  const disclosurePublicUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const base = `${window.location.origin}${window.location.pathname}`;
    return base.endsWith('/') ? base.slice(0, -1) : base;
  }, []);

  const disclosureQrCodeUrl = useMemo(() => {
    if (!disclosurePublicUrl) return '';
    return `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(disclosurePublicUrl)}`;
  }, [disclosurePublicUrl]);

  useEffect(() => {
    setLocalBusinessHours(businessHours);
  }, [businessHours]);

  useEffect(() => {
    if (identityFormDirtyRef.current) return;
    setIdentityForm(brandIdentity);
  }, [brandIdentity]);

  const updateIdentityForm = (updater: React.SetStateAction<BrandIdentity>) => {
    identityFormDirtyRef.current = true;
    setIdentityForm(updater);
    setIdentityError(null);
    setIdentitySuccess(null);
  };

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
    setAllowEmployeeViewUsers(Boolean(brandIdentity.allowEmployeeViewUsers));
  }, [brandIdentity.allowEmployeeViewUsers]);

  useEffect(() => {
    setChurnRiskDaysThreshold(Math.max(1, Math.min(365, Number(brandIdentity.churnRiskDaysThreshold || 45))));
  }, [brandIdentity.churnRiskDaysThreshold]);

  const formatMoneyFromCents = (value: number) => {
    const safe = Number.isFinite(Number(value)) ? Number(value) : 0;
    return (safe / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const parseReaisToCents = (value: string) => {
    const normalized = String(value || '').trim().replace(/\./g, '').replace(',', '.');
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return Math.round(parsed * 100);
  };

  const formatCentsToReaisInput = (value: number) => {
    const safe = Number.isFinite(Number(value)) ? Number(value) : 0;
    return (safe / 100).toFixed(2).replace('.', ',');
  };

  const resetB2cPlanForm = () => {
    setEditingB2cPlanId(null);
    setB2cPlanName('Plano Mensal');
    setB2cPlanDescription('');
    setB2cPlanPriceReais('99,00');
    setB2cPlanGraceDays('7');
    setB2cPlanServiceId('');
    setB2cPlanServiceQty('1');
    setB2cPlanBenefits([]);
  };

  const filteredB2cPlans = useMemo(() => {
    const search = String(b2cPlanSearchTerm || '').trim().toLowerCase();
    const filtered = !search
      ? [...b2cPlans]
      : b2cPlans.filter((plan) => {
      const nome = String(plan.nome || '').toLowerCase();
      const descricao = String(plan.descricao || '').toLowerCase();
      return nome.includes(search) || descricao.includes(search);
    });

    const sorted = [...filtered].sort((left, right) => {
      let comparison = 0;
      if (b2cPlanSortField === 'VALOR') {
        comparison = Number(left.valor_mensal_centavos || 0) - Number(right.valor_mensal_centavos || 0);
      } else if (b2cPlanSortField === 'CARENCIA') {
        comparison = Number(left.dias_carencia || 0) - Number(right.dias_carencia || 0);
      } else if (b2cPlanSortField === 'SERVICOS') {
        comparison = Number(left.servicos?.length || 0) - Number(right.servicos?.length || 0);
      } else if (b2cPlanSortField === 'CLIENTES') {
        comparison = Number(left.clientes_ativos_count || 0) - Number(right.clientes_ativos_count || 0);
      } else if (b2cPlanSortField === 'STATUS') {
        comparison = Number(left.ativo ? 1 : 0) - Number(right.ativo ? 1 : 0);
      } else {
        comparison = String(left.nome || '').localeCompare(String(right.nome || ''), 'pt-BR');
      }

      if (comparison === 0) {
        comparison = String(left.nome || '').localeCompare(String(right.nome || ''), 'pt-BR');
      }

      return b2cPlanSortDirection === 'ASC' ? comparison : -comparison;
    });

    if (!b2cPlanPriorityId) return sorted;

    return [...sorted].sort((left, right) => {
      const leftPriority = String(left.id || '') === b2cPlanPriorityId ? 1 : 0;
      const rightPriority = String(right.id || '') === b2cPlanPriorityId ? 1 : 0;
      if (leftPriority !== rightPriority) return rightPriority - leftPriority;
      return 0;
    });
  }, [b2cPlans, b2cPlanPriorityId, b2cPlanSearchTerm, b2cPlanSortDirection, b2cPlanSortField]);

  const b2cClientOptions = useMemo(() => {
    return [...clients]
      .map((client) => ({
        id: client.id,
        name: client.name,
        phone: client.phone,
        label: client.phone ? `${client.name} (${client.phone})` : client.name,
      }))
      .sort((left, right) => String(left.name || '').localeCompare(String(right.name || ''), 'pt-BR'));
  }, [clients]);

  const b2cLinkableClientOptions = useMemo(() => {
    const subscribedClientIds = new Set(
      b2cSubscribedClients.map((item) => String(item.cliente_id || ''))
    );
    return b2cClientOptions.filter((item) => !subscribedClientIds.has(String(item.id || '')));
  }, [b2cClientOptions, b2cSubscribedClients]);

  const b2cSubscribedPlanOptions = useMemo(() => {
    const uniqueNames: string[] = Array.from(
      new Set(
        b2cSubscribedClients
          .map((item) => String(item.plano_nome || '').trim())
          .filter((name) => name.length > 0)
      )
    );
    return uniqueNames.sort((left, right) => left.localeCompare(right, 'pt-BR'));
  }, [b2cSubscribedClients]);

  const filteredB2cLinkableClients = useMemo(() => {
    const search = String(b2cClientSearchText || '').trim().toLowerCase();
    if (!search) return b2cLinkableClientOptions.slice(0, 8);
    return b2cLinkableClientOptions
      .filter((item) => {
        const name = String(item.name || '').toLowerCase();
        const phone = String(item.phone || '').toLowerCase();
        return name.includes(search) || phone.includes(search);
      })
      .slice(0, 8);
  }, [b2cClientSearchText, b2cLinkableClientOptions]);

  const filteredB2cSubscribedClients = useMemo(() => {
    const search = String(b2cSubscribedClientSearchTerm || '').trim().toLowerCase();

    const filtered = b2cSubscribedClients.filter((row) => {
      const normalizedStatus = String(row.status || '').toUpperCase();
      if (b2cSubscribedClientStatusFilter !== 'ALL' && normalizedStatus !== b2cSubscribedClientStatusFilter) {
        return false;
      }

      const planName = String(row.plano_nome || '').trim();
      if (b2cSubscribedClientPlanFilter !== 'ALL' && planName !== b2cSubscribedClientPlanFilter) {
        return false;
      }

      if (!search) return true;
      const clienteNome = String(row.cliente_nome || '').toLowerCase();
      const clienteTelefone = String(row.cliente_telefone || '').toLowerCase();
      const planoNome = String(row.plano_nome || '').toLowerCase();
      return (
        clienteNome.includes(search)
        || clienteTelefone.includes(search)
        || planoNome.includes(search)
      );
    });

    return [...filtered].sort((left, right) => {
      let comparison = 0;
      if (b2cSubscribedClientSortField === 'PLANO') {
        comparison = String(left.plano_nome || '').localeCompare(String(right.plano_nome || ''), 'pt-BR');
      } else if (b2cSubscribedClientSortField === 'STATUS') {
        comparison = String(left.status || '').localeCompare(String(right.status || ''), 'pt-BR');
      } else if (b2cSubscribedClientSortField === 'CICLO') {
        comparison = String(left.current_cycle_start || '').localeCompare(String(right.current_cycle_start || ''));
      } else if (b2cSubscribedClientSortField === 'UTILIZACAO') {
        comparison = Number(left.franquia_utilizacao_percent || 0) - Number(right.franquia_utilizacao_percent || 0);
      } else {
        comparison = String(left.cliente_nome || '').localeCompare(String(right.cliente_nome || ''), 'pt-BR');
      }

      if (comparison === 0) {
        comparison = String(left.cliente_nome || '').localeCompare(String(right.cliente_nome || ''), 'pt-BR');
      }

      return b2cSubscribedClientSortDirection === 'ASC' ? comparison : -comparison;
    });
  }, [
    b2cSubscribedClients,
    b2cSubscribedClientPlanFilter,
    b2cSubscribedClientSearchTerm,
    b2cSubscribedClientSortDirection,
    b2cSubscribedClientSortField,
    b2cSubscribedClientStatusFilter,
  ]);

  const handleB2cClientSearchChange = (value: string) => {
    setB2cClientSearchText(String(value || ''));
    setSelectedB2cClientId('');
    setIsB2cClientSearchOpen(true);
  };

  useEffect(() => {
    if (!selectedB2cClientId) {
      setB2cClientSearchText('');
      return;
    }
    const selectedClient = b2cLinkableClientOptions.find((item) => item.id === selectedB2cClientId);
    if (selectedClient) {
      setB2cClientSearchText(selectedClient.label);
      return;
    }
    setSelectedB2cClientId('');
    setB2cClientSearchText('');
  }, [selectedB2cClientId, b2cLinkableClientOptions]);

  const formatStatusLabel = (status?: string) => {
    const key = String(status || '').toUpperCase();
    if (key === 'TRIAL') return 'Trial';
    if (key === 'ACTIVE') return 'Ativo';
    if (key === 'PAST_DUE') return 'Pagamento pendente';
    if (key === 'CANCELLED') return 'Cancelado';
    if (key === 'SUSPENDED') return 'Suspenso';
    return key || 'Indefinido';
  };

  const formatStatusClass = (status?: string) => {
    const key = String(status || '').toUpperCase();
    if (key === 'TRIAL') return 'bg-blue-100 text-blue-700';
    if (key === 'ACTIVE') return 'bg-emerald-100 text-emerald-700';
    if (key === 'PAST_DUE') return 'bg-amber-100 text-amber-700';
    if (key === 'CANCELLED') return 'bg-red-100 text-red-700';
    if (key === 'SUSPENDED') return 'bg-slate-200 text-slate-700';
    return 'bg-gray-100 text-gray-700';
  };

  const formatAsaasPaymentStatusLabel = (status?: string) => {
    const key = String(status || '').toUpperCase();
    if (key === 'RECEIVED' || key === 'RECEIVED_IN_CASH' || key === 'CONFIRMED') return 'Pago';
    if (key === 'PENDING') return 'Pendente';
    if (key === 'OVERDUE') return 'Vencido';
    if (key === 'REFUNDED') return 'Estornado';
    return key || 'Indefinido';
  };

  const formatAsaasPaymentStatusClass = (status?: string) => {
    const key = String(status || '').toUpperCase();
    if (key === 'RECEIVED' || key === 'RECEIVED_IN_CASH' || key === 'CONFIRMED') return 'bg-emerald-100 text-emerald-700';
    if (key === 'PENDING') return 'bg-blue-100 text-blue-700';
    if (key === 'OVERDUE') return 'bg-amber-100 text-amber-700';
    if (key === 'REFUNDED') return 'bg-slate-200 text-slate-700';
    return 'bg-gray-100 text-gray-700';
  };

  const formatBillingTypeLabel = (billingType?: string) => {
    const key = String(billingType || '').toUpperCase();
    if (key === 'CREDIT_CARD') return 'Cartão de crédito';
    if (key === 'BOLETO') return 'Boleto';
    if (key === 'PIX') return 'PIX';
    if (key === 'UNDEFINED') return 'A definir';
    return key || 'Não informado';
  };

  const formatB2cStatusLabel = (status?: string) => {
    const key = String(status || '').toUpperCase();
    if (key === 'ACTIVE') return 'Ativa';
    if (key === 'GRACE') return 'Em carência';
    if (key === 'PAST_DUE') return 'Inadimplente';
    if (key === 'PAUSED') return 'Pausada';
    if (key === 'CANCELLED') return 'Cancelada';
    return key || 'Indefinido';
  };

  const formatB2cStatusClass = (status?: string) => {
    const key = String(status || '').toUpperCase();
    if (key === 'ACTIVE') return 'bg-emerald-100 text-emerald-700';
    if (key === 'GRACE') return 'bg-blue-100 text-blue-700';
    if (key === 'PAST_DUE') return 'bg-amber-100 text-amber-700';
    if (key === 'PAUSED') return 'bg-slate-200 text-slate-700';
    if (key === 'CANCELLED') return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-700';
  };

  const loadSubscription = async () => {
    if (isLoadingSubscription) return;
    setIsLoadingSubscription(true);
    setSubscriptionError(null);

    const result = await getAssinaturaApi();
    if (!result.success) {
      setSubscriptionError(('error' in result && result.error) || 'Falha ao carregar assinatura.');
      setIsLoadingSubscription(false);
      return;
    }

    setSubscriptionData(result.data);
    setIsLoadingSubscription(false);
  };

  const handleChoosePlan = async (cycle: 'MONTHLY' | 'YEARLY') => {
    if (isSavingSubscription) return;
    setIsSavingSubscription(true);
    setSubscriptionError(null);
    setSubscriptionSuccess(null);

    const shouldStartTrial = Boolean(!subscriptionData?.trial_usado && !subscriptionData?.trial_inicio_em);
    const result = await saveAssinaturaApi({
      ciclo_cobranca: cycle,
      iniciar_trial: shouldStartTrial,
    });

    if (!result.success) {
      setSubscriptionError(('error' in result && result.error) || 'Falha ao salvar plano.');
      setIsSavingSubscription(false);
      return;
    }

    setSubscriptionData(result.data);
    setSubscriptionSuccess(shouldStartTrial ? 'Plano selecionado com trial de 7 dias iniciado.' : 'Plano atualizado com sucesso.');
    setIsSavingSubscription(false);
  };

  const handleOpenPaymentLink = async (tier: PlanTier) => {
    if (isSavingSubscription || isLoadingSubscription) return;

    setIsSavingSubscription(true);
    setSubscriptionError(null);
    setSubscriptionSuccess(null);

    let installmentCount: number | undefined;
    if (billingCycle === 'YEARLY') {
      const rawInstallments = window.prompt('Em quantas parcelas deseja dividir o anual? (1 a 12)', '12');
      if (rawInstallments === null) {
        setIsSavingSubscription(false);
        return;
      }

      const parsedInstallments = Number.parseInt(rawInstallments, 10);
      if (!Number.isInteger(parsedInstallments) || parsedInstallments < 1 || parsedInstallments > 12) {
        setSubscriptionError('Informe uma quantidade de parcelas válida entre 1 e 12.');
        setIsSavingSubscription(false);
        return;
      }
      installmentCount = parsedInstallments;
    }

    const result = await createCheckoutApi({
      ciclo_cobranca: billingCycle,
      plano_tier: tier,
      installment_count: installmentCount,
    });

    if (!result.success) {
      setSubscriptionError(('error' in result && result.error) || 'Falha ao gerar checkout no Mercado Pago.');
      setIsSavingSubscription(false);
      return;
    }

    const initPoint = String(result.data?.init_point || '').trim();
    if (!initPoint) {
      setSubscriptionError('Checkout indisponível para o plano selecionado.');
      setIsSavingSubscription(false);
      return;
    }

    window.open(initPoint, '_blank', 'noopener,noreferrer');
    const parcelaLabel = billingCycle === 'YEARLY' && installmentCount ? ` (${installmentCount}x)` : '';
    setSubscriptionSuccess(`Checkout aberto em uma nova aba${parcelaLabel}. Após pagamento confirmado, o status será atualizado no sistema.`);
    setIsSavingSubscription(false);
  };

  useEffect(() => {
    if (activeSubTab !== 'BILLING') return;
    if (subscriptionData) return;
    loadSubscription();
  }, [activeSubTab]);

  const loadB2cPlans = async () => {
    if (isLoadingB2cPlans) return;
    setIsLoadingB2cPlans(true);
    setB2cError(null);
    const result = await listPlanosAssinaturaClienteApi();
    if (!result.success) {
      setB2cError(('error' in result && result.error) || 'Falha ao carregar planos B2C.');
      setIsLoadingB2cPlans(false);
      return;
    }
    setB2cPlans(result.data || []);
    setIsLoadingB2cPlans(false);
  };

  const loadSelectedClientSubscription = async (clienteId: string) => {
    if (!clienteId) {
      setSelectedClientSubscription(null);
      setSelectedClientPayments([]);
      return;
    }

    const [assinaturaRes, pagamentosRes] = await Promise.all([
      getAssinaturaClienteApi(clienteId),
      listPagamentosAssinaturaClienteApi(clienteId),
    ]);

    if (!assinaturaRes.success) {
      setB2cError(('error' in assinaturaRes && assinaturaRes.error) || 'Falha ao carregar assinatura do cliente.');
      setSelectedClientSubscription(null);
    } else {
      setSelectedClientSubscription(assinaturaRes.data || null);
    }

    if (!pagamentosRes.success) {
      setSelectedClientPayments([]);
    } else {
      setSelectedClientPayments(pagamentosRes.data || []);
    }
  };

  const loadB2cSubscribedClients = async () => {
    if (isLoadingB2cSubscribedClients) return;
    setIsLoadingB2cSubscribedClients(true);
    setB2cError(null);

    const response = await listClientesComAssinaturaApi();
    if (!response.success) {
      setB2cSubscribedClients([]);
      setB2cError(('error' in response && response.error) || 'Falha ao carregar clientes com assinaturas.');
      setIsLoadingB2cSubscribedClients(false);
      return;
    }

    setB2cSubscribedClients(response.data || []);
    setIsLoadingB2cSubscribedClients(false);
  };

  useEffect(() => {
    if (activeSubTab !== 'SUBSCRIPTIONS') return;
    loadB2cPlans();
  }, [activeSubTab]);

  useEffect(() => {
    if (activeSubTab !== 'SUBSCRIPTIONS') return;
    if (activeSubscriptionsTab !== 'LINK_PLANS') return;
    if (!selectedB2cClientId) return;
    loadSelectedClientSubscription(selectedB2cClientId);
  }, [selectedB2cClientId, activeSubTab, activeSubscriptionsTab]);

  useEffect(() => {
    if (activeSubTab !== 'SUBSCRIPTIONS') return;
    if (activeSubscriptionsTab !== 'CLIENTS_LIST' && activeSubscriptionsTab !== 'LINK_PLANS') return;
    loadB2cSubscribedClients();
  }, [activeSubTab, activeSubscriptionsTab, clients]);

  const addBenefitToDraftPlan = () => {
    const servicoId = String(b2cPlanServiceId || '').trim();
    const quantidade = Number(b2cPlanServiceQty || 0);
    if (!servicoId || !Number.isFinite(quantidade) || quantidade <= 0) {
      setB2cError('Selecione um serviço e uma quantidade mensal válida.');
      return;
    }
    if (b2cPlanBenefits.some((item) => item.servico_id === servicoId)) {
      setB2cError('Este serviço já foi adicionado ao plano.');
      return;
    }
    setB2cError(null);
    setB2cPlanBenefits((prev) => [...prev, { servico_id: servicoId, quantidade_mensal: quantidade }]);
  };

  const removeBenefitFromDraftPlan = (servicoId: string) => {
    setB2cPlanBenefits((prev) => prev.filter((item) => item.servico_id !== servicoId));
  };

  const handleCreateB2cPlan = async () => {
    if (isSavingB2c) return;
    const nome = String(b2cPlanName || '').trim();
    const valorCentavos = parseReaisToCents(b2cPlanPriceReais);
    const carencia = Number(b2cPlanGraceDays || 7);

    if (!nome) {
      setB2cError('Nome do plano é obrigatório.');
      return;
    }
    if (!valorCentavos) {
      setB2cError('Valor mensal em R$ deve ser maior que zero.');
      return;
    }
    if (!Number.isFinite(carencia) || carencia < 0 || carencia > 30) {
      setB2cError('Carência deve estar entre 0 e 30 dias.');
      return;
    }
    if (b2cPlanBenefits.length === 0) {
      setB2cError('Adicione ao menos um serviço no plano.');
      return;
    }

    setIsSavingB2c(true);
    setB2cError(null);
    setB2cMessage(null);

    const payload = {
      nome,
      descricao: String(b2cPlanDescription || '').trim() || null,
      valor_mensal_centavos: valorCentavos,
      dias_carencia: Math.trunc(carencia),
      servicos: b2cPlanBenefits,
    };

    const result = editingB2cPlanId
      ? await updatePlanoAssinaturaClienteApi(editingB2cPlanId, {
          ...payload,
          ativo: true,
        })
      : await createPlanoAssinaturaClienteApi(payload);

    if (!result.success) {
      setB2cError(('error' in result && result.error) || (editingB2cPlanId ? 'Falha ao atualizar plano B2C.' : 'Falha ao criar plano B2C.'));
      setIsSavingB2c(false);
      return;
    }

    setB2cMessage(editingB2cPlanId ? 'Plano B2C atualizado com sucesso.' : 'Plano B2C criado com sucesso.');
    resetB2cPlanForm();
    setIsB2cPlanModalOpen(false);
    await loadB2cPlans();
    setIsSavingB2c(false);
  };

  const handleEditB2cPlan = (plan: AssinaturaClientePlanoApi) => {
    setEditingB2cPlanId(plan.id);
    setB2cPlanName(plan.nome || '');
    setB2cPlanDescription(plan.descricao || '');
    setB2cPlanPriceReais(formatCentsToReaisInput(Number(plan.valor_mensal_centavos || 0)));
    setB2cPlanGraceDays(String(plan.dias_carencia || 7));
    setB2cPlanBenefits((plan.servicos || []).map((item) => ({
      servico_id: item.servico_id,
      quantidade_mensal: Number(item.quantidade_mensal || 1),
    })));
    setB2cMessage(null);
    setB2cError(null);
    setIsB2cPlanModalOpen(true);
  };

  const handleRequestDeleteB2cPlan = (plan: AssinaturaClientePlanoApi) => {
    setB2cPlanToDelete(plan);
    setIsB2cDeleteModalOpen(true);
    setB2cError(null);
  };

  const handleDeleteB2cPlan = async () => {
    if (isSavingB2c) return;
    if (!b2cPlanToDelete) return;

    setIsSavingB2c(true);
    setB2cMessage(null);
    setB2cError(null);

    const result = await deletePlanoAssinaturaClienteApi(b2cPlanToDelete.id);
    if (!result.success) {
      setB2cError(('error' in result && result.error) || 'Falha ao excluir plano B2C.');
      setIsSavingB2c(false);
      return;
    }

    if (editingB2cPlanId === b2cPlanToDelete.id) {
      resetB2cPlanForm();
      setIsB2cPlanModalOpen(false);
    }

    setB2cMessage('Plano excluído com sucesso.');
    setIsB2cDeleteModalOpen(false);
    setB2cPlanToDelete(null);
    await loadB2cPlans();
    setIsSavingB2c(false);
  };

  const handleAssignSubscriptionToClient = async () => {
    if (isSavingB2c) return;
    if (!selectedB2cClientId || !selectedB2cPlanId) {
      setB2cError('Selecione cliente e plano para ativar assinatura.');
      return;
    }
    setIsSavingB2c(true);
    setB2cError(null);
    setB2cMessage(null);

    const result = await upsertAssinaturaClienteApi(selectedB2cClientId, selectedB2cPlanId);
    if (!result.success) {
      setB2cError(('error' in result && result.error) || 'Falha ao ativar assinatura do cliente.');
      setIsSavingB2c(false);
      return;
    }

    setSelectedClientSubscription(result.data || null);
    setB2cMessage('Assinatura vinculada ao cliente com sucesso.');
    await loadSelectedClientSubscription(selectedB2cClientId);
    setIsSavingB2c(false);
  };

  const handleOpenEditB2cSubscriptionModal = async (row: ClienteComAssinaturaApi) => {
    setEditingB2cClientSubscription(row);
    setEditingB2cSubscriptionPlanId(String(row.plano_id || ''));

    const initialStatus = String(row.status || '').toUpperCase();
    if (initialStatus === 'PAUSED' || initialStatus === 'CANCELLED') {
      setEditingB2cSubscriptionStatus(initialStatus);
    } else {
      setEditingB2cSubscriptionStatus('ACTIVE');
    }

    setEditingB2cSubscriptionReason('');
    setSelectedB2cClientId(row.cliente_id);
    setIsB2cEditSubscriptionModalOpen(true);
    await loadSelectedClientSubscription(row.cliente_id);
  };

  const handleSaveB2cSubscriptionEdition = async () => {
    if (isSavingB2c) return;
    if (!editingB2cClientSubscription) {
      setB2cError('Nenhuma assinatura selecionada para edição.');
      return;
    }
    if (!editingB2cSubscriptionPlanId) {
      setB2cError('Selecione um plano para a assinatura.');
      return;
    }

    const clienteId = String(editingB2cClientSubscription.cliente_id || '');
    if (!clienteId) {
      setB2cError('Cliente inválido para edição de assinatura.');
      return;
    }

    setIsSavingB2c(true);
    setB2cError(null);
    setB2cMessage(null);

    const planChanged = String(editingB2cClientSubscription.plano_id || '') !== editingB2cSubscriptionPlanId;
    const targetStatus = String(editingB2cSubscriptionStatus || 'ACTIVE').toUpperCase();

    if (planChanged) {
      const updatePlanResult = await upsertAssinaturaClienteApi(clienteId, editingB2cSubscriptionPlanId);
      if (!updatePlanResult.success) {
        setB2cError(('error' in updatePlanResult && updatePlanResult.error) || 'Falha ao trocar o plano da assinatura.');
        setIsSavingB2c(false);
        return;
      }
    }

    if (targetStatus === 'CANCELLED') {
      const cancelResult = await cancelAssinaturaClienteApi(
        clienteId,
        String(editingB2cSubscriptionReason || '').trim() || 'Cancelada manualmente pela gestão.'
      );
      if (!cancelResult.success) {
        setB2cError(('error' in cancelResult && cancelResult.error) || 'Falha ao cancelar assinatura.');
        setIsSavingB2c(false);
        return;
      }
    } else {
      const statusResult = await updateStatusAssinaturaClienteApi(clienteId, {
        status: targetStatus as 'ACTIVE' | 'PAUSED',
        motivo: String(editingB2cSubscriptionReason || '').trim() || undefined,
      });
      if (!statusResult.success) {
        setB2cError(('error' in statusResult && statusResult.error) || 'Falha ao atualizar status da assinatura.');
        setIsSavingB2c(false);
        return;
      }
    }

    setB2cMessage('Assinatura atualizada com sucesso.');
    setIsB2cEditSubscriptionModalOpen(false);
    setEditingB2cClientSubscription(null);
    await loadB2cSubscribedClients();

    if (activeSubscriptionsTab === 'LINK_PLANS' && selectedB2cClientId === clienteId) {
      await loadSelectedClientSubscription(clienteId);
    }
    setIsSavingB2c(false);
  };

  const handleOpenB2cPaymentModal = async (row: ClienteComAssinaturaApi) => {
    setSelectedB2cClientId(row.cliente_id);
    setManualPaymentMethod('DINHEIRO');
    setManualPaymentAmountReais('');
    setManualPaymentNote('');
    setIsB2cPaymentModalOpen(true);
    await loadSelectedClientSubscription(row.cliente_id);
  };

  const handleOpenCancelB2cClientSubscriptionModal = (row: ClienteComAssinaturaApi) => {
    setB2cSubscriptionToCancel(row);
    setIsB2cCancelSubscriptionModalOpen(true);
  };

  const handleCancelB2cClientSubscription = async () => {
    if (isSavingB2c) return;
    if (!b2cSubscriptionToCancel) return;

    const row = b2cSubscriptionToCancel;

    setIsSavingB2c(true);
    setB2cError(null);
    setB2cMessage(null);

    const result = await cancelAssinaturaClienteApi(
      row.cliente_id,
      'Cancelada manualmente pela gestão na lista de assinaturas.'
    );

    if (!result.success) {
      setB2cError(('error' in result && result.error) || 'Falha ao cancelar assinatura do cliente.');
      setIsSavingB2c(false);
      return;
    }

    if (selectedB2cClientId === row.cliente_id) {
      setSelectedB2cClientId('');
      setSelectedClientSubscription(null);
      setSelectedClientPayments([]);
    }

    setB2cMessage('Assinatura cancelada com sucesso. A vinculação com o plano foi removida.');
    await loadB2cSubscribedClients();
    setIsB2cCancelSubscriptionModalOpen(false);
    setB2cSubscriptionToCancel(null);
    setIsSavingB2c(false);
  };

  const handleRegisterManualSubscriptionPayment = async () => {
    if (isSavingB2c) return;
    if (!selectedB2cClientId) {
      setB2cError('Selecione um cliente para registrar pagamento.');
      return;
    }
    const amountCentavos = manualPaymentAmountReais.trim() ? parseReaisToCents(manualPaymentAmountReais) : undefined;
    if (manualPaymentAmountReais.trim() && !amountCentavos) {
      setB2cError('Valor do pagamento inválido.');
      return;
    }

    setIsSavingB2c(true);
    setB2cError(null);
    setB2cMessage(null);

    const result = await createPagamentoAssinaturaClienteApi(selectedB2cClientId, {
      metodo: manualPaymentMethod,
      amount_centavos: amountCentavos,
      observacao: String(manualPaymentNote || '').trim() || undefined,
    });

    if (!result.success) {
      setB2cError(('error' in result && result.error) || 'Falha ao registrar pagamento manual.');
      setIsSavingB2c(false);
      return;
    }

    setB2cMessage('Pagamento manual registrado com sucesso.');
    setManualPaymentAmountReais('');
    setManualPaymentNote('');
    await loadSelectedClientSubscription(selectedB2cClientId);
    await loadB2cSubscribedClients();
    setIsB2cPaymentModalOpen(false);
    setIsSavingB2c(false);
  };

  const currentCycle = String(subscriptionData?.ciclo_cobranca || 'MONTHLY').toUpperCase() === 'YEARLY' ? 'YEARLY' : 'MONTHLY';
  const currentValue = Number(subscriptionData?.valor_plano_centavos || 0);
  const currentPlanCard = PLAN_CARDS.find((card) => {
    if (currentCycle === 'MONTHLY') return card.monthlyCents === currentValue;
    return card.yearlyCents === currentValue;
  }) || PLAN_CARDS.find((card) => card.tier === 'PROFISSIONAL') || PLAN_CARDS[0];
  const effectiveStatus = subscriptionData?.assinatura_status_efetivo || subscriptionData?.assinatura_status;
  const isTrialRunning = String(effectiveStatus || '').toUpperCase() === 'TRIAL';
  const billingPlansList = useMemo(() => {
    const term = String(billingPlanSearchTerm || '').trim().toLowerCase();
    const list = PLAN_CARDS
      .filter((plan) => {
        if (!term) return true;
        return [plan.title, plan.subtitle, plan.limitLabel].join(' ').toLowerCase().includes(term);
      })
      .map((plan) => {
        const price = billingCycle === 'YEARLY' ? plan.yearlyCents : plan.monthlyCents;
        return {
          ...plan,
          price,
          customersSort: plan.tier === 'ESSENCIAL' ? 400 : (plan.tier === 'PROFISSIONAL' ? 1000 : Number.MAX_SAFE_INTEGER),
        };
      });

    list.sort((a, b) => {
      let result = 0;
      if (billingPlanSortField === 'VALOR') {
        result = a.price - b.price;
      } else if (billingPlanSortField === 'CLIENTES') {
        result = a.customersSort - b.customersSort;
      } else {
        result = a.title.localeCompare(b.title);
      }
      return billingPlanSortDirection === 'ASC' ? result : -result;
    });

    return list;
  }, [billingPlanSearchTerm, billingPlanSortField, billingPlanSortDirection, billingCycle]);

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
      phone: identityForm.phone?.trim() || undefined,
      city: identityForm.city?.trim() || undefined,
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

    identityFormDirtyRef.current = false;
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
      allowEmployeeViewUsers,
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

        updateIdentityForm(prev => ({ ...prev, [field]: result }));
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

  const loadImageDataUrl = async (url: string): Promise<string | null> => {
    if (!url) return null;
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const element = new Image();
        element.crossOrigin = 'anonymous';
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error('Falha ao carregar imagem.'));
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

  const handleGenerateDisclosurePdf = async () => {
    if (isGeneratingDisclosurePdf) return;
    if (!disclosurePublicUrl || !disclosureQrCodeUrl) {
      setDisclosureError('Não foi possível identificar a URL pública da barbearia para gerar o QR Code.');
      setDisclosureSuccess(null);
      return;
    }

    setIsGeneratingDisclosurePdf(true);
    setDisclosureError(null);
    setDisclosureSuccess(null);

    try {
      const barbershopName = String(identityForm.name || brandIdentity.name || 'Sua Barbearia').trim() || 'Sua Barbearia';
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 36;

      const logoUrl = safeIdentityAssetSrc(identityForm.logoUrl || brandIdentity.logoUrl || '', 300000) || '';
      const logoDataUrl = await loadImageDataUrl(logoUrl);
      const qrDataUrl = await loadImageDataUrl(disclosureQrCodeUrl);

      let currentY = 44;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(31, 41, 55);
      doc.text('Divulgação Digital', pageWidth / 2, currentY, { align: 'center' });
      currentY += 30;

      if (logoDataUrl) {
        const logoSize = 58;
        doc.addImage(logoDataUrl, 'PNG', (pageWidth - logoSize) / 2, currentY, logoSize, logoSize);
        currentY += logoSize + 16;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(26);
      doc.text(barbershopName, pageWidth / 2, currentY, { align: 'center', maxWidth: pageWidth - margin * 2 });
      currentY += 34;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(13);
      doc.setTextColor(75, 85, 99);
      doc.text('Escaneie o QR Code para acessar a barbearia no AgendeFácil', pageWidth / 2, currentY, { align: 'center' });
      currentY += 22;

      const qrSize = 240;
      if (qrDataUrl) {
        doc.addImage(qrDataUrl, 'PNG', (pageWidth - qrSize) / 2, currentY, qrSize, qrSize);
      } else {
        doc.setDrawColor(209, 213, 219);
        doc.rect((pageWidth - qrSize) / 2, currentY, qrSize, qrSize);
        doc.setFontSize(11);
        doc.setTextColor(107, 114, 128);
        doc.text('QR Code indisponível', pageWidth / 2, currentY + qrSize / 2, { align: 'center' });
      }

      currentY += qrSize + 24;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(55, 65, 81);
      doc.text('Link direto:', pageWidth / 2, currentY, { align: 'center' });

      currentY += 16;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(37, 99, 235);
      doc.text(disclosurePublicUrl, pageWidth / 2, currentY, { align: 'center', maxWidth: pageWidth - margin * 2 });

      const safeName = barbershopName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase() || 'barbearia';

      doc.save(`divulgacao_${safeName}.pdf`);
      setDisclosureSuccess('PDF gerado com sucesso.');
    } catch {
      setDisclosureError('Não foi possível gerar o PDF de divulgação.');
    } finally {
      setIsGeneratingDisclosurePdf(false);
    }
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
    const hasProfessionalRecord = Boolean(selectedProfessional?.hasProfessionalRecord);

    if (selectedProfessional && !data.hasAccess) {
      const profissionalPayload = {
        id: selectedProfessional.id,
        nome,
        cargo,
        telefone,
        foto_url: fotoUrl,
        comissao_percentual: Number(comissaoPercentual.toFixed(2)),
        ativo: true,
      };

      const profissionalResult = hasProfessionalRecord
        ? await updateProfissionalApi(selectedProfessional.id, profissionalPayload)
        : await createProfissionalApi(profissionalPayload);

      if (!profissionalResult.success) {
        return { success: false, error: ('error' in profissionalResult && profissionalResult.error) ? profissionalResult.error : 'Falha ao atualizar profissional.' };
      }
    } else if (!selectedProfessional && !data.hasAccess) {
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
      ? await updateUser({
          ...linkedUser,
          active: false,
        })
      : await deactivateProfessional(professionalToDelete.id);
    if (!result.success) {
      setDeleteProfessionalError(result.error || 'Falha ao inativar profissional.');
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
    { id: 'PROFILES', label: 'Perfis', icon: <Shield size={18} />, desc: 'Níveis de permissão' },
    { id: 'HOURS', label: 'Horários', icon: <Clock size={18} />, desc: 'Funcionamento' },
    { id: 'INTEGRATIONS', label: 'Integrações', icon: <Zap size={18} />, desc: 'APIs externas' },
    { id: 'BILLING', label: 'Faturamento', icon: <CreditCard size={18} />, desc: 'Assinatura e faturas' },
    { id: 'SUBSCRIPTIONS', label: 'Assinaturas', icon: <Users size={18} />, desc: 'Planos e assinaturas de clientes' },
    { id: 'OTHER', label: 'Identidade', icon: <Settings size={18} />, desc: 'Marca e cores' },
    { id: 'ONBOARDING', label: 'Onboarding', icon: <List size={18} />, desc: 'Configuração inicial' },
    { id: 'CONTACT', label: 'Fale Conosco', icon: <Headphones size={18} />, desc: 'Suporte e ajuda' },
  ];

  const helpCenterSections = useMemo(() => ([
    {
      id: 'START',
      title: 'Primeiros passos',
      description: 'Configuração inicial para começar a usar a plataforma rapidamente.',
      articles: [
        { id: 'START_1', title: 'Como configurar sua barbearia em 15 minutos' },
        { id: 'START_2', title: 'Cadastro de serviços e duração de atendimento' },
        { id: 'START_3', title: 'Cadastro de profissionais e permissões básicas' },
        { id: 'START_4', title: 'Checklist de ativação da agenda' },
      ],
    },
    {
      id: 'AGENDA',
      title: 'Agenda e atendimentos',
      description: 'Operação diária de agendamentos e fluxo de atendimento.',
      articles: [
        { id: 'AGENDA_1', title: 'Criar, remarcar e cancelar agendamentos' },
        { id: 'AGENDA_2', title: 'Como usar bloqueio de horário e encaixes' },
        { id: 'AGENDA_3', title: 'No-show: boas práticas e status corretos' },
        { id: 'AGENDA_4', title: 'Fluxo recomendado até conclusão financeira' },
      ],
    },
    {
      id: 'CLIENTS',
      title: 'Clientes e CRM',
      description: 'Organização da base de clientes e relacionamento.',
      articles: [
        { id: 'CLIENTS_1', title: 'Cadastro completo de clientes e histórico' },
        { id: 'CLIENTS_2', title: 'Segmentação de clientes recorrentes e inativos' },
        { id: 'CLIENTS_3', title: 'Reativação de clientes com campanhas' },
        { id: 'CLIENTS_4', title: 'LGPD: dados e consentimento do cliente' },
      ],
    },
    {
      id: 'FINANCE',
      title: 'Financeiro',
      description: 'Controle de caixa, recebimentos, estornos e conferência.',
      articles: [
        { id: 'FINANCE_1', title: 'Fechamento diário de caixa' },
        { id: 'FINANCE_2', title: 'Registrar pagamento parcial e quitação' },
        { id: 'FINANCE_3', title: 'Quando e como registrar estorno' },
        { id: 'FINANCE_4', title: 'Leitura dos indicadores financeiros principais' },
      ],
    },
    {
      id: 'SUBSCRIPTIONS',
      title: 'Assinaturas de clientes',
      description: 'Planos, vinculação de cliente e regras de utilização.',
      articles: [
        { id: 'SUBSCRIPTIONS_1', title: 'Como criar um plano de assinatura' },
        { id: 'SUBSCRIPTIONS_2', title: 'Vincular plano ao cliente' },
        { id: 'SUBSCRIPTIONS_3', title: 'Uso da franquia e consumo por atendimento' },
        { id: 'SUBSCRIPTIONS_4', title: 'Pausar, cancelar e reativar assinatura' },
      ],
    },
    {
      id: 'REPORTS',
      title: 'Relatórios',
      description: 'Análises de faturamento, ocupação e desempenho.',
      articles: [
        { id: 'REPORTS_1', title: 'Como filtrar relatórios por período' },
        { id: 'REPORTS_2', title: 'Relatório de ocupação e no-show' },
        { id: 'REPORTS_3', title: 'Relatório de faturamento por profissional' },
        { id: 'REPORTS_4', title: 'Exportação em PDF e Excel' },
      ],
    },
  ]), []);

  const filteredHelpCenterSections = useMemo(() => {
    const query = String(helpCenterSearchTerm || '').trim().toLowerCase();
    if (!query) return helpCenterSections;

    return helpCenterSections
      .map((section) => {
        const titleMatches = section.title.toLowerCase().includes(query);
        const descriptionMatches = section.description.toLowerCase().includes(query);
        const articles = section.articles.filter((article) => article.title.toLowerCase().includes(query));

        if (titleMatches || descriptionMatches) {
          return section;
        }

        if (articles.length > 0) {
          return {
            ...section,
            articles,
          };
        }

        return null;
      })
      .filter((section): section is typeof helpCenterSections[number] => Boolean(section));
  }, [helpCenterSearchTerm, helpCenterSections]);

  const helpCenterArticlesCount = useMemo(() => {
    return filteredHelpCenterSections.reduce((acc, section) => acc + section.articles.length, 0);
  }, [filteredHelpCenterSections]);

  const flattenedHelpCenterArticles = useMemo(() => {
    return filteredHelpCenterSections.flatMap((section) =>
      section.articles.map((article) => ({
        ...article,
        sectionId: section.id,
        sectionTitle: section.title,
      })),
    );
  }, [filteredHelpCenterSections]);

  const selectedHelpArticle = useMemo(() => {
    return flattenedHelpCenterArticles.find((article) => article.id === selectedHelpArticleId) || null;
  }, [flattenedHelpCenterArticles, selectedHelpArticleId]);

  const helpCenterArticleContent = useMemo<Record<string, { summary: string; where: string; steps: string[]; warnings: string[] }>>(() => ({
    START_1: {
      summary: 'Configuração inicial da barbearia usando os blocos de Identidade, Horários, Serviços e Profissionais.',
      where: 'Configurações > Identidade, Horários, Serviços e Profissionais.',
      steps: ['Defina nome, logo e cores da marca.', 'Configure dias/horários de funcionamento.', 'Cadastre serviços com duração e preço.', 'Cadastre equipe e valide permissões.'],
      warnings: ['Não deixe horário de fim menor que início.', 'Evite criar serviços sem duração definida.'],
    },
    START_2: {
      summary: 'Serviços são cadastrados com título, categoria, duração e preço para uso em agenda e relatórios.',
      where: 'Configurações > Serviços.',
      steps: ['Crie categorias se necessário.', 'Cadastre serviço com duração em minutos.', 'Defina preço e descrição comercial.', 'Valide disponibilidade para profissionais.'],
      warnings: ['Preço/descritivo inconsistentes afetam relatórios.', 'Serviço removido pode aparecer como “Serviço removido” em históricos.'],
    },
    START_3: {
      summary: 'Profissionais podem ser vinculados a usuário com perfil e permissões de operação.',
      where: 'Configurações > Profissionais e Perfis.',
      steps: ['Cadastre profissional com cargo e comissão.', 'Ative acesso (usuário) quando necessário.', 'Ajuste permissões de equipe (agenda/financeiro/relatórios).'],
      warnings: ['Equipe sem permissão não conclui financeiro.', 'Usuário sem vínculo correto limita operação.'],
    },
    START_4: {
      summary: 'Checklist de ativação para reduzir falhas operacionais no primeiro uso.',
      where: 'Configurações > Horários, Serviços, Profissionais, Alertas e Integrações.',
      steps: ['Valide horários de funcionamento.', 'Confirme serviços e profissionais ativos.', 'Revise canais de alerta (WhatsApp/e-mail).', 'Teste agendamento completo até conclusão financeira.'],
      warnings: ['Sem teste fim-a-fim, erros só aparecem em produção.', 'Permissões de equipe devem ser revisadas antes de abrir agenda.'],
    },
    AGENDA_1: {
      summary: 'Criação, edição e cancelamento de agendamentos com validações de horário e perfil.',
      where: 'Agenda e Central de Agendamentos.',
      steps: ['Crie agendamento com cliente, serviço e profissional.', 'Use editar para remarcação.', 'Cancele quando necessário com motivo.', 'Acompanhe status até confirmação.'],
      warnings: ['Reagendar sem confirmar disponibilidade gera conflito.', 'Cancelamentos sem padrão dificultam análise.'],
    },
    AGENDA_2: {
      summary: 'Bloqueios de agenda impedem encaixes indevidos e organizam indisponibilidades.',
      where: 'Agenda > Novo bloqueio / Editar bloqueio.',
      steps: ['Crie bloqueio informando início/fim.', 'Opcionalmente registre motivo.', 'Revise bloqueios no dia para evitar encaixe indevido.'],
      warnings: ['Fim deve ser maior que início.', 'Bloqueios excessivos reduzem ocupação real.'],
    },
    AGENDA_3: {
      summary: 'No-show possui status específico e deve seguir regra operacional padronizada.',
      where: 'Detalhes do agendamento e Central de Agendamentos.',
      steps: ['Marque no-show no atendimento não comparecido.', 'Evite concluir financeiro em casos indevidos.', 'Acompanhe impacto em relatórios de ocupação.'],
      warnings: ['Misturar cancelado com no-show distorce métricas.', 'No-show sem rotina de contato reduz retenção.'],
    },
    AGENDA_4: {
      summary: 'Fluxo recomendado de status até `COMPLETED_FIN`, com regras de transição controladas.',
      where: 'Central de Agendamentos (ações de status).',
      steps: ['Avance status conforme execução real.', 'Use conclusão financeira no momento correto.', 'Reabra somente quando necessário.'],
      warnings: ['Transição inválida é bloqueada pelo sistema.', 'Equipe sem permissão não conclui financeiro.'],
    },
    CLIENTS_1: {
      summary: 'Cadastro completo de cliente garante histórico útil para agenda, CRM e relatórios.',
      where: 'Gestão de clientes no painel administrativo.',
      steps: ['Cadastre nome e telefone corretamente.', 'Mantenha histórico de atendimentos consistente.', 'Revise duplicidades periodicamente.'],
      warnings: ['Telefone inválido reduz efetividade de contato.', 'Duplicidade de cliente quebra análise de recorrência.'],
    },
    CLIENTS_2: {
      summary: 'Segmentar recorrentes e inativos ajuda a direcionar ações comerciais.',
      where: 'Relatórios (clientes) e filtros operacionais.',
      steps: ['Identifique frequência e última visita.', 'Separe recorrentes de inativos.', 'Aplique ações por segmento.'],
      warnings: ['Segmentação sem periodicidade perde valor.', 'Dados incompletos reduzem assertividade.'],
    },
    CLIENTS_3: {
      summary: 'Reativação deve partir de clientes sem retorno em janela definida.',
      where: 'Relatórios > Clientes (CRM).',
      steps: ['Filtre clientes por dias sem retorno.', 'Monte campanha objetiva.', 'Acompanhe retorno e ajuste abordagem.'],
      warnings: ['Campanha sem segmentação aumenta custo e baixa conversão.', 'Não medir retorno impede melhoria contínua.'],
    },
    CLIENTS_4: {
      summary: 'LGPD exige tratamento responsável dos dados e finalidade clara.',
      where: 'Cadastro de clientes e canais de contato.',
      steps: ['Colete apenas dados necessários.', 'Use dados para operação legítima.', 'Atenda solicitações de atualização/exclusão quando aplicável.'],
      warnings: ['Evite dados sensíveis desnecessários.', 'Compartilhamento indevido gera risco jurídico.'],
    },
    FINANCE_1: {
      summary: 'Fechamento diário consolida valores em aberto, recebidos e estornados.',
      where: 'Financeiro > lista e cards de resumo.',
      steps: ['Filtre período correto.', 'Concilie recebimentos do dia.', 'Valide saldos e inconsistências.'],
      warnings: ['Sem rotina diária, diferenças acumulam rápido.', 'Período incorreto distorce conferência.'],
    },
    FINANCE_2: {
      summary: 'Pagamentos podem ser registrados parcial ou totalmente por recebível.',
      where: 'Financeiro > ação Registrar Pagamento.',
      steps: ['Abra ação no recebível.', 'Informe valor e método.', 'Confirme e revise status atualizado.'],
      warnings: ['Valor inválido é recusado.', 'Método incorreto prejudica conciliação.'],
    },
    FINANCE_3: {
      summary: 'Estorno exige motivo e deve ser usado apenas para correções reais.',
      where: 'Financeiro > ação Registrar Estorno.',
      steps: ['Selecione recebível correto.', 'Informe valor válido.', 'Preencha motivo obrigatório.', 'Confirme operação.'],
      warnings: ['Estorno sem motivo é bloqueado.', 'Estorno no recebível errado compromete histórico.'],
    },
    FINANCE_4: {
      summary: 'Indicadores principais: a receber, recebido líquido, quitado, estornado e comissão.',
      where: 'Financeiro > cards de resumo e tabela.',
      steps: ['Analise cards por período.', 'Cruze com filtros por profissional.', 'Avalie status OPEN/PARTIAL/PAID/REFUNDED.'],
      warnings: ['Ler indicador sem contexto de período gera decisão ruim.', 'Comparar períodos diferentes sem padrão distorce tendência.'],
    },
    SUBSCRIPTIONS_1: {
      summary: 'Plano de assinatura inclui nome, valor, carência e serviços com franquia mensal.',
      where: 'Configurações > Assinaturas > Criar planos.',
      steps: ['Defina nome e valor mensal.', 'Configure carência.', 'Adicione serviços e quantidades mensais.', 'Salve plano ativo.'],
      warnings: ['Plano sem serviços não é válido.', 'Carência fora do intervalo permitido é recusada.'],
    },
    SUBSCRIPTIONS_2: {
      summary: 'Vinculação associa cliente elegível a um plano ativo.',
      where: 'Configurações > Assinaturas > Vincular planos.',
      steps: ['Busque cliente sem assinatura ativa.', 'Selecione plano ativo.', 'Confirme vinculação.', 'Revise dados em clientes com assinatura.'],
      warnings: ['Cliente/plano vazio impede ação.', 'Vinculação errada exige edição/cancelamento posterior.'],
    },
    SUBSCRIPTIONS_3: {
      summary: 'Franquia é consumida no fechamento financeiro do atendimento (não na criação do agendamento).',
      where: 'Assinaturas + fluxo de conclusão financeira na agenda.',
      steps: ['Acompanhe franquia incluída vs consumida.', 'Finalize atendimento no financeiro para debitar franquia.', 'Monitore percentual de utilização.'],
      warnings: ['Concluir financeiro indevidamente debita franquia.', 'Franquia esgotada torna atendimento avulso.'],
    },
    SUBSCRIPTIONS_4: {
      summary: 'Gestão de status permite pausar, cancelar e reativar conforme operação.',
      where: 'Assinaturas > Clientes com assinaturas.',
      steps: ['Abra edição da assinatura.', 'Ajuste plano/status quando necessário.', 'Use cancelamento com confirmação.', 'Registre motivo em alterações sensíveis.'],
      warnings: ['Cancelamento remove vínculo com plano.', 'Alteração de status sem processo confunde equipe.'],
    },
    REPORTS_1: {
      summary: 'Relatórios aceitam período TODAY, 7/30 dias, mês atual e personalizado.',
      where: 'Aba Relatórios > filtro Período.',
      steps: ['Escolha período padrão.', 'Use personalizado para recorte específico.', 'Valide datas antes de comparar resultados.'],
      warnings: ['Período errado muda conclusão do relatório.', 'Comparação sem mesma janela temporal induz erro.'],
    },
    REPORTS_2: {
      summary: 'Relatório de ocupação mede agendamentos, concluídos, no-show e cancelados por profissional.',
      where: 'Relatórios > opção Agenda e Ocupação.',
      steps: ['Selecione relatório de ocupação.', 'Aplique filtros de período/status/profissional.', 'Analise taxa de ocupação e no-show.'],
      warnings: ['Status inconsistentes afetam taxa de ocupação.', 'No-show mal classificado distorce indicador.'],
    },
    REPORTS_3: {
      summary: 'Relatório de desempenho por profissional mostra produção, faturamento e comissão estimada.',
      where: 'Relatórios > opção Desempenho por Profissional.',
      steps: ['Selecione período.', 'Revise atendimentos concluídos.', 'Compare ticket médio e comissão estimada.'],
      warnings: ['Comissão depende de percentual cadastrado do profissional.', 'Período curto pode gerar leitura sazonal.'],
    },
    REPORTS_4: {
      summary: 'Exportação gera arquivo com período e tipo de relatório selecionados.',
      where: 'Relatórios > botões Exportar PDF / Exportar Excel.',
      steps: ['Aplique filtros e selecione relatório.', 'Clique em exportar no formato desejado.', 'Valide nome do arquivo e período no documento.'],
      warnings: ['Exportar sem ajustar filtro gera arquivo incorreto.', 'PDF/Excel refletem exatamente os filtros atuais.'],
    },
  }), []);

  useEffect(() => {
    if (!isHelpCenterOpen) return;
    if (flattenedHelpCenterArticles.length === 0) {
      setSelectedHelpArticleId('');
      return;
    }

    const stillExists = flattenedHelpCenterArticles.some((article) => article.id === selectedHelpArticleId);
    if (!stillExists) {
      setSelectedHelpArticleId(flattenedHelpCenterArticles[0].id);
    }
  }, [isHelpCenterOpen, flattenedHelpCenterArticles, selectedHelpArticleId]);

  const selectedHelpArticleGuide = useMemo(() => {
    if (!selectedHelpArticle) return null;
    return helpCenterArticleContent[selectedHelpArticle.id] || null;
  }, [helpCenterArticleContent, selectedHelpArticle]);

  const helpArticleNavigation = useMemo(() => {
    const currentIndex = flattenedHelpCenterArticles.findIndex((article) => article.id === selectedHelpArticleId);
    if (currentIndex < 0) {
      return { previous: null as null | typeof flattenedHelpCenterArticles[number], next: null as null | typeof flattenedHelpCenterArticles[number] };
    }

    return {
      previous: currentIndex > 0 ? flattenedHelpCenterArticles[currentIndex - 1] : null,
      next: currentIndex < flattenedHelpCenterArticles.length - 1 ? flattenedHelpCenterArticles[currentIndex + 1] : null,
    };
  }, [flattenedHelpCenterArticles, selectedHelpArticleId]);

  const adminUsersCount = users.filter(u => u.role === 'ADMIN').length;
  const employeeUsersCount = users.filter(u => u.role !== 'ADMIN').length;
  const settingsProfessionals = useMemo(() => {
    const professionalsWithLinks = professionals.map((professional) => {
      const linkedUser = users.find(user => user.id === professional.id);
      return {
        ...professional,
        hasProfessionalRecord: true,
        linkedUser,
        linkedAccessRole: linkedUser?.role,
        linkedEmail: linkedUser?.email,
        linkedPhone: linkedUser?.phone,
      };
    });

    const professionalIds = new Set(professionalsWithLinks.map((item) => item.id));
    const adminUsersWithoutProfessional = users
      .filter((user) => user.role === 'ADMIN' && !professionalIds.has(user.id))
      .map((adminUser) => ({
        id: adminUser.id,
        name: adminUser.name,
        role: 'Administrador',
        avatar: adminUser.avatar,
        commissionPercentage: 0,
        specialties: [],
        hasProfessionalRecord: false,
        linkedUser: adminUser,
        linkedAccessRole: adminUser.role,
        linkedEmail: adminUser.email,
        linkedPhone: adminUser.phone,
      }));

    return [...professionalsWithLinks, ...adminUsersWithoutProfessional];
  }, [professionals, users]);

  useEffect(() => {
    if (activeSubTab === 'CONTACT') return;
    setIsHelpCenterOpen(false);
    setIsHelpArticleOpen(false);
    setHelpCenterSearchTerm('');
    setSelectedHelpArticleId('');
  }, [activeSubTab]);

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
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${professional.linkedUser ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {professional.linkedUser ? 'Com acesso' : 'Sem acesso'}
                          </span>
                          {professional.linkedAccessRole === 'ADMIN' && (
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                              Admin
                            </span>
                          )}
                        </div>
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
                  <h3 className="font-bold text-gray-900">Confirmar inativação</h3>
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
                    Deseja realmente inativar o profissional <span className="font-semibold">{professionalToDelete?.name}</span>?
                  </p>
                  <p className="text-xs text-gray-500">
                    Os agendamentos e histórico serão mantidos, e o profissional não aparecerá nos fluxos de operação.
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
                    {isDeletingProfessional ? 'Inativando...' : 'Inativar'}
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
                      setAllowEmployeeViewUsers(Boolean(brandIdentity.allowEmployeeViewUsers));
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

                      <div className="rounded-xl border border-gray-200 p-4 flex items-start justify-between gap-4">
                        <div>
                          <p className="font-bold text-gray-900 text-sm">Permitir visualizar Usuários</p>
                          <p className="text-xs text-gray-500 mt-1">Quando ativado, usuários do perfil Funcionário / Equipe terão acesso à aba Usuários.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAllowEmployeeViewUsers(prev => !prev)}
                          className={`w-12 h-6 rounded-full relative transition-colors shrink-0 ${allowEmployeeViewUsers ? 'bg-blue-600' : 'bg-gray-300'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${allowEmployeeViewUsers ? 'right-1' : 'left-1'}`}></div>
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
                <div className="space-y-5">
                  {(subscriptionError || subscriptionSuccess) && (
                    <div className="space-y-2">
                      {subscriptionError && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                          {subscriptionError}
                        </div>
                      )}
                      {subscriptionSuccess && (
                        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                          {subscriptionSuccess}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="p-5 bg-white border border-gray-200 rounded-2xl">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Assinatura atual</p>
                        <p className="text-lg font-bold text-gray-800">
                          {`${currentPlanCard.title} (${currentCycle === 'YEARLY' ? '/ano' : '/mês'})`}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">{formatMoneyFromCents(currentValue || (currentCycle === 'YEARLY' ? currentPlanCard.yearlyCents : currentPlanCard.monthlyCents))}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Próxima cobrança: {subscriptionData?.proxima_cobranca_em ? safeDateBr(String(subscriptionData.proxima_cobranca_em).slice(0, 10)) : 'Não definida'}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold w-fit ${formatStatusClass(effectiveStatus)}`}>
                        {formatStatusLabel(effectiveStatus)}
                      </span>
                    </div>
                    {isTrialRunning && (
                      <p className="mt-3 text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                        Trial ativo: {subscriptionData?.dias_restantes_trial || 0} dia(s) restante(s).
                      </p>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                      <h4 className="font-bold text-gray-800">Planos cadastrados</h4>
                      <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                        <div className="relative flex-1 sm:flex-none">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                          <input
                            type="text"
                            placeholder="Buscar plano..."
                            value={billingPlanSearchTerm}
                            onChange={(e) => setBillingPlanSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-64"
                          />
                        </div>
                        <select
                          value={billingPlanSortField}
                          onChange={(e) => setBillingPlanSortField(e.target.value as 'NOME' | 'VALOR' | 'CLIENTES')}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white"
                        >
                          <option value="NOME">Ordenar por nome</option>
                          <option value="VALOR">Ordenar por valor</option>
                          <option value="CLIENTES">Ordenar por clientes</option>
                        </select>
                        <select
                          value={billingCycle}
                          onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white"
                        >
                          <option value="MONTHLY">Mensal</option>
                          <option value="YEARLY">Anual</option>
                        </select>
                        <button
                          onClick={() => setBillingPlanSortDirection((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'))}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          {billingPlanSortDirection === 'ASC' ? 'Crescente' : 'Decrescente'}
                        </button>
                      </div>
                    </div>

                    <div className="md:hidden space-y-3">
                      {billingPlansList.map((plan) => (
                        <div key={plan.tier} className="bg-white rounded-xl border border-gray-100 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => setSelectedPlanDetails(plan)}
                              className="font-semibold text-gray-900 hover:text-blue-700"
                            >
                              {plan.title}
                            </button>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">Disponível</span>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <p className="text-xs text-gray-500">Valor {billingCycle === 'YEARLY' ? 'anual' : 'mensal'}</p>
                              <p className="text-gray-900 font-semibold">{formatMoneyFromCents(plan.price)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Clientes</p>
                              <p className="text-gray-700">{plan.limitLabel}</p>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center gap-3">
                            <button onClick={() => setSelectedPlanDetails(plan)} className="text-blue-600 hover:text-blue-800 text-sm font-semibold">
                              Detalhes
                            </button>
                            <button
                              onClick={() => handleOpenPaymentLink(plan.tier)}
                              disabled={isLoadingSubscription || isSavingSubscription}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {isSavingSubscription ? 'Abrindo...' : 'Assinar Agora'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left min-w-[760px]">
                          <thead className="bg-gray-50 text-gray-600 font-medium">
                            <tr>
                              <th className="px-6 py-3">Plano</th>
                              <th className="px-6 py-3">Valor {billingCycle === 'YEARLY' ? 'anual' : 'mensal'}</th>
                              <th className="px-6 py-3">Clientes</th>
                              <th className="px-6 py-3">Status</th>
                              <th className="px-6 py-3 text-right">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {billingPlansList.map((plan) => (
                              <tr key={plan.tier} className="hover:bg-gray-50">
                                <td className="px-6 py-4">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedPlanDetails(plan)}
                                    className="font-semibold text-gray-900 hover:text-blue-700"
                                  >
                                    {plan.title}
                                  </button>
                                </td>
                                <td className="px-6 py-4 text-gray-800 font-semibold">{formatMoneyFromCents(plan.price)}</td>
                                <td className="px-6 py-4 text-gray-700">{plan.limitLabel}</td>
                                <td className="px-6 py-4">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">Disponível</span>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center justify-end gap-3">
                                    <button onClick={() => setSelectedPlanDetails(plan)} className="text-blue-600 hover:text-blue-800 text-sm font-semibold">
                                      Detalhes
                                    </button>
                                    <button
                                      onClick={() => handleOpenPaymentLink(plan.tier)}
                                      disabled={isLoadingSubscription || isSavingSubscription}
                                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                      {isSavingSubscription ? 'Abrindo...' : 'Assinar Agora'}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                            {billingPlansList.length === 0 && (
                              <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Nenhum plano encontrado.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {selectedPlanDetails && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between gap-3">
                          <div>
                            <h4 className="text-xl font-bold text-gray-900">{selectedPlanDetails.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{selectedPlanDetails.subtitle}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedPlanDetails(null)}
                            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                          >
                            <X size={18} />
                          </button>
                        </div>
                        <div className="p-6 space-y-4">
                          <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-blue-700 text-sm font-bold text-center">
                            {selectedPlanDetails.limitLabel}
                          </div>
                          <ul className="space-y-2 text-sm text-gray-700">
                            {selectedPlanDetails.features.map((feature) => (
                              <li key={feature} className="flex items-start gap-2">
                                <span className="text-blue-600 font-bold">✓</span>
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                          <p className="text-sm text-gray-600 italic">{selectedPlanDetails.footer}</p>
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setSelectedPlanDetails(null)}
                            className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 font-semibold hover:bg-white"
                          >
                            Fechar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="p-4 rounded-xl border border-blue-100 bg-blue-50">
                    <p className="text-sm font-bold text-blue-900">🎁 Teste grátis por 7 dias</p>
                    <p className="text-sm text-blue-800 mt-1">Use todas as funcionalidades, sem cartão e sem compromisso.</p>
                    <button
                      onClick={() => handleChoosePlan('MONTHLY')}
                      disabled={isSavingSubscription || isLoadingSubscription || Boolean(subscriptionData?.trial_usado)}
                      className="mt-3 px-4 py-2 bg-white border border-blue-200 text-blue-700 rounded-lg text-sm font-bold hover:bg-blue-100 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {subscriptionData?.trial_usado ? 'Trial já utilizado' : (isSavingSubscription ? 'Ativando trial...' : 'Ativar trial agora')}
                    </button>
                  </div>

                  {isLoadingSubscription && (
                    <p className="text-sm text-gray-500">Carregando dados da assinatura...</p>
                  )}
                </div>
              )}

              {activeBillingTab === 'UTILIZATION' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 size={18} className="text-gray-500" />
                    <h4 className="font-bold text-gray-700">Uso do Sistema (Mês Atual)</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    <div className="p-4 bg-white border border-gray-100 rounded-xl">
                      <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Consumo do plano</p>
                      <p className="mt-2 text-lg font-bold text-gray-900">
                        {subscriptionData?.utilization_metrics?.consumo_plano?.clientes_cadastrados || 0}
                        {typeof subscriptionData?.utilization_metrics?.consumo_plano?.limite_clientes === 'number'
                          ? ` / ${subscriptionData?.utilization_metrics?.consumo_plano?.limite_clientes}`
                          : ' / Ilimitado'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {typeof subscriptionData?.utilization_metrics?.consumo_plano?.percentual === 'number'
                          ? `${subscriptionData.utilization_metrics.consumo_plano.percentual.toFixed(1)}% usado`
                          : 'Sem limite de clientes'}
                      </p>
                    </div>
                    <div className="p-4 bg-white border border-gray-100 rounded-xl">
                      <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Custo por atendimento</p>
                      <p className="mt-2 text-lg font-bold text-gray-900">
                        {typeof subscriptionData?.utilization_metrics?.custo_por_atendimento_centavos === 'number'
                          ? formatMoneyFromCents(subscriptionData.utilization_metrics.custo_por_atendimento_centavos)
                          : '—'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {subscriptionData?.utilization_metrics?.atendimentos_concluidos_mes || 0} concluído(s) no mês
                      </p>
                    </div>
                    <div className="p-4 bg-white border border-gray-100 rounded-xl">
                      <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Ticket médio</p>
                      <p className="mt-2 text-lg font-bold text-gray-900">
                        {typeof subscriptionData?.utilization_metrics?.ticket_medio_centavos === 'number'
                          ? formatMoneyFromCents(subscriptionData.utilization_metrics.ticket_medio_centavos)
                          : '—'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Faturamento mês: {formatMoneyFromCents(Number(subscriptionData?.utilization_metrics?.faturamento_mes_centavos || 0))}
                      </p>
                    </div>
                    <div className="p-4 bg-white border border-gray-100 rounded-xl">
                      <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Taxa de ocupação</p>
                      <p className="mt-2 text-lg font-bold text-gray-900">
                        {Number(subscriptionData?.utilization_metrics?.taxa_ocupacao_percentual || 0).toFixed(1)}%
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {Number(subscriptionData?.utilization_metrics?.horas_ocupadas || 0).toFixed(1)}h / {Number(subscriptionData?.utilization_metrics?.horas_disponiveis || 0).toFixed(1)}h
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-white border border-gray-100 rounded-xl space-y-3">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-gray-600">Agendamentos</span>
                        <span className="text-blue-600">
                          {subscriptionData?.utilization_metrics?.agendamentos_mes || 0}
                          {typeof subscriptionData?.utilization_metrics?.consumo_plano?.limite_clientes === 'number'
                            ? ` / ${subscriptionData?.utilization_metrics?.consumo_plano?.limite_clientes}`
                            : ' / ∞'}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{
                            width: `${Math.max(0, Math.min(100, Number(subscriptionData?.utilization_metrics?.consumo_plano?.percentual || 0)))}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="p-4 bg-white border border-gray-100 rounded-xl space-y-3">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-gray-600">Atendimentos concluídos</span>
                        <span className="text-blue-600">{subscriptionData?.utilization_metrics?.atendimentos_concluidos_mes || 0}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{
                            width: `${Math.max(0, Math.min(100, Number(subscriptionData?.utilization_metrics?.taxa_ocupacao_percentual || 0)))}%`,
                          }}
                        />
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
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Provedor: {String(subscriptionData?.payment_provider || 'mercadopago').toUpperCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl border border-gray-100 bg-white">
                      <p className="text-xs text-gray-500">Total cobranças</p>
                      <p className="text-lg font-bold text-gray-900">{subscriptionData?.resumo_pagamentos?.total || 0}</p>
                    </div>
                    <div className="p-3 rounded-xl border border-emerald-100 bg-emerald-50">
                      <p className="text-xs text-emerald-700">Pagas</p>
                      <p className="text-lg font-bold text-emerald-700">{subscriptionData?.resumo_pagamentos?.paid || 0}</p>
                    </div>
                    <div className="p-3 rounded-xl border border-blue-100 bg-blue-50">
                      <p className="text-xs text-blue-700">Pendentes</p>
                      <p className="text-lg font-bold text-blue-700">{subscriptionData?.resumo_pagamentos?.pending || 0}</p>
                    </div>
                    <div className="p-3 rounded-xl border border-amber-100 bg-amber-50">
                      <p className="text-xs text-amber-700">Vencidas</p>
                      <p className="text-lg font-bold text-amber-700">{subscriptionData?.resumo_pagamentos?.overdue || 0}</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm min-w-[640px]">
                        <thead>
                          <tr className="text-gray-400 text-[10px] font-bold uppercase tracking-wider border-b border-gray-100">
                            <th className="px-4 py-3 font-bold">Cobrança</th>
                            <th className="px-4 py-3 font-bold">Método</th>
                            <th className="px-4 py-3 font-bold">Vencimento</th>
                            <th className="px-4 py-3 font-bold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {(subscriptionData?.pagamentos_recentes || []).slice(0, 6).map((payment) => (
                            <tr key={payment.id}>
                              <td className="px-4 py-3 text-gray-700 font-medium">{payment.id}</td>
                              <td className="px-4 py-3 text-gray-700">{formatBillingTypeLabel(payment.billing_type)}</td>
                              <td className="px-4 py-3 text-gray-700">
                                {payment.vencimento_em ? safeDateBr(String(payment.vencimento_em).slice(0, 10)) : '-'}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${formatAsaasPaymentStatusClass(payment.status)}`}>
                                  {formatAsaasPaymentStatusLabel(payment.status)}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {(!subscriptionData?.pagamentos_recentes || subscriptionData.pagamentos_recentes.length === 0) && (
                            <tr>
                              <td colSpan={4} className="px-4 py-6 text-center text-gray-500">Nenhum pagamento recente encontrado.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
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
                        {(subscriptionData?.pagamentos_recentes || []).map((invoice) => (
                          <tr key={invoice.id} className="group">
                            <td className="py-4 font-medium text-gray-700">
                              {invoice.vencimento_em ? safeDateBr(String(invoice.vencimento_em).slice(0, 10)) : '-'}
                            </td>
                            <td className="py-4 font-bold text-gray-900">{formatMoneyFromCents(Number(invoice.valor_centavos || 0))}</td>
                            <td className="py-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${formatAsaasPaymentStatusClass(invoice.status)}`}>
                                {formatAsaasPaymentStatusLabel(invoice.status)}
                              </span>
                            </td>
                            <td className="py-4 text-right">
                              {invoice.invoice_url ? (
                                <button
                                  type="button"
                                  onClick={() => window.open(String(invoice.invoice_url), '_blank', 'noopener,noreferrer')}
                                  className="text-gray-400 hover:text-blue-600 transition-colors"
                                >
                                  <Receipt size={16} />
                                </button>
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {(!subscriptionData?.pagamentos_recentes || subscriptionData.pagamentos_recentes.length === 0) && (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-gray-500">Sem histórico de faturamento para exibir.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeBillingTab === 'B2C' && (
                <div className="space-y-6">
                  {(b2cError || b2cMessage) && (
                    <div className="space-y-2">
                      {b2cError && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                          {b2cError}
                        </div>
                      )}
                      {b2cMessage && (
                        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                          {b2cMessage}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="p-5 bg-white border border-gray-200 rounded-2xl space-y-4">
                      <h4 className="font-bold text-gray-800">Criar plano B2C</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          value={b2cPlanName}
                          onChange={(e) => setB2cPlanName(e.target.value)}
                          className="p-2.5 rounded-lg border border-gray-200 text-sm"
                          placeholder="Nome do plano"
                        />
                        <input
                          value={b2cPlanPriceReais}
                          onChange={(e) => setB2cPlanPriceReais(e.target.value)}
                          className="p-2.5 rounded-lg border border-gray-200 text-sm"
                          placeholder="Valor mensal em R$ (ex: 99,90)"
                        />
                        <input
                          value={b2cPlanGraceDays}
                          onChange={(e) => setB2cPlanGraceDays(e.target.value)}
                          className="p-2.5 rounded-lg border border-gray-200 text-sm"
                          placeholder="Dias de carência"
                        />
                        <input
                          value={b2cPlanDescription}
                          onChange={(e) => setB2cPlanDescription(e.target.value)}
                          className="p-2.5 rounded-lg border border-gray-200 text-sm"
                          placeholder="Descrição (opcional)"
                        />
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Serviços incluídos</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <select
                            value={b2cPlanServiceId}
                            onChange={(e) => setB2cPlanServiceId(e.target.value)}
                            className="sm:col-span-2 p-2.5 rounded-lg border border-gray-200 text-sm"
                          >
                            <option value="">Selecione o serviço</option>
                            {services.map((service) => (
                              <option key={service.id} value={service.id}>{service.title}</option>
                            ))}
                          </select>
                          <input
                            value={b2cPlanServiceQty}
                            onChange={(e) => setB2cPlanServiceQty(e.target.value)}
                            className="p-2.5 rounded-lg border border-gray-200 text-sm"
                            placeholder="Qtd/mês"
                          />
                        </div>
                        <button
                          onClick={addBenefitToDraftPlan}
                          className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          Adicionar serviço
                        </button>
                        <div className="space-y-1">
                          {b2cPlanBenefits.map((benefit) => {
                            const service = services.find((item) => item.id === benefit.servico_id);
                            return (
                              <div key={benefit.servico_id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                                <span className="text-sm text-gray-700">{service?.title || benefit.servico_id} · {benefit.quantidade_mensal}/mês</span>
                                <button onClick={() => removeBenefitFromDraftPlan(benefit.servico_id)} className="text-xs text-red-600 font-bold">Remover</button>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        onClick={handleCreateB2cPlan}
                        disabled={isSavingB2c}
                        className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isSavingB2c ? 'Salvando...' : 'Criar plano'}
                      </button>
                    </div>

                    <div className="p-5 bg-white border border-gray-200 rounded-2xl space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-gray-800">Planos ativos</h4>
                        <button
                          onClick={loadB2cPlans}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                        >
                          Atualizar
                        </button>
                      </div>
                      {isLoadingB2cPlans ? (
                        <p className="text-sm text-gray-500">Carregando planos...</p>
                      ) : (
                        <div className="space-y-2 max-h-72 overflow-auto pr-1">
                          {b2cPlans.map((plan) => (
                            <div key={plan.id} className="rounded-xl border border-gray-100 p-3">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-semibold text-gray-800">{plan.nome}</p>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${plan.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                                  {plan.ativo ? 'Ativo' : 'Inativo'}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">{formatMoneyFromCents(plan.valor_mensal_centavos)} / mês • carência {plan.dias_carencia} dia(s)</p>
                              <p className="text-xs text-gray-500 mt-1">{plan.servicos?.length || 0} serviço(s) incluído(s)</p>
                            </div>
                          ))}
                          {b2cPlans.length === 0 && <p className="text-sm text-gray-500">Nenhum plano cadastrado.</p>}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-5 bg-white border border-gray-200 rounded-2xl space-y-4">
                    <h4 className="font-bold text-gray-800">Assinatura por cliente</h4>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                      <div className="relative">
                        <input
                          value={b2cClientSearchText}
                          onFocus={() => setIsB2cClientSearchOpen(true)}
                          onBlur={() => setTimeout(() => setIsB2cClientSearchOpen(false), 120)}
                          onChange={(e) => handleB2cClientSearchChange(e.target.value)}
                          className="w-full p-2.5 rounded-lg border border-gray-200 text-sm"
                          placeholder="Buscar cliente por nome..."
                        />
                        {isB2cClientSearchOpen && (
                          <div className="absolute z-20 mt-1 w-full max-h-44 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                            {filteredB2cLinkableClients.length > 0 ? (
                              filteredB2cLinkableClients.map((client) => (
                                <button
                                  key={client.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedB2cClientId(client.id);
                                    setB2cClientSearchText(client.label);
                                    setIsB2cClientSearchOpen(false);
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                                >
                                  <p className="text-sm font-medium text-gray-900">{client.name}</p>
                                  <p className="text-xs text-gray-500">{client.phone || 'Sem telefone'}</p>
                                </button>
                              ))
                            ) : (
                              <div className="px-3 py-2 text-sm text-gray-500">Nenhum cliente elegível encontrado.</div>
                            )}
                          </div>
                        )}
                      </div>
                      <select
                        value={selectedB2cPlanId}
                        onChange={(e) => setSelectedB2cPlanId(e.target.value)}
                        className="p-2.5 rounded-lg border border-gray-200 text-sm"
                      >
                        <option value="">Selecione o plano</option>
                        {b2cPlans.filter((plan) => plan.ativo).map((plan) => (
                          <option key={plan.id} value={plan.id}>{plan.nome}</option>
                        ))}
                      </select>
                      <button
                        onClick={handleAssignSubscriptionToClient}
                        disabled={isSavingB2c}
                        className="py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Vincular assinatura
                      </button>
                    </div>

                    {selectedClientSubscription && (
                      <div className="rounded-xl border border-gray-100 p-4 space-y-2">
                        <p className="text-sm font-bold text-gray-800">Status: {selectedClientSubscription.subscription.status}</p>
                        <p className="text-xs text-gray-500">
                          Ciclo: {safeDateBr(selectedClientSubscription.subscription.current_cycle_start)} até {safeDateBr(selectedClientSubscription.subscription.current_cycle_end)}
                        </p>
                        <div className="space-y-1 pt-1">
                          {selectedClientSubscription.beneficios.map((benefit) => (
                            <p key={benefit.servico_id} className="text-xs text-gray-600">
                              {benefit.servico_nome || benefit.servico_id}: {benefit.quantidade_consumida}/{benefit.quantidade_incluida} usado(s), restante {benefit.quantidade_restante}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 items-end">
                      <select
                        value={manualPaymentMethod}
                        onChange={(e) => setManualPaymentMethod(e.target.value)}
                        className="p-2.5 rounded-lg border border-gray-200 text-sm"
                      >
                        <option value="DINHEIRO">Dinheiro</option>
                        <option value="PIX">PIX</option>
                        <option value="CARTAO">Cartão</option>
                      </select>
                      <input
                        value={manualPaymentAmountReais}
                        onChange={(e) => setManualPaymentAmountReais(e.target.value)}
                        className="p-2.5 rounded-lg border border-gray-200 text-sm"
                        placeholder="Valor em R$ (opcional)"
                      />
                      <input
                        value={manualPaymentNote}
                        onChange={(e) => setManualPaymentNote(e.target.value)}
                        className="p-2.5 rounded-lg border border-gray-200 text-sm"
                        placeholder="Observação"
                      />
                      <button
                        onClick={handleRegisterManualSubscriptionPayment}
                        disabled={isSavingB2c || !selectedB2cClientId}
                        className="py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Registrar pagamento
                      </button>
                    </div>

                    {selectedClientPayments.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="text-gray-400 text-[10px] font-bold uppercase tracking-wider border-b border-gray-100">
                              <th className="pb-2 font-bold">Data</th>
                              <th className="pb-2 font-bold">Valor</th>
                              <th className="pb-2 font-bold">Método</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {selectedClientPayments.map((payment) => (
                              <tr key={payment.id}>
                                <td className="py-2.5 text-gray-700">{safeDateBr(String(payment.paid_at).slice(0, 10))}</td>
                                <td className="py-2.5 font-semibold text-gray-900">{formatMoneyFromCents(payment.amount_centavos)}</td>
                                <td className="py-2.5 text-gray-700">{payment.metodo}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'SUBSCRIPTIONS' && (
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-bold text-gray-800">Assinaturas</h3>
                  <button
                    onClick={() => setIsB2cFlowHelpModalOpen(true)}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Como funciona o fluxo?
                  </button>
                </div>

                <nav className="flex overflow-x-auto pb-2 gap-2 no-scrollbar -mx-2 px-2">
                  <button
                    onClick={() => setActiveSubscriptionsTab('CREATE_PLANS')}
                    className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                      activeSubscriptionsTab === 'CREATE_PLANS'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                        : 'bg-white border border-gray-200 text-gray-600'
                    }`}
                  >
                    Criar planos
                  </button>
                  <button
                    onClick={() => setActiveSubscriptionsTab('LINK_PLANS')}
                    className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                      activeSubscriptionsTab === 'LINK_PLANS'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                        : 'bg-white border border-gray-200 text-gray-600'
                    }`}
                  >
                    Vincular planos
                  </button>
                  <button
                    onClick={() => setActiveSubscriptionsTab('CLIENTS_LIST')}
                    className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                      activeSubscriptionsTab === 'CLIENTS_LIST'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                        : 'bg-white border border-gray-200 text-gray-600'
                    }`}
                  >
                    Clientes com assinaturas
                  </button>
                </nav>
              </div>

              {(b2cError || b2cMessage) && (
                <div className="space-y-2">
                  {b2cError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {b2cError}
                    </div>
                  )}
                  {b2cMessage && (
                    <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                      {b2cMessage}
                    </div>
                  )}
                </div>
              )}

              {activeSubscriptionsTab === 'CREATE_PLANS' && (
                <div className="space-y-4">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <h4 className="font-bold text-gray-800">Planos cadastrados</h4>
                    <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                      <div className="relative flex-1 sm:flex-none">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type="text"
                          placeholder="Buscar plano..."
                          value={b2cPlanSearchTerm}
                          onChange={(e) => setB2cPlanSearchTerm(e.target.value)}
                          className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-64"
                        />
                      </div>
                      <select
                        value={b2cPlanSortField}
                        onChange={(e) => setB2cPlanSortField(e.target.value as 'NOME' | 'VALOR' | 'CARENCIA' | 'SERVICOS' | 'CLIENTES' | 'STATUS')}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white"
                      >
                        <option value="NOME">Ordenar por nome</option>
                        <option value="VALOR">Ordenar por valor</option>
                        <option value="CARENCIA">Ordenar por carência</option>
                        <option value="SERVICOS">Ordenar por serviços</option>
                        <option value="CLIENTES">Ordenar por clientes</option>
                        <option value="STATUS">Ordenar por status</option>
                      </select>
                      <select
                        value={b2cPlanPriorityId}
                        onChange={(e) => setB2cPlanPriorityId(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white"
                      >
                        <option value="">Sem plano prioritário</option>
                        {b2cPlans.map((plan) => (
                          <option key={plan.id} value={plan.id}>{plan.nome}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => setB2cPlanSortDirection((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'))}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        {b2cPlanSortDirection === 'ASC' ? 'Crescente' : 'Decrescente'}
                      </button>
                      <button
                        onClick={() => {
                          resetB2cPlanForm();
                          setIsB2cPlanModalOpen(true);
                        }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"
                      >
                        <Plus size={18} /> Criar Plano
                      </button>
                    </div>
                  </div>

                  <div className="md:hidden space-y-3">
                    {filteredB2cPlans.map((plan) => (
                      <div key={plan.id} className="bg-white rounded-xl border border-gray-100 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-gray-900">{plan.nome}</p>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${plan.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                            {plan.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-xs text-gray-500">Valor</p>
                            <p className="text-gray-900 font-semibold">{formatMoneyFromCents(plan.valor_mensal_centavos)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Carência</p>
                            <p className="text-gray-700">{plan.dias_carencia} dia(s)</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-xs text-gray-500">Serviços incluídos</p>
                            <p className="text-gray-700">{plan.servicos?.length || 0}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-xs text-gray-500">Clientes no plano</p>
                            <p className="text-gray-700">{Number(plan.clientes_ativos_count || 0)}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-3">
                          <button onClick={() => handleEditB2cPlan(plan)} className="text-blue-600 hover:text-blue-800">
                            <Edit size={18} />
                          </button>
                          <button onClick={() => handleRequestDeleteB2cPlan(plan)} className="text-red-600 hover:text-red-800">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {filteredB2cPlans.length === 0 && (
                      <div className="bg-white rounded-xl border border-gray-100 p-6 text-center text-sm text-gray-500">
                        Nenhum plano encontrado.
                      </div>
                    )}
                  </div>

                  <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left min-w-[780px]">
                        <thead className="bg-gray-50 text-gray-600 font-medium">
                          <tr>
                            <th className="px-6 py-3">Plano</th>
                            <th className="px-6 py-3">Valor mensal</th>
                            <th className="px-6 py-3">Carência</th>
                            <th className="px-6 py-3">Serviços</th>
                            <th className="px-6 py-3">Clientes</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {filteredB2cPlans.map((plan) => (
                            <tr key={plan.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 font-medium text-gray-900">{plan.nome}</td>
                              <td className="px-6 py-4 text-gray-700">{formatMoneyFromCents(plan.valor_mensal_centavos)}</td>
                              <td className="px-6 py-4 text-gray-700">{plan.dias_carencia} dia(s)</td>
                              <td className="px-6 py-4 text-gray-700">{plan.servicos?.length || 0}</td>
                              <td className="px-6 py-4 text-gray-700">{Number(plan.clientes_ativos_count || 0)}</td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${plan.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                                  {plan.ativo ? 'Ativo' : 'Inativo'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right space-x-3">
                                <button onClick={() => handleEditB2cPlan(plan)} className="text-blue-600 hover:text-blue-800">
                                  <Edit size={18} />
                                </button>
                                <button onClick={() => handleRequestDeleteB2cPlan(plan)} className="text-red-600 hover:text-red-800">
                                  <Trash2 size={18} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {filteredB2cPlans.length === 0 && (
                      <div className="px-6 py-8 text-center text-sm text-gray-500">Nenhum plano encontrado.</div>
                    )}
                  </div>

                  {isB2cPlanModalOpen && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-fade-in">
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                          <h3 className="font-bold text-gray-900">{editingB2cPlanId ? 'Editar plano' : 'Criar plano'}</h3>
                          <button
                            onClick={() => {
                              setIsB2cPlanModalOpen(false);
                              setB2cError(null);
                            }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X size={20} />
                          </button>
                        </div>

                        <div className="p-6 space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nome do plano</label>
                              <input
                                value={b2cPlanName}
                                onChange={(e) => setB2cPlanName(e.target.value)}
                                className="w-full p-2.5 rounded-lg border border-gray-200 text-sm"
                                placeholder="Ex: Premium Mensal"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Valor mensal (R$)</label>
                              <input
                                value={b2cPlanPriceReais}
                                onChange={(e) => setB2cPlanPriceReais(e.target.value)}
                                className="w-full p-2.5 rounded-lg border border-gray-200 text-sm"
                                placeholder="Ex: 99,90"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Dias de carência</label>
                              <input
                                value={b2cPlanGraceDays}
                                onChange={(e) => setB2cPlanGraceDays(e.target.value)}
                                className="w-full p-2.5 rounded-lg border border-gray-200 text-sm"
                                placeholder="Ex: 7"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Descrição (opcional)</label>
                              <input
                                value={b2cPlanDescription}
                                onChange={(e) => setB2cPlanDescription(e.target.value)}
                                className="w-full p-2.5 rounded-lg border border-gray-200 text-sm"
                                placeholder="Resumo interno do plano"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Serviços incluídos</p>
                            <p className="text-xs text-gray-500">Defina quais serviços entram no plano e quantas vezes por mês o cliente pode usar cada um.</p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div className="sm:col-span-2 space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Serviço</label>
                                <select
                                  value={b2cPlanServiceId}
                                  onChange={(e) => setB2cPlanServiceId(e.target.value)}
                                  className="w-full p-2.5 rounded-lg border border-gray-200 text-sm"
                                >
                                  <option value="">Selecione o serviço</option>
                                  {services.map((service) => (
                                    <option key={service.id} value={service.id}>{service.title}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Qtd/mês</label>
                                <input
                                  value={b2cPlanServiceQty}
                                  onChange={(e) => setB2cPlanServiceQty(e.target.value)}
                                  className="w-full p-2.5 rounded-lg border border-gray-200 text-sm"
                                  placeholder="Ex: 2"
                                />
                              </div>
                            </div>
                            <button
                              onClick={addBenefitToDraftPlan}
                              className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                            >
                              Adicionar serviço
                            </button>
                            <div className="space-y-1 max-h-40 overflow-auto pr-1">
                              {b2cPlanBenefits.map((benefit) => {
                                const service = services.find((item) => item.id === benefit.servico_id);
                                return (
                                  <div key={benefit.servico_id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                                    <span className="text-sm text-gray-700">{service?.title || benefit.servico_id} · {benefit.quantidade_mensal}/mês</span>
                                    <button onClick={() => removeBenefitFromDraftPlan(benefit.servico_id)} className="text-xs text-red-600 font-bold">Remover</button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="px-6 py-4 border-t bg-gray-50 flex gap-3 justify-end">
                          <button
                            type="button"
                            onClick={() => setIsB2cPlanModalOpen(false)}
                            className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-white"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={handleCreateB2cPlan}
                            disabled={isSavingB2c}
                            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {isSavingB2c ? 'Salvando...' : (editingB2cPlanId ? 'Salvar alterações' : 'Criar plano')}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {isB2cDeleteModalOpen && b2cPlanToDelete && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                          <h3 className="font-bold text-gray-900">Confirmar exclusão</h3>
                          <button
                            onClick={() => {
                              if (isSavingB2c) return;
                              setIsB2cDeleteModalOpen(false);
                              setB2cPlanToDelete(null);
                            }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X size={20} />
                          </button>
                        </div>
                        <div className="p-6 space-y-4">
                          <p className="text-sm text-gray-700">
                            Deseja realmente excluir o plano <span className="font-bold">{b2cPlanToDelete.nome}</span>?
                          </p>
                          <p className="text-xs text-gray-500">
                            Esta ação não pode ser desfeita. Se o plano tiver assinaturas ativas, a exclusão será bloqueada.
                          </p>
                        </div>
                        <div className="px-6 py-4 border-t bg-gray-50 flex gap-3 justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              if (isSavingB2c) return;
                              setIsB2cDeleteModalOpen(false);
                              setB2cPlanToDelete(null);
                            }}
                            className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-white"
                          >
                            Não
                          </button>
                          <button
                            type="button"
                            onClick={handleDeleteB2cPlan}
                            disabled={isSavingB2c}
                            className="px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {isSavingB2c ? 'Excluindo...' : 'Sim, excluir'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeSubscriptionsTab === 'LINK_PLANS' && (
                <div className="p-5 bg-white border border-gray-200 rounded-2xl space-y-4">
                  <h4 className="font-bold text-gray-800">Vincular plano ao cliente</h4>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    <div className="relative">
                      <input
                        value={b2cClientSearchText}
                        onFocus={() => setIsB2cClientSearchOpen(true)}
                        onBlur={() => setTimeout(() => setIsB2cClientSearchOpen(false), 120)}
                        onChange={(e) => handleB2cClientSearchChange(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-gray-200 text-sm"
                        placeholder="Buscar cliente por nome..."
                      />
                      {isB2cClientSearchOpen && (
                        <div className="absolute z-20 mt-1 w-full max-h-44 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                          {filteredB2cLinkableClients.length > 0 ? (
                            filteredB2cLinkableClients.map((client) => (
                              <button
                                key={client.id}
                                type="button"
                                onClick={() => {
                                  setSelectedB2cClientId(client.id);
                                  setB2cClientSearchText(client.label);
                                  setIsB2cClientSearchOpen(false);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                              >
                                <p className="text-sm font-medium text-gray-900">{client.name}</p>
                                <p className="text-xs text-gray-500">{client.phone || 'Sem telefone'}</p>
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-sm text-gray-500">Nenhum cliente elegível encontrado.</div>
                          )}
                        </div>
                      )}
                    </div>
                    <select
                      value={selectedB2cPlanId}
                      onChange={(e) => setSelectedB2cPlanId(e.target.value)}
                      className="p-2.5 rounded-lg border border-gray-200 text-sm"
                    >
                      <option value="">Selecione o plano</option>
                      {b2cPlans.filter((plan) => plan.ativo).map((plan) => (
                        <option key={plan.id} value={plan.id}>{plan.nome}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleAssignSubscriptionToClient}
                      disabled={isSavingB2c}
                      className="py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Vincular assinatura
                    </button>
                  </div>

                  {selectedClientSubscription && (
                    <div className="rounded-xl border border-gray-100 p-4 space-y-2">
                      <p className="text-sm font-bold text-gray-800">Status: {selectedClientSubscription.subscription.status}</p>
                      <p className="text-xs text-gray-500">
                        Ciclo: {safeDateBr(selectedClientSubscription.subscription.current_cycle_start)} até {safeDateBr(selectedClientSubscription.subscription.current_cycle_end)}
                      </p>
                      <div className="space-y-1 pt-1">
                        {selectedClientSubscription.beneficios.map((benefit) => (
                          <p key={benefit.servico_id} className="text-xs text-gray-600">
                            {benefit.servico_nome || benefit.servico_id}: {benefit.quantidade_consumida}/{benefit.quantidade_incluida} usado(s), restante {benefit.quantidade_restante}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}

              {activeSubscriptionsTab === 'CLIENTS_LIST' && (
                <div className="p-5 bg-white border border-gray-200 rounded-2xl space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <h4 className="font-bold text-gray-800">Clientes com assinaturas ativas</h4>
                    <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                      <div className="relative flex-1 sm:flex-none">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                          type="text"
                          value={b2cSubscribedClientSearchTerm}
                          onChange={(e) => setB2cSubscribedClientSearchTerm(e.target.value)}
                          placeholder="Buscar cliente/plano..."
                          className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-56"
                        />
                      </div>
                      <select
                        value={b2cSubscribedClientStatusFilter}
                        onChange={(e) => setB2cSubscribedClientStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'GRACE' | 'PAST_DUE' | 'PAUSED' | 'CANCELLED')}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white"
                      >
                        <option value="ALL">Todos status</option>
                        <option value="ACTIVE">Ativa</option>
                        <option value="GRACE">Em carência</option>
                        <option value="PAST_DUE">Inadimplente</option>
                        <option value="PAUSED">Pausada</option>
                        <option value="CANCELLED">Cancelada</option>
                      </select>
                      <select
                        value={b2cSubscribedClientPlanFilter}
                        onChange={(e) => setB2cSubscribedClientPlanFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white"
                      >
                        <option value="ALL">Todos planos</option>
                        {b2cSubscribedPlanOptions.map((planName) => (
                          <option key={planName} value={planName}>{planName}</option>
                        ))}
                      </select>
                      <select
                        value={b2cSubscribedClientSortField}
                        onChange={(e) => setB2cSubscribedClientSortField(e.target.value as 'CLIENTE' | 'PLANO' | 'STATUS' | 'CICLO' | 'UTILIZACAO')}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white"
                      >
                        <option value="CLIENTE">Ordenar por cliente</option>
                        <option value="PLANO">Ordenar por plano</option>
                        <option value="STATUS">Ordenar por status</option>
                        <option value="CICLO">Ordenar por ciclo</option>
                        <option value="UTILIZACAO">Ordenar por utilização</option>
                      </select>
                      <button
                        onClick={() => setB2cSubscribedClientSortDirection((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'))}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        {b2cSubscribedClientSortDirection === 'ASC' ? 'Crescente' : 'Decrescente'}
                      </button>
                      <button
                        onClick={loadB2cSubscribedClients}
                        className="px-3 py-2 text-xs font-bold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                      >
                        Atualizar lista
                      </button>
                    </div>
                  </div>

                  {isLoadingB2cSubscribedClients ? (
                    <p className="text-sm text-gray-500">Carregando clientes assinantes...</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="text-gray-400 text-[10px] font-bold uppercase tracking-wider border-b border-gray-100">
                            <th className="pb-2 font-bold">Cliente</th>
                            <th className="pb-2 font-bold">Plano</th>
                            <th className="pb-2 font-bold">Status</th>
                            <th className="pb-2 font-bold">Ciclo atual</th>
                            <th className="pb-2 font-bold">Utilização mensal</th>
                            <th className="pb-2 font-bold text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {filteredB2cSubscribedClients.map((row) => (
                            <tr key={row.cliente_id}>
                              <td className="py-2.5 font-medium text-gray-800">{row.cliente_nome || 'Cliente'}</td>
                              <td className="py-2.5 text-gray-700">{row.plano_nome || 'Plano'}</td>
                              <td className="py-2.5 text-gray-700">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${formatB2cStatusClass(row.status)}`}>
                                  {formatB2cStatusLabel(row.status)}
                                </span>
                              </td>
                              <td className="py-2.5 text-gray-700">
                                {safeDateBr(row.current_cycle_start)} até {safeDateBr(row.current_cycle_end)}
                              </td>
                              <td className="py-2.5 text-gray-700">
                                {Number(row.franquia_consumida_total || 0)}/{Number(row.franquia_incluida_total || 0)} ({Number(row.franquia_utilizacao_percent || 0)}%)
                              </td>
                              <td className="py-2.5">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleOpenEditB2cSubscriptionModal(row)}
                                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                                  >
                                    Editar
                                  </button>
                                  <button
                                    onClick={() => handleOpenB2cPaymentModal(row)}
                                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                                  >
                                    Registrar pagamento
                                  </button>
                                  <button
                                    onClick={() => handleOpenCancelB2cClientSubscriptionModal(row)}
                                    disabled={isSavingB2c}
                                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed"
                                  >
                                    Cancelar assinatura
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {filteredB2cSubscribedClients.length === 0 && (
                        <p className="text-sm text-gray-500 mt-3">Nenhum cliente com assinatura ativa encontrado.</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {isB2cEditSubscriptionModalOpen && editingB2cClientSubscription && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden animate-fade-in">
                    <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold text-gray-900">Editar assinatura do cliente</h3>
                      <button
                        onClick={() => {
                          if (isSavingB2c) return;
                          setIsB2cEditSubscriptionModalOpen(false);
                          setEditingB2cClientSubscription(null);
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div className="p-6 space-y-4">
                      <p className="text-sm text-gray-700">
                        Cliente: <span className="font-semibold">{editingB2cClientSubscription.cliente_nome || 'Cliente'}</span>
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Plano</label>
                          <select
                            value={editingB2cSubscriptionPlanId}
                            onChange={(e) => setEditingB2cSubscriptionPlanId(e.target.value)}
                            className="w-full p-2.5 rounded-lg border border-gray-200 text-sm"
                          >
                            <option value="">Selecione o plano</option>
                            {b2cPlans.filter((plan) => plan.ativo).map((plan) => (
                              <option key={plan.id} value={plan.id}>{plan.nome}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status</label>
                          <select
                            value={editingB2cSubscriptionStatus}
                            onChange={(e) => setEditingB2cSubscriptionStatus(e.target.value as 'ACTIVE' | 'PAUSED' | 'CANCELLED')}
                            className="w-full p-2.5 rounded-lg border border-gray-200 text-sm"
                          >
                            <option value="ACTIVE">Ativa</option>
                            <option value="PAUSED">Pausada</option>
                            <option value="CANCELLED">Cancelada</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Motivo (opcional)</label>
                        <input
                          value={editingB2cSubscriptionReason}
                          onChange={(e) => setEditingB2cSubscriptionReason(e.target.value)}
                          className="w-full p-2.5 rounded-lg border border-gray-200 text-sm"
                          placeholder="Ex: Pausa solicitada pelo cliente"
                        />
                      </div>
                    </div>

                    <div className="px-6 py-4 border-t bg-gray-50 flex gap-3 justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          if (isSavingB2c) return;
                          setIsB2cEditSubscriptionModalOpen(false);
                          setEditingB2cClientSubscription(null);
                        }}
                        className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-white"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveB2cSubscriptionEdition}
                        disabled={isSavingB2c}
                        className="px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isSavingB2c ? 'Salvando...' : 'Salvar alterações'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {isB2cPaymentModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden animate-fade-in">
                    <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold text-gray-900">Registrar pagamento da assinatura</h3>
                      <button
                        onClick={() => {
                          if (isSavingB2c) return;
                          setIsB2cPaymentModalOpen(false);
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div className="p-6 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                        <select
                          value={manualPaymentMethod}
                          onChange={(e) => setManualPaymentMethod(e.target.value)}
                          className="p-2.5 rounded-lg border border-gray-200 text-sm"
                        >
                          <option value="DINHEIRO">Dinheiro</option>
                          <option value="PIX">PIX</option>
                          <option value="CARTAO">Cartão</option>
                        </select>
                        <input
                          value={manualPaymentAmountReais}
                          onChange={(e) => setManualPaymentAmountReais(e.target.value)}
                          className="p-2.5 rounded-lg border border-gray-200 text-sm"
                          placeholder="Valor em R$ (opcional)"
                        />
                        <input
                          value={manualPaymentNote}
                          onChange={(e) => setManualPaymentNote(e.target.value)}
                          className="p-2.5 rounded-lg border border-gray-200 text-sm"
                          placeholder="Observação"
                        />
                      </div>

                      {selectedClientPayments.length > 0 && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead>
                              <tr className="text-gray-400 text-[10px] font-bold uppercase tracking-wider border-b border-gray-100">
                                <th className="pb-2 font-bold">Data</th>
                                <th className="pb-2 font-bold">Valor</th>
                                <th className="pb-2 font-bold">Método</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {selectedClientPayments.map((payment) => (
                                <tr key={payment.id}>
                                  <td className="py-2.5 text-gray-700">{safeDateBr(String(payment.paid_at).slice(0, 10))}</td>
                                  <td className="py-2.5 font-semibold text-gray-900">{formatMoneyFromCents(payment.amount_centavos)}</td>
                                  <td className="py-2.5 text-gray-700">{payment.metodo}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    <div className="px-6 py-4 border-t bg-gray-50 flex gap-3 justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          if (isSavingB2c) return;
                          setIsB2cPaymentModalOpen(false);
                        }}
                        className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-white"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleRegisterManualSubscriptionPayment}
                        disabled={isSavingB2c || !selectedB2cClientId}
                        className="px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isSavingB2c ? 'Salvando...' : 'Registrar pagamento'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {isB2cCancelSubscriptionModalOpen && b2cSubscriptionToCancel && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
                    <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold text-gray-900">Confirmar cancelamento</h3>
                      <button
                        onClick={() => {
                          if (isSavingB2c) return;
                          setIsB2cCancelSubscriptionModalOpen(false);
                          setB2cSubscriptionToCancel(null);
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div className="p-6 space-y-3">
                      <p className="text-sm text-gray-700">
                        Deseja cancelar a assinatura de <span className="font-semibold">{b2cSubscriptionToCancel.cliente_nome || 'Cliente'}</span>?
                      </p>
                      <p className="text-xs text-gray-500">
                        Essa ação remove a vinculação entre o cliente e o plano atual.
                      </p>
                    </div>

                    <div className="px-6 py-4 border-t bg-gray-50 flex gap-3 justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          if (isSavingB2c) return;
                          setIsB2cCancelSubscriptionModalOpen(false);
                          setB2cSubscriptionToCancel(null);
                        }}
                        className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-white"
                      >
                        Não
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelB2cClientSubscription}
                        disabled={isSavingB2c}
                        className="px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isSavingB2c ? 'Cancelando...' : 'Sim, cancelar assinatura'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {isB2cFlowHelpModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-fade-in">
                    <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold text-gray-900">Fluxo de assinaturas (resumo)</h3>
                      <button
                        onClick={() => setIsB2cFlowHelpModalOpen(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div className="p-6 space-y-4 text-sm text-gray-700">
                      <div className="rounded-xl border border-gray-100 p-4">
                        <p className="font-semibold text-gray-900">1) Criar plano</p>
                        <p className="mt-1">Defina nome, valor, carência e os serviços com quantidade mensal (franquia).</p>
                      </div>

                      <div className="rounded-xl border border-gray-100 p-4">
                        <p className="font-semibold text-gray-900">2) Vincular ao cliente</p>
                        <p className="mt-1">Selecione cliente sem assinatura ativa e escolha o plano para iniciar o ciclo atual.</p>
                      </div>

                      <div className="rounded-xl border border-gray-100 p-4">
                        <p className="font-semibold text-gray-900">3) Uso no atendimento</p>
                        <p className="mt-1">A franquia só é debitada quando o atendimento é concluído no financeiro.</p>
                      </div>

                      <div className="rounded-xl border border-gray-100 p-4">
                        <p className="font-semibold text-gray-900">4) Pagamentos e status</p>
                        <p className="mt-1">Pagamentos podem ser registrados manualmente. Status da assinatura pode ser alterado ou cancelado na lista de clientes com assinaturas.</p>
                      </div>
                    </div>

                    <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setIsB2cFlowHelpModalOpen(false)}
                        className="px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                      >
                        Fechar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'INTEGRATIONS' && (
            <div className="space-y-8">
              <div className="space-y-4">
                <h3 className="font-bold text-gray-800">Integrações</h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><MessageSquare size={20} /></div>
                      <div>
                        <p className="font-medium text-gray-900">Alertas por WhatsApp</p>
                        <p className="text-xs text-gray-500">Ativa ou desativa o envio de alertas pelo canal WhatsApp</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleWhatsappAlerts}
                      disabled={isLoadingAlertSettings || isSavingAlertSettings}
                      className={`w-12 h-6 rounded-full relative transition-colors ${isWhatsappAlertsEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}
                      aria-label="Alternar alertas por WhatsApp"
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isWhatsappAlertsEnabled ? 'right-1' : 'left-1'}`}></div>
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Mail size={20} /></div>
                      <div>
                        <p className="font-medium text-gray-900">Alertas por E-mail</p>
                        <p className="text-xs text-gray-500">Ativa ou desativa o envio de alertas pelo canal E-mail</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleEmailAlerts}
                      disabled={isLoadingAlertSettings || isSavingAlertSettings}
                      className={`w-12 h-6 rounded-full relative transition-colors ${isEmailAlertsEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}
                      aria-label="Alternar alertas por E-mail"
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isEmailAlertsEnabled ? 'right-1' : 'left-1'}`}></div>
                    </button>
                  </div>
                </div>

                {alertSettingsError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {alertSettingsError}
                  </div>
                )}

                {isLoadingAlertSettings && (
                  <div className="text-sm text-gray-500">Carregando configuração de alertas...</div>
                )}

              </div>

              {!isWhatsappAlertsEnabled && !isEmailAlertsEnabled ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                  Todos os alertas estão desabilitados. Ative ao menos um canal para exibir a aba de configuração.
                </div>
              ) : (
                <>
                  {isWhatsappAlertsEnabled ? (
                    <WhatsAppIntegration />
                  ) : (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                      A integração do WhatsApp está desativada. O canal de E-mail (Resend) continua sendo controlado apenas pelo botão de ativar/desativar acima.
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeSubTab === 'CONTACT' && (
            <div className="space-y-8">
              {isHelpCenterOpen ? (
                <div className="space-y-6">
                  {!isHelpArticleOpen ? (
                    <>
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <h3 className="text-2xl font-bold text-gray-800">Central de Ajuda</h3>
                          <p className="text-sm text-gray-500">Selecione um artigo para abrir a página de conteúdo.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsHelpCenterOpen(false);
                            setIsHelpArticleOpen(false);
                            setHelpCenterSearchTerm('');
                            setSelectedHelpArticleId('');
                          }}
                          className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50"
                        >
                          Voltar para Fale Conosco
                        </button>
                      </div>

                      <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
                        <div className="relative">
                          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            value={helpCenterSearchTerm}
                            onChange={(event) => setHelpCenterSearchTerm(event.target.value)}
                            placeholder="Buscar por tema, módulo ou tarefa"
                            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm"
                          />
                        </div>
                        <p className="text-xs text-gray-500">{helpCenterArticlesCount} conteúdo(s) encontrado(s).</p>
                      </div>

                      {filteredHelpCenterSections.length > 0 ? (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                          {filteredHelpCenterSections.map((section) => (
                            <div key={section.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                              <h4 className="font-bold text-gray-800">{section.title}</h4>
                              <p className="text-xs text-gray-500 mt-1">{section.description}</p>
                              <div className="mt-4 space-y-2">
                                {section.articles.map((article) => (
                                  <button
                                    key={article.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedHelpArticleId(article.id);
                                      setIsHelpArticleOpen(true);
                                    }}
                                    className="w-full text-left text-sm rounded-lg border border-gray-100 px-3 py-2 bg-gray-50 text-gray-700 hover:bg-gray-100"
                                  >
                                    {article.title}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center text-sm text-gray-500">
                          Nenhum conteúdo encontrado para esta busca.
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-xs text-gray-500">Central de Ajuda {'>'} {selectedHelpArticle?.sectionTitle || 'Categoria'} {'>'} Artigo</p>
                          <h3 className="text-2xl font-bold text-gray-800 mt-1">{selectedHelpArticle?.title || 'Artigo'}</h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsHelpArticleOpen(false)}
                          className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50"
                        >
                          Voltar para lista
                        </button>
                      </div>

                      {selectedHelpArticle && selectedHelpArticleGuide ? (
                        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-5">
                          <div>
                            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">{selectedHelpArticle.sectionTitle}</p>
                            <p className="text-sm text-gray-600 mt-2">{selectedHelpArticleGuide.summary}</p>
                            <p className="text-sm text-gray-500 mt-2"><span className="font-semibold text-gray-700">Onde encontrar:</span> {selectedHelpArticleGuide.where}</p>
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-gray-800">Passo a passo</p>
                            <ol className="mt-2 space-y-2">
                              {selectedHelpArticleGuide.steps.map((step, index) => (
                                <li key={`${selectedHelpArticle.id}-step-${index}`} className="text-sm text-gray-700 rounded-lg border border-gray-100 px-3 py-2 bg-gray-50">
                                  {index + 1}. {step}
                                </li>
                              ))}
                            </ol>
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-gray-800">Pontos de atenção</p>
                            <ul className="mt-2 space-y-2">
                              {selectedHelpArticleGuide.warnings.map((warning, index) => (
                                <li key={`${selectedHelpArticle.id}-warning-${index}`} className="text-sm text-gray-700 rounded-lg border border-gray-100 px-3 py-2 bg-gray-50">
                                  • {warning}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row gap-2 sm:justify-between">
                            <button
                              type="button"
                              onClick={() => {
                                if (!helpArticleNavigation.previous) return;
                                setSelectedHelpArticleId(helpArticleNavigation.previous.id);
                              }}
                              disabled={!helpArticleNavigation.previous}
                              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              ← Anterior
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!helpArticleNavigation.next) return;
                                setSelectedHelpArticleId(helpArticleNavigation.next.id);
                              }}
                              disabled={!helpArticleNavigation.next}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Próximo →
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center text-sm text-gray-500">
                          Conteúdo não encontrado para o artigo selecionado.
                        </div>
                      )}
                    </div>
                  )}

                  <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Não encontrou o que precisava?</p>
                      <p className="text-xs text-gray-500">Nossa equipe segue disponível por WhatsApp e e-mail.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href="https://wa.me/5531995041815"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                      >
                        WhatsApp
                      </a>
                      <button
                        type="button"
                        onClick={openSupportEmailModal}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        E-mail
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-center max-w-md mx-auto space-y-4 py-6">
                    <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
                      <Headphones size={40} />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800">Como podemos ajudar?</h3>
                    <p className="text-gray-500 text-sm">Nossa equipe de suporte está disponível de segunda a sexta, das 09h às 18h, para garantir que sua barbearia nunca pare.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <a
                      href="https://wa.me/5531995041815"
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

                    <button
                      type="button"
                      onClick={openSupportEmailModal}
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
                    </button>

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

                  <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4 text-center sm:text-left">
                      <div className="p-3 bg-white rounded-xl shadow-sm text-blue-600">
                        <Globe size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-800">Central de Ajuda</h4>
                        <p className="text-xs text-gray-500">Acesse conteúdos organizados sobre agenda, financeiro, assinaturas e mais.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsHelpCenterOpen(true);
                        setIsHelpArticleOpen(false);
                        if (!selectedHelpArticleId && helpCenterSections[0]?.articles[0]?.id) {
                          setSelectedHelpArticleId(helpCenterSections[0].articles[0].id);
                        }
                      }}
                      className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all whitespace-nowrap"
                    >
                      Acessar Central
                    </button>
                  </div>
                </>
              )}

              {isSupportEmailModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                  <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                      <h4 className="text-lg font-bold text-gray-900">Enviar e-mail ao suporte</h4>
                      <button
                        type="button"
                        onClick={closeSupportEmailModal}
                        disabled={isSendingSupportContact}
                        className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div className="p-6 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome da barbearia</label>
                        <input
                          type="text"
                          value={supportContactBarbeariaName}
                          readOnly
                          className="w-full p-2.5 border border-gray-200 bg-gray-50 rounded-lg text-sm text-gray-700"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Seu nome</label>
                        <input
                          type="text"
                          value={supportContactName}
                          onChange={(e) => setSupportContactName(e.target.value)}
                          maxLength={120}
                          placeholder="Digite seu nome"
                          className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem</label>
                        <textarea
                          value={supportContactMessage}
                          onChange={(e) => setSupportContactMessage(e.target.value)}
                          maxLength={6000}
                          rows={6}
                          placeholder="Descreva sua dúvida ou problema"
                          className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <p className="mt-1 text-xs text-gray-500 text-right">{supportContactMessage.length}/6000</p>
                      </div>

                      {supportContactError && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                          {supportContactError}
                        </div>
                      )}
                      {supportContactSuccess && (
                        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                          {supportContactSuccess}
                        </div>
                      )}
                    </div>

                    <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                      <button
                        type="button"
                        onClick={closeSupportEmailModal}
                        disabled={isSendingSupportContact}
                        className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={submitSupportContact}
                        disabled={isSendingSupportContact}
                        className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isSendingSupportContact ? 'Enviando...' : 'Enviar para suporte'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
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
                  <button
                    onClick={() => setActiveIdentityTab('DISCLOSURE')}
                    className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                      activeIdentityTab === 'DISCLOSURE'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                        : 'bg-white border border-gray-200 text-gray-600'
                    }`}
                  >
                    Divulgação
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
                                updateIdentityForm(prev => ({ ...prev, logoUrl: undefined }));
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
                                    updateIdentityForm(prev => ({ ...prev, iconName: item.id, logoUrl: undefined }));
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
                                  updateIdentityForm(prev => ({
                                    ...prev,
                                    primaryColor: palette.primary,
                                    secondaryColor: palette.secondary,
                                  }));
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
                                  updateIdentityForm(prev => ({ ...prev, primaryColor: e.target.value }));
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
                                  updateIdentityForm(prev => ({ ...prev, secondaryColor: e.target.value }));
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
                        onChange={(e) => updateIdentityForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full p-2 border rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                      <input
                        type="text"
                        value={identityForm.phone || ''}
                        onChange={(e) => updateIdentityForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full p-2 border rounded-lg"
                        placeholder="(00) 00000-0000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                      <input
                        type="text"
                        value={identityForm.city || ''}
                        onChange={(e) => updateIdentityForm(prev => ({ ...prev, city: e.target.value }))}
                        className="w-full p-2 border rounded-lg"
                        placeholder="Cidade / Endereço"
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
                              updateIdentityForm(prev => ({ ...prev, loginLogoUrl: undefined }));
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
                                  updateIdentityForm(prev => ({ ...prev, loginLogoUrl: item.url }));
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
                            updateIdentityForm(prev => ({ ...prev, loginBackgroundUrl: undefined }));
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
                                  updateIdentityForm(prev => ({ ...prev, loginBackgroundUrl: item.url }));
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

                {activeIdentityTab === 'DISCLOSURE' && (
                  <div className="space-y-5">
                    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
                      <div>
                        <h4 className="font-bold text-gray-800">Material de divulgação com QR Code</h4>
                        <p className="text-sm text-gray-500 mt-1">Gere um PDF para impressão com o nome da barbearia e QR Code para acesso ao SaaS.</p>
                      </div>

                      <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-2">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">URL pública identificada</p>
                        <p className="text-sm text-gray-800 break-all">{disclosurePublicUrl || 'URL não disponível'}</p>
                        <div className="pt-1 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              if (!disclosurePublicUrl) return;
                              try {
                                await navigator.clipboard.writeText(disclosurePublicUrl);
                                setDisclosureError(null);
                                setDisclosureSuccess('Link copiado com sucesso.');
                              } catch {
                                setDisclosureSuccess(null);
                                setDisclosureError('Não foi possível copiar o link automaticamente.');
                              }
                            }}
                            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Copiar link
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!disclosurePublicUrl) return;
                              try {
                                if (navigator.share) {
                                  await navigator.share({
                                    title: identityForm.name || brandIdentity.name || 'Barbearia',
                                    text: 'Agende seu horário online:',
                                    url: disclosurePublicUrl,
                                  });
                                  setDisclosureError(null);
                                  setDisclosureSuccess('Link compartilhado com sucesso.');
                                  return;
                                }

                                await navigator.clipboard.writeText(disclosurePublicUrl);
                                setDisclosureError(null);
                                setDisclosureSuccess('Compartilhamento não suportado neste navegador. Link copiado.');
                              } catch {
                                setDisclosureSuccess(null);
                                setDisclosureError('Não foi possível compartilhar o link.');
                              }
                            }}
                            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 inline-flex items-center gap-2"
                          >
                            <Share2 size={14} /> Compartilhar
                          </button>
                        </div>
                      </div>

                      <div className="rounded-xl border border-gray-100 p-4 flex flex-col md:flex-row md:items-center gap-4">
                        <div className="w-28 h-28 rounded-lg border border-gray-100 bg-white flex items-center justify-center overflow-hidden">
                          {disclosureQrCodeUrl ? (
                            <img src={disclosureQrCodeUrl} alt="QR Code de divulgação" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs text-gray-400">QR indisponível</span>
                          )}
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm text-gray-700">Use este QR Code em balcão, vitrine e materiais impressos para levar clientes direto ao sistema.</p>
                          <button
                            type="button"
                            onClick={handleGenerateDisclosurePdf}
                            disabled={isGeneratingDisclosurePdf || !disclosurePublicUrl}
                            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {isGeneratingDisclosurePdf ? 'Gerando PDF...' : 'Gerar PDF de divulgação'}
                          </button>
                        </div>
                      </div>

                      {disclosureError && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                          {disclosureError}
                        </div>
                      )}

                      {disclosureSuccess && (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                          {disclosureSuccess}
                        </div>
                      )}
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
  const [period, setPeriod] = useState<FinancePeriod>('TODAY');
  const [hasUserChangedPeriod, setHasUserChangedPeriod] = useState(false);
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
    if (!hasUserChangedPeriod && period !== 'TODAY') {
      setPeriod('TODAY');
    }
  }, [hasUserChangedPeriod, period]);

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
    setPeriod('TODAY');
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
            onChange={(event) => {
              setHasUserChangedPeriod(true);
              setPeriod(event.target.value as FinancePeriod);
            }}
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
  const [period, setPeriod] = useState<AppointmentCenterPeriod>('TODAY');
  const [hasUserChangedPeriod, setHasUserChangedPeriod] = useState(false);
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

  useEffect(() => {
    if (!hasUserChangedPeriod && period !== 'TODAY') {
      setPeriod('TODAY');
    }
  }, [hasUserChangedPeriod, period]);

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
              onChange={(event) => {
                setHasUserChangedPeriod(true);
                setPeriod(event.target.value as AppointmentCenterPeriod);
              }}
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
  const [period, setPeriod] = useState<ReportPeriod>('TODAY');
  const [hasUserChangedPeriod, setHasUserChangedPeriod] = useState(false);
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

  useEffect(() => {
    if (!hasUserChangedPeriod && period !== 'TODAY') {
      setPeriod('TODAY');
    }
  }, [hasUserChangedPeriod, period]);

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
              onChange={(event) => {
                setHasUserChangedPeriod(true);
                setPeriod(event.target.value as ReportPeriod);
              }}
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
  const [isImpersonationMode, setIsImpersonationMode] = useState(false);
  const [impersonationTenantName, setImpersonationTenantName] = useState('');
  const isAdminUser = user?.role === 'ADMIN';
  const canEmployeeViewFinance = user?.role === 'EMPLOYEE' && Boolean(brandIdentity.allowEmployeeViewFinance);
  const canEmployeeViewReports = user?.role === 'EMPLOYEE' && Boolean(brandIdentity.allowEmployeeViewReports);
  const canEmployeeViewUsers = user?.role === 'EMPLOYEE' && Boolean(brandIdentity.allowEmployeeViewUsers);
  const canAccessFinanceTab = isAdminUser || canEmployeeViewFinance;
  const canAccessReportsTab = isAdminUser || canEmployeeViewReports;
  const canAccessUsersTab = isAdminUser || canEmployeeViewUsers;
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'USERS' | 'AGENDA' | 'APPOINTMENT_CENTER' | 'FINANCE' | 'REPORTS' | 'SETTINGS'>(isAdminUser ? 'DASHBOARD' : 'AGENDA');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [agendaNavigationRequest, setAgendaNavigationRequest] = useState<(AgendaNavigationPayload & { nonce: number }) | null>(null);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  useEffect(() => {
    const hasBackup = Boolean(localStorage.getItem('impersonation_master_token'));
    const tenantName = String(localStorage.getItem('impersonation_tenant_name') || '');
    setIsImpersonationMode(hasBackup);
    setImpersonationTenantName(tenantName);
  }, [user?.id, user?.role]);

  const handleReturnToMaster = () => {
    const masterToken = localStorage.getItem('impersonation_master_token');
    const masterUser = localStorage.getItem('impersonation_master_user');
    if (!masterToken || !masterUser) {
      return;
    }

    const previousTenantSlug = localStorage.getItem('impersonation_previous_tenant_slug');
    if (previousTenantSlug && previousTenantSlug.trim()) {
      localStorage.setItem('tenant_slug', previousTenantSlug);
    } else {
      localStorage.removeItem('tenant_slug');
    }

    localStorage.setItem('auth_token', masterToken);
    localStorage.setItem('app_user', masterUser);
    localStorage.removeItem('impersonation_master_token');
    localStorage.removeItem('impersonation_master_user');
    localStorage.removeItem('impersonation_tenant_name');
    localStorage.removeItem('impersonation_tenant_slug');
    localStorage.removeItem('impersonation_previous_tenant_slug');
    window.location.hash = '/master';
    window.location.reload();
  };

  useEffect(() => {
    if (!isAdminUser && activeTab !== 'AGENDA' && activeTab !== 'APPOINTMENT_CENTER' && activeTab !== 'FINANCE' && activeTab !== 'REPORTS' && activeTab !== 'USERS') {
      setActiveTab('AGENDA');
    }
    if (!canAccessFinanceTab && activeTab === 'FINANCE') {
      setActiveTab('AGENDA');
    }
    if (!canAccessReportsTab && activeTab === 'REPORTS') {
      setActiveTab('AGENDA');
    }
    if (!canAccessUsersTab && activeTab === 'USERS') {
      setActiveTab('AGENDA');
    }
  }, [isAdminUser, canAccessFinanceTab, canAccessReportsTab, canAccessUsersTab, activeTab]);

  const handleTabChange = (tab: 'DASHBOARD' | 'USERS' | 'AGENDA' | 'APPOINTMENT_CENTER' | 'FINANCE' | 'REPORTS' | 'SETTINGS') => {
    if (!isAdminUser && tab !== 'AGENDA' && tab !== 'APPOINTMENT_CENTER' && !(tab === 'FINANCE' && canEmployeeViewFinance) && !(tab === 'REPORTS' && canEmployeeViewReports) && !(tab === 'USERS' && canEmployeeViewUsers)) {
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
          {canAccessUsersTab && (
            <button 
              onClick={() => handleTabChange('USERS')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'USERS' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <Users size={20} /> Clientes
            </button>
          )}
          {isAdminUser && (
            <>
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

         {isImpersonationMode && (
          <div className="mx-4 md:mx-6 mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div className="text-sm text-amber-800">
              Você está visualizando como admin da barbearia <strong>{impersonationTenantName || 'selecionada'}</strong>.
            </div>
            <button
              type="button"
              onClick={handleReturnToMaster}
              className="px-3 py-2 rounded-lg text-sm bg-amber-600 text-white hover:bg-amber-700"
            >
              Voltar ao Master
            </button>
          </div>
         )}

         <div className={`p-4 md:p-6 ${activeTab === 'AGENDA' ? 'flex-1 overflow-hidden' : ''}`}>
          {activeTab === 'DASHBOARD' && isAdminUser && <DashboardHome onViewAllRecent={handleViewAllRecent} />}
          {activeTab === 'FINANCE' && canAccessFinanceTab && <FinanceManagement />}
          {activeTab === 'REPORTS' && canAccessReportsTab && <ReportsManagement />}
          {activeTab === 'USERS' && canAccessUsersTab && <ClientsManagement />}
            {activeTab === 'AGENDA' && <CalendarManagement navigationRequest={agendaNavigationRequest} />}
          {activeTab === 'APPOINTMENT_CENTER' && <AppointmentCenterManagement onOpenAgenda={handleOpenAppointmentInAgenda} />}
          {activeTab === 'SETTINGS' && isAdminUser && <SettingsManagement />}
         </div>
      </main>
    </div>
  );
};