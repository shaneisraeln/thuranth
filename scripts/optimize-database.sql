-- Database Optimization Script for PDCP Performance
-- This script creates indexes and optimizations for better query performance

-- =====================================================
-- VEHICLE TRACKING OPTIMIZATIONS
-- =====================================================

-- Index for location-based vehicle queries (most common)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_location 
ON vehicles USING GIST (
  ST_Point(current_location_longitude, current_location_latitude)
);

-- Index for capacity-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_capacity 
ON vehicles (
  (capacity->>'maxWeight')::numeric,
  (capacity->>'currentWeight')::numeric,
  (capacity->>'maxVolume')::numeric,
  (capacity->>'currentVolume')::numeric
) WHERE status = 'ACTIVE';

-- Index for vehicle type and status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_type_status 
ON vehicles (type, status, updated_at DESC);

-- Index for driver assignments
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_driver 
ON vehicles (driver_id) WHERE driver_id IS NOT NULL;

-- =====================================================
-- PARCEL MANAGEMENT OPTIMIZATIONS
-- =====================================================

-- Index for SLA deadline queries (critical for decision engine)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_parcels_sla_deadline 
ON parcels (sla_deadline ASC) WHERE status IN ('PENDING', 'ASSIGNED');

-- Index for location-based parcel queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_parcels_pickup_location 
ON parcels USING GIST (
  ST_Point(pickup_location_longitude, pickup_location_latitude)
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_parcels_delivery_location 
ON parcels USING GIST (
  ST_Point(delivery_location_longitude, delivery_location_latitude)
);

-- Index for parcel status and assignment
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_parcels_status_vehicle 
ON parcels (status, assigned_vehicle_id, created_at DESC);

-- Index for tracking number lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_parcels_tracking_number 
ON parcels (tracking_number) WHERE tracking_number IS NOT NULL;

-- Index for weight and dimensions (for capacity calculations)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_parcels_weight_dimensions 
ON parcels (weight, (dimensions->>'length')::numeric, (dimensions->>'width')::numeric, (dimensions->>'height')::numeric);

-- =====================================================
-- DECISION ENGINE OPTIMIZATIONS
-- =====================================================

-- Index for decision lookups by parcel
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_decisions_parcel_timestamp 
ON decisions (parcel_id, request_timestamp DESC);

-- Index for shadow mode decisions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_decisions_shadow_mode 
ON decisions (shadow_mode, request_timestamp DESC) WHERE shadow_mode = true;

-- Index for executed decisions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_decisions_executed 
ON decisions (executed, request_timestamp DESC);

-- Index for recommended vehicle analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_decisions_recommended_vehicle 
ON decisions (recommended_vehicle_id, score DESC) WHERE recommended_vehicle_id IS NOT NULL;

-- =====================================================
-- AUDIT LOG OPTIMIZATIONS
-- =====================================================

-- Index for audit log queries by timestamp (most common)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_timestamp 
ON audit_logs (created_at DESC);

-- Index for audit log queries by entity
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_entity 
ON audit_logs (entity_type, entity_id, created_at DESC);

-- Index for audit log queries by user
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user 
ON audit_logs (user_id, created_at DESC) WHERE user_id IS NOT NULL;

-- Index for audit log queries by action
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_action 
ON audit_logs (action, created_at DESC);

-- =====================================================
-- ANALYTICS OPTIMIZATIONS
-- =====================================================

-- Index for analytics metrics by date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_metrics_date 
ON analytics_metrics (metric_date DESC, metric_type);

-- Index for custom KPIs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_custom_kpis_name_date 
ON custom_kpis (kpi_name, calculation_date DESC);

-- Index for daily metrics summary
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_metrics_summary_date 
ON daily_metrics_summary (summary_date DESC);

-- =====================================================
-- CUSTODY CHAIN OPTIMIZATIONS
-- =====================================================

-- Index for custody records by parcel
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_custody_records_parcel 
ON custody_records (parcel_id, timestamp DESC);

-- Index for custody records by blockchain transaction
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_custody_records_blockchain_tx 
ON custody_records (blockchain_tx_hash) WHERE blockchain_tx_hash IS NOT NULL;

-- Index for custody records by parties
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_custody_records_parties 
ON custody_records (from_party, to_party, timestamp DESC);

-- =====================================================
-- USER AND AUTHENTICATION OPTIMIZATIONS
-- =====================================================

-- Index for user lookups by email
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email 
ON users (email) WHERE email IS NOT NULL;

-- Index for user lookups by role
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role 
ON users (role, created_at DESC);

-- Index for security events
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_timestamp 
ON security_events (created_at DESC);

-- Index for security events by user
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_user 
ON security_events (user_id, event_type, created_at DESC) WHERE user_id IS NOT NULL;

-- =====================================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- =====================================================

-- Composite index for decision engine vehicle evaluation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_decision_evaluation 
ON vehicles (
  status,
  type,
  (capacity->>'maxWeight')::numeric - (capacity->>'currentWeight')::numeric,
  updated_at DESC
) WHERE status = 'ACTIVE';

-- Composite index for parcel assignment queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_parcels_assignment_ready 
ON parcels (
  status,
  sla_deadline ASC,
  weight,
  created_at DESC
) WHERE status = 'PENDING' AND assigned_vehicle_id IS NULL;

-- Composite index for analytics queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_decisions_analytics 
ON decisions (
  request_timestamp::date,
  executed,
  shadow_mode,
  score
) WHERE request_timestamp >= CURRENT_DATE - INTERVAL '30 days';

-- =====================================================
-- PARTIAL INDEXES FOR PERFORMANCE
-- =====================================================

-- Partial index for active vehicles only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_active_only 
ON vehicles (id, type, updated_at DESC) WHERE status = 'ACTIVE';

-- Partial index for pending parcels only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_parcels_pending_only 
ON parcels (id, sla_deadline ASC, weight) WHERE status = 'PENDING';

-- Partial index for recent decisions only (last 7 days)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_decisions_recent 
ON decisions (parcel_id, score DESC, request_timestamp DESC) 
WHERE request_timestamp >= CURRENT_DATE - INTERVAL '7 days';

-- =====================================================
-- MATERIALIZED VIEWS FOR ANALYTICS
-- =====================================================

-- Materialized view for vehicle utilization metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_vehicle_utilization AS
SELECT 
  v.id,
  v.type,
  v.driver_id,
  (v.capacity->>'currentWeight')::numeric / (v.capacity->>'maxWeight')::numeric * 100 AS weight_utilization,
  (v.capacity->>'currentVolume')::numeric / (v.capacity->>'maxVolume')::numeric * 100 AS volume_utilization,
  COUNT(p.id) AS assigned_parcels,
  v.updated_at
FROM vehicles v
LEFT JOIN parcels p ON p.assigned_vehicle_id = v.id AND p.status IN ('ASSIGNED', 'IN_TRANSIT')
WHERE v.status = 'ACTIVE'
GROUP BY v.id, v.type, v.driver_id, v.capacity, v.updated_at;

-- Index on materialized view
CREATE INDEX IF NOT EXISTS idx_mv_vehicle_utilization_type 
ON mv_vehicle_utilization (type, weight_utilization DESC);

-- Materialized view for daily decision metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_decision_metrics AS
SELECT 
  request_timestamp::date AS decision_date,
  COUNT(*) AS total_decisions,
  COUNT(*) FILTER (WHERE executed = true) AS executed_decisions,
  COUNT(*) FILTER (WHERE shadow_mode = true) AS shadow_decisions,
  COUNT(*) FILTER (WHERE recommended_vehicle_id IS NOT NULL) AS successful_assignments,
  AVG(score) AS average_score,
  MAX(score) AS max_score,
  MIN(score) AS min_score
FROM decisions
WHERE request_timestamp >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY request_timestamp::date;

-- Index on materialized view
CREATE INDEX IF NOT EXISTS idx_mv_daily_decision_metrics_date 
ON mv_daily_decision_metrics (decision_date DESC);

-- =====================================================
-- REFRESH MATERIALIZED VIEWS (Run periodically)
-- =====================================================

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_vehicle_utilization;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_decision_metrics;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VACUUM AND ANALYZE RECOMMENDATIONS
-- =====================================================

-- Auto-vacuum settings for high-traffic tables
ALTER TABLE vehicles SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE parcels SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE decisions SET (
  autovacuum_vacuum_scale_factor = 0.2,
  autovacuum_analyze_scale_factor = 0.1
);

ALTER TABLE audit_logs SET (
  autovacuum_vacuum_scale_factor = 0.2,
  autovacuum_analyze_scale_factor = 0.1
);

-- =====================================================
-- PERFORMANCE MONITORING QUERIES
-- =====================================================

-- Query to monitor slow queries
CREATE OR REPLACE VIEW v_slow_queries AS
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  rows,
  100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
WHERE mean_time > 100  -- Queries taking more than 100ms on average
ORDER BY mean_time DESC;

-- Query to monitor index usage
CREATE OR REPLACE VIEW v_index_usage AS
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_tup_read,
  idx_tup_fetch,
  idx_scan,
  CASE 
    WHEN idx_scan = 0 THEN 'Never used'
    WHEN idx_scan < 100 THEN 'Rarely used'
    ELSE 'Frequently used'
  END AS usage_status
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Query to monitor table sizes
CREATE OR REPLACE VIEW v_table_sizes AS
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Database optimization script completed successfully!';
  RAISE NOTICE 'Created indexes for: vehicles, parcels, decisions, audit_logs, analytics, custody_records, users';
  RAISE NOTICE 'Created materialized views for analytics performance';
  RAISE NOTICE 'Configured auto-vacuum settings for high-traffic tables';
  RAISE NOTICE 'Created monitoring views for performance analysis';
END $$;