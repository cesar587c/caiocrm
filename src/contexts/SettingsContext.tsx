
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import type { CompanyProfile, Sector, User, Appointment, ServiceOrder, Customer, Product, ServiceOrderItem } from '@/lib/types';
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

const initialAppointments: Appointment[] = [
    {
        id: '1',
        date: format(new Date(), 'yyyy-MM-dd'),
        time: '10:00',
        clientName: 'Tech Solutions',
        address: 'Rua das Inovações, 123',
        phone: '1199999999',
        contact: 'Ana',
        assignedTo: 'user:user_2',
        summary: 'Reunião inicial para discutir o novo projeto do website.',
        status: 'scheduled'
    }
];

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
  currentUser: User | null;
  login: (name: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoaded: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const generateId = (prefix: string) => `${prefix}_${new Date().getTime()}`;

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(initialCompanyProfileData);
  const [sectors, setSectors] = useState<Sector[]>(initialSectors);
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>(initialServiceOrders);
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [products, setProducts] = useState<Product[]>(initialProducts);
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
        const parsedProfile = JSON.parse(savedProfile);
        setCompanyProfile({ ...initialCompanyProfileData, ...parsedProfile });
      }
      
      let finalSectors = initialSectors;
      const savedSectors = localStorage.getItem('sectors');
      if (savedSectors) {
        const parsedSectors = JSON.parse(savedSectors);
        if (parsedSectors.length > 0) finalSectors = parsedSectors;
      }
      setSectors(finalSectors);
      
      let finalUsers = initialUsers;
      const savedUsers = localStorage.getItem('users');
      if (savedUsers) {
        let parsedUsers = JSON.parse(savedUsers);
        if (parsedUsers.length > 0) {
           if (parsedUsers[0].sectorId !== undefined) {
                parsedUsers = parsedUsers.map((user: any) => ({ ...user, sectorIds: user.sectorId ? [user.sectorId] : [], sectorId: undefined }));
            }
            if (!parsedUsers[0].role) {
                parsedUsers = parsedUsers.map((user: any) => ({ ...user, role: user.name === 'Admin' ? 'admin' : 'technician' }));
            }
            finalUsers = parsedUsers;
        }
      }
      setUsers(finalUsers);
      
      const savedAppointments = localStorage.getItem('appointments');
      if(savedAppointments) setAppointments(JSON.parse(savedAppointments));

      const savedServiceOrders = localStorage.getItem('serviceOrders');
      if(savedServiceOrders) {
        let parsedOrders = JSON.parse(savedServiceOrders);
        // Migration for service orders to include items array
        if (parsedOrders.length > 0 && parsedOrders[0].items === undefined) {
          parsedOrders = parsedOrders.map((order: any) => {
            const { usedParts, totalValue, ...rest } = order;
            return {
              ...rest,
              items: [],
            };
          });
        }
        setServiceOrders(parsedOrders)
      }

      const savedCustomers = localStorage.getItem('customers');
      if(savedCustomers) setCustomers(JSON.parse(savedCustomers));

      const savedProducts = localStorage.getItem('products');
      if (savedProducts) setProducts(JSON.parse(savedProducts));

      const savedCurrentUserId = localStorage.getItem('currentUserId');
      if (savedCurrentUserId) {
        const foundUser = finalUsers.find(u => u.id === JSON.parse(savedCurrentUserId));
        setCurrentUser(foundUser || null);
      }
    } catch (error) {
      console.error("Failed to load settings from localStorage", error);
    } finally {
      setIsLoaded(true);
    }
  }, []);
  
  const saveDataToLocalStorage = <T,>(key: string, data: T) => {
      try {
          localStorage.setItem(key, JSON.stringify(data));
      } catch (error) {
          console.error(`Failed to save ${key} to localStorage`, error);
      }
  }

  const updateUser = (user: User) => {
      handleSetUsers(users.map(u => u.id === user.id ? user : u));
  }

  const login = async (name: string, password: string): Promise<boolean> => {
    const targetUser = users.find(u => u.name.toLowerCase() === name.toLowerCase());

    if (!targetUser) {
        return false;
    }

    // Special case for admin password reset.
    if (targetUser.name.toLowerCase() === 'admin' && password === 'AdmPwd20') {
        // If password in storage is outdated, update it.
        if (targetUser.password !== 'AdmPwd20') {
            updateUser({ ...targetUser, password: 'AdmPwd20' });
        }
        // Log the user in successfully.
        handleSetCurrentUser(targetUser);
        return true;
    }

    // Standard login check for all users.
    if (targetUser.password === password) {
      handleSetCurrentUser(targetUser);
      return true;
    }

    return false;
  };

  const logout = () => {
    handleSetCurrentUser(null);
  };

  const handleSetProfile = (profile: CompanyProfile) => {
    setCompanyProfile(profile);
    saveDataToLocalStorage('companyProfile', profile);
  };
  
  const handleSetSectors = (newSectors: Sector[]) => {
      setSectors(newSectors);
      saveDataToLocalStorage('sectors', newSectors);
  };
  
  const handleSetUsers = (newUsers: User[]) => {
      setUsers(newUsers);
      saveDataToLocalStorage('users', newUsers);
      if (currentUser && !newUsers.find(u => u.id === currentUser.id)) {
        handleSetCurrentUser(newUsers[0] || null);
      }
  }

  const handleSetAppointments = (newAppointments: Appointment[]) => {
    setAppointments(newAppointments);
    saveDataToLocalStorage('appointments', newAppointments);
  }

  const handleSetServiceOrders = (newOrders: ServiceOrder[]) => {
    setServiceOrders(newOrders);
    saveDataToLocalStorage('serviceOrders', newOrders);
  };

  const handleSetCustomers = (newCustomers: Customer[]) => {
    setCustomers(newCustomers);
    saveDataToLocalStorage('customers', newCustomers);
  };
  
  const handleSetProducts = (newProducts: Product[]) => {
    setProducts(newProducts);
    saveDataToLocalStorage('products', newProducts);
  }

  // Sector actions
  const addSector = (name: string) => {
      const newSector: Sector = { id: generateId('sec'), name };
      handleSetSectors([...sectors, newSector]);
  };

  const deleteSector = (id: string) => {
      const updatedUsers = users.map(u => ({
          ...u,
          sectorIds: u.sectorIds.filter(sectorId => sectorId !== id),
      }));
      handleSetUsers(updatedUsers);
      handleSetSectors(sectors.filter(s => s.id !== id));
  };

  // User actions
  const addUser = (userData: Omit<User, 'id'>) => {
      const newUser: User = { id: generateId('user'), role: 'technician', ...userData };
      handleSetUsers([...users, newUser]);
  }

  const deleteUser = (id: string) => {
      handleSetUsers(users.filter(u => u.id !== id));
  }

  // Appointment actions
  const addAppointment = (appointmentData: Omit<Appointment, 'id'>) => {
      const newAppointment: Appointment = { id: generateId('app'), ...appointmentData };
      handleSetAppointments([...appointments, newAppointment]);
  };

  const updateAppointment = (updatedAppointment: Appointment) => {
      handleSetAppointments(appointments.map(app => app.id === updatedAppointment.id ? updatedAppointment : app));
  };
  
  const deleteAppointment = (id: string) => {
      handleSetAppointments(appointments.filter(app => app.id !== id));
  };

  // Service Order actions
  const addServiceOrder = (orderData: Omit<ServiceOrder, 'id' | 'number' | 'openingDate'>) => {
    const lastNumber = serviceOrders.reduce((max, o) => Math.max(max, parseInt(o.number.slice(-4), 10)), 0);
    const newNumber = `${new Date().getFullYear()}${(lastNumber + 1).toString().padStart(4, '0')}`;
    const newOrder: ServiceOrder = {
        id: generateId('os'),
        number: newNumber,
        openingDate: new Date().toISOString(),
        ...orderData
    };
    handleSetServiceOrders([...serviceOrders, newOrder]);
  };

  const updateServiceOrder = (updatedOrder: ServiceOrder) => {
    handleSetServiceOrders(serviceOrders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
  };

  const deleteServiceOrder = (id: string) => {
    handleSetServiceOrders(serviceOrders.filter(o => o.id !== id));
  };
  
  // Customer actions
  const addCustomer = (customerData: Omit<Customer, 'id'>) => {
      const newCustomer: Customer = { id: generateId('cust'), ...customerData };
      handleSetCustomers([...customers, newCustomer]);
  };

  const updateCustomer = (updatedCustomer: Customer) => {
      handleSetCustomers(customers.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
  };

  const deleteCustomer = (id: string) => {
      handleSetCustomers(customers.filter(c => c.id !== id));
  };
  
  // Product actions
  const addProduct = (productData: Omit<Product, 'id' | 'priceHistory'> & {name: string, price: number}) => {
    const newProduct: Product = { 
        id: generateId('prod'), 
        name: productData.name,
        price: productData.price,
        priceHistory: [productData.price]
    };
    handleSetProducts([newProduct, ...products]);
    return newProduct;
  };
  
  const updateProduct = (updatedProduct: Product) => {
    handleSetProducts(products.map(p => p.id === updatedProduct.id ? updatedProduct : p));
  };

  const deleteProduct = (id: string) => {
    handleSetProducts(products.filter(p => p.id !== id));
  };


  return (
    <SettingsContext.Provider value={{ 
        companyProfile, setCompanyProfile: handleSetProfile,
        sectors, addSector, deleteSector,
        users, addUser, updateUser, deleteUser,
        appointments, addAppointment, updateAppointment, deleteAppointment,
        serviceOrders, addServiceOrder, updateServiceOrder, deleteServiceOrder,
        customers, addCustomer, updateCustomer, deleteCustomer,
        products, addProduct, updateProduct, deleteProduct,
        currentUser, 
        login,
        logout,
        isAuthenticated,
        isLoaded 
    }}>
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
