# Phase 3 in the browser: ss2 (MOSD) and ss3 (MOHA)

Click-by-click version of Lesson 6, Phase 3, for X-Road 7.7.0. You repeat Phase 2's steps 1 to 7
on two more servers. Nothing from step 8 (the MANAGEMENT subsystem) is repeated: only ss1 hosts
management services.

**Before you start**

- Checkpoint 2 passed: on ss1, `MCST` and `MCST:MANAGEMENT` are REGISTERED, and the management
  services have the right address, the cs TLS certificate and `security-server-owners` access
  (see `phase2-ss1-browser.md`, step 8). If any of these is missing, step 7 below fails.
- Tabs: **ss2** https://ss2.lab:2000, **ss3** https://ss3.lab:3000, **cs** https://cs.lab:4000,
  **test CA** http://localhost:8888/testca/. Login `xrd` / `secret`.

## Values

| | ss2 | ss3 |
|---|---|---|
| Owner member | `GOV` / `MOSD` | `GOV` / `MOHA` |
| Security Server code | `SS2` | `SS3` |
| Token PIN | `123456xrd!` | `123456xrd!` |
| Key labels | `ss2-sign`, `ss2-auth` | `ss3-sign`, `ss3-auth` |
| SIGN CSR: client | `GOV:MOSD` | `GOV:MOHA` |
| Organization (O), both CSRs | `Ministry of Social Development` | `Ministry of Home Affairs` |
| AUTH CSR: Server DNS name (CN) | `ss2` | `ss3` |
| Subject Alternative Name, both CSRs | `ss2` | `ss3` |
| Register auth cert, address | `ss2` | `ss3` |

Do all of ss2 first, then all of ss3 (or alternate; they do not depend on each other).

---

## Step 1: Initialise

Upload the anchor (`configuration_anchor_LS-DEV.xml`) → **Confirm** →
Owner member class `GOV`, code `MOSD` (or `MOHA`). The name fills in →
Security Server code `SS2` (or `SS3`) → PIN `123456xrd!` twice → **Submit**.

## Step 2: Token

If the token is not logged in: **Keys and Certificates** → SOFTTOKEN-0 → **Log in** → `123456xrd!`.

## Step 3: Time-stamping

**Settings** → **System Parameters** → **Timestamping Services** → **Add** → **Test TSA**.

## Step 4: Two keys and CSRs

**Keys and Certificates** → SOFTTOKEN-0 → **Add key**, twice, using the values table:
SIGNING key with client `GOV:MOSD` (or `GOV:MOHA`), then AUTHENTICATION key with CN `ss2` (or `ss3`).
Certification service **Test CA**, CSR format **DER**, plus the O and Subject Alternative Name values.

These ministry names have no commas, so you can type them as they are.

## Step 5: Sign at the test CA

http://localhost:8888/testca/ → choose the `.der` file → **Sign** or **Auth** to match → **Sign**.

Check the downloaded certificate if you like:

```bash
openssl x509 -in ~/Downloads/<file>.pem -noout -subject
# ss2 auth: subject=C=FI, O=Ministry of Social Development, CN=ss2, serialNumber=LS-DEV/SS2/GOV
```

## Step 6: Import and activate

**Import cert** → auth certificate → click it → **Activate**. Then **Import cert** → sign certificate.

## Step 7: Register

1. Auth certificate → **Register** → address `ss2` (or `ss3`).
2. On cs: **Management Requests** → approve the *Auth certificate registration* for
   `LS-DEV:GOV:MOSD:SS2` (and `LS-DEV:GOV:MOHA:SS3`).
3. Wait one to two minutes. The owner on **Clients** shows **REGISTERED**.

**Behind the scenes, and why ss1 came first:** unlike ss1's request in Phase 2, this one does not go
straight to the Central Server. ss2 sends an X-Road message to the `clientReg`-style management service
of `LS-DEV/GOV/MCST/MANAGEMENT`. Global configuration says that subsystem lives on ss1, so the message goes
ss2 → ss1 over mutual TLS. ss1 checks that MOSD is in `security-server-owners` and forwards it to
`https://cs:4002/managementservice/manage/`. This is the first real message travelling across your
X-Road network.

If Register fails with `UnknownMember`, `AccessDenied` or `SslAuthenticationFailed`, the cause is
on ss1: go back to Phase 2, steps 8c to 8f.

---

## Checkpoint 3

| Where | Expect |
|---|---|
| ss2 → Clients | `MOSD` owner **REGISTERED** |
| ss3 → Clients | `MOHA` owner **REGISTERED** |
| ss2 and ss3 → Keys and Certificates | auth and sign certificates Registered, active, OCSP good |
| ss2 and ss3 → Diagnostics | Global configuration OK |
| cs → Security Servers | SS1, SS2 and SS3 listed |

The OCSP line in Diagnostics may say *waiting* on a freshly set-up server until its periodic check runs;
the certificate's own OCSP status under Keys and Certificates is what counts.

## Command-line equivalents

Identical to Phase 2, steps 1 to 7 (see `phase2-ss1-browser.md`). Each server needs its own API key,
created inside its container:

```bash
docker exec ss2 curl -sk -u xrd:secret -X POST https://localhost:4000/api/v1/api-keys \
  -H 'Content-Type: application/json' -d '["XROAD_SYSTEM_ADMINISTRATOR","XROAD_SECURITY_OFFICER","XROAD_REGISTRATION_OFFICER","XROAD_SERVICE_ADMINISTRATOR"]'
```
