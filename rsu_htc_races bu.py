# from rsu_session import RSUSession
import json
import file_utils
# import requests
from postgres_db import PostgresDB
import datetime
from rsu_api import RSU
from rsu_data import RSU_Data

RSU_CONFIG = r'C:\projects\config\rsu_client_config.json'
DB_CONFIG = r'C:\projects\config\db_config.json'

TBL_RACES = 'htc.races'
TBL_EVENTS = 'htc.events'
TBL_DONATIONS = 'htc.donations'
TBL_USERS = 'htc.users'
TBL_REGISTRATIONS = 'htc.registrations'
TBL_MEMBERS = 'htc.memberships'

def main():
    race_id = 29765  #Solstice

    race_id = 117812 #Hogsback
    event_id = 995207
    event_id = 995208

    with open(DB_CONFIG, "r", encoding="utf-8") as fh:
        cred: dict = json.load(fh)
    db = PostgresDB(**cred)

    rsu = RSU(config_path=RSU_CONFIG)

    update_races(rsu, db)

    # write_race(rsu, db, race_id)
    # write_registrations(rsu, db, race_id, event_id)
    # write_donations(rsu, db, race_id)
    # check_updates(rsu, db)
    # write_members(rsu_data, db)

def update_races(rsu, db):
    sql = f"""
            select race_id, name from htc.races
        """
    df = db.select_df(sql)
    for index, row in df.iterrows():
        print(f"Race: {row['name']}")
        race, events = get_race_events(rsu, row['race_id'])
        print(f"  Events: {len(events)}")

        sql = f'delete from {TBL_RACES} where race_id = {row['race_id']}'
        db.execute(sql)
        db.insert_dict([race], TBL_RACES)

        sql = f'delete from {TBL_EVENTS} where race_id = {row['race_id']}'
        db.execute(sql)
        db.insert_dict(events, TBL_EVENTS)
       
def check_updates(rsu, db):
    sql = f"""
            select distinct
                race_id,
                event_id,
                name
            from htc.events   
            where registration_opens < now()
                and end_time > now()                     
        """
    df = db.select_df(sql)
    if len(df.index)>0:
        for index, row in df.iterrows():
            print(f"Event: {row['name']}")
            write_registrations(rsu, db, row['race_id'], row['event_id'], True)
            write_donations(rsu, db, row['race_id'])

def get_race_events(rsu, race_id):
    results = rsu.race(race_id)

    race = results['race'].copy()
    race_obj = {}

    race_obj['race_id']=race['race_id']
    race_obj['name']=race['name']
    race_obj['last_date']=race['last_date']
    race_obj['last_end_date']=race['last_end_date']
    race_obj['next_date']=race['next_date']
    race_obj['next_end_date']=race['next_end_date']
    race_obj['is_draft_race']=race['is_draft_race']
    race_obj['is_private_race']=race['is_private_race']
    race_obj['is_registration_open']=race['is_registration_open']
    race_obj['created']=race['created']
    race_obj['last_modified']=race['last_modified']
    race_obj['description']=race['description']
    race_obj['url']=race['url']
    race_obj['external_race_url']=race['external_race_url']
    race_obj['external_results_url']=race['external_results_url']
    race_obj['fb_page_id']=race['fb_page_id']
    race_obj['fb_event_id']=race['fb_event_id']
    race_obj['timezone']=race['timezone']
    race_obj['logo_url']=race['logo_url'] if 'logo_url' in race else None
    race_obj['can_use_registration_api']=race['can_use_registration_api']
    race_obj['real_time_notifications_enabled']=race['real_time_notifications_enabled']
    race_obj['address_street'] = race['address']['street']
    race_obj['address_street2'] = race['address']['street2']
    race_obj['address_city'] = race['address']['city']
    race_obj['address_state'] = race['address']['state']
    race_obj['address_zipcode'] = race['address']['zipcode']
    race_obj['address_country_code'] = race['address']['country_code']


    events = results['race']['events'].copy()
    event_objs = []
    for event in events:
        event_obj = {}
        event_obj['event_id'] = event['event_id'] if 'event_id' in event else None
        event_obj['race_event_days_id'] = event['race_event_days_id'] if 'race_event_days_id' in event else None
        event_obj['name'] = event['name'] if 'name' in event else None
        event_obj['details'] = event['details'] if 'details' in event else None
        event_obj['start_time'] = event['start_time'] if 'start_time' in event else None
        event_obj['end_time'] = event['end_time'] if 'end_time' in event else None
        event_obj['age_calc_base_date'] = event['age_calc_base_date'] if 'age_calc_base_date' in event else None
        event_obj['registration_opens'] = event['registration_opens'] if 'registration_opens' in event else None
        event_obj['registration_closes'] = event['registration_closes'] if 'registration_closes' in event else None
        event_obj['event_type'] = event['event_type'] if 'event_type' in event else None
        event_obj['distance'] = event['distance'] if 'distance' in event else None
        event_obj['volunteer'] = event['volunteer'] if 'volunteer' in event else None
        event_obj['require_dob'] = event['require_dob'] if 'require_dob' in event else None
        event_obj['require_phone'] = event['require_phone'] if 'require_phone' in event else None
        event_obj['previous_year_event_id'] = event['previous_year_event_id'] if 'previous_year_event_id' in event else None

        registration_periods = len(event['registration_periods'])
        registration_closes = event['registration_periods'][registration_periods-1]['registration_closes'] if registration_periods>0 else None
        event_obj['participant_cap'] = event['participant_cap'] if 'participant_cap' in event else None
        event_obj['giveaway'] = event['giveaway'] if 'giveaway' in event else None
        event_obj['race_fee'] = event['registration_periods'][0]['race_fee'].replace('$','') if registration_periods>0 else None
        event_obj['processing_fee'] = event['registration_periods'][0]['processing_fee'].replace('$','') if registration_periods>0 else None
        event_obj['registration_periods'] = registration_periods
        event_obj['registration_closes'] = registration_closes
        event_obj['race_id'] = race_id
        event_objs.append(event_obj.copy()) 

    return race_obj, event_objs

def write_race(rsu, db, race_id):
    results = rsu.race(race_id)
    # file_utils.write_json(f'data\\races\\hogsback.2025.race.json', results)
    race = results['race'].copy()
    print(f"Race: {race['name']}")

    race['address_street'] = race['address']['street']
    race['address_street2'] = race['address']['street2']
    race['address_city'] = race['address']['city']
    race['address_state'] = race['address']['state']
    race['address_zipcode'] = race['address']['zipcode']
    race['address_country_code'] = race['address']['country_code']
    race.pop('address')
    race.pop('events')
    db.insert_dict([race], TBL_RACES)

    write_events(db, results)

def write_members(rsu, db):
    df = rsu.members()
    # df.to_csv('data/members.csv', index=False)

    print(f"Members: {str(len(df.index))}")
    print(df.columns.str.replace("[@. -]","_", regex=True))
    df_users = df[[
        'user_id', 
        'first_name',
        'middle_name', 
        'last_name', 
        'email', 
        'street', 
        'city', 
        'state',
        'zip_code', 
        'country_code', 
        'dob', 
        'gender', 
        'phone'
    ]]
    db.insert_df(df_users, TBL_USERS)

    df_members = df[[
        'club_id', 
        'club_membership_level_id', 
        'club_membership_level_name',
        'membership_id', 
        'club_member_num', 
        'membership_start',
        'membership_end', 
        'member_since', 
        'primary_member', 
        'registration_date',
        'last_modified', 
        'club_category_id', 
        'club_category_name', 
        'imported',
        'membership_cost', 
        'amount_paid', 
        'user_id'
    ]]    
    db.insert_df(df_members, TBL_MEMBERS)

def write_events(db, obj):
    race_id = obj['race']['race_id']
    events = obj['race']['events'].copy()
    for event in events:
        registration_periods = len(event['registration_periods'])
        registration_closes = event['registration_periods'][registration_periods-1]['registration_closes']
        event['participant_cap'] = event['participant_cap'] if 'participant_cap' in event else None
        event['giveaway'] = event['giveaway'] if 'giveaway' in event else None
        event['race_fee'] = event['registration_periods'][0]['race_fee'].replace('$','')
        event['processing_fee'] = event['registration_periods'][0]['processing_fee'].replace('$','')
        event.pop('registration_periods')
        event.pop('sub_event_ids')
        event['registration_periods'] = registration_periods
        event['registration_closes'] = registration_closes
        event['race_id'] = race_id
    
    # file_utils.write_json(f'data\\hogsback.events.json', events)
    # events = file_utils.read_json(f'data\\hogsback.events.01.json')

    db.insert_dict(events, TBL_EVENTS)
    
def write_donations(rsu, db, race_id):
    obj = rsu.donations(race_id)
    print(f"Donations: {str(len(obj['donations']))}")

    users = []
    donations = obj['donations']
    for donation in donations:
        user = {}
        user['user_id'] = donation['user']['user_id']
        user['first_name'] = donation['user']['first_name']
        user['middle_name'] = donation['user']['middle_name']
        user['last_name'] = donation['user']['last_name']
        user['email'] = donation['user']['email'] if 'email' in donation['user'] else ''
        user['street'] = donation['user']['address']['street']
        user['city'] = donation['user']['address']['city']
        user['state'] = donation['user']['address']['state']
        user['zip_code'] = donation['user']['address']['zipcode']
        user['country_code'] = donation['user']['address']['country_code']
        user['dob'] = donation['user']['dob'] if 'dob' in donation['user'] else ''
        user['gender'] = donation['user']['gender'] if 'gender' in donation['user'] else ''
        user['phone'] = donation['user']['phone'] if 'phone' in donation['user'] else ''
        users.append(user.copy())


        dt = datetime.datetime.fromtimestamp(donation['donation_date_ts'])
        donation['user_id'] = donation['user']['user_id']
        donation['donation_amount'] = donation['donation_amount'].replace('$','')
        donation['processing_fee'] = donation['processing_fee'].replace('$','')
        donation['amount_paid'] = donation['amount_paid'].replace('$','')       
        donation['donation_timestamp']= dt.strftime("%Y-%m-%d %H:%M:%S")
        donation['race_id'] = race_id
        
        donation.pop('user')
        donation.pop('charity_details')

    db.insert_dict(donations, TBL_DONATIONS)
    db.insert_dict(users, TBL_USERS)

def write_registrations(rsu, db, race_id, event_id, update = False):
    obj = rsu.participants(race_id, event_id)
    # file_utils.write_json(f'data\\races\\solstice.2025.participants_raw.json', obj)
    print(f"Participants: {str(len(obj[0]['participants']))}")

    members = obj[0]['participants']
    users = []
    for member in members:
        user = {}
        user['user_id'] = member['user']['user_id']
        user['first_name'] = member['user']['first_name']
        user['middle_name'] = member['user']['middle_name']
        user['last_name'] = member['user']['last_name']
        user['email'] = member['user']['email'] if 'email' in member['user'] else ''
        user['street'] = member['user']['address']['street']
        user['city'] = member['user']['address']['city']
        user['state'] = member['user']['address']['state']
        user['zip_code'] = member['user']['address']['zipcode']
        user['country_code'] = member['user']['address']['country_code']
        user['dob'] = member['user']['dob']
        user['gender'] = member['user']['gender'] if 'gender' in member['user'] else ''
        user['phone'] = member['user']['phone'] if 'phone' in member['user'] else ''
        users.append(user.copy())

        # print(member)
        member['user_id'] = member['user']['user_id']
        member['race_fee'] = member['race_fee'].replace('$','')
        member['offline_payment_amount'] = member['offline_payment_amount'].replace('$','')
        member['processing_fee'] = member['processing_fee'].replace('$','')
        member['processing_fee_paid_by_user'] = member['processing_fee_paid_by_user'].replace('$','')
        member['processing_fee_paid_by_race'] = member['processing_fee_paid_by_race'].replace('$','')
        member['partner_fee'] = member['partner_fee'].replace('$','')
        member['affiliate_profit'] = member['affiliate_profit'].replace('$','')
        member['extra_fees'] = member['extra_fees'].replace('$','')
        member['amount_paid'] = member['amount_paid'].replace('$','')
        member['usatf_discount_amount_in_cents'] = member['usatf_discount_amount_in_cents'].replace('$','')
        
        member.pop('user')

    if update:
        sql = f'delete from {TBL_REGISTRATIONS} where event_id = {event_id}'
        db.execute(sql)

    db.insert_dict(members, TBL_REGISTRATIONS)
    db.insert_dict(users, TBL_USERS)

def read_json(file_name):
    with open(file_name, 'r') as f: 
        data = json.load(f)    
    return data

def write_json(file_name, data):
    with open(file_name, 'w', encoding="utf8") as f: 
        json.dump(data,f,indent=4,sort_keys=False)  

if __name__ == '__main__':
    main()