# node-etatcollhlm

**Table of content**
- [Prerequisites](#prerequisites)
- [Installation](#Installation)
- [Configuration](#Configuration)
- [Global options](#Global-options)
- [Command line usage](#Command-line-usage)
- [Commands](#Commands)

## Prerequisites

The tools you need to let node-etatcollhlm run are :
* npm
* node 14.15.2
## Installation

```bash
$ npm i -g .
```

 ## Global options
| Name | Type | Description |
| --- | --- | --- |
| -V, --version | Boolean | Print the version number |
| -h, --help | Boolean | Show some help |

You can get help for any command by typing `node-etatcollhlm <command> --help`.

## Command line usage
The module provides an `etatcollhlm` command (aliased `hlm`).

## Commands
### hlm config
Update config to fetch ez-meta.
#### parameters
| Name | Description |
| --- | --- |
| -ur --url | elastic url |
| -p --port | elastic port |
| -us --user | elastic user |
| -pwd --password | elastic password |
| -f --file | display the configuration |
#### Example
```bash
$ etatcollhlm config -u http://localhost
$ etatcollhlm config -p 8080
$ etatcollhlm config -us elastic
$ etatcollhlm config -pwd changeme
```
### hlm ping
Check if service is available.
#### Example
```bash
$ etatcollhlm ping
```

### hlm insert
Starts an etatcollhlm data insertion.

#### Parameters
| Name | Description |
| --- | --- |
| -f --file | file need to be insert |

#### Example
```bash
$ etatcollhlm insert -f file.csv
```

### hlm reset
reset etatcollhlm index on ez-meta.

#### Example
```bash
$ etatcollhlm reset
```