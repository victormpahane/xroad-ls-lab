#!/usr/bin/env bash
# Install Docker Engine + Compose v2 on Ubuntu 26.04 from Docker's official
# apt repository (steps from https://docs.docker.com/engine/install/ubuntu/).
# Run once:  bash scripts/install-docker.sh   (asks for your sudo password)
set -euo pipefail
ME=${USER:-$(id -un)}

. /etc/os-release
if [ "${ID:-}" != "ubuntu" ]; then
  echo "This script is for Ubuntu (found: ${PRETTY_NAME:-unknown})." >&2; exit 1
fi
if [ "${VERSION_ID:-}" != "26.04" ]; then
  echo "Note: written for Ubuntu 26.04, found ${VERSION_ID:-?}. Docker also supports 24.04 and 22.04, continuing."
fi

echo "== Removing packages that conflict with Docker's own (ignore 'not installed')"
for pkg in docker.io docker-compose docker-compose-v2 docker-doc docker-buildx podman-docker containerd runc; do
  sudo apt-get remove -y "$pkg" >/dev/null 2>&1 || true
done

echo "== Adding Docker's apt repository"
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
sudo tee /etc/apt/sources.list.d/docker.sources >/dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: ${UBUNTU_CODENAME:-$VERSION_CODENAME}
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
sudo apt-get update

echo "== Installing Docker Engine and the Compose plugin"
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker

echo "== Letting $ME run docker without sudo"
sudo usermod -aG docker "$ME"

echo "== Tools the lab guide uses"
sudo apt-get install -y unzip

sudo docker run --rm hello-world >/dev/null && echo "Docker works."
docker compose version 2>/dev/null || sudo docker compose version
cat <<'MSG'

Done. Log out and back in (or reboot) so the docker group applies,
then run:  bash scripts/preflight.sh
MSG
