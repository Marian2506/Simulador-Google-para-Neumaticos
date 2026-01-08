import React, { useState, useEffect } from 'react';
import { Transporter, SimulationParams, ContactInfo } from './types';
import { parseTransporterData, calculateSimulation, DEFAULT_DATA_CSV } from './utils';
import { SimulatorForm } from './components/SimulatorForm';
import { SimulationResultView } from './components/SimulationResultView';
import { Truck, Upload, Info, Lock, Settings, UserCheck } from 'lucide-react';
import * as XLSX from 'xlsx';

// Función para generar logos con colores específicos de las marcas
const createBrandLogo = (name: string): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  canvas.width = 120;
  canvas.height = 60;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  if (name === 'ACA') {
    // Logo ACA Lookalike
    ctx.font = 'bold 30px Arial';
    ctx.fillStyle = '#1e3a8a'; // Azul oscuro
    ctx.fillText('ACA', 60, 30);
    ctx.strokeStyle = '#f97316'; // Naranja
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(60, 30, 25, 0, Math.PI * 2);
    ctx.stroke();
  } else if (name === 'AL2') {
    // Logo AL2 Lookalike
    ctx.font = 'bold 30px Arial';
    ctx.fillStyle = '#1e3a8a';
    ctx.fillText('AL', 45, 30);
    ctx.fillStyle = '#4ade80'; // Verde claro
    ctx.font = 'bold 35px Arial';
    ctx.fillText('2', 85, 25);
  }
  return canvas.toDataURL('image/png');
};

function App() {
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [selectedTransporter, setSelectedTransporter] = useState<Transporter | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [logos, setLogos] = useState({ aca: '', al2: '' });

  const [simParams, setSimParams] = useState<SimulationParams>({
    items: [],
    downPayment: 0,
    interestRate: 35, // Tasa default
    months: 12,
    isAnnualPayment: false
  });

  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    province: '',
    city: '',
    address: '',
    phone: '',
    email: ''
  });

  useEffect(() => {
    const rows = DEFAULT_DATA_CSV.split('\n').map(l => l.split(';'));
    setTransporters(parseTransporterData(rows));
    setLogos({
      aca: createBrandLogo('ACA'),
      al2: createBrandLogo('AL2')
    });
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      const parsed = parseTransporterData(jsonData as any[]);
      if (parsed.length > 0) {
        setTransporters(parsed);
        alert(`Éxito: ${parsed.length} transportistas importados.`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const toggleAdmin = () => {
    if (!isAdmin) {
      const pass = prompt("Ingrese contraseña de administrador:");
      if (pass === "admin123") {
        setIsAdmin(true);
      } else {
        alert("Contraseña incorrecta");
      }
    } else {
      setIsAdmin(false);
    }
  };

  const handleReset = () => {
    setSelectedTransporter(null);
    setSimParams(prev => ({ ...prev, items: [] }));
    setContactInfo({ province: '', city: '', address: '', phone: '', email: '' });
  };

  const result = selectedTransporter ? calculateSimulation(selectedTransporter, simParams) : null;

  return (
    <div className="min-h-screen pb-12 bg-[#0f172a] text-slate-200">
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-24 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-900/40">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white leading-none">FinanTruck <span className="text-blue-500">PRO</span></h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Gestión Fersi SA (AL2)</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6 px-6 py-2 bg-white/5 rounded-2xl border border-white/10">
            <img src={logos.aca} alt="ACA" className="h-10 w-auto" />
            <div className="w-px h-8 bg-slate-700" />
            <img src={logos.al2} alt="AL2" className="h-10 w-auto" />
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={toggleAdmin}
              className={`p-2.5 rounded-xl border transition-all ${isAdmin ? 'bg-amber-500/10 border-amber-500/50 text-amber-500' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
              title="Panel de Administración"
            >
              {isAdmin ? <UserCheck className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </button>
            <label className="cursor-pointer flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-all shadow-xl shadow-blue-900/40">
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Cargar Nómina</span>
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-6">
            <SimulatorForm 
              allTransporters={transporters}
              selectedTransporter={selectedTransporter}
              onTransporterSelect={setSelectedTransporter}
              simParams={simParams}
              onSimParamsChange={setSimParams}
              contactInfo={contactInfo}
              onContactInfoChange={setContactInfo}
              onReset={handleReset}
              isAdmin={isAdmin}
            />
          </div>
          
          <div className="lg:col-span-7">
            {result && selectedTransporter ? (
              <div className="animate-fadeIn">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-black text-white border-l-4 border-blue-500 pl-4">Propuesta de Financiación</h2>
                  {isAdmin && (
                    <div className="flex items-center gap-2 text-amber-500 text-xs font-bold bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20">
                      <Settings className="w-3 h-3" /> MODO ADMIN ACTIVO
                    </div>
                  )}
                </div>
                <SimulationResultView 
                   result={result} 
                   transporter={selectedTransporter} 
                   contactInfo={contactInfo} 
                   items={simParams.items}
                   logos={logos}
                   tna={simParams.interestRate}
                />
              </div>
            ) : (
              <div className="h-full min-h-[600px] flex flex-col items-center justify-center bg-slate-900/40 rounded-[2rem] border-2 border-slate-800 border-dashed p-12 text-center">
                <div className="relative mb-8">
                  <div className="absolute -inset-4 bg-blue-600/20 blur-3xl rounded-full"></div>
                  <Truck className="w-24 h-24 text-slate-800 relative z-10" />
                </div>
                <h3 className="text-2xl font-bold text-slate-300 mb-4">Inicie una simulación</h3>
                <p className="text-slate-500 max-w-sm mb-8 leading-relaxed">
                  Seleccione un transportista de la nómina, complete sus datos de contacto y elija los neumáticos para generar la propuesta comercial.
                </p>
                <div className="flex gap-4 items-center justify-center">
                   <img src={logos.aca} alt="ACA" className="h-12 opacity-20 grayscale" />
                   <img src={logos.al2} alt="AL2" className="h-12 opacity-20 grayscale" />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;