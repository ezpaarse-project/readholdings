#!/bin/bash

export PROXY_INSU_BIBCNRS="proxy";
export URL="https://sandbox.ebsco.io/rm/rmaccounts/";
export APIKEY="api_key";
export CUSTID="custid";

if [[ -f env.local.sh ]] ; then
  source env.local.sh
fi
