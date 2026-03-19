namespace AdvisorBridge
{
    public class BridgeRequest
    {
        public string Id { get; set; }
        public string Type { get; set; }
        public string Payload { get; set; }
    }

    public class BridgeResponse
    {
        public string Id { get; set; }
        public string Type { get; set; }
        public object Payload { get; set; }
        public bool Success { get; set; }
        public string Error { get; set; }

        public static BridgeResponse Ok(string id, string type, object payload)
        {
            return new BridgeResponse
            {
                Id = id,
                Type = type,
                Payload = payload,
                Success = true,
                Error = null
            };
        }

        public static BridgeResponse Fail(string id, string type, string error)
        {
            return new BridgeResponse
            {
                Id = id,
                Type = type,
                Payload = null,
                Success = false,
                Error = error
            };
        }
    }
}
