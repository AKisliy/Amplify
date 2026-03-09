# Gemini Project Context: Publisher

This document provides context for the "Publisher" project, a .NET application designed for social media content publishing.

## Project Overview

The Publisher is a .NET 8 application built following the principles of **Clean Architecture**. It is designed to schedule and publish content (primarily videos) to social media platforms, with a specific focus on Instagram.

The solution is divided into several layers:

*   `Domain`: Contains core business entities, enums, events, and exceptions.
*   `Application`: Implements the business logic using a **CQRS pattern with MediatR**. It defines commands, queries, and their handlers.
*   `Infrastructure`: Provides implementations for external concerns like databases, authentication, file storage, and communication with social media APIs. It uses **Entity Framework Core** for data access with a PostgreSQL database and **MassTransit** for RabbitMQ integration.
*   `Web`: Exposes the application's functionality through a RESTful API built with **.NET Minimal APIs**. It includes Swagger/OpenAPI for API documentation.
*   `Contracts`: Defines data transfer objects (DTOs) and commands/events for communication between services.

The project is containerized using Docker and includes a Helm chart for Kubernetes deployment.

## Building and Running

### Docker (Recommended)

The simplest way to run the project is by using the provided Docker Compose configuration.

1.  Ensure you have Docker and Docker Compose installed.
2.  Obtain the `.env` file with the necessary secrets.
3.  Run the following command from the root `publisher` directory:

    ```bash
    docker compose up --build -d
    ```

This will start the API service, a PostgreSQL database, and a RabbitMQ broker. The API will be available at `http://localhost:6060`.

### .NET CLI

To build and run the project locally using the .NET SDK:

1.  **Build the solution:**
    ```bash
    dotnet build Publisher.sln
    ```

2.  **Run the web application:**
    ```bash
    dotnet run --project src/Web/Web.csproj
    ```

You will need to have a PostgreSQL database and RabbitMQ instance running and configure the connection strings in `src/Web/appsettings.Development.json`.

## Development Conventions

*   **Architecture**: Follows **Clean Architecture** and **CQRS**. New features should be implemented by adding new commands or queries and their corresponding handlers in the Application layer.
*   **API**: The `Web` project uses **Minimal APIs**. Endpoints are organized into groups within the `Endpoints` directory.
*   **Data Access**: **Entity Framework Core** is used with a code-first approach. Migrations are used to manage database schema changes.
*   **Testing**: The solution includes projects for unit, functional, and integration tests. New features should be accompanied by appropriate tests.
*   **API Documentation**: The API is documented using **NSwag** to generate an OpenAPI specification. The Swagger UI can be accessed at `/api` when the application is running.
*   **Configuration**: Application settings are managed through `appsettings.json` files and environment variables. The project also supports Azure Key Vault for secret management.
