FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

RUN dotnet tool install --global dotnet-ef
ENV PATH="$PATH:/root/.dotnet/tools"

COPY ["Directory.Packages.props", "."]
COPY ["Directory.Build.props", "."]

COPY ["src/Web/Web.csproj", "Web/"]
COPY ["src/Application/Application.csproj", "Application/"]
COPY ["src/Domain/Domain.csproj", "Domain/"]
COPY ["src/Infrastructure/Infrastructure.csproj", "Infrastructure/"]

RUN dotnet restore "Web/Web.csproj"

COPY . ../

WORKDIR "/src/Web"

RUN dotnet build "Web.csproj" -c Release -o /app/build --no-restore

FROM build AS publish
RUN dotnet publish "Web.csproj" -c Release -o /app/publish /p:UseAppHost=false --no-restore

FROM build AS bundle
RUN dotnet ef migrations bundle -s Web.csproj --context ApplicationDbContext --self-contained -o /app/efbundle

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
ENV ASPNETCORE_HTTP_PORTS=5001
EXPOSE 5001
USER app
COPY --from=publish /app/publish .

ENTRYPOINT ["dotnet", "UserService.Web.dll"]

FROM mcr.microsoft.com/dotnet/runtime-deps:9.0 AS final-migrations
WORKDIR /app
RUN adduser --disabled-password --gecos "" appuser && chown -R appuser /app
USER appuser
COPY --from=bundle /app/efbundle .
ENTRYPOINT ["./efbundle"]