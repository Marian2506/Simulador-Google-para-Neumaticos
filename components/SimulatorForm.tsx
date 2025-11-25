import React, { useState, useEffect, useRef } from 'react';
import { SimulationParams, Transporter, ContactInfo, CartItem } from '../types';
import { Calculator, Truck, Percent, DollarSign, Search, MapPin, Phone, Mail, Building2, FileText, Plus, Minus, Calendar, RotateCcw } from 'lucide-react';
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
}

export const SimulatorForm: React.FC<SimulatorFormProps> = ({ 
  allTransporters, 
  selectedTransporter, 
  onTransporterSelect,
  simParams, 
  onSimParamsChange,
  contactInfo,
  onContactInfoChange,
  onReset
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clear local search term when transporter is deselected (reset)
  useEffect(() => {
    if (!selectedTransporter) {
      setSearchTerm('');
    }
  }, [selectedTransporter]);

  const handleSimChange = (key: keyof SimulationParams, value: string | number | boolean) => {
    onSimParamsChange({
      ...simParams,
      [key]: value
    });
  };

  const handleContactChange = (key: keyof ContactInfo, value: string) => {
    onContactInfoChange({
      ...contactInfo,
      [key]: value
    });
  };

  const updateCart = (tireId: string, change: number) => {
    const currentItem = simParams.items.find(i => i.tireId === tireId) || { tireId, quantity: 0 };
    const newQuantity = Math.max(0, currentItem.quantity + change);
    
    let newItems = [...simParams.items];
    const index = newItems.findIndex(i => i.tireId === tireId);
    
    if (index >= 0) {
      if (newQuantity === 0) {
        newItems.splice(index, 1);
      } else {
        newItems[index] = { ...newItems[index], quantity: newQuantity };
      }
    } else if (newQuantity > 0) {
      newItems.push({ tireId, quantity: newQuantity });
    }

    onSimParamsChange({ ...simParams, items: newItems });
  };

  const filteredTransporters = allTransporters.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.cuit.includes(searchTerm)
  ).slice(0, 10);

  const selectTransporter = (t: Transporter) => {
    onTransporterSelect(t);
    setSearchTerm(t.name);
    setShowSuggestions(false);
  };

  const calculateTotalPurchase = () => {
    return simParams.items.reduce((acc, item) => {
      const tire = TIRE_MODELS.find(t => t.id === item.tireId);
      return acc + (tire ? tire.price * item.quantity : 0);
    }, 0);
  };

  return (
    <div className="bg-slate-800 p-6 rounded-xl shadow-xl border border-slate-700 text-slate-100">
      
      {/* --- SECTION 1: CLIENT IDENTIFICATION (AUTO) --- */}
      <div className="mb-8 border-b border-slate-700 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-blue-400 flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Identificación del Transportista
          </h3>
          {selectedTransporter && (
            <button 
              onClick={onReset}
              className="flex items-center gap-1 text-xs font-medium text-red-400 hover:text-red-300 transition-colors px-3 py-1.5 rounded-lg border border-red-900/30 hover:bg-red-900/20"
            >
              <RotateCcw className="w-3 h-3" /> Nueva Simulación
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Search / Name Field */}
          <div className="col-span-1 md:col-span-2 relative" ref={dropdownRef}>
            <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">
              Razón Social (Búsqueda Automática)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-500"
                placeholder="Escriba el nombre del transportista..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
              />
            </div>
            
            {/* Autocomplete Dropdown */}
            {showSuggestions && searchTerm.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                {filteredTransporters.length > 0 ? (
                  filteredTransporters.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => selectTransporter(t)}
                      className="px-4 py-3 hover:bg-blue-600 cursor-pointer border-b border-slate-600 last:border-0 transition-colors"
                    >
                      <div className="font-medium text-white">{t.name}</div>
                      <div className="text-xs text-slate-300 flex justify-between mt-1">
                        <span>CUIT: {t.cuit}</span>
                        <span className="text-emerald-400">{formatCurrency(t.annualBilling)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-3 text-slate-400 text-sm">No se encontraron resultados</div>
                )}
              </div>
            )}
          </div>

          {/* Auto-populated Fields */}
          <div className="col-span-1">
            <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">
              N° de CUIT (Automático)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                <FileText className="w-4 h-4" />
              </span>
              <input
                type="text"
                readOnly
                className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-300 font-mono"
                value={selectedTransporter?.cuit || ''}
                placeholder="-"
              />
            </div>
          </div>

          <div className="col-span-1">
            <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">
              Facturación Anual (Automático)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500">
                <DollarSign className="w-4 h-4" />
              </span>
              <input
                type="text"
                readOnly
                className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-emerald-900/30 text-emerald-400 font-bold rounded-lg"
                value={selectedTransporter ? formatCurrency(selectedTransporter.annualBilling) : ''}
                placeholder="-"
              />
            </div>
          </div>
        </div>
      </div>

      {/* --- SECTION 2: CONTACT DATA (MANUAL) --- */}
      <div className="mb-8 border-b border-slate-700 pb-6">
        <h3 className="text-lg font-bold text-blue-400 mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Datos de Contacto y Ubicación
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-1">
            <label className="block text-xs font-medium text-slate-400 mb-1">Provincia</label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-white"
              value={contactInfo.province}
              onChange={(e) => handleContactChange('province', e.target.value)}
            />
          </div>
          <div className="col-span-1">
            <label className="block text-xs font-medium text-slate-400 mb-1">Ciudad / Localidad</label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-white"
              value={contactInfo.city}
              onChange={(e) => handleContactChange('city', e.target.value)}
            />
          </div>
          <div className="col-span-1 md:col-span-2">
            <label className="block text-xs font-medium text-slate-400 mb-1">Calle y Número</label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-white"
              value={contactInfo.address}
              onChange={(e) => handleContactChange('address', e.target.value)}
            />
          </div>
          <div className="col-span-1">
            <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
              <Phone className="w-3 h-3" /> Teléfono
            </label>
            <input
              type="tel"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-white"
              value={contactInfo.phone}
              onChange={(e) => handleContactChange('phone', e.target.value)}
            />
          </div>
          <div className="col-span-1">
            <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
              <Mail className="w-3 h-3" /> Email
            </label>
            <input
              type="email"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-white"
              value={contactInfo.email}
              onChange={(e) => handleContactChange('email', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* --- SECTION 3: TIRE SELECTOR & FINANCING --- */}
      <div>
        <h3 className="text-lg font-bold text-blue-400 mb-4 flex items-center gap-2">
          <Truck className="w-5 h-5" />
          Selección de Neumáticos y Financiación
        </h3>

        {/* Tire Models Grid */}
        <div className="space-y-3 mb-6">
          <div className="grid grid-cols-12 gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider px-2">
            <div className="col-span-5">Medida / Modelo</div>
            <div className="col-span-3 text-right">Precio Un.</div>
            <div className="col-span-4 text-center">Cantidad</div>
          </div>
          
          {TIRE_MODELS.map((tire) => {
            const qty = simParams.items.find(i => i.tireId === tire.id)?.quantity || 0;
            return (
              <div key={tire.id} className="grid grid-cols-12 gap-2 items-center bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                <div className="col-span-5">
                  <div className="text-sm font-bold text-white">{tire.name}</div>
                </div>
                <div className="col-span-3 text-right">
                  <div className="text-sm text-emerald-400">{formatCurrency(tire.price)}</div>
                </div>
                <div className="col-span-4 flex justify-center items-center gap-3">
                  <button 
                    onClick={() => updateCart(tire.id, -1)}
                    className="p-1 bg-slate-700 hover:bg-slate-600 rounded text-white disabled:opacity-50"
                    disabled={qty <= 0}
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center font-bold text-white">{qty}</span>
                  <button 
                    onClick={() => updateCart(tire.id, 1)}
                    className="p-1 bg-blue-600 hover:bg-blue-500 rounded text-white"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
          
          <div className="flex justify-between items-center pt-3 border-t border-slate-700 mt-2">
            <span className="text-sm text-slate-400">Total Compra:</span>
            <span className="text-lg font-bold text-white">{formatCurrency(calculateTotalPurchase())}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Interest Rate - Occupies full width on mobile or 1 col on desktop */}
          <div className="col-span-1">
            <label className="block text-xs font-medium text-slate-400 mb-1 uppercase">
              Tasa Nominal Anual (TNA %)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                <Percent className="w-3 h-3" />
              </span>
              <input
                type="number"
                min="0"
                className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-white"
                value={simParams.interestRate}
                onChange={(e) => handleSimChange('interestRate', parseFloat(e.target.value))}
              />
            </div>
          </div>
          
          {/* Empty spacer or another field if needed */}
          <div className="hidden md:block col-span-1"></div>

          {/* Term */}
          <div className="col-span-1 md:col-span-2">
            <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">
              Sistema de Amortización (Plazo)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[3, 6, 12].map(m => (
                <button
                  key={m}
                  onClick={() => {
                    // Fix: Update both properties in a single object to prevent state race conditions
                    onSimParamsChange({
                      ...simParams,
                      months: m,
                      isAnnualPayment: false
                    });
                  }}
                  className={`py-3 rounded-lg border text-sm font-medium transition-all flex flex-col items-center justify-center gap-1 ${
                    simParams.months === m && !simParams.isAnnualPayment
                      ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-900/50'
                      : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  {m} Cuotas
                </button>
              ))}
              
              {/* Annual Option */}
              <button
                onClick={() => {
                   onSimParamsChange({
                      ...simParams,
                      months: 12,
                      isAnnualPayment: true
                    });
                }}
                className={`py-3 rounded-lg border text-sm font-medium transition-all flex flex-col items-center justify-center gap-1 ${
                  simParams.isAnnualPayment
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-900/50'
                    : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                1 Cuota Anual
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};