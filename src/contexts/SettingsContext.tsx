
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import type { CompanyProfile, Sector, User, Appointment, ServiceOrder, Customer, Product, UserRole, RolePermissions } from '@/lib/types';
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

const initialAppointments: Appointment[] = [];

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
  updateCustomer: (customer: Customer) => void;
  deleteCustomer: (id: string) => void;
  products: Product[];
  addProduct: (productData: Omit<Product, 'id' | 'priceHistory'> & {name: string, price: number}) => Product;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  rolePermissions: RolePermissions;
  updateRolePermissions: (role: UserRole, paths: string[]) => void;
  currentUser: User | null;
  login: (name: string, password: string) => Promise<boolean>;
  logout: () => void;
  clearAllData: () => void;
  isAuthenticated: boolean;
  isLoaded: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const generateId = (prefix: string) => `${prefix}_${Date.now()}`;

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(initialCompanyProfileData);
  const [sectors, setSectors] = useState<Sector[]>(initialSectors);
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>(initialServiceOrders);
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [products, setProducts] = useState<Product[]>(initialProducts);
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

  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem('companyProfile');
      if (savedProfile) {
        setCompanyProfile({ ...initialCompanyProfileData, ...JSON.parse(savedProfile) });
      }
      
      const savedSectors = localStorage.getItem('sectors');
      if (savedSectors) {
        const parsed = JSON.parse(savedSectors);
        if (parsed.length > 0) setSectors(parsed);
      }
      
      const savedUsers = localStorage.getItem('users');
      let finalUsers = initialUsers;
      if (savedUsers) {
        const parsed = JSON.parse(savedUsers);
        if (parsed.length > 0) finalUsers = parsed;
      }
      setUsers(finalUsers);
      
      const savedAppointments = localStorage.getItem('appointments');
      if(savedAppointments) setAppointments(JSON.parse(savedAppointments));

      const savedServiceOrders = localStorage.getItem('serviceOrders');
      if(savedServiceOrders) setServiceOrders(JSON.parse(savedServiceOrders));

      const savedCustomers = localStorage.getItem('customers');
      if(savedCustomers) setCustomers(JSON.parse(savedCustomers));

      const savedProducts = localStorage.getItem('products');
      if (savedProducts) setProducts(JSON.parse(savedProducts));

      const savedPermissions = localStorage.getItem('rolePermissions');
      if (savedPermissions) {
          setRolePermissions({ ...initialRolePermissions, ...JSON.parse(savedPermissions) });
      }

      const savedCurrentUserId = localStorage.getItem('currentUserId');
      if (savedCurrentUserId) {
        const id = JSON.parse(savedCurrentUserId);
        const foundUser = finalUsers.find(u => u.id === id);
        setCurrentUser(foundUser || null);
      }
    } catch (error) {
      console.error("Failed to load settings", error);
    } finally {
      setIsLoaded(true);
    }
  }, []);
  
  const saveData = useCallback((key: string, data: any) => {
      try {
          localStorage.setItem(key, JSON.stringify(data));
      } catch (error) {
          console.error(`Failed to save ${key}`, error);
      }
  }, []);

  const clearAllData = useCallback(() => {
    setAppointments([]);
    setServiceOrders([]);
    setCustomers([]);
    setProducts([]);
    localStorage.removeItem('appointments');
    localStorage.removeItem('serviceOrders');
    localStorage.removeItem('customers');
    localStorage.removeItem('products');
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

  const logout = useCallback(() => {
    handleSetCurrentUser(null);
  }, [handleSetCurrentUser]);

  const handleSetProfile = useCallback((profile: CompanyProfile) => {
    setCompanyProfile(profile);
    saveData('companyProfile', profile);
  }, [saveData]);
  
  const handleSetSectors = useCallback((newSectors: Sector[]) => {
      setSectors(newSectors);
      saveData('sectors', newSectors);
  }, [saveData]);
  
  const handleSetUsers = useCallback((newUsers: User[]) => {
      setUsers(newUsers);
      saveData('users', newUsers);
      if (currentUser && !newUsers.find(u => u.id === currentUser.id)) {
        handleSetCurrentUser(newUsers[0] || null);
      }
  }, [currentUser, handleSetCurrentUser, saveData]);

  const handleSetAppointments = useCallback((data: Appointment[]) => {
    setAppointments(data);
    saveData('appointments', data);
  }, [saveData]);

  const handleSetServiceOrders = useCallback((data: ServiceOrder[]) => {
    setServiceOrders(data);
    saveData('serviceOrders', data);
  }, [saveData]);

  const handleSetCustomers = useCallback((data: Customer[]) => {
    setCustomers(data);
    saveData('customers', data);
  }, [saveData]);
  
  const handleSetProducts = useCallback((data: Product[]) => {
    setProducts(data);
    saveData('products', data);
  }, [saveData]);

  const updateRolePermissions = useCallback((role: UserRole, paths: string[]) => {
    const newPermissions = { ...rolePermissions, [role]: paths };
    setRolePermissions(newPermissions);
    saveData('rolePermissions', newPermissions);
  }, [rolePermissions, saveData]);

  const addSector = useCallback((name: string) => {
      const newSector: Sector = { id: generateId('sec'), name };
      handleSetSectors([...sectors, newSector]);
  }, [sectors, handleSetSectors]);

  const deleteSector = useCallback((id: string) => {
      const updatedUsers = users.map(u => ({
          ...u,
          sectorIds: u.sectorIds.filter(sectorId => sectorId !== id),
      }));
      handleSetUsers(updatedUsers);
      handleSetSectors(sectors.filter(s => s.id !== id));
  }, [users, sectors, handleSetSectors, handleSetUsers]);

  const addUser = useCallback((userData: Omit<User, 'id'>) => {
      const newUser: User = { 
        id: generateId('user'), 
        ...userData 
      };
      handleSetUsers([...users, newUser]);
  }, [users, handleSetUsers]);

  const updateUser = useCallback((user: User) => {
      handleSetUsers(users.map(u => u.id === user.id ? user : u));
  }, [users, handleSetUsers]);

  const deleteUser = useCallback((id: string) => {
      handleSetUsers(users.filter(u => u.id !== id));
  }, [users, handleSetUsers]);

  const addAppointment = useCallback((data: Omit<Appointment, 'id'>) => {
      const newApp: Appointment = { id: generateId('app'), ...data };
      handleSetAppointments([...appointments, newApp]);
  }, [appointments, handleSetAppointments]);

  const updateAppointment = useCallback((updated: Appointment) => {
      handleSetAppointments(appointments.map(app => app.id === updated.id ? updated : app));
  }, [appointments, handleSetAppointments]);
  
  const deleteAppointment = useCallback((id: string) => {
      handleSetAppointments(appointments.filter(app => app.id !== id));
  }, [appointments, handleSetAppointments]);

  const addServiceOrder = useCallback((data: Omit<ServiceOrder, 'id' | 'number' | 'openingDate'>) => {
    const lastNum = serviceOrders.reduce((max, o) => Math.max(max, parseInt(o.number.slice(-4), 10)), 0);
    const newNum = `${new Date().getFullYear()}${(lastNum + 1).toString().padStart(4, '0')}`;
    const newOrder: ServiceOrder = {
        id: generateId('os'),
        number: newNum,
        openingDate: new Date().toISOString(),
        ...data
    };
    handleSetServiceOrders([...serviceOrders, newOrder]);
  }, [serviceOrders, handleSetServiceOrders]);

  const updateServiceOrder = useCallback((updated: ServiceOrder) => {
    handleSetServiceOrders(serviceOrders.map(o => o.id === updated.id ? updated : o));
  }, [serviceOrders, handleSetServiceOrders]);

  const deleteServiceOrder = useCallback((id: string) => {
    handleSetServiceOrders(serviceOrders.filter(o => o.id !== id));
  }, [serviceOrders, handleSetServiceOrders]);
  
  const addCustomer = useCallback((data: Omit<Customer, 'id'>) => {
      const newCust: Customer = { id: generateId('cust'), ...data };
      handleSetCustomers([...customers, newCust]);
  }, [customers, handleSetCustomers]);

  const updateCustomer = useCallback((updated: Customer) => {
      handleSetCustomers(customers.map(c => c.id === updated.id ? updated : c));
  }, [customers, handleSetCustomers]);

  const deleteCustomer = useCallback((id: string) => {
      handleSetCustomers(customers.filter(c => c.id !== id));
  }, [customers, handleSetCustomers]);
  
  const addProduct = useCallback((data: Omit<Product, 'id' | 'priceHistory'> & {name: string, price: number}) => {
    const newProd: Product = { 
        id: generateId('prod'), 
        name: data.name,
        price: data.price,
        priceHistory: [data.price]
    };
    handleSetProducts([newProd, ...products]);
    return newProd;
  }, [products, handleSetProducts]);
  
  const updateProduct = useCallback((updated: Product) => {
    handleSetProducts(products.map(p => p.id === updated.id ? updated : p));
  }, [products, handleSetProducts]);

  const deleteProduct = useCallback((id: string) => {
    handleSetProducts(products.filter(p => p.id !== id));
  }, [products, handleSetProducts]);

  const contextValue = useMemo(() => ({ 
        companyProfile, setCompanyProfile: handleSetProfile,
        sectors, addSector, deleteSector,
        users, addUser, updateUser, deleteUser,
        appointments, addAppointment, updateAppointment, deleteAppointment,
        serviceOrders, addServiceOrder, updateServiceOrder, deleteServiceOrder,
        customers, addCustomer, updateCustomer, deleteCustomer,
        products, addProduct, updateProduct, deleteProduct,
        rolePermissions, updateRolePermissions,
        currentUser, 
        login,
        logout,
        clearAllData,
        isAuthenticated,
        isLoaded 
    }), [
      companyProfile, handleSetProfile, sectors, addSector, deleteSector, users, addUser, updateUser, deleteUser, 
      appointments, addAppointment, updateAppointment, deleteAppointment, serviceOrders, addServiceOrder, 
      updateServiceOrder, deleteServiceOrder, customers, addCustomer, updateCustomer, deleteCustomer, 
      products, addProduct, updateProduct, deleteProduct, rolePermissions, updateRolePermissions, currentUser, 
      login, logout, clearAllData, isAuthenticated, isLoaded
    ]);

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
