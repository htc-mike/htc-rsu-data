from flask import Flask, jsonify, request
from flask_cors import CORS
import sys
import os
import json
from dotenv import load_dotenv

# Load environment variables from .env file in the backend directory
backend_dir = os.path.dirname(os.path.abspath(__file__))
env_file = os.path.join(backend_dir, '.env')
load_dotenv(env_file)

# Add parent directories to path to import postgres_db
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from postgres_db import PostgresDB

app = Flask(__name__)
CORS(app)

# Try to load from environment variables first, fall back to config file
def get_db():
    # Try to use environment variables (Supabase or local)
    db = PostgresDB.from_env()
    if db.conn is not None:
        return db
    
    # Fall back to config file if environment variables not set
    DB_CONFIG = r'C:\projects\config\db_config.json'
    if os.path.exists(DB_CONFIG):
        with open(DB_CONFIG, "r", encoding="utf-8") as fh:
            cred = json.load(fh)
        return PostgresDB(**cred)
    
    raise Exception("No database configuration found. Please set environment variables or provide db_config.json")

@app.route('/api/races', methods=['GET'])
def get_races():
    db = get_db()
    query = """
    SELECT race_id, name, description, url, next_date, created, logo_url, address_city, address_state
    FROM htc.races
    WHERE next_date IS NOT NULL
    ORDER BY next_date NULLS LAST, name
    """
    rows, cols = db.select(query)
    races = [dict(zip(cols, row)) for row in rows]
    return jsonify(races)

@app.route('/api/races/<int:race_id>', methods=['GET'])
def get_race(race_id):
    db = get_db()
    query = f"""
    SELECT race_id, name, description, url, next_date, created, logo_url
    FROM htc.races
    WHERE race_id = {race_id}
    """
    rows, cols = db.select(query)
    if rows:
        return jsonify(dict(zip(cols, rows[0])))
    return jsonify({'error': 'Race not found'}), 404

@app.route('/api/races/<int:race_id>/events', methods=['GET'])
def get_race_events(race_id):
    db = get_db()
    query = f"""
    SELECT e.event_id, e.race_id, e.name, e.start_time, e.end_time, 
           e.registration_opens, e.registration_closes, e.participant_cap, e.race_fee,
           COUNT(DISTINCT r.registration_id) as registration_count,
           COUNT(DISTINCT res.result_id) as results_count
    FROM htc.events e
    LEFT JOIN htc.registrations r ON r.event_id = e.event_id
    LEFT JOIN htc.results res ON res.event_id = e.event_id
    WHERE e.race_id = {race_id}
    GROUP BY e.event_id, e.race_id, e.name, e.start_time, e.end_time, 
             e.registration_opens, e.registration_closes, e.participant_cap, e.race_fee
    ORDER BY e.start_time DESC
    """
    rows, cols = db.select(query)
    events = [dict(zip(cols, row)) for row in rows]
    return jsonify(events)

@app.route('/api/races/<int:race_id>/registrations-over-time', methods=['GET'])
def get_race_registrations_over_time(race_id):
    db = get_db()
    query = f"""
    SELECT 
        EXTRACT(YEAR FROM r.registration_date) as year,
        EXTRACT(MONTH FROM r.registration_date) as month,
        EXTRACT(DAY FROM r.registration_date) as day,
        TO_DATE(EXTRACT(YEAR FROM r.registration_date)::text || '-' || 
                EXTRACT(MONTH FROM r.registration_date)::text || '-' || 
                EXTRACT(DAY FROM r.registration_date)::text, 'YYYY-MM-DD') as date,
        COUNT(*) as count
    FROM htc.registrations r
    JOIN htc.events e ON e.event_id = r.event_id
    WHERE e.race_id = {race_id}
    GROUP BY year, month, day, date
    ORDER BY year, month, day
    """
    rows, cols = db.select(query)
    data = [dict(zip(cols, row)) for row in rows]
    return jsonify(data)

@app.route('/api/races/<int:race_id>/finishers-over-time', methods=['GET'])
def get_race_finishers_over_time(race_id):
    db = get_db()
    query = f"""
    SELECT 
        EXTRACT(YEAR FROM e.start_time) as year,
        EXTRACT(MONTH FROM e.start_time) as month,
        EXTRACT(DAY FROM e.start_time) as day,
        TO_DATE(EXTRACT(YEAR FROM e.start_time)::text || '-' || 
                EXTRACT(MONTH FROM e.start_time)::text || '-' || 
                EXTRACT(DAY FROM e.start_time)::text, 'YYYY-MM-DD') as date,
        COUNT(*) as count
    FROM htc.results res
    JOIN htc.events e ON e.event_id = res.event_id
    WHERE e.race_id = {race_id}
    GROUP BY year, month, day, date
    ORDER BY year, month, day
    """
    rows, cols = db.select(query)
    data = [dict(zip(cols, row)) for row in rows]
    return jsonify(data)

@app.route('/api/events/<int:event_id>/registrations', methods=['GET'])
def get_event_registrations(event_id):
    db = get_db()
    query = f"""
    SELECT r.registration_id, r.user_id, r.event_id, r.registration_date,
           r.amount_paid, r.processing_fee_paid_by_user, r.bib_num,
           u.first_name, u.middle_name, u.last_name, u.email, u.street,
           u.city, u.state, u.zip_code, u.country_code, u.dob, u.gender, u.phone,
           EXTRACT(YEAR FROM AGE(u.dob::date)) as age,
           e.name as event_name, e.start_time as event_start_time,
           race.name as race_name, race.race_id
    FROM htc.registrations r
    JOIN htc.users u ON u.user_id = r.user_id
    JOIN htc.events e ON e.event_id = r.event_id
    JOIN htc.races race ON race.race_id = e.race_id
    WHERE r.event_id = {event_id}
    ORDER BY r.registration_date
    """
    rows, cols = db.select(query)
    registrations = [dict(zip(cols, row)) for row in rows]
    return jsonify(registrations)

@app.route('/api/registrations', methods=['GET'])
def get_all_registrations():
    db = get_db()
    query = """
    SELECT r.registration_id, r.user_id, r.event_id, r.registration_date,
           r.amount_paid, r.processing_fee_paid_by_user, r.bib_num,
           u.first_name, u.middle_name, u.last_name, u.email, u.street,
           u.city, u.state, u.zip_code, u.country_code, u.dob, u.gender, u.phone,
           EXTRACT(YEAR FROM AGE(u.dob::date)) as age,
           e.name as event_name, e.start_time as event_start_time,
           race.name as race_name
    FROM htc.registrations r
    JOIN htc.users u ON u.user_id = r.user_id
    JOIN htc.events e ON e.event_id = r.event_id
    JOIN htc.races race ON race.race_id = e.race_id
    ORDER BY r.registration_date DESC
    """
    rows, cols = db.select(query)
    registrations = [dict(zip(cols, row)) for row in rows]
    return jsonify(registrations)

@app.route('/api/analytics/summary', methods=['GET'])
def get_analytics_summary():
    db = get_db()
    query = """
    SELECT 
        COUNT(DISTINCT race_id) as total_races,
        COUNT(DISTINCT event_id) as total_events,
        COUNT(DISTINCT registration_id) as total_registrations,
        SUM(amount_paid) as total_revenue,
        COUNT(DISTINCT user_id) as total_users
    FROM htc.registrations
    """
    rows, cols = db.select(query)
    if rows:
        return jsonify(dict(zip(cols, rows[0])))
    return jsonify({})

@app.route('/api/analytics/race-revenue', methods=['GET'])
def get_race_revenue():
    db = get_db()
    query = """
    SELECT 
        r.name as race_name,
        r.race_id,
        EXTRACT(YEAR FROM e.start_time) as year,
        COUNT(DISTINCT e.event_id) as event_count,
        COUNT(DISTINCT reg.registration_id) as registration_count,
        COALESCE(SUM(reg.amount_paid), 0) as total_revenue,
        COALESCE(AVG(reg.amount_paid), 0) as avg_revenue_per_registration
    FROM htc.races r
    LEFT JOIN htc.events e ON e.race_id = r.race_id
    LEFT JOIN htc.registrations reg ON reg.event_id = e.event_id
    GROUP BY r.race_id, r.name, EXTRACT(YEAR FROM e.start_time)
    ORDER BY r.name, year DESC NULLS LAST
    """
    rows, cols = db.select(query)
    data = [dict(zip(cols, row)) for row in rows]
    return jsonify(data)

@app.route('/api/analytics/registrations-over-time', methods=['GET'])
def get_registrations_over_time():
    db = get_db()
    query = """
    SELECT 
        DATE(registration_date) as date,
        COUNT(*) as registrations,
        SUM(amount_paid) as revenue
    FROM htc.registrations
    WHERE registration_date >= NOW() - INTERVAL '1 year'
    GROUP BY DATE(registration_date)
    ORDER BY date
    """
    rows, cols = db.select(query)
    data = [dict(zip(cols, row)) for row in rows]
    return jsonify(data)

@app.route('/api/donations', methods=['GET'])
def get_donations():
    db = get_db()
    query = """
    SELECT donation_id, race_id, user_id, donation_amount, donation_timestamp
    FROM htc.donations
    ORDER BY donation_timestamp DESC
    LIMIT 100
    """
    rows, cols = db.select(query)
    donations = [dict(zip(cols, row)) for row in rows]
    return jsonify(donations)

@app.route('/api/donations/summary', methods=['GET'])
def get_donations_summary():
    db = get_db()
    query = """
    SELECT 
        COUNT(*) as total_donations,
        COALESCE(SUM(donation_amount), 0) as total_amount
    FROM htc.donations
    """
    rows, cols = db.select(query)
    if rows:
        return jsonify(dict(zip(cols, rows[0])))
    return jsonify({'total_donations': 0, 'total_amount': 0})

@app.route('/api/races/year-over-year', methods=['GET'])
def get_race_year_over_year():
    db = get_db()
    query = """
    SELECT race_name, race_year, active, registrations, revenue, donations
    FROM htc.v_race_revenue_summary
    ORDER BY race_name, race_year DESC
    """
    rows, cols = db.select(query)
    data = [dict(zip(cols, row)) for row in rows]
    return jsonify(data)

@app.route('/api/events/<int:event_id>/results', methods=['GET'])
def get_event_results(event_id):
    db = get_db()
    query = f"""
    SELECT r.place, r.bib, r.first_name, r.last_name, r.gender, r.city, r.state,
           r.country_code, r.clock_time, r.chip_time, r.pace, r.age, r.age_percentage,
           e.name as event_name, e.start_time as event_start_time,
           race.name as race_name, race.race_id
    FROM htc.results r
    JOIN htc.events e ON e.event_id = r.event_id
    JOIN htc.races race ON race.race_id = e.race_id
    WHERE r.event_id = {event_id}
    ORDER BY r.place
    """
    rows, cols = db.select(query)
    results = [dict(zip(cols, row)) for row in rows]
    return jsonify(results)

@app.route('/api/results', methods=['GET'])
def get_all_results():
    db = get_db()
    query = """
    SELECT r.place, r.bib, r.first_name, r.last_name, r.gender, r.city, r.state,
           r.country_code, r.clock_time, r.chip_time, r.pace, r.age, r.age_percentage,
           e.name as event_name, e.start_time as event_start_time,
           race.name as race_name
    FROM htc.results r
    JOIN htc.events e ON e.event_id = r.event_id
    JOIN htc.races race ON race.race_id = e.race_id
    ORDER BY race.name, e.start_time, r.place
    """
    rows, cols = db.select(query)
    results = [dict(zip(cols, row)) for row in rows]
    return jsonify(results)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
