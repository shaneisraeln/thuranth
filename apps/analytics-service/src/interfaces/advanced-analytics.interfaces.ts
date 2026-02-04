export interface ImpactMeasurementDashboard {
  primaryMetrics: PrimaryImpactMetrics;
  secondaryMetrics: SecondaryImpactMetrics;
  environmentalImpact: EnvironmentalImpactMetrics;
  operationalEfficiency: OperationalEfficiencyMetrics;
  financialImpact: FinancialImpactMetrics;
  trendAnalysis: TrendAnalysisData;
  benchmarking: BenchmarkingData;
  customKPIs: CustomKPIData[];
}

export interface PrimaryImpactMetrics {
  vehiclesAvoided: MetricWithTrend;
  consolidationRate: MetricWithTrend;
  utilizationImprovement: MetricWithTrend;
  parcelsConsolidated: MetricWithTrend;
}

export interface SecondaryImpactMetrics {
  fuelSavings: MetricWithTrend;
  distanceSaved: MetricWithTrend;
  timeSaved: MetricWithTrend;
  slaAdherence: MetricWithTrend;
  customerSatisfaction: MetricWithTrend;
}

export interface EnvironmentalImpactMetrics {
  co2EmissionsSaved: MetricWithTrend;
  fuelConsumptionReduction: MetricWithTrend;
  carbonFootprintReduction: MetricWithTrend;
  sustainabilityScore: MetricWithTrend;
}

export interface OperationalEfficiencyMetrics {
  decisionAccuracy: MetricWithTrend;
  processingTime: MetricWithTrend;
  systemUptime: MetricWithTrend;
  errorRate: MetricWithTrend;
  overrideRate: MetricWithTrend;
}

export interface FinancialImpactMetrics {
  costSavings: MetricWithTrend;
  revenueImpact: MetricWithTrend;
  roi: MetricWithTrend;
  operationalCostReduction: MetricWithTrend;
}

export interface MetricWithTrend {
  current: number;
  previous: number;
  trend: TrendDirection;
  trendPercentage: number;
  unit: string;
  target?: number;
  status: MetricStatus;
}

export interface TrendAnalysisData {
  timeRange: TimeRange;
  dataPoints: TrendDataPoint[];
  seasonality: SeasonalityAnalysis;
  forecasting: ForecastingData;
  anomalies: AnomalyDetection[];
}

export interface TrendDataPoint {
  timestamp: Date;
  metrics: Record<string, number>;
  events?: string[];
}

export interface SeasonalityAnalysis {
  dailyPatterns: PatternData[];
  weeklyPatterns: PatternData[];
  monthlyPatterns: PatternData[];
  identifiedSeasons: SeasonalPattern[];
}

export interface PatternData {
  period: string;
  averageValue: number;
  variance: number;
  confidence: number;
}

export interface SeasonalPattern {
  name: string;
  startPeriod: string;
  endPeriod: string;
  characteristics: string[];
  impact: number;
}

export interface ForecastingData {
  method: ForecastingMethod;
  predictions: ForecastPrediction[];
  confidence: number;
  accuracy: number;
}

export interface ForecastPrediction {
  timestamp: Date;
  predictedValue: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  factors: string[];
}

export interface AnomalyDetection {
  timestamp: Date;
  metricName: string;
  expectedValue: number;
  actualValue: number;
  severity: AnomalySeverity;
  possibleCauses: string[];
  recommendation: string;
}

export interface BenchmarkingData {
  industryBenchmarks: BenchmarkComparison[];
  historicalComparison: HistoricalBenchmark[];
  peerComparison: PeerBenchmark[];
  targetVsActual: TargetComparison[];
}

export interface BenchmarkComparison {
  metricName: string;
  ourValue: number;
  industryAverage: number;
  industryBest: number;
  percentile: number;
  status: BenchmarkStatus;
}

export interface HistoricalBenchmark {
  metricName: string;
  currentValue: number;
  historicalValues: HistoricalDataPoint[];
  improvement: number;
  trend: TrendDirection;
}

export interface HistoricalDataPoint {
  period: string;
  value: number;
}

export interface PeerBenchmark {
  metricName: string;
  ourValue: number;
  peerAverage: number;
  peerBest: number;
  ranking: number;
  totalPeers: number;
}

export interface TargetComparison {
  metricName: string;
  actualValue: number;
  targetValue: number;
  achievement: number; // percentage
  status: TargetStatus;
}

export interface CustomKPIData {
  id: string;
  name: string;
  description: string;
  formula: string;
  value: number;
  unit: string;
  target?: number;
  trend: TrendDirection;
  trendPercentage: number;
  category: KPICategory;
  owner: string;
  lastUpdated: Date;
}

export interface CustomKPIDefinition {
  id?: string;
  name: string;
  description: string;
  formula: string;
  unit: string;
  category: KPICategory;
  owner: string;
  target?: number;
  updateFrequency: UpdateFrequency;
  dataSource: string[];
  isActive: boolean;
}

export interface KPICalculationRequest {
  kpiId: string;
  timeRange: TimeRange;
  filters?: Record<string, any>;
}

export interface TimeRange {
  start: Date;
  end: Date;
  granularity: TimeGranularity;
}

export interface ReportGenerationRequest {
  reportType: ReportType;
  timeRange: TimeRange;
  metrics: string[];
  filters?: Record<string, any>;
  format: ReportFormat;
  recipients?: string[];
  schedule?: ReportSchedule;
}

export interface GeneratedReport {
  id: string;
  reportType: ReportType;
  generatedAt: Date;
  timeRange: TimeRange;
  data: any;
  insights: ReportInsight[];
  recommendations: string[];
  downloadUrl?: string;
}

export interface ReportInsight {
  type: InsightType;
  title: string;
  description: string;
  impact: InsightImpact;
  confidence: number;
  actionable: boolean;
}

export enum TrendDirection {
  UP = 'up',
  DOWN = 'down',
  STABLE = 'stable',
  VOLATILE = 'volatile'
}

export enum MetricStatus {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  WARNING = 'warning',
  CRITICAL = 'critical'
}

export enum ForecastingMethod {
  LINEAR_REGRESSION = 'linear_regression',
  EXPONENTIAL_SMOOTHING = 'exponential_smoothing',
  ARIMA = 'arima',
  MACHINE_LEARNING = 'machine_learning'
}

export enum AnomalySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum BenchmarkStatus {
  LEADING = 'leading',
  ABOVE_AVERAGE = 'above_average',
  AVERAGE = 'average',
  BELOW_AVERAGE = 'below_average',
  LAGGING = 'lagging'
}

export enum TargetStatus {
  EXCEEDED = 'exceeded',
  MET = 'met',
  NEAR = 'near',
  BEHIND = 'behind',
  CRITICAL = 'critical'
}

export enum KPICategory {
  OPERATIONAL = 'operational',
  FINANCIAL = 'financial',
  ENVIRONMENTAL = 'environmental',
  CUSTOMER = 'customer',
  EFFICIENCY = 'efficiency',
  QUALITY = 'quality',
  CUSTOM = 'custom'
}

export enum UpdateFrequency {
  REAL_TIME = 'real_time',
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly'
}

export enum TimeGranularity {
  MINUTE = 'minute',
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year'
}

export enum ReportType {
  IMPACT_SUMMARY = 'impact_summary',
  TREND_ANALYSIS = 'trend_analysis',
  BENCHMARK_COMPARISON = 'benchmark_comparison',
  CUSTOM_KPI = 'custom_kpi',
  OPERATIONAL_EFFICIENCY = 'operational_efficiency',
  ENVIRONMENTAL_IMPACT = 'environmental_impact',
  FINANCIAL_ANALYSIS = 'financial_analysis'
}

export enum ReportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
  JSON = 'json',
  HTML = 'html'
}

export enum ReportSchedule {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly'
}

export enum InsightType {
  TREND = 'trend',
  ANOMALY = 'anomaly',
  CORRELATION = 'correlation',
  OPPORTUNITY = 'opportunity',
  RISK = 'risk'
}

export enum InsightImpact {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}