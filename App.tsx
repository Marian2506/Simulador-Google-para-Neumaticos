import React, { useState, useEffect, useMemo } from 'react';
import { Transporter, SimulationParams, ContactInfo } from './types';
import { parseTransporterData, calculateSimulation, DEFAULT_DATA } from './utils';
import { SimulatorForm } from './components/SimulatorForm';
import { SimulationResultView } from './components/SimulationResultView';
import { Truck, Upload } from 'lucide-react';

// --- HELPER TO GENERATE PNG BASE64 LOGOS ---
// This ensures we have valid PNG data for the PDF generator, which fails with SVGs or external URLs.
const createTextLogo = (text1: string, color1: string, text2: string, color2: string): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  canvas.width = 200;
  canvas.height = 80;

  // Background (Transparent)
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Text Styles
  ctx.font = 'bold 50px Arial, sans-serif';
  ctx.textBaseline = 'middle';

  // Draw Part 1
  ctx.fillStyle = color1;
  ctx.fillText(text1, 10, 40);

  // Measure Part 1 to place Part 2
  const width1 = ctx.measureText(text1).width;

  // Draw Part 2
  ctx.fillStyle = color2;
  ctx.fillText(text2, 10 + width1, 40);

  return canvas.toDataURL('image/png');
};

function App() {
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [selectedTransporter, setSelectedTransporter] = useState<Transporter | null>(null);
  
  // Logos State (Generated on mount)
  const [logos, setLogos] = useState({ fate: '', giro: '', al2: '' });

  // Simulation State
  const [simParams, setSimParams] = useState<SimulationParams>({
    items: [],
    downPayment: 0,
    interestRate: 35,
    months: 12,
    isAnnualPayment: false
  });

  // Contact Info State
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    province: '',
    city: '',
    address: '',
    phone: '',
    email: ''
  });

  useEffect(() => {
    // Load default data
    const initialData = parseTransporterData(DEFAULT_DATA);
    setTransporters(initialData);

    // Generate Logos as PNG Base64 for PDF compatibility
    setLogos({
      fate: createTextLogo('Fate', '#000000', 'O', '#ce1126'),
      giro: createTextLogo('Giro', '#2a3088', '>', '#f9a825'), // Using > as arrow symbol representation
      al2: createTextLogo('AL', '#1e0876', '2', '#4ade80')
    });
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseTransporterData(text);
      setTransporters(parsed);
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    setSelectedTransporter(null);
    setSimParams({
      items: [],
      downPayment: 0,
      interestRate: 35,
      months: 12,
      isAnnualPayment: false
    });
    setContactInfo({
      province: '',
      city: '',
      address: '',
      phone: '',
      email: ''
    });
  };

  const result = selectedTransporter ? calculateSimulation(selectedTransporter, simParams) : null;

  return (
    <div className="min-h-screen font-sans pb-12 bg-[#0f172a]">
      
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 h-24 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-2.5 rounded-xl shadow-lg shadow-blue-900/20">
                <Truck className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">FinanTruck <span className="text-blue-500">Pro</span></h1>
                <p className="text-xs text-slate-400">Simulador de Financiación de Neumáticos</p>
              </div>
            </div>
          </div>

          {/* Logos Section - Now using the Generated PNGs */}
          <div className="hidden md:flex items-center gap-3 bg-white p-2 rounded-lg border border-white/10 shadow-inner">
             {logos.fate && (
               <div className="h-10 w-24 flex items-center justify-center overflow-hidden border-r border-slate-100 pr-2">
                  <img src={logos.fate} alt="FATE O" className="h-full w-full object-contain" />
               </div>
             )}
             {logos.giro && (
               <div className="h-10 w-24 flex items-center justify-center overflow-hidden border-r border-slate-100 px-2">
                  <img src={logos.giro} alt="GIRO" className="h-full w-full object-contain" />
               </div>
             )}
             {logos.al2 && (
               <div className="h-10 w-24 flex items-center justify-center overflow-hidden pl-2">
                  <img src={logos.al2} alt="AL2" className="h-full w-full object-contain" />
               </div>
             )}
          </div>
          
          <div className="flex items-center gap-4">
            <label className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition-colors border border-slate-700">
              <Upload className="w-4 h-4" />
              <span className="hidden lg:inline">Importar Nómina</span>
              <input 
                type="file" 
                accept=".csv,.txt" 
                className="hidden" 
                onChange={handleFileUpload}
              />
            </label>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-12 gap-8">
          
          {/* Left Column: Form */}
          <div className="lg:col-span-5">
            <SimulatorForm 
              allTransporters={transporters}
              selectedTransporter={selectedTransporter}
              onTransporterSelect={setSelectedTransporter}
              simParams={simParams}
              onSimParamsChange={setSimParams}
              contactInfo={contactInfo}
              onContactInfoChange={setContactInfo}
              onReset={handleReset}
            />
          </div>
          
          {/* Right Column: Results */}
          <div className="lg:col-span-7">
            {result && selectedTransporter ? (
              <div className="animate-fadeIn sticky top-24">
                <h2 className="text-2xl font-bold text-white mb-6 border-l-4 border-blue-500 pl-3">Resultados de la Simulación</h2>
                <SimulationResultView 
                   result={result} 
                   transporter={selectedTransporter} 
                   contactInfo={contactInfo} 
                   items={simParams.items}
                   logos={logos}
                />
              </div>
            ) : (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-slate-800/50 rounded-3xl border border-slate-700 border-dashed p-10 text-center">
                <div className="bg-slate-800 p-6 rounded-full mb-6 shadow-xl">
                  <Truck className="w-16 h-16 text-slate-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-400 mb-2">Esperando Datos</h3>
                <p className="text-slate-500 max-w-md">
                  Complete los datos del transportista en el formulario de la izquierda para generar una simulación de crédito.
                </p>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}

export default App;