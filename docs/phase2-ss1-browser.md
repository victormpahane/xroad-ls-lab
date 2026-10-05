# Phase 2 in the browser: ss1, the management Security Server

Click-by-click version of Lesson 6, Phase 2 (README steps 3.1 to 3.8), for X-Road 7.7.0.
ss1 belongs to **MCST**, the X-Road operator. It must be finished before ss2 and ss3, because their
registration requests travel through the management services that ss1 hosts.

**Before you start**

- Phase 1 done: no alert banners on https://cs.lab:4000, anchor file saved
  (e.g. `~/Downloads/configuration_anchor_LS-DEV.xml`).
- Two browser tabs: **ss1** at https://ss1.lab:1000 and **cs** at https://cs.lab:4000.
  Both log in with `xrd` / `secret`.
- A third tab for the test CA: http://localhost:8888/testca/

> **Three things this guide adds to the README** (found while running it on 7.7.0):
> 1. The Organization (O) field must **not contain a comma** (step 4).
> 2. 7.7.0 asks for a **Subject Alternative Name** on both CSRs (step 4).
> 3. The management services need their **service address** set, and the Central Server's
>    TLS certificate trusted (step 8). Without this, ss2 and ss3 cannot register in Phase 3.

---

## Step 1: Initialise ss1

On https://ss1.lab:1000 the first login opens the initialisation wizard.

1. **Configuration anchor:** upload the anchor file → check that the instance is `LS-DEV` and the hash
   is shown → **Confirm**.
2. **Owner member:** Member class `GOV`, Member code `MCST`. The member name fills in by itself
   (Ministry of Communications, Science and Technology).
   Security Server code `SS1` → **Continue**.
3. **Token PIN:** `123456xrd!` twice → **Submit**.

**Behind the scenes:** ss1 now trusts LS-DEV's Central Server and downloads global configuration from
`http://cs/internalconf` every minute. The name fills in because MCST is already in that
configuration (you added it in Phase 1, step 5).

**If the name does not fill in:** the member is missing on cs, or global configuration has not arrived
yet. Wait one to two minutes.

## Step 2: Log in to the token

If a yellow banner says the token is not logged in: **Keys and Certificates** → **SOFTTOKEN-0** →
**Log in** → PIN `123456xrd!`.

## Step 3: Time-stamping

**Settings** → **System Parameters** → **Timestamping Services** → **Add** → select **Test TSA**
(`http://ca:8899`) → **Add**.

## Step 4: Two keys and two CSRs

**Keys and Certificates** → **SOFTTOKEN-0** → **Add key**. Do this twice.

| Wizard field | Key 1 (sign) | Key 2 (auth) |
|---|---|---|
| Key label | `ss1-sign` | `ss1-auth` |
| Usage | **SIGNING** | **AUTHENTICATION** |
| Client | `GOV:MCST` | (not asked) |
| Certification service | Test CA | Test CA |
| CSR format | **DER** | **DER** |
| Organization (O) | `Ministry of Communications Science and Technology` | same |
| Server DNS name (CN) | read-only: `MCST` | `ss1` |
| Subject Alternative Name | `ss1` | `ss1` |
| Country (C), serialNumber | read-only: `FI`, `LS-DEV/SS1/GOV` | same |

Click **Generate CSR**. The browser downloads a `.der` file each time.

> **Watch out: no comma in O.** X-Road writes the certificate subject as text,
> `C=FI, O=..., CN=...`, with commas between fields. A comma inside the name breaks it, and you get
> `Signer.InternalError` ("badly formatted directory string" in `docker compose logs ss1`).
> The member name on the Central Server may keep its comma; only the certificate field must not.

## Step 5: Sign the CSRs at the test CA

At http://localhost:8888/testca/, for each file:

1. **CSR:** choose the `.der` file.
2. **Type:** **Sign** for the signing CSR, **Auth** for the authentication CSR.
3. Press **Sign**. The browser downloads a `.pem` certificate.

**Why this is fake:** a real CA checks your documents first. The test CA signs anything, so the
lab can run on a laptop.

## Step 6: Import and activate

**Keys and Certificates** → SOFTTOKEN-0 → **Import cert.**

1. Import the **auth** certificate. Click it → **Activate**.
2. Import the **sign** certificate. It shows **Registered** straight away: signing certificates
   only need to come from a CA the Central Server trusts.

## Step 7: Register ss1

1. On ss1: click the auth certificate → **Register** → address `ss1` → **Add**.
   Status becomes *Registration in progress*.
2. On cs: **Management Requests** → the *Auth certificate registration* for `LS-DEV:GOV:MCST:SS1` →
   **Approve**.
3. Back on ss1, wait one to two minutes: the auth certificate shows **Registered**, and on
   **Clients** the owner `MCST` shows **REGISTERED**.

**Why approve by hand:** the operator confirms this server really belongs to MCST before it joins the
network. This is X-Road's trust model.

## Step 8: The MANAGEMENT subsystem and its services

**8a. Add the subsystem**

On ss1: **Clients** → **Add subsystem** → **Select subsystem** → `MCST / MANAGEMENT` → **Add**.
When asked "register?", choose **Yes**.

You get an error mentioning `UnknownMember ... clientReg`. **This is expected.** ss1 tried to ask the
management services to register MANAGEMENT, but MANAGEMENT is the subsystem that provides them, so
no server has them yet.

**8b. Register it from the Central Server instead**

On cs: **Settings** → **System Settings** → **Management Services** →
*Management Services Security Server* → **Edit** → select **`SS1`** → **Save**.

Back on ss1, wait one to two minutes: **MANAGEMENT** shows **REGISTERED**.

**8c. Add the services**

1. On cs, copy the **WSDL address** shown in the Management Services section:
   `http://cs/managementservices.wsdl`. Also note the **Services address**:
   `https://cs:4002/managementservice/manage/`.
2. On ss1: **Clients** → **MANAGEMENT** → **Services** tab → **Add WSDL** → paste the WSDL address →
   **Add**.
3. Switch the new WSDL **on** (the toggle next to it).

**8d. Point the services at the Central Server**

The WSDL comes with a placeholder address, `http://INSERT_MANAGEMENT_SERVICE_ADDRESS_HERE`.

1. Expand the WSDL → click any service (e.g. `clientReg`).
2. **Service URL:** `https://cs:4002/managementservice/manage/`.
3. Tick **Apply to all in WSDL** next to the URL (and next to timeout and TLS verification) →
   **Save**.

**8e. Trust the Central Server's TLS certificate**

Because the address is HTTPS with certificate verification on, ss1 must know cs's certificate.

1. On cs: **Settings** → **TLS Certificates** → **Management Service TLS certificate** →
   **Download certificate**. You get a `.tar.gz` archive. Open it and extract `management-service.pem`.
2. On ss1: **Clients** → **MANAGEMENT** → **Internal Servers** tab →
   *Information System TLS certificate* → **Add** → upload `management-service.pem`.

**8f. Access rights**

Each service must allow the **Security server owners** global group (every server's owner),
otherwise ss2 and ss3 are refused.

On ss1: **Clients** → **MANAGEMENT** → **Service Clients** → **Add subject** → search for the
global group **security-server-owners** → select it → **Next** → select **all** services →
**Add selected**.

---

## Checkpoint 2

On ss1:

- **Clients:** `MCST` (owner) and `MCST:MANAGEMENT`, both **REGISTERED**.
- **Keys and Certificates:** `ss1-auth` and `ss1-sign`, both Registered, active, OCSP "good".
- **MANAGEMENT → Services:** WSDL enabled, every service URL `https://cs:4002/managementservice/manage/`,
  and `security-server-owners` listed under Service Clients.
- **Diagnostics:** Global configuration green, OCSP green. Time-stamping says *waiting* or
  *uninitialized* until the first real message is logged. That is normal here.

## Command-line equivalents (ss1 admin API, https://localhost:4000/api/v1 inside ss1)

| Step | API call |
|---|---|
| 1 | `POST /system/anchor`, `POST /initialization` |
| 2 | `PUT /tokens/0/login` |
| 3 | `POST /system/timestamping-services` |
| 4 | `POST /tokens/0/keys-with-csrs`, `GET /keys/{id}/csrs/{csr_id}?csr_format=DER` |
| 5 | (test CA) `POST http://localhost:8888/testca/sign` with `certreq` and `type=sign/auth` |
| 6 | `POST /token-certificates`, `PUT /token-certificates/{hash}/activate` |
| 7 | `PUT /token-certificates/{hash}/register`; on cs `POST /management-requests/{id}/approval` |
| 8a–b | `POST /clients`; on cs `POST /management-services-configuration/register-provider` |
| 8c–f | `POST /clients/{id}/service-descriptions`, `PUT /service-descriptions/{id}/enable`, `PATCH /services/{id}`, `POST /clients/{id}/tls-certificates`, `POST /services/{id}/service-clients` |
