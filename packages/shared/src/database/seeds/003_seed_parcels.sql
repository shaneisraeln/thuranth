-- Seed data for parcels table
-- Description: Create sample parcels for development and testing

-- Insert sample parcels
INSERT INTO parcels (
    id, tracking_number, 
    sender_name, sender_phone, sender_email, sender_address_street, sender_address_city, sender_address_state, sender_address_postal_code, sender_address_country,
    recipient_name, recipient_phone, recipient_email, recipient_address_street, recipient_address_city, recipient_address_state, recipient_address_postal_code, recipient_address_country,
    pickup_location, delivery_location, sla_deadline, weight, length_cm, width_cm, height_cm, value_amount, priority, status
) VALUES
(
    '20000000-0000-0000-0000-000000000001',
    'PDCP001234567890',
    'Ramesh Electronics', '+91-9876543220', 'ramesh@electronics.com', '123 MG Road', 'Mumbai', 'Maharashtra', '400001', 'India',
    'Sunita Devi', '+91-9876543221', 'sunita@gmail.com', '456 SV Road', 'Mumbai', 'Maharashtra', '400050', 'India',
    ST_SetSRID(ST_MakePoint(72.8777, 19.0760), 4326), -- Pickup: MG Road, Mumbai
    ST_SetSRID(ST_MakePoint(72.8350, 19.0400), 4326), -- Delivery: SV Road, Mumbai
    CURRENT_TIMESTAMP + INTERVAL '4 hours',
    2.5, 30.0, 20.0, 15.0, 5000.00, 'HIGH', 'PENDING'
),
(
    '20000000-0000-0000-0000-000000000002',
    'PDCP001234567891',
    'Fashion Hub', '+91-9876543222', 'orders@fashionhub.com', '789 Linking Road', 'Mumbai', 'Maharashtra', '400050', 'India',
    'Arjun Kumar', '+91-9876543223', 'arjun.k@yahoo.com', '321 Hill Road', 'Mumbai', 'Maharashtra', '400050', 'India',
    ST_SetSRID(ST_MakePoint(72.8350, 19.0400), 4326), -- Pickup: Linking Road
    ST_SetSRID(ST_MakePoint(72.8260, 19.0540), 4326), -- Delivery: Hill Road
    CURRENT_TIMESTAMP + INTERVAL '6 hours',
    1.2, 25.0, 15.0, 10.0, 2500.00, 'MEDIUM', 'PENDING'
),
(
    '20000000-0000-0000-0000-000000000003',
    'PDCP001234567892',
    'Book Store', '+91-9876543224', 'info@bookstore.com', '555 FC Road', 'Mumbai', 'Maharashtra', '400004', 'India',
    'Meera Joshi', '+91-9876543225', 'meera.joshi@gmail.com', '777 Carter Road', 'Mumbai', 'Maharashtra', '400050', 'India',
    ST_SetSRID(ST_MakePoint(72.8777, 19.0760), 4326), -- Pickup: FC Road
    ST_SetSRID(ST_MakePoint(72.8190, 19.0550), 4326), -- Delivery: Carter Road
    CURRENT_TIMESTAMP + INTERVAL '8 hours',
    0.8, 20.0, 15.0, 5.0, 800.00, 'LOW', 'PENDING'
),
(
    '20000000-0000-0000-0000-000000000004',
    'PDCP001234567893',
    'Medical Supplies Co', '+91-9876543226', 'urgent@medicals.com', '999 LBS Marg', 'Mumbai', 'Maharashtra', '400070', 'India',
    'Dr. Sharma', '+91-9876543227', 'dr.sharma@hospital.com', '111 Worli Sea Face', 'Mumbai', 'Maharashtra', '400018', 'India',
    ST_SetSRID(ST_MakePoint(72.8777, 19.0760), 4326), -- Pickup: LBS Marg
    ST_SetSRID(ST_MakePoint(72.8180, 19.0130), 4326), -- Delivery: Worli
    CURRENT_TIMESTAMP + INTERVAL '2 hours',
    5.0, 40.0, 30.0, 20.0, 15000.00, 'URGENT', 'PENDING'
) ON CONFLICT (tracking_number) DO NOTHING;