#!/bin/sh
set -eu

browser="$WAREHOUSE_CHROMIUM_EXECUTABLE"
uid="$WAREHOUSE_CHROMIUM_UID"
unset WAREHOUSE_CHROMIUM_EXECUTABLE WAREHOUSE_CHROMIUM_UID
exec setpriv --reuid "$uid" --regid "$uid" --clear-groups --no-new-privs "$browser" "$@"
