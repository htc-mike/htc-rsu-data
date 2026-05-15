from rsu_api import RSU
import rsu_api_results
import datetime
import file_utils

class RSU_Data():

    def __init__(self, config_path: str = "client_config.json"):
        self.rsu = RSU(config_path=config_path)

    def get_race_events(self, race_id):
        results = self.rsu.race(race_id)

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

    def get_user_registrations(self, race_id, event_id, update = False):
        users = []
        registrations = []    

        obj = self.rsu.participants(race_id, event_id)
        if 'error' in obj:
            return users, registrations

        # file_utils.write_json(f"data/participants_{race_id}_{event_id}.json", obj)  
        participants = obj[0]['participants'] if 'participants' in obj[0] else []
        for participant in participants:
            user = {}
            user['user_id'] = participant['user']['user_id']
            user['first_name'] = participant['user']['first_name']
            user['middle_name'] = participant['user']['middle_name']
            user['last_name'] = participant['user']['last_name']
            user['email'] = participant['user']['email'] if 'email' in participant['user'] else None
            user['street'] = participant['user']['address']['street']
            user['city'] = participant['user']['address']['city']
            user['state'] = participant['user']['address']['state']
            user['zip_code'] = participant['user']['address']['zipcode']
            user['country_code'] = participant['user']['address']['country_code']
            user['dob'] = participant['user']['dob']
            user['gender'] = participant['user']['gender'] if 'gender' in participant['user'] else None
            user['phone'] = participant['user']['phone'] if 'phone' in participant['user'] else None
            users.append(user.copy())

            # print(participant)
            registration = {}
            registration['race_id'] = race_id
            registration['registration_id'] = participant['registration_id']
            registration['event_id'] = participant['event_id']
            registration['rsu_transaction_id'] = participant['rsu_transaction_id']
            registration['transaction_id'] = participant['transaction_id']
            registration['bib_num'] = participant['bib_num']
            registration['chip_num'] = participant['chip_num']
            registration['age'] = participant['age']
            registration['gender'] = participant['user']['gender'] if 'gender' in participant['user'] else None
            registration['registration_date'] = participant['registration_date']
            registration['team_id'] = participant['team_id']
            registration['team_name'] = participant['team_name']
            registration['team_type_id'] = participant['team_type_id']
            registration['team_type'] = participant['team_type']
            registration['team_gender'] = participant['team_gender']
            registration['team_bib_num'] = participant['team_bib_num']
            registration['last_modified'] = participant['last_modified']
            registration['imported'] = participant['imported']
            registration['usatf_discount_additional_field'] = participant['usatf_discount_additional_field']
            registration['giveaway'] = participant['giveaway']
            registration['giveaway_option_id'] = participant['giveaway_option_id']

            registration['user_id'] = participant['user']['user_id'] if participant['user']['user_id'] is not None else -1
            registration['race_fee'] = participant['race_fee'].replace('$','')
            registration['offline_payment_amount'] = participant['offline_payment_amount'].replace('$','')
            registration['processing_fee'] = participant['processing_fee'].replace('$','')
            registration['processing_fee_paid_by_user'] = participant['processing_fee_paid_by_user'].replace('$','')
            registration['processing_fee_paid_by_race'] = participant['processing_fee_paid_by_race'].replace('$','')
            registration['partner_fee'] = participant['partner_fee'].replace('$','')
            registration['affiliate_profit'] = participant['affiliate_profit'].replace('$','')
            registration['extra_fees'] = participant['extra_fees'].replace('$','')
            registration['amount_paid'] = participant['amount_paid'].replace('$','')
            registration['usatf_discount_amount_in_cents'] = participant['usatf_discount_amount_in_cents'].replace('$','')
            registrations.append(registration.copy())

        return users, registrations
    
    def get_donation_periods(self, race_id):
        periods = []
        result = self.rsu.donation_periods(race_id)
        for period in result['donation_periods']:
            period_obj = {}
            period_obj['race_id'] = race_id
            period_obj['donation_period_id'] = period['donation_period_id']
            period_obj['start_ts'] = period['start_ts']
            period_obj['end_ts'] = period['end_ts']
            period_obj['start_timestamp'] = datetime.datetime.fromtimestamp(period['start_ts']).strftime("%Y-%m-%d %H:%M:%S")
            period_obj['end_timestamp'] = datetime.datetime.fromtimestamp(period['end_ts']).strftime("%Y-%m-%d %H:%M:%S") if period['end_ts'] is not None else None
            periods.append(period_obj.copy())

        return periods

    def get_donations(self, race_id, period):
        users = []
        donation_list = []
        result = self.rsu.donations(race_id, start_time=period['start_ts'], end_time=period['end_ts'])
        # file_utils.write_json('data/donations.json', result)

        donations = result['donations']
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
            donation_obj = {}
            donation_obj['donation_id'] = donation['donation_id']
            donation_obj['on_behalf_of'] = donation['on_behalf_of']
            donation_obj['anonymous'] = donation['anonymous']
            donation_obj['donation_date_ts'] = donation['donation_date_ts']
            donation_obj['fundraiser_id'] = donation['fundraiser_id']
            donation_obj['fundraiser_name'] = donation['fundraiser_name']
            donation_obj['fundraiser_user_email'] = donation['fundraiser_user_email']
            donation_obj['team_fundraiser_id'] = donation['team_fundraiser_id']
            donation_obj['team_fundraiser_name'] = donation['team_fundraiser_name']
            donation_obj['rsu_transaction_id'] = donation['rsu_transaction_id']
            donation_obj['transaction_id'] = donation['transaction_id']
            donation_obj['associated_registration_id'] = donation['associated_registration_id']

            donation_obj['donation_period_id'] = period['donation_period_id']
            donation_obj['user_id'] = donation['user']['user_id']
            donation_obj['donation_amount'] = donation['donation_amount'].replace('$','')
            donation_obj['processing_fee'] = donation['processing_fee'].replace('$','')
            donation_obj['amount_paid'] = donation['amount_paid'].replace('$','')       
            donation_obj['donation_timestamp']= dt.strftime("%Y-%m-%d %H:%M:%S")
            donation_obj['charity_id'] = donation['charity_details'][0]['charity_id'] if len(donation['charity_details'])>0 else None
            donation_obj['charity_name'] = donation['charity_details'][0]['charity_name'] if len(donation['charity_details'])>0 else None
            donation_obj['charity_amount'] = donation['charity_details'][0]['donation_amount'].replace('$','') if len(donation['charity_details'])>0 else None
            donation_obj['race_id'] = race_id
            donation_list.append(donation_obj.copy())

        return users, donation_list

    def get_members(self):
        users = []
        members = []

        data = self.rsu.members()
        objects = data['club_members']
        # file_utils.write_json('data/members.json', data)

        for object in objects:
            user = {}
            user['user_id'] = object['user']['user_id']
            user['first_name'] = object['user']['first_name']
            user['middle_name'] = object['user']['middle_name']
            user['last_name'] = object['user']['last_name']
            user['email'] = object['user']['email'] if 'email' in object['user'] else ''
            user['street'] = object['user']['address']['street']
            user['city'] = object['user']['address']['city']
            user['state'] = object['user']['address']['state']
            user['zip_code'] = object['user']['address']['zipcode']
            user['country_code'] = object['user']['address']['country_code']
            user['dob'] = object['user']['dob']
            user['gender'] = object['user']['gender'] if 'gender' in object['user'] else ''
            user['phone'] = object['user']['phone'] if 'phone' in object['user'] else ''
            users.append(user.copy())

            member = {}
            member['user_id'] = object['user']['user_id']
            member['club_id'] = object['club_id'] 
            member['club_member_num'] = object['club_member_num'] if 'club_member_num' in object else None
            member['club_membership_level_id'] = object['club_membership_level_id'] if 'club_membership_level_id' in object else None
            member['club_membership_level_name'] = object['club_membership_level_name'] if 'club_membership_level_name' in object else None
            member['membership_id'] = object['membership_id'] if 'membership_id' in object else None
            member['membership_start'] = object['membership_start'] if 'membership_start' in object else None
            member['membership_end'] = object['membership_end'] if 'membership_end' in object else None
            member['member_since'] = object['member_since'] if 'member_since' in object else None
            member['primary_member'] = object['primary_member'] if 'primary_member' in object else None
            member['registration_date'] = object['registration_date'] if 'registration_date' in object else None
            member['last_modified'] = object['last_modified'] if 'last_modified' in object else None
            member['club_category_id'] = object['club_category_id'] if 'club_category_id' in object else None
            member['club_category_name'] = object['club_category_name'] if 'club_category_name' in object else None
            member['imported'] = object['imported'] if 'imported' in object else None
            member['membership_cost'] = object['membership_cost'].replace('$','') if 'membership_cost' in object else None
            member['amount_paid'] = object['amount_paid'].replace('$','') if 'amount_paid' in object else None
            members.append(member.copy())

        return users, members

    def get_results(self, race_id: int, event_id: int):
        results, results_header = rsu_api_results.get_results_all(race_id, event_id)

        runners = []
        for result in results:
            runner = {}
            runner['race_id'] = race_id
            runner['event_id'] = event_id
            runner['result_id'] = result['result_id']
            runner['place'] = result['place']
            runner['bib'] = result['bib']
            runner['first_name'] = result['first_name']
            runner['last_name'] = result['last_name']
            runner['gender'] = result['gender']
            runner['city'] = result['city']
            runner['state'] = result['state']
            runner['country_code'] = result['country_code']
            runner['clock_time'] = result['clock_time']
            runner['chip_time'] = result['chip_time']
            runner['pace'] = result['pace']
            runner['age'] = result['age']
            runner['age_percentage'] = result['age_percentage']
            runners.append(runner.copy())
        
        return runners
        
    def get_age(self, dob):
        from dateutil import relativedelta
        now = datetime.now()
        # dob = '1955-12-16'
        dob_date = datetime.strptime(dob, '%Y-%m-%d')
        delta = relativedelta.relativedelta(now, dob_date)
        return delta.years    