from postgres_db import PostgresDB

db = PostgresDB.from_env()

print("Granting permissions to authenticated role...")
try:
    # Grant usage on schema
    db.execute("GRANT USAGE ON SCHEMA htc TO authenticated")
    print("OK: Granted USAGE on htc schema")
    
    # Grant all permissions on auth_logs table
    db.execute("GRANT ALL ON htc.auth_logs TO authenticated")
    print("OK: Granted ALL on htc.auth_logs table")
    
    # Grant permissions on sequence
    db.execute("GRANT ALL ON SEQUENCE htc.auth_logs_id_seq TO authenticated")
    print("OK: Granted ALL on htc.auth_logs_id_seq sequence")
    
    print("\nAll permissions granted successfully!")
except Exception as e:
    print(f"Error granting permissions: {e}")
