using System;
using System.Collections.Concurrent;
using System.Net;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace AdvisorBridge
{
    public class BridgeServer
    {
        private readonly Lib.DatabaseManager _db;
        private readonly AuroraPatch.Patch _patch;
        private HttpListener _listener;
        private CancellationTokenSource _cts;
        private readonly ConcurrentDictionary<string, WebSocket> _clients = new ConcurrentDictionary<string, WebSocket>();

        public int Port { get; private set; }
        public bool IsRunning { get; private set; }

        public BridgeServer(Lib.DatabaseManager db, AuroraPatch.Patch patch)
        {
            _db = db;
            _patch = patch;
        }

        public void Start(int port = 47842)
        {
            Port = port;
            _cts = new CancellationTokenSource();

            var thread = new Thread(() => RunServer(_cts.Token))
            {
                IsBackground = true,
                Name = "AdvisorBridge-Server"
            };
            thread.Start();
        }

        public void Stop()
        {
            IsRunning = false;
            _cts?.Cancel();

            foreach (var kvp in _clients)
            {
                try
                {
                    kvp.Value.CloseAsync(WebSocketCloseStatus.NormalClosure, "Server stopping", CancellationToken.None).Wait(1000);
                }
                catch { }
            }
            _clients.Clear();

            try { _listener?.Stop(); } catch { }
        }

        private void RunServer(CancellationToken ct)
        {
            try
            {
                _listener = new HttpListener();
                _listener.Prefixes.Add($"http://localhost:{Port}/");
                _listener.Start();
                IsRunning = true;

                _patch.LogInfo($"AdvisorBridge WebSocket server listening on ws://localhost:{Port}/");

                while (!ct.IsCancellationRequested)
                {
                    try
                    {
                        var context = _listener.GetContext();

                        if (context.Request.IsWebSocketRequest)
                        {
                            Task.Run(() => HandleWebSocketClient(context, ct));
                        }
                        else
                        {
                            // Return a simple status for HTTP requests
                            var response = context.Response;
                            var body = Encoding.UTF8.GetBytes("{\"status\":\"ok\",\"bridge\":\"AdvisorBridge\"}");
                            response.ContentType = "application/json";
                            response.ContentLength64 = body.Length;
                            response.OutputStream.Write(body, 0, body.Length);
                            response.Close();
                        }
                    }
                    catch (HttpListenerException) when (ct.IsCancellationRequested)
                    {
                        break;
                    }
                    catch (Exception ex)
                    {
                        _patch.LogError($"BridgeServer accept error: {ex.Message}");
                    }
                }
            }
            catch (Exception ex)
            {
                _patch.LogError($"BridgeServer failed to start: {ex}");
            }
            finally
            {
                IsRunning = false;
            }
        }

        private async Task HandleWebSocketClient(HttpListenerContext httpContext, CancellationToken ct)
        {
            var clientId = Guid.NewGuid().ToString("N").Substring(0, 8);
            WebSocket ws = null;

            try
            {
                var wsContext = await httpContext.AcceptWebSocketAsync(null);
                ws = wsContext.WebSocket;
                _clients[clientId] = ws;

                _patch.LogInfo($"Client {clientId} connected");

                var buffer = new byte[8192];

                while (ws.State == WebSocketState.Open && !ct.IsCancellationRequested)
                {
                    var result = await ws.ReceiveAsync(new ArraySegment<byte>(buffer), ct);

                    if (result.MessageType == WebSocketMessageType.Close)
                    {
                        await ws.CloseAsync(WebSocketCloseStatus.NormalClosure, "Client disconnected", CancellationToken.None);
                        break;
                    }

                    if (result.MessageType == WebSocketMessageType.Text)
                    {
                        var message = Encoding.UTF8.GetString(buffer, 0, result.Count);
                        var response = HandleMessage(message);
                        var responseBytes = Encoding.UTF8.GetBytes(response);

                        await ws.SendAsync(
                            new ArraySegment<byte>(responseBytes),
                            WebSocketMessageType.Text,
                            true,
                            ct
                        );
                    }
                }
            }
            catch (OperationCanceledException) { }
            catch (WebSocketException ex)
            {
                _patch.LogError($"Client {clientId} WebSocket error: {ex.Message}");
            }
            catch (Exception ex)
            {
                _patch.LogError($"Client {clientId} error: {ex.Message}");
            }
            finally
            {
                WebSocket removed;
                _clients.TryRemove(clientId, out removed);
                _patch.LogInfo($"Client {clientId} disconnected");

                if (ws != null && ws.State != WebSocketState.Closed)
                {
                    try { ws.Dispose(); } catch { }
                }
            }
        }

        private string HandleMessage(string rawMessage)
        {
            BridgeRequest request;
            try
            {
                request = JsonConvert.DeserializeObject<BridgeRequest>(rawMessage);
            }
            catch (Exception ex)
            {
                var err = BridgeResponse.Fail(null, "error", $"Invalid JSON: {ex.Message}");
                return JsonConvert.SerializeObject(err);
            }

            BridgeResponse response;

            switch (request.Type?.ToLowerInvariant())
            {
                case "ping":
                    response = BridgeResponse.Ok(request.Id, "pong", null);
                    break;

                case "query":
                    response = HandleQuery(request);
                    break;

                default:
                    response = BridgeResponse.Fail(request.Id, "error", $"Unknown message type: {request.Type}");
                    break;
            }

            return JsonConvert.SerializeObject(response);
        }

        private BridgeResponse HandleQuery(BridgeRequest request)
        {
            try
            {
                var payload = JsonConvert.DeserializeObject<QueryPayload>(request.Payload);
                if (payload == null || string.IsNullOrWhiteSpace(payload.Sql))
                {
                    return BridgeResponse.Fail(request.Id, "result", "Missing 'sql' in payload");
                }

                if (!QueryHandler.IsSafeQuery(payload.Sql))
                {
                    return BridgeResponse.Fail(request.Id, "result", "Only SELECT and PRAGMA queries are allowed");
                }

                var table = _db.ExecuteQuery(payload.Sql);
                var rows = QueryHandler.DataTableToList(table);

                return BridgeResponse.Ok(request.Id, "result", rows);
            }
            catch (Exception ex)
            {
                _patch.LogError($"Query error: {ex.Message}");
                return BridgeResponse.Fail(request.Id, "result", $"Query failed: {ex.Message}");
            }
        }

        /// <summary>
        /// Broadcast a push notification to all connected clients.
        /// </summary>
        public void Broadcast(string pushType, object data)
        {
            var msg = JsonConvert.SerializeObject(new BridgeResponse
            {
                Id = null,
                Type = "push",
                Payload = new { pushType, data },
                Success = true,
                Error = null
            });

            var bytes = Encoding.UTF8.GetBytes(msg);

            foreach (var kvp in _clients)
            {
                try
                {
                    if (kvp.Value.State == WebSocketState.Open)
                    {
                        kvp.Value.SendAsync(
                            new ArraySegment<byte>(bytes),
                            WebSocketMessageType.Text,
                            true,
                            CancellationToken.None
                        ).Wait(1000);
                    }
                }
                catch { }
            }
        }

        private class QueryPayload
        {
            public string Sql { get; set; }
        }
    }
}
