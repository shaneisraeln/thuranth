-- Migration: Create audit_logs table
-- Description: Create comprehensive audit logging table for all system operations

CREATE TYPE audit_event_type AS ENUM (
    'DECISION_MADE',
    'PARCEL_ASSIGNED',
    'PARCEL_STATUS_CHANGED',
    'VEHICLE_LOCATION_UPDATED',
    'ROUTE_UPDATED',
    'MANUAL_OVERRIDE',
    'USER_LOGIN',
    'USER_LOGOUT',
    'CUSTODY_TRANSFER',
    'SYSTEM_ERROR',
    'SECURITY_EVENT'
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type audit_event_type NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- 'parcel', 'vehicle', 'user', 'decision', etc.
    entity_id UUID, -- ID of the affected entity
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Event details stored as JSONB for flexibility
    event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Request context
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    
    -- Metadata
    service_name VARCHAR(100), -- which microservice generated the log
    correlation_id UUID, -- for tracing across services
    
    -- Cryptographic integrity
    data_hash VARCHAR(64), -- SHA-256 hash of event_data for integrity verification
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_service ON audit_logs(service_name);
CREATE INDEX idx_audit_logs_correlation ON audit_logs(correlation_id);

-- GIN index for JSONB event_data
CREATE INDEX idx_audit_logs_event_data ON audit_logs USING GIN(event_data);

-- Partial indexes for specific event types
CREATE INDEX idx_audit_logs_security_events ON audit_logs(created_at) 
    WHERE event_type = 'SECURITY_EVENT';
CREATE INDEX idx_audit_logs_manual_overrides ON audit_logs(created_at) 
    WHERE event_type = 'MANUAL_OVERRIDE';