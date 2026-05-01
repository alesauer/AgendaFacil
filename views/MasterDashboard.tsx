import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, LogOut, Search, X } from 'lucide-react';
import {
  deleteMasterTenantApi,
  getMasterOverviewApi,
  impersonateMasterTenantApi,
  listMasterTenantsApi,
  MasterCheckinSearchRow,
  MasterOverview,
  MasterTenantRow,
  performMasterCheckinApi,
  provisionMasterTenantApi,
  searchMasterCheckinApi,
  setMasterTenantBlockedApi,
  updateMasterTenantApi,
} from '../services/masterApi';
import { MasterGlobalSettingsModal } from './MasterGlobalSettingsModal';

export const MasterDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  type TenantSortKey =
    | 'nome'
    | 'slug'
    | 'plano'
    | 'assinatura_status'
    | 'ciclo_cobranca'
    | 'valor_plano_centavos'
    | 'assinatura_inicio_em'
    | 'proxima_cobranca_em'
    | 'payment_last_event_type'
    | 'payment_webhook_updated_at'
    | 'clientes_30d'
    | 'agendamentos_30d'
    | 'mensagens_30d'
    | 'receita_30d'
    | 'ultimo_acesso';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortKey, setSortKey] = useState<TenantSortKey>('nome');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [overview, setOverview] = useState<MasterOverview | null>(null);
  const [rows, setRows] = useState<MasterTenantRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [labMessage, setLabMessage] = useState<string | null>(null);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [isSearchingCheckin, setIsSearchingCheckin] = useState(false);
  const [checkinRows, setCheckinRows] = useState<MasterCheckinSearchRow[]>([]);
  const [checkinLoadingId, setCheckinLoadingId] = useState<string | null>(null);
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);
  const [isEditTenantModalOpen, setIsEditTenantModalOpen] = useState(false);
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [isSavingTenant, setIsSavingTenant] = useState(false);
  const [blockLoadingTenantId, setBlockLoadingTenantId] = useState<string | null>(null);
  const [impersonatingTenantId, setImpersonatingTenantId] = useState<string | null>(null);
  const [deletingTenantId, setDeletingTenantId] = useState<string | null>(null);
  const [openActionsTenantId, setOpenActionsTenantId] = useState<string | null>(null);
  const [isDeleteTenantModalOpen, setIsDeleteTenantModalOpen] = useState(false);
  const [tenantPendingDelete, setTenantPendingDelete] = useState<MasterTenantRow | null>(null);
  const [isGlobalSettingsModalOpen, setIsGlobalSettingsModalOpen] = useState(false);

  const [provisionForm, setProvisionForm] = useState({
    tenant_nome: '',
    tenant_slug: '',
    tenant_telefone: '',
    tenant_cidade: '',
    admin_nome: '',
    admin_telefone: '',
    admin_email: '',
    admin_senha: 'admin123',
  });

  const [checkinForm, setCheckinForm] = useState({
    tenant_slug: '',
    date: new Date().toISOString().slice(0, 10),
    phone: '',
  });

  const [editTenantForm, setEditTenantForm] = useState({
    nome: '',
    slug: '',
    telefone: '',
    cidade: '',
  });

  const load = async () => {
    setIsLoading(true);
    setError(null);

    const [overviewResult, tenantsResult] = await Promise.all([
      getMasterOverviewApi({ search, status: statusFilter || undefined }),
      listMasterTenantsApi({ search, status: statusFilter || undefined }),
    ]);

    if (!overviewResult.success) {
      setError('error' in overviewResult ? overviewResult.error : 'Falha ao carregar visão geral');
      setIsLoading(false);
      return;
    }

    if (!tenantsResult.success) {
      setError('error' in tenantsResult ? tenantsResult.error : 'Falha ao carregar tenants');
      setIsLoading(false);
      return;
    }

    setOverview(overviewResult.data);
    setRows(tenantsResult.data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleProvisionTenant = async (event: React.FormEvent) => {
    event.preventDefault();
    setLabMessage(null);
    setIsProvisioning(true);

    const result = await provisionMasterTenantApi({
      tenant_nome: provisionForm.tenant_nome.trim(),
      tenant_slug: provisionForm.tenant_slug.trim().toLowerCase(),
      tenant_telefone: provisionForm.tenant_telefone.trim() || undefined,
      tenant_cidade: provisionForm.tenant_cidade.trim() || undefined,
      admin_nome: provisionForm.admin_nome.trim(),
      admin_telefone: provisionForm.admin_telefone.trim(),
      admin_email: provisionForm.admin_email.trim() || undefined,
      admin_senha: provisionForm.admin_senha,
    });

    setIsProvisioning(false);

    if (!result.success) {
      setLabMessage('error' in result ? result.error : 'Falha ao criar tenant');
      return;
    }

    setLabMessage(`Tenant ${result.data.tenant?.slug || provisionForm.tenant_slug} criado com sucesso.`);
    setProvisionForm(prev => ({ ...prev, tenant_nome: '', tenant_slug: '', tenant_telefone: '', tenant_cidade: '' }));
    setCheckinForm(prev => ({ ...prev, tenant_slug: result.data.tenant?.slug || prev.tenant_slug }));
    setIsProvisionModalOpen(false);
    await load();
  };

  const handleSearchCheckin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLabMessage(null);
    setIsSearchingCheckin(true);
    setCheckinRows([]);

    const result = await searchMasterCheckinApi({
      tenant_slug: checkinForm.tenant_slug.trim().toLowerCase(),
      date: checkinForm.date,
      phone: checkinForm.phone.trim(),
    });

    setIsSearchingCheckin(false);
    if (!result.success) {
      setLabMessage('error' in result ? result.error : 'Falha ao buscar agendamentos');
      return;
    }

    setCheckinRows(result.data.rows || []);
    if ((result.data.rows || []).length === 0) {
      setLabMessage('Nenhum agendamento elegível encontrado para os filtros informados.');
    }
  };

  const handlePerformCheckin = async (agendamentoId: string) => {
    setLabMessage(null);
    setCheckinLoadingId(agendamentoId);

    const result = await performMasterCheckinApi(agendamentoId, {
      tenant_slug: checkinForm.tenant_slug.trim().toLowerCase(),
    });

    setCheckinLoadingId(null);

    if (!result.success) {
      setLabMessage('error' in result ? result.error : 'Falha ao realizar check-in');
      return;
    }

    setLabMessage(result.data.already_checked_in ? 'Agendamento já estava em atendimento.' : 'Check-in realizado com sucesso.');
    setCheckinRows(prev => prev.map(row => (row.id === agendamentoId ? { ...row, status: 'IN_PROGRESS' } : row)));
    await load();
  };

  const openEditTenantModal = (row: MasterTenantRow) => {
    setLabMessage(null);
    setEditingTenantId(row.id);
    setEditTenantForm({
      nome: row.nome || '',
      slug: row.slug || '',
      telefone: row.telefone || '',
      cidade: row.cidade || '',
    });
    setIsEditTenantModalOpen(true);
  };

  const handleSaveTenantEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingTenantId) return;

    setLabMessage(null);
    setIsSavingTenant(true);

    const result = await updateMasterTenantApi(editingTenantId, {
      nome: editTenantForm.nome.trim(),
      slug: editTenantForm.slug.trim().toLowerCase(),
      telefone: editTenantForm.telefone.trim() || undefined,
      cidade: editTenantForm.cidade.trim() || undefined,
    });

    setIsSavingTenant(false);
    if (!result.success) {
      setLabMessage('error' in result ? result.error : 'Falha ao editar barbearia');
      return;
    }

    setLabMessage(`Barbearia ${result.data.slug || editTenantForm.slug} atualizada com sucesso.`);
    setIsEditTenantModalOpen(false);
    setEditingTenantId(null);
    await load();
  };

  const handleToggleTenantBlock = async (row: MasterTenantRow) => {
    const isBlocked = String(row.assinatura_status || '').toUpperCase() === 'SUSPENDED';
    const blockedTarget = !isBlocked;

    setLabMessage(null);
    setBlockLoadingTenantId(row.id);

    const result = await setMasterTenantBlockedApi(row.id, blockedTarget);

    setBlockLoadingTenantId(null);
    if (!result.success) {
      setLabMessage('error' in result ? result.error : 'Falha ao atualizar status da barbearia');
      return;
    }

    setLabMessage(blockedTarget
      ? `Barbearia ${row.slug} bloqueada com sucesso.`
      : `Barbearia ${row.slug} desbloqueada com sucesso.`);
    await load();
  };

  const handleImpersonateTenant = async (row: MasterTenantRow) => {
    setLabMessage(null);
    setImpersonatingTenantId(row.id);

    const result = await impersonateMasterTenantApi(row.id, `Suporte MASTER para ${row.slug}`);
    setImpersonatingTenantId(null);

    if (!result.success) {
      setLabMessage('error' in result ? result.error : 'Falha ao entrar como admin');
      return;
    }

    const masterToken = localStorage.getItem('auth_token');
    const masterUser = localStorage.getItem('app_user');
    if (!masterToken || !masterUser) {
      setLabMessage('Sessão MASTER inválida para iniciar impersonação. Faça login novamente.');
      return;
    }

    localStorage.setItem('impersonation_master_token', masterToken);
    localStorage.setItem('impersonation_master_user', masterUser);
    localStorage.setItem('impersonation_tenant_name', result.data.tenant?.nome || row.nome || 'Barbearia');
    localStorage.setItem('impersonation_tenant_slug', result.data.tenant?.slug || row.slug || '');

    const currentTenantSlug = localStorage.getItem('tenant_slug') || '';
    localStorage.setItem('impersonation_previous_tenant_slug', currentTenantSlug);
    localStorage.setItem('tenant_slug', result.data.tenant?.slug || row.slug || '');

    const impersonatedUser = {
      id: result.data.user.id,
      name: result.data.user.nome,
      phone: result.data.user.telefone || '',
      email: result.data.user.email || '',
      role: 'ADMIN',
      active: result.data.user.ativo,
    };

    localStorage.setItem('auth_token', result.data.token);
    localStorage.setItem('app_user', JSON.stringify(impersonatedUser));
    window.location.hash = '/admin';
    window.location.reload();
  };

  const requestDeleteTenant = (row: MasterTenantRow) => {
    setOpenActionsTenantId(null);
    setTenantPendingDelete(row);
    setIsDeleteTenantModalOpen(true);
  };

  const handleDeleteTenant = async () => {
    if (!tenantPendingDelete) return;
    const row = tenantPendingDelete;

    setLabMessage(null);
    setDeletingTenantId(row.id);
    setIsDeleteTenantModalOpen(false);

    const result = await deleteMasterTenantApi(row.id);

    setDeletingTenantId(null);
    setOpenActionsTenantId(null);
    setTenantPendingDelete(null);

    if (!result.success) {
      setLabMessage('error' in result ? result.error : 'Falha ao excluir barbearia');
      return;
    }

    setLabMessage(`Barbearia ${row.slug} excluída com sucesso.`);
    await load();
  };

  const statusLabel = (value: string) => {
    const key = String(value || '').toUpperCase();
    if (key === 'ACTIVE') return 'Ativa';
    if (key === 'TRIAL') return 'Trial';
    if (key === 'PAST_DUE') return 'Inadimplente';
    if (key === 'CANCELLED') return 'Cancelada';
    if (key === 'SUSPENDED') return 'Suspensa';
    return key || 'N/A';
  };

  const billingCycleLabel = (value?: string | null) => {
    const key = String(value || '').toUpperCase();
    if (key === 'MONTHLY') return 'Mensal';
    if (key === 'YEARLY') return 'Anual';
    return 'N/A';
  };

  const statusClass = (value: string) => {
    const key = String(value || '').toUpperCase();
    if (key === 'ACTIVE') return 'bg-green-100 text-green-700';
    if (key === 'TRIAL') return 'bg-blue-100 text-blue-700';
    if (key === 'PAST_DUE') return 'bg-amber-100 text-amber-700';
    if (key === 'CANCELLED') return 'bg-red-100 text-red-700';
    if (key === 'SUSPENDED') return 'bg-gray-200 text-gray-700';
    return 'bg-gray-100 text-gray-700';
  };

  const handleSort = (key: TenantSortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDirection('asc');
  };

  const sortIndicator = (key: TenantSortKey) => {
    if (sortKey !== key) return '↕';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const parseDateValue = (value?: string | null) => {
    if (!value) return 0;
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
  };

  const sortedRows = useMemo(() => {
    const direction = sortDirection === 'asc' ? 1 : -1;
    const list = [...rows];

    list.sort((a, b) => {
      const textCompare = (left: string, right: string) => left.localeCompare(right, 'pt-BR', { sensitivity: 'base' });

      let result = 0;
      switch (sortKey) {
        case 'nome':
          result = textCompare(String(a.nome || ''), String(b.nome || ''));
          break;
        case 'slug':
          result = textCompare(String(a.slug || ''), String(b.slug || ''));
          break;
        case 'plano':
          result = textCompare(String(a.plano || ''), String(b.plano || ''));
          break;
        case 'assinatura_status':
          result = textCompare(String(a.assinatura_status || ''), String(b.assinatura_status || ''));
          break;
        case 'ciclo_cobranca':
          result = textCompare(String(a.ciclo_cobranca || ''), String(b.ciclo_cobranca || ''));
          break;
        case 'valor_plano_centavos':
          result = Number(a.valor_plano_centavos || 0) - Number(b.valor_plano_centavos || 0);
          break;
        case 'assinatura_inicio_em':
          result = parseDateValue(a.assinatura_inicio_em) - parseDateValue(b.assinatura_inicio_em);
          break;
        case 'proxima_cobranca_em':
          result = parseDateValue(a.proxima_cobranca_em) - parseDateValue(b.proxima_cobranca_em);
          break;
        case 'payment_last_event_type':
          result = textCompare(String(a.payment_last_event_type || ''), String(b.payment_last_event_type || ''));
          break;
        case 'payment_webhook_updated_at':
          result = parseDateValue(a.payment_webhook_updated_at) - parseDateValue(b.payment_webhook_updated_at);
          break;
        case 'clientes_30d':
          result = Number(a.clientes_30d || 0) - Number(b.clientes_30d || 0);
          break;
        case 'agendamentos_30d':
          result = Number(a.agendamentos_30d || 0) - Number(b.agendamentos_30d || 0);
          break;
        case 'mensagens_30d':
          result = Number(a.mensagens_30d || 0) - Number(b.mensagens_30d || 0);
          break;
        case 'receita_30d':
          result = Number(a.receita_30d || 0) - Number(b.receita_30d || 0);
          break;
        case 'ultimo_acesso':
          result = parseDateValue(a.ultimo_acesso) - parseDateValue(b.ultimo_acesso);
          break;
        default:
          result = 0;
      }

      return result * direction;
    });

    return list;
  }, [rows, sortDirection, sortKey]);

  const cards = useMemo(() => {
    return [
      { label: 'Barbearias', value: overview?.total_tenants ?? 0 },
      { label: 'Ativas', value: overview?.tenants_ativos ?? 0 },
      { label: 'Em trial', value: overview?.tenants_trial ?? 0 },
      { label: 'Inadimplentes', value: overview?.tenants_inadimplentes ?? 0 },
      { label: 'Canceladas', value: overview?.tenants_canceladas ?? 0 },
      { label: 'Vencendo em 7d', value: overview?.vencendo_7d ?? 0 },
      { label: 'MRR estimado', value: `R$ ${Number(overview?.mrr_estimado || 0).toFixed(2)}` },
      { label: 'Pagamentos OK (7d)', value: overview?.pagamentos_ok_7d ?? 0 },
      { label: 'Falhas (7d)', value: overview?.falhas_7d ?? 0 },
      { label: 'Sem webhook >24h', value: overview?.sem_webhook_recente_24h ?? 0 },
    ];
  }, [overview]);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Master SaaS</h1>
          <p className="text-sm text-gray-500">Visão consolidada de tenants</p>
        </div>
        <button
          onClick={onLogout}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
        >
          <LogOut size={16} /> Sair
        </button>
      </header>

      <main className="p-4 md:p-6 space-y-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
          <div className="text-sm font-semibold text-gray-700">Lab de testes (MASTER)</div>
          {labMessage && <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">{labMessage}</div>}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setLabMessage(null);
                setIsGlobalSettingsModalOpen(true);
              }}
              className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700"
            >
              Configurações globais
            </button>
            <button
              onClick={() => {
                setLabMessage(null);
                setIsProvisionModalOpen(true);
              }}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              Criar barbearia + admin
            </button>
            <button
              onClick={() => {
                setLabMessage(null);
                setIsCheckinModalOpen(true);
              }}
              className="px-3 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-black"
            >
              Check-in (MASTER)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
          {cards.map((card) => (
            <div key={card.label} className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="md:col-span-2 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar barbearia por nome/slug"
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="">Todos status</option>
              <option value="ACTIVE">Ativa</option>
              <option value="TRIAL">Trial</option>
              <option value="PAST_DUE">Inadimplente</option>
              <option value="CANCELLED">Cancelada</option>
              <option value="SUSPENDED">Suspensa</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Aplicar</button>
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('');
              }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
            >
              Limpar
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 overflow-visible">
          <div className="px-4 py-3 border-b bg-gray-50 text-sm text-gray-600">Tenants</div>
          {error && <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full text-sm text-left min-w-[980px]">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3"><button type="button" onClick={() => handleSort('nome')} className="inline-flex items-center gap-1 hover:text-gray-900">Barbearia <span className="text-[11px]">{sortIndicator('nome')}</span></button></th>
                  <th className="px-4 py-3"><button type="button" onClick={() => handleSort('slug')} className="inline-flex items-center gap-1 hover:text-gray-900">Slug <span className="text-[11px]">{sortIndicator('slug')}</span></button></th>
                  <th className="px-4 py-3"><button type="button" onClick={() => handleSort('plano')} className="inline-flex items-center gap-1 hover:text-gray-900">Plano <span className="text-[11px]">{sortIndicator('plano')}</span></button></th>
                  <th className="px-4 py-3"><button type="button" onClick={() => handleSort('assinatura_status')} className="inline-flex items-center gap-1 hover:text-gray-900">Status <span className="text-[11px]">{sortIndicator('assinatura_status')}</span></button></th>
                  <th className="px-4 py-3"><button type="button" onClick={() => handleSort('ciclo_cobranca')} className="inline-flex items-center gap-1 hover:text-gray-900">Ciclo <span className="text-[11px]">{sortIndicator('ciclo_cobranca')}</span></button></th>
                  <th className="px-4 py-3"><button type="button" onClick={() => handleSort('valor_plano_centavos')} className="inline-flex items-center gap-1 hover:text-gray-900">Valor plano <span className="text-[11px]">{sortIndicator('valor_plano_centavos')}</span></button></th>
                  <th className="px-4 py-3"><button type="button" onClick={() => handleSort('assinatura_inicio_em')} className="inline-flex items-center gap-1 hover:text-gray-900">Início assinatura <span className="text-[11px]">{sortIndicator('assinatura_inicio_em')}</span></button></th>
                  <th className="px-4 py-3"><button type="button" onClick={() => handleSort('proxima_cobranca_em')} className="inline-flex items-center gap-1 hover:text-gray-900">Próxima cobrança <span className="text-[11px]">{sortIndicator('proxima_cobranca_em')}</span></button></th>
                  <th className="px-4 py-3"><button type="button" onClick={() => handleSort('payment_last_event_type')} className="inline-flex items-center gap-1 hover:text-gray-900">Último evento de pagamento <span className="text-[11px]">{sortIndicator('payment_last_event_type')}</span></button></th>
                  <th className="px-4 py-3"><button type="button" onClick={() => handleSort('payment_webhook_updated_at')} className="inline-flex items-center gap-1 hover:text-gray-900">Webhook atualizado em <span className="text-[11px]">{sortIndicator('payment_webhook_updated_at')}</span></button></th>
                  <th className="px-4 py-3"><button type="button" onClick={() => handleSort('clientes_30d')} className="inline-flex items-center gap-1 hover:text-gray-900">Clientes (30d) <span className="text-[11px]">{sortIndicator('clientes_30d')}</span></button></th>
                  <th className="px-4 py-3"><button type="button" onClick={() => handleSort('agendamentos_30d')} className="inline-flex items-center gap-1 hover:text-gray-900">Agendamentos (30d) <span className="text-[11px]">{sortIndicator('agendamentos_30d')}</span></button></th>
                  <th className="px-4 py-3"><button type="button" onClick={() => handleSort('mensagens_30d')} className="inline-flex items-center gap-1 hover:text-gray-900">Mensagens (30d) <span className="text-[11px]">{sortIndicator('mensagens_30d')}</span></button></th>
                  <th className="px-4 py-3"><button type="button" onClick={() => handleSort('receita_30d')} className="inline-flex items-center gap-1 hover:text-gray-900">Receita (30d) <span className="text-[11px]">{sortIndicator('receita_30d')}</span></button></th>
                  <th className="px-4 py-3"><button type="button" onClick={() => handleSort('ultimo_acesso')} className="inline-flex items-center gap-1 hover:text-gray-900">Último acesso <span className="text-[11px]">{sortIndicator('ultimo_acesso')}</span></button></th>
                  <th className="px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {!isLoading && sortedRows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">{row.nome}</td>
                    <td className="px-4 py-3 text-gray-600">{row.slug}</td>
                    <td className="px-4 py-3 text-gray-600">{row.plano || 'N/A'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusClass(row.assinatura_status)}`}>
                        {statusLabel(row.assinatura_status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{billingCycleLabel(row.ciclo_cobranca)}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {row.valor_plano_centavos != null ? `R$ ${(Number(row.valor_plano_centavos) / 100).toFixed(2)}` : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{row.assinatura_inicio_em ? new Date(row.assinatura_inicio_em).toLocaleString('pt-BR') : 'N/A'}</td>
                    <td className="px-4 py-3 text-gray-600">{row.proxima_cobranca_em ? new Date(row.proxima_cobranca_em).toLocaleString('pt-BR') : 'N/A'}</td>
                    <td className="px-4 py-3 text-gray-600">{row.payment_last_event_type || 'N/A'}</td>
                    <td className="px-4 py-3 text-gray-600">{row.payment_webhook_updated_at ? new Date(row.payment_webhook_updated_at).toLocaleString('pt-BR') : 'N/A'}</td>
                    <td className="px-4 py-3 text-gray-700">{Number(row.clientes_30d || 0)}</td>
                    <td className="px-4 py-3 text-gray-700">{Number(row.agendamentos_30d || 0)}</td>
                    <td className="px-4 py-3 text-gray-700">{Number(row.mensagens_30d || 0)}</td>
                    <td className="px-4 py-3 text-gray-700">R$ {Number(row.receita_30d || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-600">{row.ultimo_acesso ? new Date(row.ultimo_acesso).toLocaleString('pt-BR') : 'N/A'}</td>
                    <td className="px-4 py-3">
                      <div className="relative inline-block text-left">
                        <button
                          onClick={() => setOpenActionsTenantId(prev => (prev === row.id ? null : row.id))}
                          className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 inline-flex items-center gap-1"
                        >
                          Ações <ChevronDown size={14} />
                        </button>

                        {openActionsTenantId === row.id && (
                          <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-md z-20 overflow-hidden">
                            <button
                              onClick={() => {
                                setOpenActionsTenantId(null);
                                openEditTenantModal(row);
                              }}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => {
                                setOpenActionsTenantId(null);
                                handleImpersonateTenant(row);
                              }}
                              disabled={impersonatingTenantId === row.id}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 disabled:opacity-70"
                            >
                              {impersonatingTenantId === row.id ? 'Entrando...' : 'Ver como Admin'}
                            </button>
                            <button
                              onClick={() => {
                                setOpenActionsTenantId(null);
                                handleToggleTenantBlock(row);
                              }}
                              disabled={blockLoadingTenantId === row.id}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 disabled:opacity-70"
                            >
                              {blockLoadingTenantId === row.id
                                ? 'Processando...'
                                : (String(row.assinatura_status || '').toUpperCase() === 'SUSPENDED' ? 'Desbloquear' : 'Bloquear')}
                            </button>
                            <button
                              onClick={() => requestDeleteTenant(row)}
                              disabled={deletingTenantId === row.id}
                              className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 disabled:opacity-70"
                            >
                              {deletingTenantId === row.id ? 'Excluindo...' : 'Excluir barbearia'}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!isLoading && rows.length === 0 && (
                  <tr>
                    <td colSpan={16} className="px-4 py-6 text-center text-sm text-gray-500">Nenhuma barbearia encontrada.</td>
                  </tr>
                )}
                {isLoading && (
                  <tr>
                    <td colSpan={16} className="px-4 py-6 text-center text-sm text-gray-500">Carregando dados...</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {isDeleteTenantModalOpen && tenantPendingDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl border border-gray-200 shadow-xl">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-700">Confirmar exclusão</div>
              <button
                onClick={() => {
                  setIsDeleteTenantModalOpen(false);
                  setTenantPendingDelete(null);
                }}
                className="p-1 rounded hover:bg-gray-100"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-700">
                Deseja realmente excluir a barbearia <strong>{tenantPendingDelete.nome}</strong> ({tenantPendingDelete.slug})?
              </p>
              <p className="text-xs text-gray-500">
                Essa ação pode ser irreversível e pode falhar se houver dados vinculados.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteTenantModalOpen(false);
                    setTenantPendingDelete(null);
                  }}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDeleteTenant}
                  disabled={deletingTenantId === tenantPendingDelete.id}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-70"
                >
                  {deletingTenantId === tenantPendingDelete.id ? 'Excluindo...' : 'Excluir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isEditTenantModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-xl border border-gray-200 shadow-xl">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-700">Editar barbearia</div>
              <button
                onClick={() => {
                  setIsEditTenantModalOpen(false);
                  setEditingTenantId(null);
                }}
                className="p-1 rounded hover:bg-gray-100"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveTenantEdit} className="p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <input value={editTenantForm.nome} onChange={(e) => setEditTenantForm(prev => ({ ...prev, nome: e.target.value }))} placeholder="Nome da barbearia" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" required />
                <input value={editTenantForm.slug} onChange={(e) => setEditTenantForm(prev => ({ ...prev, slug: e.target.value }))} placeholder="slug" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" required />
                <input value={editTenantForm.telefone} onChange={(e) => setEditTenantForm(prev => ({ ...prev, telefone: e.target.value }))} placeholder="Telefone" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                <input value={editTenantForm.cidade} onChange={(e) => setEditTenantForm(prev => ({ ...prev, cidade: e.target.value }))} placeholder="Cidade" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => { setIsEditTenantModalOpen(false); setEditingTenantId(null); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={isSavingTenant} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-70">
                  {isSavingTenant ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isProvisionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white rounded-xl border border-gray-200 shadow-xl">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-700">Criar barbearia + admin</div>
              <button onClick={() => setIsProvisionModalOpen(false)} className="p-1 rounded hover:bg-gray-100"><X size={16} /></button>
            </div>
            <form onSubmit={handleProvisionTenant} className="p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <input value={provisionForm.tenant_nome} onChange={(e) => setProvisionForm(prev => ({ ...prev, tenant_nome: e.target.value }))} placeholder="Nome da barbearia" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" required />
                <input value={provisionForm.tenant_slug} onChange={(e) => setProvisionForm(prev => ({ ...prev, tenant_slug: e.target.value }))} placeholder="slug (ex: demo4)" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" required />
                <input value={provisionForm.tenant_telefone} onChange={(e) => setProvisionForm(prev => ({ ...prev, tenant_telefone: e.target.value }))} placeholder="Telefone barbearia" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                <input value={provisionForm.tenant_cidade} onChange={(e) => setProvisionForm(prev => ({ ...prev, tenant_cidade: e.target.value }))} placeholder="Cidade" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                <input value={provisionForm.admin_nome} onChange={(e) => setProvisionForm(prev => ({ ...prev, admin_nome: e.target.value }))} placeholder="Nome admin" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" required />
                <input value={provisionForm.admin_telefone} onChange={(e) => setProvisionForm(prev => ({ ...prev, admin_telefone: e.target.value }))} placeholder="Telefone admin" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" required />
                <input value={provisionForm.admin_email} onChange={(e) => setProvisionForm(prev => ({ ...prev, admin_email: e.target.value }))} placeholder="E-mail admin (opcional)" className="px-3 py-2 border border-gray-200 rounded-lg text-sm md:col-span-2" />
                <input type="password" value={provisionForm.admin_senha} onChange={(e) => setProvisionForm(prev => ({ ...prev, admin_senha: e.target.value }))} placeholder="Senha admin" className="px-3 py-2 border border-gray-200 rounded-lg text-sm md:col-span-2" required />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsProvisionModalOpen(false)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={isProvisioning} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-70">
                  {isProvisioning ? 'Criando...' : 'Criar tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCheckinModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-white rounded-xl border border-gray-200 shadow-xl">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-700">Check-in (MASTER)</div>
              <button onClick={() => setIsCheckinModalOpen(false)} className="p-1 rounded hover:bg-gray-100"><X size={16} /></button>
            </div>
            <div className="p-4 space-y-3">
              <form onSubmit={handleSearchCheckin} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <input value={checkinForm.tenant_slug} onChange={(e) => setCheckinForm(prev => ({ ...prev, tenant_slug: e.target.value }))} placeholder="tenant slug" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" required />
                  <input type="date" value={checkinForm.date} onChange={(e) => setCheckinForm(prev => ({ ...prev, date: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" required />
                  <input value={checkinForm.phone} onChange={(e) => setCheckinForm(prev => ({ ...prev, phone: e.target.value }))} placeholder="Telefone cliente" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" required />
                </div>
                <button type="submit" disabled={isSearchingCheckin} className="px-3 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-black disabled:opacity-70">
                  {isSearchingCheckin ? 'Buscando...' : 'Buscar agendamentos'}
                </button>
              </form>

              {checkinRows.length > 0 && (
                <div className="border border-gray-100 rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-2 py-2">Hora</th>
                        <th className="px-2 py-2">Cliente</th>
                        <th className="px-2 py-2">Serviço</th>
                        <th className="px-2 py-2">Status</th>
                        <th className="px-2 py-2">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {checkinRows.map((row) => (
                        <tr key={row.id}>
                          <td className="px-2 py-2">{String(row.hora_inicio || '').slice(0, 5)}</td>
                          <td className="px-2 py-2">{row.cliente_nome || row.cliente_telefone || 'N/A'}</td>
                          <td className="px-2 py-2">{row.servico_nome || 'N/A'}</td>
                          <td className="px-2 py-2">{row.status}</td>
                          <td className="px-2 py-2">
                            <button
                              onClick={() => handlePerformCheckin(row.id)}
                              disabled={checkinLoadingId === row.id}
                              className="px-2 py-1 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-700 disabled:opacity-70"
                            >
                              {checkinLoadingId === row.id ? 'Processando...' : 'Check-in'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <MasterGlobalSettingsModal
        open={isGlobalSettingsModalOpen}
        onClose={() => setIsGlobalSettingsModalOpen(false)}
      />
    </div>
  );
};
