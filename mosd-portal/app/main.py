"""MOSD Grants Portal - the service consumer IS behind ss2.

X-Road identity:  LS-DEV/GOV/MOSD/GRANTS-PORTAL

A grants officer enters an applicant's national ID. The portal:
  1. verifies the identity details with MOHA      (SOAP  verifyIdentity v1)
  2. fetches the citizen record from MOHA          (REST  population-api)
  3. applies a (demo) Old Age Pension rule         (local logic)
Every X-Road call is shown with its full request/response trace.
"""

from __future__ import annotations

import datetime as dt
from pathlib import Path

from fastapi import FastAPI, Form, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from . import xroad

APP_DIR = Path(__file__).parent
app = FastAPI(title="MOSD Grants Portal", docs_url=None, redoc_url=None)
app.mount("/static", StaticFiles(directory=APP_DIR / "static"), name="static")
templates = Jinja2Templates(directory=APP_DIR / "templates")

PENSION_AGE = 70  # demo rule for the lab, not an official policy statement

SAMPLE_APPLICANTS = [
    ("010119550001", "Mpho", "Mokoena", "1955-01-01", "eligible"),
    ("150319480002", "Thabo", "Letsie", "1948-03-15", "eligible"),
    ("220719900003", "Lineo", "Ramakatane", "1990-07-22", "too young"),
    ("050519500004", "Teboho", "Mofokeng", "1950-05-05", "deceased"),
    ("999999999999", "Unknown", "Person", "", "not in register"),
]


def age_on(dob: str, today: dt.date) -> int:
    born = dt.date.fromisoformat(dob)
    return today.year - born.year - ((today.month, today.day) < (born.month, born.day))


def assess_pension(verify: dict | None, citizen: dict | None) -> dict:
    """Combine the two MOHA answers into a decision the officer can act on."""
    reasons: list[tuple[bool, str]] = []
    if verify is None or citizen is None:
        return {"decision": "UNABLE", "title": "Could not complete the check",
                "reasons": [(False, "One or more X-Road calls failed – see the trace below.")]}

    if not verify["found"]:
        return {"decision": "REJECT", "title": "Not in the population register",
                "reasons": [(False, "MOHA has no citizen with this national ID.")]}

    reasons.append((verify["match"], "Identity details match the register" if verify["match"]
                    else "Details do not match: " + ", ".join(verify["mismatchedFields"])))
    alive = citizen.get("vitalStatus") == "ALIVE"
    reasons.append((alive, "Recorded as alive" if alive
                    else f"Recorded as deceased ({citizen.get('dateOfDeath', 'date unknown')})"))
    citizen_ls = citizen.get("citizenship") == "LS"
    reasons.append((citizen_ls, "Mosotho citizen" if citizen_ls else "Not a Lesotho citizen"))
    age = age_on(citizen["dateOfBirth"], dt.date.today())
    old_enough = age >= PENSION_AGE
    reasons.append((old_enough, f"Age {age} (minimum {PENSION_AGE})"))

    eligible = all(ok for ok, _ in reasons)
    return {
        "decision": "ELIGIBLE" if eligible else "REJECT",
        "title": "Eligible for Old Age Pension" if eligible else "Not eligible for Old Age Pension",
        "reasons": reasons,
    }


def render(request: Request, **ctx) -> HTMLResponse:
    base = {
        "request": request,
        "samples": SAMPLE_APPLICANTS,
        "client_id": xroad.CLIENT_ID,
        "provider_id": xroad.PROVIDER_ID,
        "ss_url": xroad.SS_URL,
        "rest_service": xroad.REST_SERVICE_CODE,
        "soap_service": f"{xroad.SOAP_SERVICE_CODE}/{xroad.SOAP_SERVICE_VERSION}",
        "form": {"national_id": "", "first_name": "", "surname": "", "dob": "", "officer": "officer.ntsane"},
        "traces": [],
    }
    base.update(ctx)
    return templates.TemplateResponse(request, "index.html", base)


@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    return render(request)


@app.post("/check", response_class=HTMLResponse)
def check(
    request: Request,
    action: str = Form("pension"),
    national_id: str = Form(...),
    first_name: str = Form(""),
    surname: str = Form(""),
    dob: str = Form(""),
    officer: str = Form("officer.ntsane"),
):
    national_id = national_id.strip()
    form = {"national_id": national_id, "first_name": first_name, "surname": surname,
            "dob": dob, "officer": officer}
    traces = []
    verify = citizen = assessment = status = None

    if action in ("pension", "verify"):
        t, verify = xroad.verify_identity(national_id, first_name, surname, dob, officer)
        traces.append(t)
    if action in ("pension", "lookup"):
        t, citizen = xroad.lookup_citizen(national_id, officer)
        traces.append(t)
    if action == "status":
        t, status = xroad.vital_status(national_id, officer)
        traces.append(t)

    # A registry 404 comes back as {"error": "NOT_FOUND", ...}: a valid answer, not a record.
    record = citizen if citizen and "error" not in citizen else None
    if action == "pension":
        if verify and not verify["found"]:
            record = {}  # "not in register" is decided from the SOAP answer alone
        assessment = assess_pension(verify, record)

    return render(request, form=form, traces=traces, verify=verify,
                  citizen=record or None,
                  status=status if status and "error" not in status else None,
                  not_found=any(t.status == 404 and not t.error for t in traces),
                  assessment=assessment, action=action)


@app.get("/health")
def health():
    return {"status": "ok", "securityServer": xroad.SS_URL, "client": xroad.CLIENT_ID}
