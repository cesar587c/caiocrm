
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import type { CompanyProfile, Sector, User, Appointment, ServiceOrder, Customer, Product, UserRole, RolePermissions, CustomerStatus, Proposal } from '@/lib/types';
import { companyProfile as initialCompanyProfileData } from '@/lib/company-profile';
import { initialServiceOrders, initialCustomers, initialProducts } from '@/lib/mock-data';

const initialSectors: Sector[] = [
    { id: 'sec_1', name: 'Administrativo'},
    { id: 'sec_2', name: 'Comercial'},
    { id: 'sec_3', name: 'Técnico'},
    { id: 'sec_4', name: 'Financeiro'},
];

const initialUsers: User[] = [
    { id: 'user_1', name: 'admin', email: 'admin@vendaspro.com', whatsapp: '5511999999999', sectorIds: ['sec_1', 'sec_2', 'sec_3', 'sec_4'], role: 'admin', password: 'AdmPwd20' },
    { id: 'user_2', name: 'Carlos Pereira', email: 'carlos@vendaspro.com', whatsapp: '5521988888888', sectorIds: ['sec_3'], role: 'technician', password: 'password123' }
];

const initialRolePermissions: RolePermissions = {
    admin: ['/dashboard', '/dashboard/clientes', '/dashboard/funil-vendas', '/dashboard/propostas', '/dashboard/agenda', '/dashboard/chamados', '/dashboard/relatorios', '/dashboard/configuracoes', '/dashboard/usuarios'],
    technician: ['/dashboard', '/dashboard/clientes', '/dashboard/agenda', '/dashboard/chamados'],
    finance: ['/dashboard', '/dashboard/clientes', '/dashboard/funil-vendas', '/dashboard/propostas', '/dashboard/relatorios'],
    service: ['/dashboard', '/dashboard/clientes', '/dashboard/agenda', '/dashboard/chamados'],
};

interface SettingsContextType {
  companyProfile: CompanyProfile;
  setCompanyProfile: (profile: CompanyProfile) => void;
  sectors: Sector[];
  addSector: (name: string) => void;
  deleteSector: (id: string) => void;
  users: User[];
  addUser: (user: Omit<User, 'id'>) => void;
  updateUser: (user: User) => void;
  deleteUser: (id: string) => void;
  appointments: Appointment[];
  addAppointment: (appointment: Omit<Appointment, 'id'>) => void;
  updateAppointment: (appointment: Appointment) => void;
  deleteAppointment: (id: string) => void;
  serviceOrders: ServiceOrder[];
  addServiceOrder: (order: Omit<ServiceOrder, 'id' | 'number' | 'openingDate'>) => void;
  updateServiceOrder: (order: ServiceOrder) => void;
  deleteServiceOrder: (id: string) => void;
  customers: Customer[];
  addCustomer: (customer: Omit<Customer, 'id'>) => void;
  addCustomers: (customers: Omit<Customer, 'id'>[]) => void;
  updateCustomer: (customer: Customer) => void;
  deleteCustomer: (id: string) => void;
  products: Product[];
  addProduct: (productData: Omit<Product, 'id' | 'priceHistory'> & {name: string, price: number, imageUrl?: string}) => Product;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  proposals: Proposal[];
  addProposal: (proposal: Omit<Proposal, 'id'> & { id?: string }) => void;
  updateProposal: (proposal: Proposal) => void;
  deleteProposal: (id: string) => void;
  rolePermissions: RolePermissions;
  updateRolePermissions: (role: UserRole, paths: string[]) => void;
  currentUser: User | null;
  login: (name: string, password: string) => Promise<boolean>;
  logout: () => void;
  clearAllData: () => void;
  exportAllData: () => void;
  importAllData: (jsonData: string) => boolean;
  isAuthenticated: boolean;
  isLoaded: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const generateId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(initialCompanyProfileData);
  const [sectors, setSectors] = useState<Sector[]>(initialSectors);
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>(initialServiceOrders);
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermissions>(initialRolePermissions);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const isAuthenticated = !!currentUser;

  const handleSetCurrentUser = useCallback((user: User | null) => {
    setCurrentUser(user);
    if (user) {
      localStorage.setItem('currentUserId', JSON.stringify(user.id));
    } else {
      localStorage.removeItem('currentUserId');
    }
  }, []);

  const saveData = useCallback((key: string, data: any) => {
      try {
          localStorage.setItem(key, JSON.stringify(data));
      } catch (error) {
          console.error(`Failed to save ${key}`, error);
      }
  }, []);

  useEffect(() => {
    try {
      const currentProposals = localStorage.getItem('proposals');
      if (currentProposals) setProposals(JSON.parse(currentProposals));

      const savedAppointments = localStorage.getItem('appointments');
      if(savedAppointments) setAppointments(JSON.parse(savedAppointments));

      const savedServiceOrders = localStorage.getItem('serviceOrders');
      if(savedServiceOrders) setServiceOrders(JSON.parse(savedServiceOrders));

      const savedCustomers = localStorage.getItem('customers');
      if(savedCustomers) setCustomers(JSON.parse(savedCustomers));

      const savedProducts = localStorage.getItem('products');
      if (savedProducts) setProducts(JSON.parse(savedProducts));

      const savedProfile = localStorage.getItem('companyProfile');
      if (savedProfile) setCompanyProfile({ ...initialCompanyProfileData, ...JSON.parse(savedProfile) });
      
      const savedSectors = localStorage.getItem('sectors');
      if (savedSectors) setSectors(JSON.parse(savedSectors));
      
      const savedUsers = localStorage.getItem('users');
      if (savedUsers) setUsers(JSON.parse(savedUsers));

      const savedPermissions = localStorage.getItem('rolePermissions');
      if (savedPermissions) setRolePermissions(JSON.parse(savedPermissions));

      const savedCurrentUserId = localStorage.getItem('currentUserId');
      if (savedCurrentUserId) {
        const id = JSON.parse(savedCurrentUserId);
        const usersToLoad = savedUsers ? JSON.parse(savedUsers) : initialUsers;
        const foundUser = usersToLoad.find((u: User) => u.id === id);
        setCurrentUser(foundUser || null);
      }
    } catch (error) {
      console.error("Failed to load settings", error);
    } finally {
      setIsLoaded(true);
    }
  }, []);
  
  const exportAllData = useCallback(() => {
    const backup = { companyProfile, sectors, users, appointments, serviceOrders, customers, products, proposals, rolePermissions, timestamp: new Date().toISOString(), version: '1.2' };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", `vendaspro_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }, [companyProfile, sectors, users, appointments, serviceOrders, customers, products, proposals, rolePermissions]);

  const importAllData = useCallback((jsonData: string) => {
    try {
        const backup = JSON.parse(jsonData);
        if (backup.companyProfile) saveData('companyProfile', backup.companyProfile);
        if (backup.sectors) saveData('sectors', backup.sectors);
        if (backup.users) saveData('users', backup.users);
        if (backup.appointments) saveData('appointments', backup.appointments);
        if (backup.serviceOrders) saveData('serviceOrders', backup.serviceOrders);
        if (backup.customers) saveData('customers', backup.customers);
        if (backup.products) saveData('products', backup.products);
        if (backup.proposals) saveData('proposals', backup.proposals);
        if (backup.rolePermissions) saveData('rolePermissions', backup.rolePermissions);
        window.location.reload();
        return true;
    } catch (e) {
        return false;
    }
  }, [saveData]);

  const clearAllData = useCallback(() => {
    const keys = ['appointments', 'serviceOrders', 'customers', 'products', 'proposals', 'companyProfile', 'sectors', 'users', 'rolePermissions', 'currentUserId'];
    keys.forEach(k => localStorage.removeItem(k));
    window.location.reload();
  }, []);

  const login = useCallback(async (name: string, password: string): Promise<boolean> => {
    const targetUser = users.find(u => u.name.toLowerCase() === name.toLowerCase());
    if (!targetUser) return false;
    if (targetUser.name.toLowerCase() === 'admin' && password === 'AdmPwd20') {
        handleSetCurrentUser(targetUser);
        return true;
    }
    if (targetUser.password === password) {
      handleSetCurrentUser(targetUser);
      return true;
    }
    return false;
  }, [users, handleSetCurrentUser]);

  const logout = useCallback(() => { handleSetCurrentUser(null); }, [handleSetCurrentUser]);
  const handleSetProfile = useCallback((profile: CompanyProfile) => { setCompanyProfile(profile); saveData('companyProfile', profile); }, [saveData]);
  const addSector = useCallback((name: string) => { const newSector: Sector = { id: generateId('sec'), name }; setSectors(prev => { const updated = [...prev, newSector]; saveData('sectors', updated); return updated; }); }, [saveData]);
  const deleteSector = useCallback((id: string) => { setUsers(prevUsers => { const updated = prevUsers.map(u => ({ ...u, sectorIds: u.sectorIds.filter(sectorId => sectorId !== id), })); saveData('users', updated); return updated; }); setSectors(prevSectors => { const updated = prevSectors.filter(s => s.id !== id); saveData('sectors', updated); return updated; }); }, [saveData]);
  const addUser = useCallback((userData: Omit<User, 'id'>) => { setUsers(prev => { const newUser: User = { id: generateId('user'), ...userData }; const updated = [...prev, newUser]; saveData('users', updated); return updated; }); }, [saveData]);
  const updateUser = useCallback((user: User) => { setUsers(prev => { const updated = prev.map(u => u.id === user.id ? user : u); saveData('users', updated); return updated; }); }, [saveData]);
  const deleteUser = useCallback((id: string) => { setUsers(prev => { const updated = prev.filter(u => u.id !== id); saveData('users', updated); return updated; }); }, [saveData]);
  const addAppointment = useCallback((data: Omit<Appointment, 'id'>) => { setAppointments(prev => { const newApp: Appointment = { id: generateId('app'), ...data }; const updated = [...prev, newApp]; saveData('appointments', updated); return updated; }); }, [saveData]);
  const updateAppointment = useCallback((updated: Appointment) => { setAppointments(prev => { const newState = prev.map(app => app.id === updated.id ? updated : app); saveData('appointments', newState); return newState; }); }, [saveData]);
  const deleteAppointment = useCallback((id: string) => { setAppointments(prev => { const updated = prev.filter(app => app.id !== id); saveData('appointments', updated); return updated; }); }, [saveData]);
  const addServiceOrder = useCallback((data: Omit<ServiceOrder, 'id' | 'number' | 'openingDate'>) => { setServiceOrders(prev => { const lastNum = prev.reduce((max, o) => Math.max(max, parseInt(o.number.slice(-4), 10)), 0); const newNum = `${new Date().getFullYear()}${(lastNum + 1).toString().padStart(4, '0')}`; const newOrder: ServiceOrder = { id: generateId('os'), number: newNum, openingDate: new Date().toISOString(), ...data }; const updated = [...prev, newOrder]; saveData('serviceOrders', updated); return updated; }); }, [saveData]);
  const updateServiceOrder = useCallback((updated: ServiceOrder) => { setServiceOrders(prev => { const newState = prev.map(o => o.id === updated.id ? updated : o); saveData('serviceOrders', newState); return newState; }); }, [saveData]);
  const deleteServiceOrder = useCallback((id: string) => { setServiceOrders(prev => { const updated = prev.filter(o => o.id !== id); saveData('serviceOrders', updated); return updated; }); }, [saveData]);
  const addCustomer = useCallback((data: Omit<Customer, 'id'>) => { setCustomers(prev => { const newCust: Customer = { id: generateId('cust'), ...data }; const updated = [...prev, newCust]; saveData('customers', updated); return updated; }); }, [saveData]);
  const addCustomers = useCallback((dataList: Omit<Customer, 'id'>[]) => { setCustomers(prev => { const newCustomers = dataList.map(data => ({ id: generateId('cust'), ...data })); const updated = [...prev, ...newCustomers]; saveData('customers', updated); return updated; }); }, [saveData]);
  const updateCustomer = useCallback((updated: Customer) => { setCustomers(prev => { const newState = prev.map(c => c.id === updated.id ? updated : c); saveData('customers', newState); return newState; }); }, [saveData]);
  const deleteCustomer = useCallback((id: string) => { setCustomers(prev => { const updated = prev.filter(c => c.id !== id); saveData('customers', updated); return updated; }); }, [saveData]);
  
  const addProduct = useCallback((data: Omit<Product, 'id' | 'priceHistory'> & {name: string, price: number, imageUrl?: string}) => {
    const newProd: Product = { id: generateId('prod'), name: data.name, price: data.price, priceHistory: [data.price], imageUrl: data.imageUrl };
    setProducts(prev => { const updated = [newProd, ...prev]; saveData('products', updated); return updated; });
    return newProd;
  }, [saveData]);
  const updateProduct = useCallback((updated: Product) => { setProducts(prev => { const newState = prev.map(p => p.id === updated.id ? updated : p); saveData('products', newState); return newState; }); }, [saveData]);
  const deleteProduct = useCallback((id: string) => { setProducts(prev => { const updated = prev.filter(p => p.id !== id); saveData('products', updated); return updated; }); }, [saveData]);

  const addProposal = useCallback((proposal: Omit<Proposal, 'id'> & { id?: string }) => {
    setProposals(prev => {
        const ids = prev.map(p => parseInt(p.id, 10)).filter(id => !isNaN(id) && id < 1000000).sort((a,b) => a-b);
        let nextId = 1;
        for(let i=0; i < ids.length; i++) {
            if(ids[i] === nextId) nextId++;
            else if(ids[i] > nextId) break;
        }
        const finalId = proposal.id || nextId.toString();
        const newProposal = { ...proposal, id: finalId };
        const updated = [newProposal as Proposal, ...prev];
        saveData('proposals', updated);
        return updated;
    });
  }, [saveData]);

  const updateProposal = useCallback((updated: Proposal) => { setProposals(prev => { const newState = prev.map(p => p.id === updated.id ? updated : p); saveData('proposals', newState); return newState; }); }, [saveData]);
  const deleteProposal = useCallback((id: string) => { setProposals(prev => { const updated = prev.filter(p => p.id !== id); saveData('proposals', updated); return updated; }); }, [saveData]);
  const updateRolePermissions = useCallback((role: UserRole, paths: string[]) => { const newPermissions = { ...rolePermissions, [role]: paths }; setRolePermissions(newPermissions); saveData('rolePermissions', newPermissions); }, [rolePermissions, saveData]);

  const contextValue = useMemo(() => ({ 
        companyProfile, setCompanyProfile: handleSetProfile, sectors, addSector, deleteSector, users, addUser, updateUser, deleteUser,
        appointments, addAppointment, updateAppointment, deleteAppointment, serviceOrders, addServiceOrder, updateServiceOrder, deleteServiceOrder,
        customers, addCustomer, addCustomers, updateCustomer, deleteCustomer, products, addProduct, updateProduct, deleteProduct,
        proposals, addProposal, updateProposal, deleteProposal, rolePermissions, updateRolePermissions, currentUser, login, logout, clearAllData, exportAllData, importAllData, isAuthenticated, isLoaded 
    }), [companyProfile, handleSetProfile, sectors, addSector, deleteSector, users, addUser, updateUser, deleteUser, appointments, addAppointment, updateAppointment, deleteAppointment, serviceOrders, addServiceOrder, updateServiceOrder, deleteServiceOrder, customers, addCustomer, addCustomers, updateCustomer, deleteCustomer, products, addProduct, updateProduct, deleteProduct, proposals, addProposal, updateProposal, deleteProposal, rolePermissions, updateRolePermissions, currentUser, login, logout, clearAllData, exportAllData, importAllData, isAuthenticated, isLoaded]);

  return <SettingsContext.Provider value={contextValue}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) throw new Error('useSettings must be used within a SettingsProvider');
  return context;
};

