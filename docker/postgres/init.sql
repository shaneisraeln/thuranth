-- Initialize PDCP database with basic setup
-- This script runs when the PostgreSQL container starts for the first time

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Create schemas for different services
CREATE SCHEMA IF NOT EXISTS vehicle_tracking;
CREATE SCHEMA IF NOT EXISTS parcel_management;
CREATE SCHEMA IF NOT EXISTS decision_engine;
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS audit;

-- Grant permissions
GRANT ALL PRIVILEGES ON SCHEMA vehicle_tracking TO pdcp_user;
GRANT ALL PRIVILEGES ON SCHEMA parcel_management TO pdcp_user;
GRANT ALL PRIVILEGES ON SCHEMA decision_engine TO pdcp_user;
GRANT ALL PRIVILEGES ON SCHEMA analytics TO pdcp_user;
GRANT ALL PRIVILEGES ON SCHEMA audit TO pdcp_user;

-- Create basic enum types
CREATE TYPE vehicle_type AS ENUM ('2W', '4W');
CREATE TYPE vehicle_status AS ENUM ('AVAILABLE', 'ON_ROUTE', 'OFFLINE', 'MAINTENANCE');
CREATE TYPE parcel_status AS ENUM ('PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'FAILED');
CREATE TYPE user_role AS ENUM ('DISPATCHER', 'DRIVER', 'ADMIN');

-- Basic tables will be created by the individual services using migrations