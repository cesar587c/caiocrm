
export type CompanyProfile = {
  name: string;
  email: string;
  phone: string;
  address: string;
  logoUrl?: string;
  whatsappReminderMessage?: string;
};

export type Sector = {
  id: string;
  name: string;
};

export type User = {
  id: string;
  name: string;
  email?: string;
  whatsapp?: string;
  sectorIds: string[];
};

export type Appointment = {
  id: string;
  date: string; // 'yyyy-MM-dd'
  time: string;
  clientName: string;
  address: string;
  phone?: string;
  contact: string;
  assignedTo: string;
  summary?: string;
  status: 'scheduled' | 'completed' | 'missed';
  justification?: string;
};

export type ServiceOrder = {
    id: string;
    number: string;
    openingDate: string;
    deliveryDate?: string;
    clientId: string;
    technicianId: string;
    status: 'Aberta' | 'Em andamento' | 'Aguardando peça' | 'Finalizada' | 'Cancelada';
    problemDescription: string;
    technicalDiagnosis?: string;
    executedServices?: string;
    usedParts?: string;
    totalValue?: number;
    // photos?: string[];
};
