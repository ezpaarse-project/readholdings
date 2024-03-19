# readholdings

**Table of content**
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Global options](#global-options)
- [Command line usage](#command-line-usage)
- [Commands](#commands)

## Prerequisites

The tools you need to let node-ezhlm run are :
* docker
* docker compose
* npm (for development)

## Installation

```bash
git clone https://github.com/ezpaarse-project/node-ezhlm
```
## dev

```bash
# Execute this one time
docker-compose -f docker-compose.debug.yml run --rm elastic chown -R elasticsearch /usr/share/elasticsearch/ 

# Start ReadHoldings as daemon
docker-compose -f docker-compose.debug.yml up -d

# Stop ReadHoldings
docker-compose -f docker-compose.debug.yml stop

# Get the status of ReadHoldings services
docker-compose -f docker-compose.debug.yml ps
```
