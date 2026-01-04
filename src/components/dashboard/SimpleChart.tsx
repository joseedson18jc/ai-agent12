import { BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';

interface ChartDataPoint {
  month: string;
  [key: string]: number | string | null;
}

interface SimpleChartProps {
  data: ChartDataPoint[];
  metrics?: { key: string; color: string; dashed?: boolean }[];
}

const DEFAULT_METRICS = [
  { key: 'Receita Líquida', color: 'hsl(var(--chart-1))' },
  { key: 'EBITDA', color: 'hsl(var(--chart-3))' },
  { key: 'Lucro Líquido', color: 'hsl(var(--primary))' },
];

export const SimpleChart = ({ data, metrics = DEFAULT_METRICS }: SimpleChartProps) => {
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
  
  const allValues = data.flatMap(d => 
    metrics.map(m => {
      const val = d[m.key];
      return typeof val === 'number' ? Math.abs(val) : 0;
    })
  );

  const maxVal = Math.max(...allValues) || 1;
  const minVal = Math.min(0, ...data.flatMap(d => 
    metrics.map(m => {
      const val = d[m.key];
      return typeof val === 'number' ? val : 0;
    })
  ));
  const range = maxVal - minVal || 1;
  const scale = (chartHeight - padding * 2) / range;
  const baseline = chartHeight - padding - (Math.abs(minVal) * scale);

  const getY = (value: number) => baseline - (value * scale);
  const getX = (index: number) => padding + (index * ((chartWidth - padding * 2) / Math.max(1, data.length - 1)));

  const getValue = (d: ChartDataPoint, key: string): number => {
    const val = d[key];
    return typeof val === 'number' ? val : 0;
  };

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
            {/* Area for first metric */}
            <motion.path
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              d={`M ${getX(0)} ${baseline} ${data.map((d, i) => `L ${getX(i)} ${getY(getValue(d, metrics[0].key))}`).join(' ')} L ${getX(data.length - 1)} ${baseline} Z`}
              fill="url(#grad-revenue)"
            />
            
            {/* Lines for each metric */}
            {metrics.map((metric, mi) => {
              const validPoints = data.map((d, i) => ({ x: getX(i), y: getY(getValue(d, metric.key)), valid: getValue(d, metric.key) !== 0 || d[metric.key] !== null }));
              return (
                <motion.polyline
                  key={metric.key}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.5, ease: "easeInOut", delay: mi * 0.2 }}
                  points={validPoints.filter(p => p.valid).map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke={metric.color}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={metric.dashed ? "8 4" : undefined}
                />
              );
            })}
          </>
        )}

        {/* Data Points and Labels */}
        {data.map((d, i) => {
          const x = getX(i);
          return (
            <g key={i}>
              {metrics.map((metric) => {
                const val = getValue(d, metric.key);
                if (val === 0 && d[metric.key] === null) return null;
                return (
                  <circle 
                    key={metric.key}
                    cx={x} 
                    cy={getY(val)} 
                    r="5" 
                    fill={metric.color} 
                    stroke="hsl(var(--card))" 
                    strokeWidth="2" 
                  />
                );
              })}
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
