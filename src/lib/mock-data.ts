

import type { ServiceOrder, Customer, Product, ServiceOrderItem } from './types';


export const initialCustomers: Customer[] = [
  {
    id: "cust_1",
    name: "Tech Solutions Ltda.",
    nomeFantasia: "Tech Solutions",
    contactName: "Ana Silva",
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
    nomeFantasia: "Inova Corp",
    contactName: "Carlos Pereira",
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
    contactName: "Mariana Costa",
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
    nomeFantasia: "ConstruBem",
    contactName: "Jorge Almeida",
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
    contactName: "Roberto Nunes",
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


export const initialServiceOrders: ServiceOrder[] = [
    {
        id: 'os_1',
        number: '20240001',
        openingDate: new Date().toISOString(),
        clientId: 'cust_1',
        technicianId: 'user_1', // Assuming user_1 is a technician
        status: 'Aberta',
        problemDescription: 'Computador não liga, faz barulho estranho ao tentar iniciar.',
        deliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
        items: [],
    },
    {
        id: 'os_2',
        number: '20240002',
        openingDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        clientId: 'cust_2',
        technicianId: 'user_1',
        status: 'Em andamento',
        problemDescription: 'Impressora fiscal não está imprimindo as notas corretamente.',
        technicalDiagnosis: 'Necessária troca da cabeça de impressão e limpeza geral.',
        deliveryDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day from now
        items: [],
    },
    {
        id: 'os_3',
        number: '20240003',
        openingDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
        clientId: 'cust_4',
        technicianId: 'user_1',
        status: 'Finalizada',
        problemDescription: 'Sistema de ponto eletrônico offline.',
        technicalDiagnosis: 'Cabo de rede desconectado no servidor.',
        executedServices: 'Reconexão do cabo de rede e teste de comunicação.',
        items: [{ name: 'Visita Técnica Simples', quantity: 1, price: 50.00 }],
        deliveryDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
    }
];
