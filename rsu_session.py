# import os.path
from os import path, environ
import os
import requests
import json
import time
import urllib.parse
import webbrowser

class RSUSession:

    def __init__(self):
        self.cred_file = r'C:\projects\config\htc.members.config.json'
        self.load_credentials()

    def load_credentials(self):
        creds = {}
        if path.exists(self.cred_file):
            with open(self.cred_file, 'r', encoding='utf8') as f:
                try:
                    creds = json.load(f)
                except Exception:
                    print('Failed to parse credentials.json')
        # prefer values from file, otherwise from environment
        # support both old (client_key) and new (client_id) names
        self.api_key = creds.get('api_key') 
        self.api_secret = creds.get('api_secret') 
        self.client_id = creds.get('client_id') 
        self.client_secret = creds.get('client_secret') 
        self.call_back_url = creds.get('call_back_url') 

        # token fields (OAuth2)
        self.access_token = creds.get('access_token') 
        self.refresh_token = creds.get('refresh_token') 
        self.token_type = creds.get('token_type')
        self.expires_at = creds.get('expires_at')

    def save_credentials(self, creds):
        # merge into file (preserve unrelated fields)
        data = {}
        if path.exists(self.cred_file):
            try:
                with open(self.cred_file, 'r', encoding='utf8') as f:
                    data = json.load(f)
            except Exception:
                data = {}
        data.update(creds)
        try:
            with open(self.cred_file, 'w', encoding='utf8') as f:
                json.dump(creds, f, indent=4, sort_keys=False)
        except Exception as e:
            print(f'Failed to save credentials: {e}')

    def _post_token(self, url, data=None, auth=None, headers=None, timeout=15):
        try:
            resp = requests.post(url, data=data, auth=auth, headers=headers, timeout=timeout)
            # Try json, otherwise text
            try:
                return resp.status_code, resp.json()
            except Exception:
                return resp.status_code, resp.text
        except Exception as e:
            return None, str(e)

    def get_credentials(self):
        """
        Authorization Code flow using a local HTTP server to capture the redirect.
        If credentials.json contains a localhost redirect_uri already, use its port.
        Otherwise default to http://localhost:8080/callback and instruct user to register that redirect URI.
        """
        if not self.client_id or not self.client_secret:
            raise Exception('Missing client_id/client_secret. Add them to credentials.json or set RUNSIGNUP_CLIENT_ID and RUNSIGNUP_CLIENT_SECRET environment variables.')

        # If token exists and is fresh, return it
        if self.access_token and self.expires_at:
            try:
                if float(self.expires_at) > time.time() + 10:
                    return {'access_token': self.access_token, 'refresh_token': self.refresh_token, 'expires_at': self.expires_at}
            except Exception:
                pass
        elif self.access_token and not self.expires_at:
            return {'access_token': self.access_token}

        # Determine redirect URI to use for local server
        redirect_uri = self.call_back_url
        use_local_server = False
        try:
            parsed = urllib.parse.urlparse(redirect_uri)
            if parsed.hostname in (None, 'localhost', '127.0.0.1'):
                use_local_server = True
                port = parsed.port or 8080
                path_base = parsed.path or '/callback'
                # normalize path
                if not path_base.startswith('/'):
                    path_base = '/' + path_base
                redirect_uri = f'http://localhost:{port}{path_base}'
        except Exception:
            # fall back to localhost
            port = 8080
            redirect_uri = f'http://localhost:{port}/callback'
            use_local_server = True

        if use_local_server:
            # prepare local server to capture the code
            from http.server import BaseHTTPRequestHandler, HTTPServer
            import threading

            class _AuthHandler(BaseHTTPRequestHandler):
                def do_GET(self):
                    parsed = urllib.parse.urlparse(self.path)
                    qs = urllib.parse.parse_qs(parsed.query)
                    code = qs.get('code', [None])[0]
                    state = qs.get('state', [None])[0]
                    # store on server instance
                    self.server.auth_code = code
                    # respond with simple page
                    self.send_response(200)
                    self.send_header('Content-Type', 'text/html')
                    self.end_headers()
                    self.wfile.write(b"<html><body><h2>Authorization received. You can close this window.</h2></body></html>")

                def log_message(self, format, *args):
                    # suppress default logging
                    return

            server = HTTPServer(('localhost', port), _AuthHandler)
            server.auth_code = None

            def _run_server():
                try:
                    server.handle_request()  # handle a single request then exit
                except Exception:
                    pass

            thread = threading.Thread(target=_run_server, daemon=True)
            thread.start()

        # Build authorization URL using RunSignUp OpenAPI spec endpoint
        auth_base = 'https://runsignup.com/Profile/OAuth2/RequestGrant'
        # Use read-only scope by default per OpenAPI spec
        scope = getattr(self, 'scope', None) or 'rsu_api_read'
        state = 'rsu_state'
        params = {
            'response_type': 'code',
            'client_id': self.client_id,
            'redirect_uri': redirect_uri,
            'scope': scope,
            'state': state
        }
        authorization_url = auth_base + '?' + urllib.parse.urlencode(params)

        # persist the URL to a file for manual opening if automatic open fails
        try:
            with open('auth_url.txt', 'w', encoding='utf8') as f:
                f.write(authorization_url + '\n')
        except Exception:
            pass

        print('Opening browser for authorization...')
        opened = False
        try:
            import webbrowser, os, subprocess, sys
            try:
                opened = webbrowser.open_new_tab(authorization_url)
            except Exception:
                try:
                    opened = webbrowser.open(authorization_url)
                except Exception:
                    opened = False

            if not opened:
                # Windows specific attempts
                if sys.platform.startswith('win'):
                    try:
                        os.startfile(authorization_url)
                        opened = True
                    except Exception:
                        try:
                            subprocess.run(['powershell', '-NoProfile', '-Command', f'Start-Process "{authorization_url}"'], check=False)
                            opened = True
                        except Exception:
                            opened = False
                else:
                    # Linux / macOS
                    try:
                        subprocess.run(['xdg-open', authorization_url], check=False)
                        opened = True
                    except Exception:
                        try:
                            subprocess.run(['open', authorization_url], check=False)
                            opened = True
                        except Exception:
                            opened = False
        except Exception:
            opened = False

        if not opened:
            print('Unable to open browser automatically. Authorization URL written to auth_url.txt. Please open it manually:')
        else:
            print('Browser opened. If it did not, open this URL:')
        print(authorization_url)

        # Try helper sources for redirect response: clipboard, env var, auth_response.txt
        code = None
        # 1) try clipboard via tkinter
        try:
            import tkinter as _tk
            _root = _tk.Tk()
            _root.withdraw()
            clip = _root.clipboard_get()
            if 'code=' in clip:
                # treat entire clipboard as redirect URL
                try:
                    parts = urllib.parse.urlparse(clip)
                    qs = urllib.parse.parse_qs(parts.query)
                    code = qs.get('code', [None])[0]
                except Exception:
                    # maybe clipboard contains just the code
                    if ' ' not in clip and len(clip) > 20:
                        code = clip.strip()
            _root.destroy()
        except Exception:
            pass

        # 2) environment variable
        if not code:
            env_resp = environ.get('RUNSIGNUP_AUTH_RESPONSE')
            if env_resp:
                try:
                    parts = urllib.parse.urlparse(env_resp)
                    qs = urllib.parse.parse_qs(parts.query)
                    code = qs.get('code', [None])[0]
                    if not code and ' ' not in env_resp and len(env_resp) > 20:
                        code = env_resp.strip()
                except Exception:
                    code = env_resp.strip()

        # 3) auth_response.txt file
        if not code:
            try:
                if path.exists('auth_response.txt'):
                    with open('auth_response.txt', 'r', encoding='utf8') as f:
                        ar = f.read().strip()
                        if 'code=' in ar:
                            parts = urllib.parse.urlparse(ar)
                            qs = urllib.parse.parse_qs(parts.query)
                            code = qs.get('code', [None])[0]
                        elif ' ' not in ar and len(ar) > 20:
                            code = ar
            except Exception:
                pass

        # 4) if using local server, wait for it to capture the code
        if not code and use_local_server:
            timeout = 180
            start = time.time()
            while time.time() - start < timeout and server.auth_code is None:
                time.sleep(0.5)
            code = server.auth_code
            if not code:
                print('Local server did not receive authorization code within timeout.')

        # 5) fallback to prompting the user
        if not code:
            redirect_response = input('After authorizing, paste the full redirect URL or the code here: ')
            try:
                if 'code=' in redirect_response:
                    parts = urllib.parse.urlparse(redirect_response)
                    qs = urllib.parse.parse_qs(parts.query)
                    code = qs.get('code', [None])[0]
                else:
                    # user pasted just the code
                    code = redirect_response.strip()
                if not code:
                    raise Exception('No code found in redirect input')
            except Exception as e:
                raise Exception(f'Failed to obtain authorization code: {e}')

        # Exchange code for token using RunSignUp token endpoint from OpenAPI spec
        token_url = 'https://api.runsignup.com/rest/v2/auth/auth-code-redemption.json'
        headers = {'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded'}
        data = {
            'grant_type': 'authorization_code',
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'code': code,
            'redirect_uri': redirect_uri
        }
        try:
            resp = requests.post(token_url, data=data, headers=headers, timeout=15)
        except Exception as e:
            raise Exception(f'Failed to call token endpoint: {e}')

        try:
            body = resp.json()
        except Exception:
            raise Exception(f'Unexpected token response: {resp.status_code} {resp.text}')

        if resp.status_code < 200 or resp.status_code >= 300:
            raise Exception(f'Token endpoint error: {resp.status_code} {body}')

        # Persist token info
        self.access_token = body.get('access_token')
        self.refresh_token = body.get('refresh_token')
        self.token_type = body.get('token_type')
        expires_in = body.get('expires_in')
        if expires_in:
            self.expires_at = time.time() + int(expires_in)
        self.save_credentials({'access_token': self.access_token, 'refresh_token': self.refresh_token, 'token_type': self.token_type, 'expires_at': self.expires_at})
        return body

    def refresh_access_token(self):
        """Use refresh_token grant to obtain a new access token."""
        if not self.refresh_token:
            raise Exception('No refresh_token available')
        token_url = 'https://api.runsignup.com/rest/v2/auth/refresh-token.json'
        data = {
            'grant_type': 'refresh_token',
            'refresh_token': self.refresh_token,
            'client_id': self.client_id,
            'client_secret': self.client_secret
        }
        headers = {'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded'}
        try:
            resp = requests.post(token_url, data=data, headers=headers, timeout=15)
        except Exception as e:
            raise Exception(f'Failed to call token endpoint for refresh: {e}')

        try:
            body = resp.json()
        except Exception:
            raise Exception(f'Unexpected token response during refresh: {resp.status_code} {resp.text}')

        if resp.status_code < 200 or resp.status_code >= 300:
            raise Exception(f'Refresh token endpoint error: {resp.status_code} {body}')

        self.access_token = body.get('access_token')
        self.refresh_token = body.get('refresh_token') or self.refresh_token
        self.token_type = body.get('token_type')
        expires_in = body.get('expires_in')
        if expires_in:
            self.expires_at = time.time() + int(expires_in)
        self.save_credentials({'access_token': self.access_token, 'refresh_token': self.refresh_token, 'token_type': self.token_type, 'expires_at': self.expires_at})
        return body

    def request(self, url, params={"format": "json"}):
        # Ensure we have a valid access token; refresh if expired
        params = {} if params is None else dict(params)
        params.setdefault('format', 'json')
        # Include api_key per DeveloperGuide
        if getattr(self, 'api_key', None):
            params.setdefault('rsu_api_key', self.api_key)
        # if getattr(self, 'api_secret', None):
        #     params.setdefault('api_secret', self.api_secret)

        # if not (self.access_token and (not self.expires_at or float(self.expires_at) > time.time() + 5)):
        #     # try refresh if possible
        #     if getattr(self, 'refresh_token', None):
        #         try:
        #             self.refresh_access_token()
        #         except Exception:
        #             # fallback to full auth flow
        #             self.get_credentials()
        #     else:
        #         self.get_credentials()

        headers = {}
        # if self.access_token:
        #     headers['Authorization'] = f'Bearer {self.access_token}'
        # headers['x-rsu-api-secret'] = f'{self.api_secret}'
        headers['X-RSU-API-SECRET'] = f'{self.api_secret}'

        r = requests.get(url, headers=headers, params=params)
        # print(r.headers)
        # print('---')
        # print(r.url)

        # If RunSignUp still returns Key auth failures, caller can inspect response
        return r

    def debug_auth_endpoints(self):
        """Probe known authorization endpoints and print status and small body for debugging."""
        endpoints = [
            'https://api.runsignup.com/Profile/OAuth2/RequestGrant',
            'https://api.runsignup.com/Profile/OAuth2/RequestGrant/',
            'https://www.runsignup.com/Profile/OAuth2/RequestGrant',
            'https://runsignup.com/Profile/OAuth2/RequestGrant',
        ]
        params = {
            'response_type': 'code',
            'client_id': self.client_id or '',
            'redirect_uri': self.call_back_url or '',
            'scope': getattr(self, 'scope', None) or 'rsu_api_read',
            'state': 'rsu_debug'
        }
        results = []
        for ep in endpoints:
            try:
                r = requests.get(ep, params=params, timeout=10, allow_redirects=False)
                body = r.text[:800]
                headers = dict(r.headers)
                results.append({'url': r.url, 'status': r.status_code, 'headers': headers, 'body': body})
            except Exception as e:
                results.append({'url': ep, 'status': None, 'error': str(e)})
        # print concise report
        print('\nOAuth endpoint probe results:')
        for res in results:
            if 'error' in res:
                print(f"- {res['url']} -> ERROR: {res['error']}")
            else:
                print(f"- {res['url']} -> {res['status']}")
                hs = res.get('headers', {})
                if 'Location' in hs:
                    print(f"  Location: {hs['Location']}")
                b = res.get('body', '')
                if b:
                    # print first line or html title if present
                    first_line = b.splitlines()[0] if b else ''
                    print(f"  Body (start): {first_line!r}")
        return results
