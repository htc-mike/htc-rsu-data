import json
import os
import file_utils
from postgres_db import PostgresDB
import datetime
from rsu_data import RSU_Data

RSU_CONFIG = os.environ.get('RSU_CONFIG_PATH', 'rsu_client_config.json')
DB_CONFIG = os.environ.get('DB_CONFIG_PATH', 'db_config.json')

TBL_RACES = 'htc.races'
TBL_EVENTS = 'htc.events'
TBL_DONATIONS = 'htc.donations'
TBL_DONATION_PERIODS = 'htc.donation_periods'
TBL_USERS = 'htc.users'
TBL_REGISTRATIONS = 'htc.registrations'
TBL_MEMBERS = 'htc.memberships'
TBL_RESULTS = 'htc.results'

REFRESH_EVENTS = False
REFRESH_REGISTRATIONS = False
REFRESH_DONATIONS = False
REFRESH_MEMBERS = False
REFRESH_RESULTS = False
RACE_ID = None

def main():

    # with open(DB_CONFIG, "r", encoding="utf-8") as fh:
    #     cred: dict = json.load(fh)
    # db = PostgresDB(**cred)

    db = PostgresDB.from_env()

    rsu = RSU_Data(db=db)

    if REFRESH_EVENTS:
        update_race_events(rsu, db, race_id = RACE_ID)

    update_results(rsu, db,REFRESH_RESULTS)

    update_user_registrations(rsu, db, refresh = REFRESH_REGISTRATIONS, race_id = RACE_ID)
    update_user_donations(rsu, db, refresh = REFRESH_DONATIONS, race_id = RACE_ID)
    update_user_members(rsu, db, refresh=REFRESH_MEMBERS)

def update_race_events(rsu, db, race_id = None):
    if race_id is not None:
        sql = f"""
                select race_id, name from htc.races where race_id = {race_id}
            """
    else:
        sql = f"""
                select race_id, name from htc.races
            """
        
    df = db.select_df(sql)
    for index, row in df.iterrows():
        print(f"Race: {row['name']}")
        race, events = rsu.get_race_events(row['race_id'])
        print(f"  Events: {len(events)}")

        sql = f'delete from {TBL_RACES} where race_id = {row["race_id"]}'
        db.execute(sql)
        db.insert_dict([race], TBL_RACES)

        sql = f'delete from {TBL_EVENTS} where race_id = {row["race_id"]}'
        db.execute(sql)
        db.insert_dict(events, TBL_EVENTS)

def update_user_registrations(rsu, db, refresh = False, race_id = None):
    sql = f"""
            select distinct
                r.race_id,
                r.name race_name,
                e.event_id,
                e.name event_name
            from htc.races r
                join htc.events e on e.race_id = r.race_id                     
        """

    where_clause = " "
    if race_id is not None:
        where_clause = f""" 
            where r.race_id = {race_id}
        """  
    elif not refresh:
        where_clause = f"""   
                where e.registration_opens < now()
                    and coalesce(e.end_time, e.registration_closes) > now()                                         
            """
    sql += where_clause + " order by 2, 4"

    df = db.select_df(sql)
    if len(df.index)>0:
        for index, row in df.iterrows():
            print(f"Race: {row['race_name']} Event: {row['event_name']}")
            users, registrations = rsu.get_user_registrations(row['race_id'], row['event_id'])
            print(f"  Registrations: {len(registrations)}")

            if len(registrations) > 0:
                # user_ids = [int(i['user_id']) for i in users]
                # sql = f'delete from {TBL_USERS} where user_id in ({",".join(map(str, user_ids))})'
                # db.execute(sql)
                db.insert_dict(users, TBL_USERS)

                sql = f'delete from {TBL_REGISTRATIONS} where race_id = {row["race_id"]} and event_id = {row["event_id"]}'
                db.execute(sql)
                db.insert_dict(registrations, TBL_REGISTRATIONS)

def update_user_donations(rsu, db, refresh = False, race_id = None):
    sql = f"""
            select
                r.race_id,
                r.name race_name
            from htc.races r                   
        """

    if race_id is not None:
        sql += f""" 
            where r.race_id = {race_id}
        """  
    elif not refresh:
        sql = f"""   
                select distinct
                    r.race_id,
                    r.name race_name
                from htc.races r
                    join htc.events e on e.race_id = r.race_id 
                where e.registration_opens < now()
                    and coalesce(e.end_time, e.registration_closes) > now()                                          
            """

    df = db.select_df(sql)
    if len(df.index)>0:
        for index, row in df.iterrows():
            print(f"Race: {row['race_name']}")

            periods = rsu.get_donation_periods(row['race_id'])
            print(f"  Donation Periods: {len(periods)}")
            sql = f'delete from {TBL_DONATION_PERIODS} where race_id = {row["race_id"]}'
            db.execute(sql)
            db.insert_dict(periods, TBL_DONATION_PERIODS)

            sql = f'delete from {TBL_DONATIONS} where race_id = {row["race_id"]}'
            db.execute(sql)

            for period in periods:
                users, donations = rsu.get_donations(row['race_id'], period)
                print(f"  Donations: {len(donations)}")

                if len(donations) > 0:
                    db.insert_dict(users, TBL_USERS)
                    db.insert_dict(donations, TBL_DONATIONS)

def update_user_members(rsu, db, refresh = False):

    users, members = rsu.get_members()
    print(f"Members: {len(members)}")

    db.insert_dict(users, TBL_USERS)

    if refresh:
        sql = f'delete from {TBL_MEMBERS}'
        db.execute(sql)
    db.insert_dict(members, TBL_MEMBERS)

def update_results(rsu,db, refresh = False):
    
    sql = f"""
            select distinct
                r.race_id,
                r.name race_name,
                e.event_id,
                e.name event_name
            from htc.races r
                join htc.events e on e.race_id = r.race_id                   
        """        
    if not refresh:
        sql += """
          left join htc.results s on s.race_id = r.race_id and s.event_id = e.event_id
          where s.result_id is null
          """  

    df = db.select_df(sql)
    for index, row in df.iterrows():
        print(f"Race: {row['race_name']} Event: {row['event_name']}")
        results = rsu.get_results(row['race_id'], row['event_id'])
        print(f"  Results: {len(results)}")
        if len(results) > 0:
            # file_utils.write_json(f"data/results/results_{row['race_id']}_{row['event_id']}.json", results)
            db.insert_dict(results, TBL_RESULTS)


if __name__ == '__main__':
    main()
