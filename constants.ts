import { Service, Professional, Appointment, AppNotification, Client, Category } from './types';

export const MOCK_CATEGORIES: Category[] = [
  { id: 'cat1', name: 'Cabelo', description: 'Cortes e tratamentos capilares', iconName: 'Scissors' },
  { id: 'cat2', name: 'Barba', description: 'Cuidados com a barba e rosto', iconName: 'User' },
  { id: 'cat3', name: 'Combo', description: 'Pacotes promocionais de serviços', iconName: 'Sparkles' },
  { id: 'cat4', name: 'Estética', description: 'Tratamentos faciais e corporais', iconName: 'Smile' },
];

export const MOCK_CLIENTS: Client[] = [
  { id: 'c1', name: 'João Silva', phone: '(11) 98888-7777', totalSpent: 450.00, haircutsCount: 12, lastVisit: '2024-03-01', birthday: '1990-05-15' },
  { id: 'c2', name: 'Maria Oliveira', phone: '(11) 97777-6666', totalSpent: 120.00, haircutsCount: 4, lastVisit: '2024-02-15', birthday: '1985-10-20' },
  { id: 'c3', name: 'Pedro Santos', phone: '(11) 96666-5555', totalSpent: 85.00, haircutsCount: 3, lastVisit: '2024-03-05', birthday: '1995-01-10' },
  { id: 'c4', name: 'Ana Costa', phone: '(11) 95555-4444', totalSpent: 320.00, haircutsCount: 8, lastVisit: '2024-02-28', birthday: '1992-07-30' },
];

export const MOCK_SERVICES: Service[] = [
  {
    id: '1',
    title: 'Corte de Cabelo Masculino',
    description: 'Corte completo com lavagem e finalização.',
    price: 50.00,
    durationMinutes: 30,
    category: 'Cabelo',
    iconName: 'Scissors',
    isPromo: true,
    promoPrice: 45.00
  },
  {
    id: '2',
    title: 'Barba Terapia',
    description: 'Modelagem de barba com toalha quente e hidratação.',
    price: 35.00,
    durationMinutes: 30,
    category: 'Barba',
    iconName: 'User'
  },
  {
    id: '3',
    title: 'Corte + Barba (Combo)',
    description: 'O pacote completo para o homem moderno.',
    price: 80.00,
    durationMinutes: 60,
    category: 'Combo',
    iconName: 'Sparkles'
  },
  {
    id: '4',
    title: 'Limpeza de Pele',
    description: 'Limpeza profunda e hidratação facial.',
    price: 120.00,
    durationMinutes: 45,
    category: 'Estética',
    iconName: 'Smile'
  }
];

export const MOCK_PROFESSIONALS: Professional[] = [
  {
    id: 'p1',
    name: 'Flávio Santos',
    role: 'Barbeiro Master',
    avatar: 'https://i.pravatar.cc/150?u=flavio',
    specialties: ['1', '2', '3']
  },
  {
    id: 'p2',
    name: 'Marcela Ribeiro',
    role: 'Esteticista',
    avatar: 'https://i.pravatar.cc/150?u=marcela',
    specialties: ['4']
  },
  {
    id: 'p3',
    name: 'Carla Dias',
    role: 'Barbeira Jr',
    avatar: 'https://i.pravatar.cc/150?u=carla',
    specialties: ['1', '2']
  },
  {
    id: 'p4',
    name: 'Gabriela Lima',
    role: 'Colorista',
    avatar: 'https://i.pravatar.cc/150?u=gabriela',
    specialties: ['1', '4']
  },
  {
    id: 'p5',
    name: 'Rafael Costa',
    role: 'Barbeiro Jr',
    avatar: 'https://i.pravatar.cc/150?u=rafael',
    specialties: ['1', '2']
  },
  {
    id: 'p6',
    name: 'Camila Oliveira',
    role: 'Manicure',
    avatar: 'https://i.pravatar.cc/150?u=camila',
    specialties: ['1', '2']
  }
];

export const MOCK_APPOINTMENTS: Appointment[] = [
  // Appointments for 2026-03-09 (Today in simulation)
  {
    id: 'a101',
    clientId: 'c1',
    serviceId: '1',
    professionalId: 'p1',
    date: '2026-03-09',
    time: '09:30',
    status: 'CONFIRMED',
    totalValue: 50.00,
    createdAt: '2026-03-01T10:00:00Z'
  },
  {
    id: 'a102',
    clientId: 'c1',
    serviceId: '2',
    professionalId: 'p1',
    date: '2026-03-09',
    time: '10:00',
    status: 'CONFIRMED',
    totalValue: 35.00,
    createdAt: '2026-03-01T10:00:00Z'
  },
  {
    id: 'a103',
    clientId: 'c2',
    serviceId: '1',
    professionalId: 'p1',
    date: '2026-03-09',
    time: '11:00',
    status: 'CONFIRMED',
    totalValue: 50.00,
    createdAt: '2026-03-01T10:00:00Z'
  },
  {
    id: 'a104',
    clientId: 'c3',
    serviceId: '4',
    professionalId: 'p3',
    date: '2026-03-09',
    time: '10:30',
    status: 'CONFIRMED',
    totalValue: 120.00,
    createdAt: '2026-03-01T10:00:00Z'
  },
  {
    id: 'a105',
    clientId: 'c4',
    serviceId: '1',
    professionalId: 'p2',
    date: '2026-03-09',
    time: '11:00',
    status: 'CONFIRMED',
    totalValue: 50.00,
    createdAt: '2026-03-01T10:00:00Z'
  },
  {
    id: 'a106',
    clientId: 'c2',
    serviceId: '4',
    professionalId: 'p4',
    date: '2026-03-09',
    time: '09:30',
    status: 'CONFIRMED',
    totalValue: 120.00,
    createdAt: '2026-03-01T10:00:00Z'
  },
  {
    id: 'a107',
    clientId: 'c3',
    serviceId: '1',
    professionalId: 'p5',
    date: '2026-03-09',
    time: '10:00',
    status: 'CONFIRMED',
    totalValue: 50.00,
    createdAt: '2026-03-01T10:00:00Z'
  },
  {
    id: 'a108',
    clientId: 'c4',
    serviceId: '2',
    professionalId: 'p5',
    date: '2026-03-09',
    time: '10:30',
    status: 'CONFIRMED',
    totalValue: 35.00,
    createdAt: '2026-03-01T10:00:00Z'
  },
  {
    id: 'a109',
    clientId: 'c1',
    serviceId: '1',
    professionalId: 'p5',
    date: '2026-03-09',
    time: '11:00',
    status: 'CONFIRMED',
    totalValue: 50.00,
    createdAt: '2026-03-01T10:00:00Z'
  },
  {
    id: 'a110',
    clientId: 'c2',
    serviceId: '2',
    professionalId: 'p5',
    date: '2026-03-09',
    time: '11:30',
    status: 'CONFIRMED',
    totalValue: 35.00,
    createdAt: '2026-03-01T10:00:00Z'
  },
  {
    id: 'a111',
    clientId: 'c1',
    serviceId: '2',
    professionalId: 'p1',
    date: '2026-03-09',
    time: '13:00',
    status: 'CONFIRMED',
    totalValue: 35.00,
    createdAt: '2026-03-01T10:00:00Z'
  },
  {
    id: 'a112',
    clientId: 'c2',
    serviceId: '1',
    professionalId: 'p2',
    date: '2026-03-09',
    time: '13:00',
    status: 'CONFIRMED',
    totalValue: 50.00,
    createdAt: '2026-03-01T10:00:00Z'
  },
  {
    id: 'a113',
    clientId: 'c3',
    serviceId: '4',
    professionalId: 'p3',
    date: '2026-03-09',
    time: '13:00',
    status: 'CONFIRMED',
    totalValue: 120.00,
    createdAt: '2026-03-01T10:00:00Z'
  },
  {
    id: 'a114',
    clientId: 'c4',
    serviceId: '1',
    professionalId: 'p4',
    date: '2026-03-09',
    time: '13:00',
    status: 'CONFIRMED',
    totalValue: 50.00,
    createdAt: '2026-03-01T10:00:00Z'
  }
];

export const MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n1',
    title: 'Agendamento Confirmado',
    message: 'Seu corte para amanhã às 14:00 foi confirmado.',
    type: 'SUCCESS',
    read: false,
    timestamp: 'Há 5 min'
  },
  {
    id: 'n2',
    title: 'Promoção Relâmpago',
    message: '20% de desconto em hidratação hoje!',
    type: 'INFO',
    read: true,
    timestamp: 'Há 2 horas'
  }
];

export const AVAILABLE_TIMES = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', 
  '16:00', '16:30', '17:00', '17:30', '18:00'
];