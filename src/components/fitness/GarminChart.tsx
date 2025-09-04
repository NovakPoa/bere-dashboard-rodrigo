import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface GarminChartProps {
  data: Array<Record<string, number | string>>;
  modalities: string[];
}

const getModalityColor = (modality: string, index: number): string => {
  const colors = [
    'hsl(var(--primary))',
    'hsl(var(--secondary))', 
    'hsl(var(--accent))',
    'hsl(var(--muted))',
    '#8884d8',
    '#82ca9d',
    '#ffc658',
    '#ff7c7c',
    '#8dd1e1',
    '#d084d0'
  ];
  
  // Cores específicas para modalidades conhecidas
  switch(modality) {
    case 'corrida': return 'hsl(var(--primary))';
    case 'ciclismo': return 'hsl(var(--secondary))';
    case 'natacao': return 'hsl(var(--accent))';
    default: return colors[index % colors.length];
  }
};

export default function GarminChart({ data, modalities }: GarminChartProps): JSX.Element {
  if (!data.length) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        Nenhum dado disponível para o gráfico
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart
        data={data}
        margin={{
          top: 10,
          right: 30,
          left: 0,
          bottom: 0,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis 
          dataKey="data" 
          tick={{ fontSize: 12 }}
          className="text-muted-foreground"
        />
        <YAxis 
          tick={{ fontSize: 12 }}
          className="text-muted-foreground"
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px'
          }}
        />
        <Legend />
        {modalities.map((modality, index) => (
          <Area
            key={modality}
            type="monotone"
            dataKey={modality}
            stackId="1"
            stroke={getModalityColor(modality, index)}
            fill={getModalityColor(modality, index)}
            fillOpacity={0.6}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}