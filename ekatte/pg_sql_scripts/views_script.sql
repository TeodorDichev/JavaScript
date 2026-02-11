CREATE OR REPLACE VIEW settlement_home_view AS
SELECT 
    s.ekatte AS ekatte,
    s.name AS settlement_name,
	s.transliteration AS settlement_translit,
    s.last_changed_on AS settlement_last_change,
    m.name AS mayorality_name,
	m.transliteration AS mayorality_translit,
    mu.name AS municipality_name,
	mu.transliteration AS municipality_translit,
    r.name AS region_name,
	r.transliteration AS region_translit
FROM settlement s
LEFT JOIN mayorality m ON s.mayorality_id = m.mayorality_id
JOIN municipality mu ON s.municipality_id = mu.municipality_id
JOIN region r ON mu.region_id = r.region_id;

CREATE OR REPLACE VIEW mayorality_home_view AS
SELECT 
    m.mayorality_id,
    m.name AS mayorality_name,
    m.transliteration AS mayorality_translit,
    m.last_changed_on AS mayorality_last_change,
    mu.name AS municipality_name,
	mu.municipality_id AS municipality_id,
    r.name AS region_name,
	r.region_id AS region_id,
    s_center.name AS center_name,
	s_center.transliteration AS center_translit,
	s_center.ekatte AS center_ekatte
FROM mayorality m
JOIN municipality mu ON m.municipality_id = mu.municipality_id
JOIN region r ON mu.region_id = r.region_id
LEFT JOIN mayorality_center mc ON mc.mayorality_id = m.mayorality_id
LEFT JOIN settlement s_center ON s_center.ekatte = mc.settlement_ekatte;

CREATE OR REPLACE VIEW municipality_home_view AS
SELECT 
    m.municipality_id,
    m.name AS municipality_name,
    m.transliteration AS municipality_translit,
    m.last_changed_on AS municipality_last_change,
    r.name AS region_name,
	r.region_id AS region_id,
    s_center.name AS center_name,
	s_center.transliteration AS center_translit,
	s_center.ekatte AS center_ekatte
FROM municipality m
JOIN region r ON m.region_id = r.region_id
LEFT JOIN municipality_center mc ON mc.municipality_id = m.municipality_id
LEFT JOIN settlement s_center ON s_center.ekatte = mc.settlement_ekatte;

CREATE OR REPLACE VIEW region_home_view AS
SELECT 
    r.region_id,
    r.name AS region_name,
	r.transliteration AS region_translit,
	r.nuts3_id,
    r.last_changed_on AS region_last_change,
    s_center.name AS center_name,
	s_center.transliteration AS center_translit,
	s_center.ekatte AS center_ekatte
FROM region r
LEFT JOIN region_center rc ON rc.region_id = r.region_id
LEFT JOIN settlement s_center ON s_center.ekatte = rc.settlement_ekatte;