import React, { useState, useEffect } from 'react';
import { useAppContext } from '../App';
import { Service, Professional, Appointment } from '../types';
import { createClientePublicApi } from '../services/clientesApi';
import { listDisponibilidadePublicApi } from '../services/agendamentosApi';
import { 
  Calendar, Clock, User as UserIcon, ChevronLeft, CreditCard, CheckCircle, 
  Search, Scissors, CalendarDays, LogOut, Bell, X, 
  Sparkles, Smile, Zap, Heart
} from 'lucide-react';

// --- Sub-components for Wizard ---

const ServiceIcon = ({ name, className }: { name?: string, className?: string }) => {
  switch (name) {
    case 'Scissors': return <Scissors className={className} />;
    case 'User': return <UserIcon className={className} />;
    case 'Sparkles': return <Sparkles className={className} />;
    case 'Smile': return <Smile className={className} />;
    case 'Zap': return <Zap className={className} />;
    case 'Heart': return <Heart className={className} />;
    default: return <Scissors className={className} />;
  }
};

const ServiceList = ({ onSelect }: { onSelect: (s: Service) => void }) => {
  const { services, categories: contextCategories } = useAppContext();
  const [filter, setFilter] = useState('');
  const [category, setCategory] = useState<string>('Todos');

  const categories = ['Todos', ...contextCategories.map(c => c.name)];

  const filteredServices = services.filter(s => {
    const matchesText = s.title.toLowerCase().includes(filter.toLowerCase());
    const matchesCat = category === 'Todos' || s.category === category;
    return matchesText && matchesCat;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="sticky top-0 bg-gray-50/95 backdrop-blur-sm pt-2 pb-4 z-10 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar serviços..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 bg-white transition-all"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                category === cat 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredServices.map(service => (
          <div 
            key={service.id} 
            className="bg-white p-5 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer border border-gray-100 hover:border-blue-200 group active:scale-[0.98]" 
            onClick={() => onSelect(service)}
          >
            <div className="flex gap-5 items-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors flex-shrink-0">
                <ServiceIcon name={service.iconName} className="w-8 h-8" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-bold text-gray-900 truncate group-hover:text-blue-700 transition-colors">{service.title}</h3>
                  {service.isPromo && (
                    <span className="bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md flex-shrink-0">
                      Oferta
                    </span>
                  )}
                </div>
                <p className="text-gray-500 text-sm mt-1 line-clamp-1">{service.description}</p>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-gray-400 flex items-center gap-1">
                      <Clock size={14} /> {service.durationMinutes} min
                    </span>
                  </div>
                  <div className="text-right">
                    {service.isPromo && service.promoPrice ? (
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] text-gray-400 line-through">R$ {service.price.toFixed(2)}</span>
                        <span className="font-extrabold text-blue-600 text-lg">R$ {service.promoPrice.toFixed(2)}</span>
                      </div>
                    ) : (
                      <span className="font-extrabold text-blue-600 text-lg">R$ {service.price.toFixed(2)}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        {filteredServices.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
              <Search size={24} />
            </div>
            <p className="text-gray-500 font-medium">Nenhum serviço encontrado.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const ProfessionalSelect = ({ service, onSelect }: { service: Service, onSelect: (p: Professional) => void }) => {
  const { professionals } = useAppContext();

  const availablePros = professionals.filter(professional => {
    if (!professional.specialties || professional.specialties.length === 0) {
      return true;
    }
    return professional.specialties.includes(service.id);
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-lg font-semibold text-gray-800">Escolha o Profissional</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {availablePros.map(pro => (
          <button key={pro.id} onClick={() => onSelect(pro)} className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm hover:ring-2 hover:ring-blue-500 transition-all text-left group">
            <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <UserIcon size={28} />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{pro.name}</p>
              <p className="text-sm text-gray-500">{pro.role}</p>
            </div>
          </button>
        ))}
      </div>
      {availablePros.length === 0 && (
        <div className="p-4 bg-gray-100 rounded-xl text-center text-gray-500 text-sm">
          Nenhum profissional disponível para este serviço no momento.
        </div>
      )}
    </div>
  );
};

const DateTimeSelect = ({ professionalId, serviceDurationMinutes, onSelect }: { professionalId: string, serviceDurationMinutes: number, onSelect: (date: string, time: string) => void }) => {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  
  // Use today as default min date
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!selectedDate || !professionalId || !serviceDurationMinutes) {
      setAvailableTimes([]);
      return;
    }

    let cancelled = false;
    const loadTimes = async () => {
      setLoadingTimes(true);
      const result = await listDisponibilidadePublicApi({
        profissional_id: professionalId,
        data: selectedDate,
        duracao_min: serviceDurationMinutes,
      });

      if (cancelled) {
        return;
      }

      if (!result.success) {
        setAvailableTimes([]);
        setLoadingTimes(false);
        return;
      }

      setAvailableTimes(result.data.map(slot => slot.hora_inicio));
      setLoadingTimes(false);
    };

    void loadTimes();

    return () => {
      cancelled = true;
    };
  }, [selectedDate, professionalId, serviceDurationMinutes]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Data do Agendamento</label>
        <input 
          type="date" 
          min={today}
          value={selectedDate}
          onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime(''); }}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      {selectedDate && (
        <div>
           <label className="block text-sm font-medium text-gray-700 mb-2">Horários Disponíveis</label>
           {loadingTimes ? (
             <div className="p-4 bg-gray-100 rounded-xl text-center text-gray-500 text-sm">
               Carregando horários...
             </div>
           ) : availableTimes.length > 0 ? (
             <div className="grid grid-cols-4 gap-2">
               {availableTimes.map(time => (
                 <button
                  key={time}
                  onClick={() => setSelectedTime(time)}
                  className={`py-2 px-1 rounded-lg text-sm font-medium transition-colors ${
                    selectedTime === time 
                      ? 'bg-blue-600 text-white shadow-md transform scale-105' 
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                 >
                   {time}
                 </button>
               ))}
             </div>
           ) : (
             <div className="p-4 bg-gray-100 rounded-xl text-center text-gray-500 text-sm">
               Não há horários disponíveis para este dia.
             </div>
           )}
        </div>
      )}

      <button 
        disabled={!selectedDate || !selectedTime}
        onClick={() => onSelect(selectedDate, selectedTime)}
        className="w-full mt-4 bg-blue-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
      >
        Continuar
      </button>
    </div>
  );
};

const PaymentStep = ({ booking, onConfirm, onCancel }: { booking: Partial<Appointment> & { service: Service }, onConfirm: (method: 'PIX' | 'CREDIT_CARD') => void, onCancel: () => void }) => {
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [method, setMethod] = useState<'PIX' | 'CREDIT_CARD'>('PIX');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (timeLeft === 0) {
      onCancel();
      return;
    }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, onCancel]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handlePay = () => {
    setProcessing(true);
    setTimeout(() => {
      onConfirm(method);
    }, 2000); // Simulate processing
  };

  const finalPrice = booking.service.isPromo && booking.service.promoPrice ? booking.service.promoPrice : booking.service.price;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg flex items-center justify-between text-yellow-800">
        <span className="text-sm font-medium">Tempo para concluir reserva:</span>
        <span className="font-mono font-bold text-lg">{formatTime(timeLeft)}</span>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
        <h3 className="font-semibold text-gray-900 border-b pb-2">Resumo do Pedido</h3>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Serviço:</span>
          <span className="font-medium text-gray-900">{booking.service.title}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Data/Hora:</span>
          <span className="font-medium text-gray-900">{booking.date?.split('-').reverse().join('/')} às {booking.time}</span>
        </div>
        <div className="flex justify-between text-lg font-bold pt-2 border-t">
          <span>Total:</span>
          <span className="text-blue-600">R$ {finalPrice.toFixed(2)}</span>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Forma de Pagamento</h3>
        <div className="flex gap-4 mb-4">
          <button 
            onClick={() => setMethod('PIX')}
            className={`flex-1 py-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-colors ${method === 'PIX' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 hover:bg-gray-50'}`}
          >
            <div className="font-bold">PIX</div>
            <div className="text-xs">Aprovação imediata</div>
          </button>
          <button 
            onClick={() => setMethod('CREDIT_CARD')}
            className={`flex-1 py-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-colors ${method === 'CREDIT_CARD' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-50'}`}
          >
            <CreditCard size={20} />
            <div className="text-xs">Cartão de Crédito</div>
          </button>
        </div>

        {method === 'PIX' && (
          <div className="bg-gray-100 p-4 rounded-lg text-center space-y-3">
             <div className="w-40 h-40 bg-white mx-auto flex items-center justify-center border rounded">
                {/* Mock QR */}
                <div className="bg-black w-32 h-32 pattern-dots"></div>
             </div>
             <p className="text-xs text-gray-500">Escaneie o QR Code ou copie a chave abaixo</p>
             <button className="text-blue-600 text-sm font-medium hover:underline">Copiar Código Pix</button>
          </div>
        )}

        {method === 'CREDIT_CARD' && (
           <div className="space-y-3">
             <input type="text" placeholder="Número do Cartão" className="w-full p-3 border rounded-lg" />
             <div className="flex gap-3">
               <input type="text" placeholder="MM/AA" className="w-1/2 p-3 border rounded-lg" />
               <input type="text" placeholder="CVV" className="w-1/2 p-3 border rounded-lg" />
             </div>
             <input type="text" placeholder="Nome no Cartão" className="w-full p-3 border rounded-lg" />
           </div>
        )}
      </div>

      <button 
        onClick={handlePay}
        disabled={processing}
        className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg transform transition-transform active:scale-95 flex justify-center items-center gap-2"
      >
        {processing ? 'Processando...' : 'Confirmar Pagamento'}
      </button>
    </div>
  );
};

const PaymentChoiceStep = ({ onSelect }: { onSelect: (choice: 'NOW' | 'LATER') => void }) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-xl font-bold text-gray-800 text-center">Como deseja pagar?</h2>
      <div className="grid grid-cols-1 gap-4">
        <button 
          onClick={() => onSelect('NOW')}
          className="bg-white p-6 rounded-2xl shadow-sm border-2 border-transparent hover:border-blue-500 transition-all text-left flex items-center gap-4 group"
        >
          <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <CreditCard size={24} />
          </div>
          <div>
            <p className="font-bold text-gray-900">Pagar Agora</p>
            <p className="text-sm text-gray-500">Pague via PIX ou Cartão para agilizar seu atendimento.</p>
          </div>
        </button>

        <button 
          onClick={() => onSelect('LATER')}
          className="bg-white p-6 rounded-2xl shadow-sm border-2 border-transparent hover:border-green-500 transition-all text-left flex items-center gap-4 group"
        >
          <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
            <Zap size={24} />
          </div>
          <div>
            <p className="font-bold text-gray-900">Pagar no Estabelecimento</p>
            <p className="text-sm text-gray-500">Reserve seu horário e pague diretamente na unidade.</p>
          </div>
        </button>
      </div>
    </div>
  );
};

// --- Main Client View ---

export const ClientPortal: React.FC = () => {
  const { user, login, logout, addAppointment, updateAppointment, transitionAppointmentStatus, appointments, services } = useAppContext();
  const [view, setView] = useState<'HOME' | 'BOOKING' | 'HISTORY'>('HOME');
  const [step, setStep] = useState(0); // 0: Service, 1: Pro, 2: Date, 3: Choice, 4: Payment, 5: Success
  const [bookingData, setBookingData] = useState<any>({});
  const [showNotifications, setShowNotifications] = useState(false);
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerBirthDate, setRegisterBirthDate] = useState('');
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [rescheduleAppointmentId, setRescheduleAppointmentId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleSlots, setRescheduleSlots] = useState<string[]>([]);
  const [loadingRescheduleSlots, setLoadingRescheduleSlots] = useState(false);
  const [savingReschedule, setSavingReschedule] = useState(false);

  const needsRegistration = user?.id === '__new_client__';

  const handleClientRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');

    if (!registerName.trim()) {
      setRegisterError('Informe seu nome.');
      return;
    }

    setRegistering(true);
    const result = await createClientePublicApi({
      nome: registerName.trim(),
      telefone: user?.phone || '',
      email: registerEmail.trim() || null,
      data_nascimento: registerBirthDate || null,
    });

    if (!result.success) {
      setRegistering(false);
      setRegisterError(('error' in result && result.error) ? result.error : 'Não foi possível concluir seu cadastro.');
      return;
    }

    await login(user?.phone || '', 'CLIENT');
    setRegistering(false);
  };

  const startReschedule = (appointmentId: string) => {
    setHistoryError('');
    setRescheduleAppointmentId(appointmentId);
    setRescheduleDate('');
    setRescheduleTime('');
    setRescheduleSlots([]);
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    setHistoryError('');
    const result = await transitionAppointmentStatus(appointmentId, 'CANCELLED', { reason: 'Cancelado pelo cliente' });
    if (!result.success) {
      setHistoryError(result.error || 'Não foi possível cancelar o agendamento.');
    }
  };

  const handleSaveReschedule = async (apt: Appointment) => {
    if (!rescheduleDate || !rescheduleTime) {
      setHistoryError('Selecione nova data e horário para remarcar.');
      return;
    }

    setHistoryError('');
    setSavingReschedule(true);
    const result = await updateAppointment({
      ...apt,
      date: rescheduleDate,
      time: rescheduleTime,
    });

    setSavingReschedule(false);
    if (!result.success) {
      setHistoryError(result.error || 'Não foi possível remarcar o agendamento.');
      return;
    }

    setRescheduleAppointmentId(null);
    setRescheduleDate('');
    setRescheduleTime('');
    setRescheduleSlots([]);
  };

  useEffect(() => {
    if (!rescheduleAppointmentId || !rescheduleDate) {
      setRescheduleSlots([]);
      return;
    }

    const apt = appointments.find(item => item.id === rescheduleAppointmentId);
    const service = services.find(item => item.id === apt?.serviceId);
    if (!apt || !service) {
      setRescheduleSlots([]);
      return;
    }

    let cancelled = false;
    const loadSlots = async () => {
      setLoadingRescheduleSlots(true);
      const result = await listDisponibilidadePublicApi({
        profissional_id: apt.professionalId,
        data: rescheduleDate,
        duracao_min: service.durationMinutes,
      });

      if (cancelled) {
        return;
      }

      if (!result.success) {
        setRescheduleSlots([]);
        setLoadingRescheduleSlots(false);
        return;
      }

      setRescheduleSlots(result.data.map(slot => slot.hora_inicio));
      setLoadingRescheduleSlots(false);
    };

    void loadSlots();

    return () => {
      cancelled = true;
    };
  }, [rescheduleAppointmentId, rescheduleDate, appointments, services]);

  const resetBooking = () => {
    setBookingData({});
    setStep(0);
    setView('HOME');
  };

  const handleBookingComplete = async (method?: 'PIX' | 'CREDIT_CARD', data?: any) => {
    const currentBooking = data || bookingData;
    const finalPrice = currentBooking.service.isPromo && currentBooking.service.promoPrice ? currentBooking.service.promoPrice : currentBooking.service.price;
    const newApt: Appointment = {
      id: Date.now().toString(),
      clientId: user!.id,
      serviceId: currentBooking.service.id,
      professionalId: currentBooking.professional.id,
      date: currentBooking.date,
      time: currentBooking.time,
      status: method ? 'CONFIRMED' : 'PENDING_PAYMENT',
      totalValue: finalPrice,
      paymentMethod: method,
      createdAt: new Date().toISOString()
    };
    const result = await addAppointment(newApt);
    if (!result.success) {
      setBookingError(result.error || 'Não foi possível concluir seu agendamento.');
      return;
    }
    setBookingError('');
    setStep(5);
  };

  const addToCalendar = () => {
    const { service, date, time } = bookingData;
    const [year, month, day] = date.split('-');
    const [hour, minute] = time.split(':');
    
    const startDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
    const endDate = new Date(startDate.getTime() + service.durationMinutes * 60000);
    
    const format = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, '').split('.')[0] + 'Z';
    const title = encodeURIComponent(`Agendamento: ${service.title}`);
    const details = encodeURIComponent(`Serviço: ${service.title}\nProfissional: ${bookingData.professional.name}`);
    
    const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${format(startDate)}/${format(endDate)}&details=${details}`;
    window.open(url, '_blank');
  };

  // Render Booking Wizard
  const renderWizard = () => {
    if (step === 0) return <ServiceList onSelect={(s) => { setBookingData({ ...bookingData, service: s }); setStep(1); }} />;
    if (step === 1) return <ProfessionalSelect service={bookingData.service} onSelect={(p) => { setBookingData({ ...bookingData, professional: p }); setStep(2); }} />;
    if (step === 2) return <DateTimeSelect professionalId={bookingData.professional.id} serviceDurationMinutes={bookingData.service.durationMinutes} onSelect={(d, t) => { 
      const updatedData = { ...bookingData, date: d, time: t };
      setBookingData(updatedData); 
      void handleBookingComplete(undefined, updatedData); 
    }} />;
    if (step === 5) return (
      <div className="text-center py-10 animate-fade-in">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Agendamento Confirmado!</h2>
        <p className="text-gray-600 mb-8">Enviamos os detalhes para seu WhatsApp.</p>
        <div className="flex flex-col gap-3">
          <button onClick={addToCalendar} className="w-full py-3 bg-white border-2 border-blue-600 text-blue-600 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors">
            <Calendar size={20} /> Adicionar à Agenda
          </button>
          <button onClick={() => setView('HISTORY')} className="w-full py-3 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors">Ver Meus Agendamentos</button>
          <button onClick={resetBooking} className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">Novo Agendamento</button>
        </div>
      </div>
    );
    return null;
  };

  // Render History
  const renderHistory = () => {
    const normalizeStatus = (status?: string) => {
      if ((status || '').toUpperCase() === 'COMPLETED') return 'COMPLETED_OP';
      return (status || '').toUpperCase();
    };

    const getStatusBadgeClass = (status?: string) => {
      switch (normalizeStatus(status)) {
        case 'CONFIRMED': return 'bg-green-100 text-green-700';
        case 'PENDING_PAYMENT': return 'bg-yellow-100 text-yellow-700';
        case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700';
        case 'COMPLETED_OP': return 'bg-violet-100 text-violet-700';
        case 'COMPLETED_FIN': return 'bg-emerald-100 text-emerald-700';
        case 'REOPENED': return 'bg-orange-100 text-orange-700';
        case 'NO_SHOW': return 'bg-slate-200 text-slate-700';
        case 'CANCELLED': return 'bg-red-100 text-red-700';
        default: return 'bg-gray-100 text-gray-700';
      }
    };

    const getStatusLabel = (status?: string) => {
      switch (normalizeStatus(status)) {
        case 'CONFIRMED': return 'CONFIRMADO';
        case 'PENDING_PAYMENT': return 'PENDENTE PAGAMENTO';
        case 'IN_PROGRESS': return 'EM ATENDIMENTO';
        case 'COMPLETED_OP': return 'CONCLUÍDO (OPERACIONAL)';
        case 'COMPLETED_FIN': return 'CONCLUÍDO (FINANCEIRO)';
        case 'REOPENED': return 'REABERTO';
        case 'NO_SHOW': return 'NÃO COMPARECEU';
        case 'CANCELLED': return 'CANCELADO';
        default: return status || 'N/A';
      }
    };

    const canManageClientAppointment = (status?: string) => {
      const normalized = normalizeStatus(status);
      return normalized === 'CONFIRMED' || normalized === 'PENDING_PAYMENT' || normalized === 'REOPENED';
    };

    const myApts = appointments
      .filter(a => a.clientId === user?.id)
      .sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime());
    
    return (
      <div className="space-y-4 animate-fade-in">
        <h2 className="text-xl font-bold text-gray-800">Meus Agendamentos</h2>
        {historyError && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">
            {historyError}
          </div>
        )}
        {myApts.length === 0 ? (
          <p className="text-gray-500 text-center py-10">Você ainda não possui agendamentos.</p>
        ) : (
          myApts.map(apt => (
            <div key={apt.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
               <div className="flex justify-between items-start mb-2">
                 <div>
                   <span className={`text-xs font-bold px-2 py-1 rounded-full ${getStatusBadgeClass(apt.status)}`}>
                     {getStatusLabel(apt.status)}
                   </span>
                 </div>
                 <span className="text-sm font-bold text-gray-900">R$ {Number(apt.totalValue ?? 0).toFixed(2)}</span>
               </div>
               <div className="flex items-center gap-2 text-gray-700 mb-1">
                 <CalendarDays size={16} />
                 <span>{String(apt.date || '').split('-').reverse().join('/')} às {apt.time || '--:--'}</span>
               </div>
               <div className="flex items-center gap-2 text-gray-500 text-sm">
                 <ServiceIcon name={services.find(s => s.id === apt.serviceId)?.iconName} className="w-4 h-4" />
                 <span>{services.find(s => s.id === apt.serviceId)?.title}</span>
               </div>
               
               {/* Actions */}
               {canManageClientAppointment(apt.status) && (
                 <div className="mt-4 flex gap-2">
                   <button onClick={() => void handleCancelAppointment(apt.id)} className="text-red-600 text-sm font-medium hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">Cancelar</button>
                   <button onClick={() => startReschedule(apt.id)} className="text-blue-600 text-sm font-medium hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">Remarcar</button>
                 </div>
               )}

               {rescheduleAppointmentId === apt.id && canManageClientAppointment(apt.status) && (
                 <div className="mt-4 space-y-3 border-t pt-4">
                   <div>
                     <label className="block text-sm text-gray-600 mb-1">Nova data</label>
                     <input
                       type="date"
                       min={new Date().toISOString().split('T')[0]}
                       value={rescheduleDate}
                       onChange={(e) => { setRescheduleDate(e.target.value); setRescheduleTime(''); }}
                       className="w-full p-2 border border-gray-300 rounded-lg"
                     />
                   </div>

                   {rescheduleDate && (
                     <div>
                       <label className="block text-sm text-gray-600 mb-1">Novo horário</label>
                       {loadingRescheduleSlots ? (
                         <div className="text-sm text-gray-500">Carregando horários...</div>
                       ) : rescheduleSlots.length > 0 ? (
                         <div className="grid grid-cols-4 gap-2">
                           {rescheduleSlots.map(slot => (
                             <button
                               key={slot}
                               onClick={() => setRescheduleTime(slot)}
                               className={`py-2 px-1 rounded-lg text-sm font-medium transition-colors ${
                                 rescheduleTime === slot
                                   ? 'bg-blue-600 text-white'
                                   : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                               }`}
                             >
                               {slot}
                             </button>
                           ))}
                         </div>
                       ) : (
                         <div className="text-sm text-gray-500">Sem horários livres nesta data.</div>
                       )}
                     </div>
                   )}

                   <div className="flex gap-2 pt-1">
                     <button
                       onClick={() => void handleSaveReschedule(apt)}
                       disabled={!rescheduleDate || !rescheduleTime || savingReschedule}
                       className="text-white bg-blue-600 px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                     >
                       {savingReschedule ? 'Salvando...' : 'Confirmar remarcação'}
                     </button>
                     <button
                       onClick={() => { setRescheduleAppointmentId(null); setRescheduleDate(''); setRescheduleTime(''); setRescheduleSlots([]); }}
                       className="text-gray-600 bg-gray-100 px-3 py-2 rounded-lg text-sm font-medium"
                     >
                       Cancelar
                     </button>
                   </div>
                 </div>
               )}
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Mobile Header */}
      <header className="bg-white px-4 py-3 shadow-sm flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          {view !== 'HOME' && (
             <button onClick={() => { if(step > 0 && view === 'BOOKING' && step < 4) setStep(s=>s-1); else setView('HOME'); }} className="p-1 hover:bg-gray-100 rounded-full">
               <ChevronLeft size={24} className="text-gray-600" />
             </button>
          )}
          <h1 className="font-bold text-lg text-gray-800">
            {view === 'HOME' ? `Olá, ${(user?.name || '').split(' ')[0] || 'Cliente'}` : 
             view === 'BOOKING' ? 'Agendar Serviço' : 'Histórico'}
          </h1>
        </div>
        <div className="flex gap-4 items-center">
            <div className="relative">
                <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-1">
                    <Bell size={22} className="text-gray-600" />
                    <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                </button>
                {/* Dropdown Notification */}
                {showNotifications && (
                    <div className="absolute right-0 mt-2 w-64 bg-white shadow-xl rounded-lg border p-2 z-50">
                        <div className="flex justify-between items-center px-2 py-1 border-b mb-1">
                            <span className="text-xs font-bold text-gray-500">Notificações</span>
                            <X size={14} className="cursor-pointer" onClick={() => setShowNotifications(false)}/>
                        </div>
                        <div className="text-sm text-gray-600 p-2">Sem novas notificações.</div>
                    </div>
                )}
            </div>
            <button onClick={logout} className="text-gray-400 hover:text-red-500">
                <LogOut size={22} />
            </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 max-w-lg mx-auto w-full">
        {needsRegistration ? (
          <div className="animate-fade-in pt-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Complete seu cadastro</h2>
                <p className="text-sm text-gray-500 mt-1">Antes de continuar, confirme seus dados para acessar seus agendamentos.</p>
              </div>

              <form onSubmit={handleClientRegistration} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Celular</label>
                  <input
                    type="tel"
                    value={user?.phone || ''}
                    readOnly
                    className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  <input
                    type="text"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                  <input
                    type="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data de nascimento</label>
                  <input
                    type="date"
                    value={registerBirthDate}
                    onChange={(e) => setRegisterBirthDate(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {registerError && (
                  <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">
                    {registerError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={registering}
                  className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60"
                >
                  {registering ? 'Salvando...' : 'Concluir cadastro'}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <>
            {view === 'HOME' && (
              <div className="space-y-4 animate-fade-in pt-4">
                {/* Quick Actions - Vertical Layout */}
                <div className="grid grid-cols-1 gap-4">
                   <button onClick={() => { setView('BOOKING'); setStep(0); }} className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-all text-left flex items-center gap-6 border border-transparent hover:border-blue-200 group">
                     <div className="bg-blue-100 w-14 h-14 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                       <Calendar size={28} />
                     </div>
                     <div>
                       <span className="font-bold text-lg text-gray-800 block">Novo Agendamento</span>
                       <p className="text-sm text-gray-500">Escolha um serviço e reserve seu horário</p>
                     </div>
                   </button>
                   
                   <button onClick={() => setView('HISTORY')} className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-all text-left flex items-center gap-6 border border-transparent hover:border-blue-200 group">
                     <div className="bg-purple-100 w-14 h-14 rounded-2xl flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all">
                       <Clock size={28} />
                     </div>
                     <div>
                       <span className="font-bold text-lg text-gray-800 block">Meus Agendamentos</span>
                       <p className="text-sm text-gray-500">Veja e gerencie seus horários marcados</p>
                     </div>
                   </button>
                </div>
              </div>
            )}

            {view === 'BOOKING' && (
              <>
                {bookingError && (
                  <div className="mb-4 bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">
                    {bookingError}
                  </div>
                )}
                {renderWizard()}
              </>
            )}
            {view === 'HISTORY' && renderHistory()}
          </>
        )}

      </main>

    </div>
  );
};