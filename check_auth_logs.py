from postgres_db import PostgresDB

db = PostgresDB.from_env()

# Check if table exists in htc schema
print("Checking for auth_logs table in htc schema...")
rows, cols = db.select("SELECT * FROM information_schema.tables WHERE table_schema = 'htc' AND table_name = 'auth_logs'")
print(f"Table exists: {len(rows) > 0}")

if len(rows) > 0:
    # Get table structure
    print("\nTable structure:")
    rows, cols = db.select("""
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_schema = 'htc' AND table_name = 'auth_logs'
        ORDER BY ordinal_position
    """)
    for row in rows:
        print(f"  {row[0]}: {row[1]} (nullable: {row[2]})")
    
    # Check RLS policies
    print("\nRLS policies:")
    rows, cols = db.select("""
        SELECT policyname, permissive, roles, cmd, qual 
        FROM pg_policies 
        WHERE schemaname = 'htc' AND tablename = 'auth_logs'
    """)
    if len(rows) > 0:
        for row in rows:
            print(f"  Policy: {row[0]}, Roles: {row[2]}, Cmd: {row[3]}")
    else:
        print("  No RLS policies found")
    
    # Check if RLS is enabled
    rows, cols = db.select("""
        SELECT relrowsecurity 
        FROM pg_class 
        WHERE relname = 'auth_logs' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'htc')
    """)
    if len(rows) > 0:
        print(f"\nRLS enabled: {rows[0][0]}")
else:
    print("Table not found. Creating it...")
    db.execute("""
        CREATE TABLE htc.auth_logs (
            id SERIAL PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id),
            event_type TEXT,
            event_data JSONB,
            ip_address TEXT,
            user_agent TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    """)
    print("Table created successfully")
    
    # Grant permissions
    db.execute("GRANT ALL ON htc.auth_logs TO authenticated")
    db.execute("GRANT ALL ON SEQUENCE htc.auth_logs_id_seq TO authenticated")
    db.execute("GRANT USAGE ON SCHEMA htc TO authenticated")
    print("Permissions granted")
