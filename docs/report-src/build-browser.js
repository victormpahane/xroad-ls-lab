// Builds the Browser Guide (beginner edition, v2).
//   node build-browser.js              -> docs/XRoad-Lab-Browser-Guide.docx                    (terminal steps use the lab scripts)
//   node build-browser.js --explicit   -> docs/XRoad-Lab-Browser-Guide-Explicit-Commands.docx (every command written out)
// Screen labels in bold come from X-Road 7.7.0's own English UI text (see ui/*-strings.txt).
// v1 of this generator is kept as archive-build-browser-v1.js.
const path = require('path');
const { newDoc, save, C, Paragraph, TextRun, BorderStyle } = require('./lib');

const EXPLICIT = process.argv.includes('--explicit');
const pick = (scripts, explicit) => (EXPLICIT ? explicit : scripts);

const k = newDoc();
const { add, P, note, H1, H2, H3, bullets, steps, checks, code, table, callout, figure } = k;
const { terminalStepsScripts, terminalStepsExplicit } = require('./browser-terminal')(k);

// One configuration step, always in the same order so a beginner knows where to look.
function step(id, title, { what, before, where, clicks, values, see, why, wrong }) {
  const out = [H3(`Step ${id}  ${title}`)];
  if (what) out.push(P(`**What this step does:** ${what}`));
  if (before) out.push(P(`**Before you start:** ${before}`));
  if (where) out.push(P(`**Where:** ${where}`));
  if (clicks) { out.push(P('**Do this:**')); out.push(...steps(clicks)); }
  if (values) out.push(...table(['Field on screen', 'Type or choose exactly'], values, [0.42, 0.58]));
  if (see) out.push(...callout('see', null, [].concat(see)));
  if (why) out.push(...callout('why', null, [].concat(why)));
  if (wrong) out.push(...callout('prob', null, [].concat(wrong)));
  return out;
}
const recap = (lines) => callout('box', 'What you just built', [].concat(lines));
const QUIZ = []; // [phase, [[question, model answer], …]] collected for Appendix A
function ask(phase, items) {
  QUIZ.push([phase, items]);
  return [H3('Check your understanding'), P('Answer in your own words before moving on. Model answers are in Appendix A.'), ...steps(items.map(([q]) => q))];
}

// =====================================================================
// COVER
// =====================================================================
add(
  new Paragraph({ children: [], spacing: { before: 1800 } }),
  new Paragraph({ children: [new TextRun({ text: 'X-ROAD LOCAL LAB', bold: true, size: 28, color: C.blue })], spacing: { after: 120 } }),
  new Paragraph({ children: [new TextRun({ text: 'The Browser Guide', bold: true, size: 64, color: C.navy })], spacing: { after: EXPLICIT ? 60 : 120 } }),
  ...(EXPLICIT ? [new Paragraph({ children: [new TextRun({ text: 'Explicit commands edition', bold: true, size: 32, color: C.green })], spacing: { after: 120 } })] : []),
  new Paragraph({ children: [new TextRun({ text: 'A beginner’s step-by-step guide to building the LS-DEV X-Road network by clicking: every idea explained first, every page, every field, every check, and what to do when something goes wrong', size: 28, color: C.grey })],
    spacing: { after: 500 }, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: C.blue, space: 12 } } }),
  ...table(['', ''], [
    ['Author', 'Motlatsi Victor Mpahane, student attachee'],
    ['For', 'Someone who has never used X-Road, and has used Ubuntu and a web browser but is not an expert'],
    ['You will build', 'A working X-Road network on your laptop in which the Ministry of Social Development checks pension applicants against the Ministry of Home Affairs’ population register'],
    ['X-Road version', '7.7.0, Docker images from NIIS, on Ubuntu 26.04'],
    ['Tested', 'Every value in this guide was used in a successful build (smoke test 7 of 7 passed)'],
    ['Companions', 'Beginner Guide (concepts) · Build Report (commands and API) · REST and SOAP Services'],
  ], [0.22, 0.78], true),
  note('Prepared with Claude (Anthropic). All identifiers, certificates and citizen data are synthetic and for learning only. Version 2 (beginner edition).'),
  k.pageBreak(),
  ...k.toc(),
);

// =====================================================================
// PART A: BEFORE YOU BEGIN
// =====================================================================
add(H1('1. Read me first'),
  H2('1.1 What you will achieve'),
  P('By the end of this guide you will have built, by yourself and mostly by clicking, a small but complete X-Road network on your laptop. Two pretend government ministries will exchange data through it:'),
  ...bullets([
    'The **Ministry of Social Development (MOSD)** runs a Grants Portal where an officer processes Old Age Pension applications.',
    'The **Ministry of Home Affairs (MOHA)** runs the Population Registry: who exists, when they were born, whether they are alive.',
    'The portal asks the registry about an applicant **through X-Road**, and gets an answer that is signed, encrypted, permission-checked and logged on both sides.',
  ]),
  P('You will also understand **why** each step is needed, which is what your lab coordinators will ask about.'),
  H2('1.2 Who this guide is for'),
  P('You do not need to know X-Road. You should be able to open a terminal, type a command, open a web page, and download or upload a file. Section 1.5 explains every computer skill the guide uses. Every X-Road word is explained in plain language in section 2 before you meet it in a step.'),
  H2('1.3 How long it takes'),
  ...table(['Part', 'What you do', 'First time'], [
    ['Sections 1–2', 'Read: how to use the guide, the ideas in plain language', '45 min'],
    ['Section 3', 'Get ready: start the lab, set up the browser', '20–30 min'],
    ['Sections 4–5', 'Tour of the admin pages (reading)', '15 min'],
    ['Phase 1 (section 6)', 'Central Server', '30–45 min'],
    ['Phase 2 (section 7)', 'ss1, the first Security Server', '60 min'],
    ['Phase 3 (section 8)', 'ss2 and ss3', '60 min'],
    ['Phases 4–5 (sections 9–10)', 'The ministries’ applications and services', '30 min'],
    ['Phase 6 (section 11)', 'Testing', '15–20 min'],
    ['Section 12', 'Break-it experiments', '30–45 min'],
  ], [0.28, 0.5, 0.22]),
  ...callout('tip', 'Split it over sessions', ['A good split: session 1 = sections 1–6 (reading and Phase 1); session 2 = Phases 2–3; session 3 = Phases 4–6 and the experiments. Everything you configure is saved. Section 13.3 explains how to stop and resume safely.']),
  H2('1.4 How each step is written'),
  P('Every step in the build has the same parts, always in the same order, so you always know where to look:'),
  ...table(['Part', 'What it tells you'], [
    ['**What this step does**', 'The purpose, in one or two plain sentences.'],
    ['**Before you start**', 'What must already be done (only shown when it matters).'],
    ['**Where**', 'Which browser tab and which page.'],
    ['**Do this**', 'Numbered actions, one per line. Do them in order.'],
    ['Table “Type or choose exactly”', 'The values to enter. Copy them exactly: capitals, dashes and punctuation matter.'],
    ['Grey box **You should now see**', 'How to tell the step worked. **Do not move on until it matches.**'],
    ['Blue box **Why**', 'The reason behind the step. This is where your understanding comes from.'],
    ['Red box **If it goes wrong**', 'The most likely problems for this step and how to fix them.'],
  ], [0.32, 0.68]),
  P('Other conventions:'),
  ...table(['You see', 'It means'], [
    ['**Keys and certificates**', 'A label exactly as it appears on screen: a menu, tab, button or field. Tip: press **Ctrl+F** in the browser and type the label to find it on the page.'],
    ['**Clients → Add subsystem**', 'Click the first item, then the second.'],
    ['`LS-DEV`', 'Text to type exactly.'],
    ['Green box with ✓', 'A checkpoint at the end of a phase.'],
  ], [0.32, 0.68]),
  ...callout('tip', 'Where the screen labels come from', ['The bold menu, tab, field and status names were taken from the English text built into X-Road 7.7.0’s own admin pages, so they match your screen. Generic wizard buttons such as **Next**, **Continue**, **Add**, **Save**, **OK** or **Submit** can differ by a word; choose the one that moves forward. There are no screenshots in this guide: take your own as you go. They make excellent evidence for your Jira report.']),
  H2('1.5 Computer skills this guide uses'),
  H3('In the terminal'),
  ...table(['Task', 'How'], [
    ['Open a terminal', 'Press **Ctrl+Alt+T**.'],
    ['Paste a command', '**Ctrl+Shift+V** (plain Ctrl+V does not work in the terminal), or right-click → Paste.'],
    ['Run it', 'Press **Enter**. Wait until the prompt (the line ending in `$`) comes back before typing the next command.'],
    ['Stop a command that keeps running', 'Press **Ctrl+C** (used after watching a log).'],
    ['Lines starting with `#`', 'Comments for you to read; do not type them.'],
    ['It asks for a password', 'Type your Ubuntu login password. Nothing appears while you type; that is normal. Press Enter.'],
  ], [0.32, 0.68]),
  H3('In the browser'),
  ...table(['Task', 'How'], [
    ['Open a new tab', '**Ctrl+T**, then type the address and press Enter.'],
    ['Reload a page to see a new status', '**F5** (or the circular arrow). You will do this a lot while waiting for registrations.'],
    ['Find a label on the page', '**Ctrl+F** and type it, e.g. `Add subsystem`.'],
    ['Make a big table fit', 'Zoom out with **Ctrl and −**; back to normal with **Ctrl+0**.'],
    ['Messages after you click', 'A short message pops up, usually at the bottom or top of the page, e.g. **Member class saved.** Green means success; red means an error. Read it before it disappears.'],
    ['Wizards', 'Some actions open a form with several pages, steps shown across the top, and **Next**/**Continue** at the bottom.'],
    ['Edit icons', 'A small pencil next to a value means **Edit**.'],
    ['Toggles', 'A sliding switch: coloured is on, grey is off.'],
    ['Drop-down lists', 'Click the field, then pick from the list that opens.'],
  ], [0.32, 0.68]),
  H3('With files'),
  ...table(['Task', 'How'], [
    ['Find downloads', 'Files app → **Downloads** (or `~/Downloads` in the terminal).'],
    ['Rename a file', 'Click it once in the Files app, press **F2**, type the new name, Enter.'],
    ['Pick a file quickly in an upload dialog', 'Press **Ctrl+L**, paste the full path (e.g. `/home/victor/xroad-ls-lab/certs/ca.pem`), Enter.'],
    ['Open a .tar.gz archive', 'Right-click it in the Files app → **Extract** (or **Extract Here**). A folder with the contents appears next to it.'],
  ], [0.32, 0.68]),
  H2('1.6 Six golden rules'),
  ...steps([
    '**One step at a time.** Do the steps in order; each depends on the ones before.',
    '**Check before you move on.** Every step has a “You should now see” box. If your screen does not match, stop and use the red box.',
    '**Changes on the Central Server take 1–2 minutes to reach the Security Servers.** After approving something, wait, then press F5.',
    '**Type values exactly.** `GOV` is not `Gov`; `SS1` is not `ss1` (both appear, in different fields).',
    '**Name your files** as soon as you download them (section 3.5). Most confusing errors come from uploading the wrong file.',
    '**Never run `docker compose down -v`** unless you mean to delete everything and start again.',
  ]),
  H2('1.7 If you get lost'),
  ...bullets([
    'Go back to the last step whose “You should now see” box matched, and continue from there.',
    'Section 13 lists symptoms and fixes; section 13.4 explains how to undo common mistakes.',
    'You can always reset the whole lab and start again (section 13.5); a second build is much quicker.',
  ]),
);

// ---------------------------------------------------------------------
add(H1('2. The ideas, in plain language'),
  P('Before clicking anything, it helps to know what the pieces are. This section uses an everyday picture; the technical word follows.'),
  H2('2.1 The picture: a trusted courier between ministries'),
  P('Imagine the ministries must send each other confidential letters. They agree on a courier service with strict rules:'),
  ...table(['In the picture', 'In X-Road', 'In this lab'], [
    ['A **registry office** keeps the official list of which organisations and which mailrooms belong to the scheme, and publishes it as a signed list every minute.', '**Central Server** and its **global configuration**', '`cs`'],
    ['Each ministry has its own **mailroom**. Staff hand letters only to their own mailroom, never directly to another ministry.', '**Security Server**', '`ss2` (MOSD), `ss3` (MOHA)'],
    ['The scheme’s operator also runs a mailroom that carries **joining requests** to the registry office.', '**Management Security Server** with the **management services**', '`ss1` (MCST)'],
    ['A **passport office** issues ID cards: one for each mailroom, one for each ministry.', '**Certificate Authority (CA)** issuing **certificates**', '`ca` (the test CA)'],
    ['Before trusting an ID card, a mailroom phones a hotline: “Is this card still valid?”', '**OCSP** responder', '`ca`, port 8888'],
    ['A **notary** stamps the date and time on every logged letter.', '**Time-Stamping Authority (TSA)**', '`ca`, port 8899'],
    ['A **letter of introduction** tells a new mailroom which registry office to trust and how to recognise its signature.', '**Configuration anchor**', 'an XML file you download in Phase 1'],
    ['Each mailroom keeps its stamps and keys in a **safe** with a combination.', '**Token** and its **PIN**', 'PIN `123456xrd!`'],
    ['To get an ID card you fill in an **application form** and take it to the passport office.', '**Certificate Signing Request (CSR)**', 'files ending in `.der`'],
  ], [0.48, 0.28, 0.24]),
  ...figure('topology', 'The real lab: seven programs (containers) on three private networks inside your laptop. The portal has no road to the registry except through ss2 and ss3.', 1400, 860),
  H2('2.2 Organisations, applications and services'),
  P('X-Road names everything with a path, read from the most general to the most specific:'),
  ...code(['LS-DEV / GOV / MOHA / POPULATION-REGISTRY / population-api', '  |       |     |            |                   |', 'network class ministry    application         service']),
  ...table(['Word', 'Plain meaning', 'In this lab'], [
    ['**Instance**', 'The whole network: one registry office', '`LS-DEV`'],
    ['**Member class**', 'A category of organisation', '`GOV` (government)'],
    ['**Member** (member code)', 'One organisation', '`MCST`, `MOSD`, `MOHA`'],
    ['**Subsystem**', 'One application (“department”) of an organisation. Permissions are given to subsystems.', '`MANAGEMENT`, `GRANTS-PORTAL`, `POPULATION-REGISTRY`'],
    ['**Service**', 'One thing a subsystem offers (“a counter you can go to”)', '`population-api`, `verifyIdentity`'],
    ['**Security Server code**', 'The name of one mailroom of a member', '`SS1`, `SS2`, `SS3`'],
  ], [0.24, 0.48, 0.28]),
  H2('2.3 The two ID cards'),
  P('Every Security Server needs **two** certificates. This is the idea people mix up most:'),
  ...table(['', 'Authentication certificate (AUTH)', 'Signing certificate (SIGN)'], [
    ['Proves who…', '…the **server** (mailroom) is', '…the **organisation** (ministry) is'],
    ['Used for', 'The secure connection between two Security Servers', 'Signing every message'],
    ['Belongs to', 'One Security Server, e.g. ss3', 'One member, e.g. MOHA'],
    ['Needs registering on the Central Server?', 'Yes: that is the “joining” step', 'No: valid as soon as it is imported'],
  ], [0.28, 0.36, 0.36]),
  H2('2.4 How trust is set up'),
  ...figure('trust', 'A Security Server trusts the Central Server through the anchor, and trusts certificates from the CA that the Central Server lists.', 1400, 700),
  P('In short: you first set up the Central Server (Phase 1). Each Security Server then gets the anchor, proves who it is with certificates from the CA, and asks to join; the operator approves on the Central Server. From then on every Security Server downloads the signed list each minute and knows who everyone is.'),
  H2('2.5 What the ministries actually exchange'),
  P('MOHA offers two **services** through ss3. `population-api` returns a citizen’s record, or only whether they are alive. `verifyIdentity` answers “do these details match?” without revealing the record. MOHA decides who may use them (**access rights**). The portal on the MOSD side uses both to decide pension eligibility. The companion document *REST and SOAP Services* explains them in depth.'),
  H2('2.6 The plan'),
  ...figure('phases', 'The six build phases. Each ends with a checkpoint.', 1400, 520),
  ...table(['Phase', 'In the picture', 'What you do'], [
    ['1', 'Set up the registry office', 'Name the network, register the passport office and notary, list the three ministries, download the letter of introduction'],
    ['2', 'Open the operator’s mailroom', 'ss1 gets its ID cards, joins, and starts carrying joining requests'],
    ['3', 'Open the two ministries’ mailrooms', 'ss2 and ss3 get their ID cards and join through ss1'],
    ['4', 'Register the departments', 'GRANTS-PORTAL on ss2, POPULATION-REGISTRY on ss3'],
    ['5', 'Open MOHA’s counters', 'Publish the two services on ss3 and allow only GRANTS-PORTAL'],
    ['6', 'Send real letters', 'Test from the portal and read the audit trail'],
  ], [0.08, 0.32, 0.60]),
);

// ---------------------------------------------------------------------
add(H1('3. Getting ready'),
  ...(EXPLICIT ? terminalStepsExplicit() : terminalStepsScripts()),
  ...callout('see', 'Before you continue', [
    pick('`bash scripts/preflight.sh` ends with **0 failed**;', 'the laptop checks in 3.1.2 all pass;') + ' `docker compose ps` shows 7 containers **Up**; the four admin pages answer; `certs/` holds `ca.pem`, `ocsp.pem` and `tsa.pem`.',
  ]),
  H2('3.2 Open your tabs'),
  ...figure('workspace', 'Open one tab per server and keep them open for the whole build.', 1400, 640),
  ...steps([
    'Open Firefox or Chrome.',
    'Open seven tabs (Ctrl+T each time) with the seven addresses in the figure, in that order.',
    'Bookmark them all in one folder: right-click the tab bar → **Bookmark All Tabs…** (Firefox) or **Bookmark all tabs** (Chrome), folder name `X-Road lab`.',
  ]),
  H2('3.3 Accepting the certificate warning'),
  P('The four admin pages (tabs 1–4) use a certificate made by the server itself, so the first visit to each shows a warning. In this lab that is expected and safe, because the address is your own laptop. Accept it **once per tab**:'),
  ...table(['Browser', 'What you see', 'What to click'], [
    ['Firefox', '**Warning: Potential Security Risk Ahead**', '**Advanced…** → **Accept the Risk and Continue**'],
    ['Chrome', '**Your connection is not private**', '**Advanced** → **Proceed to cs.lab (unsafe)**'],
  ], [0.15, 0.4, 0.45]),
  ...callout('warn', 'Only for this lab', ['Never accept such a warning on a real website. Here it is safe because every lab port is bound to 127.0.0.1 (your laptop only) and you know who made the certificate.']),
  H2('3.4 Logging in'),
  ...steps([
    'Each admin page opens with a login form asking for **Username** and **Password**.',
    'Type `xrd` and `secret`, then press **Enter**.',
    'If you are idle for a while you are logged out. Just log in again: nothing is lost.',
  ]),
  ...callout('prob', null, [
    pick('**Logged out every time you switch tabs:** you are using `localhost` instead of the `.lab` names. Run `bash scripts/setup-hosts.sh` and use https://cs.lab:4000 etc.', '**Logged out every time you switch tabs:** you are using `localhost` instead of the `.lab` names. Add them (section 3.1.4) and use https://cs.lab:4000 etc.'),
    '**Page does not load at all:** the server is still starting (wait 3–5 minutes after starting the lab) or not running (`docker compose ps`).',
    '**Login refused:** check Caps Lock; the login is exactly `xrd` / `secret`.',
  ]),
  H2('3.5 Files you will handle'),
  P('You will move about 15 files between the browser and the servers. A little organisation now prevents the most common mistakes later. Make one folder per server (in a terminal):'),
  ...code(['mkdir -p ~/xroad-work/cs ~/xroad-work/ss1 ~/xroad-work/ss2 ~/xroad-work/ss3']),
  P('After every download, move the file into the right folder and rename it as below. When a dialog asks for a file, press **Ctrl+L** and paste the path.'),
  ...table(['File', 'Comes from', 'Goes to', 'Save as'], [
    ['Configuration anchor (.xml)', 'cs (step 1.8)', 'ss1, ss2, ss3 at their first login', '`~/xroad-work/cs/anchor.xml`'],
    ['Test CA certificates', pick('`fetch-ca-certs.sh` (section 3.1)', '`docker cp` commands (section 3.1.6)'), 'cs (steps 1.3, 1.4)', 'stay in `~/xroad-ls-lab/certs/`'],
    ['2 CSRs per server (.der)', 'Add key wizard on that server', 'The test CA page', '`~/xroad-work/ss1/ss1_sign.der`, `ss1_auth.der`, …'],
    ['2 certificates per server (.pem)', 'The test CA page', 'Import cert. on the same server', '`~/xroad-work/ss1/ss1_sign.pem`, `ss1_auth.pem`, …'],
    ['Management TLS certificate (.tar.gz)', 'cs (step 2.14)', 'ss1 (step 2.14)', '`~/xroad-work/cs/`, then extract `management-service.pem`'],
  ], [0.22, 0.24, 0.22, 0.32]),
  ...callout('warn', 'After a lab reset', ['Files from an earlier build do not work with a new one: the CA, the anchor and every certificate change. Empty `~/xroad-work` and fetch new CA certificates after any reset.']),
);

// ---------------------------------------------------------------------
add(H1('4. A tour of the Central Server pages'),
  P('Log in at **https://cs.lab:4000**. On a brand-new Central Server you first see the **Initial Configuration** page (step 1.1). After that, every page has the six-item menu shown below. Once Phase 1 has started, spend five minutes clicking through each menu item without changing anything, so the pages feel familiar.'),
  ...figure('csmap', 'The Central Server admin pages. Bold items are used in this guide.', 1400, 760),
  ...table(['Menu item', 'What it is for', 'Used in'], [
    ['**Members**', 'The list of organisations in the network. Click one to see its **Details**, **Subsystems** and **Management Requests**.', 'Phase 1'],
    ['**Security Servers**', 'Every registered Security Server, with its **Clients**, **Authentication Certificates** and requests.', 'Checking'],
    ['**Management Requests**', 'Every request a Security Server sends (to join, to register an application…). Pending ones have **Approve** and **Decline**. Tick **Show only pending requests** to filter.', 'Phases 2–4'],
    ['**Trust Services**', '**Certification Services** (trusted CAs, each with **OCSP Responders**) and **Timestamping Services**.', 'Phase 1'],
    ['**Global Configuration**', 'Tab **Internal Configuration**: the **Anchor**, **Download URL**, **Signing Keys**. Tab **External Configuration**: the same, for linking to other networks. **Trusted Anchors**: other networks.', 'Phase 1'],
    ['**Settings**', '**System Settings** (instance, **Member Classes**, **Management Services**), **Global Resources**, **API Keys**, **TLS Certificates**, **Backup And Restore**.', 'Phases 1–2'],
  ], [0.24, 0.62, 0.14]),
  ...callout('tip', 'Red banners at the top', ['Right after initialisation the Central Server shows red banners, e.g. that no signing key exists. They are a to-do list, not errors, and they disappear as you finish Phase 1.']),
);

add(H1('5. A tour of a Security Server’s pages'),
  P('ss1, ss2 and ss3 run the same software, so their pages look the same. On the first login you get the **Initial configuration** wizard; after that, four menu items.'),
  ...figure('ssmap', 'A Security Server’s admin pages. Bold items are used in this guide.', 1400, 780),
  ...table(['Menu item', 'What it is for'], [
    ['**Clients**', 'The owner (the ministry) and its applications (subsystems), with their status. Click a subsystem for its tabs: **Details**, **Service clients**, **Services**, **Internal servers**, **Local groups**.'],
    ['**Keys and certificates**', 'Tab **SIGN and AUTH Keys**: the safe (**softToken-0**) with **Log in**, **Add key** and **Import cert.** buttons, and below it the AUTH and SIGN keys with their requests and certificates. Tabs **API Keys** and **Security Server TLS Key**.'],
    ['**Diagnostics**', 'Tab **Overview**: health checks for **Global configuration**, **Timestamping**, **OCSP responders** and more. Green “Everything ok” is what you want. Use it as your health check after every phase.'],
    ['**Settings**', 'Tab **System Parameters**: **Configuration Anchor**, **Timestamping Services**, **Approved Certificate Authorities**, the Security Server address. Tab **Backup And Restore**.'],
  ], [0.25, 0.75]),
  H2('5.1 Status words you will meet'),
  ...table(['Where', 'Status', 'Plain meaning'], [
    ['Clients', '**SAVED**', 'Added on this server only; nobody else knows about it yet.'],
    ['Clients', '**REGISTRATION IN PROGRESS**', 'Request sent; waiting for approval on cs, then for the next signed list (1–2 minutes).'],
    ['Clients', '**REGISTERED**', 'Done: the whole network knows this client lives here.'],
    ['Keys and certificates', '**Request**', 'An application form (CSR) exists for this key; no certificate imported yet.'],
    ['Keys and certificates', '**Saved**', 'Certificate imported but not registered. Normal for an AUTH certificate before you press Register.'],
    ['Keys and certificates', '**Registration in progress** / **Registered**', 'The same idea as for clients, for the AUTH certificate.'],
    ['Keys and certificates', 'OCSP **Good**', 'The passport office confirms the ID card is valid.'],
    ['Diagnostics', '**Everything ok** (green)', 'That check is healthy. Yellow or red: read the message.'],
    ['Services', '**Out of order**', 'The default notice of a switched-off service. Switch it on with its toggle.'],
  ], [0.2, 0.32, 0.48]),
);

// =====================================================================
// PART B: THE BUILD
// =====================================================================
add(H1('6. Phase 1: Set up the Central Server'),
  P('**In the picture:** you set up the registry office. **Tab:** 1 (https://cs.lab:4000). **Time:** 30–45 minutes.'),
  P('**What you will do:** give the network its name, say which passport office (CA) and notary (TSA) to trust, list the three ministries and their applications, choose who runs the joining-request service, create the keys that sign the official list, and download the letter of introduction (anchor).'),
  ...callout('see', 'Before you start Phase 1', ['Section 3 is complete: the cs tab shows a login page, and `certs/ca.pem`, `ocsp.pem`, `tsa.pem` exist.']),
  ...step('1.1', 'Initialise the Central Server', {
    what: 'Gives the network its name and creates the safe (software token) that will hold the Central Server’s keys.',
    where: 'cs tab. The first login shows the **Initial Configuration** page instead of the menu.',
    clicks: [
      'Log in with `xrd` / `secret`.',
      'Take a screenshot of this page now: it only appears once.',
      'In the **Software Token** section, type the PIN in **PIN** and again in **Repeat PIN**.',
      'In the **Central Server Identification** section, type the **Instance Identifier** and the **Central Server Address**.',
      'Click **Submit**.',
    ],
    values: [['PIN / Repeat PIN', '`123456xrd!`'], ['Instance Identifier', '`LS-DEV`'], ['Central Server Address', '`cs`']],
    see: ['The message **The Central Server initialized! Now continue with the full configuration.** and the six-item menu. Red banners at the top are normal for now.', 'Check: **Settings → System Settings** shows Instance Identifier `LS-DEV` and Central Server Address `cs`.'],
    why: ['The instance identifier is the first part of every name in the network. `cs` is the address Security Servers use to download the official list: the container’s name inside Docker, not a name your browser knows. The PIN protects the safe that will hold the keys used to sign that list.'],
    wrong: ['**“Password confirmation does not match”:** retype both PIN fields.', '**Wrong instance identifier typed:** it cannot be changed afterwards. Reset the lab (section 13.5) and start Phase 1 again.'],
  }),
  ...step('1.2', 'Add the member class GOV', {
    what: 'Creates the category “government”, to which all three ministries belong.',
    where: '**Settings → System Settings**, the **Member Classes** section.',
    clicks: ['Click **Add**.', 'Type the **Code** and **Description**.', 'Click **Add** (or **Save**) in the dialog.'],
    values: [['Code', '`GOV`'], ['Description', '`Government ministries and agencies`']],
    see: ['The message **Member class saved.** and `GOV` in the Member Classes list.'],
    wrong: ['**Typo in the code:** delete the class (**Delete member class?** → confirm) and add it again. This only works while no member uses it.'],
  }),
  ...step('1.3', 'Trust the test CA and its OCSP responder', {
    what: 'Tells the network which passport office’s ID cards to accept, and where to check that a card is still valid.',
    before: 'the CA certificates are in `certs/` (section 3.1).',
    where: '**Trust Services** → **Certification Services**.',
    clicks: [
      'Click **Add certification service**.',
      'At **Upload the certificate file from your computer**, choose `ca.pem`: press **Ctrl+L**, paste `/home/victor/xroad-ls-lab/certs/ca.pem`, Enter. Continue.',
      'On the **CA Settings** page, leave **This CA can only be used for TLS authentication (mark if true)** unticked.',
      'In **Certificate profile info**, paste the profile name from the table below. Leave any ACME fields empty.',
      'Click **Save**. “Test CA” appears in the list.',
      'Click **Test CA** in the list, open the **OCSP Responders** tab, and click **Add**.',
      'In **Add OCSP Responder**, type the **URL** and upload `ocsp.pem` (same folder). Click **Save**.',
    ],
    values: [
      ['Certificate', '`/home/victor/xroad-ls-lab/certs/ca.pem` (its subject is “Test CA”)'],
      ['Certificate profile info', '`ee.ria.xroad.common.certificateprofile.impl.FiVRKCertificateProfileInfoProvider`'],
      ['OCSP responder URL', '`http://ca:8888`'],
      ['OCSP certificate', '`/home/victor/xroad-ls-lab/certs/ocsp.pem` (“Test OCSP”)'],
    ],
    see: ['**Trust Services** lists **Test CA**, valid until 2046. Its **OCSP Responders** tab lists `http://ca:8888`.'],
    why: ['The certificate profile tells X-Road how to read the organisation’s identity out of an ID card issued by this CA. The test CA issues Finnish-style cards, hence “FiVRK”.', 'The URL uses `ca`, the container’s name, because the Security Servers (not your browser) phone the hotline from inside Docker.'],
    wrong: ['**Upload refused:** you picked `ocsp.pem` or `tsa.pem` instead of `ca.pem`.', '**Typo in the profile name:** certificate requests fail later in Phase 2. Copy-paste it, and check it under Test CA → **CA Settings**.', '**Wrong file added:** open the certification service → **Delete trust service**, and add it again.'],
  }),
  ...step('1.4', 'Trust the time-stamping service', {
    what: 'Registers the notary that will stamp the time on every logged message.',
    where: '**Trust Services** → the **Timestamping Services** section (below Certification Services).',
    clicks: ['Click **Add**.', 'Type the **URL** and upload `tsa.pem`.', 'Click **Save**.'],
    values: [['URL', '`http://ca:8899`'], ['Certificate', '`/home/victor/xroad-ls-lab/certs/tsa.pem` (“Test TSA”)']],
    see: ['`http://ca:8899` in the Timestamping Services list.'],
  }),
  ...step('1.5', 'Add the three ministries and their applications', {
    what: 'Puts the three organisations and their applications on the official list, so their Security Servers can join later.',
    where: '**Members**.',
    clicks: [
      'Click **Add member**. Type **Member Name**, choose **Member Class** `GOV`, type **Member Code** (first row of the table). Click **Add**.',
      'Repeat for the second and third rows.',
      'Click **MCST** in the members list, open the **Subsystems** tab, click **Add subsystem**, type the **Subsystem code** `MANAGEMENT`, and click **Add**.',
      'Go back to **Members**. Do the same for MOSD (`GRANTS-PORTAL`) and MOHA (`POPULATION-REGISTRY`).',
    ],
    values: [
      ['Member Name: Ministry of Communications, Science and Technology', 'Class `GOV`, code `MCST`, subsystem `MANAGEMENT`'],
      ['Member Name: Ministry of Social Development', 'Class `GOV`, code `MOSD`, subsystem `GRANTS-PORTAL`'],
      ['Member Name: Ministry of Home Affairs', 'Class `GOV`, code `MOHA`, subsystem `POPULATION-REGISTRY`'],
    ],
    see: ['Three members in **Members**, each with one subsystem. The subsystems show no server yet; that comes in Phases 2–4.'],
    why: ['A Security Server can only join for an organisation the Central Server already knows. That is also why their names will fill in by themselves later.', 'MCST, the X-Road operator, gets a MANAGEMENT subsystem: it will provide the joining-request service.'],
    wrong: ['**Typo in a member or subsystem code:** open the member → **Delete member** (or the subsystem → **Delete Subsystem**) and add it again. Codes cannot be edited; names can (**Edit Member’s name**).'],
  }),
  ...step('1.6', 'Choose who provides the management services', {
    what: 'Says which application handles joining requests from Security Servers: MCST’s MANAGEMENT subsystem.',
    where: '**Settings → System Settings**, the **Management Services** section.',
    clicks: [
      'Next to **Service Provider Identifier**, click the pencil (**Edit**).',
      'In the **Select Subsystem** dialog, type `MCST` in **Search**, select the row whose subsystem is **MANAGEMENT**, and click **Select**.',
    ],
    see: [
      '**Service Provider Identifier** `SUBSYSTEM:LS-DEV:GOV:MCST:MANAGEMENT` and **Service Provider Name** Ministry of Communications, Science and Technology.',
      '**Management Services’ Security Server** is still empty; you fill it in at step 2.11.',
      'Write down two values shown here; you need them in Phase 2: **WSDL Address** `http://cs/managementservices.wsdl` and **Management Services Address** `https://cs:4002/managementservice/manage/`.',
    ],
    why: ['Security Servers send their joining requests as X-Road messages to this application. MCST, as the operator, provides it.'],
  }),
  ...step('1.7', 'Create the keys that sign the official list', {
    what: 'Creates the keys the Central Server signs the global configuration with. Without them nothing is published.',
    where: '**Global Configuration** → tab **Internal Configuration** → **Signing Keys** section.',
    clicks: [
      'If the token row shows **Log in**, click it and type the **Token PIN** `123456xrd!`. (In this lab it is usually already logged in.)',
      'Click **Add key**. In **Key friendly name** type `internal-signing-key`. Click **Add**.',
      'Open the **External Configuration** tab → **Signing Keys** → **Add key** → `external-signing-key` → **Add**.',
    ],
    see: ['One key under each tab. Within one or two minutes the red banners disappear (press F5).'],
    why: ['From now on the Central Server signs the official list about once a minute with the internal key, and Security Servers only accept a list with a valid signature. The external key is for linking with other X-Road networks (federation); the lab does not use it, but the Central Server expects one.'],
  }),
  ...step('1.8', 'Download the anchor', {
    what: 'Downloads the letter of introduction that every Security Server needs in order to trust this Central Server.',
    where: '**Global Configuration** → **Internal Configuration** → **Anchor** section.',
    clicks: ['Click **Download**.', 'Move the downloaded file to `~/xroad-work/cs/` and rename it `anchor.xml`.', 'Note the first few characters of the **Certificate Hash (SHA-224)** shown in the Anchor section; you will compare them in step 2.1.'],
    see: ['The Anchor section shows a hash and a **Created** time; `~/xroad-work/cs/anchor.xml` exists.'],
    why: ['The anchor holds the official list’s address (`http://cs/internalconf`) and the key that verifies its signature. Uploading it is how a Security Server decides which network to trust.'],
    wrong: ['**Anchor downloaded before step 1.7:** download it again now; an anchor made before the signing key exists cannot be used.'],
  }),
  ...callout('ok', 'Checkpoint 1', ['No red banners on the Central Server. Trust Services shows Test CA (with OCSP) and one time-stamping service. Members shows three ministries with one subsystem each. `anchor.xml` is saved.']),
  ...recap(['A named network (LS-DEV) whose registry office trusts one passport office and one notary, knows three ministries and their applications, signs its official list every minute, and has a letter of introduction ready for the mailrooms.']),
  ...ask('Phase 1', [
    ['Why can the Security Servers not simply download the official list from anyone who offers it?', 'Because they only accept a list signed with the key in their anchor. The anchor ties them to this Central Server.'],
    ['Why does the OCSP URL say `ca` and not `localhost`?', 'The Security Servers call it from inside Docker, where the CA container is reachable by its name `ca`. There, `localhost` would mean the Security Server itself.'],
    ['What would go wrong in Phase 2 if MOSD had not been added in step 1.5?', 'ss2 could not be initialised with owner MOSD (the name would not fill in) and could not join, because the Central Server only accepts known members.'],
  ]),
);

// ---------------------------------------------------------------------
// The nine registration steps for one Security Server (used for ss1, ss2 and ss3).
function securityServerSteps(s) {
  const n = (i) => `${s.prefix}${i}`;
  return [
    ...step(n(1), `Initialise ${s.ss}`, {
      what: `Gives ${s.ss} the letter of introduction (anchor), tells it which ministry owns it, and creates its safe.`,
      where: `${s.ss} tab (${s.url}). The first login opens the **Initial configuration** wizard.`,
      clicks: [
        'Log in with `xrd` / `secret`. Take a screenshot of the wizard: it only appears once.',
        '**Configuration Anchor** page: click **Upload** and choose `~/xroad-work/cs/anchor.xml`.',
        'A dialog shows **Configuration anchor details:** with **Hash (SHA-224)** and **Generated**. Check the hash starts with the characters you noted in step 1.8. Confirm.',
        `**Owner Member** page: choose **Member Class** \`GOV\` and type **Member Code** \`${s.member}\`. Wait a second: the member name fills in by itself (${s.memberName}).`,
        `Type **Security Server Code** \`${s.serverCode}\`. Continue.`,
        '**Token PIN** page: type `123456xrd!` in **PIN** and **Confirm PIN**. Click **Submit**.',
      ],
      values: [['Configuration anchor', '`~/xroad-work/cs/anchor.xml`'], ['Member Class / Member Code', `\`GOV\` / \`${s.member}\``], ['Security Server Code', `\`${s.serverCode}\``], ['PIN / Confirm PIN', '`123456xrd!`']],
      see: [`**Server initialised**, then the four-item menu. **Clients** shows owner \`${s.member}\` with status **SAVED**.`],
      why: [`From now on ${s.ss} downloads the official list from cs every minute. The owner name filled in by itself because ${s.member} is on that list (step 1.5).`],
      wrong: [`**Name does not fill in:** ${s.member} is missing on cs (step 1.5), or the list has not been published yet. Wait 1–2 minutes and retype the code.`, '**Anchor refused:** it is an old anchor from an earlier build, or one downloaded before step 1.7. Download a fresh one (step 1.8).', '**PIN refused:** it must be `123456xrd!`, the same as in docker-compose.yml.'],
    }),
    ...step(n(2), 'Unlock the safe (only if asked)', {
      what: 'Logs in to the software token so that keys can be created. In this lab it usually unlocks itself.',
      where: '**Keys and certificates** → tab **SIGN and AUTH Keys**.',
      clicks: ['If **softToken-0** shows **Log in**, or a banner says **Please enter soft token PIN**, click **Log in** and type `123456xrd!`. Otherwise do nothing.'],
      see: ['The token row shows the **Add key** and **Import cert.** buttons.'],
    }),
    ...step(n(3), 'Add the time-stamping service', {
      what: `Tells ${s.ss} which notary to use for its message log.`,
      where: '**Settings** → tab **System Parameters** → **Timestamping Services** section.',
      clicks: ['Click **Add**.', 'In **Add Timestamping Service**, select **Test TSA** and click **Add**.'],
      see: ['**Timestamping service added** and `http://ca:8899` in the list.'],
    }),
    ...step(n(4), 'Create the SIGNING key and its application form (CSR)', {
      what: `Creates ${s.member}’s signing key and the application form for its ID card.`,
      where: '**Keys and certificates** → **SIGN and AUTH Keys** → on the **softToken-0** row, click **Add key**.',
      clicks: [
        `**Key details** page: **Key label** \`${s.ss}-sign\`. Next.`,
        `**CSR details** page: **Usage** SIGNING; **Client** \`GOV:${s.member}\`; **Certification Service** Test CA; **CSR Format** **DER**. Continue.`,
        '**Generate CSR** page: fill in the fields from the table. Leave read-only (greyed-out) fields as they are. Click **Generate CSR**.',
        `The browser downloads a \`.der\` file. Move it to \`~/xroad-work/${s.ss}/\` and rename it \`${s.ss}_sign.der\`.`,
        'Click **Done**.',
      ],
      values: [
        ['Organization Name (O)', `\`${s.org}\`${s.org.includes('Communications') ? ' (**no comma**)' : ''}`],
        ['Member Code (CN)', `\`${s.member}\` (read-only)`],
        ['Subject Alternative Name (SAN)', `\`${s.ss}\``],
        ['Country Code (C) / Serial Number', `\`FI\` / \`LS-DEV/${s.serverCode}/GOV\` (read-only)`],
      ],
      see: [`Under **SIGN Keys and Certificates**, a key \`${s.ss}-sign\` with a **Request** line under it.`],
      wrong: [
        '**Signer.InternalError** when you click Generate CSR: the Organization Name contains a comma. X-Road writes the certificate subject as `C=FI, O=…, CN=…`, so a comma in the name breaks it. If a half-made key is left, click it → **Delete key?** → confirm, then repeat without the comma.',
        '**Subject Alternative Name required:** version 7.7.0 always asks for it; type the server name.',
        '**Chose PEM by mistake:** the test CA will refuse it. Delete the key and start this step again with DER.',
      ],
    }),
    ...step(n(5), 'Create the AUTHENTICATION key and its CSR', {
      what: `Creates ${s.ss}’s own key and the application form for the server’s ID card.`,
      where: 'Same place: **softToken-0** → **Add key**.',
      clicks: [
        `**Key label** \`${s.ss}-auth\`. Next.`,
        '**Usage** AUTHENTICATION (no Client is asked); **Certification Service** Test CA; **CSR Format** **DER**. Continue.',
        'Fill in the fields from the table and click **Generate CSR**.',
        `Move the download to \`~/xroad-work/${s.ss}/\`, rename it \`${s.ss}_auth.der\`, and click **Done**.`,
      ],
      values: [['Organization Name (O)', `\`${s.org}\``], ['Server DNS Name (CN)', `\`${s.ss}\``], ['Subject Alternative Name (SAN)', `\`${s.ss}\``]],
      see: [`Under **AUTH Keys and Certificates**, a key \`${s.ss}-auth\` with a **Request** line.`],
      why: [`Two ID cards, two jobs (section 2.3): the signing card belongs to the organisation ${s.member} and signs messages; the authentication card belongs to this server and proves who it is when Security Servers connect.`],
    }),
    ...step(n(6), 'Sign both CSRs at the test CA', {
      what: 'Turns the two application forms into ID cards (certificates).',
      where: 'Test CA tab (http://localhost:8888/testca/), page **Test CA: CSR signing**.',
      clicks: [
        `**CSR**: choose \`~/xroad-work/${s.ss}/${s.ss}_sign.der\`. **Type**: select **Sign**. Press **Sign**.`,
        `Move the downloaded certificate to \`~/xroad-work/${s.ss}/\` and rename it \`${s.ss}_sign.pem\`.`,
        `Again with \`${s.ss}_auth.der\`: **Type** **Auth** → **Sign** → rename the result to \`${s.ss}_auth.pem\`.`,
      ],
      see: [`Two certificates, \`${s.ss}_sign.pem\` and \`${s.ss}_auth.pem\`, in \`~/xroad-work/${s.ss}/\`.`],
      why: ['A real CA checks documents before signing. The test CA signs anything, so the lab can run on one laptop.'],
      wrong: ['**Error page from the test CA:** the CSR is PEM, not DER. Delete that key on the server and redo its step with DER.', 'Choose **Sign** or **Auth** yourself rather than **Autodetect from file name**.'],
    }),
    ...step(n(7), 'Import the certificates and activate the AUTH one', {
      what: 'Puts the ID cards into the safe next to their keys.',
      where: '**Keys and certificates** → **SIGN and AUTH Keys**.',
      clicks: [
        `On the **softToken-0** row click **Import cert.** and choose \`${s.ss}_auth.pem\`. It attaches itself to the \`${s.ss}-auth\` key.`,
        `Click the new certificate under \`${s.ss}-auth\` to open its details page. Click **Activate**. Go back.`,
        `Click **Import cert.** again and choose \`${s.ss}_sign.pem\`.`,
      ],
      see: ['**Uploading certificate succeeded** each time. The SIGN certificate shows **Registered** straight away. The AUTH certificate shows **Saved** and OCSP **Good**.'],
      wrong: ['**Certificate does not attach to a key, or the import fails:** it belongs to another server’s CSR. Use the file from this server’s folder.', '**OCSP not Good after a minute:** check the laptop clock (`timedatectl status`) and the OCSP URL from step 1.3.'],
    }),
    ...step(n(8), 'Ask to join: register the AUTH certificate', {
      what: `Sends the request “${s.ss} belongs to ${s.member}; please add it to the network”.`,
      where: `Same page, the \`${s.ss}-auth\` certificate row.`,
      clicks: ['Click **Register**.', `In **Registration request**, field **Security server DNS name or IP address**, type \`${s.ss}\`. Confirm.`],
      values: [['Security server DNS name or IP address', `\`${s.ss}\``]],
      see: ['**Certificate registration request sent successfully** and the status **Registration in progress**.'],
      why: s.first
        ? ['ss1 is the first Security Server, so its request goes straight to the Central Server.']
        : ['Unlike ss1’s, this request travels as an X-Road message through **ss1’s management services** to the Central Server. It is the first real X-Road message on your network, and the reason ss1 had to be finished first.'],
      wrong: s.first ? null : ['**Register fails with UnknownMember, AccessDenied or SslAuthenticationFailed:** the problem is on ss1. Check Phase 2 steps 2.13 (service address), 2.14 (TLS certificate) and 2.15 (access rights).'],
    }),
    ...step(n(9), 'Approve the request on the Central Server', {
      what: 'The operator confirms that the server really belongs to the ministry.',
      where: 'cs tab → **Management Requests**.',
      clicks: [
        `Find the pending request whose **Server Identifier** is \`LS-DEV:GOV:${s.member}:${s.serverCode}\`.`,
        'Click **Approve**, then confirm in **Approve management request**.',
        `Go back to the ${s.ss} tab. Wait 1–2 minutes, then press **F5** on **Clients**.`,
      ],
      see: [`On ${s.ss}: **Clients** shows \`${s.member}\` **REGISTERED**, and the AUTH certificate shows **Registered**. On cs: **Security Servers** lists ${s.serverCode}.`],
      why: ['Approval is X-Road’s trust model in action: a server joins only after the operator vouches for it.'],
      wrong: [
        `**No request appears on cs:** ${s.first ? `check that step ${n(8)} succeeded.` : 'check ss1’s Diagnostics, and that ss1’s MANAGEMENT is REGISTERED.'}`,
        '**Still “in progress” after approval:** wait another minute and press F5; the change arrives with the next signed list.',
      ],
    }),
  ];
}

const SS1 = { prefix: '2.', ss: 'ss1', url: 'https://ss1.lab:1000', member: 'MCST', memberName: 'Ministry of Communications, Science and Technology', serverCode: 'SS1', org: 'Ministry of Communications Science and Technology', first: true };
const SS2 = { prefix: '3A.', ss: 'ss2', url: 'https://ss2.lab:2000', member: 'MOSD', memberName: 'Ministry of Social Development', serverCode: 'SS2', org: 'Ministry of Social Development' };
const SS3 = { prefix: '3B.', ss: 'ss3', url: 'https://ss3.lab:3000', member: 'MOHA', memberName: 'Ministry of Home Affairs', serverCode: 'SS3', org: 'Ministry of Home Affairs' };

add(H1('7. Phase 2: ss1, the operator’s Security Server'),
  P('**In the picture:** you open the operator’s mailroom and make it carry joining requests. **Tabs:** 2 (ss1), 1 (cs), 5 (test CA). **Time:** about 60 minutes.'),
  P('**What you will do:** steps 2.1–2.9 give ss1 its ID cards and let it join the network. Steps 2.10–2.15 set up the management services on ss1, so that ss2 and ss3 can join through it in Phase 3.'),
  ...figure('certflow', 'Steps 2.1 to 2.9: getting a Security Server registered. You will repeat them for ss2 and ss3.', 1400, 560),
  ...figure('addkey', 'The Add key wizard with ss1’s values (steps 2.4 and 2.5). Mind the two red notes.', 1400, 700),
  ...securityServerSteps(SS1),
  H2('7.1 The management services'),
  P('ss1 is now a member of the network. Next, make it host the service that carries joining requests. The first attempt fails on purpose: read the “Why” box in step 2.10.'),
  ...step('2.10', 'Add the MANAGEMENT subsystem (the first try fails on purpose)', {
    what: 'Adds MCST’s MANAGEMENT application to ss1.',
    where: 'ss1 → **Clients**.',
    clicks: [
      'On the `MCST` owner row, click **Add subsystem**.',
      'Click **Select Subsystem** and pick `MANAGEMENT` from the list.',
      'Tick **Register subsystem**. Click **Add subsystem**.',
    ],
    see: ['An error mentioning **UnknownMember** and `clientReg`. **This is expected.** `MCST:MANAGEMENT` now appears in Clients with status **SAVED**.'],
    why: ['To register an application, a Security Server calls the management service `clientReg`. But MANAGEMENT is the application that provides `clientReg`, and no server hosts it yet: a chicken-and-egg problem. Step 2.11 solves it from the Central Server side.'],
  }),
  ...step('2.11', 'Register MANAGEMENT from the Central Server', {
    what: 'Tells the Central Server directly that MCST’s MANAGEMENT lives on ss1.',
    where: 'cs → **Settings → System Settings** → **Management Services** section.',
    clicks: ['Next to **Management Services’ Security Server**, click **Edit**.', 'In **Select Security Server**, choose `SS1` and click **Select**.', 'Go to the ss1 tab, wait 1–2 minutes, and press F5 on **Clients**.'],
    see: ['ss1 **Clients**: `MCST:MANAGEMENT` **REGISTERED**.'],
  }),
  ...step('2.12', 'Add the management services', {
    what: 'Loads the list of joining-request services (a WSDL file) into MANAGEMENT.',
    where: 'ss1 → **Clients** → click **MANAGEMENT** → tab **Services**.',
    clicks: ['Click **Add WSDL**.', 'Type the **URL** below and click **Add**.', 'Switch the new WSDL row’s toggle **on**.'],
    values: [['URL', '`http://cs/managementservices.wsdl`']],
    see: ['**WSDL added**. Expanding the row shows ten services such as `clientReg`, `authCertDeletion` and `ownerChange`. The toggle is on.'],
  }),
  ...step('2.13', 'Point every management service at the Central Server', {
    what: 'Replaces a placeholder address with the Central Server’s real address.',
    where: 'Same tab: click the arrow to expand the WSDL row.',
    clicks: [
      'Notice that every service’s URL is `http://INSERT_MANAGEMENT_SERVICE_ADDRESS_HERE`: a placeholder that must be replaced.',
      'Click any service, for example `clientReg`, to open its **Service Parameters**.',
      'Type the **Service URL** and **Timeout (s)** below, and tick **Verify TLS certificate**.',
      'Tick **Apply to all in WSDL** next to each of the three fields.',
      'Click **Save**.',
    ],
    values: [['Service URL', '`https://cs:4002/managementservice/manage/`'], ['Timeout (s)', '`60`'], ['Verify TLS certificate', 'ticked']],
    see: ['**Service saved**; all ten services show the cs address.'],
    wrong: ['If you skip this step, ss2 and ss3 cannot join in Phase 3.'],
  }),
  ...step('2.14', 'Trust the Central Server’s TLS certificate', {
    what: 'Lets ss1 recognise the Central Server when it connects to it over HTTPS.',
    where: 'First cs → **Settings → TLS Certificates**; then ss1 → **Clients** → **MANAGEMENT** → tab **Internal servers**.',
    clicks: [
      'On cs, in the **Management Service TLS certificate** section, click **Download certificate**. You get a `.tar.gz` file.',
      'Move it to `~/xroad-work/cs/`. Right-click it in the Files app → **Extract**. Inside is `management-service.pem`.',
      'On ss1, tab **Internal servers**, section **Information System TLS certificate**: click **Add** and upload `management-service.pem`.',
    ],
    see: ['A certificate with a **Certificate Hash** under **Information System TLS certificate**.'],
    why: ['Step 2.13 switched on TLS verification for an HTTPS address, so ss1 must know exactly which certificate the Central Server will show.'],
    wrong: ['**Cannot open the .tar.gz:** in a terminal: `cd ~/xroad-work/cs && tar -xzf *.tar.gz && ls`.'],
  }),
  ...step('2.15', 'Allow every Security Server owner to use the services', {
    what: 'Gives every ministry that owns a Security Server permission to send joining requests.',
    where: 'ss1 → **Clients** → **MANAGEMENT** → tab **Service clients**.',
    clicks: [
      'Click **Add subject**.',
      '**Member / Group** page: search for `security-server-owners` and select the global group (**Security server owners**). Next.',
      '**Services** page: tick all ten services. Click **Add Selected**.',
    ],
    see: ['**Access rights added successfully**; `security-server-owners` appears under Service clients.'],
    why: ['`security-server-owners` is a group the Central Server maintains automatically: every member that owns a Security Server. MOSD and MOHA will be in it as soon as their servers join.'],
  }),
  ...callout('ok', 'Checkpoint 2', [
    'ss1 **Clients**: `MCST` and `MCST:MANAGEMENT` both **REGISTERED**.',
    'ss1 **Keys and certificates**: `ss1-auth` and `ss1-sign` Registered, OCSP **Good**.',
    'ss1 **Diagnostics**: Global configuration and OCSP responders **Everything ok**. Timestamping may still say waiting or unknown until the first message in Phase 6; that is normal.',
  ]),
  ...recap(['The operator’s mailroom is open, holds the operator’s ID cards, and runs the joining-request service with the right address, the right TLS trust and the right permissions.']),
  ...ask('Phase 2', [
    ['Which certificate needed registering on the Central Server, and why only that one?', 'The AUTH certificate. It identifies the server, and joining means the operator vouches that this server belongs to the member. The SIGN certificate only needs to come from a trusted CA.'],
    ['Why did registering MANAGEMENT fail the first time?', 'Registering needs the `clientReg` service, which MANAGEMENT itself provides and which no server hosted yet. It was registered from the Central Server side instead.'],
    ['What would happen in Phase 3 without step 2.15?', 'ss2 and ss3 would get AccessDenied when they sent their joining requests through ss1.'],
  ]),
);

// ---------------------------------------------------------------------
add(H1('8. Phase 3: ss2 (MOSD) and ss3 (MOHA)'),
  P('**In the picture:** you open the two ministries’ mailrooms. **Tabs:** 3 (ss2), 4 (ss3), 1 (cs), 5 (test CA). **Time:** about 60 minutes.'),
  P('**What you will do:** the same nine steps as 2.1–2.9, once for ss2 (steps 3A.1–3A.9) and once for ss3 (steps 3B.1–3B.9). They are written out in full so you never need to work out the values. Only ss1 hosts management services, so steps 2.10–2.15 are not repeated.'),
  ...table(['Value', 'ss2', 'ss3'], [
    ['Admin page', 'https://ss2.lab:2000', 'https://ss3.lab:3000'],
    ['Owner: Member Class / Member Code', '`GOV` / `MOSD`', '`GOV` / `MOHA`'],
    ['Security Server Code', '`SS2`', '`SS3`'],
    ['Organization Name (O)', '`Ministry of Social Development`', '`Ministry of Home Affairs`'],
    ['Server DNS name, SAN and register address', '`ss2`', '`ss3`'],
    ['Files folder', '`~/xroad-work/ss2/`', '`~/xroad-work/ss3/`'],
  ], [0.36, 0.32, 0.32]),
  ...figure('mgmtflow', 'This time the joining request travels through ss1’s management services before it reaches cs.', 1400, 600),
  H2('8.1 ss2, the Ministry of Social Development'),
  ...securityServerSteps(SS2),
  H2('8.2 ss3, the Ministry of Home Affairs'),
  ...securityServerSteps(SS3),
  ...callout('ok', 'Checkpoint 3', ['ss2 **Clients**: `MOSD` **REGISTERED**. ss3 **Clients**: `MOHA` **REGISTERED**. All four new certificates OCSP **Good**. cs **Security Servers** lists SS1, SS2 and SS3.']),
  ...recap(['All three mailrooms are open and trusted. ss2’s and ss3’s joining requests were the first real X-Road messages on your network, carried by ss1.']),
  ...ask('Phase 3', [
    ['How did ss2’s joining request reach the Central Server?', 'As an X-Road message from ss2 to the MANAGEMENT subsystem on ss1, which checked that MOSD is in security-server-owners and passed it on to the Central Server’s management service.'],
    ['Why could you type the ministry names for ss2 and ss3 exactly as they are, but not MCST’s?', 'They contain no comma. A comma would split the certificate’s subject into the wrong fields.'],
  ]),
);

// ---------------------------------------------------------------------
add(H1('9. Phase 4: Register the ministries’ applications'),
  P('**In the picture:** you register the departments that will exchange letters. **Tabs:** 3 (ss2), 4 (ss3), 1 (cs). **Time:** 15 minutes.'),
  ...step('4.1', 'Add POPULATION-REGISTRY on ss3', {
    what: 'Tells the network that MOHA’s registry application lives behind ss3.',
    where: 'ss3 → **Clients**.',
    clicks: ['On the `MOHA` owner row, click **Add subsystem**.', 'Click **Select Subsystem** → `POPULATION-REGISTRY`.', 'Tick **Register subsystem** → click **Add subsystem**.'],
    see: ['**Client registration request sent successfully**; status **REGISTRATION IN PROGRESS**.'],
  }),
  ...step('4.2', 'Add GRANTS-PORTAL on ss2', {
    what: 'Tells the network that MOSD’s portal lives behind ss2.',
    where: 'ss2 → **Clients**.',
    clicks: ['On the `MOSD` owner row, click **Add subsystem**.', 'Click **Select Subsystem** → `GRANTS-PORTAL`.', 'Tick **Register subsystem** → click **Add subsystem**.'],
    see: ['Status **REGISTRATION IN PROGRESS**.'],
  }),
  ...step('4.3', 'Approve both on the Central Server', {
    where: 'cs → **Management Requests**.',
    clicks: [
      'Find the two pending requests: one for client `LS-DEV:GOV:MOHA:POPULATION-REGISTRY` from SS3, one for `LS-DEV:GOV:MOSD:GRANTS-PORTAL` from SS2.',
      'Click **Approve** on each and confirm.',
      'Wait 1–2 minutes, then press F5 on the Clients page of ss2 and of ss3.',
    ],
    see: ['Both subsystems **REGISTERED**.'],
    why: ['The official list now records which application lives on which server. That is how ss2 will know to send requests for MOHA/POPULATION-REGISTRY to ss3.'],
  }),
  ...step('4.4', 'Set GRANTS-PORTAL’s connection type to HTTP', {
    what: 'Lets the portal talk to ss2 in plain HTTP, as this lab’s portal does.',
    where: 'ss2 → **Clients** → **GRANTS-PORTAL** → tab **Internal servers**.',
    clicks: ['Under **Connection type**, choose **HTTP**.', 'Save if asked.'],
    see: ['**Connection type updated**.'],
    why: ['The portal sends plain HTTP to `http://ss2:8080`. With the default (HTTPS), ss2 would refuse it with **SslAuthenticationFailed**. A real deployment keeps HTTPS and gives ss2 the application’s TLS certificate.'],
  }),
  ...callout('ok', 'Checkpoint 4', ['ss2: `MOSD:GRANTS-PORTAL` **REGISTERED**, connection type HTTP. ss3: `MOHA:POPULATION-REGISTRY` **REGISTERED**.']),
  ...recap(['Both ministries’ applications are known to the network and attached to their mailrooms.']),
);

add(H1('10. Phase 5: Publish MOHA’s services'),
  P('**In the picture:** MOHA opens two counters and decides who may use them. **Tab:** 4 (ss3) → **Clients** → **POPULATION-REGISTRY**. **Time:** 15–20 minutes.'),
  ...step('5.1', 'Add the REST service (population-api)', {
    what: 'Publishes the registry’s REST interface: the full record, and the vital status only.',
    where: 'Tab **Services**.',
    clicks: ['Click **Add REST**.', 'For **URL type** choose **OpenAPI 3 Description**.', 'Type the **URL** and **Service Code** below. Click **Add**.'],
    values: [['URL', '`http://moha-registry:8000/openapi.yaml`'], ['Service Code', '`population-api`']],
    see: ['**OpenApi3 service added**. Expand the row: **Service URL** `http://moha-registry:8000/api`. Click the service → tab **Endpoints**: `GET /citizens/*` and `GET /citizens/*/vital-status`.'],
    why: ['ss3 reads the real address from the description’s `servers:` line and creates one endpoint per path. The URL only works from ss3, because `moha-registry` exists only on MOHA’s private network. That is the point: nobody else can reach the registry directly.'],
    wrong: ['**ss3 cannot fetch the URL:** the registry container is not running. Run `docker compose ps`, then `docker compose start moha-registry`.'],
  }),
  ...step('5.2', 'Add the SOAP service (verifyIdentity)', {
    what: 'Publishes the identity check that answers “do these details match?” without revealing the record.',
    where: 'Same tab.',
    clicks: ['Click **Add WSDL**, type the **URL**, and click **Add**.'],
    values: [['URL', '`http://moha-registry:8000/soap/population.wsdl`']],
    see: ['**WSDL added**; service `verifyIdentity.v1` with URL `http://moha-registry:8000/soap`.'],
  }),
  ...step('5.3', 'Switch both on', {
    clicks: ['New services start switched off and show **Out of order**. Switch the toggle **on** for the REST row and for the WSDL row.'],
    see: ['**Service description enabled** twice.'],
  }),
  ...step('5.4', 'Allow GRANTS-PORTAL, and only GRANTS-PORTAL', {
    what: 'MOHA decides who may use its counters.',
    where: 'Tab **Service clients**.',
    clicks: [
      'Click **Add subject**.',
      '**Member / Group** page: search `GRANTS-PORTAL` and select `LS-DEV:GOV:MOSD:GRANTS-PORTAL`. Next.',
      '**Services** page: tick `population-api` and `verifyIdentity`. Click **Add Selected**.',
    ],
    see: ['**Access rights added successfully**. Click GRANTS-PORTAL in the list: both services appear under **Access Rights Given**.'],
    why: ['The **provider** decides. MOHA chooses on its own ss3 who may use its data; MOSD cannot give itself access. REST access can even be limited to a single endpoint (experiment 12.2).'],
  }),
  ...callout('ok', 'Checkpoint 5', ['On ss3 both services are switched on, and GRANTS-PORTAL has access to `population-api` and `verifyIdentity`. **Wait 1–2 minutes** before Phase 6.']),
  ...recap(['MOHA’s registry is reachable through X-Road, but only by MOSD’s Grants Portal, and only for these two services.']),
  ...ask('Phases 4 and 5', [
    ['Who decided that GRANTS-PORTAL may call MOHA’s services, and on which server?', 'MOHA, on its own Security Server, ss3.'],
    ['Why can your browser not open `http://moha-registry:8000/openapi.yaml`?', 'The name `moha-registry` only exists on MOHA’s private Docker network, and only ss3 is on that network.'],
    ['What would the portal see if step 4.4 had been skipped?', 'SslAuthenticationFailed from ss2, because the portal speaks plain HTTP.'],
  ]),
);

// ---------------------------------------------------------------------
add(H1('11. Phase 6: Test everything in the browser'),
  P('**In the picture:** the first real letters between the ministries. **Tabs:** 6 (portal), 7 (audit), 3 and 4 (Diagnostics). **Time:** 15–20 minutes.'),
  ...figure('request', 'What happens on one click of “Check pension eligibility”.', 1400, 820),
  H2('11.1 The Grants Portal'),
  P('Open **http://localhost:8500**. The page is titled **Grants Portal · Old Age Pension intake**. The **Applicant** form has **National ID**, **Date of birth**, **First name**, **Surname** and **Officer (X-Road userId)**, and four buttons:'),
  ...table(['Button', 'X-Road calls it makes', 'Shows'], [
    ['**Check pension eligibility**', 'SOAP verifyIdentity + REST getCitizen', 'A decision, ELIGIBLE or REJECT, with reasons'],
    ['**Verify identity**', 'SOAP verifyIdentity only', 'Match or no match, without revealing the record'],
    ['**Look up record**', 'REST `GET /citizens/{id}`', 'The full citizen record'],
    ['**Vital status only**', 'REST `GET /citizens/{id}/vital-status`', 'Alive or deceased only'],
  ], [0.3, 0.38, 0.32]),
  P('**Do this:**'),
  ...steps([
    'Click **Sample applicants (synthetic data)** to open the list, and click **Use** next to **Thabo Letsie**. The form fills in.',
    'Click **Check pension eligibility**.',
    'Read the green result: **Eligible for Old Age Pension**, with four ticks: identity details match the register, recorded as alive, Mosotho citizen, and age at least 70.',
    'Scroll down to **X-Road trace**: two green entries, one SOAP and one REST, each with a status and a time in milliseconds.',
    'Click an entry to expand it. **Request** shows what the portal sent to ss2 (note the `X-Road-Client` header). **Response headers added by X-Road** shows headers such as `X-Road-Id` and `X-Road-Request-Hash`, added by the Security Servers. **Response body** is MOHA’s answer.',
    'Repeat with every sample applicant and compare with the table below.',
  ]),
  ...table(['Applicant', 'Expected result', 'Why'], [
    ['Mpho Mokoena', '**ELIGIBLE**', 'all four conditions met'],
    ['Thabo Letsie', '**ELIGIBLE**', 'all four conditions met'],
    ['Lineo Ramakatane', 'REJECT', 'born 1990, too young'],
    ['Teboho Mofokeng', 'REJECT', 'recorded as deceased'],
    ['Unknown Person (999999999999)', 'REJECT, not in the register', 'MOHA has no such citizen; the registry’s “not found” answer passes through unchanged'],
  ], [0.32, 0.28, 0.4]),
  ...callout('prob', null, ['**Red trace with UnknownService or UnknownMember:** the Phase 5 changes have not reached ss2 yet. Wait two minutes and try again.', '**Red trace with a “Fix:” hint:** follow the hint; the portal recognises the common X-Road errors.', '**“Could not reach consumer Security Server”:** ss2 is stopped. Run `docker compose ps`.']),
  H2('11.2 The registry’s audit page: MOHA’s view'),
  P('Open **http://localhost:8001/audit**; it refreshes itself every 5 seconds. Each pension check adds two rows. Columns: **Time**, **API** (REST/SOAP), **Operation**, **National ID**, **X-Road client**, **User**, **Message ID**, **Outcome**.'),
  ...callout('why', null, ['The **X-Road client** value `LS-DEV/GOV/MOSD/GRANTS-PORTAL` was added by ss3 after it checked ss2’s signature, so MOHA can trust it. **User** `officer.ntsane` comes from the portal’s Officer field. MOHA can see exactly which ministry, application and officer asked about which citizen: that is the X-Road audit trail.']),
  H2('11.3 The Security Servers’ health'),
  ...steps(['ss2 → **Diagnostics** → **Overview**: **Global configuration**, **Timestamping** and **OCSP responders** all show **Everything ok**.', 'The same on ss3. Time-stamping turns green once messages have been logged, which your tests just did.']),
  ...callout('ok', 'Checkpoint 6', ['Thabo Letsie is **ELIGIBLE** with two green traces; all five samples are as in the table; the audit page shows the verified caller; Diagnostics are green on ss2 and ss3. **Your X-Road network works end to end.**']),
  ...pick(callout('tip', 'Optional: the automated check', ['In a terminal, `bash tests/smoke-test.sh` runs seven checks, including that the portal cannot bypass X-Road. Expect `7 passed, 0 failed`.']),
    [...callout('tip', 'Optional: check from the terminal', ['Your laptop can play the portal through ss2’s consumer port. The first command returns Thabo Letsie’s record as JSON; the second lists what GRANTS-PORTAL may call. The automated version of these checks is `bash tests/smoke-test.sh` (expect `7 passed, 0 failed`).']),
      ...code(['curl -H "X-Road-Client: LS-DEV/GOV/MOSD/GRANTS-PORTAL" \\', '  http://localhost:2080/r1/LS-DEV/GOV/MOHA/POPULATION-REGISTRY/population-api/citizens/150319480002', 'curl -H "X-Road-Client: LS-DEV/GOV/MOSD/GRANTS-PORTAL" \\', '  http://localhost:2080/r1/LS-DEV/GOV/MOHA/POPULATION-REGISTRY/allowedMethods'])]),
  ...recap(['A working X-Road network: MOSD’s portal checks pension applicants against MOHA’s register through two Security Servers, with every message signed, permission-checked, logged and time-stamped.']),
  ...ask('Phase 6', [
    ['In the trace, which headers were added by X-Road rather than by the portal or the registry?', 'The response headers starting with `X-Road-`, for example `X-Road-Id` and `X-Road-Request-Hash`.'],
    ['Why does Teboho Mofokeng get REJECT even though the identity check passes?', 'The REST record says he is deceased, so the “recorded as alive” condition fails.'],
    ['How does MOHA know who asked about a citizen?', 'From the verified X-Road client and the user ID in each request, recorded on its audit page and in both Security Servers’ signed, time-stamped message logs.'],
  ]),
);

// =====================================================================
// PART C
// =====================================================================
function experiment(n, title, { predict, doIt, see, learn, undo }) {
  return [H2(`12.${n}  ${title}`),
    P(`**Predict first:** ${predict}`),
    P('**Do it:**'), ...steps(doIt),
    ...callout('see', null, [].concat(see)),
    P(`**What it teaches:** ${learn}`),
    P('**Undo it, then check that the portal works again:**'), ...steps(undo)];
}
add(H1('12. Break it to learn it'),
  P('Each experiment changes one thing. **Write down your prediction first**, try it, and read the error in the portal (each failed trace shows the error and a **Fix:** hint). Then undo the change and confirm that **Check pension eligibility** works again before the next experiment. Changes on ss2 and ss3 take effect within seconds.'),
  ...callout('tip', 'Screenshots for your report', ['Take a screenshot of each broken state. They are the clearest evidence that you understand how access, services and connections are controlled.']),
  ...experiment(1, 'Take away access to the REST service', {
    predict: 'which of the two calls in a pension check will fail?',
    doIt: ['ss3 → **Clients → POPULATION-REGISTRY** → tab **Service clients** → click `GRANTS-PORTAL`.', 'Remove the access right for `population-api` only (keep `verifyIdentity`).', 'Portal: **Check pension eligibility** for Thabo Letsie.'],
    see: ['The SOAP trace stays green; the REST trace is red with **AccessDenied** and the hint “ss3 has not granted GRANTS-PORTAL access to this service…”. No decision can be made.'],
    learn: 'access is granted per service, by the provider, and checked on the provider’s Security Server.',
    undo: ['Same page → **Add service** → tick `population-api` → **Add Selected**.'],
  }),
  ...experiment(2, 'Minimal disclosure: allow the vital-status endpoint only', {
    predict: 'can the portal still learn whether a person is alive? Can it see their record?',
    doIt: [
      'Remove `population-api` from GRANTS-PORTAL’s access rights (as in 12.1).',
      'ss3 → **POPULATION-REGISTRY → Services** → expand the REST row → click `population-api` → tab **Endpoints**.',
      'Open the access rights of `GET /citizens/*/vital-status` → **Add subjects** → select GRANTS-PORTAL → **Add Selected**.',
      'Portal: Thabo Letsie → **Vital status only**, then **Look up record**.',
    ],
    see: ['**Vital status only** works; **Look up record** fails with **AccessDenied**.'],
    learn: 'X-Road can grant access to a single endpoint, so a ministry shares only the data a purpose needs.',
    undo: ['Remove the endpoint-level right, then give `population-api` back at service level (as in the 12.1 undo).'],
  }),
  ...experiment(3, 'Switch off the SOAP service', {
    predict: 'what does a caller see when a provider takes a service offline?',
    doIt: ['ss3 → **POPULATION-REGISTRY → Services** → switch the WSDL row’s toggle **off**.', 'In **Disable notice** type `Maintenance until 14:00` → OK.', 'Portal: **Verify identity**.'],
    see: ['**ServiceDisabled**, with your notice text.'],
    learn: 'a provider can take a service offline without deleting it, and tell callers why.',
    undo: ['Switch the toggle back **on**.'],
  }),
  ...experiment(4, 'The registry goes down', {
    predict: 'which part will X-Road blame?',
    doIt: ['This one uses the terminal: `docker compose stop moha-registry`.', 'Portal: **Check pension eligibility**.'],
    see: ['Both traces red, with **ServiceFailed** or a network error reported from ss3, the provider side.'],
    learn: 'X-Road error codes say where in the chain a failure happened: ClientProxy = the caller’s Security Server, ServerProxy = the provider’s Security Server, ServiceFailed = the application behind it.',
    undo: ['Run `docker compose start moha-registry`, wait a few seconds, and test again.'],
  }),
  ...experiment(5, 'Wrong connection type on the caller’s side', {
    predict: 'will the request even leave ss2?',
    doIt: ['ss2 → **Clients → GRANTS-PORTAL → Internal servers** → set **Connection type** to **HTTPS**.', 'Portal: any button.'],
    see: ['**SslAuthenticationFailed**, with the hint “Connection type mismatch…”.'],
    learn: 'the connection type controls how an application must connect to its own Security Server; ss2 refuses before anything is sent.',
    undo: ['Set **Connection type** back to **HTTP**.'],
  }),
  ...experiment(6, 'Wrong surname', {
    predict: 'does the portal learn the correct surname?',
    doIt: ['Portal: **Use** Thabo Letsie, change **Surname** to `Letsi`, click **Check pension eligibility**.'],
    see: ['The identity check answers “no match”, naming the surname as the field that does not match; the decision is **REJECT**.'],
    learn: 'verification without disclosure: MOHA confirms or denies the details without revealing the true record.',
    undo: ['Nothing to undo: click **Use** again.'],
  }),
);

// =====================================================================
// PART D
// =====================================================================
add(H1('13. When things go wrong'),
  H2('13.1 A method that works'),
  ...steps([
    '**Stop and read** the message or status. X-Road error names usually say which part complained: ClientProxy = ss2, ServerProxy = ss3, ServiceFailed = the registry.',
    '**Check Diagnostics** on the server involved: Global configuration, OCSP and Timestamping should say **Everything ok**.',
    '**Check Management Requests** on cs: is something still waiting for approval?',
    '**Wait two minutes and press F5** after any change on cs.',
    '**Change one thing at a time**, then test again.',
  ]),
  H2('13.2 Symptoms and fixes'),
  ...table(['What you see', 'Likely cause', 'Fix'], [
    ['Logged out whenever you switch tabs', 'Using `localhost` for several admin pages', 'Use the `.lab` addresses (section 3.2)'],
    ['Page will not load', 'Server still starting, or stopped', 'Wait 3–5 min; `docker compose ps`'],
    ['Owner name does not fill in (initialisation)', 'Member not on cs, or list not published yet', 'Check cs **Members**; wait 1–2 min'],
    ['Anchor refused (initialisation)', 'Old anchor from an earlier build', 'Download a fresh anchor (1.8)'],
    ['**Signer.InternalError** on Generate CSR', 'Comma in **Organization Name (O)**', 'Remove the comma; delete the half-made key'],
    ['Test CA shows an error', 'CSR in PEM format', 'Create the key again with **CSR Format** DER'],
    ['Imported certificate does not attach to a key', 'Certificate from another server’s CSR', 'Import the file from this server’s folder'],
    ['OCSP not Good', 'Clock wrong, or wrong OCSP URL', '`timedatectl status`; check step 1.3'],
    ['AUTH certificate stuck in **Registration in progress**', 'Not approved on cs, or ss1’s management services not working', 'Approve on cs; check steps 2.13–2.15'],
    ['**UnknownMember … clientReg** on ss1', 'Expected the first time (2.10)', 'Step 2.11'],
    ['**UnknownMember / AccessDenied / SslAuthenticationFailed** when ss2 or ss3 register', 'ss1’s management services incomplete', 'Steps 2.13, 2.14, 2.15'],
    ['“certificate is not yet valid”, time-stamp errors', 'Laptop clock wrong (e.g. just booted from Windows)', 'Wait for NTP sync; `timedatectl status`'],
    ['**UnknownService** right after Phase 5', 'The change has not reached ss2 yet', 'Wait 1–2 minutes'],
    ['Portal: “Could not reach consumer Security Server”', 'ss2 stopped or not initialised', '`docker compose ps`; check the ss2 admin page'],
    ['ss3 cannot add the OpenAPI or WSDL', 'moha-registry not running', '`docker compose start moha-registry`'],
  ], [0.36, 0.34, 0.30]),
  H2('13.3 Stopping and resuming'),
  ...table(['When', 'Do'], [
    ['End of a session', 'Terminal, in the lab folder: `docker compose stop`. All configuration is kept, and shutting down or rebooting is then safe.'],
    ['Start of the next session', 'Terminal: `docker compose start`, wait 3–5 minutes, check `timedatectl status`. Browser: open your bookmarked tabs, log in, and glance at **Diagnostics** on each Security Server.'],
    ['Never', '`docker compose down -v`: it deletes every volume, i.e. everything in this guide.'],
  ], [0.25, 0.75]),
  H2('13.4 Undoing common mistakes'),
  ...table(['Mistake', 'How to undo it'], [
    ['Wrong member code or subsystem code on cs', 'cs → **Members** → the member → **Delete member** (or the subsystem → **Delete Subsystem**), then add it correctly. Only possible while nothing is registered for it.'],
    ['Wrong key or CSR on a Security Server', '**Keys and certificates** → click the key → delete it (**Delete key?** → confirm). Then run the Add key wizard again.'],
    ['Wrong certificate imported', 'Click the certificate → delete it (**Delete certificate?** → confirm). Import the right file.'],
    ['A request declined by mistake', 'Declined requests are not repeated automatically: on the Security Server, press **Register** again.'],
    ['Wrong subsystem added on a Security Server', '**Clients** → the subsystem → **Unregister client** (if it is registered), then **Delete client**. Add the right one.'],
    ['Wrong service URL or service code (Phase 5)', '**Services** → expand → **Edit URL**, or delete the service description and add it again.'],
    ['A whole server is in a muddle', 'Easiest: reset the whole lab and start again (13.5). With practice the rebuild is quick.'],
  ], [0.32, 0.68]),
  H2('13.5 Starting again'),
  P('**Reset everything** (deletes all configuration; run in the lab folder):'),
  ...code(['docker compose down -v', 'rm -f certs/*.pem', 'docker compose up -d', '# then repeat section 3.1 (new CA certificates) and start again at Phase 1']),
  P('**Return to a saved working state** if you made a backup (for example `~/xroad-backup/lab-working-2026-10-03.tar.gz`):'),
  ...code(['bash ~/xroad-backup/restore.sh']),
  ...callout('warn', 'After either one', ['Empty `~/xroad-work`: old anchors and certificates do not match the new or restored network.']),
  H2('13.6 Housekeeping'),
  ...bullets([
    '**API keys:** keys created for scripted work can be revoked on cs under **Settings → API Keys**, and on each Security Server under **Keys and certificates** → tab **API Keys**.',
    '**Keep your anchor** (`~/xroad-work/cs/anchor.xml`): you need it again only if a Security Server is rebuilt.',
  ]),
);

add(H1('14. Progress checklist'),
  P('Print this page and tick each box as you go.'),
  H3('Getting ready'),
  ...checks([pick('Preflight passes; host names set; 7 containers Up', 'Laptop checks pass (3.1.2); host names set (3.1.4); 7 containers Up (3.1.5)'), pick('Certificates fetched into `certs/`', 'Certificates copied into `certs/` (3.1.6)'), '`~/xroad-work` folders made; seven tabs open and bookmarked; certificate warnings accepted']),
  H3('Phase 1: Central Server'),
  ...checks(['1.1 Initialised (LS-DEV, cs)', '1.2 Member class GOV', '1.3 Test CA + OCSP `http://ca:8888`', '1.4 TSA `http://ca:8899`', '1.5 MCST, MOSD, MOHA + subsystems', '1.6 Management services provider MCST:MANAGEMENT', '1.7 Internal and external signing keys', '1.8 Anchor downloaded; no red banners']),
  H3('Phase 2: ss1'),
  ...checks(['2.1–2.3 Initialised, safe unlocked, TSA added', '2.4–2.6 SIGN and AUTH CSRs signed', '2.7–2.9 Imported, activated, registered, approved: MCST REGISTERED', '2.10–2.11 MANAGEMENT REGISTERED', '2.12–2.15 WSDL, service address, TLS certificate, access rights']),
  H3('Phase 3: ss2 and ss3'),
  ...checks(['3A.1–3A.9 ss2: MOSD REGISTERED', '3B.1–3B.9 ss3: MOHA REGISTERED']),
  H3('Phases 4 to 6'),
  ...checks(['4.1–4.4 GRANTS-PORTAL and POPULATION-REGISTRY REGISTERED; connection type HTTP', '5.1–5.4 REST and SOAP services on; GRANTS-PORTAL has access', '11.1 Portal results correct for all five samples', '11.2–11.3 Audit page shows the verified caller; Diagnostics green']),
  H3('Break it to learn it'),
  ...checks(['12.1 Access denied', '12.2 Endpoint-only access', '12.3 Service switched off', '12.4 Registry down', '12.5 Connection type', '12.6 Wrong surname']),
);

add(H1('15. Quick reference'),
  H2('15.1 Addresses and logins'),
  ...table(['What', 'Address', 'Login'], [
    ['Central Server', 'https://cs.lab:4000', 'xrd / secret'],
    ['ss1 · ss2 · ss3', 'https://ss1.lab:1000 · https://ss2.lab:2000 · https://ss3.lab:3000', 'xrd / secret'],
    ['Test CA signing page', 'http://localhost:8888/testca/', '—'],
    ['Grants Portal', 'http://localhost:8500', '—'],
    ['Registry audit page', 'http://localhost:8001/audit', '—'],
    ['Token PIN, everywhere', '`123456xrd!`', '—'],
  ], [0.25, 0.55, 0.2]),
  H2('15.2 Addresses you type into the admin pages'),
  ...table(['Typed where', 'Address'], [
    ['cs: OCSP responder (1.3)', '`http://ca:8888`'],
    ['cs: time-stamping service (1.4)', '`http://ca:8899`'],
    ['ss1: management services WSDL (2.12)', '`http://cs/managementservices.wsdl`'],
    ['ss1: management service address (2.13)', '`https://cs:4002/managementservice/manage/`'],
    ['ss3: REST description (5.1)', '`http://moha-registry:8000/openapi.yaml`'],
    ['ss3: WSDL (5.2)', '`http://moha-registry:8000/soap/population.wsdl`'],
  ], [0.45, 0.55]),
  P('The names `ca`, `cs` and `moha-registry` exist only inside Docker. They are used by the servers, not by your browser, so they will not open in a tab.'),
  H2('15.3 Glossary'),
  ...table(['Word', 'Plain meaning'], [
    ['Access right', 'Permission, set by the provider, for a subsystem to use a service (or one endpoint of it).'],
    ['Anchor', 'The letter of introduction: the Central Server’s address and the key that verifies its signed list.'],
    ['AUTH certificate', 'The ID card of a Security Server, used when Security Servers connect to each other.'],
    ['CA', 'Certificate Authority: the passport office that signs certificates.'],
    ['Certificate', 'An ID card: a public key plus whose it is, signed by a CA.'],
    ['Central Server', 'The registry office: keeps and signs the official list of who is who.'],
    ['CSR', 'Certificate Signing Request: the application form for a certificate.'],
    ['DER / PEM', 'Two file formats for the same certificate data: binary (DER) and text (PEM).'],
    ['Endpoint', 'One method and path of a REST service, e.g. `GET /citizens/*/vital-status`.'],
    ['Global configuration', 'The signed official list every Security Server downloads each minute.'],
    ['Management services', 'The operator’s service (on ss1) that carries joining and registration requests to the Central Server.'],
    ['Member', 'An organisation in the network, e.g. MOHA.'],
    ['OCSP', 'The hotline that confirms a certificate has not been cancelled.'],
    ['Security Server', 'An organisation’s mailroom: signs, encrypts, checks permissions, logs.'],
    ['Service', 'Something a subsystem offers, e.g. `population-api`.'],
    ['SIGN certificate', 'The ID card of an organisation, used to sign its messages.'],
    ['Subsystem', 'One application of a member; the thing permissions are given to.'],
    ['Token, PIN', 'The safe holding a server’s keys, and its combination.'],
    ['TSA', 'Time-Stamping Authority: the notary that stamps the time on logged messages.'],
  ], [0.25, 0.75]),
);

add(H1('Appendix A. Model answers'),
  P('Compare these with your own answers to the “Check your understanding” questions. Different words are fine; the idea is what matters.'),
  ...QUIZ.flatMap(([phase, items]) => [H3(phase), ...items.flatMap(([q, a]) => [P(`**${q}**`), P(a)])]),
);

save(k, path.resolve(__dirname, pick('../XRoad-Lab-Browser-Guide.docx', '../XRoad-Lab-Browser-Guide-Explicit-Commands.docx')), {
  title: pick('X-Road LS-DEV Lab: The Browser Guide', 'X-Road LS-DEV Lab: The Browser Guide (explicit commands)'),
  header: pick('X-Road LS-DEV lab · Browser guide', 'X-Road LS-DEV lab · Browser guide · explicit commands'),
  creator: 'Motlatsi Victor Mpahane',
});
