import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Store, Users, Scissors, Clock, MessageSquare, 
  CheckCircle, ChevronRight, ChevronLeft, Plus, 
  Trash2, Camera, MapPin, Phone, Zap, Lock
} from 'lucide-react';

// --- Types ---

interface Professional {
  name: string;
  role: string;
  phone: string;
}

interface Service {
  name: string;
  category: string;
  price: string;
  duration: string;
}

interface BusinessHour {
  day: string;
  open: boolean;
  start: string;
  end: string;
}

// --- Components ---

const StepIndicator = ({ currentStep, totalSteps }: { currentStep: number, totalSteps: number }) => {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <React.Fragment key={i}>
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${
              i <= currentStep ? 'bg-blue-600 w-12' : 'bg-gray-200 w-4'
            }`}
          />
        </React.Fragment>
      ))}
    </div>
  );
};

export const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const finishOnboarding = () => {
    localStorage.setItem('onboarding_completed', 'true');
    localStorage.setItem('onboarding_completed_at', new Date().toISOString());
    localStorage.removeItem('manual_onboarding_request');
    navigate('/admin', { replace: true });
  };
  
  // Form States
  const [barberData, setBarberData] = useState({
    name: '',
    phone: '',
    city: '',
    logo: null as string | null
  });

  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [newPro, setNewPro] = useState<Professional>({ name: '', role: '', phone: '' });

  const [services, setServices] = useState<Service[]>([]);
  const [newService, setNewService] = useState<Service>({ name: '', category: 'Cabelo', price: '', duration: '30' });

  const [hours, setHours] = useState<BusinessHour[]>([
    { day: 'Segunda', open: true, start: '09:00', end: '18:00' },
    { day: 'Terça', open: true, start: '09:00', end: '18:00' },
    { day: 'Quarta', open: true, start: '09:00', end: '18:00' },
    { day: 'Quinta', open: true, start: '09:00', end: '18:00' },
    { day: 'Sexta', open: true, start: '09:00', end: '18:00' },
    { day: 'Sábado', open: true, start: '09:00', end: '14:00' },
    { day: 'Domingo', open: false, start: '00:00', end: '00:00' },
  ]);

  const [isWhatsAppConnected, setIsWhatsAppConnected] = useState(false);

  // Handlers
  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const addProfessional = () => {
    if (newPro.name) {
      setProfessionals([...professionals, newPro]);
      setNewPro({ name: '', role: '', phone: '' });
    }
  };

  const removeProfessional = (index: number) => {
    setProfessionals(professionals.filter((_, i) => i !== index));
  };

  const addService = () => {
    if (newService.name && newService.price) {
      setServices([...services, newService]);
      setNewService({ name: '', category: 'Cabelo', price: '', duration: '30' });
    }
  };

  const removeService = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const toggleDay = (index: number) => {
    const newHours = [...hours];
    newHours[index].open = !newHours[index].open;
    setHours(newHours);
  };

  const updateHour = (index: number, field: 'start' | 'end', value: string) => {
    const newHours = [...hours];
    (newHours[index] as any)[field] = value;
    setHours(newHours);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBarberData({ ...barberData, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  // Render Steps
  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">Dados da Barbearia</h2>
              <p className="text-gray-500">Comece configurando as informações básicas do seu negócio.</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-6">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 overflow-hidden">
                    {barberData.logo ? (
                      <img src={barberData.logo} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Camera size={32} />
                    )}
                  </div>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-1.5 rounded-lg shadow-lg">
                    <Plus size={14} />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">Logo da Barbearia</p>
                  <p className="text-xs text-gray-500">Recomendado: 512x512px (PNG ou JPG)</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">Nome da Barbearia</label>
                  <div className="relative">
                    <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="Ex: Barber Shop Central"
                      className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      value={barberData.name}
                      onChange={e => setBarberData({...barberData, name: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-gray-700">Telefone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="tel" 
                        placeholder="(00) 00000-0000"
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        value={barberData.phone}
                        onChange={e => setBarberData({...barberData, phone: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-gray-700">Cidade</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="text" 
                        placeholder="Ex: São Paulo"
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        value={barberData.city}
                        onChange={e => setBarberData({...barberData, city: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        );
      case 1:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">Profissionais</h2>
              <p className="text-gray-500">Quem são os barbeiros que atendem na sua unidade?</p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input 
                    type="text" 
                    placeholder="Nome"
                    className="p-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={newPro.name}
                    onChange={e => setNewPro({...newPro, name: e.target.value})}
                  />
                  <input 
                    type="text" 
                    placeholder="Cargo (Ex: Barbeiro Sênior)"
                    className="p-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={newPro.role}
                    onChange={e => setNewPro({...newPro, role: e.target.value})}
                  />
                  <button 
                    onClick={addProfessional}
                    className="bg-blue-600 text-white p-3 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={18} /> Adicionar
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {professionals.map((pro, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                        {pro.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800 text-sm">{pro.name}</p>
                        <p className="text-xs text-gray-500">{pro.role}</p>
                      </div>
                    </div>
                    <button onClick={() => removeProfessional(i)} className="text-gray-400 hover:text-red-500 p-2">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
                {professionals.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-2xl">
                    <Users className="mx-auto text-gray-300 mb-2" size={32} />
                    <p className="text-sm text-gray-400">Nenhum profissional adicionado.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        );
      case 2:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">Serviços</h2>
              <p className="text-gray-500">Cadastre os serviços que você oferece aos seus clientes.</p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input 
                    type="text" 
                    placeholder="Nome do Serviço"
                    className="p-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={newService.name}
                    onChange={e => setNewService({...newService, name: e.target.value})}
                  />
                  <select 
                    className="p-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={newService.category}
                    onChange={e => setNewService({...newService, category: e.target.value})}
                  >
                    <option value="Cabelo">Cabelo</option>
                    <option value="Barba">Barba</option>
                    <option value="Combo">Combo</option>
                    <option value="Estética">Estética</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input 
                    type="number" 
                    placeholder="Preço (R$)"
                    className="p-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={newService.price}
                    onChange={e => setNewService({...newService, price: e.target.value})}
                  />
                  <select 
                    className="p-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={newService.duration}
                    onChange={e => setNewService({...newService, duration: e.target.value})}
                  >
                    <option value="15">15 min</option>
                    <option value="30">30 min</option>
                    <option value="45">45 min</option>
                    <option value="60">60 min</option>
                  </select>
                  <button 
                    onClick={addService}
                    className="bg-blue-600 text-white p-3 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={18} /> Adicionar
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {services.map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                        <Scissors size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-800 text-sm">{s.name}</p>
                        <p className="text-xs text-gray-500">{s.category} • {s.duration} min</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-blue-600 text-sm">R$ {parseFloat(s.price).toFixed(2)}</span>
                      <button onClick={() => removeService(i)} className="text-gray-400 hover:text-red-500 p-2">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
                {services.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-2xl">
                    <Scissors className="mx-auto text-gray-300 mb-2" size={32} />
                    <p className="text-sm text-gray-400">Nenhum serviço adicionado.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        );
      case 3:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">Horário de Funcionamento</h2>
              <p className="text-gray-500">Defina os horários em que sua barbearia estará aberta.</p>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {hours.map((h, i) => (
                <div key={i} className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${h.open ? 'bg-white border-blue-100 shadow-sm' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => toggleDay(i)}
                      className={`w-12 h-6 rounded-full relative transition-colors ${h.open ? 'bg-blue-600' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${h.open ? 'left-7' : 'left-1'}`} />
                    </button>
                    <span className="font-bold text-gray-800 text-sm w-24">{h.day}</span>
                  </div>
                  
                  {h.open ? (
                    <div className="flex items-center gap-2">
                      <input 
                        type="time" 
                        className="p-2 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                        value={h.start}
                        onChange={e => updateHour(i, 'start', e.target.value)}
                      />
                      <span className="text-gray-400 text-xs">até</span>
                      <input 
                        type="time" 
                        className="p-2 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                        value={h.end}
                        onChange={e => updateHour(i, 'end', e.target.value)}
                      />
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-gray-400 uppercase">Fechado</span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        );
      case 4:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">Integração WhatsApp</h2>
              <p className="text-gray-500">Conecte seu WhatsApp para enviar lembretes automáticos aos clientes.</p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm text-center space-y-6">
              {!isWhatsAppConnected ? (
                <>
                  <div className="w-48 h-48 bg-gray-50 mx-auto rounded-2xl flex items-center justify-center border-2 border-dashed border-gray-200 relative group">
                    <div className="bg-white p-2 rounded-xl shadow-md">
                      <div className="w-32 h-32 bg-black pattern-dots opacity-20"></div>
                    </div>
                    <div className="absolute inset-0 bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button 
                        onClick={() => setIsWhatsAppConnected(true)}
                        className="bg-green-600 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-lg"
                      >
                        Simular Conexão
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="font-bold text-gray-800">Escaneie o QR Code</p>
                    <p className="text-sm text-gray-500 max-w-xs mx-auto">Abra o WhatsApp no seu celular, vá em Aparelhos Conectados e aponte a câmera.</p>
                  </div>
                  <button 
                    onClick={() => setIsWhatsAppConnected(true)}
                    className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition-all shadow-lg shadow-green-100"
                  >
                    <MessageSquare size={20} /> Conectar WhatsApp
                  </button>
                </>
              ) : (
                <div className="py-10 space-y-4 animate-in zoom-in">
                  <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle size={40} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">WhatsApp Conectado!</h3>
                  <p className="text-sm text-gray-500">Seu sistema já está pronto para enviar notificações.</p>
                  <button 
                    onClick={() => setIsWhatsAppConnected(false)}
                    className="text-xs text-red-500 font-bold hover:underline"
                  >
                    Desconectar aparelho
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        );
      case 5:
        return (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-8 py-10"
          >
            <div className="relative inline-block">
              <div className="w-24 h-24 bg-green-100 text-green-600 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-green-100">
                <CheckCircle size={48} />
              </div>
              <motion.div 
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute -top-2 -right-2 bg-blue-600 text-white p-2 rounded-full shadow-lg"
              >
                <Zap size={16} />
              </motion.div>
            </div>

            <div className="space-y-3">
              <h2 className="text-4xl font-black text-gray-900">🎉 Sua barbearia está pronta!</h2>
              <p className="text-gray-500 text-lg max-w-md mx-auto">
                Configuramos tudo para você começar a receber agendamentos hoje mesmo.
              </p>
            </div>

            <div className="max-w-xs mx-auto space-y-4">
              <button 
                onClick={finishOnboarding}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2"
              >
                Ir para o painel <ChevronRight size={20} />
              </button>
              <p className="text-xs text-gray-400">Você poderá alterar essas configurações a qualquer momento no painel administrativo.</p>
            </div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        {step < 5 && (
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
                <Zap size={24} />
              </div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight">AgendeFácil</h1>
            </div>
            <button 
              onClick={() => navigate('/admin')}
              className="text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
            >
              Pular configuração
            </button>
          </div>
        )}

        {/* Wizard Card */}
        <div className={`bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200/50 overflow-hidden transition-all duration-500 ${step === 5 ? 'p-12' : 'p-8 md:p-12'}`}>
          {step < 5 && (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <StepIndicator currentStep={step} totalSteps={5} />
              <span className="text-xs font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">
                Passo {step + 1} de 5
              </span>
            </div>
          )}

          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>

          {/* Footer Actions */}
          {step < 5 && (
            <div className="mt-12 flex items-center justify-between pt-8 border-t border-gray-100">
              <button 
                onClick={prevStep}
                disabled={step === 0}
                className={`flex items-center gap-2 font-bold text-sm transition-all ${
                  step === 0 ? 'opacity-0 pointer-events-none' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <ChevronLeft size={18} /> Voltar
              </button>
              
              <button 
                onClick={nextStep}
                className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-black transition-all shadow-xl shadow-gray-200"
              >
                {step === 4 ? 'Finalizar' : 'Próximo'} <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Trust Badge */}
        {step < 5 && (
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-400 flex items-center justify-center gap-2">
              <Lock size={12} /> Configuração segura e criptografada
            </p>
          </div>
        )}
      </div>

      <style>{`
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
        .pattern-dots {
          background-image: radial-gradient(#000 1px, transparent 1px);
          background-size: 10px 10px;
        }
      `}</style>
    </div>
  );
};
