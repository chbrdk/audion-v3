"""Auth + SSRF guards for the AUDION UX Journey Agent service."""

from __future__ import annotations

import ipaddress
import os
import socket
from urllib.parse import urlparse

from fastapi import Header, HTTPException, Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse, Response


def _expected_secret() -> str | None:
    raw = (os.environ.get("UX_JOURNEY_AGENT_SECRET") or "").strip()
    return raw or None


def require_agent_secret(
    x_ux_journey_secret: str | None = Header(default=None, alias="X-UX-Journey-Secret"),
    authorization: str | None = Header(default=None),
) -> None:
    """Reject requests when UX_JOURNEY_AGENT_SECRET is set and credentials mismatch.

    Local/dev: leave the env unset to allow unauthenticated access.
    Production/Coolify: set a shared secret; web BFF sends the same header.
    """
    expected = _expected_secret()
    if not expected:
        return
    bearer = None
    if authorization and authorization.lower().startswith("bearer "):
        bearer = authorization[7:].strip()
    provided = (x_ux_journey_secret or bearer or "").strip()
    if not provided or provided != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")


class AgentAuthMiddleware(BaseHTTPMiddleware):
    """Optional shared-secret gate for all routes except /health."""

    async def dispatch(self, request: Request, call_next) -> Response:
        if request.url.path in ("/health", "/health/"):
            return await call_next(request)
        expected = _expected_secret()
        if not expected:
            return await call_next(request)
        header = (request.headers.get("x-ux-journey-secret") or "").strip()
        auth = request.headers.get("authorization") or ""
        bearer = auth[7:].strip() if auth.lower().startswith("bearer ") else ""
        provided = header or bearer
        if provided != expected:
            return JSONResponse({"detail": "Unauthorized"}, status_code=401)
        return await call_next(request)


def _hostname_is_blocked(hostname: str) -> bool:
    host = hostname.strip().lower().rstrip(".")
    if not host:
        return True
    if host in ("localhost", "localhost.localdomain", "0.0.0.0"):
        return True
    if host.endswith(".local") or host.endswith(".internal"):
        return True
    # Cloud metadata / link-local names
    if host in ("metadata.google.internal", "metadata", "instance-data"):
        return True
    return False


def _ip_is_blocked(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
        return True
    # AWS/GCP/Azure metadata
    if isinstance(ip, ipaddress.IPv4Address) and str(ip) == "169.254.169.254":
        return True
    return False


def assert_public_http_url(url: str) -> str:
    """Validate http(s) URL and reject SSRF targets (private/link-local/metadata).

    Optional allowlist: ``UX_JOURNEY_URL_ALLOWLIST`` comma-separated host suffixes
    (e.g. ``example.com,.customer.com``). When set, hostname must match one entry.
    """
    raw = (url or "").strip()
    parsed = urlparse(raw)
    if parsed.scheme not in ("http", "https"):
        raise HTTPException(status_code=400, detail="url must be http(s)")
    if not parsed.hostname:
        raise HTTPException(status_code=400, detail="url host required")
    host = parsed.hostname
    if _hostname_is_blocked(host):
        raise HTTPException(status_code=400, detail="url host is not allowed")

    allow = (os.environ.get("UX_JOURNEY_URL_ALLOWLIST") or "").strip()
    if allow:
        suffixes = [s.strip().lower() for s in allow.split(",") if s.strip()]
        host_l = host.lower()
        ok = False
        for s in suffixes:
            needle = s[1:] if s.startswith(".") else s
            if host_l == needle or host_l.endswith("." + needle):
                ok = True
                break
        if not ok:
            raise HTTPException(status_code=400, detail="url host not in allowlist")

    # Resolve DNS and reject private answers (basic DNS rebinding protection).
    try:
        infos = socket.getaddrinfo(host, parsed.port or (443 if parsed.scheme == "https" else 80))
    except socket.gaierror as exc:
        raise HTTPException(status_code=400, detail=f"url host could not be resolved: {exc}") from exc
    if not infos:
        raise HTTPException(status_code=400, detail="url host could not be resolved")
    for info in infos:
        sockaddr = info[4]
        ip_str = sockaddr[0]
        try:
            ip = ipaddress.ip_address(ip_str)
        except ValueError:
            continue
        if _ip_is_blocked(ip):
            raise HTTPException(status_code=400, detail="url resolves to a blocked address")
    return raw
