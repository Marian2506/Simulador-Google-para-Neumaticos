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
  const COLORS = ['#3b82f6', '#64748b'];

  const maxLimit = transporter.maxCreditLimit || 0;
  const loanAmount = result.loanAmount;
  const limitUsagePercent = (loanAmount / maxLimit) * 100;
  const isLimitExceeded = loanAmount > maxLimit;

  const generateConfirmationPDF = () => {
    try {
      const doc = new jsPDF();
      const primaryColor = [59, 130, 246] as [number, number, number];
      const darkColor = [15, 23, 42] as [number, number, number];
      const lightGray = [241, 245, 249] as [number, number, number];

      doc.setFillColor(...darkColor);
      doc.rect(0, 0, 210, 40, 'F');
      
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

      doc.setFontSize(12);
      doc.setTextColor(...primaryColor);
      doc.text("1. DATOS DEL TRANSPORTISTA", 14, 50);
      
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
        styles: { fontSize: 10, cellPadding: 1.5, textColor: [50, 50, 50] },
        columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 'auto' } }
      });

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
        headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
        bodyStyles: { textColor: [50, 50, 50], halign: 'center' },
        columnStyles: { 0: { halign: 'left' }, 2: { halign: 'right' }, 3: { halign: 'right', fontStyle: 'bold' } },
        alternateRowStyles: { fillColor: lightGray }
      });

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
        styles: { fontSize: 10, cellPadding: 3, lineColor: [200, 200, 200] },
        columnStyles: { 0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 80 }, 1: { halign: 'right' } },
        didParseCell: function (data) {
          if (data.row.index === 4 && data.column.index === 1) {
            if (result.isViable) {
              data.cell.styles.textColor = [22, 163, 74];
              data.cell.styles.fontStyle = 'bold';
            } else {
              data.cell.styles.textColor = [220, 38, 38];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      });

      finalY = (doc as any).lastAutoTable.finalY + 15;
      doc.setFillColor(245, 245, 245);
      doc.setDrawColor(220, 220, 220);
      doc.roundedRect(1