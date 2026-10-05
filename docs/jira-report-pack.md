# Jira report pack: X-Road LS-DEV lab

Everything you need to update the lab coordinators in Jira:

1. **Screenshot shot list**: what to capture, where, and what each one proves.
2. **Ticket text** for each epic (LAB-E0 to LAB-E7): ready to paste, with the screenshots to attach.
3. **Overall summary comment** for the parent ticket.
4. **Questions coordinators may ask**, with answers.

Fill in anything in `<angle brackets>`.

---

## Before you start: be transparent about how it was built

Coordinators assess *your* understanding, so state plainly how the work was done. The build was carried
out with an AI assistant (Claude) through the X-Road admin REST API. You reviewed each phase, and the
browser walkthroughs document every step. Suggested wording for the summary comment:

> The configuration was first carried out with AI assistance (Claude Code) through the X-Road admin REST API,
> phase by phase, with me reviewing each step and its checkpoint. I then documented and walked through the
> browser route for every step (docs/XRoad-Lab-Browser-Guide.docx) and verified the result in the admin UIs;
> the screenshots attached are from my own walkthrough.

Only write the last sentence if it is true. If you have time, redo a phase yourself in the browser
(for example, reset only the Central Server or add a fourth subsystem) and say so. That is strong evidence.

---

## 1. Screenshot shot list

**How to take them on Ubuntu:** press **Print Screen**, choose **Selection** or **Window**, then click the
capture button. Files are saved in `~/Pictures/Screenshots`. Rename each file with its code, e.g.
`S07-cs-members.png`.

**Make them convincing:**
- **Keep the address bar visible** (e.g. `https://ss3.lab:3000`) so it is obvious which server is shown.
- **Zoom the browser to 80–90 %** (Ctrl and −) so whole tables fit.
- **Wait for a status before capturing**: REGISTERED, not "in progress".
- **No secrets are shown on any of these screens.** The lab login xrd/secret is a known default. Do not
  screenshot a freshly created API key.

### Terminal (3)

| # | Command / where | Make sure the shot shows | Proves | Ticket |
|---|---|---|---|---|
| S01 | `bash scripts/preflight.sh` | the final line `0 failed` | Laptop meets the requirements | LAB-E1 |
| S02 | `docker compose ps` | all 7 containers `Up` | Environment running | LAB-E1 |
| S03 | `bash tests/smoke-test.sh` | 7 × `PASS` and `7 passed, 0 failed` | End-to-end exchange works, including network isolation | LAB-E6 |

### Central Server, https://cs.lab:4000 (7)

| # | Click path | Make sure the shot shows | Proves | Ticket |
|---|---|---|---|---|
| S04 | **Settings → System Settings** | Instance Identifier `LS-DEV`, Central Server Address `cs`, Member Classes `GOV`, Management Services: provider `MCST:MANAGEMENT` and Security Server `SS1` | Instance and governance set up | LAB-E2, E3 |
| S05 | **Trust Services** | Test CA in Certification Services; Timestamping Services `http://ca:8899` | Trust services configured | LAB-E2 |
| S06 | **Trust Services → Test CA → OCSP Responders** | `http://ca:8888` | Certificate status checking | LAB-E2 |
| S07 | **Members** | MCST, MOSD, MOHA with full names, class GOV | Members registered | LAB-E2 |
| S08 | **Global Configuration → Internal Configuration** | Anchor hash and Created time, Signing Keys, **no red banners** | Configuration is signed and published | LAB-E2 |
| S09 | **Security Servers** | SS1, SS2, SS3 with owners | All three servers joined | LAB-E3, E4 |
| S10 | **Management Requests** (untick "Show only pending") | the approved requests: 3 auth-cert registrations, client registrations | You approved each join: the trust model in action | LAB-E3, E4, E5 |

### ss1, https://ss1.lab:1000 (4)

| # | Click path | Make sure the shot shows | Proves | Ticket |
|---|---|---|---|---|
| S11 | **Clients** | `MCST` and `MCST:MANAGEMENT` REGISTERED | Management Security Server works | LAB-E3 |
| S12 | **Keys and certificates** | ss1-auth and ss1-sign: Registered, OCSP **Good** | Certificates issued and valid | LAB-E3 |
| S13 | **Clients → MANAGEMENT → Services** (expand WSDL) | 10 services, URL `https://cs:4002/managementservice/manage/`, enabled | **Fix you found**: the placeholder address replaced | LAB-E3 |
| S14 | **Clients → MANAGEMENT → Service clients** | `security-server-owners` | Fix: access rights for management services | LAB-E3 |

### ss2, https://ss2.lab:2000 (2)

| # | Click path | Make sure the shot shows | Proves | Ticket |
|---|---|---|---|---|
| S15 | **Clients** | `MOSD` and `MOSD:GRANTS-PORTAL` REGISTERED | Consumer side ready | LAB-E4, E5 |
| S16 | **Clients → GRANTS-PORTAL → Internal servers** | Connection type **HTTP** | IS ↔ Security Server connection understood | LAB-E5 |

### ss3, https://ss3.lab:3000 (4)

| # | Click path | Make sure the shot shows | Proves | Ticket |
|---|---|---|---|---|
| S17 | **Clients** | `MOHA` and `MOHA:POPULATION-REGISTRY` REGISTERED | Provider side ready | LAB-E4, E5 |
| S18 | **Clients → POPULATION-REGISTRY → Services** (expand both) | REST `population-api` with 2 endpoints, WSDL `verifyIdentity.v1`, both enabled | Services published | LAB-E5 |
| S19 | **Clients → POPULATION-REGISTRY → Service clients → GRANTS-PORTAL** | access rights to `population-api` and `verifyIdentity` | Provider-controlled access | LAB-E5 |
| S20 | **Diagnostics** | Global configuration, Timestamping, OCSP all "Everything ok" | Healthy server; messages are time-stamped | LAB-E6 |

### Applications (4)

| # | Where | Make sure the shot shows | Proves | Ticket |
|---|---|---|---|---|
| S21 | http://localhost:8500, **Use** Thabo Letsie → **Check pension eligibility** | ELIGIBLE and two green traces | The business scenario works | LAB-E6 |
| S22 | Same page, expand the REST trace | the request with `X-Road-Client`, and **Response headers added by X-Road** (`X-Road-Id`, `X-Road-Request-Hash`) | You understand what X-Road adds | LAB-E6 |
| S23 | Same portal, **Use** Teboho Mofokeng → Check | REJECT: deceased | Business rules use the registry data correctly | LAB-E6 |
| S24 | http://localhost:8001/audit | rows with X-Road client `LS-DEV/GOV/MOSD/GRANTS-PORTAL`, user `officer.ntsane` | Provider-side audit trail | LAB-E6 |

### Break-it experiments (3 to 4), the strongest evidence of understanding

Take each screenshot **while broken**, then undo the change and confirm the portal works again.
The steps are in the Browser Guide, Part C.

| # | Change | Make sure the shot shows | Ticket |
|---|---|---|---|
| S25 | ss3: remove GRANTS-PORTAL's access to `population-api` | red REST trace, **AccessDenied** and the Fix hint; SOAP still green | LAB-E6 |
| S26 | ss3: grant only the `vital-status` endpoint | **Vital status only** works, **Look up record** denied | LAB-E6 |
| S27 | ss3: disable the WSDL with notice "Maintenance" | **ServiceDisabled** with your notice | LAB-E6 |
| S28 | Portal: surname `Letsi` | SOAP `match=false`, REJECT | LAB-E6 |

**What you can no longer capture:** the first-login wizards (Central Server **Initial Configuration**,
Security Server **Initial configuration**). They appear only once and the servers are already initialised.
Screenshots S04 and S11 show their results. If a coordinator wants the wizard itself, you can reset the
Central Server and redo Phase 1 (see the Build Report).

---

## 2. Ticket text

Paste each block as a comment on its epic and attach the listed screenshots.
Jira Cloud's editor turns this markdown into headings, lists and tables when you paste it.

### LAB-E0: Lessons 1 to 5 read; Check-yourself questions answered

**Status:** Done

**Objective:** Understand X-Road's architecture and the lab environment before building.

**What I learned:**
- X-Road has **no central database**. Each ministry keeps its own data. X-Road only carries signed,
  encrypted, access-checked and logged requests between their Security Servers.
- **Components:** Central Server (members and signed global configuration), Security Servers (one gateway
  per organisation), management Security Server (carries registration requests), CA with OCSP
  (certificates and their validity), TSA (trusted time on the message logs).
- **Naming:** `LS-DEV / GOV / MOHA / POPULATION-REGISTRY / population-api` = instance / member class /
  member / subsystem / service. Access rights are given to **subsystems**, not whole ministries.
- **Docker:** 7 containers, 12 volumes and 3 networks. The ministries are on separate networks, so the portal
  can only reach the registry through X-Road.

**Check-yourself answers:** <paste or summarise your answers to Q1 to Q11>

### LAB-E1: Docker installed, preflight passes, 7 containers Up

**Status:** Done · **Attach:** S01, S02

**What was done:**
- Ubuntu 26.04 laptop checked with `preflight.sh`: 12 CPU threads, 15 GB RAM, 67 GB free, clock synchronised.
  Result: 0 failed.
- Lab host names added (`setup-hosts.sh`), so each admin UI keeps its own login.
- `docker compose up -d --build` started cs, ca, ss1, ss2, ss3, mosd-portal and moha-registry.

**Understanding shown:**
- **Ports bound to 127.0.0.1:** Docker opens published ports past the ufw firewall, and every admin UI uses
  the default xrd/secret login. Binding to 127.0.0.1 keeps them off the Wi-Fi.
- **Clock checked:** certificates, OCSP responses and time-stamps all depend on correct time.

**Observation:** Ubuntu's own Docker packages are installed alongside Docker's official ones. This had no
effect so far; I will remove the Ubuntu packages if Docker misbehaves.

### LAB-E2: Central Server configured, anchor downloaded

**Status:** Done · **Attach:** S04, S05, S06, S07, S08

**What was done:**
- Initialised instance `LS-DEV`, Central Server address `cs`.
- Added member class `GOV`.
- Trusted the test CA (FiVRK certificate profile) with OCSP `http://ca:8888`, and the TSA `http://ca:8899`.
- Added members MCST, MOSD and MOHA with subsystems MANAGEMENT, GRANTS-PORTAL and POPULATION-REGISTRY.
- Set MCST:MANAGEMENT as the management services provider.
- Created the internal and external configuration signing keys and downloaded the anchor.

**Understanding shown:**
- The Central Server holds no business data. It publishes a **signed global configuration**: who the members
  are, where their servers are, which CAs to trust. Every Security Server downloads it about once a minute.
- The **anchor** contains the configuration's download address and the public key that verifies its signature.
  Uploading it is how a Security Server decides which network to trust.
- The certificate profile tells X-Road how to read a member's identity out of certificates issued by that CA.

### LAB-E3: ss1 and MANAGEMENT REGISTERED

**Status:** Done · **Attach:** S10, S11, S12, S13, S14

**What was done:**
- Initialised ss1 (owner GOV/MCST, code SS1).
- Created a SIGN key and an AUTH key, with DER CSRs signed by the test CA.
- Imported both certificates and activated the AUTH certificate.
- Registered ss1 and approved the request on the Central Server.
- Registered the MANAGEMENT subsystem from the Central Server side and published the management services.

**Understanding shown:**
- **Two certificates:** the SIGN certificate proves the *organisation* and signs messages; the AUTH certificate
  proves the *server* in mutual TLS between Security Servers.
- **Approval:** the operator confirms on the Central Server that a server belongs to the organisation before
  it joins. This is X-Road's trust model.
- **The first MANAGEMENT registration fails (UnknownMember … clientReg).** This is expected: MANAGEMENT
  provides the registration service, so it cannot register itself. It is registered from the Central Server.

**Problems found in the lab README and fixed** (the README has been corrected):
1. A comma in the organisation name (`Ministry of Communications, Science and Technology`) breaks CSR
   generation (Signer.InternalError), because commas separate the fields of a certificate subject.
   Fix: omit the comma in the O field.
2. X-Road 7.7.0 requires a Subject Alternative Name on both CSRs.
3. After the management services WSDL is added, every service points at the placeholder
   `INSERT_MANAGEMENT_SERVICE_ADDRESS_HERE`. Fix:
   - set the service address to `https://cs:4002/managementservice/manage/`;
   - trust the Central Server's TLS certificate;
   - give `security-server-owners` access.

   Without this fix, ss2 and ss3 could not have registered.

### LAB-E4: ss2 and ss3 owners REGISTERED

**Status:** Done · **Attach:** S09, S10, S15, S17

**What was done:** Repeated the ss1 steps for ss2 (GOV/MOSD, SS2) and ss3 (GOV/MOHA, SS3). Both
registration requests were approved, and both owners were REGISTERED about 90 seconds later.

**Understanding shown:** Unlike ss1, these requests travelled **ss2 → ss1 (management services) → Central
Server**. This was the first real X-Road message on the network, and it is why ss1 had to be finished
first. Registration takes effect only when the next global configuration is published.

### LAB-E5: Services published, access granted

**Status:** Done · **Attach:** S16, S18, S19

**What was done:**
- Registered POPULATION-REGISTRY on ss3 and GRANTS-PORTAL on ss2, approved on the Central Server.
- Set GRANTS-PORTAL's connection type to HTTP.
- On ss3, published REST `population-api` (OpenAPI 3: `GET /citizens/*`, `GET /citizens/*/vital-status`)
  and SOAP `verifyIdentity` v1, enabled both, and granted access to GRANTS-PORTAL only.

**Understanding shown:**
- **The provider controls access.** MOHA decides on its own Security Server who may call its data; MOSD
  cannot grant itself access. Access can be given per service or per endpoint (minimal disclosure).
- **Connection type** controls how an information system talks to its own Security Server. The portal uses
  plain HTTP in the lab; production would use HTTPS with client certificates.
- **Service descriptions** (OpenAPI/WSDL) tell ss3 where the real service is (`http://moha-registry:8000/...`).
  That address exists only on MOHA's internal network.

### LAB-E6: Smoke test 7/7, experiments done

**Status:** <Done / In progress> · **Attach:** S03, S20 to S24, S25 to S28

**Results:**
- Smoke test: **7 passed, 0 failed**, including "portal cannot bypass X-Road".
- Portal decisions correct for all 5 sample applicants:

| Applicant | Decision |
|---|---|
| Mpho Mokoena | ELIGIBLE |
| Thabo Letsie | ELIGIBLE |
| Lineo Ramakatane | REJECT, too young |
| Teboho Mofokeng | REJECT, deceased |
| 999999999999 | REJECT, not in register |

- MOHA's audit page shows each call with the verified caller `LS-DEV/GOV/MOSD/GRANTS-PORTAL` and the
  officer ID. Time-stamping is OK on both Security Servers.

**Understanding shown (one request, hop by hop):**
1. The portal sends plain HTTP to ss2, naming itself in the `X-Road-Client` header.
2. ss2 checks that the client is registered there and signs the request with MOSD's key.
3. ss2 finds ss3 in the global configuration and opens a mutual TLS connection to it.
4. ss3 verifies the signature and certificates (OCSP), checks the access right, and forwards the request to
   the registry with the verified caller.
5. The response is signed and returned the same way.
6. Both Security Servers log the messages with a trusted time-stamp.

**Experiments:** <for each one you did: what you changed, the error you saw, what it shows, how you undid it>

| Experiment | Error | What it shows |
|---|---|---|
| Access removed | AccessDenied | Access is per service, set by the provider |
| Endpoint-only access | full record denied | Minimal disclosure |
| WSDL disabled | ServiceDisabled | Service taken offline without deleting it |
| Wrong surname | match=false | Verification without disclosure |

### LAB-E7: Progress pushed to GitHub, learning notes written

**Status:** <In progress>

**Done so far:**
- Corrected `README.md` (the three fixes above).
- Wrote browser walkthroughs per phase (`docs/phase*-browser.md`).
- Wrote `docs/XRoad-Lab-Build-Report.docx`: every command, with diagrams.
- Wrote `docs/XRoad-Lab-Browser-Guide.docx`: the click-by-click route, troubleshooting and a checklist.

**Remaining:**
- Push to GitHub: <repo link>. The lab folder is not yet a git repository.
- Revoke the API keys created during the build: Settings → API Keys on each server.

---

## 3. Summary comment for the parent ticket

> **X-Road LS-DEV lab: status update (<date>)**
>
> **Objective.** Build a working X-Road 7.7.0 network on one laptop to prepare for the Lesotho X-Road
> pilot. The test scenario: MOSD's Grants Portal checks Old Age Pension applicants against MOHA's
> Population Registry, with neither ministry exposing its system directly.
>
> **Result.** All six build phases are complete (LAB-E1 to LAB-E5). The network has:
> - a Central Server (instance LS-DEV) and a test CA with OCSP and TSA;
> - three registered Security Servers: SS1 (MCST, operator/management), SS2 (MOSD), SS3 (MOHA);
> - two registered subsystems (GRANTS-PORTAL, POPULATION-REGISTRY);
> - a REST and a SOAP service, published by MOHA and accessible only to GRANTS-PORTAL.
>
> The end-to-end test passes (smoke test 7/7). Portal decisions are correct for all sample applicants, and
> MOHA's audit log records the verified caller for every request.
>
> **Key learning.**
> - X-Road federates trust, not data. Each ministry keeps its own data.
> - The Central Server publishes signed configuration that every Security Server verifies through its anchor.
> - Organisations and servers prove their identity with separate SIGN and AUTH certificates.
> - Joining the network needs the operator's approval.
> - The data owner (provider) decides access, down to a single endpoint.
>
> **Issues found and fixed.** Three steps in the lab README failed or were incomplete on 7.7.0:
> - a comma in a certificate O field;
> - the Subject Alternative Name now required on CSRs;
> - the management services' placeholder address, TLS trust and access rights.
>
> All three are corrected in the README and documented.
>
> **How it was done.** <your transparency statement from the top of this file>
>
> **Documentation.** Build report (commands and API), Browser guide (click-by-click), and per-phase
> walkthroughs in `docs/`.
>
> **Next.** Finish the break-it experiments (LAB-E6), push to GitHub, and write learning notes (LAB-E7).
> Then compare the lab with a production set-up: package install, a real CA, HTTPS between information
> systems and Security Servers, HSMs and individual admin accounts.

---

## 4. Questions coordinators may ask

| Question | Answer |
|---|---|
| Where is the citizen data stored in X-Road? | Only in MOHA's registry. X-Road carries requests; it has no central database. If the registry is off, ss3 returns an error. |
| What is the difference between the SIGN and AUTH certificates? | SIGN identifies the member organisation and signs messages. AUTH identifies the Security Server in mutual TLS. One organisation can own several servers, each with its own AUTH certificate. |
| Why did ss1 have to be finished first? | ss2 and ss3 send their registration requests as X-Road messages to the management services, which ss1 hosts. |
| Why did registering MANAGEMENT fail the first time? | It provides the `clientReg` service it would need to register itself. So it is registered from the Central Server side. |
| What does the anchor do? | It holds the configuration download address and the key that verifies the configuration's signature. It decides which network a Security Server trusts. |
| Who grants access to MOHA's data? | MOHA, on ss3. MOSD cannot grant itself access. |
| What would `AccessDenied` mean in production? | The provider has not given this subsystem rights to that service or endpoint. The fix is on the provider's Security Server. |
| How do you know who requested a record? | Both Security Servers keep signed, time-stamped message logs. MOHA's registry also logs the verified `X-Road-Client` and the officer's user ID. |
| What is different from production? | Production uses package installs, an approved CA and TSA, agreed identifiers (real registration numbers), HTTPS with client certificates between IS and Security Server, individual admin accounts, strong PINs or HSMs, and real data under data-protection law. |
| What went wrong and how did you solve it? | The three README issues: read the error code, check the server logs, fix one thing at a time. Example: "badly formatted directory string" pointed to the comma in the certificate subject. |
| Why HTTP between the portal and ss2? | For the lab only. The connection type is set per client; HTTPS would make ss2 refuse plain HTTP with SslAuthenticationFailed. |
