import requests
from rsu_oauth2 import RunSignUpOAuth2

class RSU():

    def __init__(self, oauth: RunSignUpOAuth2 = None, config_path: str = "client_config.json", db=None):
        """
        Args:
            oauth:       A RunSignUpOAuth2 instance. When omitted one is created
                         automatically from *config_path*.
            config_path: Path to client_config.json (used only when *oauth* is None).
            db:          PostgresDB instance for database-based config storage.
        """
        self.oauth = oauth or RunSignUpOAuth2(config_path=config_path, db=db)
        self.base_url = "https://runsignup.com"
    

    def race(self, race_id):
        endpoint = f"/rest/race/{race_id}"
        return self.get(endpoint)

    def participants(self, race_id, event_id):
        endpoint = f"/rest/race/{race_id}/participants?event_id={event_id}"
        params = {
                'include_registration_addons' :'T'
                }
        return self.get(endpoint, params)

    def volunteers(self, race_id):
        endpoint = f"/rest/v2/volunteers/get-race-volunteers.json?race_id={race_id}"
        params = {
                'results_per_page' : '300',
                'race_id': race_id
                }
        return self.get(endpoint, params)

    def donations(self, race_id, start_time=None, end_time=None):
        endpoint = f"/rest/race/{race_id}/donations/list"
        params = {}
        if start_time:
            params['since_ts'] = start_time #str(int(start_time.timestamp()))
        if end_time:
            params['until_ts'] = end_time #str(int(end_time.timestamp()))
        return self.get(endpoint, params)

    def donation_periods(self, race_id):
        endpoint = f"/rest/v2/race-donations/get-donation-periods.json"
        params = {
                'race_id' : f'{race_id}'
                }
        return self.get(endpoint, params)

    def members(self, club_id = 742):
        endpoint = f'/rest/club/{club_id}/members'
        params = {
                # 'registered_after_timestamp':,
                # 'registered_before_timestamp':,
                # 'supports_nb': 'F',
                'current_members_only' : 'F',
                'include_questions' : 'F'
        
                }       
        return self.get(endpoint, params)


    def get(self, endpoint, params=None):
        params = {} if params is None else params
        params['format'] = 'json'
        params['results_per_page'] = '1000'

        r = requests.get(
            self.base_url + endpoint,
            params=params,
            headers=self.oauth.get_auth_headers(),
        )
        if r.ok:
            return r.json()
        else:
            raise Exception(r.text)
