-- Migration: Create analytics and metrics tables
-- Description: Create tables for storing analytics data and performance metrics

CREATE TABLE IF NOT EXISTS analytics_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(100) NOT NULL,
    metric_type VARCHAR(50) NOT NULL, -- 'counter', 'gauge', 'histogram', 'summary'
    value DECIMAL(15,4) NOT NULL,
    unit VARCHAR(20), -- 'count', 'kg', 'km', 'minutes', 'percentage', etc.
    
    -- Dimensions for grouping and filtering
    dimensions JSONB DEFAULT '{}'::jsonb,
    
    -- Time period this metric represents
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Metadata
    service_name VARCHAR(100),
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing daily aggregated metrics
CREATE TABLE IF NOT EXISTS daily_metrics_summary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    
    -- Primary metrics
    vehicles_avoided INTEGER DEFAULT 0,
    total_parcels_processed INTEGER DEFAULT 0,
    successful_consolidations INTEGER DEFAULT 0,
    consolidation_rate DECIMAL(5,2) DEFAULT 0, -- percentage
    
    -- Utilization metrics
    avg_vehicle_utilization DECIMAL(5,2) DEFAULT 0, -- percentage
    total_distance_saved DECIMAL(10,2) DEFAULT 0, -- km
    total_fuel_saved DECIMAL(10,2) DEFAULT 0, -- liters
    
    -- Environmental impact
    co2_emissions_saved DECIMAL(10,2) DEFAULT 0, -- kg
    
    -- SLA metrics
    sla_adherence_rate DECIMAL(5,2) DEFAULT 0, -- percentage
    avg_delivery_time DECIMAL(8,2) DEFAULT 0, -- minutes
    
    -- Decision engine metrics
    avg_decision_time DECIMAL(8,2) DEFAULT 0, -- milliseconds
    shadow_mode_accuracy DECIMAL(5,2) DEFAULT 0, -- percentage
    manual_override_rate DECIMAL(5,2) DEFAULT 0, -- percentage
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(date)
);

-- Create indexes
CREATE INDEX idx_analytics_metrics_name ON analytics_metrics(metric_name);
CREATE INDEX idx_analytics_metrics_type ON analytics_metrics(metric_type);
CREATE INDEX idx_analytics_metrics_period ON analytics_metrics(period_start, period_end);
CREATE INDEX idx_analytics_metrics_service ON analytics_metrics(service_name);
CREATE INDEX idx_analytics_metrics_calculated ON analytics_metrics(calculated_at);

-- GIN index for dimensions JSONB
CREATE INDEX idx_analytics_metrics_dimensions ON analytics_metrics USING GIN(dimensions);

-- Indexes for daily summary
CREATE INDEX idx_daily_metrics_date ON daily_metrics_summary(date);
CREATE INDEX idx_daily_metrics_consolidation_rate ON daily_metrics_summary(consolidation_rate);
CREATE INDEX idx_daily_metrics_utilization ON daily_metrics_summary(avg_vehicle_utilization);

-- Create trigger for updated_at on daily summary
CREATE TRIGGER update_daily_metrics_summary_updated_at BEFORE UPDATE ON daily_metrics_summary
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();