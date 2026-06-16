"""Validate Auth0-issued access tokens.

With "Login with Microsoft" (and Auth0 Universal Login in general), Auth0 issues
the access token; the frontend SDK holds it and sends it to us as
``Authorization: Bearer <auth0-token>``. This module verifies that token's
signature against the tenant's JWKS and exposes the caller's profile.

Tokens are RS256 JWTs signed by Auth0. We verify signature, issuer and expiry
(and audience when ``AUTH0_AUDIENCE`` is configured). The user's email/name are
read from the token's claims when present, otherwise from the ``/userinfo``
endpoint.
"""

import httpx
from jose import jwt
from jose.exceptions import JWTError

from src.core.config import settings


class Auth0TokenError(Exception):
    """Raised when an Auth0 access token cannot be validated."""


# Possible locations for the email claim: standard OIDC, or a custom namespaced
# claim added via an Auth0 Action (e.g. "https://<app>/email").
_EMAIL_CLAIM_KEYS = ("email", "https://email", "https://schemas.example.com/email")


class Auth0TokenValidator:
    ALGORITHMS = ("RS256",)
    _TIMEOUT = 10.0
    # JWKS rarely rotates; cache it across requests at the class level.
    _jwks_cache: dict | None = None

    def __init__(self) -> None:
        self.domain = settings.auth0_domain
        self.issuer = f"https://{self.domain}/"
        self.jwks_url = f"https://{self.domain}/.well-known/jwks.json"

    def _fetch_jwks(self, force: bool = False) -> dict:
        if force or Auth0TokenValidator._jwks_cache is None:
            try:
                resp = httpx.get(self.jwks_url, timeout=self._TIMEOUT)
                resp.raise_for_status()
            except httpx.HTTPError as exc:
                raise Auth0TokenError(f"Could not fetch Auth0 JWKS: {exc}") from exc
            Auth0TokenValidator._jwks_cache = resp.json()
        return Auth0TokenValidator._jwks_cache

    def _signing_key(self, kid: str) -> dict:
        jwks = self._fetch_jwks()
        key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
        if key is None:
            # Key may have rotated since we cached — refresh once and retry.
            jwks = self._fetch_jwks(force=True)
            key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
        if key is None:
            raise Auth0TokenError("No matching JWKS key for token")
        return key

    def verify(self, token: str) -> dict:
        """Verify the token and return its claims, or raise Auth0TokenError."""
        if not self.domain:
            raise Auth0TokenError("Auth0 is not configured (AUTH0_DOMAIN is empty)")
        try:
            kid = jwt.get_unverified_header(token).get("kid")
            if not kid:
                raise Auth0TokenError("Token header missing 'kid'")
            key = self._signing_key(kid)
            return jwt.decode(
                token,
                key,
                algorithms=list(self.ALGORITHMS),
                issuer=self.issuer,
                audience=settings.auth0_audience or None,
                options={"verify_aud": bool(settings.auth0_audience)},
            )
        except JWTError as exc:
            raise Auth0TokenError(f"Invalid Auth0 token: {exc}") from exc

    def userinfo(self, token: str) -> dict:
        """Fetch the OIDC profile (email, name, ...) for the token's subject."""
        try:
            resp = httpx.get(
                f"https://{self.domain}/userinfo",
                headers={"Authorization": f"Bearer {token}"},
                timeout=self._TIMEOUT,
            )
            resp.raise_for_status()
        except httpx.HTTPError as exc:
            raise Auth0TokenError(f"Could not fetch Auth0 userinfo: {exc}") from exc
        return resp.json()

    def get_profile(self, token: str) -> dict:
        """Validate the token and return a normalized profile.

        Returns a dict with: sub, email, first_name, last_name.
        Raises Auth0TokenError if the token is invalid or has no email.
        """
        claims = self.verify(token)

        email = next((claims[k] for k in _EMAIL_CLAIM_KEYS if claims.get(k)), None)
        given = claims.get("given_name")
        family = claims.get("family_name")
        name = claims.get("name")

        # Access tokens often omit profile claims — fall back to /userinfo.
        if not email or not (given or name):
            info = self.userinfo(token)
            email = email or info.get("email")
            given = given or info.get("given_name")
            family = family or info.get("family_name")
            name = name or info.get("name")

        if not email:
            raise Auth0TokenError("Token has no email; request the 'email' scope")

        first_name = given or (name.split(" ")[0] if name else email.split("@")[0])
        last_name = family or (
            " ".join(name.split(" ")[1:]) if name and len(name.split(" ")) > 1 else ""
        )

        return {
            "sub": claims.get("sub"),
            "email": email,
            "first_name": first_name,
            "last_name": last_name,
        }
