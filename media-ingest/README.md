[![Open in Swagger Editor](https://img.shields.io/badge/Open_in-Swagger_Editor-orange?logo=swagger)](https://editor.swagger.io/?url=https://raw.githubusercontent.com/AKisliy/Amplify/refs/heads/main/media-ingest/src/Web/wwwroot/api/specification.json)

# MediaIngest

The project was generated using the [Clean.Architecture.Solution.Template](https://github.com/jasontaylordev/CleanArchitecture) version 9.0.12.

### Local deployment
To deploy media-ingest service locally do the following:
1. Head to media-ingest directory: `cd media-ingest`
2. Spin up docker-compose: `docker compose up --build -d`

To verify that everything has started correctly:
- Go to http://localhost:5070/api/index.html?url=/api/specification.json - you should see swagger docs.
- Go to http://localhost:9001 - you'll see S3 interface (default creds are: `minioadmin` + `minioadmin`)

### Local testing
By default service will create some default data for you:
1. Default image ID: `5ee06455-ef52-453f-8cb4-33a028567c28`

