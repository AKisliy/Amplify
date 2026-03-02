FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

RUN dotnet tool install --global dotnet-ef
ENV PATH="$PATH:/root/.dotnet/tools"

COPY Directory.Packages.props .
COPY Directory.Build.props .
COPY src/Web/Web.csproj src/Web/
COPY src/Application/Application.csproj src/Application/
COPY src/Domain/Domain.csproj src/Domain/
COPY src/Infrastructure/Infrastructure.csproj src/Infrastructure/
COPY src/Contracts/Contracts.csproj src/Contracts/

RUN dotnet restore src/Web/Web.csproj
COPY src ./src
WORKDIR /src/src/Web

RUN dotnet build Web.csproj -c Release --no-restore

FROM build AS publish
RUN dotnet publish Web.csproj -c Release -o /app/publish --no-restore

FROM build AS bundle
RUN dotnet ef migrations bundle -s Web.csproj --context ApplicationDbContext --self-contained -o /app/efbundle

# API (target: final-api)
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final-api
WORKDIR /app
COPY --from=publish /app/publish .
ENV ASPNETCORE_HTTP_PORTS=5001
EXPOSE 5001
USER app
ENTRYPOINT ["dotnet", "Publisher.Web.dll"]

# Migrations (target: final-migrations)
FROM mcr.microsoft.com/dotnet/runtime-deps:9.0 AS final-migrations
WORKDIR /app
RUN adduser --disabled-password --gecos "" appuser && chown -R appuser /app
USER appuser
COPY --from=bundle /app/efbundle .
ENTRYPOINT ["./efbundle"]