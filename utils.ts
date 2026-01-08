import { Transporter, SimulationParams, SimulationResult, AmortizationRow, TireModel } from './types';

const MAX_INCOME_RATIO = 0.35;
const ANNUAL_BILLING_LIMIT_RATIO = 0.30;

export const TIRE_MODELS: TireModel[] = [
  { id: 't1', name: '315/80 R22.5', price: 300000 },
  { id: 't2', name: '295/80 R22.5', price: 350000 },
  { id: 't3', name: '385/65 R22.5', price: 400000 },
];

export const parseTransporterData = (rawData: any[]): Transporter[] => {
  const transporters: Transporter[] = [];

  rawData.forEach(row => {
    // Si es un array (desde CSV/XLSX raw) o un objeto
    const values = Array.isArray(row) ? row : Object.values(row);
    
    if (values.length >= 3) {
      const name = String(values[0]).trim();
      const cuit = String(values[1]).trim();
      let billingRaw = values[2];
      
      let annualBilling = 0;
      if (typeof billingRaw === 'string') {
        annualBilling = parseFloat(billingRaw.replace(/\./g, '').replace(',', '.'));
      } else {
        annualBilling = Number(billingRaw);
      }

      if (!isNaN(annualBilling) && name && cuit) {
        transporters.push({
          id: cuit,
          name,
          cuit,
          annualBilling,
          maxCreditLimit: annualBilling * ANNUAL_BILLING_LIMIT_RATIO 
        });
      }
    }
  });
  
  return transporters;
};

// Generador de fechas simple (Hoy + 30*periodo días)
const getInstallmentDate = (period: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + (30 * period));
  return date.toLocaleDateString('es-AR');
};

export const calculateSimulation = (transporter: Transporter, params: SimulationParams): SimulationResult => {
  let totalCost = 0;
  params.items.forEach(item => {
    const tire = TIRE_MODELS.find(t => t.id === item.tireId);
    if (tire) {
      totalCost += tire.price * item.quantity;
    }
  });

  const downPaymentAmount = totalCost * (params.downPayment / 100);
  const loanAmount = totalCost - downPaymentAmount;
  
  const amortizationSchedule: AmortizationRow[] = [];
  let monthlyPayment = 0;
  let totalInterest = 0;
  let totalPayment = 0;

  if (params.isAnnualPayment) {
    const interest = loanAmount * (params.interestRate / 100);
    const principal = loanAmount;
    const finalPayment = principal + interest;
    
    monthlyPayment = 0;
    totalInterest = interest;
    totalPayment = downPaymentAmount + finalPayment;

    amortizationSchedule.push({
      period: 12,
      periodLabel: 'Mes 12 (Pago Único)',
      date: getInstallmentDate(12),
      payment: finalPayment,
      interest: interest,
      principal: principal,
      balance: 0
    });
  } else {
    const monthlyRate = (params.interestRate / 100) / 12;
    
    if (monthlyRate > 0) {
      monthlyPayment = (loanAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -params.months));
    } else {
      monthlyPayment = loanAmount / params.months;
    }

    let balance = loanAmount;

    for (let i = 1; i <= params.months; i++) {
      const interest = balance * monthlyRate;
      const principal = monthlyPayment - interest;
      balance -= principal;
      
      if (balance < 0) balance = 0;
      totalInterest += interest;
      
      amortizationSchedule.push({
        period: i,
        periodLabel: `Mes ${i}`,
        date: getInstallmentDate(i),
        payment: monthlyPayment,
        interest,
        principal,
        balance
      });
    }
    totalPayment = downPaymentAmount + (monthlyPayment * params.months);
  }

  const monthlyIncome = transporter.annualBilling / 12;
  const maxLimit = transporter.maxCreditLimit || 0;
  
  let isViable = true;
  let viabilityMessage = "Financiación Aprobada";
  let riskRatio = 0;

  if (loanAmount > maxLimit) {
    isViable = false;
    viabilityMessage = `El monto excede el 30% de la facturación anual permitida (${formatCurrency(maxLimit)}).`;
  } 
  
  if (!params.isAnnualPayment) {
    riskRatio = monthlyPayment / monthlyIncome;
    if (isViable && riskRatio > MAX_INCOME_RATIO) {
      isViable = false;
      viabilityMessage = `La cuota mensual excede el ${Math.round(MAX_INCOME_RATIO * 100)}% del ingreso mensual estimado.`;
    }
  }

  return {
    monthlyPayment: params.isAnnualPayment ? (loanAmount + totalInterest) : monthlyPayment,
    totalPayment,
    totalInterest,
    amortizationSchedule,
    isViable,
    viabilityMessage,
    riskRatio,
    loanAmount
  };
};

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

export const DEFAULT_DATA_CSV = `MOYANO EDUARDO ALBERTO;20175312650;59833251,71
PICCIONI FERNANDO GABRIEL;20236590918;81334211,67
ISIDORI JUAN WALTER;20314168217;137175498,4
MARIN LUIS MIGUEL;20263693346;44095506,97
QUEVEDO NATALIA SOLEDAD;27363724278;282280813,9`;
