export type CompanyProfile = {
  name: string;
  email: string;
  phone: string;
  address: string;
  logoUrl?: string;
};

export const companyProfile: CompanyProfile = {
  name: "Sua Empresa de CRM",
  email: "contato@suaempresa.com",
  phone: "(XX) XXXX-XXXX",
  address: "Sua Rua, 123, Sua Cidade - UF",
  logoUrl: "https://picsum.photos/seed/logo/150/50",
};
