"""Thin X-Road client used by the MOSD Grants Portal.

All traffic goes to the *consumer* Security Server (ss2). The portal never
talks to the MOHA registry directly - it does not even know its address.
Each call returns a Trace so the UI can show exactly what crossed the wire.
"""

from __future__ import annotations

import os
import time
import uuid
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field

import httpx

SS_URL = os.getenv("XROAD_SS_URL", "http://ss2:8080").rstrip("/")
CLIENT_ID = os.getenv("XROAD_CLIENT", "LS-DEV/GOV/MOSD/GRANTS-PORTAL")
PROVIDER_ID = os.getenv("XROAD_PROVIDER", "LS-DEV/GOV/MOHA/POPULATION-REGISTRY")
REST_SERVICE_CODE = os.getenv("XROAD_REST_SERVICE", "population-api")
SOAP_SERVICE_CODE = os.getenv("XROAD_SOAP_SERVICE", "verifyIdentity")
SOAP_SERVICE_VERSION = os.getenv("XROAD_SOAP_VERSION", "v1")
TIMEOUT = float(os.getenv("XROAD_TIMEOUT", "30"))

NS = {
    "soapenv": "http://schemas.xmlsoap.org/soap/envelope/",
    "xrd": "http://x-road.eu/xsd/xroad.xsd",
    "id": "http://x-road.eu/xsd/identifiers",
    "pop": "http://moha.gov.ls/population",
}

# Common X-Road error codes -> what to fix. Shown under failed calls.
HINTS = {
    "AccessDenied": "ss3 has not granted GRANTS-PORTAL access to this service. On ss3: Clients → POPULATION-REGISTRY → Services → (service) → Service clients → Add.",
    "UnknownService": "The service code is not registered on ss3, or global configuration has not reached ss2 yet. Check the service code, then wait 1–2 minutes.",
    "ServiceDisabled": "The service description is disabled on ss3. Enable it in Clients → POPULATION-REGISTRY → Services.",
    "UnknownMember": "ss2 does not know this client or provider. Check that both subsystems are REGISTERED and global configuration has refreshed.",
    "SslAuthenticationFailed": "Connection type mismatch. On ss2: Clients → GRANTS-PORTAL → Internal Servers → Connection type = HTTP.",
    "InvalidClientIdentifier": "The X-Road-Client header / xrd:client block does not match a subsystem registered on ss2.",
    "NetworkError": "ss3 could not reach the registry, or ss2 could not reach ss3. Check `docker compose ps` and the service URL on ss3.",
    "ServiceFailed": "The registry itself returned an error. See `docker compose logs moha-registry`.",
    "OutdatedGlobalConf": "A Security Server's global configuration is stale. Check that cs is running and wait for the next refresh.",
}


@dataclass
class Trace:
    label: str
    method: str
    url: str
    request_headers: dict
    request_body: str | None = None
    status: int | None = None
    response_headers: dict = field(default_factory=dict)
    response_body: str = ""
    elapsed_ms: int = 0
    error: str | None = None
    hint: str | None = None

    @property
    def ok(self) -> bool:
        return self.error is None and self.status is not None and self.status < 400

    @property
    def xroad_response_headers(self) -> dict:
        return {k: v for k, v in self.response_headers.items() if k.lower().startswith("x-road")}


def _hint_for(text: str) -> str | None:
    for key, hint in HINTS.items():
        if key.lower() in text.lower():
            return hint
    return None


def _send(trace: Trace, content: bytes | None = None) -> httpx.Response | None:
    start = time.perf_counter()
    try:
        with httpx.Client(timeout=TIMEOUT) as http:
            resp = http.request(trace.method, trace.url, headers=trace.request_headers, content=content)
    except httpx.HTTPError as exc:
        trace.elapsed_ms = int((time.perf_counter() - start) * 1000)
        trace.error = f"Could not reach consumer Security Server at {SS_URL}: {exc.__class__.__name__}: {exc}"
        trace.hint = "Is ss2 running and initialised? `docker compose ps`, then check https://ss2.lab:2000."
        return None
    trace.elapsed_ms = int((time.perf_counter() - start) * 1000)
    trace.status = resp.status_code
    trace.response_headers = dict(resp.headers)
    trace.response_body = resp.text
    return resp


# ---------------------------------------------------------------------------
# REST:  GET {ss2}/r1/{provider}/{serviceCode}/{path}
# ---------------------------------------------------------------------------
def rest_get(path: str, user_id: str, label: str) -> tuple[Trace, dict | None]:
    url = f"{SS_URL}/r1/{PROVIDER_ID}/{REST_SERVICE_CODE}/{path.lstrip('/')}"
    headers = {
        "X-Road-Client": CLIENT_ID,
        "X-Road-UserId": user_id or "anonymous",
        "Accept": "application/json",
    }
    trace = Trace(label=label, method="GET", url=url, request_headers=headers)
    resp = _send(trace)
    if resp is None:
        return trace, None

    try:
        data = resp.json()
    except ValueError:
        data = None

    if resp.status_code >= 400:
        # X-Road errors carry {"type": "Server.ServerProxy.AccessDenied", "message": ...}
        # and an X-Road-Error header; provider errors are the registry's own JSON.
        xroad_error = resp.headers.get("x-road-error") or (data or {}).get("type")
        if xroad_error:
            trace.error = f"X-Road error {xroad_error}: {(data or {}).get('message', '')}"
            trace.hint = _hint_for(xroad_error)
        elif resp.status_code == 404:
            return trace, data  # a normal "not found" answer from the registry
        else:
            trace.error = f"HTTP {resp.status_code}"
    return trace, data


def lookup_citizen(national_id: str, user_id: str):
    return rest_get(f"citizens/{national_id}", user_id, "REST · getCitizen")


def vital_status(national_id: str, user_id: str):
    return rest_get(f"citizens/{national_id}/vital-status", user_id, "REST · getVitalStatus")


# ---------------------------------------------------------------------------
# SOAP:  POST {ss2}/  with X-Road headers inside the envelope
# ---------------------------------------------------------------------------
def _identifier_xml(tag: str, object_type: str, parts: list[tuple[str, str]]) -> str:
    inner = "".join(f"<id:{k}>{v}</id:{k}>" for k, v in parts)
    return f'<xrd:{tag} id:objectType="{object_type}">{inner}</xrd:{tag}>'


def build_verify_envelope(national_id: str, first_name: str, surname: str, dob: str, user_id: str,
                          message_id: str) -> str:
    ci, cc, cm, cs = CLIENT_ID.split("/")
    pi, pc, pm, ps = PROVIDER_ID.split("/")
    client = _identifier_xml("client", "SUBSYSTEM", [
        ("xRoadInstance", ci), ("memberClass", cc), ("memberCode", cm), ("subsystemCode", cs)])
    service = _identifier_xml("service", "SERVICE", [
        ("xRoadInstance", pi), ("memberClass", pc), ("memberCode", pm), ("subsystemCode", ps),
        ("serviceCode", SOAP_SERVICE_CODE), ("serviceVersion", SOAP_SERVICE_VERSION)])

    def opt(tag, value):
        return f"<pop:{tag}>{_esc(value)}</pop:{tag}>" if value else ""

    return f"""<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="{NS['soapenv']}" xmlns:xrd="{NS['xrd']}" xmlns:id="{NS['id']}" xmlns:pop="{NS['pop']}">
  <soapenv:Header>
    {client}
    {service}
    <xrd:id>{message_id}</xrd:id>
    <xrd:userId>{_esc(user_id or 'anonymous')}</xrd:userId>
    <xrd:protocolVersion>4.0</xrd:protocolVersion>
  </soapenv:Header>
  <soapenv:Body>
    <pop:verifyIdentity>
      <pop:nationalId>{_esc(national_id)}</pop:nationalId>
      {opt('firstName', first_name)}{opt('surname', surname)}{opt('dateOfBirth', dob)}
    </pop:verifyIdentity>
  </soapenv:Body>
</soapenv:Envelope>"""


def _esc(s: str) -> str:
    return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def verify_identity(national_id: str, first_name: str, surname: str, dob: str,
                    user_id: str) -> tuple[Trace, dict | None]:
    message_id = str(uuid.uuid4())
    envelope = build_verify_envelope(national_id, first_name, surname, dob, user_id, message_id)
    headers = {"Content-Type": "text/xml; charset=utf-8", "SOAPAction": ""}
    trace = Trace(label="SOAP · verifyIdentity v1", method="POST", url=f"{SS_URL}/",
                  request_headers=headers, request_body=envelope)
    resp = _send(trace, envelope.encode("utf-8"))
    if resp is None:
        return trace, None

    try:
        root = ET.fromstring(resp.content)
    except ET.ParseError:
        trace.error = f"HTTP {resp.status_code}: response was not XML"
        return trace, None

    fault = root.find(f".//{{{NS['soapenv']}}}Fault")
    if fault is not None:
        code = fault.findtext("faultcode") or ""
        trace.error = f"SOAP fault {code}: {fault.findtext('faultstring') or ''}"
        trace.hint = _hint_for(code)
        return trace, None

    r = root.find(f".//{{{NS['pop']}}}verifyIdentityResponse")
    if r is None:
        trace.error = "Response did not contain verifyIdentityResponse"
        return trace, None
    p = f"{{{NS['pop']}}}"
    result = {
        "nationalId": r.findtext(p + "nationalId"),
        "found": r.findtext(p + "found") == "true",
        "match": r.findtext(p + "match") == "true",
        "mismatchedFields": [e.text for e in r.findall(p + "mismatchedFields")],
        "vitalStatus": r.findtext(p + "vitalStatus"),
        "messageId": message_id,
    }
    return trace, result
