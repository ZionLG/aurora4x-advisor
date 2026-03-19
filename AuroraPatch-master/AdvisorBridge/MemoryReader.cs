using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Reflection;
using System.Windows.Forms;
using HarmonyLib;

namespace AdvisorBridge
{
    /// <summary>
    /// Reads Aurora game objects directly from memory via cached reflection.
    /// All field names reference obfuscated Aurora types (checksum OdxONo).
    /// See project_memory_mapping.md for the complete field-to-DB-column mapping.
    ///
    /// Type mapping:
    ///   a0 = GameState       | kc = SystemBody    | jo = Star
    ///   js = StarSystem       | kd = StarDetails   | jq = SystemNameRecord
    ///
    /// GameState collection mapping:
    ///   bw = Dict[int, SystemBody]       (3539 bodies)
    ///   bv = Dict[int, Star]             (50 stars)
    ///   bu = Dict[int, StarSystem]       (37 systems)
    ///   b2 = Dict[int, SystemNameRecord] (63593 name records)
    /// </summary>
    public class MemoryReader
    {
        private readonly Lib.Lib _lib;
        private readonly AuroraPatch.Patch _patch;

        #region Cached Reflection Fields

        // GameState access: TacticalMap -> GameState
        private FieldInfo _gameStateField;

        // SystemBody (kc) - GameState.bw
        private FieldInfo _systemBodiesDict;
        private FieldInfo[] _systemBodyAllFields;
        private FieldInfo _systemBodySystemIdField;     // kc.w = SystemID

        // Star (jo) - GameState.bv
        private FieldInfo _starsDict;
        private FieldInfo[] _starAllFields;
        private FieldInfo _starIdField;                 // jo.f = StarID
        private FieldInfo _starParentField;             // jo.b = parent star ref
        private FieldInfo _starDetailsField;            // jo.c = StarDetails (kd) ref
        private FieldInfo _starSystemRefField;          // jo.a = StarSystem (js) ref
        private FieldInfo _starSystemIdField;           // jo.g = SystemID

        // StarDetails (kd) - accessed via Star.c
        private FieldInfo[] _starDetailsAllFields;

        // StarSystem (js) - GameState.bu
        private FieldInfo _starSystemsDict;
        private FieldInfo[] _starSystemAllFields;
        private FieldInfo _starSystemIdFieldOnJs;       // js.g = SystemID

        // SystemNameRecord (jq) - GameState.b2
        private FieldInfo _systemNameRecordsDict;
        private FieldInfo _systemNameSystemIdField;     // jq.b = SystemID
        private FieldInfo _systemNameField;             // jq.q = Name

        // Fast-read cache: only fields needed for rendering
        private FieldInfo[] _bodyFastFields;
        private string[] _bodyFastFieldNames;

        private bool _initialized;
        private bool _initFailed;

        #endregion

        public MemoryReader(Lib.Lib lib, AuroraPatch.Patch patch)
        {
            _lib = lib;
            _patch = patch;
        }

        #region Initialization

        private bool Initialize()
        {
            if (_initialized) return !_initFailed;
            _initialized = true;

            try
            {
                var map = _lib.TacticalMap;
                if (map == null) { _initFailed = true; return false; }

                var gameStateType = _lib.SignatureManager.Get(Lib.AuroraType.GameState);
                if (gameStateType == null) { _initFailed = true; return false; }

                // Find GameState field on TacticalMap (first field matching GameState type)
                foreach (var f in map.GetType().GetFields(AccessTools.all))
                {
                    if (f.FieldType == gameStateType) { _gameStateField = f; break; }
                }
                if (_gameStateField == null) { _initFailed = true; return false; }

                InitStarFields(gameStateType);
                InitStarSystemFields(gameStateType);
                InitSystemNameFields(gameStateType);
                InitSystemBodyFields(gameStateType);

                _patch.LogInfo($"MemoryReader initialized: Star={_starAllFields?.Length ?? 0} fields, " +
                    $"SystemBody={_systemBodyAllFields?.Length ?? 0} fields, " +
                    $"StarSystem={_starSystemAllFields?.Length ?? 0} fields");
                return true;
            }
            catch (Exception ex)
            {
                _patch.LogError($"MemoryReader init failed: {ex.Message}");
                _initFailed = true;
                return false;
            }
        }

        private void InitStarFields(Type gameStateType)
        {
            // Stars: GameState.bv -> Dict<int, Star(jo)>
            _starsDict = gameStateType.GetField("bv", AccessTools.all);
            if (_starsDict == null) return;

            var starType = _starsDict.FieldType.GenericTypeArguments[1];
            _starAllFields = starType.GetFields(AccessTools.all);
            _starIdField = starType.GetField("f", AccessTools.all);
            _starParentField = starType.GetField("b", AccessTools.all);
            _starDetailsField = starType.GetField("c", AccessTools.all);
            _starSystemRefField = starType.GetField("a", AccessTools.all);
            _starSystemIdField = starType.GetField("g", AccessTools.all);

            // StarDetails (kd) - accessed from Star.c
            if (_starDetailsField != null)
                _starDetailsAllFields = _starDetailsField.FieldType.GetFields(AccessTools.all);

            // StarSystem fields (js) - accessed from Star.a
            if (_starSystemRefField != null)
                _starSystemAllFields = _starSystemRefField.FieldType.GetFields(AccessTools.all);
        }

        private void InitStarSystemFields(Type gameStateType)
        {
            // StarSystems: GameState.bu -> Dict<int, StarSystem(js)>
            _starSystemsDict = gameStateType.GetField("bu", AccessTools.all);
            if (_starSystemsDict == null) return;

            var starSystemType = _starSystemsDict.FieldType.GenericTypeArguments[1];
            _starSystemIdFieldOnJs = starSystemType.GetField("g", AccessTools.all);
        }

        private void InitSystemNameFields(Type gameStateType)
        {
            // SystemNameRecords: GameState.b2 -> Dict<int, SystemNameRecord(jq)>
            _systemNameRecordsDict = gameStateType.GetField("b2", AccessTools.all);
            if (_systemNameRecordsDict == null) return;

            var nameRecordType = _systemNameRecordsDict.FieldType.GenericTypeArguments[1];
            _systemNameSystemIdField = nameRecordType.GetField("b", AccessTools.all);
            _systemNameField = nameRecordType.GetField("q", AccessTools.all);
        }

        private void InitSystemBodyFields(Type gameStateType)
        {
            // SystemBodies: GameState.bw -> Dict<int, SystemBody(kc)>
            _systemBodiesDict = gameStateType.GetField("bw", AccessTools.all);
            if (_systemBodiesDict == null) return;

            var bodyType = _systemBodiesDict.FieldType.GenericTypeArguments[1];
            _systemBodyAllFields = bodyType.GetFields(AccessTools.all);
            _systemBodySystemIdField = bodyType.GetField("w", AccessTools.all);
            _patch.LogInfo($"MemoryReader: SystemBody type has {_systemBodyAllFields.Length} fields");
        }

        private void InitFastBodyFields()
        {
            if (_bodyFastFields != null || _systemBodyAllFields == null) return;

            // Map of obfuscated field name -> what it represents (for reference):
            // v=SystemBodyID, w=SystemID, x=StarID, y=PlanetNumber, z=OrbitNumber,
            // aa=ParentBodyID, ab=ParentBodyType, o=BodyClass, bs=Name,
            // ap=OrbitalDistance, as=Bearing, at=Density, au=Gravity, av=Mass,
            // a7=Radius, an=Xcor, ao=Ycor, bb=Eccentricity, bc=EccentricityDirection,
            // bn=DistanceToOrbitCentre, bo=DistanceToParent, a9=CurrentOrbitalSpeed,
            // ba=MeanOrbitalSpeed, bp=TidalLock, aq=BaseTemp, ar=SurfaceTemp,
            // a2=AtmosPress, a3=Albedo, a4=GHFactor, a0=Roche, a1=MagneticField,
            // a8=Ring, a5=DominantTerrain, cd=AGHFactor, ce=FixedBody,
            // cf=FixedBodyParentID, q=HydroType, r=TectonicActivity
            var needed = new[] {
                "v", "w", "x", "y", "z", "aa", "ab", "o", "bs",
                "ap", "as", "at", "au", "av", "a7", "an", "ao",
                "bb", "bc", "bn", "bo", "a9", "ba", "bp",
                "aq", "ar", "a2", "a3", "a4",
                "a0", "a1", "a8", "a5", "cd", "ce", "cf", "q", "r"
            };

            var fields = new List<FieldInfo>();
            var names = new List<string>();
            foreach (var name in needed)
            {
                var f = _systemBodyAllFields.FirstOrDefault(fi => fi.Name == name);
                if (f != null)
                {
                    fields.Add(f);
                    names.Add(name);
                }
            }
            _bodyFastFields = fields.ToArray();
            _bodyFastFieldNames = names.ToArray();
        }

        #endregion

        #region Helper Methods

        private object GetGameState()
        {
            var map = _lib.TacticalMap;
            if (map == null) return null;
            return _gameStateField.GetValue(map);
        }

        private IEnumerable GetDictValues(FieldInfo dictField, object parent)
        {
            var dict = dictField.GetValue(parent);
            if (dict == null) return null;
            return dict.GetType().GetProperty("Values").GetValue(dict) as IEnumerable;
        }

        private static void ReadPrimitiveFields(FieldInfo[] fields, object source, Dictionary<string, object> target)
        {
            foreach (var f in fields)
            {
                try
                {
                    if (f.FieldType == typeof(int) || f.FieldType == typeof(double)
                        || f.FieldType == typeof(decimal) || f.FieldType == typeof(bool)
                        || f.FieldType == typeof(string) || f.FieldType == typeof(float))
                    {
                        target[f.Name] = f.GetValue(source);
                    }
                    else if (f.FieldType.IsEnum)
                    {
                        target[f.Name] = f.GetValue(source)?.ToString();
                    }
                }
                catch { }
            }
        }

        #endregion

        #region Public API

        /// <summary>
        /// Read system bodies (planets, moons, comets, asteroids).
        /// Reads from GameState.bw (Dict of SystemBody/kc).
        /// Optimized: only reads fields needed for rendering.
        /// </summary>
        public List<Dictionary<string, object>> ReadBodies(int? filterSystemId = null)
        {
            var results = new List<Dictionary<string, object>>();
            if (!Initialize() || _systemBodiesDict == null) return results;

            InitFastBodyFields();
            var sw = Stopwatch.StartNew();

            try
            {
                var gs = GetGameState();
                if (gs == null) return results;

                var values = GetDictValues(_systemBodiesDict, gs);
                if (values == null) return results;

                int scanned = 0;

                foreach (var body in values)
                {
                    scanned++;

                    if (filterSystemId.HasValue && _systemBodySystemIdField != null)
                    {
                        try
                        {
                            if ((int)_systemBodySystemIdField.GetValue(body) != filterSystemId.Value)
                                continue;
                        }
                        catch { continue; }
                    }

                    var row = new Dictionary<string, object>(_bodyFastFields.Length);
                    for (int i = 0; i < _bodyFastFields.Length; i++)
                    {
                        var f = _bodyFastFields[i];
                        try
                        {
                            if (f.FieldType.IsEnum)
                                row[_bodyFastFieldNames[i]] = f.GetValue(body)?.ToString();
                            else
                                row[_bodyFastFieldNames[i]] = f.GetValue(body);
                        }
                        catch { }
                    }
                    results.Add(row);
                }

                sw.Stop();
                _patch.LogInfo($"ReadBodies: scanned={scanned}, matched={results.Count}, fields={_bodyFastFields.Length}, total={sw.ElapsedMilliseconds}ms");
            }
            catch (Exception ex)
            {
                _patch.LogError($"ReadBodies error: {ex.Message}");
            }

            return results;
        }

        /// <summary>
        /// Read stars. Reads from GameState.bv (Dict of Star/jo).
        /// Includes StarDetails (kd) sub-object with spectral class, color, etc.
        /// </summary>
        public List<Dictionary<string, object>> ReadStars(int? filterSystemId = null)
        {
            var results = new List<Dictionary<string, object>>();
            if (!Initialize() || _starsDict == null || _starAllFields == null) return results;

            try
            {
                var gs = GetGameState();
                if (gs == null) return results;

                var values = GetDictValues(_starsDict, gs);
                if (values == null) return results;

                foreach (var star in values)
                {
                    if (filterSystemId.HasValue && _starSystemIdField != null)
                    {
                        try
                        {
                            if ((int)_starSystemIdField.GetValue(star) != filterSystemId.Value)
                                continue;
                        }
                        catch { continue; }
                    }

                    var row = new Dictionary<string, object>();
                    ReadPrimitiveFields(_starAllFields, star, row);

                    // Include StarDetails sub-object (spectral class, color, luminosity)
                    try
                    {
                        var details = _starDetailsField?.GetValue(star);
                        if (details != null && _starDetailsAllFields != null)
                        {
                            var detailsData = new Dictionary<string, object>();
                            ReadPrimitiveFields(_starDetailsAllFields, details, detailsData);
                            row["_starInfo"] = detailsData;
                        }
                    }
                    catch { }

                    results.Add(row);
                }
            }
            catch (Exception ex)
            {
                _patch.LogError($"ReadStars error: {ex.Message}");
            }

            return results;
        }

        /// <summary>
        /// Read star systems with resolved names.
        /// Systems from GameState.bu (Dict of StarSystem/js).
        /// Names from GameState.b2 (Dict of SystemNameRecord/jq).
        /// </summary>
        public List<Dictionary<string, object>> ReadSystems()
        {
            var results = new List<Dictionary<string, object>>();
            if (!Initialize() || _starSystemsDict == null || _starSystemIdFieldOnJs == null) return results;

            try
            {
                var gs = GetGameState();
                if (gs == null) return results;

                // Build SystemID -> Name lookup from SystemNameRecords
                var nameMap = BuildSystemNameMap(gs);

                var values = GetDictValues(_starSystemsDict, gs);
                if (values == null) return results;

                foreach (var system in values)
                {
                    try
                    {
                        var systemId = (int)_starSystemIdFieldOnJs.GetValue(system);
                        string name;
                        nameMap.TryGetValue(systemId, out name);

                        results.Add(new Dictionary<string, object>
                        {
                            ["SystemID"] = systemId,
                            ["Name"] = name ?? $"System {systemId}"
                        });
                    }
                    catch { }
                }
            }
            catch (Exception ex)
            {
                _patch.LogError($"ReadSystems error: {ex.Message}");
            }

            return results;
        }

        /// <summary>
        /// Search all GameState collections for items containing specific Int32 values.
        /// Useful for discovering which collection holds a particular game object.
        /// </summary>
        public List<Dictionary<string, object>> GlobalSearch(int[] searchValues)
        {
            var results = new List<Dictionary<string, object>>();
            if (!Initialize()) return results;

            try
            {
                var map = _lib.TacticalMap;
                if (map == null) return results;

                var gs = _gameStateField.GetValue(map);
                if (gs == null) return results;

                var gsType = gs.GetType();
                var auroraAsm = map.GetType().Assembly;

                foreach (var collectionField in gsType.GetFields(AccessTools.all))
                {
                    if (!collectionField.FieldType.IsGenericType) continue;
                    var genDef = collectionField.FieldType.GetGenericTypeDefinition();
                    if (genDef != typeof(Dictionary<,>) && genDef != typeof(List<>)) continue;

                    try
                    {
                        var collection = collectionField.GetValue(gs);
                        if (collection == null) continue;

                        var countProp = collection.GetType().GetProperty("Count");
                        int count = countProp != null ? (int)countProp.GetValue(collection) : 0;
                        if (count == 0) continue;

                        IEnumerable values = genDef == typeof(Dictionary<,>)
                            ? collection.GetType().GetProperty("Values").GetValue(collection) as IEnumerable
                            : collection as IEnumerable;

                        if (values == null) continue;

                        foreach (var item in values)
                        {
                            if (item == null) continue;
                            var itemType = item.GetType();

                            // Search direct Int32 fields
                            if (SearchDirectFields(item, itemType, searchValues, collectionField.Name, count, results))
                                goto nextItem;

                            // Search 1 level deep into Aurora-type references
                            SearchReferenceFields(item, itemType, auroraAsm, searchValues, collectionField.Name, count, results);

                            nextItem:;
                        }
                    }
                    catch { }
                }
            }
            catch (Exception ex)
            {
                _patch.LogError($"GlobalSearch error: {ex.Message}");
            }

            return results;
        }

        #endregion

        #region Private Search Helpers

        private Dictionary<int, string> BuildSystemNameMap(object gameState)
        {
            var nameMap = new Dictionary<int, string>();
            if (_systemNameRecordsDict == null || _systemNameSystemIdField == null || _systemNameField == null)
                return nameMap;

            var values = GetDictValues(_systemNameRecordsDict, gameState);
            if (values == null) return nameMap;

            foreach (var record in values)
            {
                try
                {
                    var sysId = (int)_systemNameSystemIdField.GetValue(record);
                    var name = _systemNameField.GetValue(record) as string;
                    if (!string.IsNullOrEmpty(name) && !nameMap.ContainsKey(sysId))
                        nameMap[sysId] = name;
                }
                catch { }
            }

            return nameMap;
        }

        private static bool SearchDirectFields(object item, Type itemType, int[] searchValues,
            string collectionName, int collectionCount, List<Dictionary<string, object>> results)
        {
            foreach (var f in itemType.GetFields(AccessTools.all))
            {
                if (f.FieldType != typeof(int)) continue;
                try
                {
                    int val = (int)f.GetValue(item);
                    foreach (var sv in searchValues)
                    {
                        if (val == sv)
                        {
                            var hit = CreateSearchHit(item, itemType, f.Name, val, collectionName, collectionCount);
                            results.Add(hit);
                            return true;
                        }
                    }
                }
                catch { }
            }
            return false;
        }

        private static void SearchReferenceFields(object item, Type itemType, Assembly auroraAsm,
            int[] searchValues, string collectionName, int collectionCount, List<Dictionary<string, object>> results)
        {
            foreach (var f in itemType.GetFields(AccessTools.all))
            {
                if (f.FieldType.Assembly != auroraAsm || f.FieldType.IsEnum) continue;
                try
                {
                    var refObj = f.GetValue(item);
                    if (refObj == null) continue;
                    foreach (var rf in f.FieldType.GetFields(AccessTools.all))
                    {
                        if (rf.FieldType != typeof(int)) continue;
                        int val = (int)rf.GetValue(refObj);
                        foreach (var sv in searchValues)
                        {
                            if (val == sv)
                            {
                                var hit = CreateSearchHit(item, itemType, $"{f.Name}.{rf.Name}", val, collectionName, collectionCount);
                                results.Add(hit);
                                return;
                            }
                        }
                    }
                }
                catch { }
            }
        }

        private static Dictionary<string, object> CreateSearchHit(object item, Type itemType,
            string matchField, int matchValue, string collectionName, int collectionCount)
        {
            var hit = new Dictionary<string, object>
            {
                ["_collection"] = collectionName,
                ["_itemType"] = itemType.Name,
                ["_itemFields"] = itemType.GetFields(AccessTools.all).Length,
                ["_matchField"] = matchField,
                ["_matchValue"] = matchValue,
                ["_collectionCount"] = collectionCount
            };

            int shown = 0;
            foreach (var pf in itemType.GetFields(AccessTools.all))
            {
                if (shown >= 20) break;
                try
                {
                    if (pf.FieldType == typeof(int) || pf.FieldType == typeof(double)
                        || pf.FieldType == typeof(decimal) || pf.FieldType == typeof(bool)
                        || pf.FieldType == typeof(string))
                    {
                        hit[$"val_{pf.Name}"] = pf.GetValue(item);
                        shown++;
                    }
                }
                catch { }
            }

            return hit;
        }

        #endregion
    }
}
