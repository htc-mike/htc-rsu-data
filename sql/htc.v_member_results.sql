-- htc.v_member_results source
-- View to show member race results with event and race information

drop VIEW htc.v_member_results;
CREATE OR REPLACE VIEW htc.v_member_results
AS 
SELECT 
    -- Grouping 1: Event Information
    to_char(e.start_time, 'YYYY-MM-DD') AS event_date,
    e.name AS event_name,
    e.city || ', ' || e.state AS location,
    
    -- Grouping 2: Race Information
    r.name AS race,
    r.distance,
    COUNT(*) OVER (PARTITION BY e.event_id, r.race_id) AS finishers,
    MIN(res.chip_time) OVER (PARTITION BY e.event_id, r.race_id) AS first_place_time,
    
    -- Detail: Individual Results
    res.place AS race_place,
    res.first_name || ' ' || res.last_name AS name,
    res.gender || ' ' || res.age::text AS division,
    res.division_place,
    res.chip_time AS time,
    res.pace,
    res.age_percentage AS age_grade,
    
    -- Additional fields for filtering
    e.event_id,
    r.race_id,
    res.result_id,
    res.email,
    res.gender,
    res.age,
    res.city,
    res.state,
    e.start_time,
    r.url AS race_url
    
FROM htc.results res
JOIN htc.events e ON e.event_id = res.event_id
JOIN htc.races r ON r.race_id = e.race_id

ORDER BY e.start_time ASC, r.name, res.place;
