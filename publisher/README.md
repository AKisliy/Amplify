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

### Integrations

This section describes how to integrate external services with the Publisher API.

#### Instagram

To connect an Instagram account, the frontend application should follow these steps:

1.  **Get the Authorization URL**: The frontend should make a `GET` request to the `/api/integrations/{projectId}/instagram/auth-url` endpoint, where `{projectId}` is the ID of the project to which the Instagram account will be linked. The backend will respond with a URL for Instagram's authorization page.

2.  **Redirect the User**: The frontend should redirect the user to the authorization URL received from the backend. This will take the user to Instagram to approve the connection.

3.  **Handle the Callback**: After the user approves the connection, Instagram will redirect them back to a predefined callback URL. This callback will include a `code` and a `state` parameter in the query string.

4.  **Decode the State and Connect**: The `state` parameter is a Base64-encoded JSON object containing the `projectId`. The frontend should decode this `state` to retrieve the `projectId`. The `state` structure is as following:
```json
{
    "projectId": "YOUR_PROJECT_ID"
}
```
Then, it should make a `POST` request to the `/api/integrations/{projectId}/instagram/connect` endpoint, including the `code` received from Instagram.

Once these steps are completed, the Instagram account will be connected to the specified project.



