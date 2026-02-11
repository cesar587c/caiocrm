export type CompanyProfile = {
  name: string;
  email: string;
  phone: string;
  address: string;
  logoUrl?: string;
};

export type Sector = {
  id: string;
  name: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  whatsapp?: string;
  sectorIds: string[];
};
