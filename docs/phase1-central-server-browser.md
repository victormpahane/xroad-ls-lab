# Phase 1 in the browser: configure the Central Server

Click-by-click version of Lesson 6, Phase 1 (README sections 1.1 to 1.8), for X-Road 7.7.0.
Every value comes from the README's "Values used throughout" table.

**Before you start**

- Containers running: `docker compose ps` shows 7 "Up".
- Clock synced: `timedatectl status` shows `System clock synchronized: yes`.
- Certificates fetched: `bash scripts/fetch-ca-certs.sh` (creates `certs/ca.pem`, `ocsp.pem`, `tsa.pem`).
- Open **https://cs.lab:4000** (or https://localhost:4000), accept the certificate warning,
  log in with **`xrd` / `secret`**.

> Tip: in any file picker, press **Ctrl+L** and paste a full path such as
> `/home/victor/xroad-ls-lab/certs/ca.pem`.

---

## Step 1: Initialise

The first login on a fresh Central Server opens the **Initialisation** screen.

| Field | Value |
|---|---|
| Instance identifier | `LS-DEV` |
| Central Server address | `cs` |
| PIN / Confirm PIN | `123456xrd!` |

Click **Submit**.

**Behind the scenes:** this names the X-Road network (the first part of every identifier) and creates
the software token, a password-protected key store that will hold the configuration signing keys.
`cs` is the address Security Servers use to download global configuration (it is the container name
on `xroad-network`, not something your browser uses).

**Check:** Settings → System Settings shows Instance Identifier `LS-DEV`, Central Server Address `cs`.

## Step 2: Member class

Settings → **System Settings** → **Member Classes** section → **Add**.

| Field | Value |
|---|---|
| Code | `GOV` |
| Description | `Government ministries and agencies` |

**Why:** every member belongs to a class. It is the second part of `LS-DEV/GOV/MOHA/...`.

## Step 3: Certification service and OCSP responder

**3a. The CA**

1. Top menu **Trust Services** → **Certification Services** → **Add certification service**.
2. Upload `certs/ca.pem` → **Next/Upload**.
3. Certificate profile info:
   `ee.ria.xroad.common.certificateprofile.impl.FiVRKCertificateProfileInfoProvider`
4. "CA can only be used for TLS authentication": **leave unchecked**. Leave any ACME fields empty.
5. **Save**. "Test CA" appears in the list.

**Why this profile:** the test CA issues Finnish-style certificates. The profile tells X-Road how
to read the member identity out of a signing certificate. A wrong profile means certificates from
this CA are rejected later, in Phase 2.

**3b. The OCSP responder**

1. Click **Test CA** → **OCSP Responders** tab → **Add**.
2. URL `http://ca:8888`, certificate `certs/ocsp.pem` → **Save**.

**Why `ca` and not `localhost`:** the Security Servers call this URL from inside Docker, where the
test CA container is called `ca`.

## Step 4: Time-stamping service

Trust Services → **Timestamping Services** → **Add**.

| Field | Value |
|---|---|
| URL | `http://ca:8899` |
| Certificate | `certs/tsa.pem` |

**Save.**
**Why:** Security Servers stamp their message logs with a trusted time from this service, so you can
later prove when a message was exchanged.

## Step 5: Members and subsystems

**Members** (top menu) → **Add member**, three times:

| Member name | Class | Code |
|---|---|---|
| Ministry of Communications, Science and Technology | GOV | `MCST` |
| Ministry of Social Development | GOV | `MOSD` |
| Ministry of Home Affairs | GOV | `MOHA` |

Then for each member: click the member → **Subsystems** tab → **Add subsystem**:

| Member | Subsystem code |
|---|---|
| MCST | `MANAGEMENT` |
| MOSD | `GRANTS-PORTAL` |
| MOHA | `POPULATION-REGISTRY` |

**Why now:** a Security Server can only register an owner or subsystem the Central Server already
knows. Adding them here means the names will appear in global configuration when you set up ss1 to ss3.
They show no Security Server yet; that link is made in Phases 2 to 4.

## Step 6: Management services provider

Settings → **System Settings** → **Management Services** section →
Service Provider Identifier → **Edit** → select **`MCST : MANAGEMENT`** → **Select/Save**.

**Why:** registration requests from Security Servers (in Phases 2 to 4) are sent as X-Road messages to a
"management services" provider. MCST, the X-Road operator, provides them through its MANAGEMENT
subsystem, which will live on ss1. The Security Server field stays empty until Phase 2.

## Step 7: Configuration signing keys

**7a. Internal**

1. **Global Configuration** → **Internal Configuration** → **Signing Keys** section.
2. If the token shows **Log in**, click it and enter PIN `123456xrd!`.
   (In this lab it is usually already logged in, because `XROAD_TOKEN_PIN` in docker-compose.yml
   unlocks it automatically.)
3. **Add key** → label `internal-signing-key` → **Save**.

**7b. External**

Global Configuration → **External Configuration** → Signing Keys → **Add key** →
label `external-signing-key` → **Save**.

**Why two:** internal configuration is what this network's own Security Servers download.
External configuration is what other X-Road networks would download if you federated with them.
Each is signed with its own key. Once a key exists, the Central Server starts publishing signed
global configuration about once a minute.

## Step 8: Download the anchor

Global Configuration → **Internal Configuration** → **Anchor** section → **Download**.
Save the file. You will upload it to ss1, ss2 and ss3.

**Why:** the anchor contains the download address (`http://cs/internalconf`) and the public key
that verifies the signed configuration. Uploading it is how a Security Server decides which X-Road
network to trust.

---

## Checkpoint 1

- No red alert banners at the top of the Central Server UI (wait one to two minutes after step 7).
- Trust Services lists Test CA (with one OCSP responder) and one timestamping service.
- Members lists MCST, MOSD and MOHA, each with one subsystem.
- You have the anchor XML file saved.

## Command-line equivalents

Every button above calls the Central Server's admin REST API (`https://localhost:4000/api/v1`).
This lab's Phase 1 was also run that way, from inside the `cs` container, with an API key
(Settings → API Keys):

| Step | API call |
|---|---|
| 1 | `POST /initialization` |
| 2 | `POST /member-classes` |
| 3 | `POST /certification-services`, then `POST /certification-services/{id}/ocsp-responders` |
| 4 | `POST /timestamping-services` |
| 5 | `POST /members`, `POST /subsystems` |
| 6 | `PATCH /management-services-configuration` |
| 7 | `PUT /tokens/{id}/login`, `POST /configuration-sources/INTERNAL|EXTERNAL/signing-keys` |
| 8 | `GET /configuration-sources/INTERNAL/anchor/download` |
