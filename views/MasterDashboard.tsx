import React, { useEffect, useMemo, useState } from 'react';
import { LogOut, Search } from 'lucide-react';
import { getMasterOverviewApi, listMasterTenantsApi, MasterOverview, MasterTenantRow } from '../services/masterApi';

export const MasterDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [overview, setOverview] = useState<MasterOverview | null>(null);
  const [rows, setRows] = useState<MasterTenantRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const statusLabel = (value: string) => {
    const key = String(value || '').toUpperCase();
    if (key === 'ACTIVE') return 'Ativa';
    if (key === 'TRIAL') return 'Trial';
    if (key === 'PAST_DUE') return 'Inadimplente';
    if (key === 'CANCELLED') return 'Cancelada';
    if (key === 'SUSPENDED') return 'Suspensa';
    return key || 'N/A';
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

  const cards = useMemo(() => {
    return [
      { label: 'Barbearias', value: overview?.total_tenants ?? 0 },
      { label: 'Ativas', value: overview?.tenants_ativos ?? 0 },
      { label: 'Clientes (30d)', value: overview?.clientes_30d ?? 0 },
      { label: 'Agendamentos (30d)', value: overview?.agendamentos_30d ?? 0 },
      { label: 'Mensagens (30d)', value: overview?.mensagens_30d ?? 0 },
      { label: 'Receita (30d)', value: `R$ ${Number(overview?.receita_30d || 0).toFixed(2)}` },
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
        <div className="grid grid-cols-2 xl:grid-cols-6 gap-3">
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

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50 text-sm text-gray-600">Tenants</div>
          {error && <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[980px]">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3">Barbearia</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Plano</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Clientes (30d)</th>
                  <th className="px-4 py-3">Agendamentos (30d)</th>
                  <th className="px-4 py-3">Mensagens (30d)</th>
                  <th className="px-4 py-3">Receita (30d)</th>
                  <th className="px-4 py-3">Último acesso</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {!isLoading && rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">{row.nome}</td>
                    <td className="px-4 py-3 text-gray-600">{row.slug}</td>
                    <td className="px-4 py-3 text-gray-600">{row.plano || 'BASIC'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusClass(row.assinatura_status)}`}>
                        {statusLabel(row.assinatura_status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{Number(row.clientes_30d || 0)}</td>
                    <td className="px-4 py-3 text-gray-700">{Number(row.agendamentos_30d || 0)}</td>
                    <td className="px-4 py-3 text-gray-700">{Number(row.mensagens_30d || 0)}</td>
                    <td className="px-4 py-3 text-gray-700">R$ {Number(row.receita_30d || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-600">{row.ultimo_acesso ? new Date(row.ultimo_acesso).toLocaleString('pt-BR') : 'N/A'}</td>
                  </tr>
                ))}
                {!isLoading && rows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-6 text-center text-sm text-gray-500">Nenhuma barbearia encontrada.</td>
                  </tr>
                )}
                {isLoading && (
                  <tr>
                    <td colSpan={9} className="px-4 py-6 text-center text-sm text-gray-500">Carregando dados...</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};
