
import React, { useState, useRef } from 'react';
import { SimulationParams, Transporter, ContactInfo } from '../types';
// Added Truck and Lock to imports
import { Search, MapPin, Building2, Plus, Minus, Calendar, RotateCcw, ShieldCheck, Mail, Phone, Hash, Globe, Percent, Truck, Lock } from 'lucide-react';
import { formatCurrency, TIRE_MODELS } from '../utils';

interface SimulatorFormProps {
  allTransporters: Transporter[];
  selectedTransporter: Transporter | null;
  onTransporterSelect: (t: Transporter) => void;
  simParams: SimulationParams;
  onSimParamsChange: (params: SimulationParams) => void;
  contactInfo: ContactInfo;
  onContactInfoChange: (info: ContactInfo) => void;
  onReset: () => void;
  isAdmin: boolean;
}

export const SimulatorForm: React.FC<SimulatorFormProps> = ({ 
  allTransporters, 
  selectedTransporter, 
  onTransporterSelect,
  simParams, 
  onSimParamsChange,
  contactInfo,
  onContactInfoChange,
  onReset,
  isAdmin
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const updateCart = (tireId: string, change: number) => {
    const currentItems = [...simParams.items];
    const index = currentItems.findIndex(i => i.tireId === tireId);
    
    if (index >= 0) {
      const newQty = Math.max(0, currentItems[index].quantity + change);
      if (newQty === 0) currentItems.splice(index, 1);
      else currentItems[index].quantity = newQty;
    } else if (change > 0) {
      currentItems.push({ tireId, quantity: change });
    }
    onSimParamsChange({ ...simParams, items: currentItems });
  };

  const filteredTransporters = allTransporters.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || t.cuit.includes(searchTerm)
  ).slice(0, 8);

  const totalPurchase = simParams.items.reduce((acc, item) => {
    const tire = TIRE_MODELS.find(t => t.id === item.tireId);
    return acc + (tire ? tire.price * item.quantity : 0);
  }, 0);

  const maxLimit = selectedTransporter?.maxCreditLimit || 0;
  const isOverLimit = totalPurchase > maxLimit;

  return (
    <div className="space-y-6">
      {/* 1. DATOS DEL TRANSPORTISTA */}
      <section className="bg-slate-800 p-6 rounded-3xl border border-slate-700/50 shadow-xl space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
            <Building2 className="w-4 h-4" /> 1. Entidad y Contacto
          </h3>
          {selectedTransporter && (
            <button onClick={onReset} className="text-[10px] text-red-400 font-bold hover:underline flex items-center gap-1">
              <RotateCcw className="w-3 h-3" /> REINICIAR
            </button>
          )}
        </div>

        <div className="relative" ref={dropdownRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-600 transition-all text-sm"
              placeholder="Buscar transportista por nombre o CUIT..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setShowSuggestions(true); }}
            />
          </div>
          {showSuggestions && searchTerm.length > 1 && (
            <div className="absolute z-50 w-full mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-fadeIn">
              {filteredTransporters.map(t => (
                <div key={t.id} onClick={() => { onTransporterSelect(t); setSearchTerm(t.name); setShowSuggestions(false); }}
                  className="px-4 py-3 hover:bg-blue-600 cursor-pointer border-b border-slate-800 transition-colors">
                  <div className="font-bold text-white text-sm">{t.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">CUIT: {t.cuit} | Fact: {formatCurrency(t.annualBilling)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedTransporter && (
          <div className="grid grid-cols-2 gap-3 animate-fadeIn">
            <div className="col-span-2 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Provincia</label>
                  <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" 
                    placeholder="Ej: Santa Fe" value={contactInfo.province} onChange={e => onContactInfoChange({...contactInfo, province: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Localidad</label>
                  <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" 
                    placeholder="Ej: Rosario" value={contactInfo.city} onChange={e => onContactInfoChange({...contactInfo, city: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Dirección</label>
                <div className="relative">
                  <MapPin className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-600" />
                  <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-sm text-white" 
                    placeholder="Calle y N°" value={contactInfo.address} onChange={e => onContactInfoChange({...contactInfo, address: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-600" />
                    <input type="email" className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-sm text-white" 
                      placeholder="correo@ejemplo.com" value={contactInfo.email} onChange={e => onContactInfoChange({...contactInfo, email: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Teléfono</label>
                  <div className="relative">
                    <Phone className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-600" />
                    <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-sm text-white" 
                      placeholder="0341-..." value={contactInfo.phone} onChange={e => onContactInfoChange({...contactInfo, phone: e.target.value})} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 2. CONFIGURACIÓN ADMIN (TASA) */}
      {isAdmin && (
        <section className="bg-amber-500/5 p-6 rounded-3xl border border-amber-500/20 shadow-xl space-y-4 animate-fadeIn">
          <h3 className="text-sm font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
            <Lock className="w-4 h-4" /> Control Administrador
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Tasa Nominal Anual (TNA):</span>
              <span className="text-lg font-black text-amber-500">{simParams.interestRate}%</span>
            </div>
            <input 
              type="range" min="0" max="150" step="1" 
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              value={simParams.interestRate} 
              onChange={e => onSimParamsChange({ ...simParams, interestRate: parseInt(e.target.value) })}
            />
            <p className="text-[10px] text-amber-500/60 italic">Este control solo es visible para su perfil.</p>
          </div>
        </section>
      )}

      {/* 3. PRODUCTOS Y PLAZOS */}
      <section className="bg-slate-800 p-6 rounded-3xl border border-slate-700/50 shadow-xl space-y-6">
        <h3 className="text-sm font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
          <Truck className="w-4 h-4" /> 2. Selección de Productos
        </h3>
        
        <div className="space-y-3">
          {TIRE_MODELS.map(tire => {
            const qty = simParams.items.find(i => i.tireId === tire.id)?.quantity || 0;
            return (
              <div key={tire.id} className="flex items-center justify-between bg-slate-900/40 p-3.5 rounded-2xl border border-slate-700/50">
                <div>
                  <div className="text-sm font-bold text-white">{tire.name}</div>
                  <div className="text-[10px] text-emerald-400 font-bold">{formatCurrency(tire.price)} unit.</div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => updateCart(tire.id, -1)} disabled={qty === 0}
                    className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-white disabled:opacity-20">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-4 text-center font-black text-white">{qty}</span>
                  <button onClick={() => updateCart(tire.id, 1)}
                    className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className={`p-4 rounded-2xl border-2 transition-all ${isOverLimit ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-900 border-slate-700'}`}>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500 uppercase font-bold">Total Compra:</span>
            <span className={`text-xl font-black ${isOverLimit ? 'text-red-400' : 'text-white'}`}>{formatCurrency(totalPurchase)}</span>
          </div>
          {selectedTransporter && (
             <div className="mt-2 pt-2 border-t border-slate-800 flex justify-between items-center text-[10px]">
                <span className="text-slate-500">Capacidad Máxima (30%):</span>
                <span className={`font-bold ${isOverLimit ? 'text-red-400' : 'text-emerald-400'}`}>{formatCurrency(maxLimit)}</span>
             </div>
          )}
        </div>

        <div className="space-y-3">
          <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Plazo de Pago (Sistema Francés)</label>
          <div className="grid grid-cols-3 gap-2">
            {[3, 6, 12].map(m => (
              <button key={m} onClick={() => onSimParamsChange({ ...simParams, months: m })}
                className={`py-3 rounded-xl border-2 font-black transition-all text-xs flex flex-col items-center gap-1 ${simParams.months === m ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-900/20' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>
                <Calendar className="w-4 h-4" /> {m} MESES
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
