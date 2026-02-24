#!/bin/bash

# readholdings
SCRIPT_DIR=$(dirname "${BASH_SOURCE[0]}")
LOCAL_ENV_FILE="$SCRIPT_DIR/readholdings.local.env.sh"

# disabled it if you are in deploiement
export NODE_CONFIG='{ "smtp": { "secure": false, "ignoreTLS": true } }'

if [[ -f $LOCAL_ENV_FILE ]] ; then
  source "$LOCAL_ENV_FILE"
fi
