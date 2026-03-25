FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY ["Directory.Packages.props", "."]
COPY ["Directory.Build.props", "."]
COPY ["src/Web/Web.csproj", "Web/"]

RUN dotnet restore "Web/Web.csproj"

COPY . ../

WORKDIR "/src/Web"

RUN dotnet build "Web.csproj" -c Release -o /app/build --no-restore

FROM build AS publish

RUN dotnet publish "Web.csproj" -c Release -o /app/publish /p:UseAppHost=false --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app

ENV ASPNETCORE_HTTP_PORTS=5080
EXPOSE 5080

USER app

COPY --from=publish /app/publish .

ENTRYPOINT ["dotnet", "AiGateway.Web.dll"]
