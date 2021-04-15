#!/bin/bash

export URL="https://sandbox.ebsco.io/rm/rmaccounts";
export INSTITUTES="{}";

if [[ -f env.local.sh ]] ; then
  source env.local.sh
fi
