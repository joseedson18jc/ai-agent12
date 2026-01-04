import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DreKpis } from '@/types/finance';
import { formatCurrency } from '@/utils/finance';

interface PdfExportProps {
  dreByMonth: Record<string, DreKpis>;
  sortedMonths: string[];
  aiInsight: string | null;
  selectedCostCenter: string;
}

export const PdfExport = ({ 
  dreByMonth, 
  sortedMonths, 
  aiInsight,
  selectedCostCenter 
}: PdfExportProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const exportToPdf = async () => {
    setIsExporting(true);
    
    try {
      const doc = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Header
      doc.setFillColor(20, 20, 20);
      doc.rect(0, 0, pageWidth, 35, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('INSIGHT FINANCE', 15, 20);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Relatório DRE - Demonstração do Resultado do Exercício', 15, 28);
      
      doc.setFontSize(10);
      doc.text(`Centro de Custo: ${selectedCostCenter === 'all' ? 'Consolidado' : selectedCostCenter}`, pageWidth - 15, 20, { align: 'right' });
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - 15, 28, { align: 'right' });

      // KPI Summary
      if (sortedMonths.length > 0) {
        const lastMonth = sortedMonths[sortedMonths.length - 1];
        const currentDre = dreByMonth[lastMonth];
        
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('RESUMO EXECUTIVO', 15, 50);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        const kpiY = 58;
        const kpiWidth = 85;
        
        // Receita Líquida
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(15, kpiY, kpiWidth, 25, 3, 3, 'F');
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text('RECEITA LÍQUIDA', 20, kpiY + 8);
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text(formatCurrency(currentDre.revenueNet), 20, kpiY + 18);
        
        // EBITDA
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(105, kpiY, kpiWidth, 25, 3, 3, 'F');
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'normal');
        doc.text('EBITDA', 110, kpiY + 8);
        doc.setFontSize(14);
        doc.setTextColor(34, 139, 34);
        doc.setFont('helvetica', 'bold');
        doc.text(formatCurrency(currentDre.ebitda), 110, kpiY + 18);
        
        // Lucro Líquido
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(195, kpiY, kpiWidth, 25, 3, 3, 'F');
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'normal');
        doc.text('LUCRO LÍQUIDO', 200, kpiY + 8);
        doc.setFontSize(14);
        doc.setTextColor(currentDre.netIncome >= 0 ? 0 : 200, currentDre.netIncome >= 0 ? 100 : 0, currentDre.netIncome >= 0 ? 200 : 0);
        doc.setFont('helvetica', 'bold');
        doc.text(formatCurrency(currentDre.netIncome), 200, kpiY + 18);
      }

      // DRE Table
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('DRE MENSAL DETALHADO', 15, 95);
      
      const tableData = sortedMonths.map(month => {
        const dre = dreByMonth[month];
        return [
          month,
          dre.revenueGross.toLocaleString('pt-BR', { maximumFractionDigits: 0 }),
          dre.revenueNet.toLocaleString('pt-BR', { maximumFractionDigits: 0 }),
          dre.cogs.toLocaleString('pt-BR', { maximumFractionDigits: 0 }),
          dre.grossProfit.toLocaleString('pt-BR', { maximumFractionDigits: 0 }),
          dre.opex.toLocaleString('pt-BR', { maximumFractionDigits: 0 }),
          dre.ebitda.toLocaleString('pt-BR', { maximumFractionDigits: 0 }),
          dre.netIncome.toLocaleString('pt-BR', { maximumFractionDigits: 0 }),
          `${dre.netMargin}%`,
        ];
      });

      autoTable(doc, {
        startY: 100,
        head: [[
          'Mês',
          'Faturamento',
          'Receita Líq.',
          'CPV',
          'Lucro Bruto',
          'OpEx',
          'EBITDA',
          'Lucro Líq.',
          'Margem',
        ]],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [40, 40, 40],
          textColor: 255,
          fontSize: 8,
          fontStyle: 'bold',
        },
        bodyStyles: {
          fontSize: 8,
        },
        columnStyles: {
          0: { fontStyle: 'bold' },
          6: { textColor: [34, 139, 34] },
        },
        alternateRowStyles: {
          fillColor: [250, 250, 250],
        },
      });

      // AI Insights on new page if present
      if (aiInsight) {
        doc.addPage();
        
        doc.setFillColor(20, 20, 20);
        doc.rect(0, 0, pageWidth, 25, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('ANÁLISE ESTRATÉGICA AI', 15, 16);
        
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        // Clean markdown formatting for PDF
        const cleanInsight = aiInsight
          .replace(/#{1,3}\s/g, '')
          .replace(/\*\*/g, '')
          .replace(/🟢|🟡|🔴|📊|💡/g, '•');
        
        const lines = doc.splitTextToSize(cleanInsight, pageWidth - 30);
        doc.text(lines, 15, 40);
      }

      // Footer
      const addFooter = () => {
        const pages = doc.getNumberOfPages();
        for (let i = 1; i <= pages; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(
            `Insight Finance © ${new Date().getFullYear()} | Página ${i} de ${pages}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
          );
        }
      };
      addFooter();

      // Download
      const filename = `dre-report-${selectedCostCenter === 'all' ? 'consolidado' : selectedCostCenter}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
      
      toast({
        title: "PDF exportado",
        description: `Relatório salvo como ${filename}`,
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível gerar o PDF. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={exportToPdf}
      disabled={isExporting || sortedMonths.length === 0}
      variant="outline"
      className="rounded-2xl px-6 py-2 h-auto font-bold text-[10px] tracking-[0.15em] uppercase border-border/50 hover:bg-primary/10 transition-all"
    >
      {isExporting ? (
        <>
          <Loader2 size={14} className="mr-2 animate-spin" />
          EXPORTANDO...
        </>
      ) : (
        <>
          <FileDown size={14} className="mr-2" />
          EXPORTAR PDF
        </>
      )}
    </Button>
  );
};
