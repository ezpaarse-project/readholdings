# readholdings-api

Service providing an API for insert HLM data and manage elastic index.

## Config

To set up this service, you can use environment variables. The config is displayed at startup. Sensitive data are not displayed.

```
# if sensitive data are not updated
[app] warn: [config]: Elasticsearch password has the default value 
[app] warn: [config]: ApiKey has the default value 
[app] info: {
  "nodeEnv": "development",
  "timezone": "Europe/Paris",
  "elasticsearch": {
    "nodes": "http://elastic:9200",
    "username": "elastic",
    "password": "********"
  },
  "paths": {
    "log": {
      "applicationDir": "./log/application",
      "accessDir": "./log/access",
      "healthCheckDir": "./log/healthcheck"
    }
  },
  "index": "int_cnrs-unites",
  "apikey": "********"
}
```

## Environment variables

| name | default | description |
| --- | --- | --- |
| NODE_ENV | development | environment of node |
| TIMEZONE | Europe/Paris | timezone of app used in cron |
| ELASTICSEARCH_NODES | http://elastic | elastic node separated by a comma |
| ELASTICSEARCH_USERNAME | elastic | username of elastic super user |
| ELASTICSEARCH_PASSWORD | changeme | password of elastic super user |
| ADMIN_APIKEY | changeme | admin API key |

### Cron

TODO

### Elastic mapping

- [readholdings](./mapping/holdings.json)

## Open API

TODO

## Access Log format

```
[:date[clf]] ":method :url :status :res[content-length] ":user-agent" ":apikey-name"
```


## Test

TODO