-- htc.v_check_register_summary source

DROP VIEW IF EXISTS htc.v_check_register_summary;
CREATE OR REPLACE VIEW htc.v_check_register_summary
AS 
SELECT 
    to_char(trans_date, 'Mon YY') AS month_year,
    trans_date,
    trans_year,
    sum(deposit) AS total_deposits,
    sum(withdrawal) AS total_withdrawals,
    max(balance) AS ending_balance,
    avg(balance) AS avg_balance
FROM htc.check_register_raw
GROUP BY to_char(trans_date, 'Mon YY'), trans_date, trans_year
ORDER BY trans_date;
