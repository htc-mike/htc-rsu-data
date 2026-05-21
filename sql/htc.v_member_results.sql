-- htc.v_member_results source
-- View to show race results without joins

drop VIEW htc.v_member_results;
CREATE OR REPLACE VIEW htc.v_member_results
AS 
SELECT 
    res.*,
    res.place AS race_place,
    res.first_name || ' ' || res.last_name AS name,
    res.gender || ' ' || res.age::text AS division,
    res.chip_time AS time,
    res.age_percentage AS age_grade
    
FROM htc.results res;
