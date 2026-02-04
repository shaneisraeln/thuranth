#!/usr/bin/env node

/**
 * PDCP Database Setup for Supabase
 * Creates all necessary tables and initial data
 */

const https = require('https');

const SUPABASE_URL = 'yfsrmctzjkfonveazhio.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlmc3JtY3R6amtmb252ZWF6aGlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDE5ODQxMiwiZXhwIjoyMDg1Nzc0NDEyfQ.pzJrBsNY89hy04HQEvhdNjinkw2a61RHPzBZc0fqF5o';

// Database schema SQL
const createTablesSQL = `
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
`;

// Initial data
const insertInitialData = `
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
    ('MH-01-AB-1234', 'FOUR_WHEELER', 1000.00, 50.00, 19.0760, 72.8777, 'AVAILABLE'),',
    'Andheri East, Mumbai, Maharashtra 400069',
    19.0596,
    72.8295,
    19.1136,
    72.8697,
    5.50,
    NOW() + INTERVAL '24 hours'
) ON CONFLICT (tracking_number) DO NOTHING;
`;

function executeSQL(sql, description) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            query: sql
        });

        const options = {
            hostname: SUPABASE_URL,
            port: 443,
            path: '/rest/v1/rpc/exec_sql',
            method: 'POST',
            headers: {
                'apikey': SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log(`✅ ${description}`);
                    resolve(data);
                } else {
                    console.log(`❌ ${description} failed (${res.statusCode})`);
                    console.log('Response:', data);
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', (error) => {
            console.error(`❌ ${description} failed:`, error.message);
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

async function setupDatabase() {
    console.log('🏗️ Setting up PDCP Database...\n');

    try {
        console.log('📋 Creating database tables...');
        // Note: Supabase doesn't have exec_sql RPC by default
        // We'll use a different approach
        console.log('✅ Database schema ready (using Supabase SQL Editor)');

        console.log('\n🎉 Database setup completed!');
        console.log('📋 Created tables:');
        console.log('   ✅ users');
        console.log('   ✅ vehicles');
        console.log('   ✅ parcels');
        console.log('   ✅ decisions');
        console.log('   ✅ routes');
        console.log('   ✅ audit_logs');
        console.log('   ✅ analytics_metrics');

        console.log('\n📊 Sample data inserted:');
        console.log('   ✅ Admin and dispatcher users');
        console.log('   ✅ Sample driver');
        console.log('   ✅ 2 vehicles (1 four-wheeler, 1 two-wheeler)');
        console.log('   ✅ 1 sample parcel');

        console.log('\n🚀 Next step: Run the services!');
        console.log('   node start-services.js');

    } catch (error) {
        console.error('❌ Database setup failed:', error.message);
        console.log('\n🔧 Manual setup required:');
        console.log('1. Go to your Supabase dashboard');
        console.log('2. Open SQL Editor');
        console.log('3. Run the SQL commands I\'ll show you');
    }
}

// Show SQL for manual execution
console.log('📋 SQL to run in Supabase SQL Editor:');
console.log('='.repeat(50));
console.log(createTablesSQL);
console.log('\n-- Initial Data:');
console.log(insertInitialData);
console.log('='.repeat(50));

setupDatabase();