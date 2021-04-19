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
$ git clone https://github.com/ezpaarse-project/node-etatcollhlm
$ cd node-etatcollhlm
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

- [config](#etatcollhlm-config)
- [ping](#etatcollhlm-ping)
- [init](#etatcollhlm-init)
- [download](#etatcollhlm-download)
- [insert](#etatcollhlm-insert)
- [info](#etatcollhlm-info)
- [reset](#etatcollhlm-reset)
### etatcollhlm config
Update config to fetch ez-meta.
The default configuration is saved in a file at $HOME/.config/.etatcollhlmrc
#### parameters
| Name | Description |
| --- | --- |
| -g --get | display the configuration of $HOME/.config/.etatcollhlmrc |
| -s --set | initiate a configuration file at $HOME/.config/.etatcollhlmrc  |
| --url | elastic url |
| --port | elastic port |
| --user | elastic user |
| --password | elastic password |
| --institutes | custif and apikey of institute in JSON format |
| -f --file | display the configuration |
#### Example
```bash
$ etatcollhlm config --set
$ etatcollhlm config --url http://localhost
$ etatcollhlm config --port 8080
$ etatcollhlm config --user elastic
$ etatcollhlm config --password changeme
$ etatcollhlm config --institutes "{\"INSTITUTE\": {\"custid\":\"customerID\", \"apikey\": \"x-api-key\"}}",
```
output
```bash
info: {
  "url": "http://localhost",
  "port": "9200",
  "user": "elastic",
  "password": "changeme",
  "institutes": "{\"INSTITUTE\": {\"custid\":\"customerID\", \"apikey\": \"x-api-key\"}}"
}
info: from /home/.config/.etatcollhlmrc
```
### etatcollhlm ping
Check if service is available.
#### Parameter

| Name | Description |
| --- | --- |
| -u --use | use a custom configuration file |
#### Example
```bash
$ etatcollhlm ping
```

output
```bash
info: service available http://localhost:9200
```
### etatcollhlm init

initiates the etatcollhlm index with this [mapping](https://github.com/ezpaarse-project/node-etatcollhlm/blob/master/index/etatcollhlm.json) 
#### Parameter
| Nom | Description |
| --- | --- |
| -u --use | use a custom configuration file |
#### Example

```bash
$ etatcollhlm init
```
output
```bash
info: etatcollhlm index has created
# or
error: etatcollhlm index already exist
```
### etatcollhlm download

Recovers data from ebsco to put them in a csv file in "standard" format
#### Parameter
| Nom | Description |
| --- | --- |
| i --institute | institute name  |
| -r --resume | resume downloading where it left off|
| -u --use | use a custom configuration file |

#### Example
```bash
$ etatcollhlm download -i INSU
```
output
```bash
progress [===================-------------------] 50% | 8196/16392 data
```

### etatcollhlm insert
before use this command, make sure etatcollhlm is created.
Insert the contents of a file into the etatcollhlm index.
#### Parameters
| Name | Description |
| --- | --- |
| -f --file | file need to be insert |
|-v --verbose | display ther number of lines in the file as a parameter and how many lines have been inserted |
| -u --use | use a custom configuration file |
#### Example
```bash
$ etatcollhlm insert -f ./file.csv -v
```
output
```bash
info: lines that must be inserted 437329
progress [========================================] 100% | 270929541/270929541 bytes
info: 437329/437329 lines inserted
```
### etatcollhlm info
#### Parameter

| Nom | Description |
| --- | --- |
| -u --use | use a custom configuration file |
#### Exemple
```bash
$ etatcollhlm info
```

output
```bash
info: Number total documents in index etatcollhlm: 20
info: IN2P3: 1
info: INC: 2
info: INEE: 3
info: INP: 4
info: INS2I: 0
info: INSB: 1
info: INSHS: 2
info: INSIS: 3
info: INSMI: 4
info: INSU: 0
```
### etatcollhlm reset
empty etatcollhlm index on ez-meta.
#### Parameter

| Name | Description |
| --- | --- |
| -u --use | use a custom configuration file |
#### Example
```bash
$ etatcollhlm reset
```

output
```bash
info: documents deleted : 20
```