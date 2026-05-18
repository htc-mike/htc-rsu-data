-- htc.v_check_register_detail source

DROP VIEW IF EXISTS htc.v_check_register_detail;
CREATE OR REPLACE VIEW htc.v_check_register_detail
AS 
SELECT 
    number,
    trans_date,
    to_from,
    description,
    deposit,
    withdrawal,
    note,
    balance,
    bank_balance,
    statement_balance,
    outstanding_checks,
    trans_year
FROM htc.check_register_raw
ORDER BY trans_date DESC;
