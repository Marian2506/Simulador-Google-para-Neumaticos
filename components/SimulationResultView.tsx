import React from 'react';
import { SimulationResult, Transporter, ContactInfo, CartItem } from '../types';
import { formatCurrency, TIRE_MODELS } from '../utils';
import { CheckCircle, AlertOctagon, AlertTriangle, FileText, Download } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface SimulationResultViewProps {
  result: SimulationResult;
  transporter: Transporter;
  contactInfo: ContactInfo;
  items: CartItem[];
  logos?: { fate: string; giro: string; al2: string };
}

export const SimulationResultView: React.FC<SimulationResultViewProps> = ({ result, transporter, contactInfo, items, logos }) => {
  
  const pieData = [
    { name: 'Capital', value: result.totalPayment - result.totalInterest },
    { name: 'Interés', value: result.totalInterest },
  ];
  const COLORS = ['#3b82f6', '#64748b']; // Blue and Slate

  // Calculations for the 30% rule progress bar
  const maxLimit = transporter.maxCreditLimit || 0;
  const loanAmount = result.loanAmount;
  const limitUsagePercent = (loanAmount / maxLimit) * 100;
  const isLimitExceeded = loanAmount > maxLimit;

  // --- PDF GENERATION: CONFIRMATION (Full Data) ---
  const generateConfirmationPDF = () => {
    try {
      const doc = new jsPDF();
      const primaryColor = [59, 130, 246] as [number, number, number]; // Blue 500
      const darkColor = [15, 23, 42] as [number, number, number]; // Slate 900
      const lightGray = [241, 245, 249] as [number, number, number]; // Slate 100

      // -- Header Bar --
      doc.setFillColor(...darkColor);
      doc.rect(0, 0, 210, 40, 'F');
      
      // Add Logos to Header if available (using PNG data)
      if (logos) {
        if (logos.fate) doc.addImage(logos.fate, 'PNG', 140, 10, 20, 8);
        if (logos.giro) doc.addImage(logos.giro, 'PNG', 162, 10, 20, 8);
        if (logos.al2) doc.addImage(logos.al2, 'PNG', 184, 10, 15, 8);
      }

      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text("CONFIRMACIÓN DE CRÉDITO", 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(200, 200, 200);
      doc.text("Solicitud de Financiación de Neumáticos", 14, 28);
      doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString()}`, 14, 34);

      // -- Section: Client Data --
      doc.setFontSize(12);
      doc.setTextColor(...primaryColor);
      doc.text("1. DATOS DEL TRANSPORTISTA", 14, 50);
      
      // Create a cleaner table for client info
      autoTable(doc, {
        startY: 55,
        body: [
          [{ content: 'Razón Social:', styles: { fontStyle: 'bold' } }, transporter.name],
          [{ content: 'CUIT:', styles: { fontStyle: 'bold' } }, transporter.cuit],
          [{ content: 'Facturación Anual:', styles: { fontStyle: 'bold' } }, formatCurrency(transporter.annualBilling)],
          [{ content: 'Domicilio:', styles: { fontStyle: 'bold' } }, `${contactInfo.address}, ${contactInfo.city}, ${contactInfo.province}`],
          [{ content: 'Contacto:', styles: { fontStyle: 'bold' } }, `${contactInfo.phone} | ${contactInfo.email}`]
        ],
        theme: 'plain',
        styles: {
          fontSize: 10,
          cellPadding: 1.5,
          textColor: [50, 50, 50]
        },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 'auto' }
        }
      });

      // -- Section: Items --
      let finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.setTextColor(...primaryColor);
      doc.text("2. DETALLE DE LA COMPRA", 14, finalY);

      const cartData = items.map(item => {
        const tire = TIRE_MODELS.find(t => t.id === item.tireId);
        return [
          tire?.name || 'Unknown',
          item.quantity,
          formatCurrency(tire?.price || 0),
          formatCurrency((tire?.price || 0) * item.quantity)
        ];
      });

      autoTable(doc, {
        startY: finalY + 5,
        head: [['Modelo / Medida', 'Cant.', 'Precio Unitario', 'Subtotal']],
        body: cartData,
        theme: 'striped',
        headStyles: { 
          fillColor: primaryColor, 
          textColor: [255, 255, 255], 
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: { 
          textColor: [50, 50, 50],
          halign: 'center'
        },
        columnStyles: {
          0: { halign: 'left' }, // Model name left aligned
          2: { halign: 'right' }, // Prices right aligned
          3: { halign: 'right', fontStyle: 'bold' }
        },
        alternateRowStyles: {
          fillColor: lightGray
        }
      });

      // -- Section: Financial Plan --
      finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.setTextColor(...primaryColor);
      doc.text("3. PLAN DE FINANCIACIÓN", 14, finalY);

      const planRows = [
        ['Monto Total a Financiar', formatCurrency(result.loanAmount)],
        ['Plan Seleccionado', result.amortizationSchedule.length === 1 ? 'Pago Único Anual (Bullet)' : `${result.amortizationSchedule.length} Cuotas Mensuales (Sistema Francés)`],
        ['Valor de Cuota', formatCurrency(result.monthlyPayment)],
        ['Total a Pagar (Capital + Interés)', formatCurrency(result.totalPayment)],
        ['Estado de Solicitud', result.isViable ? 'PRE-APROBADO' : 'RECHAZADO']
      ];

      autoTable(doc, {
        startY: finalY + 5,
        body: planRows,
        theme: 'grid',
        styles: {
          fontSize: 10,
          cellPadding: 3,
          lineColor: [200, 200, 200]
        },
        columnStyles: {
          0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 80 },
          1: { halign: 'right' }
        },
        didParseCell: function (data) {
          if (data.row.index === 4 && data.column.index === 1) {
            if (result.isViable) {
              data.cell.styles.textColor = [22, 163, 74]; // Green
              data.cell.styles.fontStyle = 'bold';
            } else {
              data.cell.styles.textColor = [220, 38, 38]; // Red
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      });

      // -- Terms and Conditions Block --
      finalY = (doc as any).lastAutoTable.finalY + 15;
      
      // Background box for terms
      doc.setFillColor(245, 245, 245);
      doc.setDrawColor(220, 220, 220);
      doc.roundedRect(14, finalY, 182, 45, 3, 3, 'FD');

      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text("Términos y Condiciones", 18, finalY + 8);
      
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      const terms = "La presente simulación tiene carácter estimativo y no constituye una oferta vinculante ni aprobación definitiva de crédito. " +
      "El otorgamiento final del financiamiento está sujeto a la verificación de antecedentes comerciales, crediticios y a la aprobación por parte del comité de riesgos. " +
      "Los precios están sujetos a variación sin previo aviso hasta la confirmación de la orden de compra. " +
      "El transportista declara que los datos suministrados son veraces y autoriza la consulta de su estado financiero. " +
      "La tasa de interés informada (TNA) es fija para el período simulado.";
      
      const splitText = doc.splitTextToSize(terms, 174);
      doc.text(splitText, 18, finalY + 14);

      doc.save(`Confirmacion_${transporter.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 15)}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Hubo un error al generar el PDF. Por favor intente nuevamente.");
    }
  };

  // --- PDF GENERATION: QUOTE (Sales Focus) ---
  const generateQuotePDF = () => {
    try {
      const doc = new jsPDF();
      const blueColor = [37, 99, 235] as [number, number, number]; // Blue 600
      const slateColor = [30, 41, 59] as [number, number, number]; // Slate 800

      // -- Clean Modern Header --
      // Add Logos to Header if available
      if (logos) {
        if (logos.fate) doc.addImage(logos.fate, 'PNG', 140, 8, 20, 8);
        if (logos.giro) doc.addImage(logos.giro, 'PNG', 162, 8, 20, 8);
        if (logos.al2) doc.addImage(logos.al2, 'PNG', 184, 8, 15, 8);
      }

      doc.setFontSize(26);
      doc.setTextColor(...blueColor);
      doc.text("PRESUPUESTO", 14, 22);
      
      doc.setLineWidth(0.5);
      doc.setDrawColor(...blueColor);
      doc.line(14, 26, 196, 26);

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 196, 22, { align: 'right' });

      // -- Recipient Info --
      doc.setFontSize(11);
      doc.setTextColor(...slateColor);
      doc.text("PREPARADO PARA:", 14, 35);
      doc.setFontSize(12);
      doc.text(transporter.name, 14, 41);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(transporter.cuit, 14, 46);

      // -- Items Table --
      const cartData = items.map(item => {
        const tire = TIRE_MODELS.find(t => t.id === item.tireId);
        return [
          tire?.name || 'Unknown',
          item.quantity,
          formatCurrency(tire?.price || 0),
          formatCurrency((tire?.price || 0) * item.quantity)
        ];
      });

      // Calculate Total
      const total = items.reduce((acc, item) => {
        const tire = TIRE_MODELS.find(t => t.id === item.tireId);
        return acc + ((tire?.price || 0) * item.quantity);
      }, 0);

      autoTable(doc, {
        startY: 55,
        head: [['DESCRIPCIÓN', 'CANT.', 'PRECIO UNIT.', 'TOTAL']],
        body: [
          ...cartData,
          // Empty row for spacing
          ['', '', '', ''] 
        ],
        theme: 'plain',
        headStyles: { 
          fillColor: slateColor, 
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          textColor: [50, 50, 50],
          cellPadding: 4,
          halign: 'center'
        },
        columnStyles: {
          0: { halign: 'left', cellWidth: 'auto' },
          2: { halign: 'right' },
          3: { halign: 'right' }
        },
        // Custom Footer Row for Total
        didParseCell: function(data) {
          // Identify the last row (which we added manually as empty for spacing, let's replace it logic wise or just draw after)
        }
      });

      // Draw Total Manually for better control
      const finalY = (doc as any).lastAutoTable.finalY;
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text("TOTAL CONTADO", 140, finalY - 3);
      doc.setFontSize(14);
      doc.setTextColor(...slateColor);
      doc.text(formatCurrency(total), 196, finalY - 3, { align: 'right' });
      
      doc.setDrawColor(200, 200, 200);
      doc.line(14, finalY + 2, 196, finalY + 2);

      // -- Financing Option Highlight Box --
      const boxY = finalY + 15;
      
      // Background
      doc.setFillColor(239, 246, 255); // Blue 50
      doc.setDrawColor(191, 219, 254); // Blue 200
      doc.roundedRect(14, boxY, 182, 50, 3, 3, 'FD');
      
      // Icon circle (simulated)
      doc.setFillColor(...blueColor);
      doc.circle(24, boxY + 12, 4, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.text("$", 24, boxY + 13.5, { align: 'center' });

      // Title
      doc.setFontSize(12);
      doc.setTextColor(...slateColor);
      doc.text("OPCIÓN DE FINANCIACIÓN SUGERIDA", 32, boxY + 13);
      
      // Plan Details
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text("Plan:", 32, boxY + 25);
      
      doc.setFontSize(12);
      doc.setTextColor(...blueColor);
      const planText = result.amortizationSchedule.length === 1 
        ? "Pago Único Anual (12 meses)"
        : `${result.amortizationSchedule.length} Cuotas Mensuales`;
      doc.text(planText, 32, boxY + 32);

      // Installment Value
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text("Valor de Cuota:", 120, boxY + 25);
      
      doc.setFontSize(16);
      doc.setTextColor(...slateColor);
      doc.text(formatCurrency(result.monthlyPayment), 120, boxY + 34);

      // Disclaimer
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text("* Sujeto a aprobación crediticia y disponibilidad de stock al momento de la compra.", 14, boxY + 65);

      doc.save(`Cotizacion_${transporter.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 15)}.pdf`);
    } catch (error) {
      console.error("Error generating Quote PDF:", error);
      alert("Hubo un error al generar la Cotización. Por favor intente nuevamente.");
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Summary Card */}
      <div className={`p-6 rounded-xl border shadow-lg backdrop-blur-sm ${
        result.isViable 
          ? 'bg-emerald-950/40 border-emerald-700/50' 
          : 'bg-red-950/40 border-red-700/50'
      }`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h4 className={`text-xl font-bold ${result.isViable ? 'text-emerald-400' : 'text-red-400'}`}>
              {result.isViable ? 'Solicitud Pre-Aprobada' : 'Solicitud Rechazada'}
            </h4>
            <p className={`text-sm mt-1 font-medium ${result.isViable ? 'text-emerald-200' : 'text-red-200'}`}>
              {result.viabilityMessage}
            </p>
          </div>
          {result.isViable ? (
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          ) : (
            <AlertOctagon className="w-10 h-10 text-red-500" />
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Cuota {result.amortizationSchedule.length === 1 ? 'Anual' : 'Mensual'}</span>
            <div className="text-lg font-bold text-white">{formatCurrency(result.monthlyPayment)}</div>
          </div>
          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
             <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total a Financiar</span>
             <div className="text-lg font-bold text-blue-400">{formatCurrency(loanAmount)}</div>
          </div>
          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
             <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Pago Total</span>
             <div className="text-lg font-bold text-slate-200">{formatCurrency(result.totalPayment)}</div>
          </div>
        </div>
      </div>

      {/* 30% Annual Billing Rule Visualization */}
      <div className="bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700">
        <div className="flex justify-between items-end mb-3">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              Capacidad de Compra (30% Fact. Anual)
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Límite asignado: <strong className="text-slate-200">{formatCurrency(maxLimit)}</strong>
            </p>
          </div>
          <div className={`text-right ${isLimitExceeded ? 'text-red-400' : 'text-blue-400'}`}>
            <span className="text-2xl font-bold">{limitUsagePercent.toFixed(1)}%</span>
            <span className="text-xs font-medium block text-slate-400">del cupo utilizado</span>
          </div>
        </div>
        
        <div className="relative h-4 bg-slate-700 rounded-full overflow-hidden border border-slate-600">
          {/* Limit Marker */}
          <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-slate-500 z-10"></div>
          
          {/* Progress Bar */}
          <div 
            className={`h-full transition-all duration-500 ease-out ${
              isLimitExceeded ? 'bg-red-500' : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(limitUsagePercent, 100)}%` }}
          ></div>
        </div>
        
        {isLimitExceeded && (
          <div className="mt-3 flex items-center gap-2 text-red-400 text-xs font-medium bg-red-900/20 p-2 rounded-lg border border-red-900/30">
            <AlertTriangle className="w-4 h-4" />
            <span>El monto solicitado excede el límite operativo calculado sobre la facturación.</span>
          </div>
        )}
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Cost Breakdown Chart */}
        <div className="bg-slate-800 p-5 rounded-xl shadow-lg border border-slate-700">
          <h4 className="text-sm font-bold text-slate-300 mb-4 border-b border-slate-700 pb-2">Composición de Deuda</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                  formatter={(value: number) => formatCurrency(value)} 
                />
                <Legend wrapperStyle={{ color: '#cbd5e1' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ratio KPI */}
        <div className="bg-slate-800 p-5 rounded-xl shadow-lg border border-slate-700 flex flex-col justify-center space-y-6">
          <div>
            {result.amortizationSchedule.length === 1 ? (
                // Special KPI for Annual Payment
                <>
                  <h4 className="text-sm font-bold text-slate-300 mb-4 border-b border-slate-700 pb-2">Impacto Anual</h4>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-400">Facturación Anual</span>
                    <span className="font-medium text-slate-200">{formatCurrency(transporter.annualBilling)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-3">
                    <span className="text-slate-400">Pago Final (Capital + Int.)</span>
                    <span className="font-bold text-white">{formatCurrency(result.monthlyPayment)}</span>
                  </div>
                  <div className="p-3 bg-blue-900/20 rounded border border-blue-800 text-xs text-blue-200">
                    Este plan consiste en un único pago al finalizar el mes 12. El interés se calcula sobre el saldo total durante el período.
                  </div>
                </>
            ) : (
                // Standard KPI for Monthly Payments
                <>
                  <h4 className="text-sm font-bold text-slate-300 mb-4 border-b border-slate-700 pb-2">Relación Cuota / Ingreso</h4>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-400">Ingreso Mensual Estimado</span>
                    <span className="font-medium text-slate-200">{formatCurrency(transporter.annualBilling / 12)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-3">
                    <span className="text-slate-400">Cuota Proyectada</span>
                    <span className="font-bold text-white">{formatCurrency(result.monthlyPayment)}</span>
                  </div>
                  
                  <div className="relative pt-1">
                    <div className="flex mb-2 items-center justify-between">
                      <div className="text-right w-full">
                        <span className={`text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full ${
                          result.riskRatio > 0.35 ? 'text-red-200 bg-red-900/50' : 'text-emerald-200 bg-emerald-900/50'
                        }`}>
                          {(result.riskRatio * 100).toFixed(1)}% Impacto
                        </span>
                      </div>
                    </div>
                    <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-slate-700 border border-slate-600">
                      <div style={{ width: `${Math.min(result.riskRatio * 100, 100)}%` }} className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                        result.riskRatio > 0.35 ? 'bg-red-500' : 'bg-emerald-500'
                      }`}></div>
                    </div>
                  </div>
                </>
            )}
          </div>
        </div>
      </div>

      {/* PDF Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button 
          onClick={generateConfirmationPDF}
          className="flex items-center justify-center gap-2 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors shadow-lg shadow-blue-900/30"
        >
          <FileText className="w-5 h-5" />
          Descargar Confirmación (PDF)
        </button>
        <button 
          onClick={generateQuotePDF}
          className="flex items-center justify-center gap-2 py-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold transition-colors border border-slate-600"
        >
          <Download className="w-5 h-5" />
          Descargar Cotización (PDF)
        </button>
      </div>

      {/* Amortization Table (Preview) */}
      <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700 bg-slate-800 flex justify-between items-center">
          <h4 className="font-semibold text-slate-300 text-sm">Plan de Pagos {result.amortizationSchedule.length === 1 ? '(Pago Único)' : '(Sistema Francés)'}</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-400">
            <thead className="text-xs text-slate-300 uppercase bg-slate-700">
              <tr>
                <th className="px-6 py-3">Período</th>
                <th className="px-6 py-3">Pago</th>
                <th className="px-6 py-3">Interés</th>
                <th className="px-6 py-3">Capital</th>
                <th className="px-6 py-3">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {result.amortizationSchedule.map((row) => (
                <tr key={row.period} className="bg-slate-800 border-b border-slate-700 hover:bg-slate-700/50">
                  <td className="px-6 py-4 font-medium text-white">{row.periodLabel}</td>
                  <td className="px-6 py-4 font-medium text-emerald-400">{formatCurrency(row.payment)}</td>
                  <td className="px-6 py-4 text-slate-500">{formatCurrency(row.interest)}</td>
                  <td className="px-6 py-4">{formatCurrency(row.principal)}</td>
                  <td className="px-6 py-4 text-slate-500">{formatCurrency(row.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};