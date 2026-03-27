import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Filler,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale,
  type ChartOptions,
} from 'chart.js'

// Register all Chart.js components globally
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Filler,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale
)

// Shared color palette for KerPlan charts
export const CHART_COLORS = {
  blue: { bg: 'rgba(59, 130, 246, 0.6)', border: 'rgb(59, 130, 246)' },
  green: { bg: 'rgba(34, 197, 94, 0.6)', border: 'rgb(34, 197, 94)' },
  orange: { bg: 'rgba(249, 115, 22, 0.6)', border: 'rgb(249, 115, 22)' },
  purple: { bg: 'rgba(168, 85, 247, 0.6)', border: 'rgb(168, 85, 247)' },
  red: { bg: 'rgba(239, 68, 68, 0.6)', border: 'rgb(239, 68, 68)' },
  cyan: { bg: 'rgba(6, 182, 212, 0.6)', border: 'rgb(6, 182, 212)' },
  teal: { bg: 'rgba(20, 184, 166, 0.6)', border: 'rgb(20, 184, 166)' },
  amber: { bg: 'rgba(245, 158, 11, 0.6)', border: 'rgb(245, 158, 11)' },
  indigo: { bg: 'rgba(99, 102, 241, 0.6)', border: 'rgb(99, 102, 241)' },
  rose: { bg: 'rgba(244, 63, 94, 0.6)', border: 'rgb(244, 63, 94)' },
  slate: { bg: 'rgba(100, 116, 139, 0.6)', border: 'rgb(100, 116, 139)' },
  emerald: { bg: 'rgba(16, 185, 129, 0.6)', border: 'rgb(16, 185, 129)' },
}

export const PALETTE_BG = Object.values(CHART_COLORS).map((c) => c.bg)
export const PALETTE_BORDER = Object.values(CHART_COLORS).map((c) => c.border)

// Shared default options
export const DEFAULT_BAR_OPTIONS: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top' },
    tooltip: { mode: 'index', intersect: false },
  },
  scales: {
    x: { stacked: false },
    y: { beginAtZero: true },
  },
}

export const DEFAULT_LINE_OPTIONS: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top' },
    tooltip: { mode: 'index', intersect: false },
  },
  scales: {
    y: { beginAtZero: true },
  },
}

export const DEFAULT_STACKED_BAR_OPTIONS: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top' },
    tooltip: { mode: 'index', intersect: false },
  },
  scales: {
    x: { stacked: true },
    y: { stacked: true, beginAtZero: true },
  },
}

export default ChartJS
