"""
RunSignUp OAuth2 Authentication Handler

Implements the OAuth2 Authorization Code flow for the RunSignUp API.
Reference: https://runsignup.com/Profile/OAuth2/DeveloperGuide
"""

import base64
import hashlib
import json
import secrets
import time
import urllib.error
import urllib.parse
import urllib.request
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Dict, Optional, Tuple


class OAuth2Error(Exception):
    """Raised when the OAuth2 server returns an error response."""

    def __init__(self, error: str, description: str = "", hint: str = ""):
        self.error = error
        self.description = description
        self.hint = hint
        message = f"OAuth2 Error [{error}]"
        if description:
            message += f": {description}"
        if hint:
            message += f" (hint: {hint})"
        super().__init__(message)


class RunSignUpOAuth2:
    """
    Handles OAuth2 authentication for the RunSignUp API.

    Supports the full Authorization Code flow including:
      - PKCE (Proof Key for Code Exchange) for enhanced security
      - Automatic local callback server to capture the authorization code
      - Token exchange (authorization code -> access + refresh tokens)
      - Token refresh using a stored refresh token
      - Auto-refresh of expired access tokens

    Configuration is read from and written back to a JSON file
    (default: client_config.json).

    Token lifetimes (per RunSignUp documentation):
      - Access token:  1 month  (2,592,000 seconds)
      - Refresh token: 20 years
      - Auth code:     5 minutes (exchange immediately)
    """

    # Production endpoints (no api. subdomain)
    _DEFAULT_AUTH_URL = "https://runsignup.com/Profile/OAuth2/RequestGrant"
    _DEFAULT_TOKEN_URL = "https://runsignup.com/rest/v2/auth/auth-code-redemption.json"
    _DEFAULT_REFRESH_URL = "https://runsignup.com/rest/v2/auth/refresh-token.json"

    # Test/sandbox endpoints (no api. subdomain)
    _TEST_AUTH_URL = "https://test.runsignup.com/Profile/OAuth2/RequestGrant"
    _TEST_TOKEN_URL = "https://test.runsignup.com/rest/v2/auth/auth-code-redemption.json"
    _TEST_REFRESH_URL = "https://test.runsignup.com/rest/v2/auth/refresh-token.json"

    def __init__(self, config_path: str = "client_config.json", db=None):
        """
        Initialize the OAuth2 handler, loading configuration from *config_path* or database.

        Args:
            config_path: Path to the JSON config file that contains client
                         credentials and (optionally) stored tokens. Ignored if db is provided.
            db: PostgresDB instance. If provided, config is loaded from htc.config table.
        """
        self.config_path = config_path
        self.db = db
        self._pkce_verifier: Optional[str] = None
        self._load_config()

    # ------------------------------------------------------------------
    # Configuration management
    # ------------------------------------------------------------------

    def _load_config(self) -> None:
        """Load settings and any previously stored tokens from the config file or database."""
        if self.db:
            # Load from database
            config = {}
            sql = "SELECT key, value FROM htc.config WHERE system = 'rsu'"
            rows, columns = self.db.select(sql)
            for row in rows:
                config[row[0]] = row[1]
            
            # Convert string values back to appropriate types
            if 'use_pkce' in config:
                config['use_pkce'] = config['use_pkce'].lower() in ('true', '1', 'yes')
            if 'use_test_env' in config:
                config['use_test_env'] = config['use_test_env'].lower() in ('true', '1', 'yes')
            if 'token_expires_at' in config:
                config['token_expires_at'] = float(config['token_expires_at'])
        else:
            # Load from file
            with open(self.config_path, "r", encoding="utf-8") as fh:
                config: dict = json.load(fh)

        self.client_id: str = config["client_id"]
        self.client_secret: str = config["client_secret"]
        self.redirect_uri: str = config.get("redirect_uri", "http://localhost:8080/callback")
        self.scope: str = config.get("scope", "rsu_api_read")
        self.use_pkce: bool = config.get("use_pkce", False)

        # When use_test_env is true the sandbox URLs are used as defaults,
        # but explicit url overrides in the config always take precedence.
        use_test = config.get("use_test_env", False)
        default_auth = self._TEST_AUTH_URL if use_test else self._DEFAULT_AUTH_URL
        default_token = self._TEST_TOKEN_URL if use_test else self._DEFAULT_TOKEN_URL
        default_refresh = self._TEST_REFRESH_URL if use_test else self._DEFAULT_REFRESH_URL

        self.authorization_url: str = config.get("authorization_url", default_auth)
        self.token_url: str = config.get("token_url", default_token)
        self.refresh_url: str = config.get("refresh_url", default_refresh)

        self.access_token: str = config.get("access_token", "")
        self.refresh_token: str = config.get("refresh_token", "")
        self.token_type: str = config.get("token_type", "Bearer")
        self.token_expires_at: float = float(config.get("token_expires_at", 0))

    def _save_config(self) -> None:
        """Persist the current token state back to the config file or database."""
        if self.db:
            # Save to database
            sql = f"""
                UPDATE htc.config 
                SET value = '{self.access_token}' 
                WHERE system = 'rsu' AND key = 'access_token'
            """
            self.db.execute(sql)
            
            sql = f"""
                UPDATE htc.config 
                SET value = '{self.refresh_token}' 
                WHERE system = 'rsu' AND key = 'refresh_token'
            """
            self.db.execute(sql)
            
            sql = f"""
                UPDATE htc.config 
                SET value = '{self.token_type}' 
                WHERE system = 'rsu' AND key = 'token_type'
            """
            self.db.execute(sql)
            
            sql = f"""
                UPDATE htc.config 
                SET value = '{self.token_expires_at}' 
                WHERE system = 'rsu' AND key = 'token_expires_at'
            """
            self.db.execute(sql)
        else:
            # Save to file
            with open(self.config_path, "r", encoding="utf-8") as fh:
                config: dict = json.load(fh)

            config["access_token"] = self.access_token
            config["refresh_token"] = self.refresh_token
            config["token_type"] = self.token_type
            config["token_expires_at"] = self.token_expires_at

            with open(self.config_path, "w", encoding="utf-8") as fh:
                json.dump(config, fh, indent=4)

    # ------------------------------------------------------------------
    # PKCE helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _generate_pkce_pair() -> Tuple[str, str]:
        """
        Generate a PKCE code verifier and its S256 challenge.

        Returns:
            (code_verifier, code_challenge) both as URL-safe base64 strings.
        """
        verifier_bytes = secrets.token_bytes(32)
        verifier = base64.urlsafe_b64encode(verifier_bytes).rstrip(b"=").decode()
        challenge = (
            base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest())
            .rstrip(b"=")
            .decode()
        )
        return verifier, challenge

    # ------------------------------------------------------------------
    # Authorization URL construction
    # ------------------------------------------------------------------

    def build_authorization_url(self, state: Optional[str] = None) -> str:
        """
        Build the URL that users must visit to authorize the application.

        If *use_pkce* is enabled a new PKCE pair is generated and the
        code verifier is stored internally for use in the subsequent
        token exchange.

        Args:
            state: Optional CSRF-protection string. A random value is
                   recommended; one is generated automatically when omitted.

        Returns:
            Full authorization URL as a string.
        """
        if state is None:
            state = secrets.token_urlsafe(16)

        params: Dict[str, str] = {
            "response_type": "code",
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "scope": self.scope,
            "state": state,
        }

        if self.use_pkce:
            verifier, challenge = self._generate_pkce_pair()
            self._pkce_verifier = verifier
            params["code_challenge"] = challenge
            params["code_challenge_method"] = "S256"

        return f"{self.authorization_url}?{urllib.parse.urlencode(params)}"

    # ------------------------------------------------------------------
    # Token exchange
    # ------------------------------------------------------------------

    def exchange_code_for_tokens(self, code: str) -> dict:
        """
        Exchange an authorization code for an access token and refresh token.

        This is Step 5 of the OAuth2 Authorization Code flow. The code
        must be exchanged within 5 minutes of receipt.

        Args:
            code: The authorization code returned in the callback redirect.

        Returns:
            The full JSON token response as a dict.

        Raises:
            OAuth2Error: If the server returns an OAuth2 error response.
        """
        data: Dict[str, str] = {
            "grant_type": "authorization_code",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": code,
            "redirect_uri": self.redirect_uri,
        }

        if self.use_pkce and self._pkce_verifier:
            data["code_verifier"] = self._pkce_verifier
            self._pkce_verifier = None

        return self._post_token_request(self.token_url, data)

    def refresh_access_token(self) -> dict:
        """
        Obtain a new access token using the stored refresh token.

        Refresh tokens issued by RunSignUp have a 20-year lifetime and
        survive access token expiry.

        Returns:
            The full JSON token response as a dict.

        Raises:
            ValueError:   If no refresh token is stored.
            OAuth2Error:  If the server returns an OAuth2 error response.
        """
        if not self.refresh_token:
            raise ValueError(
                "No refresh token is stored. Complete the initial authorization "
                "flow first by calling run_initial_auth_flow()."
            )

        data: Dict[str, str] = {
            "grant_type": "refresh_token",
            "refresh_token": self.refresh_token,
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "scope": self.scope,
        }

        return self._post_token_request(self.refresh_url, data)

    def _post_token_request(self, url: str, data: Dict[str, str]) -> dict:
        """
        POST form-encoded *data* to *url* and store the resulting tokens.

        Args:
            url:  Token endpoint URL.
            data: Form fields to send.

        Returns:
            Parsed JSON response dict.

        Raises:
            OAuth2Error: On an OAuth2 error response from the server.
        """
        encoded = urllib.parse.urlencode(data).encode("utf-8")
        request = urllib.request.Request(
            url,
            data=encoded,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            method="POST",
        )

        try:
            with urllib.request.urlopen(request) as response:
                response_data: dict = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8")
            prefix = f"HTTP {exc.code} from {url}"
            try:
                err = json.loads(body)
                raise OAuth2Error(
                    err.get("error", f"http_{exc.code}"),
                    f"{prefix} — {err.get('error_description', body)}",
                    err.get("hint", ""),
                ) from exc
            except (json.JSONDecodeError, KeyError):
                raise OAuth2Error(f"http_{exc.code}", f"{prefix} — {body[:300]}") from exc
        except urllib.error.URLError as exc:
            raise OAuth2Error("connection_error", f"Could not reach {url}: {exc.reason}") from exc

        if "error" in response_data:
            raise OAuth2Error(
                response_data["error"],
                response_data.get("error_description", ""),
                response_data.get("hint", ""),
            )

        self._store_token_response(response_data)
        return response_data

    def _store_token_response(self, token_data: dict) -> None:
        """Update in-memory token state from a token response and persist to disk."""
        self.access_token = token_data["access_token"]
        self.token_type = token_data.get("token_type", "Bearer")
        expires_in = int(token_data.get("expires_in", 2_592_000))
        self.token_expires_at = time.time() + expires_in

        if "refresh_token" in token_data:
            self.refresh_token = token_data["refresh_token"]

        self._save_config()

    # ------------------------------------------------------------------
    # Token validity helpers
    # ------------------------------------------------------------------

    def is_token_expired(self, buffer_seconds: int = 300) -> bool:
        """
        Return ``True`` if the access token is absent, expired, or will
        expire within *buffer_seconds* seconds.

        Args:
            buffer_seconds: Proactive expiry buffer (default 5 minutes).

        Returns:
            ``True`` if a (re-)authorization is required, ``False`` otherwise.
        """
        if not self.access_token:
            return True
        return time.time() >= (self.token_expires_at - buffer_seconds)

    def get_valid_access_token(self) -> str:
        """
        Return a valid access token, refreshing automatically when expired.

        Raises:
            ValueError:  If no refresh token is available and the token is expired.
            OAuth2Error: If the refresh request fails.
        """
        if self.is_token_expired():
            self.refresh_access_token()
        return self.access_token

    def get_auth_headers(self) -> Dict[str, str]:
        """
        Return an ``Authorization`` header dict suitable for API requests.

        Automatically refreshes the access token if it has expired.

        Returns:
            ``{"Authorization": "Bearer <token>"}``
        """
        token = self.get_valid_access_token()
        return {"Authorization": f"{self.token_type} {token}"}

    # ------------------------------------------------------------------
    # Local callback server
    # ------------------------------------------------------------------

    def start_local_callback_server(self, timeout: int = 120) -> str:
        """
        Start a transient local HTTP server on the redirect_uri port to
        capture the authorization code delivered by RunSignUp.

        The server handles exactly one request then shuts down.

        Args:
            timeout: Seconds to wait for the callback before raising
                     ``TimeoutError`` (default 120 s).

        Returns:
            The authorization code string.

        Raises:
            OAuth2Error:  If RunSignUp returns an error in the callback.
            TimeoutError: If no callback is received within *timeout* seconds.
        """
        parsed = urllib.parse.urlparse(self.redirect_uri)
        host = parsed.hostname or "localhost"
        port = parsed.port or 8080

        result: Dict[str, Optional[str]] = {"code": None, "error": None, "error_description": None}

        class _CallbackHandler(BaseHTTPRequestHandler):
            def do_GET(self):
                query = urllib.parse.urlparse(self.path).query
                params = urllib.parse.parse_qs(query)

                if "code" in params:
                    result["code"] = params["code"][0]
                    self._respond(200, b"<h2>Authorization successful!</h2><p>You may close this window.</p>")
                else:
                    result["error"] = params.get("error", ["unknown_error"])[0]
                    result["error_description"] = params.get("error_description", [""])[0]
                    self._respond(400, b"<h2>Authorization failed.</h2><p>You may close this window.</p>")

            def _respond(self, status: int, body: bytes) -> None:
                self.send_response(status)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.end_headers()
                self.wfile.write(b"<html><body>" + body + b"</body></html>")

            def log_message(self, format, *args):  # noqa: A002
                pass

        server = HTTPServer((host, port), _CallbackHandler)
        server.timeout = timeout
        server.handle_request()
        server.server_close()

        if result["error"]:
            raise OAuth2Error(result["error"], result.get("error_description") or "")
        if not result["code"]:
            raise TimeoutError(
                f"No OAuth2 callback received within {timeout} seconds. "
                "Ensure the browser was opened and authorization was completed."
            )

        return result["code"]

    # ------------------------------------------------------------------
    # Complete initial authorization flow
    # ------------------------------------------------------------------

    def run_initial_auth_flow(
        self,
        open_browser: bool = True,
        state: Optional[str] = None,
        callback_timeout: int = 120,
    ) -> str:
        """
        Execute the full OAuth2 Authorization Code flow end-to-end:

        1. Build authorization URL (with PKCE if configured).
        2. Optionally open the user's browser.
        3. Start a local callback server to receive the authorization code.
        4. Exchange the code for access + refresh tokens.
        5. Persist tokens to ``client_config.json``.

        Args:
            open_browser:     Automatically open the authorization URL in the
                              system's default browser (default ``True``).
            state:            CSRF state value; a random string is used when
                              omitted.
            callback_timeout: Seconds to wait for the browser callback
                              (default 120 s).

        Returns:
            The new access token string.

        Raises:
            OAuth2Error:  If authorization is denied or the token exchange fails.
            TimeoutError: If the browser callback is not received in time.
        """
        auth_url = self.build_authorization_url(state=state)

        print(f"\n--- RunSignUp OAuth2 Flow ---")
        print(f"  Environment  : {'TEST' if 'test.runsignup' in self.authorization_url else 'PRODUCTION'}")
        print(f"  Client ID    : {self.client_id}")
        print(f"  Redirect URI : {self.redirect_uri}")
        print(f"  Scope        : {self.scope}")
        print(f"  PKCE         : {'enabled (S256)' if self.use_pkce else 'disabled'}")
        print(f"\nAuthorization URL:\n  {auth_url}\n")

        if open_browser:
            print("Opening browser for RunSignUp authorization...")
            webbrowser.open(auth_url)
        else:
            print("Please open the above URL in your browser to authorize the application.")

        print(f"Waiting up to {callback_timeout}s for the authorization callback on {self.redirect_uri} ...")
        code = self.start_local_callback_server(timeout=callback_timeout)

        print(f"Authorization code received (length={len(code)}). Exchanging for tokens...")
        print(f"  POST {self.token_url}")
        self.exchange_code_for_tokens(code)

        print("Tokens obtained and saved to config file.")
        return self.access_token
