import React, { useState } from 'react';
import { useAppContext } from '../App';
import { User as UserIcon, Lock, Phone, ArrowRight, X, Mail, CheckCircle } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAppContext();
  const [isClient, setIsClient] = useState(true);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoverySuccess, setRecoverySuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simulate API delay
    setTimeout(() => {
      if (phone.length < 8) {
        setError('Telefone inválido');
        setIsLoading(false);
        return;
      }
      if (!isClient && password !== 'admin123') {
        setError('Senha incorreta (Dica: admin123)');
        setIsLoading(false);
        return;
      }

      login(phone, isClient ? 'CLIENT' : 'ADMIN');
      setIsLoading(false);
    }, 800);
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        
        {/* Header Toggle */}
        <div className="flex text-sm font-medium border-b">
          <button 
            onClick={() => setIsClient(true)}
            className={`flex-1 py-4 text-center transition-colors ${isClient ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
          >
            <div className="flex items-center justify-center gap-2">
              <UserIcon size={18} />
              <span>Sou Cliente</span>
            </div>
          </button>
          <button 
            onClick={() => setIsClient(false)}
            className={`flex-1 py-4 text-center transition-colors ${!isClient ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
          >
            <div className="flex items-center justify-center gap-2">
              <Lock size={18} />
              <span>Administrador</span>
            </div>
          </button>
        </div>

        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800">Bem-vindo ao AgendeFácil</h1>
            <p className="text-gray-500 mt-2">
              {isClient ? 'Acesse seu histórico e agende serviços.' : 'Gerencie sua unidade e equipe.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">Celular</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="tel"
                  placeholder="(00) 00000-0000"
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
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
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
              className={`w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg text-white font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed
                ${isClient ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'}
              `}
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
                    <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
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
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-gray-600"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isRecovering}
                    className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg text-white font-medium bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
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