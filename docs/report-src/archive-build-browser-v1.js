// Builds docs/XRoad-Lab-Browser-Guide.docx (browser route only).
// Run from docs/report-src:  node build-browser.js
// Screen labels in bold come from X-Road 7.7.0's own English UI text (extracted from the admin jars).
const path = require('path');
const { newDoc, save, C, Paragraph, TextRun, BorderStyle } = require('./lib');

// --explicit: the "explicit commands" edition, where section 3.1 spells out every command the
// lab scripts would run, and other mentions of the scripts point to those commands instead.
const EXPLICIT = process.argv.includes('--explicit');
const pick = (scripts, explicit) => (EXPLICIT ? explicit : scripts);

const k = newDoc();
const { add, P, note, H1, H2, H3, bullets, steps, checks, code, table, callout, figure } = k;

function terminalStepsScripts() {
  return [
    H2('3.1 The only terminal steps'),
    P('Three things cannot be done in a browser: starting the containers, adding the lab host names, and copying the CA certificates out of their container. Open a terminal (**Ctrl+Alt+T**) and run, from the lab folder:'),
    ...code([
      'cd ~/xroad-ls-lab',
      'bash scripts/preflight.sh          # checks the laptop; fix any FAIL line it prints',
      'bash scripts/setup-hosts.sh        # adds cs.lab, ss1.lab, ss2.lab, ss3.lab (asks for your password)',
      'docker compose up -d --build       # starts the 7 containers (first time: several GB download)',
      'bash scripts/fetch-ca-certs.sh     # writes certs/ca.pem, certs/ocsp.pem, certs/tsa.pem',
    ]),
    ...table(['Command', 'Why it is needed'], [
      ['`setup-hosts.sh`', 'Gives each admin page its own name. Browsers keep one login cookie per name, so with plain `localhost` logging in to ss2 would log you out of ss1.'],
      ['`docker compose up -d --build`', 'Starts cs, ca, ss1, ss2, ss3, mosd-portal and moha-registry. The X-Road servers need 3–5 minutes to be ready after this.'],
      ['`fetch-ca-certs.sh`', 'The test CA’s three certificates are needed in Phase 1. They live inside the ca container; this copies them to the `certs/` folder so the browser can upload them.'],
    ], [0.32, 0.68]),
    ...callout('warn', 'Check the clock', ['Certificates, OCSP and time-stamps all depend on the time. If you just booted from Windows, run `timedatectl status` and wait for **System clock synchronized: yes** before you start.']),
  ];
}

function terminalStepsExplicit() {
  return [
    H2('3.1 The terminal steps, command by command'),
    P('Four things cannot be done in a browser: checking the laptop, adding the lab host names, starting the containers, and copying the CA certificates out of their container. The lab folder has scripts for these (`scripts/preflight.sh`, `setup-hosts.sh`, `fetch-ca-certs.sh`, `install-docker.sh`). This edition shows **the individual commands those scripts run**, so you type each one yourself and see what it does. The result is the same either way.'),
    P('Open a terminal with **Ctrl+Alt+T**. Type each line in a grey box and press **Enter**. Lines starting with `#` are comments: do not type them.'),

    H3('3.1.1 Go to the lab folder'),
    ...code(['cd ~/xroad-ls-lab', 'pwd', 'ls']),
    ...callout('see', null, ['`pwd` prints `/home/victor/xroad-ls-lab`; `ls` lists `docker-compose.yml`, `README.md`, `certs`, `docs`, `moha-registry`, `mosd-portal`, `scripts`, `tests`. Every later command assumes you are in this folder.']),

    H3('3.1.2 Check the laptop (what preflight.sh checks)'),
    ...table(['Check', 'Command', 'You want'], [
      ['Ubuntu version', '`grep PRETTY_NAME /etc/os-release`', '`Ubuntu 26.04 LTS`'],
      ['CPU threads', '`nproc`', '4 or more'],
      ['Memory and swap', '`free -h`', '**Mem** total about 15 GB or more; with 8–15 GB, **Swap** of at least 4 GB'],
      ['Disk space for Docker', '`df -h /var/lib/docker`', '**Avail** 25 GB or more'],
      ['Clock', '`timedatectl status`', '**System clock synchronized: yes**'],
      ['Docker without sudo', '`docker info --format \'{{.ServerVersion}}\'`', 'a version number (e.g. `29.5.2`), no “permission denied”'],
      ['Compose', '`docker compose version`', '`Docker Compose version 2.x`'],
      ['Your groups', '`id -nG`', 'the word `docker` in the list'],
    ], [0.22, 0.42, 0.36]),
    P('**Lab ports free?** The containers need 13 ports. This prints any program already listening on one of them; **no output** means all are free:'),
    ...code(["ss -ltn | grep -E ':(1000|1080|1443|2000|2080|2443|3000|3080|3443|4000|8001|8500|8888)\\b'"]),
    ...callout('prob', null, [
      '**docker: command not found:** Docker is not installed yet; see 3.1.3.',
      '**permission denied … docker.sock:** you are not in the `docker` group yet, or have not logged out and in since being added. Run `sudo usermod -aG docker $USER`, then log out and back in.',
      '**Cannot connect to the Docker daemon:** start it with `sudo systemctl start docker`.',
      '**Clock not synchronized:** connect to the internet, then `sudo timedatectl set-ntp true`, and wait until `timedatectl status` says yes.',
      '**Little swap on a 8–15 GB laptop:** `sudo fallocate -l 8G /swap.img && sudo chmod 600 /swap.img && sudo mkswap /swap.img && sudo swapon /swap.img`.',
      '**A port is listed:** `sudo ss -ltnp | grep <port>` shows which program holds it; stop that program.',
      '**Low disk space:** `sudo apt clean` and `docker system prune`.',
    ]),

    H3('3.1.3 Only if Docker is not installed: install it (what install-docker.sh does)'),
    P('Skip this if `docker info` worked above. Otherwise run these blocks in order. They need internet and your password.'),
    P('**a) Remove Ubuntu’s own Docker packages**, which conflict with Docker’s official ones (“not installed” messages are fine):'),
    ...code(['sudo apt-get remove -y docker.io docker-compose docker-compose-v2 docker-doc docker-buildx podman-docker containerd runc']),
    P('**b) Add Docker’s package source and its signing key**, so apt can check that the packages really come from Docker:'),
    ...code([
      'sudo apt-get update',
      'sudo apt-get install -y ca-certificates curl',
      'sudo install -m 0755 -d /etc/apt/keyrings',
      'sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc',
      'sudo chmod a+r /etc/apt/keyrings/docker.asc',
      '. /etc/os-release',
      'sudo tee /etc/apt/sources.list.d/docker.sources >/dev/null <<EOF',
      'Types: deb',
      'URIs: https://download.docker.com/linux/ubuntu',
      'Suites: ${UBUNTU_CODENAME:-$VERSION_CODENAME}',
      'Components: stable',
      'Architectures: $(dpkg --print-architecture)',
      'Signed-By: /etc/apt/keyrings/docker.asc',
      'EOF',
      'sudo apt-get update',
    ]),
    P('The block from `sudo tee` to `EOF` is one command: paste it all at once. `. /etc/os-release` loads your Ubuntu code name, which fills in **Suites** (on 26.04: `resolute`).'),
    P('**c) Install Docker Engine and Compose, start it now and at every boot:**'),
    ...code([
      'sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin',
      'sudo systemctl enable --now docker',
    ]),
    P('**d) Let yourself use Docker without sudo, and test it:**'),
    ...code([
      'sudo usermod -aG docker $USER',
      'sudo apt-get install -y unzip',
      'sudo docker run --rm hello-world',
    ]),
    ...callout('see', null, ['`hello-world` prints **Hello from Docker!**. Now **log out and log back in** (or reboot): group changes only apply to new logins. Then repeat the checks in 3.1.2.']),
    ...callout('warn', 'The docker group', ['Being in the `docker` group is effectively administrator access. Fine on your own laptop; never add other people’s accounts on a shared machine.']),

    H3('3.1.4 Add the lab host names (what setup-hosts.sh does)'),
    P('First check whether they are already there:'),
    ...code(['grep "# x-road lab" /etc/hosts']),
    P('**If that prints a line**, they are set: skip to 3.1.5. **If it prints nothing**, add them (asks for your password):'),
    ...code(['echo "127.0.0.1 cs.lab ss1.lab ss2.lab ss3.lab ca.lab  # x-road lab" | sudo tee -a /etc/hosts']),
    P('Check that the names now point to your laptop:'),
    ...code(['getent hosts cs.lab ss1.lab ss2.lab ss3.lab']),
    ...callout('see', null, ['Four lines, each starting with `127.0.0.1`.']),
    ...callout('why', null, [
      '`/etc/hosts` is the laptop’s private phone book, checked before the internet. These names all point at `127.0.0.1` (this laptop). Browsers keep one login cookie per **name**, ignoring the port, so separate names keep the four admin pages logged in separately.',
      '`tee -a` **appends**. Without `-a` it would overwrite /etc/hosts and break networking. The `sudo` is on `tee`, not on `echo`, because the `>` of `sudo echo … > file` would run without root rights.',
      'To remove the names later: `sudo sed -i \'/# x-road lab/d\' /etc/hosts`.',
    ]),

    H3('3.1.5 Start the lab'),
    ...code(['docker compose up -d --build']),
    ...callout('see', null, ['Lines ending in **Started** for cs, ca, ss1, ss2, ss3, moha-registry and mosd-portal. The first time this downloads several GB of images; later runs use the cached images and take seconds.']),
    P('Check the containers:'),
    ...code(['docker compose ps']),
    ...callout('see', null, ['Seven rows, each with **STATUS** `Up …`.']),
    P('The X-Road servers need 3–5 minutes to start inside their containers. Watch the Central Server’s log until it settles, then press **Ctrl+C** (the container keeps running):'),
    ...code(['docker compose logs -f cs']),
    P('Or ask each admin page directly; `200` means ready, `000` means still starting:'),
    ...code([
      'curl -sk -o /dev/null -w "cs:  %{http_code}\\n" https://cs.lab:4000/',
      'curl -sk -o /dev/null -w "ss1: %{http_code}\\n" https://ss1.lab:1000/',
      'curl -sk -o /dev/null -w "ss2: %{http_code}\\n" https://ss2.lab:2000/',
      'curl -sk -o /dev/null -w "ss3: %{http_code}\\n" https://ss3.lab:3000/',
      'curl -s  -o /dev/null -w "test CA: %{http_code}\\n" http://localhost:8888/testca/',
    ]),
    ...table(['Part of the command', 'Meaning'], [
      ['`docker compose up`', 'Create and start everything described in `docker-compose.yml`.'],
      ['`-d`', 'Run in the background, so the terminal is free again.'],
      ['`--build`', 'Build the two ministry applications from their Dockerfiles first.'],
      ['`curl -sk`', '`-s`: no progress bar; `-k`: accept the self-signed certificate.'],
      ['`-o /dev/null -w "%{http_code}"`', 'Throw the page away and print only the HTTP status code.'],
    ], [0.35, 0.65]),

    H3('3.1.6 Copy the test CA’s certificates (what fetch-ca-certs.sh does)'),
    P('The test CA created three certificates inside its container when it first started. Phase 1 uploads them to the Central Server, so copy them into the `certs/` folder:'),
    ...code([
      'mkdir -p certs',
      'docker cp ca:/home/ca/CA/certs/ca.cert.pem   certs/ca.pem',
      'docker cp ca:/home/ca/CA/certs/ocsp.cert.pem certs/ocsp.pem',
      'docker cp ca:/home/ca/CA/certs/tsa.cert.pem  certs/tsa.pem',
    ]),
    P('Check each file is the right certificate:'),
    ...code([
      'openssl x509 -in certs/ca.pem   -noout -subject',
      'openssl x509 -in certs/ocsp.pem -noout -subject',
      'openssl x509 -in certs/tsa.pem  -noout -subject',
    ]),
    ...callout('see', null, ['`subject=O=Test, CN=Test CA`, then `CN=Test OCSP`, then `CN=Test TSA`.']),
    ...callout('why', null, [
      '`docker cp container:path destination` copies a file out of a running container. `mkdir -p` creates `certs/` if it is missing and does not complain if it exists.',
      'After a lab reset (`docker compose down -v`) the test CA makes **new** certificates. Always copy them again after a reset; the old files will not work.',
    ]),
    ...callout('warn', 'Check the clock', ['If you just booted from Windows, run `timedatectl status` and wait for **System clock synchronized: yes** before Phase 1.']),

    H3('3.1.7 Which script each step replaces'),
    ...table(['Section', 'Script it replaces', 'Result'], [
      ['3.1.2', '`bash scripts/preflight.sh`', 'Laptop checked'],
      ['3.1.3', '`bash scripts/install-docker.sh`', 'Docker installed (only if missing)'],
      ['3.1.4', '`bash scripts/setup-hosts.sh`', 'cs.lab, ss1.lab, ss2.lab, ss3.lab, ca.lab → 127.0.0.1'],
      ['3.1.5', '(no script)', '7 containers running'],
      ['3.1.6', '`bash scripts/fetch-ca-certs.sh`', '`certs/ca.pem`, `ocsp.pem`, `tsa.pem`'],
    ], [0.14, 0.42, 0.44]),
    P('The scripts are still in `scripts/` and do exactly the same. Use whichever you prefer.'),
  ];
}

// One configuration step: where, numbered clicks, values, what you should see, and what can go wrong.
function step(id, title, { where, why, clicks, values, see, wrong }) {
  const out = [H3(`${id}  ${title}`)];
  if (where) out.push(P(`**Where:** ${where}`));
  if (clicks) out.push(...steps(clicks));
  if (values) out.push(...table(['Field on screen', 'Type or choose'], values, [0.42, 0.58]));
  if (see) out.push(...callout('see', null, [].concat(see)));
  if (why) out.push(...callout('why', null, [].concat(why)));
  if (wrong) out.push(...callout('prob', null, [].concat(wrong)));
  return out;
}

// =====================================================================
// COVER
// =====================================================================
add(
  new Paragraph({ children: [], spacing: { before: 2000 } }),
  new Paragraph({ children: [new TextRun({ text: 'X-ROAD LOCAL LAB', bold: true, size: 28, color: C.blue })], spacing: { after: 120 } }),
  new Paragraph({ children: [new TextRun({ text: 'The Browser Guide', bold: true, size: 64, color: C.navy })], spacing: { after: EXPLICIT ? 60 : 120 } }),
  ...(EXPLICIT ? [new Paragraph({ children: [new TextRun({ text: 'Explicit commands edition', bold: true, size: 32, color: C.green })], spacing: { after: 120 } })] : []),
  new Paragraph({ children: [new TextRun({ text: 'Build the LS-DEV X-Road network by clicking: every page, every field, every check, from the first login to a working data exchange between MOSD and MOHA', size: 28, color: C.grey })],
    spacing: { after: 500 }, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: C.blue, space: 12 } } }),
  ...table(['', ''], [
    ['Author', 'Motlatsi Victor Mpahane, student attachee'],
    ['For', 'Anyone setting up the lab for the first time, using only the admin web pages'],
    ['X-Road version', '7.7.0, Docker images from NIIS, on Ubuntu 26.04'],
    ['Tested', 'Every value in this guide was used in the successful build of 2 October 2026 (smoke test 7/7)'],
    ['Companions', 'X-Road Lab Beginner Guide (concepts) · X-Road Lab Build Report (commands and API)'],
  ], [0.22, 0.78], true),
  note('Prepared with Claude (Anthropic). All identifiers, certificates and citizen data are synthetic and for learning only.'),
  k.pageBreak(),
  ...k.toc(),
);

// =====================================================================
// PART A
// =====================================================================
add(H1('1. How to use this guide'),
  P('This guide builds the whole lab through the **admin web pages** of the X-Road servers. Apart from ' + pick('three short commands', 'a few terminal commands, each written out in full,') + ' to start the lab (section 3.1), everything is done by clicking in a browser. Each step tells you **where** to go, **what** to click in order, **what** to type, **what you should see** afterwards, and **what to do** if it goes wrong.'),
  H2('1.1 Conventions'),
  ...table(['You see', 'It means'], [
    ['**Keys and certificates**', 'A label exactly as it appears on screen: a menu, tab, button or field. Click or find it.'],
    ['**Clients → Add subsystem**', 'Click the first item, then the second.'],
    ['`LS-DEV`', 'Type this exactly, including capitals and punctuation.'],
    ['Grey box “You should now see”', 'The check that tells you the step worked. Do not move on until it matches.'],
    ['Red box “If it goes wrong”', 'The most likely causes and fixes for that step.'],
    ['Blue box “Why”', 'The reason behind the step. Optional reading, but it is what turns clicking into understanding.'],
  ], [0.32, 0.68]),
  ...callout('tip', 'Where the screen labels come from', ['Menu, tab, field and status names in bold were taken from the English text files built into X-Road 7.7.0’s own admin pages, so they match what you see. Generic wizard buttons such as **Next**, **Continue**, **Add**, **Save** or **Submit** can differ by a word; pick the one that moves forward.']),
  H2('1.2 Values used throughout'),
  ...table(['What', 'Value'], [
    ['Admin login, all four admin pages', 'Username `xrd`, password `secret`'],
    ['Token PIN, everywhere', '`123456xrd!`'],
    ['X-Road instance', '`LS-DEV`'],
    ['Member class', '`GOV` (Government ministries and agencies)'],
    ['X-Road operator', '`MCST`, Ministry of Communications, Science and Technology; subsystem `MANAGEMENT`; Security Server `SS1`'],
    ['Consumer', '`MOSD`, Ministry of Social Development; subsystem `GRANTS-PORTAL`; Security Server `SS2`'],
    ['Provider', '`MOHA`, Ministry of Home Affairs; subsystem `POPULATION-REGISTRY`; Security Server `SS3`'],
    ['Certificate profile', '`ee.ria.xroad.common.certificateprofile.impl.FiVRKCertificateProfileInfoProvider`'],
    ['Services', 'REST `population-api`, SOAP `verifyIdentity` v1'],
  ], [0.3, 0.7]),
  H2('1.3 Time plan'),
  ...table(['Part', 'Content', 'First time'], [
    ['Section 3', 'Getting ready, browser set-up', '20–30 min'],
    ['Sections 4–5', 'Tour of the admin pages (reading)', '15 min'],
    ['Phase 1', 'Central Server', '30–45 min'],
    ['Phase 2', 'ss1, the management Security Server', '45–60 min'],
    ['Phase 3', 'ss2 and ss3', '40–60 min'],
    ['Phases 4–5', 'Subsystems, services, access rights', '30 min'],
    ['Phase 6', 'Testing in the portal', '15 min'],
    ['Part C', 'Break-it experiments', '30–45 min'],
  ], [0.2, 0.55, 0.25]),
  P('Everything you configure is saved. You can stop between any two steps: run `docker compose stop` at the end of a session and `docker compose start` at the next.'),
);

add(H1('2. What you are building'),
  P('Seven programs run in Docker on your laptop. Five of them form an X-Road network; two are ministry applications. At the end, the MOSD Grants Portal checks Old Age Pension applicants against the MOHA Population Registry, and every request travels portal → ss2 → ss3 → registry, signed, encrypted, access-checked and logged.'),
  ...figure('topology', 'The seven containers and three networks. The portal has no road to the registry except through ss2 and ss3.', 1400, 860),
  ...figure('phases', 'The six build phases. Each ends with a checkpoint.', 1400, 520),
  ...figure('trust', 'What you set up in Phase 1: the Central Server’s signed configuration, trusted through the anchor, and the CA it lists.', 1400, 700),
);

add(H1('3. Getting ready'),
  ...(EXPLICIT ? terminalStepsExplicit() : terminalStepsScripts()),
  H2('3.2 Open your tabs'),
  ...figure('workspace', 'Open one tab per server and keep them open for the whole build.', 1400, 640),
  P('Firefox and Chrome both work. Bookmark the seven addresses in a folder called “X-Road lab” so they are one click away next time.'),
  H2('3.3 Accepting the certificate warning'),
  P('The four admin pages use a self-signed certificate, so the first visit to each shows a warning. This is expected in the lab: the certificate was made by the server itself, not by a public authority. Accept it once per address:'),
  ...table(['Browser', 'What you see', 'What to click'], [
    ['Firefox', '**Warning: Potential Security Risk Ahead**', '**Advanced…** → **Accept the Risk and Continue**'],
    ['Chrome', '**Your connection is not private**', '**Advanced** → **Proceed to cs.lab (unsafe)**'],
  ], [0.15, 0.4, 0.45]),
  ...callout('warn', 'Only for this lab', ['Never accept such a warning on a real website. Here it is safe because the address is your own laptop (all lab ports are bound to 127.0.0.1) and you know who made the certificate.']),
  H2('3.4 Logging in'),
  ...steps([
    'Open the tab. The login page asks for **Username** and **Password**.',
    'Type `xrd` and `secret`, then press **Enter**.',
    'After a period of inactivity you are logged out automatically. Just log in again: nothing is lost.',
  ]),
  ...callout('prob', null, [pick('**Logged out every time you switch tabs:** you are using `localhost` instead of the `.lab` names. Run `bash scripts/setup-hosts.sh` and use https://cs.lab:4000 etc.', '**Logged out every time you switch tabs:** you are using `localhost` instead of the `.lab` names. Add them (section 3.1.4) and use https://cs.lab:4000 etc.'), '**Page does not load at all:** the server is still starting (wait 3–5 minutes after `docker compose up`) or not running (`docker compose ps`).']),
  H2('3.5 Uploading and downloading files'),
  P('You will move about 15 files between the browser and the servers. To avoid mix-ups:'),
  ...bullets([
    'In any **upload** dialog, press **Ctrl+L** and paste a full path, e.g. `/home/victor/xroad-ls-lab/certs/ca.pem`. Much faster than clicking through folders.',
    'Downloads land in **~/Downloads**. Right after each download, **rename** the file so you know which server and key it belongs to (suggested names below).',
    'Keep one folder per server, e.g. `~/Downloads/xroad/ss1/`, if you prefer.',
  ]),
  ...table(['File', 'Comes from', 'Goes to', 'Suggested name'], [
    ['Configuration anchor (.xml)', 'cs: Global Configuration → Internal Configuration → Anchor → Download', 'ss1, ss2, ss3 at their first login', '`configuration_anchor_LS-DEV.xml`'],
    ['`ca.pem`, `ocsp.pem`, `tsa.pem`', pick('`fetch-ca-certs.sh` (section 3.1)', '`docker cp` commands (section 3.1.6)'), 'cs: Trust Services', '(keep)'],
    ['6 CSRs (.der)', 'Add key wizard on ss1, ss2, ss3', 'Test CA signing page', '`ss1_sign.der`, `ss1_auth.der`, …'],
    ['6 certificates (.pem)', 'Test CA signing page', 'Import cert. on the same server', '`ss1_sign.pem`, `ss1_auth.pem`, …'],
    ['Management TLS certificate (.tar.gz)', 'cs: Settings → System Settings → Management Services', 'ss1: MANAGEMENT → Internal servers', 'extract `management-service.pem`'],
  ], [0.22, 0.32, 0.24, 0.22]),
);

// =====================================================================
add(H1('4. A tour of the Central Server pages'),
  P('Log in at **https://cs.lab:4000**. On a brand-new Central Server you first see the **Initial Configuration** page (Phase 1, step 1.1). After that the page always has the six-item menu shown below.'),
  ...figure('csmap', 'The Central Server admin pages. Bold items are used in this guide.', 1400, 760),
  ...table(['Menu item', 'What it is for', 'Used in'], [
    ['**Members**', 'The list of organisations in the network. Click one to see its **Details**, **Subsystems** and **Management Requests**.', 'Phase 1'],
    ['**Security Servers**', 'Every registered Security Server, with its **Clients**, **Authentication Certificates** and requests.', 'Checks'],
    ['**Management Requests**', 'Every request a Security Server sends (register a server, register a subsystem…). Pending ones have **Approve** and **Decline**. Tick **Show only pending requests** to filter.', 'Phases 2–4'],
    ['**Trust Services**', '**Certification Services** (trusted CAs, each with **OCSP Responders**) and **Timestamping Services**.', 'Phase 1'],
    ['**Global Configuration**', '**Internal Configuration**: the **Anchor**, **Download URL**, **Signing Keys** and configuration parts. **External Configuration**: the same for federation. **Trusted Anchors**: other networks.', 'Phase 1'],
    ['**Settings**', '**System Settings** (instance, **Member Classes**, **Management Services**), **Global Resources**, **API Keys**, **TLS Certificates**, **Backup And Restore**.', 'Phases 1–2'],
  ], [0.24, 0.62, 0.14]),
  ...callout('tip', 'Red banners at the top', ['Right after initialisation the Central Server shows red alert banners, e.g. that no signing key exists. They are a to-do list, not errors. They disappear as you finish Phase 1.']),
);

add(H1('5. A tour of a Security Server’s pages'),
  P('ss1, ss2 and ss3 run the same software, so their pages look the same. On first login you get the **Initial configuration** wizard; afterwards, four menu items.'),
  ...figure('ssmap', 'A Security Server’s admin pages. Bold items are used in this guide.', 1400, 780),
  ...table(['Menu item', 'What it is for'], [
    ['**Clients**', 'The owner member and its subsystems, with their status. Click a subsystem for its tabs: **Details**, **Service clients**, **Services**, **Internal servers**, **Local groups**.'],
    ['**Keys and certificates**', 'Tab **SIGN and AUTH Keys**: the software token (**softToken-0**) with **Log in**, **Add key** and **Import cert.**, and below it the AUTH and SIGN keys with their requests and certificates. Tabs **API Keys** and **Security Server TLS Key**.'],
    ['**Diagnostics**', 'Tab **Overview**: health of **Global configuration**, **Timestamping**, **OCSP responders** and more. “Everything ok” in green is what you want. Your check after every phase.'],
    ['**Settings**', 'Tab **System Parameters**: **Configuration Anchor**, **Timestamping Services**, **Approved Certificate Authorities**, Security Server address. Tab **Backup And Restore**.'],
  ], [0.25, 0.75]),
  H2('5.1 Status words you will meet'),
  ...table(['Where', 'Status', 'Meaning'], [
    ['Clients', '**SAVED**', 'Added on this server, not yet sent for registration.'],
    ['Clients', '**REGISTRATION IN PROGRESS**', 'Request sent; waiting for approval on cs and the next global configuration.'],
    ['Clients', '**REGISTERED**', 'Done. The whole network knows this client lives here.'],
    ['Keys and certificates', '**Saved**', 'Certificate imported but not registered (normal for an AUTH certificate before step “Register”).'],
    ['Keys and certificates', '**Registration in progress** / **Registered**', 'Same as for clients, for the AUTH certificate.'],
    ['Keys and certificates', 'OCSP **Good**', 'The CA confirms the certificate is valid.'],
    ['Keys and certificates', '**Request**', 'A CSR exists for this key and is waiting for its certificate.'],
    ['Diagnostics', '**Everything ok** (green)', 'That check is healthy. Yellow/red: read the message.'],
    ['Services', '**Out of order**', 'Default notice of a disabled service description. Enable it with the toggle.'],
  ], [0.2, 0.32, 0.48]),
);

// =====================================================================
// PART B: THE BUILD
// =====================================================================
add(H1('6. Phase 1: Configure the Central Server'),
  P('**Tab:** https://cs.lab:4000 · **Goal:** create the LS-DEV network, tell it which CA and time-stamping service to trust, list the three ministries, and download the anchor that the Security Servers need.'),
  ...step('1.1', 'Initialise the Central Server', {
    where: 'cs tab, first login: the **Initial Configuration** page.',
    clicks: [
      'Log in with `xrd` / `secret`.',
      'In the **Software Token** section type the **PIN** and **Repeat PIN**.',
      'In the **Central Server Identification** section type the **Instance Identifier** and the **Central Server Address**.',
      'Click **Submit**.',
    ],
    values: [['PIN / Repeat PIN', '`123456xrd!`'], ['Instance Identifier', '`LS-DEV`'], ['Central Server Address', '`cs`']],
    see: ['The message **The Central Server initialized! Now continue with the full configuration.** and the six-item menu. **Settings → System Settings** shows Instance Identifier `LS-DEV` and Central Server Address `cs`.'],
    why: ['The instance identifier is the first part of every X-Road name. The address `cs` is what the Security Servers use to download configuration; it is the container’s name inside Docker, not a name your browser uses. The PIN protects the software token, which will hold the keys that sign the configuration.'],
  }),
  ...step('1.2', 'Add the member class GOV', {
    where: '**Settings → System Settings → Member Classes**.',
    clicks: ['Click **Add**.', 'Fill in **Code** and **Description**.', 'Click **Add** (or **Save**).'],
    values: [['Code', '`GOV`'], ['Description', '`Government ministries and agencies`']],
    see: ['**Member class saved.** and `GOV` in the Member Classes list.'],
  }),
  ...step('1.3', 'Trust the test CA and its OCSP responder', {
    where: '**Trust Services → Certification Services**.',
    clicks: [
      'Click **Add certification service**.',
      '**Upload the certificate file from your computer**: choose `certs/ca.pem` (Ctrl+L, paste `/home/victor/xroad-ls-lab/certs/ca.pem`). Continue.',
      'On **CA Settings**: leave **This CA can only be used for TLS authentication (mark if true)** unticked.',
      'In **Certificate profile info** paste the profile class name (table below). Leave any ACME fields empty.',
      'Click **Save**. “Test CA” appears in the list.',
      'Click **Test CA** → tab **OCSP Responders** → **Add**.',
      'In **Add OCSP Responder** type the **URL** and upload `certs/ocsp.pem`. Click **Save**.',
    ],
    values: [
      ['Certificate', '`certs/ca.pem` (subject “Test CA”)'],
      ['Certificate profile info', '`ee.ria.xroad.common.certificateprofile.impl.FiVRKCertificateProfileInfoProvider`'],
      ['OCSP responder URL', '`http://ca:8888`'],
      ['OCSP certificate', '`certs/ocsp.pem` (subject “Test OCSP”)'],
    ],
    see: ['**Trust Services** lists **Test CA**, valid until 2046. Its **OCSP Responders** tab lists `http://ca:8888`.'],
    why: ['The profile tells X-Road how to read the member identity out of certificates issued by this CA; the test CA issues Finnish-style certificates, hence “FiVRK”. The URL uses `ca`, the container name, because the Security Servers (not your browser) call it from inside Docker.'],
    wrong: ['**Upload refused:** you picked `ocsp.pem` or `tsa.pem` instead of `ca.pem`. **Profile typo:** certificate requests fail later in Phase 2. Copy-paste the class name; open Test CA → **CA Settings** to check it.'],
  }),
  ...step('1.4', 'Trust the time-stamping service', {
    where: '**Trust Services → Timestamping Services**.',
    clicks: ['Click **Add**.', 'Type the **URL** and upload the certificate.', 'Click **Save**.'],
    values: [['URL', '`http://ca:8899`'], ['Certificate', '`certs/tsa.pem` (subject “Test TSA”)']],
    see: ['`http://ca:8899` in the Timestamping Services list.'],
  }),
  ...step('1.5', 'Add the three ministries and their subsystems', {
    where: '**Members**.',
    clicks: [
      'Click **Add member**. Fill in **Member Name**, **Member Class** and **Member Code** (first row of the table). Click **Add**.',
      'Repeat for the other two ministries.',
      'Click **MCST** in the list → tab **Subsystems** → **Add subsystem** → **Subsystem code** `MANAGEMENT` → **Add**.',
      'Do the same for MOSD (`GRANTS-PORTAL`) and MOHA (`POPULATION-REGISTRY`).',
    ],
    values: [
      ['Ministry of Communications, Science and Technology', 'class `GOV`, code `MCST`, subsystem `MANAGEMENT`'],
      ['Ministry of Social Development', 'class `GOV`, code `MOSD`, subsystem `GRANTS-PORTAL`'],
      ['Ministry of Home Affairs', 'class `GOV`, code `MOHA`, subsystem `POPULATION-REGISTRY`'],
    ],
    see: ['Three members in **Members**, each with one subsystem. The subsystems have no server yet; that comes in Phases 2–4.'],
    why: ['A Security Server can only register an owner or subsystem that the Central Server already knows. Adding them now means their names fill in automatically later.'],
  }),
  ...step('1.6', 'Choose the management services provider', {
    where: '**Settings → System Settings → Management Services**.',
    clicks: [
      'Next to **Service Provider Identifier** click **Edit** (pencil).',
      'In **Select Subsystem** search `MCST`, select the row with subsystem **MANAGEMENT**, click **Select**.',
    ],
    see: ['**Service Provider Identifier** `SUBSYSTEM:LS-DEV:GOV:MCST:MANAGEMENT`, **Service Provider Name** Ministry of Communications, Science and Technology. **Management Services’ Security Server** is still empty (filled in Phase 2). Note the **WSDL Address** `http://cs/managementservices.wsdl` and the **Management Services Address** `https://cs:4002/managementservice/manage/`: you need both in Phase 2.'],
    why: ['Security Servers send their registration requests as X-Road messages to this subsystem. MCST, the operator, provides that service.'],
  }),
  ...step('1.7', 'Create the configuration signing keys', {
    where: '**Global Configuration → Internal Configuration → Signing Keys**.',
    clicks: [
      'If the token row shows **Log in**, click it and enter the **Token PIN** `123456xrd!`. (In this lab it is usually already logged in.)',
      'Click **Add key** → **Key friendly name** `internal-signing-key` → **Save**.',
      'Open tab **External Configuration** → **Signing Keys** → **Add key** → `external-signing-key` → **Save**.',
    ],
    see: ['One key under each tab. Within a minute or two the red banners disappear.'],
    why: ['From now on the Central Server signs the global configuration about once a minute with the internal key. Security Servers only accept configuration with a valid signature.'],
  }),
  ...step('1.8', 'Download the anchor', {
    where: '**Global Configuration → Internal Configuration → Anchor**.',
    clicks: ['Click **Download**.', 'Save it as `configuration_anchor_LS-DEV.xml` in ~/Downloads.'],
    see: ['The **Anchor** section shows a **Certificate Hash (SHA-224)** and a **Created** time; the file is in ~/Downloads.'],
    why: ['The anchor holds the configuration’s address (`http://cs/internalconf`) and the key that verifies it. Uploading it is how a Security Server decides which network to trust.'],
  }),
  ...callout('ok', 'Checkpoint 1', ['No red banners on the Central Server; Trust Services shows Test CA (with OCSP) and one time-stamping service; Members shows three ministries with a subsystem each; the anchor file is saved.']),
);

// =====================================================================
add(H1('7. Phase 2: ss1, the management Security Server'),
  P('**Tabs:** https://ss1.lab:1000 (ss1), https://cs.lab:4000 (cs), http://localhost:8888/testca/ (test CA). **Goal:** a registered Security Server for MCST that hosts the management services, so that ss2 and ss3 can register through it in Phase 3.'),
  ...figure('certflow', 'Steps 2.1 to 2.9: getting a Security Server registered. The same steps are repeated for ss2 and ss3.', 1400, 560),
  ...step('2.1', 'Initialise ss1', {
    where: 'ss1 tab, first login: the **Initial configuration** wizard.',
    clicks: [
      '**Configuration Anchor**: click **Upload**, choose `configuration_anchor_LS-DEV.xml`. The dialog shows **Configuration anchor details:** with **Hash (SHA-224)** and **Generated**. Check the hash matches the one on cs (step 1.8), then confirm.',
      '**Owner Member**: choose **Member Class** `GOV`, type **Member Code** `MCST`. The member name fills in by itself. Type **Security Server Code** `SS1`. Continue.',
      '**Token PIN**: **PIN** and **Confirm PIN** `123456xrd!`. Click **Submit**.',
    ],
    see: ['**Server initialised**, then the four-item menu. **Clients** shows owner `MCST` with status **SAVED**.'],
    wrong: ['**Name does not fill in:** MCST is missing on cs (step 1.5) or the configuration has not been published yet. Wait 1–2 minutes and retype the code.', '**PIN rejected:** it must be the same as `XROAD_TOKEN_PIN` in docker-compose.yml, i.e. `123456xrd!`.'],
  }),
  ...step('2.2', 'Log in to the token (only if asked)', {
    where: '**Keys and certificates** → tab **SIGN and AUTH Keys**.',
    clicks: ['If **softToken-0** shows **Log in** (or a banner says **Please enter soft token PIN**), click **Log in** and type `123456xrd!`.'],
    see: ['The token row shows **Add key** and **Import cert.** buttons.'],
  }),
  ...step('2.3', 'Add the time-stamping service', {
    where: '**Settings** → tab **System Parameters** → **Timestamping Services**.',
    clicks: ['Click **Add**.', 'In **Add Timestamping Service** select **Test TSA** and click **Add**.'],
    see: ['**Timestamping service added** and `http://ca:8899` in the list.'],
  }),
  ...figure('addkey', 'The Add key wizard with ss1’s values. Mind the two red notes.', 1400, 700),
  ...step('2.4', 'Create the SIGNING key and its CSR', {
    where: '**Keys and certificates → SIGN and AUTH Keys → softToken-0 → Add key**.',
    clicks: [
      '**Key label**: `ss1-sign`. Next.',
      '**CSR details**: **Usage** SIGNING, **Client** `GOV:MCST`, **Certification Service** Test CA, **CSR Format** **DER**. Continue.',
      '**Generate CSR**: fill the fields below, leave read-only fields as they are, click **Generate CSR**.',
      'The browser downloads a `.der` file. Rename it `ss1_sign.der`. Click **Done**.',
    ],
    values: [
      ['Organization Name (O)', '`Ministry of Communications Science and Technology` (**no comma**)'],
      ['Member Code (CN)', '`MCST` (read-only)'],
      ['Subject Alternative Name (SAN)', '`ss1`'],
      ['Country Code (C) / Serial Number', '`FI` / `LS-DEV/SS1/GOV` (read-only)'],
    ],
    see: ['Under **SIGN Keys and Certificates** a key `ss1-sign` with a **Request** line.'],
    wrong: ['**Signer.InternalError** on Generate CSR: a comma in Organization Name. X-Road writes the certificate subject as `C=FI, O=…, CN=…`, so a comma breaks it. Delete any half-made key (click it → **Delete**) and repeat without the comma.', '**SAN field required:** 7.7.0 always asks for it; use the server name `ss1`.'],
  }),
  ...step('2.5', 'Create the AUTHENTICATION key and its CSR', {
    where: 'Same place: **softToken-0 → Add key**.',
    clicks: [
      '**Key label** `ss1-auth`.',
      '**Usage** AUTHENTICATION (no Client is asked), **Certification Service** Test CA, **CSR Format** **DER**.',
      'Fill the fields below and click **Generate CSR**. Rename the download `ss1_auth.der`.',
    ],
    values: [
      ['Organization Name (O)', '`Ministry of Communications Science and Technology`'],
      ['Server DNS Name (CN)', '`ss1`'],
      ['Subject Alternative Name (SAN)', '`ss1`'],
    ],
    see: ['Under **AUTH Keys and Certificates** a key `ss1-auth` with a **Request** line.'],
    why: ['Two certificates, two jobs. The **signing** certificate belongs to the organisation (MCST) and signs messages. The **authentication** certificate belongs to this server and proves who it is when Security Servers connect to each other.'],
  }),
  ...step('2.6', 'Sign both CSRs at the test CA', {
    where: 'Test CA tab: http://localhost:8888/testca/ (page **Test CA: CSR signing**).',
    clicks: [
      '**CSR**: choose `ss1_sign.der`. **Type**: select **Sign**. Press **Sign**. Rename the downloaded certificate `ss1_sign.pem`.',
      'Again with `ss1_auth.der`, **Type** **Auth** → **Sign** → rename to `ss1_auth.pem`.',
    ],
    see: ['Two `.pem` files. (A real CA would check documents first; the test CA signs anything.)'],
    wrong: ['**Error from the test CA:** the CSR was PEM. Delete the key on ss1 and create it again with **CSR Format** DER.', 'Select **Sign**/**Auth** explicitly rather than **Autodetect from file name**, which depends on the file name.'],
  }),
  ...step('2.7', 'Import the certificates and activate the AUTH one', {
    where: '**Keys and certificates → SIGN and AUTH Keys**.',
    clicks: [
      'On **softToken-0** click **Import cert.** and choose `ss1_auth.pem`. It attaches itself to the `ss1-auth` key.',
      'Click the new certificate under `ss1-auth` → click **Activate** → go back.',
      '**Import cert.** again with `ss1_sign.pem`.',
    ],
    see: ['**Uploading certificate succeeded** each time. The SIGN certificate shows **Registered** at once; the AUTH certificate shows **Saved**, OCSP **Good**.'],
  }),
  ...step('2.8', 'Send the registration request', {
    where: 'Same page, the AUTH certificate row.',
    clicks: ['Click **Register** on the `ss1-auth` certificate.', 'In **Registration request**, **Security server DNS name or IP address**: `ss1`. Click **Add**/**Save**.'],
    see: ['**Certificate registration request sent successfully**; status **Registration in progress**.'],
  }),
  ...step('2.9', 'Approve the request on the Central Server', {
    where: 'cs tab → **Management Requests**.',
    clicks: ['Find the pending request for Server Identifier `LS-DEV:GOV:MCST:SS1` (type: add certificate).', 'Click **Approve** and confirm **Approve management request**.', 'Back on ss1, wait 1–2 minutes and refresh.'],
    see: ['On ss1, **Clients** shows `MCST` **REGISTERED** and the AUTH certificate shows **Registered**. On cs, **Security Servers** lists SS1.'],
    why: ['Approval is X-Road’s trust model: the operator confirms that this server really belongs to MCST before it joins.'],
  }),
  ...step('2.10', 'Add the MANAGEMENT subsystem (the first try fails on purpose)', {
    where: 'ss1 → **Clients**.',
    clicks: [
      'On the `MCST` owner row click **Add subsystem**.',
      'Click **Select Subsystem**, choose `MANAGEMENT`, tick **Register subsystem**, click **Add subsystem**.',
    ],
    see: ['An error mentioning **UnknownMember** and `clientReg`. **This is expected.** MANAGEMENT now appears with status **SAVED**.'],
    why: ['To register a subsystem, a Security Server calls the management service `clientReg`. But MANAGEMENT is the subsystem that provides `clientReg`, and no server hosts it yet. The next step registers it from the Central Server instead.'],
  }),
  ...step('2.11', 'Register MANAGEMENT from the Central Server', {
    where: 'cs → **Settings → System Settings → Management Services**.',
    clicks: ['Next to **Management Services’ Security Server** click **Edit**.', 'In **Select Security Server** pick `SS1` and click **Select**.', 'Back on ss1 wait 1–2 minutes and refresh **Clients**.'],
    see: ['ss1 **Clients**: `MCST:MANAGEMENT` **REGISTERED**.'],
  }),
  ...step('2.12', 'Add the management services', {
    where: 'ss1 → **Clients → MANAGEMENT** → tab **Services**.',
    clicks: ['Click **Add WSDL**, type the **URL** and click **Add**.', 'Switch the new WSDL row’s toggle **on**.'],
    values: [['URL', '`http://cs/managementservices.wsdl`']],
    see: ['**WSDL added**; ten services such as `clientReg`, `authCertDeletion`, `ownerChange`…; the row is enabled.'],
  }),
  ...step('2.13', 'Point every management service at the Central Server', {
    where: 'Same tab: expand the WSDL row.',
    clicks: [
      'Note that each service’s URL is `http://INSERT_MANAGEMENT_SERVICE_ADDRESS_HERE`: a placeholder.',
      'Click any service (e.g. `clientReg`) → **Service Parameters**.',
      'Set **Service URL**, **Timeout (s)** and **Verify TLS certificate** as below, and tick **Apply to all in WSDL** next to each.',
      'Click **Save**.',
    ],
    values: [['Service URL', '`https://cs:4002/managementservice/manage/`'], ['Timeout (s)', '`60`'], ['Verify TLS certificate', 'ticked']],
    see: ['**Service saved**; all ten services now show the cs address.'],
    wrong: ['Skip this and ss2/ss3 cannot register in Phase 3. The README before October 2026 did not mention it.'],
  }),
  ...step('2.14', 'Trust the Central Server’s TLS certificate', {
    where: 'cs → **Settings → System Settings → Management Services**, then ss1 → **Clients → MANAGEMENT** → tab **Internal servers**.',
    clicks: [
      'On cs, in the Management Services section, download the **TLS certificate**. You get a `.tar.gz` archive.',
      'Open it in the Files app (double-click) and extract `management-service.pem`.',
      'On ss1, tab **Internal servers** → **Information System TLS certificate** → **Add** → upload `management-service.pem`.',
    ],
    see: ['A certificate with a **Certificate Hash** listed under Information System TLS certificate.'],
    why: ['Step 2.13 switched on TLS verification for an HTTPS address, so ss1 must know exactly which certificate cs will show.'],
  }),
  ...step('2.15', 'Let every Security Server owner use the services', {
    where: 'ss1 → **Clients → MANAGEMENT** → tab **Service clients**.',
    clicks: [
      'Click **Add subject**.',
      '**Member / Group**: search for the global group `security-server-owners` (Security server owners), select it, Next.',
      '**Services**: tick all ten services, click **Add Selected**.',
    ],
    see: ['**Access rights added successfully**; `security-server-owners` in the Service clients list.'],
  }),
  ...callout('ok', 'Checkpoint 2', [
    'ss1 **Clients**: `MCST` and `MCST:MANAGEMENT` both **REGISTERED**.',
    'ss1 **Keys and certificates**: `ss1-auth` and `ss1-sign` Registered, OCSP **Good**.',
    'ss1 **Diagnostics**: Global configuration and OCSP responders **Everything ok**. Timestamping may say waiting/unknown until the first message in Phase 6; that is normal.',
  ]),
);

// =====================================================================
const p3 = [['Admin page', 'https://ss2.lab:2000', 'https://ss3.lab:3000'],
  ['Owner Member: Member Class / Member Code', '`GOV` / `MOSD`', '`GOV` / `MOHA`'],
  ['Security Server Code', '`SS2`', '`SS3`'],
  ['Key labels', '`ss2-sign`, `ss2-auth`', '`ss3-sign`, `ss3-auth`'],
  ['SIGN key: Client', '`GOV:MOSD`', '`GOV:MOHA`'],
  ['Organization Name (O), both keys', '`Ministry of Social Development`', '`Ministry of Home Affairs`'],
  ['AUTH key: Server DNS Name (CN)', '`ss2`', '`ss3`'],
  ['Subject Alternative Name (SAN), both keys', '`ss2`', '`ss3`'],
  ['File names', '`ss2_sign.der/.pem`, `ss2_auth.der/.pem`', '`ss3_sign.der/.pem`, `ss3_auth.der/.pem`'],
  ['Register: Security server DNS name', '`ss2`', '`ss3`'],
  ['Request to approve on cs', '`LS-DEV:GOV:MOSD:SS2`', '`LS-DEV:GOV:MOHA:SS3`']];
add(H1('8. Phase 3: ss2 (MOSD) and ss3 (MOHA)'),
  P('**Goal:** both ministries’ Security Servers registered. You repeat Phase 2 steps **2.1 to 2.9** on each server with the values below. Steps 2.10 to 2.15 are **not** repeated: only ss1 hosts management services.'),
  ...table(['Value', 'ss2', 'ss3'], p3, [0.36, 0.32, 0.32]),
  ...figure('mgmtflow', 'This time the registration request travels through ss1’s management services before it reaches cs.', 1400, 600),
  H2('8.1 The steps, for each server'),
  ...steps([
    '**Initialise** (step 2.1): upload the same anchor; owner and server code from the table; PIN `123456xrd!`.',
    '**Token** (2.2): log in if asked.',
    '**Time-stamping** (2.3): **Settings → System Parameters → Timestamping Services → Add → Test TSA**.',
    '**SIGNING key** (2.4): label, Client, O and SAN from the table; CSR Format **DER**.',
    '**AUTHENTICATION key** (2.5): label, O, CN and SAN from the table; **DER**.',
    '**Sign** both at the test CA (2.6): **Sign** for the sign CSR, **Auth** for the auth CSR. Name the files per server.',
    '**Import** (2.7): AUTH certificate first → **Activate**; then the SIGN certificate.',
    '**Register** (2.8): on the AUTH certificate, address `ss2` / `ss3`.',
    '**Approve** on cs (2.9): **Management Requests** → the request for SS2 / SS3 → **Approve**.',
  ]),
  ...callout('why', null, ['The ministry names have no commas, so you can type them as they are. Unlike ss1’s request, these go ss2 → ss1 → cs: ss1 checks that MOSD belongs to **security-server-owners** and passes the request on. It is the first real X-Road message on your network.']),
  ...callout('prob', null, ['**Register fails with UnknownMember, AccessDenied or SslAuthenticationFailed:** the problem is on ss1. Go back to Phase 2 steps 2.13 (service URL), 2.14 (TLS certificate) and 2.15 (access rights).', '**Request never appears on cs:** check ss1 **Diagnostics**; make sure ss1’s MANAGEMENT is REGISTERED.']),
  ...callout('ok', 'Checkpoint 3', ['ss2 **Clients**: `MOSD` **REGISTERED**. ss3 **Clients**: `MOHA` **REGISTERED** (about 90 seconds after approval). Both servers’ certificates OCSP **Good**. cs **Security Servers** lists SS1, SS2 and SS3.']),
);

// =====================================================================
add(H1('9. Phase 4: Register the information systems'),
  P('**Goal:** put each ministry application on its Security Server: POPULATION-REGISTRY on ss3, GRANTS-PORTAL on ss2.'),
  ...step('4.1', 'Add POPULATION-REGISTRY on ss3', {
    where: 'ss3 → **Clients**.',
    clicks: ['On the `MOHA` owner row click **Add subsystem**.', '**Select Subsystem** → `POPULATION-REGISTRY`.', 'Tick **Register subsystem** → **Add subsystem**.'],
    see: ['**Client registration request sent successfully**; status **REGISTRATION IN PROGRESS**.'],
  }),
  ...step('4.2', 'Add GRANTS-PORTAL on ss2', {
    where: 'ss2 → **Clients**.',
    clicks: ['On the `MOSD` owner row click **Add subsystem**.', '**Select Subsystem** → `GRANTS-PORTAL`.', 'Tick **Register subsystem** → **Add subsystem**.'],
    see: ['Status **REGISTRATION IN PROGRESS**.'],
  }),
  ...step('4.3', 'Approve both on the Central Server', {
    where: 'cs → **Management Requests**.',
    clicks: ['Two pending client registration requests: for `LS-DEV:GOV:MOHA:POPULATION-REGISTRY` from SS3 and for `LS-DEV:GOV:MOSD:GRANTS-PORTAL` from SS2.', '**Approve** each.', 'Wait 1–2 minutes and refresh ss2 and ss3.'],
    see: ['Both subsystems **REGISTERED** (about 70 seconds after approval).'],
    why: ['Global configuration now records which subsystem lives on which server. That is how ss2 will know to send requests for MOHA/POPULATION-REGISTRY to ss3.'],
  }),
  ...step('4.4', 'Set GRANTS-PORTAL’s connection type to HTTP', {
    where: 'ss2 → **Clients → GRANTS-PORTAL** → tab **Internal servers**.',
    clicks: ['Under **Connection type** choose **HTTP**.', 'Save if asked.'],
    see: ['**Connection type updated**.'],
    why: ['The portal sends plain HTTP to `http://ss2:8080`. With the default HTTPS, ss2 would refuse it with **SslAuthenticationFailed**. Real deployments keep HTTPS and give ss2 the application’s TLS certificate.'],
  }),
  ...callout('ok', 'Checkpoint 4', ['ss2: `MOSD:GRANTS-PORTAL` **REGISTERED**, connection type HTTP. ss3: `MOHA:POPULATION-REGISTRY` **REGISTERED**.']),
);

add(H1('10. Phase 5: Publish MOHA’s services'),
  P('**Tab:** ss3 → **Clients → POPULATION-REGISTRY**. **Goal:** publish the REST and SOAP APIs and let only GRANTS-PORTAL call them.'),
  ...step('5.1', 'Add the REST service', {
    where: 'Tab **Services**.',
    clicks: ['Click **Add REST**.', '**URL type**: **OpenAPI 3 Description**.', 'Type **URL** and **Service Code** below, click **Add**.'],
    values: [['URL', '`http://moha-registry:8000/openapi.yaml`'], ['Service Code', '`population-api`']],
    see: ['**OpenApi3 service added**. Expanded, it shows **Service URL** `http://moha-registry:8000/api` and, on its **Endpoints** tab, `GET /citizens/*` and `GET /citizens/*/vital-status`.'],
    why: ['ss3 reads the address from the spec’s `servers:` line and the endpoints from its paths. The URL works only from ss3: `moha-registry` exists only on MOHA’s internal network, which is the point.'],
  }),
  ...step('5.2', 'Add the SOAP service', {
    where: 'Same tab.',
    clicks: ['Click **Add WSDL**, type the **URL**, click **Add**.'],
    values: [['URL', '`http://moha-registry:8000/soap/population.wsdl`']],
    see: ['**WSDL added**; service `verifyIdentity.v1` with URL `http://moha-registry:8000/soap`.'],
  }),
  ...step('5.3', 'Enable both', {
    clicks: ['New descriptions show **Out of order** (disabled). Switch the toggle **on** for the REST row and for the WSDL row.'],
    see: ['**Service description enabled** twice.'],
  }),
  ...step('5.4', 'Grant access to GRANTS-PORTAL', {
    where: 'Tab **Service clients**.',
    clicks: [
      'Click **Add subject**.',
      '**Member / Group**: search `GRANTS-PORTAL`, select `LS-DEV:GOV:MOSD:GRANTS-PORTAL`, Next.',
      '**Services**: tick `population-api` and `verifyIdentity`, click **Add Selected**.',
    ],
    see: ['**Access rights added successfully**. GRANTS-PORTAL listed; clicking it shows both services under **Access Rights Given**.'],
    why: ['The **provider** decides. MOHA chooses on its own ss3 who may call its data; MOSD cannot give itself access.'],
  }),
  ...callout('ok', 'Checkpoint 5', ['On ss3 both service descriptions are enabled, and GRANTS-PORTAL has access to `population-api` and `verifyIdentity`. Wait 1–2 minutes before Phase 6 so ss2 receives the new configuration.']),
);

// =====================================================================
add(H1('11. Phase 6: Test everything in the browser'),
  ...figure('request', 'What happens on one click of “Check pension eligibility”.', 1400, 820),
  H2('11.1 The Grants Portal'),
  P('Open **http://localhost:8500** (**Grants Portal · Old Age Pension intake**). The **Applicant** form has **National ID**, **Date of birth**, **First name**, **Surname** and **Officer (X-Road userId)**, and four buttons:'),
  ...table(['Button', 'X-Road calls it makes', 'Shows'], [
    ['**Check pension eligibility**', 'SOAP verifyIdentity + REST getCitizen', 'Decision ELIGIBLE / REJECT with reasons'],
    ['**Verify identity**', 'SOAP verifyIdentity only', 'Match / no match, without revealing the record'],
    ['**Look up record**', 'REST `GET /citizens/{id}`', 'The full citizen record'],
    ['**Vital status only**', 'REST `GET /citizens/{id}/vital-status`', 'Alive or deceased only'],
  ], [0.3, 0.38, 0.32]),
  ...steps([
    'Open **Sample applicants (synthetic data)** and click **Use** next to **Thabo Letsie**. The form fills in.',
    'Click **Check pension eligibility**.',
    'Read the green result: **Eligible for Old Age Pension** with three ticks (identity matches, alive, age at least 70).',
    'Scroll to **X-Road trace**: two green entries, SOAP and REST, with status and time in ms. Click one to expand: **Request** (what the portal sent to ss2, including the `X-Road-Client` header), **Response headers added by X-Road** (e.g. `X-Road-Id`, `X-Road-Request-Hash`), **Response body**.',
    'Repeat with every sample applicant and compare with the table.',
  ]),
  ...table(['Applicant', 'Expected result', 'Why'], [
    ['Mpho Mokoena', '**ELIGIBLE**', ''],
    ['Thabo Letsie', '**ELIGIBLE**', ''],
    ['Lineo Ramakatane', 'REJECT', 'born 1990, too young'],
    ['Teboho Mofokeng', 'REJECT', 'recorded as deceased'],
    ['Unknown Person (999999999999)', 'REJECT, **Not found**', 'not in the register; the registry’s 404 passes through unchanged'],
  ], [0.32, 0.28, 0.4]),
  H2('11.2 The registry’s audit page (MOHA’s view)'),
  P('Open **http://localhost:8001/audit**. Each pension check adds two rows. Columns: **Time**, **API** (REST/SOAP), **Operation**, **National ID**, **X-Road client**, **User**, **Message ID**, **Outcome**.'),
  ...callout('why', null, ['The **X-Road client** `LS-DEV/GOV/MOSD/GRANTS-PORTAL` was added by ss3 after it verified ss2’s signature, so MOHA can trust it. **User** `officer.ntsane` comes from the form’s Officer field. MOHA can see exactly which ministry, system and officer asked about which citizen: that is the X-Road audit trail.']),
  H2('11.3 The Security Servers’ health'),
  ...steps(['ss2 → **Diagnostics** → **Overview**: **Global configuration**, **Timestamping** and **OCSP responders** all **Everything ok**.', 'Same on ss3. Time-stamping turns green once messages have been logged, which your tests just did.']),
  ...callout('ok', 'Checkpoint 6', ['Thabo Letsie **ELIGIBLE** with two green traces; all five samples as in the table; the audit page shows the verified caller; Diagnostics green on ss2 and ss3. **Your X-Road network works end to end.**']),
  ...pick(callout('tip', 'Optional: the automated check', ['In a terminal, `bash tests/smoke-test.sh` runs seven checks, including that the portal cannot bypass X-Road. Expect `7 passed, 0 failed`.']),
    [...callout('tip', 'Optional: check from the terminal', ['Your laptop can play the portal through ss2’s consumer port. The first command returns Thabo Letsie’s record as JSON; the second lists what GRANTS-PORTAL may call. The automated version of these checks is `bash tests/smoke-test.sh` (expect `7 passed, 0 failed`).']),
     ...code(['curl -H "X-Road-Client: LS-DEV/GOV/MOSD/GRANTS-PORTAL" \\', '  http://localhost:2080/r1/LS-DEV/GOV/MOHA/POPULATION-REGISTRY/population-api/citizens/150319480002', 'curl -H "X-Road-Client: LS-DEV/GOV/MOSD/GRANTS-PORTAL" \\', '  http://localhost:2080/r1/LS-DEV/GOV/MOHA/POPULATION-REGISTRY/allowedMethods'])]),
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
    P('**Undo:**'), ...steps(undo)];
}
add(H1('12. Part C: Break it to learn it'),
  P('Each experiment changes one thing. Predict what will happen, try it, read the error in the portal (each failed trace shows the error and a **Fix:** hint), then undo it and confirm the portal works again. Changes on ss2/ss3 take effect within seconds; give global-configuration changes 1–2 minutes.'),
  ...experiment(1, 'Take away access to the REST service', {
    predict: 'which of the two calls in a pension check will fail?',
    doIt: ['ss3 → **Clients → POPULATION-REGISTRY** → tab **Service clients** → click `GRANTS-PORTAL`.', 'Remove the access right for `population-api` only (keep `verifyIdentity`).', 'Portal: **Check pension eligibility** for Thabo Letsie.'],
    see: ['The SOAP trace is green; the REST trace is red with **AccessDenied** and the hint “ss3 has not granted GRANTS-PORTAL access to this service…”.'],
    learn: 'access is granted per service, by the provider, and checked on the provider’s Security Server.',
    undo: ['Same page → **Add service** → tick `population-api` → **Add Selected**.'],
  }),
  ...experiment(2, 'Minimal disclosure: allow the vital-status endpoint only', {
    predict: 'can the portal still see whether a person is alive? Can it see their record?',
    doIt: [
      'Remove `population-api` from GRANTS-PORTAL’s access rights (as in 12.1).',
      'ss3 → **POPULATION-REGISTRY → Services** → expand the REST description → click `population-api` → tab **Endpoints**.',
      'On `GET /citizens/*/vital-status` open its access rights → **Add subjects** → select GRANTS-PORTAL → **Add Selected**.',
      'Portal: Thabo Letsie → **Vital status only**, then **Look up record**.',
    ],
    see: ['**Vital status only** works; **Look up record** fails with **AccessDenied**.'],
    learn: 'X-Road can grant access to a single endpoint, so a ministry shares only the data a purpose needs.',
    undo: ['Remove the endpoint-level right and grant `population-api` again at service level (12.1 undo).'],
  }),
  ...experiment(3, 'Switch off the SOAP service', {
    predict: 'what does the caller see when a provider takes a service offline?',
    doIt: ['ss3 → **POPULATION-REGISTRY → Services** → switch the WSDL row’s toggle **off**.', 'In **Disable notice** type e.g. `Maintenance until 14:00` → OK.', 'Portal: **Verify identity**.'],
    see: ['**ServiceDisabled**, with your notice text in the response.'],
    learn: 'a provider can take a service offline without deleting it, and tell callers why.',
    undo: ['Switch the toggle back **on**.'],
  }),
  ...experiment(4, 'The registry goes down', {
    predict: 'which component will X-Road blame?',
    doIt: ['This one needs the terminal: `docker compose stop moha-registry`.', 'Portal: **Check pension eligibility**.'],
    see: ['Both traces red with **ServiceFailed** or a network error from ss3 (the provider side).'],
    learn: 'X-Road error codes say where in the chain a failure happened: ClientProxy = consumer’s Security Server, ServerProxy = provider’s Security Server, ServiceFailed = the application behind it.',
    undo: ['`docker compose start moha-registry`, wait a few seconds, test again.'],
  }),
  ...experiment(5, 'Wrong connection type on the consumer side', {
    predict: 'will the request even leave ss2?',
    doIt: ['ss2 → **Clients → GRANTS-PORTAL → Internal servers** → **Connection type** **HTTPS**.', 'Portal: any button.'],
    see: ['**SslAuthenticationFailed**, hint “Connection type mismatch…”.'],
    learn: 'the connection type controls how an application must connect to its own Security Server; ss2 refuses before anything is sent.',
    undo: ['Set **Connection type** back to **HTTP**.'],
  }),
  ...experiment(6, 'Wrong surname', {
    predict: 'does the portal learn the correct surname?',
    doIt: ['Portal: **Use** Thabo Letsie, change **Surname** to `Letsi`, click **Check pension eligibility**.'],
    see: ['SOAP answer **match=false**, `mismatchedFields=surname`; decision **REJECT**.'],
    learn: 'verification without disclosure: MOHA confirms or denies the details without revealing the true record.',
    undo: ['Nothing to undo: click **Use** again.'],
  }),
);

// =====================================================================
// PART D
// =====================================================================
add(H1('13. Part D: When things go wrong'),
  H2('13.1 A method that works'),
  ...steps([
    '**Read the status or error code.** It usually names the component: ClientProxy = ss2, ServerProxy = ss3, ServiceFailed = the registry.',
    '**Check Diagnostics** on the server involved: global configuration, OCSP and time-stamping should be **Everything ok**.',
    '**Check Management Requests** on cs: is something still pending?',
    '**Wait two minutes** after any change on cs: Security Servers only see it in the next global configuration.',
    '**Change one thing at a time**, then test again.',
  ]),
  H2('13.2 Symptoms and fixes'),
  ...table(['What you see', 'Likely cause', 'Fix'], [
    ['Logged out whenever you switch tabs', 'Using `localhost` for several admin pages', 'Use the `.lab` addresses (section 3.2)'],
    ['Page will not load', 'Server still starting or stopped', 'Wait 3–5 min; `docker compose ps`'],
    ['Owner name does not fill in (init)', 'Member not on cs, or configuration not yet published', 'Check cs **Members**; wait 1–2 min'],
    ['**Signer.InternalError** on Generate CSR', 'Comma in **Organization Name (O)**', 'Remove the comma; delete the half-made key'],
    ['Test CA returns an error', 'CSR in PEM format', 'New key with **CSR Format** DER'],
    ['Imported certificate does not attach to a key', 'Certificate is from another server’s CSR', 'Import the right file (use the naming in 3.5)'],
    ['AUTH certificate stuck in **Registration in progress**', 'Not approved on cs, or ss1’s management services not working', 'Approve on cs; check Phase 2 steps 2.13–2.15'],
    ['**UnknownMember** … `clientReg` on ss1', 'Expected the first time (step 2.10)', 'Step 2.11'],
    ['**UnknownMember / AccessDenied / SslAuthenticationFailed** when ss2/ss3 register', 'ss1 management services incomplete', 'Steps 2.13, 2.14, 2.15'],
    ['“certificate is not yet valid”, OCSP or time-stamp errors', 'Laptop clock wrong (e.g. after Windows)', 'Wait for NTP sync; `timedatectl status`'],
    ['**UnknownService** right after Phase 5', 'Configuration not yet on ss2', 'Wait 1–2 minutes'],
    ['Portal: “Could not reach consumer Security Server”', 'ss2 stopped or not initialised', '`docker compose ps`; ss2 admin page'],
    ['ss3 cannot add the OpenAPI/WSDL', 'moha-registry not running', '`docker compose ps`; `docker compose start moha-registry`'],
  ], [0.36, 0.34, 0.30]),
  H2('13.3 Daily routine'),
  ...table(['When', 'Do'], [
    ['Start of a session', 'Terminal: `docker compose start`, wait 3–5 minutes, check `timedatectl status`. Browser: open your bookmarked tabs, log in, glance at **Diagnostics** on each Security Server.'],
    ['End of a session', 'Terminal: `docker compose stop`. All configuration is kept.'],
    ['Never', '`docker compose down -v`: it deletes every volume, i.e. everything in this guide.'],
  ], [0.22, 0.78]),
  H2('13.4 Housekeeping'),
  ...bullets([
    '**API keys:** keys created for scripted work can be revoked on cs under **Settings → API Keys**, and on each Security Server under **Keys and certificates** → tab **API Keys**.',
    '**Anchor file:** keep `configuration_anchor_LS-DEV.xml`; you need it again only if a Security Server is rebuilt.',
  ]),
);

add(H1('14. Progress checklist'),
  P('Print this page and tick each box as you go.'),
  H3('Getting ready'),
  ...checks([pick('Preflight passes; host names set; 7 containers Up', 'Laptop checks pass (3.1.2); host names set (3.1.4); 7 containers Up (3.1.5)'), pick('Certificates fetched into `certs/`', 'Certificates copied into `certs/` (3.1.6)'), 'Seven tabs open and bookmarked; certificate warnings accepted']),
  H3('Phase 1 — Central Server'),
  ...checks(['1.1 Initialised (LS-DEV, cs)', '1.2 Member class GOV', '1.3 Test CA + OCSP `http://ca:8888`', '1.4 TSA `http://ca:8899`', '1.5 MCST, MOSD, MOHA + subsystems', '1.6 Management services provider MCST:MANAGEMENT', '1.7 Internal and external signing keys', '1.8 Anchor downloaded; no red banners']),
  H3('Phase 2 — ss1'),
  ...checks(['2.1–2.3 Initialised, token, TSA', '2.4–2.6 SIGN and AUTH CSRs signed', '2.7–2.9 Imported, activated, registered, approved: MCST REGISTERED', '2.10–2.11 MANAGEMENT REGISTERED', '2.12–2.15 WSDL, service URL, TLS certificate, access rights']),
  H3('Phase 3 — ss2 and ss3'),
  ...checks(['ss2: MOSD REGISTERED', 'ss3: MOHA REGISTERED']),
  H3('Phases 4 to 6'),
  ...checks(['GRANTS-PORTAL and POPULATION-REGISTRY REGISTERED; connection type HTTP', 'REST and SOAP services enabled; GRANTS-PORTAL has access', 'Portal results correct for all five samples', 'Audit page shows the verified caller; Diagnostics green']),
  H3('Part C'),
  ...checks(['12.1 Access denied', '12.2 Endpoint-only access', '12.3 Service disabled', '12.4 Registry down', '12.5 Connection type', '12.6 Wrong surname']),
);

add(H1('15. Quick reference and glossary'),
  H2('15.1 Addresses'),
  ...table(['What', 'Address', 'Login'], [
    ['Central Server', 'https://cs.lab:4000', 'xrd / secret'],
    ['ss1 · ss2 · ss3', 'https://ss1.lab:1000 · https://ss2.lab:2000 · https://ss3.lab:3000', 'xrd / secret'],
    ['Test CA signing page', 'http://localhost:8888/testca/', '—'],
    ['Grants Portal', 'http://localhost:8500', '—'],
    ['Registry audit page', 'http://localhost:8001/audit', '—'],
  ], [0.25, 0.55, 0.2]),
  H2('15.2 URLs you type into the admin pages'),
  ...table(['Typed where', 'URL'], [
    ['cs: OCSP responder (1.3)', '`http://ca:8888`'],
    ['cs: time-stamping service (1.4)', '`http://ca:8899`'],
    ['ss1: management services WSDL (2.12)', '`http://cs/managementservices.wsdl`'],
    ['ss1: management service URL (2.13)', '`https://cs:4002/managementservice/manage/`'],
    ['ss3: REST service description (5.1)', '`http://moha-registry:8000/openapi.yaml`'],
    ['ss3: WSDL (5.2)', '`http://moha-registry:8000/soap/population.wsdl`'],
  ], [0.45, 0.55]),
  P('These names (`ca`, `cs`, `moha-registry`) exist only inside Docker. They are used by the servers, not by your browser, so they will not open in a tab.'),
  H2('15.3 Glossary'),
  ...table(['Term', 'Meaning'], [
    ['Anchor', 'File with the Central Server’s configuration address and the key that verifies it.'],
    ['AUTH certificate', 'Proves which Security Server you are talking to.'],
    ['SIGN certificate', 'Proves which organisation sent a message.'],
    ['CSR', 'Certificate Signing Request: what you send to a CA to get a certificate.'],
    ['DER / PEM', 'Binary and text formats of the same certificate data.'],
    ['Global configuration', 'The signed list of members, servers, CAs and services every Security Server downloads each minute.'],
    ['Management services', 'Services on MCST/MANAGEMENT (hosted by ss1) that carry registration requests to cs.'],
    ['OCSP', 'Online check that a certificate is still valid.'],
    ['Subsystem', 'One application of a member; access rights are given to subsystems.'],
    ['Token', 'The protected key store on each server, unlocked with the PIN.'],
    ['TSA', 'Time-Stamping Authority: signs the time on the message logs.'],
  ], [0.25, 0.75]),
);

save(k, path.resolve(__dirname, pick('../XRoad-Lab-Browser-Guide.docx', '../XRoad-Lab-Browser-Guide-Explicit-Commands.docx')), {
  title: pick('X-Road LS-DEV Lab: The Browser Guide', 'X-Road LS-DEV Lab: The Browser Guide (explicit commands)'),
  header: pick('X-Road LS-DEV lab · Browser guide', 'X-Road LS-DEV lab · Browser guide · explicit commands'), creator: 'Motlatsi Victor Mpahane',
});
