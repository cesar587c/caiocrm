'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { CompanyProfile } from '@/lib/company-profile';
import { companyProfile as initialCompanyProfile } from '@/lib/company-profile';

interface SettingsContextType {
  companyProfile: CompanyProfile;
  setCompanyProfile: (profile: CompanyProfile) => void;
  isLoaded: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(initialCompanyProfile);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem('companyProfile');
      if (savedProfile) {
        setCompanyProfile(JSON.parse(savedProfile));
      }
    } catch (error) {
      console.error("Failed to load company profile from localStorage", error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const handleSetProfile = (profile: CompanyProfile) => {
    setCompanyProfile(profile);
    try {
      localStorage.setItem('companyProfile', JSON.stringify(profile));
    } catch (error) {
        console.error("Failed to save company profile to localStorage", error);
    }
  };

  return (
    <SettingsContext.Provider value={{ companyProfile, setCompanyProfile: handleSetProfile, isLoaded }}>
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
