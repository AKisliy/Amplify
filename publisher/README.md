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

#### Social Media Connections

To connect a social media account (e.g., Instagram, TikTok), the frontend application should follow these steps:

1.  **Get the Authorization URL**: The frontend should make a `GET` request to the appropriate endpoint to obtain a unique authorization URL for the desired social media platform. For example, to connect Instagram for a specific project, you would call `/api/integrations/{projectId}/instagram/auth-url`.

2.  **Redirect the User**: The frontend should redirect the user to the authorization URL returned by the backend. This URL will lead the user to the social media platform's website to approve the connection. The `redirectUrl` provided in the backend's response will point to a page on the frontend application, such as a loading or confirmation page.

3.  **Handle the Callback**: After the user approves the connection, the social media platform will redirect them back to the `redirectUrl` specified in step 2. This callback URL will include `code` and `state` as query parameters.

4.  **Connect the Account**: On the callback page, the frontend should extract the `code` and `state` from the query parameters and make a `POST` request to the `/api/connections` endpoint, sending these values in the request body.

The backend will then process the information, finalize the connection with the social media platform, and redirect the user to an appropriate page within the application to confirm that the account has been successfully linked.



