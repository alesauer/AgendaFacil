import React, { useEffect, useState } from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import { Onboarding } from './Onboarding';

/**
 * LeadOnboarding - Componente que encadeia lead → autenticação → onboarding
 * Usado quando lead clica no link do WhatsApp
 * 
 * URL: /#/lead-onboarding?lead_id=UUID
 */
export const LeadOnboarding: React.FC = () => {
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get('lead_id');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leadData, setLeadData] = useState<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const fetchLead = async () => {
      try {
        if (!leadId) {
          setError('lead_id não fornecido na URL');
          setLoading(false);
          return;
        }

        // Buscar dados do lead
        const response = await fetch(`/api/leads/${leadId}`);
        const json = await response.json();

        if (!response.ok || !json.success) {
          setError(json.error || 'Lead não encontrado');
          setLoading(false);
          return;
        }

        const lead = json.data;

        // Registrar clique no link
        await fetch(`/api/leads/${leadId}/track-click`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }).catch(err => console.warn('Erro ao rastrear clique:', err));

        // Criar sessão de lead temporária para onboarding
        // Salvar no localStorage para o Onboarding.tsx usar
        localStorage.setItem('lead_mode', 'true');
        localStorage.setItem('lead_id', leadId);
        localStorage.setItem('lead_name', lead.name);
        localStorage.setItem('lead_whatsapp', lead.whatsapp);
        localStorage.setItem('lead_created_at', lead.created_at);

        // Limpar dados obsoletos de onboarding anterior
        const tenantSlug = 'demo'; // leads sempre usam tenant 'demo'
        localStorage.setItem('tenant_slug', tenantSlug);
        localStorage.removeItem(`onboarding_completed:${tenantSlug}`);
        localStorage.removeItem(`onboarding_completed_at:${tenantSlug}`);
        localStorage.removeItem('manual_onboarding_request');

        setLeadData(lead);
        setReady(true);
        setLoading(false);
      } catch (err) {
        console.error('Erro ao carregar lead:', err);
        setError('Erro ao carregar dados do lead');
        setLoading(false);
      }
    };

    fetchLead();
  }, [leadId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
          <p className="text-gray-600">Carregando seu onboarding...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold text-red-600 mb-4">⚠️ Erro</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <p className="text-sm text-gray-500 mb-4">
            Verifique o link enviado no WhatsApp e tente novamente.
          </p>
          <a
            href="/#/login"
            className="inline-block bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
          >
            Voltar para Login
          </a>
        </div>
      </div>
    );
  }

  if (!ready || !leadData) {
    return <Navigate to="/login" />;
  }

  // Renderizar onboarding em modo lead
  return <Onboarding isLeadMode leadsData={leadData} />;
};
