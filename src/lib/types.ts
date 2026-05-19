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
  assignedTo: string[];
  summary?: string;
  status: 'scheduled' | 'completed' | 'missed' | 'cancelled';
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

export type Interaction = {
  id: string;
  timestamp: string;
  summary: string;
  nextContactDate?: string;
  nextContactTime?: string;
  userName: string;
  userId: string;
};

export type CustomerStatus = "lead" | "opportunity" | "proposal" | "negotiation" | "won" | "lost" | "active" | "inactive" | "new" | "discarded";
export type CustomerType = "active_contract" | "one_time" | "lead";

export type Customer = {
    id: string;
    name: string;
    nomeFantasia?: string;
    contactName?: string;
    telefone?: string;
    contactName2?: string;
    phone2?: string;
    cnpj?: string;
    email: string;
    endereco?: string;
    cep?: string;
    status: CustomerStatus;
    responsible: string;
    potential: "high" | "medium" | "low";
    lastContact: string;
    createdAt: string;
    type: CustomerType;
    serviceCategories?: string[];
    observations?: string;
    value?: number;
    oneTimeValue?: number;
    monthlyValue?: number;
    interactions?: Interaction[];
};

export type Product = {
  id: string;
  name: string;
  price: number;
  priceHistory: number[];
};

export type ProposalItem = {
  name: string;
  quantity: number;
  price: number;
  isMonthly: boolean;
};

export type Proposal = {
  id: string;
  clientId?: string;
  clientName: string;
  clientPhone?: string;
  proposalDate: string; // ISO string
  validityDate: string; // ISO string
  items: ProposalItem[];
  paymentMethod: string;
  installments: number;
  firstAsDownPayment: boolean;
  totalOneTime: number;
  totalMonthly: number;
};

export type RolePermissions = Record<UserRole, string[]>;
