-- Migration: Create parcels table
-- Description: Create parcels table for parcel management and tracking

CREATE TABLE IF NOT EXISTS parcels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tracking_number VARCHAR(100) UNIQUE NOT NULL,
    
    -- Sender information
    sender_name VARCHAR(255) NOT NULL,
    sender_phone VARCHAR(20) NOT NULL,
    sender_email VARCHAR(255),
    sender_address_street VARCHAR(500) NOT NULL,
    sender_address_city VARCHAR(100) NOT NULL,
    sender_address_state VARCHAR(100) NOT NULL,
    sender_address_postal_code VARCHAR(20) NOT NULL,
    sender_address_country VARCHAR(100) NOT NULL,
    
    -- Recipient information
    recipient_name VARCHAR(255) NOT NULL,
    recipient_phone VARCHAR(20) NOT NULL,
    recipient_email VARCHAR(255),
    recipient_address_street VARCHAR(500) NOT NULL,
    recipient_address_city VARCHAR(100) NOT NULL,
    recipient_address_state VARCHAR(100) NOT NULL,
    recipient_address_postal_code VARCHAR(20) NOT NULL,
    recipient_address_country VARCHAR(100) NOT NULL,
    
    -- Location information (using PostGIS)
    pickup_location GEOMETRY(POINT, 4326) NOT NULL,
    delivery_location GEOMETRY(POINT, 4326) NOT NULL,
    
    -- Parcel details
    sla_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    weight DECIMAL(10,2) NOT NULL CHECK (weight > 0),
    length_cm DECIMAL(8,2) NOT NULL CHECK (length_cm > 0),
    width_cm DECIMAL(8,2) NOT NULL CHECK (width_cm > 0),
    height_cm DECIMAL(8,2) NOT NULL CHECK (height_cm > 0),
    volume_cm3 DECIMAL(15,2) GENERATED ALWAYS AS (length_cm * width_cm * height_cm) STORED,
    value_amount DECIMAL(12,2) NOT NULL CHECK (value_amount >= 0),
    priority VARCHAR(10) NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    
    -- Assignment information
    status parcel_status DEFAULT 'PENDING',
    assigned_vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_parcels_tracking_number ON parcels(tracking_number);
CREATE INDEX idx_parcels_status ON parcels(status);
CREATE INDEX idx_parcels_assigned_vehicle ON parcels(assigned_vehicle_id);
CREATE INDEX idx_parcels_sla_deadline ON parcels(sla_deadline);
CREATE INDEX idx_parcels_priority ON parcels(priority);
CREATE INDEX idx_parcels_pickup_location ON parcels USING GIST(pickup_location);
CREATE INDEX idx_parcels_delivery_location ON parcels USING GIST(delivery_location);
CREATE INDEX idx_parcels_created_at ON parcels(created_at);

-- Create trigger for updated_at
CREATE TRIGGER update_parcels_updated_at BEFORE UPDATE ON parcels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();