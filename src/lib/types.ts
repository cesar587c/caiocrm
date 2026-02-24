

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
  role: 'admin' | 'technician' | 'finance' | 'service';
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

export type Customer = {
    id: string;
    name: string;
    nomeFantasia?: string;
    contactName?: string;
    email: string;
    telefone?: string;
    status: "active" | "inactive" | "new";
    responsible: string;
    potential: "high" | "medium" | "low";
    lastContact: string;
    createdAt: string;
    type: "active_contract" | "one_time";
};

// Estrutura do produto com histórico de preços
export type Product = {
  id: string;
  name: string;
  price: number;
  priceHistory: number[];
};
