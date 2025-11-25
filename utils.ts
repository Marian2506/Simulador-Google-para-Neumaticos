import { Transporter, SimulationParams, SimulationResult, AmortizationRow, TireModel } from './types';

// Financial Constants
const MAX_INCOME_RATIO = 0.35; // Installment cannot exceed 35% of monthly estimated income
const ANNUAL_BILLING_LIMIT_RATIO = 0.30; // Max loan amount is 30% of Annual Billing

export const TIRE_MODELS: TireModel[] = [
  { id: 't1', name: '315/80 R22.5', price: 300000 },
  { id: 't2', name: '295/80 R22.5', price: 350000 },
  { id: 't3', name: '385/65 R22.5', price: 400000 },
];

export const parseTransporterData = (rawData: string): Transporter[] => {
  const lines = rawData.trim().split('\n');
  const transporters: Transporter[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Expected format: NAME;CUIT;BILLING
    const parts = line.split(';');
    
    if (parts.length >= 3) {
      const name = parts[0].trim();
      const cuit = parts[1].trim();
      // Remove thousands separators if any, Replace comma with dot for float parsing
      let billingStr = parts[2].trim().replace(/\./g, '').replace(',', '.');
      
      const annualBilling = parseFloat(billingStr);

      if (!isNaN(annualBilling)) {
        transporters.push({
          id: cuit,
          name,
          cuit,
          annualBilling,
          // Critical User Rule: Max financing is 30% of Annual Billing
          maxCreditLimit: annualBilling * ANNUAL_BILLING_LIMIT_RATIO 
        });
      }
    }
  }
  
  return transporters;
};

export const calculateSimulation = (transporter: Transporter, params: SimulationParams): SimulationResult => {
  // Calculate Total Cost based on selected tires
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

  // --- LOGIC FOR 1 ANNUAL PAYMENT (Bullet) ---
  if (params.isAnnualPayment) {
    // For a single annual payment, we apply the TNA for the full year.
    // Interest = Loan * (TNA / 100)
    const interest = loanAmount * (params.interestRate / 100);
    const principal = loanAmount;
    const finalPayment = principal + interest;
    
    monthlyPayment = 0; // No monthly payment
    totalInterest = interest;
    totalPayment = downPaymentAmount + finalPayment;

    // We visualize this as a single row at Month 12
    amortizationSchedule.push({
      period: 12,
      periodLabel: 'Mes 12 (Pago Único)',
      payment: finalPayment,
      interest: interest,
      principal: principal,
      balance: 0
    });

  } 
  // --- LOGIC FOR MONTHLY PAYMENTS (French System) ---
  else {
    // Monthly Interest Rate
    const monthlyRate = (params.interestRate / 100) / 12;
    
    // French Amortization Formula: P = (PV * r) / (1 - (1 + r)^-n)
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
      
      // Fix floating point issues at end of term
      if (balance < 0) balance = 0;

      totalInterest += interest;
      
      amortizationSchedule.push({
        period: i,
        periodLabel: `Mes ${i}`,
        payment: monthlyPayment,
        interest,
        principal,
        balance
      });
    }
    totalPayment = downPaymentAmount + (monthlyPayment * params.months);
  }

  // Viability Check
  const monthlyIncome = transporter.annualBilling / 12;
  const maxLimit = transporter.maxCreditLimit || 0;
  
  let isViable = true;
  let viabilityMessage = "Financiación Aprobada";
  let riskRatio = 0;

  // Check 1: Annual Billing Limit (The 30% Rule)
  if (loanAmount > maxLimit) {
    isViable = false;
    viabilityMessage = `El monto a financiar excede el 30% de la Facturación Anual (${formatCurrency(maxLimit)}).`;
  } 
  
  // Check 2: Payment Capacity
  if (params.isAnnualPayment) {
    // For annual payment, check if the final payment exceeds reasonable cashflow (e.g. 2 months of income)
    // This is an arbitrary safety check for the simulator context
    riskRatio = (loanAmount + totalInterest) / transporter.annualBilling; // Ratio against total year
    // If the single payment is > 50% of annual billing, it's risky, but let's stick to the 30% rule primarily.
  } else {
    // Monthly payments
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
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

// Using the first ~50 entries provided by the user for the default state
export const DEFAULT_DATA = `MOYANO EDUARDO ALBERTO;20175312650;59833251,71
PICCIONI FERNANDO GABRIEL;20236590918;81334211,67
ISIDORI JUAN WALTER;20314168217;137175498,4
MARIN LUIS MIGUEL;20263693346;44095506,9796
QUEVEDO NATALIA SOLEDAD;27363724278;282280813,9
SANTORI LAUTARO MARTIN;20407520840;39274832,19
KURZ JAVIER GERMAN;20175188844;135544003,86
TRANS-CEREAL SOCIEDAD ANONIMA;30707974237;614009412,53
PEREZ CARLOS GUILLERMO;20181282976;20219171,3
TRANSPORTE LOS HERMANOS S.A.S.;30716628538;9577108,71
BARALE YANINA ELIZABETH;23243033624;9800687,13
LOGISTICA SALTO S. CAP I SECC IV;30717476278;30386663,3956
TORRES ROMINA CELESTE;23284862104;7470304,05
ECHEVARRIA JORGE LUJAN;20304162199;24457581,95
BALLEJOS RICARDO DARIO;20298108837;1286053,34
CAMINOS AL PUERTO S.R.L.;30714884421;1350162003,89
ASTUDIANO GERARDO LUIS;20237446217;9517475,22
GENTA MIGUEL;20222738823;13673827,87
ALBANO ROBERTO FABIAN;20250090081;64200185,7092
GELMINI ARIEL DAMIAN;20289217828;98715396,33
VILLALBA FRANCISCO RICARDO;20166452059;11254535,63
DULCE MARCOS DAVID;20285809550;74558630,63
TRANSPORTE DON VICTOR S.A.;33715694609;11588719,75
MAURIZIO JORGE MARIO;20260150805;59050196,15
ALMANDOZ JUAN JOSE;20323894893;107758662,05
GONZALEZ CRISTIAN HERNAN;20251734179;24189186,47
SERVETTO EMILSE SOLEDAD;27310978995;32862322,24
MUNT JORGE ALBERTO;23160529199;36746419,85
PICCIONI PABLO ANDRES;20236590187;37145608,43
AMAYA JORGE OMAR;20287341106;17376121,4024
OVIEDO JORGE ALEJANDRO;20263623844;36725201,26
AGUSTO FEDERICO MAXIMO;20371229656;29772854,65
TRANSPORTE PICCA SRL;30716414279;693749874,55
LUCARINI RAMIRO RAFAEL;20343806990;96566909,6744
REGNICOLI JONATHAN JESUS;20364792396;30373596,66
MEDINA RICARDO DAMIAN;20227645564;127352145,98
DALMASSO EDUARDO DIEGO;20160182629;2782602,36
LA  GAMA S.A.S.;30716511606;7403432,11
GAIDO BRIAN LUCIANO;20396130581;34134260,93
TALIANI DAVID EGIDIO;20244901833;44042445,15
CRETTINO ALEJANDRO JOSE;20171112991;47755131,95
DI BELLE SANTIAGO RAUL;20289822748;53897689,35
OLIVA DANIEL GUSTAVO;20250675942;28244042,72
CONRERO ROGELIO PEDRO;20076430889;23899317,56
FERREYRA JULIO BERNABE;20268709909;113073490,86
HUBELI BETINA INES;27266095665;331988621,22
CHIRINO CLAUDIO DANIEL;20266070803;86780887,77
CAFFARATTI MARIA TERESA;27308132728;23880269,6
DE JORGE DANIEL MARCELO;20221915659;3432985,6541
ALBOCAMPO  S A;30678227915;8067310,86`;