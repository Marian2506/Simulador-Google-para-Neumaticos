import React, { useState, useMemo } from 'react';
import { Transporter } from '../types';
import { Search, Users, DollarSign, ChevronRight, FileUp } from 'lucide-react';
import { formatCurrency } from '../utils';

interface TransporterListProps {
  transporters: Transporter[];
  onSelect: (t: Transporter) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const TransporterList: React.FC<TransporterListProps> = ({ transporters, onSelect, onFileUpload }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredList = useMemo(() => {
    if (!searchTerm) return transporters.slice(0, 50); // Limit for performance if empty
    const lowerTerm = searchTerm.toLowerCase();
    return transporters.filter(t => 
      t.name.toLowerCase().includes(lowerTerm) || 
      t.cuit.includes(lowerTerm)
    );
  }, [transporters, searchTerm]);

  return (
    <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden flex flex-col h-full">
      <div className="p-5 border-b border-slate-100 bg-slate-50">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-blue-600" />
          Nómina de Transportistas
        </h2>
        
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por nombre o CUIT..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Mostrando {filteredList.length} de {transporters.length}</span>
            <label className="cursor-pointer flex items-center gap-1 hover:text-blue-600 transition-colors">
              <FileUp className="w-3 h-3" />
              <span className="underline">Cargar CSV completo</span>
              <input 
                type="file" 
                accept=".csv,.txt" 
                className="hidden" 
                onChange={onFileUpload}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="overflow-y-auto flex-1 p-2 space-y-2 custom-scrollbar">
        {filteredList.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            No se encontraron resultados
          </div>
        ) : (
          filteredList.map((t) => (
            <div
              key={t.id}
              onClick={() => onSelect(t)}
              className="group p-3 rounded-lg border border-transparent hover:border-blue-200 hover:bg-blue-50 cursor-pointer transition-all duration-200"
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-semibold text-slate-700 group-hover:text-blue-700 text-sm line-clamp-1">
                  {t.name}
                </span>
                <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                  {t.cuit}
                </span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <div className="flex items-center text-xs text-slate-500 gap-1">
                  <DollarSign className="w-3 h-3" />
                  Fact. Anual:
                </div>
                <span className="text-sm font-medium text-emerald-600">
                  {formatCurrency(t.annualBilling)}
                </span>
              </div>
              <div className="flex justify-end mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs text-blue-600 flex items-center font-medium">
                  Simular <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};