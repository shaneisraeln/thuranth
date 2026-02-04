-- Seed data for users table
-- Description: Create initial system users for development and testing

-- Insert admin user
INSERT INTO users (id, email, name, role, phone, password_hash, is_active) VALUES
(
    '00000000-0000-0000-0000-000000000001',
    'admin@pdcp.com',
    'System Administrator',
    'ADMIN',
    '+91-9876543210',
    '$2b$10$rQZ8kHWfQZGQQQQQQQQQQOeKf.Qf.Qf.Qf.Qf.Qf.Qf.Qf.Qf.Qf.Q', -- password: admin123
    true
) ON CONFLICT (email) DO NOTHING;

-- Insert dispatcher users
INSERT INTO users (id, email, name, role, phone, password_hash, is_active) VALUES
(
    '00000000-0000-0000-0000-000000000002',
    'dispatcher1@pdcp.com',
    'Rajesh Kumar',
    'DISPATCHER',
    '+91-9876543211',
    '$2b$10$rQZ8kHWfQZGQQQQQQQQQQOeKf.Qf.Qf.Qf.Qf.Qf.Qf.Qf.Qf.Qf.Q', -- password: dispatcher123
    true
),
(
    '00000000-0000-0000-0000-000000000003',
    'dispatcher2@pdcp.com',
    'Priya Sharma',
    'DISPATCHER',
    '+91-9876543212',
    '$2b$10$rQZ8kHWfQZGQQQQQQQQQQOeKf.Qf.Qf.Qf.Qf.Qf.Qf.Qf.Qf.Qf.Q', -- password: dispatcher123
    true
) ON CONFLICT (email) DO NOTHING;

-- Insert driver users
INSERT INTO users (id, email, name, role, phone, password_hash, is_active) VALUES
(
    '00000000-0000-0000-0000-000000000004',
    'driver1@pdcp.com',
    'Amit Singh',
    'DRIVER',
    '+91-9876543213',
    '$2b$10$rQZ8kHWfQZGQQQQQQQQQQOeKf.Qf.Qf.Qf.Qf.Qf.Qf.Qf.Qf.Qf.Q', -- password: driver123
    true
),
(
    '00000000-0000-0000-0000-000000000005',
    'driver2@pdcp.com',
    'Suresh Patel',
    'DRIVER',
    '+91-9876543214',
    '$2b$10$rQZ8kHWfQZGQQQQQQQQQQOeKf.Qf.Qf.Qf.Qf.Qf.Qf.Qf.Qf.Qf.Q', -- password: driver123
    true
),
(
    '00000000-0000-0000-0000-000000000006',
    'driver3@pdcp.com',
    'Ravi Gupta',
    'DRIVER',
    '+91-9876543215',
    '$2b$10$rQZ8kHWfQZGQQQQQQQQQQOeKf.Qf.Qf.Qf.Qf.Qf.Qf.Qf.Qf.Qf.Q', -- password: driver123
    true
),
(
    '00000000-0000-0000-0000-000000000007',
    'driver4@pdcp.com',
    'Deepak Yadav',
    'DRIVER',
    '+91-9876543216',
    '$2b$10$rQZ8kHWfQZGQQQQQQQQQQOeKf.Qf.Qf.Qf.Qf.Qf.Qf.Qf.Qf.Qf.Q', -- password: driver123
    true
) ON CONFLICT (email) DO NOTHING;