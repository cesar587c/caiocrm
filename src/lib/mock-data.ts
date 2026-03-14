import type { ServiceOrder, Customer, Product } from './types';

export const initialCustomers: Customer[] = [];

export const initialProducts: Product[] = [
  { id: 'prod_1', name: 'Desenvolvimento de Website Responsivo', price: 5000, priceHistory: [5000, 4800, 5200] },
  { id: 'prod_2', name: 'Manutenção Mensal de E-commerce', price: 500, priceHistory: [500] },
  { id: 'prod_3', name: 'Consultoria SEO (Pacote Inicial)', price: 1500, priceHistory: [1500, 1450] },
  { id: 'prod_4', name: 'Criação de Logo e Identidade Visual', price: 2500, priceHistory: [2500] },
  { id: 'prod_5', name: 'Assinatura de Software de Gestão (Anual)', price: 1200, priceHistory: [1200] },
  { id: 'prod_6', name: 'Treinamento de Equipe (Online)', price: 800, priceHistory: [800] },
];

export const initialServiceOrders: ServiceOrder[] = [];
