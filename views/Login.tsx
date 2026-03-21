import React, { useState } from 'react';
import { useAppContext } from '../App';
import { User as UserIcon, Lock, Phone, ArrowRight, X, Mail, CheckCircle } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, brandIdentity } = useAppContext();
  const [isClient, setIsClient] = useState(true);
  const [backofficeMode, setBackofficeMode] = useState<'TEAM' | 'MASTER'>('TEAM');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoverySuccess, setRecoverySuccess] = useState(false);

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

      await login(phone, isClient ? 'CLIENT' : (backofficeMode === 'MASTER' ? 'MASTER' : 'ADMIN'), password);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível entrar');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoverySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsRecovering(true);
    // Simulate API call
    setTimeout(() => {
      setIsRecovering(false);
      setRecoverySuccess(true);
      setTimeout(() => {
        setIsForgotModalOpen(false);
        setRecoverySuccess(false);
        setRecoveryEmail('');
      }, 3000);
    }, 1500);
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
            onClick={() => {
              setIsClient(false);
              setBackofficeMode('TEAM');
            }}
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
            {!isClient && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setBackofficeMode('TEAM')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${backofficeMode === 'TEAM' ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  style={backofficeMode === 'TEAM' ? { backgroundColor: brandIdentity.primaryColor || '#2563eb' } : undefined}
                >
                  Admin / Equipe
                </button>
                <button
                  type="button"
                  onClick={() => setBackofficeMode('MASTER')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${backofficeMode === 'MASTER' ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  style={backofficeMode === 'MASTER' ? { backgroundColor: brandIdentity.primaryColor || '#2563eb' } : undefined}
                >
                  Master SaaS
                </button>
              </div>
            )}

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
                onClick={() => setIsForgotModalOpen(false)} 
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
    </div>
  );
};