-- This script will be executed when the database container is first created.

-- Create service account for better_service
CREATE USER better_service WITH PASSWORD 'better_service_2024!';

-- Grant privileges to service account
GRANT ALL PRIVILEGES ON DATABASE tip TO better_service;
GRANT ALL PRIVILEGES ON SCHEMA public TO better_service;

-- Create a simple table for transitions to ensure the schema is initialized.
CREATE TABLE IF NOT EXISTS transitions (
    id SERIAL PRIMARY KEY,
    contract_name VARCHAR(255) NOT NULL,
    contract_number VARCHAR(100),
    status VARCHAR(50) DEFAULT 'On Track',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert some sample data for testing purposes.
INSERT INTO transitions (contract_name, contract_number) VALUES ('Project Phoenix', 'N00019-25-C-0001');
INSERT INTO transitions (contract_name, contract_number) VALUES ('Operation Overdrive', 'FA8675-25-C-0002');