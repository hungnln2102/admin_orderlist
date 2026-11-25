#!/bin/sh
set -eu

# The alias resolves only on the network shared with the backend.
control_ip=$(getent ahostsv4 warehouse-browser-control | awk 'NR == 1 { print $1 }')
test -n "$control_ip"

exec socat "TCP4-LISTEN:9223,bind=$control_ip,reuseaddr,fork" TCP4:127.0.0.1:9222
