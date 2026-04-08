import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import {
  listMasterGlobalReleasesApi,
  listMasterGlobalSettingsApi,
  MasterGlobalRelease,
  MasterGlobalSetting,
  publishMasterGlobalSettingsApi,
  rollbackMasterGlobalSettingsApi,
  testMasterGlobalSettingsApi,
  updateMasterGlobalSettingApi,
} from '../services/masterSettingsApi';

type Props = {
  open: boolean;
  onClose: () => void;
};

const categories: Array<{ key: 'proxy' | 'email' | 'whatsapp' | 'payments'; label: string }> = [
  { key: 'proxy', label: 'Rede/Proxy' },
  { key: 'email', label: 'E-mail' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'payments', label: 'Pagamentos' },
];

export const MasterGlobalSettingsModal: React.FC<Props> = ({ open, onClose }) => {
  const [activeCategory, setActiveCategory] = useState<'proxy' | 'email' | 'whatsapp' | 'payments'>('proxy');
  const [settingsVersion, setSettingsVersion] = useState<number>(0);
  const [rows, setRows] = useState<MasterGlobalSetting[]>([]);
  const [releases, setReleases] = useState<MasterGlobalRelease[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [publishNotes, setPublishNotes] = useState('');
  const [rollbackVersion, setRollbackVersion] = useState<string>('');

  const load = async () => {
    setLoading(true);
    setMessage(null);

    const [settingsResult, releasesResult] = await Promise.all([
      listMasterGlobalSettingsApi(),
      listMasterGlobalReleasesApi(30),
    ]);

    if (!settingsResult.success) {
      setMessage('error' in settingsResult ? settingsResult.error : 'Falha ao carregar configurações');
      setLoading(false);
      return;
    }

    if (!releasesResult.success) {
      setMessage('error' in releasesResult ? releasesResult.error : 'Falha ao carregar histórico de releases');
      setLoading(false);
      return;
    }

    const allRows = settingsResult.data.items || [];
    setRows(allRows);
    setSettingsVersion(settingsResult.data.version || 0);
    setReleases(releasesResult.data || []);

    const initialDrafts: Record<string, string> = {};
    for (const row of allRows) {
      if (typeof row.value === 'string') {
        initialDrafts[row.key] = row.value;
      } else if (row.value == null) {
        initialDrafts[row.key] = '';
      } else {
        initialDrafts[row.key] = String(row.value);
      }
    }
    setDraftValues(initialDrafts);
    setLoading(false);
  };

  useEffect(() => {
    if (!open) return;
    load();
  }, [open]);

  const categoryRows = useMemo(
    () => rows.filter(row => row.category === activeCategory),
    [rows, activeCategory]
  );

  const hasPendingInCategory = useMemo(
    () => categoryRows.some(row => row.has_pending),
    [categoryRows]
  );

  const saveCategoryDraft = async () => {
    setSaving(true);
    setMessage(null);

    for (const row of categoryRows) {
      const nextValue = draftValues[row.key] ?? '';
      const currentValue = row.value ?? '';
      if (String(nextValue) === String(currentValue)) {
        continue;
      }

      const payloadValue = row.data_type === 'boolean'
        ? String(nextValue).toLowerCase() === 'true'
        : nextValue;

      const result = await updateMasterGlobalSettingApi(row.key, payloadValue);
      if (!result.success) {
        setSaving(false);
        setMessage('error' in result ? result.error : `Falha ao salvar ${row.env_key}`);
        return;
      }
    }

    setSaving(false);
    setMessage('Rascunho salvo com sucesso.');
    await load();
  };

  const runCategoryTest = async () => {
    setTesting(true);
    setMessage(null);
    const result = await testMasterGlobalSettingsApi(activeCategory, true);
    setTesting(false);

    if (!result.success) {
      setMessage('error' in result ? result.error : 'Falha no teste de conectividade');
      return;
    }

    setMessage(result.data.message || 'Teste executado com sucesso.');
  };

  const publishDraft = async () => {
    setPublishing(true);
    setMessage(null);
    const result = await publishMasterGlobalSettingsApi(publishNotes.trim() || undefined);
    setPublishing(false);

    if (!result.success) {
      setMessage('error' in result ? result.error : 'Falha ao publicar alterações');
      return;
    }

    const restarted = (result.data.requires_restart || []).length > 0;
    const restartMessage = restarted
      ? ' Algumas chaves exigem restart do backend para efeito completo.'
      : '';

    setMessage(`${result.data.message}${restartMessage}`);
    setPublishNotes('');
    await load();
  };

  const rollbackRelease = async () => {
    const parsed = Number(rollbackVersion || 0);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setMessage('Informe uma versão válida para rollback.');
      return;
    }

    setRollingBack(true);
    setMessage(null);
    const result = await rollbackMasterGlobalSettingsApi(parsed, `Rollback solicitado via painel MASTER para versão ${parsed}`);
    setRollingBack(false);

    if (!result.success) {
      setMessage('error' in result ? result.error : 'Falha ao aplicar rollback');
      return;
    }

    setMessage(result.data.message || 'Rollback aplicado com sucesso.');
    setRollbackVersion('');
    await load();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-6xl bg-white rounded-xl border border-gray-200 shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-700">Configurações Globais</div>
            <div className="text-xs text-gray-500">Versão publicada atual: v{settingsVersion}</div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {message && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
              {message}
            </div>
          )}

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Alterações em proxy/rede podem exigir restart do backend para efeito completo.
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map(item => (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveCategory(item.key)}
                className={`px-3 py-2 rounded-lg text-sm border ${activeCategory === item.key
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="border border-gray-100 rounded-lg overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-3 py-2">Variável</th>
                  <th className="px-3 py-2">Descrição</th>
                  <th className="px-3 py-2">Valor</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {categoryRows.map(row => {
                  const isBoolean = row.data_type === 'boolean';
                  const showSecret = !!showSecrets[row.key];
                  const inputType = row.is_secret && !showSecret ? 'password' : 'text';
                  const rawValue = draftValues[row.key] ?? '';

                  return (
                    <tr key={row.key}>
                      <td className="px-3 py-2 text-xs text-gray-700 font-mono">{row.env_key}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{row.description}</td>
                      <td className="px-3 py-2">
                        {isBoolean ? (
                          <select
                            value={String(rawValue || 'false').toLowerCase() === 'true' ? 'true' : 'false'}
                            onChange={(event) => setDraftValues(prev => ({ ...prev, [row.key]: event.target.value }))}
                            className="w-full px-2 py-1 border border-gray-200 rounded text-xs"
                          >
                            <option value="true">true</option>
                            <option value="false">false</option>
                          </select>
                        ) : (
                          <div className="space-y-1">
                            <input
                              value={rawValue}
                              type={inputType}
                              onChange={(event) => setDraftValues(prev => ({ ...prev, [row.key]: event.target.value }))}
                              className="w-full px-2 py-1 border border-gray-200 rounded text-xs"
                            />
                            {row.is_secret && (
                              <button
                                type="button"
                                onClick={() => setShowSecrets(prev => ({ ...prev, [row.key]: !prev[row.key] }))}
                                className="text-[11px] text-blue-700 hover:underline"
                              >
                                {showSecret ? 'Ocultar' : 'Mostrar'}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600">
                        {row.has_pending ? 'Rascunho pendente' : 'Publicado'}
                        {row.requires_restart ? ' • Requer restart' : ' • Dinâmico'}
                      </td>
                    </tr>
                  );
                })}
                {!loading && categoryRows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-xs text-gray-500">Sem configurações nesta categoria.</td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-xs text-gray-500">Carregando...</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <button
              type="button"
              onClick={saveCategoryDraft}
              disabled={saving || loading}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-70"
            >
              {saving ? 'Salvando...' : 'Salvar rascunho'}
            </button>
            <button
              type="button"
              onClick={runCategoryTest}
              disabled={testing || loading}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-70"
            >
              {testing ? 'Testando...' : `Testar ${categories.find(c => c.key === activeCategory)?.label || 'categoria'}`}
            </button>
            <span className="text-xs text-gray-500">
              {hasPendingInCategory ? 'Há mudanças pendentes nesta aba.' : 'Sem mudanças pendentes nesta aba.'}
            </span>
          </div>

          <div className="rounded-lg border border-gray-100 p-3 space-y-3">
            <div className="text-sm font-semibold text-gray-700">Publicação e rollback</div>

            <div className="flex flex-wrap gap-2 items-center">
              <input
                value={publishNotes}
                onChange={(event) => setPublishNotes(event.target.value)}
                placeholder="Observação da publicação (opcional)"
                className="flex-1 min-w-[240px] px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <button
                type="button"
                onClick={publishDraft}
                disabled={publishing || loading}
                className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-70"
              >
                {publishing ? 'Publicando...' : 'Publicar'}
              </button>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <select
                value={rollbackVersion}
                onChange={(event) => setRollbackVersion(event.target.value)}
                className="min-w-[220px] px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                <option value="">Selecionar versão para rollback</option>
                {releases.map(item => (
                  <option key={item.version} value={String(item.version)}>
                    v{item.version} • {item.action} • {new Date(item.created_at).toLocaleString('pt-BR')}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={rollbackRelease}
                disabled={rollingBack || !rollbackVersion || loading}
                className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-70"
              >
                {rollingBack ? 'Aplicando...' : 'Reverter versão'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
