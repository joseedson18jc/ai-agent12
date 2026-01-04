import { BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';

interface ChartDataPoint {
  month: string;
  'Receita Líquida': number;
  'EBITDA': number;
  'Lucro Líquido': number;
}

interface SimpleChartProps {
  data: ChartDataPoint[];
}

export const SimpleChart = ({ data }: SimpleChartProps) => {
  if (!data || data.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4">
      <div className="p-4 bg-muted rounded-full">
        <BarChart3 size={40} className="opacity-20" />
      </div>
      <span className="text-sm font-medium">Aguardando dados para visualização gráfica</span>
    </div>
  );

  const chartWidth = 1000;
  const chartHeight = 400;
  const padding = 60;
  
  const allValues = data.flatMap(d => [
    Math.abs(d['Receita Líquida']), 
    Math.abs(d['EBITDA']), 
    Math.abs(d['Lucro Líquido'])
  ]);

  const maxVal = Math.max(...allValues) || 1;
  const minVal = Math.min(0, ...data.flatMap(d => [d['Receita Líquida'], d['EBITDA'], d['Lucro Líquido']]));
  const range = maxVal - minVal;
  const scale = (chartHeight - padding * 2) / range;
  const baseline = chartHeight - padding - (Math.abs(minVal) * scale);

  const getY = (value: number) => baseline - (value * scale);
  const getX = (index: number) => padding + (index * ((chartWidth - padding * 2) / Math.max(1, data.length - 1)));

  return (
    <div className="w-full h-full p-4">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="grad-revenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity="0.2" />
            <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid Lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
          const y = padding + (chartHeight - padding * 2) * p;
          return (
            <line key={i} x1={padding} y1={y} x2={chartWidth - padding} y2={y} stroke="hsl(var(--border))" strokeWidth="1" />
          );
        })}
        
        {/* Metric Lines */}
        {data.length > 1 && (
          <>
            {/* Area */}
            <motion.path
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              d={`M ${getX(0)} ${baseline} ${data.map((d, i) => `L ${getX(i)} ${getY(d['Receita Líquida'])}`).join(' ')} L ${getX(data.length - 1)} ${baseline} Z`}
              fill="url(#grad-revenue)"
            />
            
            {/* Lines */}
            <motion.polyline
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              points={data.map((d, i) => `${getX(i)},${getY(d['Receita Líquida'])}`).join(' ')}
              fill="none"
              stroke="hsl(var(--chart-1))"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <motion.polyline
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, ease: "easeInOut", delay: 0.2 }}
              points={data.map((d, i) => `${getX(i)},${getY(d['EBITDA'])}`).join(' ')}
              fill="none"
              stroke="hsl(var(--chart-3))"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <motion.polyline
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, ease: "easeInOut", delay: 0.4 }}
              points={data.map((d, i) => `${getX(i)},${getY(d['Lucro Líquido'])}`).join(' ')}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}

        {/* Data Points and Labels */}
        {data.map((d, i) => {
          const x = getX(i);
          return (
            <g key={i}>
              <circle cx={x} cy={getY(d['Receita Líquida'])} r="5" fill="hsl(var(--chart-1))" stroke="hsl(var(--card))" strokeWidth="2" />
              <circle cx={x} cy={getY(d['EBITDA'])} r="5" fill="hsl(var(--chart-3))" stroke="hsl(var(--card))" strokeWidth="2" />
              <circle cx={x} cy={getY(d['Lucro Líquido'])} r="5" fill="hsl(var(--primary))" stroke="hsl(var(--card))" strokeWidth="2" />
              <text x={x} y={chartHeight - 10} textAnchor="middle" fontSize="11" fontWeight="700" fill="hsl(var(--muted-foreground))" className="font-sans tracking-tight">
                {d.month}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
