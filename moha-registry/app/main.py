"""MOHA Population Registry - the service provider IS behind ss3.

X-Road identity:  LS-DEV/GOV/MOHA/POPULATION-REGISTRY

Interfaces published to X-Road (via ss3):
  REST  GET /api/citizens/{id}                 -> service code "population-api"
  REST  GET /api/citizens/{id}/vital-status    -> (same service, second endpoint)
  SOAP  POST /soap  (verifyIdentity v1)        -> service code "verifyIdentity"

Local helper endpoints (not published to X-Road):
  GET /openapi.yaml        service description ss3 imports
  GET /soap/population.wsdl service description ss3 imports
  GET /audit               who called us through X-Road (HTML)
  GET /audit.json          the same as JSON
  GET /health
"""

from __future__ import annotations

import datetime as dt
import html
import logging
import xml.etree.ElementTree as ET
from collections import deque
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse, Response

from .data import CITIZENS

APP_DIR = Path(__file__).parent
log = logging.getLogger("moha-registry")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

app = FastAPI(
    title="MOHA Population Registry",
    description="Service provider information system (behind Security Server ss3).",
    version="1.0.0",
    docs_url="/docs",
)

# ---------------------------------------------------------------------------
# Audit trail: every request that arrives through X-Road carries X-Road
# metadata added by the provider Security Server. We keep the last 100 so
# the /audit page can show *who* asked for *what*.
# ---------------------------------------------------------------------------
AUDIT: deque[dict] = deque(maxlen=100)


def record(interface: str, operation: str, national_id: str | None, xroad: dict, outcome: str) -> None:
    entry = {
        "time": dt.datetime.now().isoformat(sep=" ", timespec="seconds"),
        "interface": interface,
        "operation": operation,
        "nationalId": national_id,
        "client": xroad.get("client", "(not via X-Road)"),
        "userId": xroad.get("userId", ""),
        "messageId": xroad.get("id", ""),
        "outcome": outcome,
        "xroad": xroad,
    }
    AUDIT.appendleft(entry)
    log.info("%s %s id=%s client=%s -> %s", interface, operation, national_id, entry["client"], outcome)


def rest_xroad_meta(request: Request) -> dict:
    """Collect the X-Road-* headers ss3 adds when it forwards a REST call."""
    meta = {k: v for k, v in request.headers.items() if k.lower().startswith("x-road-")}
    if "x-road-client" in meta:
        meta["client"] = meta["x-road-client"]
    if "x-road-id" in meta:
        meta["id"] = meta["x-road-id"]
    if "x-road-userid" in meta:
        meta["userId"] = meta["x-road-userid"]
    return meta


# ---------------------------------------------------------------------------
# REST interface
# ---------------------------------------------------------------------------
def _not_found(national_id: str) -> JSONResponse:
    return JSONResponse(
        status_code=404,
        content={"error": "NOT_FOUND", "message": f"No citizen with national ID {national_id}"},
    )


@app.get("/api/citizens/{national_id}")
def get_citizen(national_id: str, request: Request):
    meta = rest_xroad_meta(request)
    citizen = CITIZENS.get(national_id)
    record("REST", "getCitizen", national_id, meta, "found" if citizen else "not found")
    return citizen if citizen else _not_found(national_id)


@app.get("/api/citizens/{national_id}/vital-status")
def get_vital_status(national_id: str, request: Request):
    meta = rest_xroad_meta(request)
    citizen = CITIZENS.get(national_id)
    record("REST", "getVitalStatus", national_id, meta, "found" if citizen else "not found")
    if not citizen:
        return _not_found(national_id)
    out = {"nationalId": national_id, "vitalStatus": citizen["vitalStatus"]}
    if citizen.get("dateOfDeath"):
        out["dateOfDeath"] = citizen["dateOfDeath"]
    return out


@app.get("/openapi.yaml", include_in_schema=False)
def openapi_yaml():
    return Response((APP_DIR / "openapi.yaml").read_text(), media_type="application/yaml")


# ---------------------------------------------------------------------------
# SOAP interface (X-Road message protocol for SOAP 4.0)
# ---------------------------------------------------------------------------
NS = {
    "soapenv": "http://schemas.xmlsoap.org/soap/envelope/",
    "xrd": "http://x-road.eu/xsd/xroad.xsd",
    "id": "http://x-road.eu/xsd/identifiers",
    "pop": "http://moha.gov.ls/population",
}
for prefix, uri in NS.items():
    ET.register_namespace(prefix, uri)


def _q(prefix: str, local: str) -> str:
    return f"{{{NS[prefix]}}}{local}"


def _identifier_to_str(el: ET.Element | None) -> str:
    """xrd:client / xrd:service element -> 'LS-DEV/GOV/MOSD/GRANTS-PORTAL'."""
    if el is None:
        return ""
    parts = [
        el.findtext(_q("id", tag))
        for tag in ("xRoadInstance", "memberClass", "memberCode", "subsystemCode", "serviceCode", "serviceVersion")
    ]
    return "/".join(p for p in parts if p)


def _soap_fault(code: str, message: str, status: int = 500) -> Response:
    body = f"""<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="{NS['soapenv']}">
  <soapenv:Body>
    <soapenv:Fault>
      <faultcode>{html.escape(code)}</faultcode>
      <faultstring>{html.escape(message)}</faultstring>
    </soapenv:Fault>
  </soapenv:Body>
</soapenv:Envelope>"""
    return Response(body, status_code=status, media_type="text/xml; charset=utf-8")


@app.get("/soap/population.wsdl", include_in_schema=False)
def wsdl():
    return Response((APP_DIR / "population.wsdl").read_text(), media_type="text/xml; charset=utf-8")


@app.post("/soap", include_in_schema=False)
async def soap_endpoint(request: Request):
    raw = await request.body()
    try:
        envelope = ET.fromstring(raw)
    except ET.ParseError as exc:
        return _soap_fault("Client.MalformedXml", f"Could not parse request: {exc}")

    header = envelope.find(_q("soapenv", "Header"))
    body = envelope.find(_q("soapenv", "Body"))
    if body is None or len(body) == 0:
        return _soap_fault("Client.NoBody", "SOAP Body is missing or empty")

    request_el = body[0]
    meta = {}
    if header is not None:
        meta = {
            "client": _identifier_to_str(header.find(_q("xrd", "client"))),
            "service": _identifier_to_str(header.find(_q("xrd", "service"))),
            "id": header.findtext(_q("xrd", "id")) or "",
            "userId": header.findtext(_q("xrd", "userId")) or "",
            "protocolVersion": header.findtext(_q("xrd", "protocolVersion")) or "",
        }

    if request_el.tag != _q("pop", "verifyIdentity"):
        record("SOAP", request_el.tag, None, meta, "unknown operation")
        return _soap_fault("Client.UnknownOperation", f"Unknown operation {request_el.tag}")

    national_id = (request_el.findtext(_q("pop", "nationalId")) or "").strip()
    supplied = {
        "firstName": request_el.findtext(_q("pop", "firstName")),
        "surname": request_el.findtext(_q("pop", "surname")),
        "dateOfBirth": request_el.findtext(_q("pop", "dateOfBirth")),
    }
    citizen = CITIZENS.get(national_id)

    mismatched: list[str] = []
    if citizen:
        for field, value in supplied.items():
            if value is None or value.strip() == "":
                continue  # caller chose not to check this field
            if value.strip().casefold() != str(citizen[field]).casefold():
                mismatched.append(field)

    found = citizen is not None
    match = found and not mismatched
    record("SOAP", "verifyIdentity", national_id, meta,
           "match" if match else ("mismatch: " + ",".join(mismatched) if found else "not found"))

    # Build the response: X-Road requires the provider to echo the request
    # headers back unchanged, so we copy the whole <soapenv:Header>.
    resp_env = ET.Element(_q("soapenv", "Envelope"))
    if header is not None:
        resp_env.append(header)
    resp_body = ET.SubElement(resp_env, _q("soapenv", "Body"))
    resp = ET.SubElement(resp_body, _q("pop", "verifyIdentityResponse"))
    ET.SubElement(resp, _q("pop", "nationalId")).text = national_id
    ET.SubElement(resp, _q("pop", "found")).text = str(found).lower()
    ET.SubElement(resp, _q("pop", "match")).text = str(match).lower()
    for field in mismatched:
        ET.SubElement(resp, _q("pop", "mismatchedFields")).text = field
    if citizen:
        ET.SubElement(resp, _q("pop", "vitalStatus")).text = citizen["vitalStatus"]

    xml = ET.tostring(resp_env, encoding="utf-8", xml_declaration=True)
    return Response(xml, media_type="text/xml; charset=utf-8")


# ---------------------------------------------------------------------------
# Audit + health
# ---------------------------------------------------------------------------
@app.get("/health", include_in_schema=False)
def health():
    return {"status": "ok", "records": len(CITIZENS)}


@app.get("/audit.json", include_in_schema=False)
def audit_json():
    return list(AUDIT)


@app.get("/audit", response_class=HTMLResponse, include_in_schema=False)
def audit_page():
    rows = "".join(
        f"<tr><td>{html.escape(e['time'])}</td><td>{e['interface']}</td><td>{html.escape(e['operation'])}</td>"
        f"<td><code>{html.escape(e['nationalId'] or '')}</code></td><td><code>{html.escape(e['client'])}</code></td>"
        f"<td>{html.escape(e['userId'])}</td><td><code>{html.escape(e['messageId'])}</code></td>"
        f"<td>{html.escape(e['outcome'])}</td></tr>"
        for e in AUDIT
    ) or '<tr><td colspan="8" class="empty">No calls yet. Run a lookup from the MOSD Grants Portal.</td></tr>'
    return f"""<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="refresh" content="5"><title>MOHA registry – X-Road audit</title>
<style>
 body{{font-family:system-ui,sans-serif;margin:2rem;color:#1d2433;background:#f6f7f9}}
 h1{{font-size:1.3rem;margin:0 0 .2rem}} p{{color:#5b6475;margin:.2rem 0 1.2rem}}
 table{{border-collapse:collapse;width:100%;background:#fff;font-size:.88rem}}
 th,td{{padding:.5rem .6rem;border-bottom:1px solid #e3e6eb;text-align:left;vertical-align:top}}
 th{{background:#00209f;color:#fff;font-weight:600}} code{{font-size:.82rem}}
 .empty{{color:#8a93a3;text-align:center;padding:2rem}}
</style></head><body>
<h1>Ministry of Home Affairs · Population Registry</h1>
<p>Incoming requests as seen by the provider IS. The <b>X-Road client</b> column comes from the X-Road message, which ss2 signed and ss3 verified before
checking access rights, so the registry can rely on it. Refreshes every 5 s.</p>
<table><tr><th>Time</th><th>API</th><th>Operation</th><th>National ID</th><th>X-Road client</th>
<th>User</th><th>Message ID</th><th>Outcome</th></tr>{rows}</table></body></html>"""
