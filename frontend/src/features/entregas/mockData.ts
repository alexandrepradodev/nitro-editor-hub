export type DeliveryType = "VSL" | "Lead" | "ML" | "Troca" | "Upsell";
export type DeliveryStatus = "Avaliado" | "Pendente" | "Fallback" | "Fixo";

export type Editor = {
  id: string;
  name: string;
  initials: string;
  role: string;
  isActive: boolean;
  colorClass: string;
  salaryFixed?: number | null;
  productionType?: string | null;
};

export type Delivery = {
  id: string;
  index: number;
  type: DeliveryType;
  editorIds: string[];
  date: string;
  kpiTotal: number | null;
  bonus: number;
  status: DeliveryStatus;
};
