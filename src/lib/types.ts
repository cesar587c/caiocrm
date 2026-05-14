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

export type UserRole = 'admin' | 'technician' | 'finance' | 'service';

export type User = {
  id: string;
  name: string;
  email?: string;
  whatsapp?: string;
  sectorIds: string[];
  role: UserRole;
  password?: string;
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

export type ServiceOrderItem = {
  name: string;
  quantity: number;
  price: number;
};

export type ServiceOrderHistoryEntry = {
  userId: string;
  userName: string;
  timestamp: string;
  action: string;
  from?: string;
  to?: string;
  details?: string; // For justification comments
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
    items: ServiceOrderItem[];
    history?: ServiceOrderHistoryEntry[];
};

export type CustomerStatus = "active" | "inactive" | "new" | "lead" | "discarded";
export type CustomerType = "active_contract" | "one_time" | "lead";

export type Customer = {
    id: string;
    name: string;
    nomeFantasia?: string;
    contactName?: string;
    cnpj?: string;
    email: string;
    telefone?: string;
    endereco?: string;
    cep?: string;
    status: CustomerStatus;
    responsible: string;
    potential: "high" | "medium" | "low";
    lastContact: string;
    createdAt: string;
    type: CustomerType;
    serviceCategories?: string[];
};

export type Product = {
  id: string;
  name: string;
  price: number;
  priceHistory: number[];
};

export type RolePermissions = Record<UserRole, string[]>;
