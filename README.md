# X-Road local lab: MOSD ↔ MOHA identity exchange

A local X-Road 7.7.0 environment built on the NIIS Knowledge Base guide
[How to Set Up a Local Test Environment Using Docker Compose](https://nordic-institute.atlassian.net/wiki/spaces/XRDKB/pages/281739671/How+to+Set+Up+a+Local+Test+Environment+Using+Docker+Compose),
extended with two information systems (ISs):

| | Consumer IS | Provider IS |
|---|---|---|
| Organisation | Ministry of Social Development (MOSD) | Ministry of Home Affairs (MOHA) |
| System | Grants Portal (web app) | Population Registry |
| X-Road subsystem | `LS-DEV/GOV/MOSD/GRANTS-PORTAL` | `LS-DEV/GOV/MOHA/POPULATION-REGISTRY` |
| Security Server | `ss2` | `ss3` |
| Container | `mosd-portal` → http://localhost:8500 | `moha-registry` → http://localhost:8001/audit |

**Scenario:** a grants officer at MOSD processes an Old Age Pension application. The portal asks MOHA to
**verify the applicant's identity (SOAP)** and **fetch the citizen record (REST)**, then applies a demo
eligibility rule (alive, Lesotho citizen, aged 70+, details match). All citizen data is synthetic.

```
 MOSD (mosd-lan)              X-Road network (xroad-network)                MOHA (moha-lan)
┌─────────────┐   HTTP   ┌──────┐   signed, mTLS   ┌──────┐   HTTP   ┌───────────────┐
│ mosd-portal │ ───────► │ ss2  │ ═══════════════► │ ss3  │ ───────► │ moha-registry │
│ GRANTS-     │ ◄─────── │ SS2  │ ◄═══════════════ │ SS3  │ ◄─────── │ POPULATION-   │
│ PORTAL      │          └──┬───┘                  └──┬───┘          │ REGISTRY      │
└─────────────┘             │   global config, OCSP, TSA│             └───────────────┘
                     ┌──────┴──────┬──────────┬────────┴─┐
                     │ cs          │ ca       │ ss1      │
                     │ Central     │ Test CA  │ SS1 mgmt │
                     │ Server      │ OCSP/TSA │ services │
                     └─────────────┴──────────┴──────────┘
```

Each IS sits on a private network shared only with its own Security Server, so the portal **cannot**
reach the registry except through X-Road (the smoke test checks this).

---

## Contents of this folder

```
docker-compose.yml         KB stack (cs, ca, ss1–ss3) + the two ISs + three networks
moha-registry/             Provider IS (Python/FastAPI)
  app/main.py              REST + SOAP endpoints, audit page
  app/openapi.yaml         OpenAPI 3 description imported by ss3 (service code population-api)
  app/population.wsdl      WSDL imported by ss3 (service verifyIdentity v1)
  app/data.py              Synthetic population register
mosd-portal/               Consumer IS (Python/FastAPI + Jinja)
  app/xroad.py             X-Road REST and SOAP client (talks only to ss2)
  app/main.py              Pension eligibility workflow
tests/smoke-test.sh        End-to-end checks through ss2
tests/verifyIdentity.xml   Example X-Road SOAP request
scripts/install-docker.sh  Docker Engine + Compose v2 on Ubuntu 26.04 (official Docker repo)
scripts/preflight.sh       Checks RAM, disk, clock, Docker, ports and host names before you start
scripts/setup-hosts.sh     Adds cs.lab / ss1.lab / ss2.lab / ss3.lab to /etc/hosts
scripts/fetch-ca-certs.sh  Copies the test CA, OCSP and TSA certificates into certs/
certs/                     The CA, OCSP and TSA certificates land here (Phase 1; not committed)
docs/                      Guides: Browser Guide (two editions), Build Report, REST and SOAP Services,
                           per-phase browser walkthroughs, Jira report pack
docs/report-src/           Sources that generate the Word documents (node build*.js) and diagrams
reports/                   Dated build reports with screenshots
```

## Progress

| Date | Milestone | Evidence |
|---|---|---|
| 2026-10-02 | First build of the full lab (6 phases); README corrected for 7.7.0 | `docs/XRoad-Lab-Build-Report.docx` |
| 2026-10-02 to 10-04 | Guides written: Browser Guide (beginner edition), REST and SOAP Services | `docs/` |
| 2026-10-04 | Lab reset and **rebuilt**, documented step by step in the admin UIs | [`reports/2026-10-04-rebuild/`](reports/2026-10-04-rebuild/README.md) (17 screenshots) |
| 2026-10-05 | Smoke test on the rebuilt lab: **7 passed, 0 failed** | `bash tests/smoke-test.sh` |
| Next | Break-it experiments (Browser Guide, section 12) | |

## Values used throughout

| Item | Value |
|---|---|
| Instance identifier | `LS-DEV` |
| Member class | `GOV` (Government ministries and agencies) |
| X-Road operator (owns cs + ss1) | **MCST**, Ministry of Communications, Science and Technology |
| Management services subsystem | `LS-DEV/GOV/MCST/MANAGEMENT` |
| Central Server UI | https://cs.lab:4000 |
| ss1 | owner `GOV/MCST`, server code `SS1`, address `ss1`, UI https://ss1.lab:1000 |
| ss2 | owner `GOV/MOSD`, server code `SS2`, address `ss2`, UI https://ss2.lab:2000 |
| ss3 | owner `GOV/MOHA`, server code `SS3`, address `ss3`, UI https://ss3.lab:3000 |
| Admin login (cs, ss1–ss3) | `xrd` / `secret` |
| Token PIN (everywhere) | `123456xrd!` |
| Certificate profile | `ee.ria.xroad.common.certificateprofile.impl.FiVRKCertificateProfileInfoProvider` |
| OCSP / TSA URLs | `http://ca:8888` / `http://ca:8899` |
| Test CA signing page | http://localhost:8888/testca/ |
| REST service | code `population-api`, description `http://moha-registry:8000/openapi.yaml` |
| SOAP service | `verifyIdentity` v1, WSDL `http://moha-registry:8000/soap/population.wsdl` |

**Use the same PIN everywhere.** The Security Server containers log in to their token automatically
with `XROAD_TOKEN_PIN`, so the PIN you choose during initialisation must be `123456xrd!`.

## Time budget

| Phase | First time | Repeat |
|---|---|---|
| 0. Start the stack | 15–30 min (image pulls) | 5 min |
| 1. Central Server | 45 min | 20 min |
| 2. ss1 management Security Server | 45 min | 20 min |
| 3. ss2 and ss3 | 40–60 min | 25 min |
| 4–5. Subsystems, services, access rights | 30–45 min | 15 min |
| 6. Test | 15 min | 5 min |
| **Total** | **≈ 3–4 h** | **≈ 1.5 h** |

Everything is stored in named volumes, so `docker compose down` / `up` keeps your configuration.
`docker compose down -v` wipes it and you start again from Phase 1.

---

## Phase 0: Prepare Ubuntu 26.04 and start the stack

The lab targets **Ubuntu 26.04 LTS on a dual-boot laptop**, such as an HP with an Intel Core i5 Raptor Lake
CPU. It hasn't been run on that hardware yet. Everything runs in Docker on the Ubuntu side; Windows is not involved.

**What the laptop needs**

| Resource | Minimum | Comfortable | Why |
|---|---|---|---|
| RAM | 8 GB + 8 GB swap | 16 GB | The five X-Road containers need roughly 6 GB together (estimate) |
| Free disk on the Ubuntu partition | 15 GB | 25 GB | Images and databases, roughly 10–15 GB (estimate) |
| CPU | 4 threads | any Raptor Lake i5 | First start of each server is CPU-heavy for a few minutes |
| Network | Internet for the first `up` | — | Images download from Docker Hub and GitHub Container Registry |

**0.1 Install Docker** (once). Use Docker's own repository, not the `docker.io` snap or apt package:

```bash
cd ~/xroad-ls-lab
bash scripts/install-docker.sh      # asks for your sudo password
# log out and back in so the docker group applies
```

**0.2 Give each admin UI its own host name** (once). Browsers keep cookies per host name and ignore
the port, so four UIs on `localhost` keep logging each other out. Separate host names should let one
browser keep all four logins:

```bash
bash scripts/setup-hosts.sh         # adds: 127.0.0.1 cs.lab ss1.lab ss2.lab ss3.lab ca.lab
```

Then use https://cs.lab:4000, https://ss1.lab:1000, https://ss2.lab:2000 and https://ss3.lab:3000.
If logouts still happen, fall back to separate Firefox profiles (`firefox -P`) or Firefox + Chromium.

**0.3 Check the clock.** X-Road rejects certificates, OCSP answers and time-stamps when the clock is
wrong. Windows stores the hardware clock in local time and Ubuntu expects UTC, so after booting from
Windows, Ubuntu can start **2 hours off** until it syncs with the internet. Before each session:

```bash
timedatectl status                  # want: System clock synchronized: yes
```

If you switch between Windows and Ubuntu often, make Ubuntu read the hardware clock as local time
(`sudo timedatectl set-local-rtc 1 --adjust-system-clock`). The pre-flight check reports both.

**0.4 Pre-flight check**, then start:

```bash
bash scripts/preflight.sh           # fix every FAIL; WARNs are advice
docker compose up -d --build
docker compose ps                   # all 7 containers should be Up
docker compose logs -f cs           # wait until the Central Server has finished starting (3–5 min)
```

All ports are bound to `127.0.0.1`, so nothing is reachable from your Wi-Fi network. This matters
because Docker publishes ports past Ubuntu's `ufw` firewall, and every admin UI uses the default
`xrd` / `secret` login. All admin UIs use self-signed certificates; accept the browser warning once
per host name.

**Pausing and resuming.** `docker compose stop` frees the RAM when you're done for the day;
`docker compose start` brings everything back with its configuration. Shutting down or rebooting
into Windows is safe. If you reboot without stopping, only the two IS containers come back on their own;
the X-Road containers wait for `docker compose start`.

## Phase 1: Central Server (https://cs.lab:4000)

Follow KB article *How to Configure Central Server (version >= 7.3.0)*, section 1, with these values.

**1.1 Initialise.** Instance identifier `LS-DEV`, Central Server address `cs`, PIN `123456xrd!`.

**1.2 Member class.** Settings → System Settings → Member Classes → Add: code `GOV`, description
`Government ministries and agencies`.

**1.3 Certification service.** Copy the test CA certificates out of the `ca` container:

```bash
bash scripts/fetch-ca-certs.sh      # writes certs/ca.pem, certs/ocsp.pem, certs/tsa.pem
```

Trust Services → Add certification service → upload `certs/ca.pem` → Certificate profile info:
`ee.ria.xroad.common.certificateprofile.impl.FiVRKCertificateProfileInfoProvider` → Save.
Open the new service → OCSP Responders → Add → URL `http://ca:8888`, certificate `certs/ocsp.pem`.

**1.4 Time-stamping service.** Trust Services → Timestamping Services → Add → URL `http://ca:8899`,
certificate `certs/tsa.pem`.

**1.5 Members and subsystems.** Add all three organisations now, so the Security Servers can find them
in global configuration later. Members → Add member:

| Member name | Class | Code | Then add subsystem |
|---|---|---|---|
| Ministry of Communications, Science and Technology | GOV | `MCST` | `MANAGEMENT` |
| Ministry of Social Development | GOV | `MOSD` | `GRANTS-PORTAL` |
| Ministry of Home Affairs | GOV | `MOHA` | `POPULATION-REGISTRY` |

(Open each member → Subsystems → Add new subsystem.)

**1.6 Management services provider.** Settings → System Settings → Management Services →
Service Provider Identifier → Edit → select `MCST : MANAGEMENT`.

**1.7 Signing keys.** Global Configuration → Internal Configuration → Signing keys → Log in (PIN) →
Add key. Then External Configuration → Signing keys → Add key.

**1.8 Download the anchor.** Global Configuration → Internal Configuration → Anchor → Download.
Keep this file; you upload it to all three Security Servers.

## Phase 2: ss1, the management Security Server (https://ss1.lab:1000)

Follow the same KB article, section 3 (steps 3.1–3.8). ss1 must be finished first, because ss2 and
ss3 send their registration requests through the management services that ss1 hosts.

**3.1 Initialise.** Upload the anchor → confirm → Owner member: class `GOV`, code `MCST`
(the name fills in) → Security Server code `SS1` → PIN `123456xrd!`.

**3.2 Token.** If you see "Please enter softtoken PIN": Keys and Certificates → SOFTTOKEN-0 → Log in.

**3.3 Time-stamping.** Settings → System Parameters → Timestamping Services → Add → select the test TSA.

**3.4 Certificate requests.** Keys and Certificates → SOFTTOKEN-0 → Add key, twice:

| | Key 1 | Key 2 |
|---|---|---|
| Usage | SIGNING | AUTHENTICATION |
| Client | `GOV:MCST` | (none) |
| Certification service | the test CA | the test CA |
| CSR format | **DER** | **DER** |
| Organization (O) | `Ministry of Communications Science and Technology` | same |
| Server DNS name (CN) | (pre-filled with member code) | `ss1` |
| Subject Alternative Name | `ss1` | `ss1` |

**No comma in O.** X-Road writes the certificate subject as `C=FI, O=..., CN=...`, so a comma inside the
name splits the field and key generation fails with `Signer.InternalError` ("badly formatted directory
string" in `docker compose logs ss1`). The member name on the Central Server may keep its comma.
**Subject Alternative Name** is required on both CSRs in 7.7.0; use the server's name.

Leave read-only fields as they are. With the FiVRK test profile, `C` is fixed to `FI` and `serialNumber`
becomes `LS-DEV/SS1/GOV`. That is expected for this lab.

Sign each CSR at http://localhost:8888/testca/: choose the file, select **Sign** or **Auth** to match,
then press Sign. The browser downloads the certificate.

**3.5 Import.** Import cert → the auth certificate → open it → **Activate**. Then import the sign certificate.

**3.6 Register.** On the auth certificate press Register → address `ss1`. On the Central Server go to
Management Requests → Approve. Wait until the ss1 owner shows **REGISTERED** (1–2 min).

> Shortcut for repeat runs: auto-approve requests by adding this to `/etc/xroad/conf.d/local.ini`
> inside `cs`, then `docker compose restart cs`:
> ```ini
> [center]
> auto-approve-auth-cert-reg-requests=true
> auto-approve-client-reg-requests=true
> auto-approve-owner-change-requests=true
> ```
> Leave this off the first time, because approving each request yourself shows how the trust model works.

**3.7 MANAGEMENT subsystem.** Clients → Add subsystem → Select subsystem → `MCST / MANAGEMENT` → Add →
register = Yes. The first attempt fails, which is expected. On the Central Server: Settings → System Settings →
Management Services → Management Services' Security Server → Edit → select `SS1`. Back on ss1, wait for
MANAGEMENT → **REGISTERED**.

**3.8 Management services.** On the Central Server, Settings → System Settings → Management Services
shows a *WSDL address* (`http://cs/managementservices.wsdl`) and a *Services address*
(`https://cs:4002/managementservice/manage/`). Then on ss1, Clients → MANAGEMENT:

1. **Services → Add WSDL** → paste the WSDL address → Add. Enable the service description.
2. **Service address.** The services arrive pointing at `http://INSERT_MANAGEMENT_SERVICE_ADDRESS_HERE`.
   Expand the WSDL → click any service → Service URL `https://cs:4002/managementservice/manage/` →
   tick **Apply to all in WSDL** (for URL, timeout and TLS verification) → Save.
3. **Trust the Central Server's TLS certificate.** On the Central Server, Settings → **TLS Certificates** →
   Management Service TLS certificate → **Download certificate**. The file is a `.tar.gz`; extract `management-service.pem`.
   On ss1: MANAGEMENT → **Internal Servers** → Information System TLS certificate → Add → upload it.
4. **Access rights.** MANAGEMENT → **Service Clients** → Add subject → global group
   **security-server-owners** → select all services → Add.

Skip steps 2–4 and ss2/ss3 cannot register in Phase 3 (`UnknownMember`, `AccessDenied` or
`SslAuthenticationFailed` when they press Register).

## Phase 3: ss2 (MOSD) and ss3 (MOHA)

Repeat KB steps 3.1–3.6 on each server with these values:

| Step | ss2 (https://ss2.lab:2000) | ss3 (https://ss3.lab:3000) |
|---|---|---|
| Owner member | `GOV` / `MOSD` | `GOV` / `MOHA` |
| Security Server code | `SS2` | `SS3` |
| PIN | `123456xrd!` | `123456xrd!` |
| SIGN CSR: client / O | `GOV:MOSD` / `Ministry of Social Development` | `GOV:MOHA` / `Ministry of Home Affairs` |
| AUTH CSR: CN / O | `ss2` / `Ministry of Social Development` | `ss3` / `Ministry of Home Affairs` |
| Subject Alternative Name (both CSRs) | `ss2` | `ss3` |
| Register auth cert, address | `ss2` | `ss3` |

Approve both requests on the Central Server and wait for both owners to show **REGISTERED**.

## Phase 4: Register the IS subsystems

**ss3:** Clients → Add subsystem → Select subsystem → `MOHA / POPULATION-REGISTRY` → Add → register = Yes.
**ss2:** Clients → Add subsystem → `MOSD / GRANTS-PORTAL` → Add → register = Yes.

Approve both client registration requests on the Central Server. Wait for **REGISTERED** on each server.

Then on **ss2**: Clients → GRANTS-PORTAL → Internal Servers → Connection type → **HTTP**.
The portal calls `http://ss2:8080`, so if the connection type is HTTPS or HTTPS NO AUTH, requests fail with
`SslAuthenticationFailed`.

## Phase 5: Publish the MOHA services on ss3

Clients → POPULATION-REGISTRY → Services:

1. **Add REST** → type **OpenAPI 3 Description** → URL `http://moha-registry:8000/openapi.yaml` →
   service code `population-api` → Add. ss3 reads the service URL `http://moha-registry:8000/api` and
   two endpoints from the spec: `GET /citizens/{nationalId}` and `GET /citizens/{nationalId}/vital-status`.
2. **Add WSDL** → `http://moha-registry:8000/soap/population.wsdl` → Add. The service
   `verifyIdentity.v1` appears, pointing at `http://moha-registry:8000/soap`.
3. **Enable** both service descriptions (toggle on each row).
4. **Access rights.** For `population-api` and for `verifyIdentity`: open the service → Service clients /
   Access rights → Add subjects → search `GRANTS-PORTAL` → select `LS-DEV:GOV:MOSD:GRANTS-PORTAL` → Add.

The registry and the portal are only reachable by name from inside Docker, so these URLs only work
from ss3. That is intended.

## Phase 6: Test

Wait 1–2 minutes so ss2 picks up the new global configuration, then:

1. **Portal:** http://localhost:8500 → *Sample applicants* → **Use** next to Thabo Letsie →
   **Check pension eligibility**. You should see **ELIGIBLE** and two green trace entries (SOAP and REST).
   Expand a trace to see the exact X-Road request and the `X-Road-*` headers the Security Servers added.
2. **Provider view:** http://localhost:8001/audit shows each call with the verified X-Road client
   `LS-DEV/GOV/MOSD/GRANTS-PORTAL`, the officer's user ID, and the message ID.
3. **Automated:** `bash tests/smoke-test.sh` (7 checks, including the "no bypass" network check).

By hand, from your host through ss2:

```bash
# REST
curl -H "X-Road-Client: LS-DEV/GOV/MOSD/GRANTS-PORTAL" \
  http://localhost:2080/r1/LS-DEV/GOV/MOHA/POPULATION-REGISTRY/population-api/citizens/150319480002

# What may I call?
curl -H "X-Road-Client: LS-DEV/GOV/MOSD/GRANTS-PORTAL" \
  http://localhost:2080/r1/LS-DEV/GOV/MOHA/POPULATION-REGISTRY/allowedMethods

# SOAP
curl -H "Content-Type: text/xml; charset=utf-8" --data-binary @tests/verifyIdentity.xml http://localhost:2080/
```

Expected portal results for the sample applicants:

| National ID | Applicant | Result |
|---|---|---|
| 010119550001 | Mpho Mokoena | ELIGIBLE |
| 150319480002 | Thabo Letsie | ELIGIBLE |
| 220719900003 | Lineo Ramakatane | REJECT, too young |
| 050519500004 | Teboho Mofokeng | REJECT, deceased |
| 999999999999 | (none) | REJECT, not in register |

## Experiments: see X-Road's controls at work

| Do this | What you will see in the portal trace |
|---|---|
| ss3: remove GRANTS-PORTAL from `population-api` access rights | `Server.ServerProxy.AccessDenied` on REST; SOAP still works |
| ss3: grant access to the `vital-status` **endpoint** only | "Vital status only" works, "Look up record" is denied: minimal disclosure |
| ss3: disable the WSDL service description | `ServiceDisabled` on SOAP |
| `docker compose stop moha-registry` | `Server.ServerProxy.ServiceFailed` / network error from ss3 |
| ss2: set GRANTS-PORTAL connection type back to HTTPS | `SslAuthenticationFailed` |
| Enter a wrong surname | SOAP returns `match=false, mismatchedFields=surname`, and the decision is REJECT |

Each failure shows a **Fix:** hint under the trace.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Admin UI keeps logging out | Several UIs on the same host name. Use the `.lab` names from Phase 0.2, or separate Firefox profiles. |
| `certificate is not yet valid`, OCSP or time-stamp errors | Clock is off, usually right after booting from Windows. Check `timedatectl status`; see Phase 0.3. |
| `permission denied ... docker.sock` | You haven't logged out and in since `install-docker.sh`. |
| `address already in use` on `up` | Run `bash scripts/preflight.sh` to see which port, and stop what holds it. |
| Laptop freezes or containers restart | Out of memory. Close other apps, add swap (pre-flight prints the command), and `docker compose stop` after each session. |
| `no space left on device` | Ubuntu partition full. `docker system prune` removes unused images; `sudo apt clean`. |
| ss2/ss3 owner name doesn't fill in during init | Member not added on cs yet, or global configuration not refreshed. Wait 1–2 min. |
| Test CA returns an error when signing | CSR was PEM. Regenerate as **DER**. |
| `Signer.InternalError` when adding a key / CSR | A comma in the Organization (O) field. Remove it (Phase 2, 3.4). |
| Auth cert stuck "registration in progress" | Request not approved on cs, or ss1 management services not working (finish Phase 2 first). |
| `UnknownService` / `UnknownMember` right after setup | Global configuration not propagated yet. Wait 1–2 min. |
| `Could not reach consumer Security Server` in the portal | ss2 not initialised or not running. Run `docker compose ps`. |
| ss3 cannot import the OpenAPI/WSDL | `moha-registry` not running. Run `docker compose logs moha-registry`. |

Useful commands: `docker compose logs -f ss2`, `docker compose restart moha-registry`,
`docker compose exec ss3 bash`.

---

*Based on the NIIS X-Road Knowledge Base (Docker Compose test environment; Central Server configuration
for ≥ 7.3.0; test CA documentation in the X-Road repository). All citizen data is synthetic and the
pension rule is a demo rule, not official policy.*
