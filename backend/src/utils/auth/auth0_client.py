"""Auth0 client for the admin-invite flow.

When an admin adds a user (email only) we:
  1. create that user in the Auth0 database connection via the Management API
     (privileged — works even if self-signups are disabled), and
  2. ask Auth0 to email the user a "set your password" link.

The user then sets their password on Auth0's hosted page; the password lives in
Auth0, not in our DB. Creating users requires a Machine-to-Machine application
authorized for the Management API (``auth0_mgmt_client_id`` /
``auth0_mgmt_client_secret``). The password email uses the public application
client id.
"""

import secrets

import httpx

from src.core.config import settings


class Auth0Error(Exception):
    """Raised when an Auth0 API call fails."""


class Auth0Client:
    _TIMEOUT = 10.0

    def __init__(self) -> None:
        self.domain = settings.auth0_domain
        self.client_id = settings.auth0_client_id
        self.connection = settings.auth0_connection

    @property
    def is_configured(self) -> bool:
        return bool(
            self.domain
            and settings.auth0_mgmt_client_id
            and settings.auth0_mgmt_client_secret
        )

    def _require_configured(self) -> None:
        if not self.is_configured:
            raise Auth0Error(
                "Auth0 management is not configured. Set AUTH0_DOMAIN, "
                "AUTH0_MGMT_CLIENT_ID and AUTH0_MGMT_CLIENT_SECRET."
            )

    @staticmethod
    def generate_password() -> str:
        """A throwaway password satisfying Auth0's default policy. The user
        replaces it via the set-password email, so it is never used to log in."""
        return f"Aa1!{secrets.token_urlsafe(24)}"

    def _get_management_token(self) -> str:
        self._require_configured()
        try:
            resp = httpx.post(
                f"https://{self.domain}/oauth/token",
                json={
                    "grant_type": "client_credentials",
                    "client_id": settings.auth0_mgmt_client_id,
                    "client_secret": settings.auth0_mgmt_client_secret,
                    "audience": f"https://{self.domain}/api/v2/",
                },
                timeout=self._TIMEOUT,
            )
            resp.raise_for_status()
        except httpx.HTTPError as exc:
            raise Auth0Error(f"Failed to obtain Auth0 management token: {exc}") from exc
        return resp.json()["access_token"]

    def create_user(self, email: str, password: str | None = None) -> str:
        """Create the user in the Auth0 database connection; return the user_id.

        Idempotent: if the user already exists in Auth0, the existing id is
        returned so the invite can still (re)send the set-password email.
        """
        password = password or self.generate_password()
        try:
            resp = httpx.post(
                f"https://{self.domain}/api/v2/users",
                headers={"Authorization": f"Bearer {self._get_management_token()}"},
                json={
                    "email": email,
                    "password": password,
                    "connection": self.connection,
                    "email_verified": False,
                    "verify_email": False,
                },
                timeout=self._TIMEOUT,
            )
        except httpx.HTTPError as exc:
            raise Auth0Error(f"Failed to create Auth0 user: {exc}") from exc

        if resp.status_code == 409:
            existing = self._get_user_id_by_email(email)
            if existing:
                return existing
        if resp.status_code >= 400:
            raise Auth0Error(
                f"Auth0 user creation failed ({resp.status_code}): {resp.text}"
            )
        return resp.json()["user_id"]

    def _get_user_id_by_email(self, email: str) -> str | None:
        try:
            resp = httpx.get(
                f"https://{self.domain}/api/v2/users-by-email",
                headers={"Authorization": f"Bearer {self._get_management_token()}"},
                params={"email": email},
                timeout=self._TIMEOUT,
            )
            resp.raise_for_status()
        except httpx.HTTPError as exc:
            raise Auth0Error(f"Failed to look up Auth0 user: {exc}") from exc
        users = resp.json()
        return users[0]["user_id"] if users else None

    def send_set_password_email(self, email: str) -> None:
        """Ask Auth0 to email the user a link to set/change their password.

        Uses the Authentication API change-password endpoint (public client id,
        no management token), which triggers Auth0's password email for the user
        in this connection.
        """
        if not self.domain or not self.client_id:
            raise Auth0Error(
                "Auth0 is not configured (AUTH0_DOMAIN / AUTH0_CLIENT_ID)."
            )
        try:
            resp = httpx.post(
                f"https://{self.domain}/dbconnections/change_password",
                json={
                    "client_id": self.client_id,
                    "email": email,
                    "connection": self.connection,
                },
                timeout=self._TIMEOUT,
            )
        except httpx.HTTPError as exc:
            raise Auth0Error(f"Failed to send Auth0 set-password email: {exc}") from exc
        if resp.status_code not in (200, 201):
            raise Auth0Error(
                f"Auth0 set-password email failed ({resp.status_code}): {resp.text}"
            )
