-- Seed data for vehicles table
-- Description: Create initial vehicles for development and testing

-- Insert 2-wheeler vehicles
INSERT INTO vehicles (id, registration_number, type, driver_id, max_weight, max_volume, current_location, status, eligibility_score) VALUES
(
    '10000000-0000-0000-0000-000000000001',
    'MH12AB1234',
    '2W',
    '00000000-0000-0000-0000-000000000004', -- driver1
    50.00, -- 50kg max weight
    150000.00, -- 150L volume in cm3
    ST_SetSRID(ST_MakePoint(72.8777, 19.0760), 4326), -- Mumbai coordinates
    'AVAILABLE',
    95.5
),
(
    '10000000-0000-0000-0000-000000000002',
    'MH12CD5678',
    '2W',
    '00000000-0000-0000-0000-000000000005', -- driver2
    45.00,
    140000.00,
    ST_SetSRID(ST_MakePoint(72.8850, 19.0850), 4326),
    'AVAILABLE',
    88.2
) ON CONFLICT (registration_number) DO NOTHING;

-- Insert 4-wheeler vehicles
INSERT INTO vehicles (id, registration_number, type, driver_id, max_weight, max_volume, current_location, status, eligibility_score) VALUES
(
    '10000000-0000-0000-0000-000000000003',
    'MH12EF9012',
    '4W',
    '00000000-0000-0000-0000-000000000006', -- driver3
    500.00, -- 500kg max weight
    2000000.00, -- 2000L volume in cm3
    ST_SetSRID(ST_MakePoint(72.8650, 19.0650), 4326),
    'AVAILABLE',
    92.8
),
(
    '10000000-0000-0000-0000-000000000004',
    'MH12GH3456',
    '4W',
    '00000000-0000-0000-0000-000000000007', -- driver4
    450.00,
    1800000.00,
    ST_SetSRID(ST_MakePoint(72.8950, 19.0950), 4326),
    'ON_ROUTE',
    85.6
) ON CONFLICT (registration_number) DO NOTHING;