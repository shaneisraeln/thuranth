-- PDCP Database Setup - Run this in Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'DISPATCHER', 'DRIVER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE vehicle_type AS ENUM ('TWO_WHEELER', 'FOUR_WHEELER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE vehicle_status AS ENUM ('AVAILABLE', 'IN_TRANSIT', 'OFFLINE', 'MAINTENANCE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE parcel_status AS ENUM ('PENDING_ASSIGNMENT', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role user_role NOT NULL DEFAULT 'DRIVER',
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration_number VARCHAR(50) UNIQUE NOT NULL,
    type vehicle_type NOT NULL,
    driver_id UUID REFERENCES users(id),
    max_weight DECIMAL(10,2) NOT NULL,
    max_volume DECIMAL(10,2) NOT NULL,
    current_weight DECIMAL(10,2) DEFAULT 0,
    current_volume DECIMAL(10,2) DEFAULT 0,
    current_latitude DECIMAL(10,8),
    current_longitude DECIMAL(11,8),
    status vehicle_status DEFAULT 'AVAILABLE',
    last_location_update TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Parcels table
CREATE TABLE IF NOT EXISTS parcels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tracking_number VARCHAR(100) UNIQUE NOT NULL,
    sender_name VARCHAR(255) NOT NULL,
    sender_phone VARCHAR(20),
    recipient_name VARCHAR(255) NOT NULL,
    recipient_phone VARCHAR(20),
    pickup_address TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    pickup_latitude DECIMAL(10,8),
    pickup_longitude DECIMAL(11,8),
    delivery_latitude DECIMAL(10,8),
    delivery_longitude DECIMAL(11,8),
    weight DECIMAL(8,2) NOT NULL,
    length DECIMAL(8,2),
    width DECIMAL(8,2),
    height DECIMAL(8,2),
    value DECIMAL(12,2),
    status parcel_status DEFAULT 'PENDING_ASSIGNMENT',
    sla_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    assigned_vehicle_id UUID REFERENCES vehicles(id),
    assigned_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Decisions table
CREATE TABLE IF NOT EXISTS decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id UUID REFERENCES parcels(id) NOT NULL,
    recommended_vehicle_id UUID REFERENCES vehicles(id),
    score DECIMAL(5,2),
    explanation JSONB,
    shadow_mode BOOLEAN DEFAULT false,
    executed BOOLEAN DEFAULT false,
    overridden BOOLEAN DEFAULT false,
    override_reason TEXT,
    override_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Routes table
CREATE TABLE IF NOT EXISTS routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES vehicles(id) NOT NULL,
    route_data JSONB NOT NULL,
    total_distance DECIMAL(10,2),
    total_duration INTEGER,
    optimized BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics metrics table
CREATE TABLE IF NOT EXISTS analytics_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    metric_date DATE NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vehicles_driver_id ON vehicles(driver_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_parcels_status ON parcels(status);
CREATE INDEX IF NOT EXISTS idx_parcels_assigned_vehicle ON parcels(assigned_vehicle_id);
CREATE INDEX IF NOT EXISTS idx_parcels_sla_deadline ON parcels(sla_deadline);
CREATE INDEX IF NOT EXISTS idx_decisions_parcel_id ON decisions(parcel_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_date ON analytics_metrics(metric_date);

-- Insert initial data
-- Insert admin user
INSERT INTO users (id, email, name, role, is_active) 
VALUES (
    uuid_generate_v4(),
    'admin@pdcp.com',
    'PDCP Administrator',
    'ADMIN',
    true
) ON CONFLICT (email) DO NOTHING;

-- Insert dispatcher user
INSERT INTO users (id, email, name, role, is_active) 
VALUES (
    uuid_generate_v4(),
    'dispatcher@pdcp.com',
    'PDCP Dispatcher',
    'DISPATCHER',
    true
) ON CONFLICT (email) DO NOTHING;

-- Insert sample driver
INSERT INTO users (id, email, name, role, phone, is_active) 
VALUES (
    uuid_generate_v4(),
    'driver1@pdcp.com',
    'Rajesh Kumar',
    'DRIVER',
    '+91-9876543210',
    true
) ON CONFLICT (email) DO NOTHING;

-- Insert sample vehicles
INSERT INTO vehicles (registration_number, type, max_weight, max_volume, current_latitude, current_longitude, status)
VALUES 
    ('MH-01-AB-1234', 'FOUR_WHEELER', 1000.00, 50.00, 19.0760, 72.8777, 'AVAILABLE'),
    ('MH-01-CD-5678', 'TWO_WHEELER', 50.00, 5.00, 19.0596, 72.8295, 'AVAILABLE')
ON CONFLICT (registration_number) DO NOTHING;

-- Insert sample parcel
INSERT INTO parcels (
    tracking_number, 
    sender_name, 
    sender_phone, 
    recipient_name, 
    recipient_phone,
    pickup_address, 
    delivery_address,
    pickup_latitude,
    pickup_longitude,
    delivery_latitude,
    delivery_longitude,
    weight,
    sla_deadline
)
VALUES (
    'PDCP001',
    'Amit Sharma',
    '+91-9876543211',
    'Priya Patel',
    '+91-9876543212',
    'Bandra West, Mumbai, Maharashtra 400050',
    'Andheri East, Mumbai, Maharashtra 400069',
    19.0596,
    72.8295,
    19.1136,
    72.8697,
    5.50,
    NOW() + INTERVAL '24 hours'
) ON CONFLICT (tracking_number) DO NOTHING;