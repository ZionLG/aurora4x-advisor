using System;
using System.Collections.Generic;
using System.Data;
using HarmonyLib;

namespace AdvisorBridge
{
    public class AdvisorBridge : AuroraPatch.Patch
    {
        public override string Description => "WebSocket bridge for Aurora4X Advisor frontend";
        public override IEnumerable<string> Dependencies => new[] { "Lib" };

        private BridgeServer Server;

        protected override void Loaded(Harmony harmony)
        {
            LogInfo("AdvisorBridge loaded");
        }

        protected override void Started()
        {
            var lib = GetDependency<Lib.Lib>("Lib");

            // Test DB queries
            try
            {
                var race = lib.DatabaseManager.ExecuteQuery("SELECT COUNT(*) FROM FCT_Race");
                LogInfo($"DB TEST - FCT_Race rows: {race.Rows[0][0]}");

                var sysBody = lib.DatabaseManager.ExecuteQuery("SELECT COUNT(*) FROM FCT_SystemBody");
                LogInfo($"DB TEST - FCT_SystemBody rows: {sysBody.Rows[0][0]}");

                var survey = lib.DatabaseManager.ExecuteQuery("SELECT COUNT(*) FROM FCT_RaceSysSurvey");
                LogInfo($"DB TEST - FCT_RaceSysSurvey rows: {survey.Rows[0][0]}");

                var game = lib.DatabaseManager.ExecuteQuery("SELECT COUNT(*) FROM FCT_Game");
                LogInfo($"DB TEST - FCT_Game rows: {game.Rows[0][0]}");
            }
            catch (Exception ex)
            {
                LogError($"DB TEST ERROR: {ex.Message}");
            }

            Server = new BridgeServer(lib.DatabaseManager, this);
            Server.Start(47842);

            LogInfo("AdvisorBridge started - WebSocket server running on port 47842");
        }
    }
}
