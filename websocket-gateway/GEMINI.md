# GEMINI.md

This file provides context for the Gemini AI assistant to understand the project structure, purpose, and conventions.

## Project Overview

This project is a .NET 9 WebSocket Gateway service. Its primary function is to listen for events from a RabbitMQ message broker and broadcast them to connected clients using SignalR.

The application is structured as a standard .NET solution with the following key projects:

-   `Web`: The main ASP.NET Core project that hosts the SignalR hub and the RabbitMQ consumer.
-   `Contracts`: A class library containing data transfer objects (DTOs) and message contracts.

The service is designed to be cloud-native, with support for containerization via a `Dockerfile` and deployment to Kubernetes using a Helm chart located in the `charts` directory.

### Key Technologies

-   **.NET 9**
-   **ASP.NET Core**
-   **SignalR** for real-time web functionality.
-   **MassTransit** for simplified communication with RabbitMQ.
-   **RabbitMQ** as the message broker.
-   **FluentValidation** for request and options validation.
-   **Docker** for containerization.
-   **Helm** for Kubernetes deployments.
-   **AsyncAPI** for defining the asynchronous API contract.

## Building and Running

### Local Development

To run the service locally, use the following command from the root directory:

```bash
dotnet run --project src/Web/Web.csproj
```

The service will be available at `http://localhost:5000` (or as configured in `launchSettings.json`).

A Swagger UI for the AsyncAPI specification is available when the application is running.

### Testing the SignalR Client

A TypeScript test client is located in the `signalr-test` directory. To use it:

1.  Make sure the main application is running.
2.  Navigate to the `signalr-test` directory:
    ```bash
    cd signalr-test
    ```
3.  Install dependencies:
    ```bash
    npm install
    ```
4.  Run the client:
    ```bash
    npx tsx client.ts
    ```

## Development Conventions

-   **Centralized Package Management:** The project uses `Directory.Build.props` and `Directory.Packages.props` to manage NuGet package versions across the solution.
-   **Configuration:** Application configuration is managed through `appsettings.json` files, with strongly-typed options classes in the `src/Web/Configuration` directory.
-   **Validation:** FluentValidation is used for validating configuration options and incoming requests.
-   **Asynchronous API:** The `asyncapi.yaml` file serves as the single source of truth for the asynchronous messaging contract.
