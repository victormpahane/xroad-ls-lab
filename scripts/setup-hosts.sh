#!/usr/bin/env bash
# Give each admin UI its own host name so one browser keeps separate logins.
#
# Browsers store cookies per host name and ignore the port, so
# https://localhost:4000 and https://localhost:2000 share a session cookie
# and keep logging each other out. With these aliases you open
# https://cs.lab:4000, https://ss1.lab:1000, https://ss2.lab:2000 and
# https://ss3.lab:3000 instead, all still pointing at this laptop.
set -euo pipefail

LINE="127.0.0.1 cs.lab ss1.lab ss2.lab ss3.lab ca.lab  # x-road lab"
if grep -q "# x-road lab" /etc/hosts; then
  echo "Lab host names already in /etc/hosts:"; grep "# x-road lab" /etc/hosts
else
  echo "$LINE" | sudo tee -a /etc/hosts >/dev/null
  echo "Added to /etc/hosts: $LINE"
fi
# To undo later:  sudo sed -i '/# x-road lab/d' /etc/hosts
