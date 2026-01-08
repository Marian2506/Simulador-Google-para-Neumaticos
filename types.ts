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
  downPayment: number;
  interestRate: number;
  months: number;
  isAnnualPayment: boolean;
}

export interface AmortizationRow {
  period: number;
  periodLabel: string;
  date: string;
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
  riskRatio: number;
  loanAmount: number;
}
