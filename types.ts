export interface Transporter {
  id: string;
  name: string;
  cuit: string;
  annualBilling: number;
  maxCreditLimit?: number;
}

export interface ContactInfo {
  province: string;
  city: string;
  address: string;
  phone: string;
  email: string;
}

export interface TireModel {
  id: string;
  name: string;
  price: number;
}

export interface CartItem {
  tireId: string;
  quantity: number;
}

export interface SimulationParams {
  items: CartItem[];
  downPayment: number; // Percentage 0-100
  interestRate: number; // TNA
  months: number; // 3, 6, 12
  isAnnualPayment: boolean; // True if "1 cuota anual"
}

export interface AmortizationRow {
  period: number;
  periodLabel: string;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
}

export interface SimulationResult {
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
  amortizationSchedule: AmortizationRow[];
  isViable: boolean;
  viabilityMessage: string;
  riskRatio: number; // Payment / Monthly Income
  loanAmount: number;
}

export enum ViewState {
  SEARCH = 'SEARCH',
  SIMULATOR = 'SIMULATOR'
}