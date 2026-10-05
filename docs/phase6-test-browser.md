# Phase 6 in the browser: test the whole chain

Lesson 6, Phase 6. Nothing is configured here; you watch requests travel
portal → ss2 → ss3 → registry and back, from four angles.

**Before you start**

- Checkpoint 5 passed (both services enabled on ss3, GRANTS-PORTAL has access).
- Wait one to two minutes after the last change in Phase 5, so ss2 has the new global configuration.

---

## Test 1: The Grants Portal (consumer view)

1. Open **http://localhost:8500**.
2. Under **Sample applicants**, click **Use** next to **Thabo Letsie**. The form fills in.
3. Press **Check pension eligibility**.

**Expect:** a green **ELIGIBLE: Eligible for Old Age Pension** with three ticks:
identity details match the register, recorded as alive, and age at least 70
(the lab's demo rule, `PENSION_AGE` in `mosd-portal/app/main.py`).

Below it are **two green trace entries**:

| Trace | Service | What it asked |
|---|---|---|
| SOAP | `verifyIdentity` v1 | "Do these name and date-of-birth details match this ID?" Answer: match / no match only |
| REST | `population-api` `GET /citizens/{id}` | The full record, for alive/deceased and age |

Expand a trace to see the exact request the portal sent to ss2 and the `X-Road-*` headers
the Security Servers added to the answer.

Now try every sample applicant:

| Applicant | Expect | Why |
|---|---|---|
| Mpho Mokoena | **ELIGIBLE** | |
| Thabo Letsie | **ELIGIBLE** | |
| Lineo Ramakatane | **REJECT** | born 1990, too young |
| Teboho Mofokeng | **REJECT** | recorded as deceased (✗ on "alive") |
| Unknown Person (999999999999) | **REJECT** | not in the population register; the registry's 404 is passed through unchanged |

## Test 2: The registry's audit page (provider view)

Open **http://localhost:8001/audit**.

Each portal check adds **two rows**, one SOAP `verifyIdentity` and one REST `getCitizen`, with:

| Column | Example | Where it comes from |
|---|---|---|
| X-Road client | `LS-DEV/GOV/MOSD/GRANTS-PORTAL` | added by **ss3** after it verified ss2's signature; the registry can trust it |
| User | `officer.ntsane` | sent by the portal (`X-Road-UserId`), for accountability |
| Message ID | `LS-DEV-…` (REST) / UUID (SOAP) | unique per message, the same ID appears in both Security Servers' message logs |
| Outcome | found / not found / match | |

**The point:** MOHA sees exactly which ministry, which system and which officer asked for which citizen.
That is the X-Road audit trail.

## Test 3: The smoke test (automated)

```bash
bash tests/smoke-test.sh
```

**Expect** `7 passed, 0 failed`:

```
PASS  REST metaservice listMethods shows population-api
PASS  REST metaservice allowedMethods (access rights granted)
PASS  REST getCitizen returns Thabo Letsie
PASS  REST getVitalStatus returns DECEASED
PASS  REST unknown citizen -> 404 from registry
PASS  SOAP verifyIdentity returns match=true
PASS  Portal cannot bypass X-Road to reach the registry
```

The last check is the important one for security: the portal container tries to reach
`http://moha-registry:8000` directly and fails, because mosd-lan and moha-lan are separate networks.
The only road is through X-Road.

## Test 4: By hand with curl (optional)

Your laptop can play the portal, because ss2's consumer port is published on `localhost:2080`:

```bash
# REST: one citizen record
curl -H "X-Road-Client: LS-DEV/GOV/MOSD/GRANTS-PORTAL" \
  http://localhost:2080/r1/LS-DEV/GOV/MOHA/POPULATION-REGISTRY/population-api/citizens/150319480002

# What may GRANTS-PORTAL call?
curl -H "X-Road-Client: LS-DEV/GOV/MOSD/GRANTS-PORTAL" \
  http://localhost:2080/r1/LS-DEV/GOV/MOHA/POPULATION-REGISTRY/allowedMethods

# SOAP
curl -H "Content-Type: text/xml; charset=utf-8" --data-binary @tests/verifyIdentity.xml http://localhost:2080/
```

Add `-i` to see the response headers, such as `X-Road-Id` and `X-Road-Request-Hash`.

## Also check: the Security Servers are fully green

Before the first message, time-stamping on ss2 and ss3 showed *waiting*. Now:
ss2 / ss3 → **Diagnostics** → Timestamping: **green / SUCCESS**. Every message is now signed,
logged and time-stamped by the TSA.

---

## Checkpoint 6

- Portal: Thabo Letsie **ELIGIBLE** with two green traces; the other four samples as in the table.
- Audit page lists the calls with client `LS-DEV/GOV/MOSD/GRANTS-PORTAL`.
- Smoke test **7 passed, 0 failed**.

**Congratulations: you have a working X-Road network.** Next: Lesson 7, *Break it to learn it*.
