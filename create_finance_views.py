from postgres_db import PostgresDB

def create_views():
    db = PostgresDB.from_env()
    
    # Create detail view
    detail_sql = """
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
    """
    
    # Create summary view
    summary_sql = """
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
    """
    
    try:
        print("Creating detail view...")
        db.execute(detail_sql)
        print("Detail view created successfully.")
        
        print("Creating summary view...")
        db.execute(summary_sql)
        print("Summary view created successfully.")
        
        print("\nAll finance views created successfully!")
    except Exception as e:
        print(f"Error creating views: {e}")

if __name__ == "__main__":
    create_views()
