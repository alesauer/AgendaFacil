import React, { useState } from 'react';
import { useAppContext } from '../App';
import { User, Lock, Phone, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAppContext();
  const [isClient, setIsClient] = useState(true);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
              <User size={18} />
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
    </div>
  );
};