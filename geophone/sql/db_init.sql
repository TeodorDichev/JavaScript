CREATE TABLE countries (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    iso_code VARCHAR NOT NULL,
    phone_code VARCHAR NOT NULL,
	population BIGINT,
	area DECIMAL,
	gdp_usd DECIMAL(20, 2)
);

CREATE TABLE phone_numbers (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR NOT NULL,
    country_id INTEGER REFERENCES countries(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);