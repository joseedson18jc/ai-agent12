import { useMemo } from 'react';
import { Calendar, ChevronRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type PeriodType = 'all' | 'month' | 'quarter' | 'year' | 'custom';

interface PeriodFilterProps {
  sortedMonths: string[];
  selectedPeriod: PeriodType;
  selectedValue: string;
  onPeriodChange: (period: PeriodType) => void;
  onValueChange: (value: string) => void;
}

export const PeriodFilter = ({
  sortedMonths,
  selectedPeriod,
  selectedValue,
  onPeriodChange,
  onValueChange,
}: PeriodFilterProps) => {
  // Get unique years from months
  const years = useMemo(() => {
    const uniqueYears = new Set<string>();
    sortedMonths.forEach(month => {
      const year = month.split('-')[0];
      uniqueYears.add(year);
    });
    return Array.from(uniqueYears).sort().reverse();
  }, [sortedMonths]);

  // Get quarters available
  const quarters = useMemo(() => {
    const quarterMap = new Map<string, string>();
    sortedMonths.forEach(month => {
      const [year, monthNum] = month.split('-');
      const q = Math.ceil(parseInt(monthNum) / 3);
      const key = `${year}-Q${q}`;
      quarterMap.set(key, `${q}º Trimestre ${year}`);
    });
    return Array.from(quarterMap.entries()).sort().reverse();
  }, [sortedMonths]);

  // Get month labels
  const monthLabels = useMemo(() => {
    return sortedMonths.map(month => {
      const [year, monthNum] = month.split('-');
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      return {
        value: month,
        label: `${monthNames[parseInt(monthNum) - 1]} ${year}`
      };
    }).reverse();
  }, [sortedMonths]);

  return (
    <div className="flex items-center gap-4 p-3 rounded-2xl border border-border/30 shadow-lg bg-card/60 backdrop-blur-sm">
      <div className="flex items-center gap-3 pl-4 pr-2 border-r border-border/50">
        <Calendar size={16} className="text-primary" />
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
          Período:
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        <Select value={selectedPeriod} onValueChange={(v) => onPeriodChange(v as PeriodType)}>
          <SelectTrigger className="w-[120px] border-none bg-transparent text-[11px] font-bold uppercase tracking-wider">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Consolidado</SelectItem>
            <SelectItem value="year">Por Ano</SelectItem>
            <SelectItem value="quarter">Por Trimestre</SelectItem>
            <SelectItem value="month">Por Mês</SelectItem>
          </SelectContent>
        </Select>

        {selectedPeriod !== 'all' && (
          <>
            <ChevronRight size={14} className="text-muted-foreground" />
            <Select value={selectedValue} onValueChange={onValueChange}>
              <SelectTrigger className="w-[140px] border-none bg-transparent text-[11px] font-bold uppercase tracking-wider">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {selectedPeriod === 'year' && years.map(year => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
                {selectedPeriod === 'quarter' && quarters.map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
                {selectedPeriod === 'month' && monthLabels.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
      </div>
    </div>
  );
};

/**
 * Filter months based on selected period
 */
export function filterMonthsByPeriod(
  sortedMonths: string[],
  periodType: PeriodType,
  periodValue: string
): string[] {
  if (periodType === 'all' || !periodValue) {
    return sortedMonths;
  }

  switch (periodType) {
    case 'year':
      return sortedMonths.filter(month => month.startsWith(periodValue));
    
    case 'quarter': {
      const [year, quarter] = periodValue.split('-Q');
      const q = parseInt(quarter);
      const startMonth = (q - 1) * 3 + 1;
      const endMonth = q * 3;
      return sortedMonths.filter(month => {
        const [y, m] = month.split('-');
        const monthNum = parseInt(m);
        return y === year && monthNum >= startMonth && monthNum <= endMonth;
      });
    }
    
    case 'month':
      return sortedMonths.filter(month => month === periodValue);
    
    default:
      return sortedMonths;
  }
}
