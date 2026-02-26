[![Open in Swagger Editor](https://img.shields.io/badge/Open_in-Swagger_Editor-orange?logo=swagger)](https://editor.swagger.io/?url=https://raw.githubusercontent.com/AKisliy/Amplify/refs/heads/main/publisher/src/Web/wwwroot/api/specification.json)

# Publisher

The project was generated using the [Clean.Architecture.Solution.Template](https://github.com/jasontaylordev/CleanArchitecture) version 9.0.12.

### Local deployment
To deploy publisher service locally do the following:
1. Head to publisher directory: `cd publisher`
2. Ask @AKisliy for .env file.
3. Download it and put in `publisher/` directory.
4. Spin up docker-compose: `docker compose up --build -d`

That's it ✨ Go to http://localhost:6001/api/index.html?url=/api/specification.json - u should see swagger docs.

### Local testing
By default app will seed data every time u start it in dev mode. Here are default values:
- Default Project's id = `7780aa16-edd0-4849-af77-f4280da56d6a`
- Default Account connected to project = `7b577f75-d8a7-40c0-87d4-17bd49bb6842`
- Default Autolist connected to project = `8dafea28-5230-445a-84b2-04e98cebce54`
- Also app is configured with default JWT (100 years expiry). You can find it in logs.



