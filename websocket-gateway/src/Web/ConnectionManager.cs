using RabbitMQ.Client;

namespace WebSocketGateway.Web;

public class ConnectionManager
{
    private readonly ConnectionFactory _factory;
    private IConnection? _connection;

    public ConnectionManager(string hostName, string userName, string password, string vhost)
    {
        _factory = new ConnectionFactory
        {
            // The hostname or IP of the RabbitMQ broker (e.g., localhost or a server name).
            HostName = hostName,
            // Username to authenticate with RabbitMQ (e.g., ecommerce_user).
            UserName = userName,
            // Password for the above username.
            Password = password,
            // The virtual host (vhost) in RabbitMQ to connect to (e.g., ecommerce_vhost).
            VirtualHost = vhost,
        };
    }

    public async Task<IConnection> GetConnectionAsync()
    {
        if (_connection == null || !_connection.IsOpen)
        {
            _connection = await _factory.CreateConnectionAsync();
        }
        return _connection;
    }
}
