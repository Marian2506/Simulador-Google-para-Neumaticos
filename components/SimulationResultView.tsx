import React from 'react';
import { SimulationResult, Transporter, ContactInfo, CartItem } from '../types';
import { formatCurrency, TIRE_MODELS } from '../utils';
import { CheckCircle, AlertOctagon, Download, TrendingUp, Calendar, ShieldAlert } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface SimulationResultViewProps {
  result: SimulationResult;
  transporter: Transporter;
  contactInfo: ContactInfo;
  items: CartItem[];
  logos?: { aca: string; al2: string };
  tna: number;
}

export const SimulationResultView: React.FC<SimulationResultViewProps> = ({ result, transporter, contactInfo, items, logos, tna }) => {
  const pieData = [
    { name: 'Capital', value: result.loanAmount },
    { name: 'Intereses', value: result.totalInterest },
  ];
  const COLORS = ['#3b82f6', '#1e293b'];

  const generatePDF = () => {
    try {
      const doc = new jsPDF();
      const blue = [30, 58, 138] as [number, number, number];
      const orange = [249, 115, 22] as [number, number, number];

      // Cabecera con logos
      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, 210, 45, 'F');
      
      if (logos?.aca) doc.addImage(logos.aca, 'PNG', 10, 10, 30, 15);
      if (logos?.al2) doc.addImage(logos.al2, 'PNG', 160, 10, 35, 15);

      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text("COTIZACIÓN DE CRÉDITO", 50, 25);
      
      doc.setFontSize(9);
      doc.text(`Solicitante: ${transporter.name.toUpperCase()}`, 10, 55);
      doc.text(`CUIT: ${transporter.cuit} | Fecha: ${new Date().toLocaleDateString()}`, 10, 60);
      doc.text(`Ubicación: ${contactInfo.address}, ${contactInfo.city}, ${contactInfo.province}`, 10, 65);
      doc.text(`Contacto: ${contactInfo.email} | ${contactInfo.phone}`, 10, 70);

      // Tabla de Productos
      doc.setTextColor(...blue);
      doc.setFontSize(12);
      doc.text("Detalle de Compra", 10, 80);
      
      autoTable(doc, {
        startY: 85,
        head: [['Producto', 'Cantidad', 'Precio Unit.', 'Subtotal']],
        body: items.map(item => {
          const tire = TIRE_MODELS.find(t => t.id === item.tireId);
          return [
            tire?.name || '',
            item.quantity,
            formatCurrency(tire?.price || 0),
            formatCurrency((tire?.price || 0) * item.quantity)
          ];
        }),
        theme: 'grid',
        headStyles: { fillColor: blue }
      });

      // Resumen Financiero
      const finalY = (doc as any).lastAutoTable.finalY + 15;
      doc.text("Resumen de Financiación", 10, finalY);
      
      autoTable(doc, {
        startY: finalY + 5,
        body: [
          ['Monto a Financiar', formatCurrency(result.loanAmount)],
          ['Tasa Nominal Anual (TNA)', `${tna}%`],
          ['Cantidad de Cuotas', `${result.amortizationSchedule.length}`],
          ['Cuota Mensual Fija', formatCurrency(result.monthlyPayment)],
          ['Costo Total de Financiación', formatCurrency(result.totalPayment)]
        ],
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 } }
      });

      // Cronograma
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Cuota', 'Vencimiento', 'Interés', 'Capital', 'Total Cuota']],
        body: result.amortizationSchedule.map(row => [
          row.period,
          row.date,
          formatCurrency(row.interest),
          formatCurrency(row.principal),
          formatCurrency(row.payment)
        ]),
        theme: 'striped',
        headStyles: { fillColor: [71, 85, 105] }
      });

      // Leyenda Legal Obligatoria
      const footerY = (doc as any).lastAutoTable.finalY + 20;
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      const legalText = "IMPORTANTE: La Presente Oferta no es Vinculante, ya que sera Evaluada por Fersi SA (AL2) y estara Sujeta a la aplicacion de criterios de expertos de las areas de Administracion y seguimiento y a las Normas de Politica Crediticia Vigentes y establecidas por el BCRA, cuyo resultado sera la aprobacion, la exclusion o rechazo del cliente para la operacion digital de que se trate.";
      const splitText = doc.splitTextToSize(legalText, 180);
      doc.text(splitText, 15, footerY);

      doc.save(`Cotizacion_FersiSA_${transporter.cuit}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Error al generar PDF");
    }
  };

  return (
    <div className="space-y-6">
      <div className={`p-6 rounded-[2rem] border-2 flex items-center gap-5 transition-all ${result.isViable ? 'bg-emerald-500/10 border-emerald-500/20 shadow-lg shadow-emerald-900/20' : 'bg-red-500/10 border-red-500/20 shadow-lg shadow-red-900/20'}`}>
        <div className={`p-3 rounded-2xl ${result.isViable ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
           {result.isViable ? <CheckCircle className="w-8 h-8" /> : <AlertOctagon className="w-8 h-8" />}
        </div>
        <div>
          <h4 className={`text-xl font-black ${result.isViable ? 'text-emerald-400' : 'text-red-400'}`}>
            {result.isViable ? 'Propuesta Viable' : 'Riesgo Elevado'}
          </h4>
          <p className="text-sm text-slate-400 leading-tight">{String(result.viabilityMessage)}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-slate-800 p-8 rounded-[2rem] border border-slate-700/50 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingUp className="w-24 h-24 text-white" />
          </div>
          <div className="relative z-10 space-y-6">
            <div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Cuota Mensual Fija</span>
              <div className="text-5xl font-black text-white mt-1">{formatCurrency(result.monthlyPayment)}</div>
            </div>
            <div className="flex items-center gap-4 pt-6 border-t border-slate-700/50">
               <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Total Financiado</span>
                  <div className="text-lg font-bold text-slate-200">{formatCurrency(result.loanAmount)}</div>
               </div>
               <div className="w-px h-10 bg-slate-700" />
               <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Devolución Final</span>
                  <div className="text-lg font-bold text-blue-400">{formatCurrency(result.totalPayment)}</div>
               </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-[2rem] border border-slate-700/50 flex flex-col items-center justify-center">
          <div className="w-full h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={8} dataKey="value">
                   {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} stroke="none" />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-6 mt-4">
             <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500" /> <span className="text-[10px] font-bold text-slate-400 uppercase">Capital</span></div>
             <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-900" /> <span className="text-[10px] font-bold text-slate-400 uppercase">Interés</span></div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 rounded-3xl border border-slate-800 overflow-hidden">
        <div className="px-6 py-4 bg-slate-800/50 flex justify-between items-center border-b border-slate-800">
           <h3 className="text-xs font-black text-slate-300 flex items-center gap-2 uppercase tracking-widest">
             <Calendar className="w-4 h-4 text-blue-500" /> Cronograma de Vencimientos
           </h3>
           <span className="text-[10px] text-slate-500 font-mono">TNA: {tna}%</span>
        </div>
        <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-600 uppercase font-black sticky top-0">
              <tr>
                <th className="px-6 py-3">Fecha</th>
                <th className="px-6 py-3 text-center">Cuota</th>
                <th className="px-6 py-3 text-right">Monto</th>
                <th className="px-6 py-3 text-right">Interés</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {result.amortizationSchedule.map(row => (
                <tr key={row.period} className="hover:bg-blue-600/5">
                  <td className="px-6 py-4 text-slate-300 font-medium">{row.date}</td>
                  <td className="px-6 py-4 text-center text-slate-500">{row.period}</td>
                  <td className="px-6 py-4 text-right font-black text-white">{formatCurrency(row.payment)}</td>
                  <td className="px-6 py-4 text-right text-slate-600">{formatCurrency(row.interest)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-2xl flex gap-3 items-start">
         <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
         <p className="text-[10px] text-amber-500/80 leading-relaxed italic">
           La presente oferta no es vinculante. Sujeta a aprobación crediticia por Fersi SA (AL2) bajo normas vigentes del BCRA.
         </p>
      </div>

      <button 
        onClick={generatePDF}
        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-[2rem] shadow-2xl shadow-blue-900/40 transition-all flex items-center justify-center gap-3 active:scale-95 group"
      >
        <Download className="w-6 h-6 group-hover:translate-y-1 transition-transform" />
        DESCARGAR PROPUESTA COMERCIAL
      </button>
    </div>
  );
};