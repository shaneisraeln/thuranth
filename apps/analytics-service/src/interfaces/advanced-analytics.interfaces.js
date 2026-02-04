"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsightImpact = exports.InsightType = exports.ReportSchedule = exports.ReportFormat = exports.ReportType = exports.TimeGranularity = exports.UpdateFrequency = exports.KPICategory = exports.TargetStatus = exports.BenchmarkStatus = exports.AnomalySeverity = exports.ForecastingMethod = exports.MetricStatus = exports.TrendDirection = void 0;
var TrendDirection;
(function (TrendDirection) {
    TrendDirection["UP"] = "up";
    TrendDirection["DOWN"] = "down";
    TrendDirection["STABLE"] = "stable";
    TrendDirection["VOLATILE"] = "volatile";
})(TrendDirection || (exports.TrendDirection = TrendDirection = {}));
var MetricStatus;
(function (MetricStatus) {
    MetricStatus["EXCELLENT"] = "excellent";
    MetricStatus["GOOD"] = "good";
    MetricStatus["WARNING"] = "warning";
    MetricStatus["CRITICAL"] = "critical";
})(MetricStatus || (exports.MetricStatus = MetricStatus = {}));
var ForecastingMethod;
(function (ForecastingMethod) {
    ForecastingMethod["LINEAR_REGRESSION"] = "linear_regression";
    ForecastingMethod["EXPONENTIAL_SMOOTHING"] = "exponential_smoothing";
    ForecastingMethod["ARIMA"] = "arima";
    ForecastingMethod["MACHINE_LEARNING"] = "machine_learning";
})(ForecastingMethod || (exports.ForecastingMethod = ForecastingMethod = {}));
var AnomalySeverity;
(function (AnomalySeverity) {
    AnomalySeverity["LOW"] = "low";
    AnomalySeverity["MEDIUM"] = "medium";
    AnomalySeverity["HIGH"] = "high";
    AnomalySeverity["CRITICAL"] = "critical";
})(AnomalySeverity || (exports.AnomalySeverity = AnomalySeverity = {}));
var BenchmarkStatus;
(function (BenchmarkStatus) {
    BenchmarkStatus["LEADING"] = "leading";
    BenchmarkStatus["ABOVE_AVERAGE"] = "above_average";
    BenchmarkStatus["AVERAGE"] = "average";
    BenchmarkStatus["BELOW_AVERAGE"] = "below_average";
    BenchmarkStatus["LAGGING"] = "lagging";
})(BenchmarkStatus || (exports.BenchmarkStatus = BenchmarkStatus = {}));
var TargetStatus;
(function (TargetStatus) {
    TargetStatus["EXCEEDED"] = "exceeded";
    TargetStatus["MET"] = "met";
    TargetStatus["NEAR"] = "near";
    TargetStatus["BEHIND"] = "behind";
    TargetStatus["CRITICAL"] = "critical";
})(TargetStatus || (exports.TargetStatus = TargetStatus = {}));
var KPICategory;
(function (KPICategory) {
    KPICategory["OPERATIONAL"] = "operational";
    KPICategory["FINANCIAL"] = "financial";
    KPICategory["ENVIRONMENTAL"] = "environmental";
    KPICategory["CUSTOMER"] = "customer";
    KPICategory["EFFICIENCY"] = "efficiency";
    KPICategory["QUALITY"] = "quality";
    KPICategory["CUSTOM"] = "custom";
})(KPICategory || (exports.KPICategory = KPICategory = {}));
var UpdateFrequency;
(function (UpdateFrequency) {
    UpdateFrequency["REAL_TIME"] = "real_time";
    UpdateFrequency["HOURLY"] = "hourly";
    UpdateFrequency["DAILY"] = "daily";
    UpdateFrequency["WEEKLY"] = "weekly";
    UpdateFrequency["MONTHLY"] = "monthly";
})(UpdateFrequency || (exports.UpdateFrequency = UpdateFrequency = {}));
var TimeGranularity;
(function (TimeGranularity) {
    TimeGranularity["MINUTE"] = "minute";
    TimeGranularity["HOUR"] = "hour";
    TimeGranularity["DAY"] = "day";
    TimeGranularity["WEEK"] = "week";
    TimeGranularity["MONTH"] = "month";
    TimeGranularity["QUARTER"] = "quarter";
    TimeGranularity["YEAR"] = "year";
})(TimeGranularity || (exports.TimeGranularity = TimeGranularity = {}));
var ReportType;
(function (ReportType) {
    ReportType["IMPACT_SUMMARY"] = "impact_summary";
    ReportType["TREND_ANALYSIS"] = "trend_analysis";
    ReportType["BENCHMARK_COMPARISON"] = "benchmark_comparison";
    ReportType["CUSTOM_KPI"] = "custom_kpi";
    ReportType["OPERATIONAL_EFFICIENCY"] = "operational_efficiency";
    ReportType["ENVIRONMENTAL_IMPACT"] = "environmental_impact";
    ReportType["FINANCIAL_ANALYSIS"] = "financial_analysis";
})(ReportType || (exports.ReportType = ReportType = {}));
var ReportFormat;
(function (ReportFormat) {
    ReportFormat["PDF"] = "pdf";
    ReportFormat["EXCEL"] = "excel";
    ReportFormat["CSV"] = "csv";
    ReportFormat["JSON"] = "json";
    ReportFormat["HTML"] = "html";
})(ReportFormat || (exports.ReportFormat = ReportFormat = {}));
var ReportSchedule;
(function (ReportSchedule) {
    ReportSchedule["DAILY"] = "daily";
    ReportSchedule["WEEKLY"] = "weekly";
    ReportSchedule["MONTHLY"] = "monthly";
    ReportSchedule["QUARTERLY"] = "quarterly";
})(ReportSchedule || (exports.ReportSchedule = ReportSchedule = {}));
var InsightType;
(function (InsightType) {
    InsightType["TREND"] = "trend";
    InsightType["ANOMALY"] = "anomaly";
    InsightType["CORRELATION"] = "correlation";
    InsightType["OPPORTUNITY"] = "opportunity";
    InsightType["RISK"] = "risk";
})(InsightType || (exports.InsightType = InsightType = {}));
var InsightImpact;
(function (InsightImpact) {
    InsightImpact["HIGH"] = "high";
    InsightImpact["MEDIUM"] = "medium";
    InsightImpact["LOW"] = "low";
})(InsightImpact || (exports.InsightImpact = InsightImpact = {}));
//# sourceMappingURL=advanced-analytics.interfaces.js.map