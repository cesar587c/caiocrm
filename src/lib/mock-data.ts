
// Estrutura do produto com histórico de preços
export type Product = {
  id: string;
  name: string;
  price: number;
  priceHistory: number[];
};

export type Customer = {
    id: string;
    name: string;
    email: string;
    telefone?: string;
    status: "active" | "inactive" | "new";
    responsible: string;
    potential: "high" | "medium" | "low";
    lastContact: string;
    createdAt: string;
    type: "active_contract" | "one_time";
};

export const initialCustomers: Customer[] = [
  {
    id: "cust_1",
    name: "Tech Solutions Ltda.",
    email: "contato@techsolutions.com.br",
    telefone: "(11) 98765-4321",
    status: "active",
    responsible: "Ana Silva",
    potential: "high",
    lastContact: "2024-07-22T00:00:00.000Z",
    createdAt: "2024-07-20T00:00:00.000Z",
    type: "active_contract",
  },
  {
    id: "cust_2",
    name: "Inova Corp S.A.",
    email: "suporte@inovacorp.com",
    telefone: "(21) 91234-5678",
    status: "active",
    responsible: "Carlos Pereira",
    potential: "medium",
    lastContact: "2024-07-20T00:00:00.000Z",
    createdAt: "2024-07-01T00:00:00.000Z",
    type: "active_contract",
  },
  {
    id: "cust_3",
    name: "Mercado Central",
    email: "compras@mercadocentral.com",
    telefone: "(41) 95555-1234",
    status: "inactive",
    responsible: "Ana Silva",
    potential: "low",
    lastContact: "2024-05-15T00:00:00.000Z",
    createdAt: "2024-04-10T00:00:00.000Z",
    type: "one_time",
  },
  {
    id: "cust_4",
    name: "ConstruBem Materiais",
    email: "vendas@construbem.com.br",
    telefone: "(31) 99999-8888",
    status: "new",
    responsible: "Juliana Costa",
    potential: "high",
    lastContact: "2024-07-23T00:00:00.000Z",
    createdAt: "2024-07-23T00:00:00.000Z",
    type: "one_time",
  },
  {
    id: "cust_5",
    name: "AgroForte Distribuidora",
    email: "agroforte@distribuidora.com",
    telefone: "(62) 98765-9999",
    status: "active",
    responsible: "Carlos Pereira",
    potential: "medium",
    lastContact: "2024-07-18T00:00:00.000Z",
    createdAt: "2024-06-15T00:00:00.000Z",
    type: "active_contract",
  },
];


export const initialProducts: Product[] = [
  { id: 'prod_1', name: 'Desenvolvimento de Website Responsivo', price: 5000, priceHistory: [5000, 4800, 5200] },
  { id: 'prod_2', name: 'Manutenção Mensal de E-commerce', price: 500, priceHistory: [500] },
  { id: 'prod_3', name: 'Consultoria SEO (Pacote Inicial)', price: 1500, priceHistory: [1500, 1450] },
  { id: 'prod_4', name: 'Criação de Logo e Identidade Visual', price: 2500, priceHistory: [2500] },
  { id: 'prod_5', name: 'Assinatura de Software de Gestão (Anual)', price: 1200, priceHistory: [1200] },
  { id: 'prod_6', name: 'Treinamento de Equipe (Online)', price: 800, priceHistory: [800] },
];

    