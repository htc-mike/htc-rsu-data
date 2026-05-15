-- htc.v_race_revenue_summary source

drop VIEW htc.v_race_revenue_summary;
CREATE OR REPLACE VIEW htc.v_race_revenue_summary
AS 
WITH cte_rev_current AS (
         SELECT c.name AS race_name,
            c.race_id,
            to_char(e.start_time, 'yyyy'::text) AS race_year,
            count(r.*) AS registrations,
            sum(r.amount_paid - r.processing_fee_paid_by_user) AS revenue
           FROM htc.registrations r
             JOIN htc.events e ON e.event_id = r.event_id
             JOIN htc.races c ON c.race_id = e.race_id
          WHERE to_char(e.start_time, 'yyyy'::text) = to_char(now(), 'yyyy'::text)
          GROUP BY c.name, c.race_id, (to_char(e.start_time, 'yyyy'::text))
        ), cte_rev_prior AS (
         SELECT c.name AS race_name,
            c.race_id,
            to_char(e.start_time, 'yyyy'::text) AS race_year,
            count(r.*) AS registrations,
            sum(r.amount_paid - r.processing_fee_paid_by_user) AS revenue
           FROM htc.registrations r
             JOIN htc.events e ON e.event_id = r.event_id
             JOIN htc.races c ON c.race_id = e.race_id
          WHERE to_char(e.start_time, 'yyyy'::text) = to_char(now() - '365 days'::interval, 'yyyy'::text) --AND r.registration_date < (now() - '365 days'::interval)
          GROUP BY c.name, c.race_id, (to_char(e.start_time, 'yyyy'::text))
        ), cte_dons_current AS (
         SELECT donations.race_id,
            to_char(donations.donation_timestamp, 'yyyy'::text) AS race_year,
            sum(donations.donation_amount) AS donations
           FROM htc.donations
          WHERE to_char(donations.donation_timestamp, 'yyyy'::text) = to_char(now(), 'yyyy'::text)
          GROUP BY donations.race_id, (to_char(donations.donation_timestamp, 'yyyy'::text))
        ), cte_dons_prior AS (
         SELECT donations.race_id,
            to_char(donations.donation_timestamp, 'yyyy'::text) AS race_year,
            sum(donations.donation_amount) AS donations
           FROM htc.donations
          WHERE to_char(donations.donation_timestamp, 'yyyy'::text) = to_char(now() - '365 days'::interval, 'yyyy'::text) --AND donations.donation_timestamp > (now() - '365 days'::interval)
          GROUP BY donations.race_id, (to_char(donations.donation_timestamp, 'yyyy'::text))
        ), cte AS (
         SELECT 
         	r1.race_id,
         	r1.race_name,
            r1.race_year,
            r1.registrations,
            r1.revenue,
            d1.donations
           FROM cte_rev_current r1
             LEFT JOIN cte_dons_current d1 ON d1.race_id = r1.race_id AND d1.race_year = r1.race_year
        UNION ALL
         SELECT 
         	r2.race_id,
         	r2.race_name,
            r2.race_year,
            r2.registrations,
            r2.revenue,
            d2.donations
           FROM cte_rev_prior r2
             LEFT JOIN cte_dons_prior d2 ON d2.race_id = r2.race_id AND d2.race_year = r2.race_year
        ),
        active_tbl as (
            select distinct
                r.race_id,
                'Y' active
            from htc.races r
                join htc.events e on e.race_id = r.race_id 
            where e.registration_opens < now()
                and coalesce(e.end_time, e.registration_closes) > now()        
        )
 SELECT race_name,
    race_year,
    coalesce(t.active,'N') active,
    registrations,
    revenue,
    donations
   FROM cte
   	left join active_tbl t on t.race_id = cte.race_id
  ORDER BY race_name, race_year DESC;

                select distinct
                    r.race_id,
                    'Y' active
                from htc.races r
                    join htc.events e on e.race_id = r.race_id 
                where e.registration_opens < now()
                    and coalesce(e.end_time, e.registration_closes) > now()  