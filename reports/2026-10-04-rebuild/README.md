# X-Road Lab Report: MOSD ↔ MOHA Identity Exchange

**Date:** 2026-10-04 · **Author:** Motlatsi Victor Mpahane · **X-Road:** 7.7.0 (Docker Compose, local lab)

## Summary

On 4 October 2026 I rebuilt a local X-Road 7.7.0 test network and got the Ministry of Social Development (MOSD) Grants Portal fetching citizen data from the Ministry of Home Affairs (MOHA) Population Registry, entirely over X-Road. All three test calls (REST record lookup, REST vital status, SOAP identity check) returned HTTP 200. The MOHA audit log recorded each call with the verified X-Road client `LS-DEV/GOV/MOSD/GRANTS-PORTAL`.

The network has one Central Server (cs), three Security Servers (ss1 for MCST management services, ss2 for MOSD, ss3 for MOHA), a test CA with OCSP and time-stamping, and the two ministry information systems. Each information system can reach only its own Security Server, so every request passes through ss2 → ss3.

## Environment and identifiers

Instance `LS-DEV`, member class `GOV`, all ports bound to 127.0.0.1.

| Component | Owner | Identifier | Admin / URL |
| --- | --- | --- | --- |
| Central Server (cs) | X-Road operator | `LS-DEV` | https://cs.lab:4000 |
| ss1 | Ministry of Communications, Science and Technology | `LS-DEV:GOV:MCST:SS1` | https://ss1.lab:1000 |
| ss2 | Ministry of Social Development | `LS-DEV:GOV:MOSD:SS2` | https://ss2.lab:2000 |
| ss3 | Ministry of Home Affairs | `LS-DEV:GOV:MOHA:SS3` | https://ss3.lab:3000 |
| Management services | MCST | `LS-DEV:GOV:MCST:MANAGEMENT` | hosted on ss1 |
| Grants Portal (consumer IS) | MOSD | `LS-DEV:GOV:MOSD:GRANTS-PORTAL` | http://localhost:8500 |
| Population Registry (provider IS) | MOHA | `LS-DEV:GOV:MOHA:POPULATION-REGISTRY` | http://localhost:8001/audit |
| Test CA, OCSP, TSA | — | Test CA | http://ca:8888 (OCSP), http://ca:8899 (TSA) |

## Architecture

The lab is defined in [`docker-compose.yml`](../../docker-compose.yml) (7 containers, 3 networks, 12 volumes). Start it with `docker compose up -d --build`.

![Diagram 1 — Lab deployment architecture](diagrams/diagram-1-deployment.png)

*Diagram 1. 7 containers on 3 Docker networks. The portal can reach the registry only through ss2 and ss3.*

![Diagram 2 — One eligibility check, end to end](diagrams/diagram-2-request-sequence.png)

*Diagram 2. Message sequence for one eligibility check: signed and verified on both Security Servers, logged at the registry.*

![Diagram 3 — Registration via ss1](diagrams/diagram-3-registration.png)

*Diagram 3. Registration requests from ss2 and ss3 travel through the management services on ss1 and are approved on cs.*

## Work done

1. **Central Server.** Initialised cs (`LS-DEV`, address `cs`). Added member class `GOV`, Test CA with OCSP, and Test TSA. Added members MCST, MOSD and MOHA, each with one subsystem. Set the management service provider to `MCST:MANAGEMENT`, added internal and external signing keys, and downloaded the anchor.
2. **ss1 (management Security Server).** Initialised (owner `GOV:MCST`, code `SS1`). Added the TSA, generated SIGN and AUTH keys and CSRs (DER), signed them at the Test CA, imported and activated them, and registered the AUTH certificate. Registered MANAGEMENT by setting SS1 as the Management Services' Security Server on cs. Added the management WSDL, set the service URL `https://cs:4002/managementservice/manage/`, installed the cs TLS certificate, and granted `security-server-owners` access.
3. **ss2 (MOSD) and ss3 (MOHA).** Same initialisation, keys, certificates and AUTH registration; approved on cs.
4. **IS subsystems.** Registered `POPULATION-REGISTRY` on ss3 and `GRANTS-PORTAL` on ss2; approved on cs.
5. **MOHA services on ss3.** Added REST `population-api` (OpenAPI 3) and SOAP `verifyIdentity` v1. Enabled both and granted access to `LS-DEV:GOV:MOSD:GRANTS-PORTAL`.
6. **Testing.** Three calls from the Grants Portal, confirmed on the MOHA audit page.

## Management requests on cs

| Id | Created | Type | Server | Status |
| --- | --- | --- | --- | --- |
| 6 | 2026-10-04 20:51 | Client registration (GRANTS-PORTAL) | LS-DEV:GOV:MOSD:SS2 | Approved |
| 5 | 2026-10-04 20:50 | Client registration (POPULATION-REGISTRY) | LS-DEV:GOV:MOHA:SS3 | Approved |
| 4 | 2026-10-04 20:44 | Auth certificate registration | LS-DEV:GOV:MOHA:SS3 | Approved |
| 3 | 2026-10-04 20:31 | Auth certificate registration | LS-DEV:GOV:MOSD:SS2 | Approved |
| 2 | 2026-10-04 20:05 | Client registration (MANAGEMENT) | LS-DEV:GOV:MCST:SS1 | Approved |
| 1 | 2026-10-04 12:20 | Auth certificate registration | LS-DEV:GOV:MCST:SS1 | Approved |

## Test results

Applicant: Mpho Mokoena, national ID 010119550001 (synthetic data), officer `officer.ntsane`.

| Call | API | Result | HTTP | Time | Message ID |
| --- | --- | --- | --- | --- | --- |
| verifyIdentity v1 | SOAP | Found: yes; details match: yes; ALIVE | 200 | 159 ms | c968d4a9-fea3-484b-8318-a0f333fa2591 |
| getVitalStatus | REST | ALIVE (minimal disclosure) | 200 | 187 ms | LS-DEV-23bcc6fd-07f5-4b84-9629-686b327ed6… |
| getCitizen | REST | Full record: F, Maseru · Ha Thetsane, LS, ALIVE | 200 | 594 ms | LS-DEV-91a9d6c8-48b2-4ce8-a100-0f0ea2d341b0 |

## Evidence: screenshots in order

### Phase 2 — ss1 and management services

**Fig. 01 — ss1: first MANAGEMENT registration attempt fails (`Signer.InternalError`, no suitable certificates) — before the owner certificates were ready**

![Fig 01](screenshots/01-ss1-management-signer-error.png)

**Fig. 02 — ss1: SIGN and AUTH certificates imported and REGISTERED**

![Fig 02](screenshots/02-ss1-sign-auth-certs-registered.png)

**Fig. 03 — ss1 Diagnostics: global configuration "Everything ok"; TSA and OCSP waiting for first request**

![Fig 03](screenshots/03-ss1-diagnostics.png)

**Fig. 04 — ss1: expected `ClientProxy.UnknownMember` on MANAGEMENT clientReg (management services not yet hosted)**

![Fig 04](screenshots/04-ss1-management-unknownmember-expected.png)

**Fig. 05 — cs: Management Services settings — provider MCST:MANAGEMENT; Security Server then set to SS1**

![Fig 05](screenshots/05-cs-management-services-settings.png)

**Fig. 06 — ss1: `security-server-owners` given access to the management services**

![Fig 06](screenshots/06-ss1-management-access-rights.png)

### Phase 3 — ss2 and ss3

**Fig. 07 — cs: SS1, SS2 and SS3 all registered**

![Fig 07](screenshots/07-cs-security-servers-ss1-ss2-ss3.png)

### Phase 4 — IS subsystems

**Fig. 08 — ss3: adding POPULATION-REGISTRY subsystem with Register ticked**

![Fig 08](screenshots/08-ss3-add-population-registry-subsystem.png)

**Fig. 09 — cs: all six management requests APPROVED**

![Fig 09](screenshots/09-cs-management-requests-approved.png)

**Fig. 10 — ss3: Population Registry "Registration in progress"**

![Fig 10](screenshots/10-ss3-subsystem-registration-in-progress.png)

**Fig. 11 — ss3: Population Registry REGISTERED**

![Fig 11](screenshots/11-ss3-subsystem-registered.png)

### Phase 5 — MOHA services

**Fig. 12 — ss3: adding REST service `population-api` from the OpenAPI 3 description**

![Fig 12](screenshots/12-ss3-add-rest-population-api.png)

**Fig. 13 — ss3: granting access to `LS-DEV:GOV:MOSD:GRANTS-PORTAL`**

![Fig 13](screenshots/13-ss3-access-rights-grants-portal.png)

### Phase 6 — End-to-end test

**Fig. 14 — Grants Portal: REST getCitizen — HTTP 200, 594 ms**

![Fig 14](screenshots/14-portal-rest-getcitizen.png)

**Fig. 15 — Grants Portal: REST getVitalStatus — HTTP 200, 187 ms**

![Fig 15](screenshots/15-portal-rest-getvitalstatus.png)

**Fig. 16 — Grants Portal: SOAP verifyIdentity v1 — HTTP 200, 159 ms**

![Fig 16](screenshots/16-portal-soap-verifyidentity.png)

**Fig. 17 — MOHA audit log: all three calls received from GRANTS-PORTAL**

![Fig 17](screenshots/17-moha-audit-log.png)

## Problems and fixes

| What I saw | Cause | Fix |
| --- | --- | --- |
| ss1: `Signer.InternalError` — MCST:MANAGEMENT has no suitable certificates (Fig. 01) | MANAGEMENT registered before the owner's certificates were in place | Finished owner registration, then retried |
| ss1: `ClientProxy.UnknownMember` on `MANAGEMENT/clientReg` (Fig. 04) | Expected: MANAGEMENT can't register through services not yet hosted | Set Management Services' Security Server to SS1 on cs |
| CSR fails with `Signer.InternalError` | Comma in Organization Name | Removed the comma |
| cs: configuration signing/generation fails | Signing keys or management provider missing | Added both keys; set provider MCST:MANAGEMENT |
| ss1: TSA Add greyed out | Test CA/TSA not yet on cs | Added on cs, waited 2 min, refreshed |

## Still to do

- [ ] Run **Check pension eligibility** for every sample applicant
- [ ] Run `bash tests/smoke-test.sh` (7 checks)
- [ ] Confirm OCSP **Good** and time-stamping green on ss1–ss3
- [ ] Run the failure experiments (remove access rights, disable WSDL, stop `moha-registry`)
