# ---------- BUILD ----------
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY Directory.Packages.props .
COPY Directory.Build.props .

COPY src/Web/Web.csproj src/Web/
COPY src/Application/Application.csproj src/Application/
COPY src/Domain/Domain.csproj src/Domain/
COPY src/Infrastructure/Infrastructure.csproj src/Infrastructure/

RUN dotnet restore src/Web/Web.csproj

COPY . .
WORKDIR /src/src/Web

RUN dotnet publish Web.csproj -c Release -o /app/publish /p:UseAppHost=false

# ---------- RUNTIME ----------
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app

EXPOSE 5000
ENV ASPNETCORE_URLS=http://+:5000

COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "UserService.Web.dll"]
