import React from 'react';
import ReactECharts from 'echarts-for-react';

interface BoxPlotChartProps {
  titulo: string;
  nombresCategorias: string[];
  datos: number[][]; // Array de notas numéricas por categoría o actividad
  minNota?: number;
  maxNota?: number;
}

export const BoxPlotChart: React.FC<BoxPlotChartProps> = ({
  titulo,
  nombresCategorias,
  datos,
  minNota = 0,
  maxNota = 5,
}) => {
  // Cálculo de cuartiles con interpolación lineal estándar (Tukey/Percentiles)
  // Garantiza que los bigotes (min y max) no colapsen en muestras pequeñas
  const cuantil = (arr: number[], q: number): number => {
    if (arr.length === 0) return 0;
    if (arr.length === 1) return arr[0];
    const pos = (arr.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (arr[base + 1] !== undefined) {
      return Number((arr[base] + rest * (arr[base + 1] - arr[base])).toFixed(2));
    }
    return Number(arr[base].toFixed(2));
  };

  const procesarBoxPlot = (dataset: number[][]) => {
    return dataset.map(valores => {
      if (!valores || valores.length === 0) return [0, 0, 0, 0, 0];
      const ordenados = valores.map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b);
      if (ordenados.length === 0) return [0, 0, 0, 0, 0];

      const min = ordenados[0];
      const max = ordenados[ordenados.length - 1];
      const q1 = cuantil(ordenados, 0.25);
      const q2 = cuantil(ordenados, 0.5); // Mediana
      const q3 = cuantil(ordenados, 0.75);

      return [min, q1, q2, q3, max];
    });
  };

  const boxData = procesarBoxPlot(datos);

  const option = {
    backgroundColor: 'transparent',
    title: {
      text: titulo,
      left: 'center',
      textStyle: { fontSize: 14, color: '#e2e8f0', fontWeight: 600 },
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: '#1e293b',
      borderColor: '#475569',
      textStyle: { color: '#f8fafc', fontSize: 12 },
      formatter: (param: any) => {
        if (!param.data) return '';
        const [min, q1, q2, q3, max] = param.data;
        return `
          <div style="font-size:12px; line-height: 1.6; padding: 2px;">
            <b style="color: #38bdf8; font-size: 13px;">${param.name}</b><br/>
            Top Bigote (Máx): <b>${max}</b><br/>
            Caja Q3 (75%): <b>${q3}</b><br/>
            Mediana (Q2): <b style="color: #fbbf24;">${q2}</b><br/>
            Caja Q1 (25%): <b>${q1}</b><br/>
            Base Bigote (Mín): <b>${min}</b>
          </div>
        `;
      },
    },
    grid: { left: '8%', right: '8%', bottom: '18%', top: '15%' },
    xAxis: {
      type: 'category',
      data: nombresCategorias,
      boundaryGap: true,
      nameGap: 30,
      splitArea: { show: false },
      axisLabel: {
        color: '#94a3b8',
        fontSize: 11,
        interval: 0,
        rotate: nombresCategorias.length > 5 ? 25 : 0,
      },
      axisLine: { lineStyle: { color: '#475569' } },
    },
    yAxis: {
      type: 'value',
      name: 'Nota',
      nameTextStyle: { color: '#94a3b8', fontSize: 11 },
      min: minNota,
      max: maxNota,
      splitLine: { show: true, lineStyle: { type: 'dashed', color: '#334155' } },
      axisLabel: { color: '#94a3b8' },
      axisLine: { lineStyle: { color: '#475569' } },
    },
    series: [
      {
        name: 'Distribución de Notas',
        type: 'boxplot',
        data: boxData,
        boxWidth: [14, 38],
        itemStyle: {
          color: '#0284c733',
          borderColor: '#38bdf8',
          borderWidth: 2,
        },
        emphasis: {
          itemStyle: {
            borderColor: '#7dd3fc',
            borderWidth: 3,
            shadowBlur: 6,
            shadowColor: '#38bdf866',
          },
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: '320px', width: '100%' }} />;
};

interface RadarChartProps {
  titulo: string;
  indicadores: { name: string; max: number }[];
  datos: { name: string; value: number[] }[];
}

export const RadarChart: React.FC<RadarChartProps> = ({ titulo, indicadores, datos }) => {
  const option = {
    backgroundColor: 'transparent',
    title: {
      text: titulo,
      left: 'center',
      textStyle: { fontSize: 14, color: '#e2e8f0', fontWeight: 600 },
    },
    tooltip: {
      backgroundColor: '#1e293b',
      borderColor: '#475569',
      textStyle: { color: '#f8fafc', fontSize: 12 },
    },
    legend: {
      orient: 'horizontal',
      bottom: '0%',
      textStyle: { color: '#94a3b8', fontSize: 11 },
    },
    radar: {
      indicator: indicadores,
      axisName: { color: '#cbd5e1', fontSize: 11, fontWeight: 500 },
      splitLine: { lineStyle: { color: '#334155' } },
      splitArea: { areaStyle: { color: ['#1e293b44', '#0f172a44'] } },
      axisLine: { lineStyle: { color: '#475569' } },
    },
    series: [
      {
        type: 'radar',
        data: datos.map(d => ({
          value: d.value,
          name: d.name,
          areaStyle: { color: '#38bdf833' },
          lineStyle: { color: '#38bdf8', width: 2.5 },
          itemStyle: { color: '#38bdf8' },
        })),
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: '320px', width: '100%' }} />;
};

interface PieChartProps {
  titulo: string;
  datos: { name: string; value: number; itemStyle?: { color: string } }[];
}

export const PieChart: React.FC<PieChartProps> = ({ titulo, datos }) => {
  const option = {
    backgroundColor: 'transparent',
    title: {
      text: titulo,
      left: 'center',
      textStyle: { fontSize: 14, color: '#e2e8f0', fontWeight: 600 },
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: '#1e293b',
      borderColor: '#475569',
      textStyle: { color: '#f8fafc', fontSize: 12 },
      formatter: '{b}: <b>{c}</b> estudiantes ({d}%)',
    },
    legend: {
      orient: 'horizontal',
      bottom: 'bottom',
      textStyle: { color: '#94a3b8', fontSize: 11 },
    },
    series: [
      {
        name: 'Rendimiento',
        type: 'pie',
        radius: ['38%', '68%'],
        center: ['50%', '48%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#1e293b',
          borderWidth: 2,
        },
        label: {
          show: true,
          formatter: '{b}: {c}',
          color: '#cbd5e1',
          fontSize: 11,
        },
        data: datos,
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: '320px', width: '100%' }} />;
};

interface BarChartSimpleProps {
  titulo: string;
  categorias: string[];
  valores: number[];
  color?: string;
  min?: number;
  max?: number;
}

export const BarChartSimple: React.FC<BarChartSimpleProps> = ({
  titulo,
  categorias,
  valores,
  color = '#38bdf8',
  min = 0,
  max = 5,
}) => {
  const option = {
    backgroundColor: 'transparent',
    title: {
      text: titulo,
      left: 'center',
      textStyle: { fontSize: 14, color: '#e2e8f0', fontWeight: 600 },
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b',
      borderColor: '#475569',
      textStyle: { color: '#f8fafc', fontSize: 12 },
    },
    grid: { left: '8%', right: '8%', bottom: '20%', top: '15%' },
    xAxis: {
      type: 'category',
      data: categorias,
      axisLabel: {
        color: '#94a3b8',
        fontSize: 11,
        interval: 0,
        rotate: categorias.length > 6 ? 30 : 0,
      },
      axisLine: { lineStyle: { color: '#475569' } },
    },
    yAxis: {
      type: 'value',
      min,
      max,
      splitLine: { show: true, lineStyle: { type: 'dashed', color: '#334155' } },
      axisLabel: { color: '#94a3b8' },
      axisLine: { lineStyle: { color: '#475569' } },
    },
    series: [
      {
        data: valores,
        type: 'bar',
        barWidth: '40%',
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color },
              { offset: 1, color: color + '66' },
            ],
          },
          borderRadius: [6, 6, 0, 0],
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: '320px', width: '100%' }} />;
};
