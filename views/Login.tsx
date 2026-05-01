import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppContext } from '../App';
import { User as UserIcon, Lock, Phone, ArrowRight, X, Mail, CheckCircle, AlertTriangle, ExternalLink, MessageCircle } from 'lucide-react';
import { forgotPasswordApi, resetPasswordApi } from '../services/authApi';

type SuspensionDetails = {
  tenant_name?: string;
  whatsapp_url?: string;
  portal_url?: string;
  billing_email?: string;
};

export const Login: React.FC = () => {
  const location = useLocation();
  const { login, brandIdentity } = useAppContext();
  const [isClient, setIsClient] = useState(true);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoverySuccess, setRecoverySuccess] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState('');
  const [isSuspendedModalOpen, setIsSuspendedModalOpen] = useState(false);
  const [suspensionDetails, setSuspensionDetails] = useState<SuspensionDetails | null>(null);

  const recoveryToken = useMemo(() => {
    const query = new URLSearchParams(location.search);
    return (query.get('recovery_token') || '').trim();
  }, [location.search]);

  const clearRecoveryParams = () => {
    window.location.hash = '#/login';
  };

  useEffect(() => {
    if (recoveryToken) {
      setIsResetModalOpen(true);
      setResetPasswordError('');
      setResetPasswordSuccess(false);
      return;
    }

    setIsResetModalOpen(false);
  }, [recoveryToken]);

  const safeImageUrl = (value?: string | null, maxLength = 300000) => {
    if (!value || typeof value !== 'string') return undefined;
    if (value.length > maxLength) return undefined;
    if (value.startsWith('data:image/') || value.startsWith('http://') || value.startsWith('https://')) {
      return value;
    }
    return undefined;
  };

  const loginLogoUrl = safeImageUrl(brandIdentity.loginLogoUrl || brandIdentity.logoUrl, 300000);
  const loginBackgroundUrl = safeImageUrl(brandIdentity.loginBackgroundUrl, 3200000);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isClient && phone.length < 8) {
        setError('Telefone inválido');
        return;
      }
      if (!isClient && !phone.trim()) {
        setError('Informe seu login');
        return;
      }
      if (!isClient && !password) {
        setError('Informe sua senha');
        return;
      }

      await login(phone, isClient ? 'CLIENT' : 'ADMIN', password);
    } catch (err: any) {
      if (['TENANT_SUSPENDED', 'TENANT_PAST_DUE'].includes(String(err?.code || '').toUpperCase())) {
        setSuspensionDetails((err?.details || null) as SuspensionDetails | null);
        setIsSuspendedModalOpen(true);
        setError('');
      } else {
        setError(err?.message || 'Não foi possível entrar');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const openSuspensionAction = (target: string) => {
    window.open(target, '_blank', 'noopener,noreferrer');
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');
    setIsRecovering(true);

    try {
      const email = recoveryEmail.trim().toLowerCase();
      const result = await forgotPasswordApi({ email });
      if (!result.success) {
        setRecoveryError(('error' in result && result.error) ? result.error : 'Não foi possível iniciar a recuperação de senha.');
        return;
      }

      setIsRecovering(false);
      setRecoverySuccess(true);
      setTimeout(() => {
        setIsForgotModalOpen(false);
        setRecoverySuccess(false);
        setRecoveryEmail('');
        setRecoveryError('');
      }, 3000);
    } finally {
      setIsRecovering(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetPasswordError('');

    if (!recoveryToken) {
      setResetPasswordError('Token de recuperação inválido. Solicite um novo e-mail.');
      return;
    }

    if (newPassword.length < 6) {
      setResetPasswordError('A nova senha deve ter ao menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setResetPasswordError('As senhas não conferem.');
      return;
    }

    setIsResettingPassword(true);

    try {
      const result = await resetPasswordApi({ token: recoveryToken, new_password: newPassword });
      if (!result.success) {
        setResetPasswordError(('error' in result && result.error) ? result.error : 'Não foi possível redefinir a senha.');
        return;
      }

      setResetPasswordSuccess(true);
      setTimeout(() => {
        setNewPassword('');
        setConfirmNewPassword('');
        setResetPasswordSuccess(false);
        setIsResetModalOpen(false);
        clearRecoveryParams();
      }, 1800);
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gray-100 p-4"
      style={loginBackgroundUrl ? {
        backgroundImage: `linear-gradient(rgba(17, 24, 39, 0.55), rgba(17, 24, 39, 0.55)), url('${loginBackgroundUrl}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      } : undefined}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        
        {/* Header Toggle */}
        <div className="flex text-sm font-medium border-b">
          <button 
            onClick={() => setIsClient(true)}
            className={`flex-1 py-4 text-center transition-colors ${isClient ? 'text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
            style={isClient ? { backgroundColor: brandIdentity.primaryColor || '#2563eb' } : undefined}
          >
            <div className="flex items-center justify-center gap-2">
              <UserIcon size={18} />
              <span>Sou Cliente</span>
            </div>
          </button>
          <button 
            onClick={() => setIsClient(false)}
            className={`flex-1 py-4 text-center transition-colors ${!isClient ? 'text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
            style={!isClient ? { backgroundColor: brandIdentity.primaryColor || '#2563eb' } : undefined}
          >
            <div className="flex items-center justify-center gap-2">
              <Lock size={18} />
              <span>Administrador / Equipe</span>
            </div>
          </button>
        </div>

        <div className="p-8">
          <div className="text-center mb-8">
            {loginLogoUrl && (
              <img
                src={loginLogoUrl}
                alt="Logo da empresa"
                className="h-14 object-contain mx-auto mb-4"
                referrerPolicy="no-referrer"
              />
            )}
            <h1 className="text-2xl font-bold text-gray-800">Bem-vindo ao {brandIdentity.name || 'AgendeFácil'}</h1>
            <p className="text-gray-500 mt-2">
              {isClient ? 'Acesse seu histórico e agende serviços.' : 'Gerencie sua unidade e equipe.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">{isClient ? 'Celular' : 'Login'}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  {isClient ? <Phone className="h-5 w-5 text-gray-400" /> : <UserIcon className="h-5 w-5 text-gray-400" />}
                </div>
                <input
                  type={isClient ? 'tel' : 'text'}
                  placeholder={isClient ? '(00) 00000-0000' : 'Telefone ou e-mail master'}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-600"
                  required
                />
              </div>
            </div>

            {!isClient && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Senha</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    placeholder="Sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-600"
                    required
                  />
                </div>
                <div className="flex justify-end mt-2">
                  <button 
                    type="button"
                    onClick={() => setIsForgotModalOpen(true)}
                    className="text-xs font-medium transition-colors"
                    style={{ color: brandIdentity.primaryColor || '#2563eb' }}
                  >
                    Esqueci minha senha
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg text-white font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
              style={{ backgroundColor: brandIdentity.primaryColor || '#2563eb' }}
            >
              {isLoading ? 'Processando...' : (
                <span className="flex items-center gap-2">
                  Entrar <ArrowRight size={18} />
                </span>
              )}
            </button>
          </form>
        </div>
        
        <div className="px-8 py-4 bg-gray-50 border-t text-center text-xs text-gray-500">
          Ao entrar, você concorda com nossos Termos de Uso e Política de Privacidade.
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-bold text-gray-800">Recuperar Senha</h3>
              <button 
                onClick={() => {
                  setIsForgotModalOpen(false);
                  setRecoveryError('');
                }} 
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8">
              {recoverySuccess ? (
                <div className="text-center space-y-4 py-4 animate-in zoom-in">
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle size={32} />
                  </div>
                  <h4 className="text-lg font-bold text-gray-800">E-mail Enviado!</h4>
                  <p className="text-sm text-gray-500">
                    Enviamos as instruções de recuperação para <strong>{recoveryEmail}</strong>. Verifique sua caixa de entrada.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleRecoverySubmit} className="space-y-6">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: brandIdentity.secondaryColor || '#eff6ff', color: brandIdentity.primaryColor || '#2563eb' }}>
                      <Mail size={32} />
                    </div>
                    <p className="text-sm text-gray-500">
                      Digite seu e-mail cadastrado para receber um link de redefinição de senha.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">E-mail</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="email"
                        placeholder="seu@email.com"
                        value={recoveryEmail}
                        onChange={(e) => setRecoveryEmail(e.target.value)}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-600"
                        required
                      />
                    </div>
                  </div>

                  {recoveryError && (
                    <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">
                      {recoveryError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isRecovering}
                    className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg text-white font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                    style={{ backgroundColor: brandIdentity.primaryColor || '#2563eb' }}
                  >
                    {isRecovering ? 'Processando...' : 'Enviar Link de Recuperação'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {isResetModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-bold text-gray-800">Definir Nova Senha</h3>
              <button
                onClick={() => {
                  setIsResetModalOpen(false);
                  setResetPasswordError('');
                  setNewPassword('');
                  setConfirmNewPassword('');
                  clearRecoveryParams();
                }}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8">
              {resetPasswordSuccess ? (
                <div className="text-center space-y-4 py-4 animate-in zoom-in">
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle size={32} />
                  </div>
                  <h4 className="text-lg font-bold text-gray-800">Senha atualizada!</h4>
                  <p className="text-sm text-gray-500">Agora você já pode entrar com sua nova senha.</p>
                </div>
              ) : (
                <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                  <p className="text-sm text-gray-500">Informe sua nova senha para concluir a recuperação de acesso.</p>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">Nova senha</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="password"
                        placeholder="Mínimo 6 caracteres"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-600"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">Confirmar nova senha</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="password"
                        placeholder="Repita a nova senha"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-600"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  {resetPasswordError && (
                    <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">
                      {resetPasswordError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isResettingPassword}
                    className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg text-white font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                    style={{ backgroundColor: brandIdentity.primaryColor || '#2563eb' }}
                  >
                    {isResettingPassword ? 'Processando...' : 'Salvar nova senha'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {isSuspendedModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b flex justify-between items-center bg-red-50">
              <div className="flex items-center gap-3 text-red-700">
                <AlertTriangle size={22} />
                <h3 className="text-xl font-bold">Barbearia suspensa</h3>
              </div>
              <button
                onClick={() => setIsSuspendedModalOpen(false)}
                className="p-2 hover:bg-red-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-700">
                O acesso da unidade <strong>{suspensionDetails?.tenant_name || brandIdentity.name || 'selecionada'}</strong> foi suspenso temporariamente.
              </p>
              <p className="text-sm text-gray-500">
                Regularize a assinatura para liberar o login da equipe e voltar a usar o sistema normalmente.
              </p>

              <div className="flex flex-col gap-3 pt-2">
                {suspensionDetails?.portal_url && (
                  <button
                    type="button"
                    onClick={() => openSuspensionAction(suspensionDetails.portal_url as string)}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-white font-medium"
                    style={{ backgroundColor: brandIdentity.primaryColor || '#2563eb' }}
                  >
                    Regularizar assinatura <ExternalLink size={16} />
                  </button>
                )}

                {suspensionDetails?.whatsapp_url && (
                  <button
                    type="button"
                    onClick={() => openSuspensionAction(suspensionDetails.whatsapp_url as string)}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Falar no WhatsApp <MessageCircle size={16} />
                  </button>
                )}

                {suspensionDetails?.billing_email && (
                  <button
                    type="button"
                    onClick={() => openSuspensionAction(`mailto:${String(suspensionDetails.billing_email)}?subject=Regulariza%C3%A7%C3%A3o%20de%20assinatura`)}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Enviar e-mail financeiro <Mail size={16} />
                  </button>
                )}

                {!suspensionDetails?.portal_url && !suspensionDetails?.whatsapp_url && !suspensionDetails?.billing_email && (
                  <div className="bg-amber-50 border border-amber-100 text-amber-700 text-sm rounded-lg p-3">
                    Nenhum canal de regularização foi configurado. Contate o suporte da plataforma.
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsSuspendedModalOpen(false)}
                  className="w-full py-3 px-4 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};