'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { format } from 'date-fns';
import type { CompanyProfile, Sector, User, Appointment } from '@/lib/types';
import { companyProfile as initialCompanyProfileData } from '@/lib/company-profile';

const initialSectors: Sector[] = [
    { id: 'sec_1', name: 'Administrativo'},
    { id: 'sec_2', name: 'Comercial'},
    { id: 'sec_3', name: 'Técnico'},
    { id: 'sec_4', name: 'Financeiro'},
];

const initialUsers: User[] = [
    { id: 'user_1', name: 'Admin', email: 'admin@vendaspro.com', whatsapp: '5511999999999', sectorIds: ['sec_1'] }
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
        assignedTo: 'user:user_1',
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
  isLoaded: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const generateId = (prefix: string) => `${prefix}_${new Date().getTime()}`;

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(initialCompanyProfileData);
  const [sectors, setSectors] = useState<Sector[]>(initialSectors);
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem('companyProfile');
      const savedSectors = localStorage.getItem('sectors');
      const savedUsers = localStorage.getItem('users');
      const savedAppointments = localStorage.getItem('appointments');
      
      if (savedProfile) {
        const parsedProfile = JSON.parse(savedProfile);
        setCompanyProfile({ ...initialCompanyProfileData, ...parsedProfile });
      }
      if (savedSectors) {
        const parsedSectors = JSON.parse(savedSectors);
        if (parsedSectors.length > 0) setSectors(parsedSectors);
      }
      if (savedUsers) {
        let parsedUsers = JSON.parse(savedUsers);
        if (parsedUsers.length > 0 && parsedUsers[0].sectorId !== undefined) {
            parsedUsers = parsedUsers.map((user: any) => ({
                ...user,
                sectorIds: user.sectorId ? [user.sectorId] : [],
                sectorId: undefined,
            }));
        }
        if (parsedUsers.length > 0) setUsers(parsedUsers);
      }
      if (savedAppointments) {
          const parsedAppointments = JSON.parse(savedAppointments);
          if(parsedAppointments.length > 0) setAppointments(parsedAppointments);
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
  }

  const handleSetAppointments = (newAppointments: Appointment[]) => {
    setAppointments(newAppointments);
    saveDataToLocalStorage('appointments', newAppointments);
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
  const addUser = (user: Omit<User, 'id'>) => {
      const newUser: User = { id: generateId('user'), ...user };
      handleSetUsers([...users, newUser]);
  }

  const updateUser = (user: User) => {
      handleSetUsers(users.map(u => u.id === user.id ? user : u));
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

  return (
    <SettingsContext.Provider value={{ 
        companyProfile, setCompanyProfile: handleSetProfile,
        sectors, addSector, deleteSector,
        users, addUser, updateUser, deleteUser,
        appointments, addAppointment, updateAppointment, deleteAppointment,
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
