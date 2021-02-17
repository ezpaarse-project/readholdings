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
| -f --file | display the configuration |
#### Example
```bash
$ etatcollhlm config --set
$ etatcollhlm config --url http://localhost
$ etatcollhlm config --port 8080
$ etatcollhlm config --user elastic
$ etatcollhlm config --password changeme
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
$ etatcollhlm insert -f ./file.csv
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