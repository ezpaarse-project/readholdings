# node-ezhlm

**Table of content**
- [Prerequisites](#prerequisites)
- [Installation](#Installation)
- [Configuration](#Configuration)
- [Global options](#Global-options)
- [Command line usage](#Command-line-usage)
- [Commands](#Commands)

## Prerequisites

The tools you need to let node-ezhlm run are :
* npm
* node 14.15.2
## Installation

```bash
$ git clone https://github.com/ezpaarse-project/node-ezhlm
$ cd node-ezhlm
$ npm i -g .
```

 ## Global options
| Name | Type | Description |
| --- | --- | --- |
| -V, --version | Boolean | Print the version number |
| -h, --help | Boolean | Show some help |

You can get help for any command by typing `node-ezhlm <command> --help`.

## Command line usage
The module provides an `ezhlm` command (aliased `hlm`).

## Commands

- [config](#ezhlm-config)
- [ping](#ezhlm-ping)
- [init](#ezhlm-init)
- [download](#ezhlm-download)
- [insert](#ezhlm-insert)
- [info](#ezhlm-info)
- [reset](#ezhlm-reset)
### ezhlm config
Update config to fetch ez-meta.
The default configuration is saved in a file at $HOME/.config/.ezhlmrc
#### parameters
| Name | Description |
| --- | --- |
| -g --get | display the configuration of $HOME/.config/.ezhlmrc |
| -s --set | initiate a configuration file at $HOME/.config/.ezhlmrc  |
| --url | elastic url |
| --port | elastic port |
| --user | elastic user |
| --password | elastic password |
| --institutes | custif and apikey of institute in JSON format |
| -f --file | display the configuration |
#### Example
```bash
$ ezhlm config --set
$ ezhlm config --url http://localhost
$ ezhlm config --port 8080
$ ezhlm config --user elastic
$ ezhlm config --password changeme
$ ezhlm config --institutes "{\"INSTITUTE\": {\"custid\":\"customerID\", \"apikey\": \"x-api-key\"}}",
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
info: from /home/.config/.ezhlmrc
```
### ezhlm ping
Check if service is available.
#### Parameter

| Name | Description |
| --- | --- |
| -u --use | use a custom configuration file |
#### Example
```bash
$ ezhlm ping
```

output
```bash
info: service available http://localhost:9200
```
### ezhlm init

initiates the ezhlm index with this [mapping](https://github.com/ezpaarse-project/node-ezhlm/blob/master/index/ezhlm.json) 
#### Parameter
| Nom | Description |
| --- | --- |
| -u --use | use a custom configuration file |
#### Example

```bash
$ ezhlm init
```
output
```bash
info: ezhlm index has created
# or
error: ezhlm index already exist
```
### ezhlm download

Recovers data from ebsco to put them in a csv file in "standard" format
#### Parameter
| Nom | Description |
| --- | --- |
| i --institute | institute name  |
| -r --resume | resume downloading where it left off|
| -u --use | use a custom configuration file |

#### Example
```bash
$ ezhlm download -i INSU
```
output
```bash
progress [===================-------------------] 50% | 8196/16392 data
```

### ezhlm insert
before use this command, make sure ezhlm is created.
Insert the contents of a file into the ezhlm index.
#### Parameters
| Name | Description |
| --- | --- |
| -f --file | file need to be insert |
|-v --verbose | display ther number of lines in the file as a parameter and how many lines have been inserted |
| -u --use | use a custom configuration file |
#### Example
```bash
$ ezhlm insert -f ./file.csv -v
```
output
```bash
info: lines that must be inserted 437329
progress [========================================] 100% | 270929541/270929541 bytes
info: 437329/437329 lines inserted
```
### ezhlm info
#### Parameter

| Nom | Description |
| --- | --- |
| -u --use | use a custom configuration file |
#### Exemple
```bash
$ ezhlm info
```

output
```bash
info: Number total documents in index ezhlm: 20
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
### ezhlm reset
empty ezhlm index on ez-meta.
#### Parameter

| Name | Description |
| --- | --- |
| -u --use | use a custom configuration file |
#### Example
```bash
$ ezhlm reset
```

output
```bash
info: documents deleted : 20
```