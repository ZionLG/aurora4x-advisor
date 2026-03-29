using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Windows.Forms;

using HarmonyLib;
using AuroraPatch;
using Lib;

namespace Example
{
    public class Example : AuroraPatch.Patch
    {
        public override string Description => "Form inspector patch - F12 inspect form + discovery report.";
        public override IEnumerable<string> Dependencies => new[] { "Lib" };

        private static Lib.Lib lib;
        private static Assembly auroraAsm;
        private static string checksum;

        // Cache: Form.Name -> Type.Name, persists across opens/closes for the whole session
        private static readonly Dictionary<string, string> discoveredForms = new Dictionary<string, string>();

        protected override void Loaded(Harmony harmony)
        {
            LogInfo("Loading FormInspector...");

            lib = GetDependency<Lib.Lib>("Lib");
            auroraAsm = AuroraAssembly;
            checksum = AuroraChecksum;

            var formConstructorPostfix = new HarmonyMethod(
                GetType().GetMethod("FormConstructorPostfix", AccessTools.all)
            );

            foreach (var form in AuroraAssembly.GetTypes().Where(t => typeof(Form).IsAssignableFrom(t)))
            {
                foreach (var ctor in form.GetConstructors())
                {
                    try
                    {
                        harmony.Patch(ctor, postfix: formConstructorPostfix);
                    }
                    catch (Exception e)
                    {
                        LogError($"Failed to patch Form constructor {form.Name}: {e}");
                    }
                }
            }
        }

        private static void FormConstructorPostfix(Form __instance)
        {
            __instance.Shown += (sender, e) =>
            {
                var form = (Form)sender;

                // Cache the mapping as soon as the form is shown
                if (!string.IsNullOrEmpty(form.Name))
                {
                    lock (discoveredForms)
                    {
                        discoveredForms[form.Name] = form.GetType().Name;
                    }
                }

                form.KeyPreview = true;
                form.KeyDown += OnFormKeyDown;
            };
        }

        private static void OnFormKeyDown(object sender, KeyEventArgs e)
        {
            if (e.KeyCode == Keys.F12)
            {
                e.Handled = true;
                e.SuppressKeyPress = true;

                var form = (Form)sender;
                var report = BuildFormInspectorReport(form);
                report += "\n\n" + BuildFormDiscoveryReport();
                ShowDebug(report, $"Inspector: {form.Name} [{form.GetType().Name}]");
            }
        }

        // === Discovery report using cached mappings ===

        private static string BuildFormDiscoveryReport()
        {
            var sb = new StringBuilder();

            sb.AppendLine($"=== AURORA FORM TYPE DISCOVERY ===");
            sb.AppendLine($"Checksum: {checksum}");
            sb.AppendLine();

            // 1. All discovered forms (cached from every open this session)
            Dictionary<string, string> cached;
            lock (discoveredForms)
            {
                cached = new Dictionary<string, string>(discoveredForms);
            }

            sb.AppendLine($"=== DISCOVERED FORMS ({cached.Count} found this session) ===");
            foreach (var kvp in cached.OrderBy(x => x.Key))
            {
                string match = MatchFormNameToAuroraType(kvp.Key);
                sb.AppendLine($"  {kvp.Key,-30} -> {kvp.Value,-8}   {match}");
            }
            sb.AppendLine();

            // 2. All Form-derived types in the assembly
            sb.AppendLine("=== ALL FORM TYPES IN ASSEMBLY ===");
            var formTypes = auroraAsm.GetTypes()
                .Where(t => typeof(Form).IsAssignableFrom(t))
                .OrderBy(t => t.Name)
                .ToList();

            sb.AppendLine($"Total Form types: {formTypes.Count}");
            sb.AppendLine();

            foreach (var type in formTypes)
            {
                int buttons = 0, checkboxes = 0, comboboxes = 0, listviews = 0, textboxes = 0, labels = 0, tabs = 0;

                foreach (var field in type.GetFields(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance))
                {
                    var fn = field.FieldType.Name;
                    if (fn == "Button") buttons++;
                    else if (fn == "CheckBox") checkboxes++;
                    else if (fn == "ComboBox") comboboxes++;
                    else if (fn == "ListView") listviews++;
                    else if (fn == "TextBox") textboxes++;
                    else if (fn == "Label") labels++;
                    else if (fn == "TabControl") tabs++;
                }

                // Check if this type was discovered via cache
                string openAs = "";
                var discoveredEntry = cached.FirstOrDefault(x => x.Value == type.Name);
                if (discoveredEntry.Key != null)
                    openAs = $"  ** \"{discoveredEntry.Key}\" ({MatchFormNameToAuroraType(discoveredEntry.Key)})";

                sb.AppendLine($"  Type: {type.Name,-8}  Btn:{buttons,3}  Chk:{checkboxes,3}  Cmb:{comboboxes,3}  Lv:{listviews,3}  Txt:{textboxes,3}  Lbl:{labels,3}  Tab:{tabs,2}{openAs}");
            }
            sb.AppendLine();

            // 3. Copy-paste block for KnowledgeBase
            sb.AppendLine("=== COPY-PASTE FOR KnowledgeBase.cs ===");
            sb.AppendLine($"// Checksum: {checksum}");

            var auroraTypeMap = new[]
            {
                new { FormName = "TacticalMap",      TypeName = "TacticalMapForm" },
                new { FormName = "Economics",         TypeName = "EconomicsForm" },
                new { FormName = "ClassDesign",       TypeName = "ClassDesignForm" },
                new { FormName = "CreateProject",     TypeName = "CreateProjectForm" },
                new { FormName = "FleetWindow",       TypeName = "FleetWindowForm" },
                new { FormName = "MissileDesign",     TypeName = "MissileDesignForm" },
                new { FormName = "TurretDesign",      TypeName = "TurretDesignForm" },
                new { FormName = "GroundUnitDesign",  TypeName = "GroundUnitDesignForm" },
                new { FormName = "CommandersWindow",  TypeName = "CommandersWindowForm" },
                new { FormName = "Medals",            TypeName = "MedalsForm" },
                new { FormName = "RaceWindow",        TypeName = "RaceWindowForm" },
                new { FormName = "SystemView",        TypeName = "SystemViewForm" },
                new { FormName = "GalacticMap",       TypeName = "GalacticMapForm" },
                new { FormName = "RaceComparison",    TypeName = "RaceComparisonForm" },
                new { FormName = "Diplomacy",         TypeName = "DiplomacyForm" },
                new { FormName = "TechnologyView",    TypeName = "TechnologyViewForm" },
                new { FormName = "Minerals",          TypeName = "MineralsForm" },
                new { FormName = "Sectors",           TypeName = "SectorsForm" },
                new { FormName = "Events",            TypeName = "EventsForm" },
                new { FormName = "GameDetails",       TypeName = "GameDetailsForm" },
            };

            foreach (var entry in auroraTypeMap)
            {
                string typeName;
                cached.TryGetValue(entry.FormName, out typeName);
                if (typeName == null) typeName = "??";
                sb.AppendLine($"yield return new KeyValuePair<AuroraType, string>(AuroraType.{entry.TypeName}, \"{typeName}\");");
            }
            sb.AppendLine();

            // 4. GameState - scan TacticalMap fields for Aurora types, check for SQLiteConnection
            sb.AppendLine("=== GAMESTATE SEARCH (TacticalMap fields) ===");
            var tacticalType = auroraAsm.GetTypes().FirstOrDefault(t => t.Name == "ko");
            if (tacticalType != null)
            {
                foreach (var field in tacticalType.GetFields(AccessTools.all))
                {
                    var ft = field.FieldType;
                    if (ft.Assembly != auroraAsm) continue;
                    if (ft.IsEnum) continue;
                    if (typeof(Control).IsAssignableFrom(ft)) continue;
                    if (typeof(System.Collections.IEnumerable).IsAssignableFrom(ft) && ft != typeof(string)) continue;

                    // Check for SQLiteConnection in fields
                    bool hasSqliteField = false;
                    try
                    {
                        hasSqliteField = ft.GetFields(AccessTools.all)
                            .Any(f => f.FieldType.Name.Contains("SQLite"));
                    }
                    catch { }

                    // Check for methods with SQLiteConnection parameter
                    int sqliteMethods = 0;
                    try
                    {
                        sqliteMethods = ft.GetMethods(AccessTools.all)
                            .Count(m => m.GetParameters().Any(p => p.ParameterType.Name.Contains("SQLite")));
                    }
                    catch { }

                    // Count total fields and methods
                    int totalFields = 0;
                    try { totalFields = ft.GetFields(AccessTools.all).Length; } catch { }
                    int totalMethods = 0;
                    try { totalMethods = ft.GetMethods(AccessTools.all).Length; } catch { }

                    string marker = "";
                    if (hasSqliteField || sqliteMethods > 0)
                        marker = " *** LIKELY GAMESTATE ***";

                    sb.AppendLine($"  field \"{field.Name}\" -> type \"{ft.Name}\"  (fields:{totalFields}, methods:{totalMethods}, sqliteMethods:{sqliteMethods}, sqliteField:{hasSqliteField}){marker}");
                }
            }
            else
            {
                sb.AppendLine("  (TacticalMap type 'ko' not found)");
            }

            // 5. COLLECTIONS ON GAMESTATE (a0) - find system body lists
            sb.AppendLine();
            sb.AppendLine("=== GAMESTATE (a0) COLLECTIONS ===");
            var gsType = auroraAsm.GetTypes().FirstOrDefault(t => t.Name == "a0");
            var openTactical = lib.GetOpenForms().FirstOrDefault(f => f.Name == "TacticalMap");
            object gsInstance = null;
            if (openTactical != null && gsType != null)
            {
                try
                {
                    foreach (var f in openTactical.GetType().GetFields(AccessTools.all))
                    {
                        if (f.FieldType == gsType)
                        {
                            gsInstance = f.GetValue(openTactical);
                            if (gsInstance != null) break;
                        }
                    }
                }
                catch { }
            }

            if (gsType != null)
            {
                foreach (var f in gsType.GetFields(AccessTools.all))
                {
                    try
                    {
                        var ft = f.FieldType;
                        if (!ft.IsGenericType) continue;

                        var genDef = ft.GetGenericTypeDefinition();
                        if (genDef != typeof(List<>) && genDef != typeof(Dictionary<,>)) continue;

                        var args = ft.GenericTypeArguments;
                        string argNames = string.Join(", ", args.Select(a => a.Name));

                        // Get count if we have an instance
                        string countStr = "?";
                        if (gsInstance != null)
                        {
                            try
                            {
                                var countProp = ft.GetProperty("Count");
                                var val = f.GetValue(gsInstance);
                                if (val != null && countProp != null)
                                    countStr = countProp.GetValue(val)?.ToString() ?? "null";
                                else
                                    countStr = "null";
                            }
                            catch { countStr = "err"; }
                        }

                        // For Aurora types, show their field count
                        string typeInfo = "";
                        foreach (var a in args)
                        {
                            if (a.Assembly == auroraAsm)
                            {
                                int fc = 0;
                                try { fc = a.GetFields(AccessTools.all).Length; } catch { }
                                typeInfo += $" [{a.Name}: {fc} fields]";
                            }
                        }

                        sb.AppendLine($"  {f.Name,-15} {genDef.Name}<{argNames}>  count={countStr}{typeInfo}");
                    }
                    catch { }
                }
            }

            // 6. Explore types that look like SystemBody (many numeric fields, ~10-20 fields)
            sb.AppendLine();
            sb.AppendLine("=== CANDIDATE SYSTEMBODY TYPES (Aurora types with 10-30 Decimal/Double/Int32 fields) ===");
            foreach (var type in auroraAsm.GetTypes())
            {
                try
                {
                    if (type.IsEnum || typeof(Control).IsAssignableFrom(type)) continue;
                    var fields = type.GetFields(AccessTools.all);
                    int numericCount = fields.Count(f =>
                        f.FieldType == typeof(int) || f.FieldType == typeof(double)
                        || f.FieldType == typeof(decimal) || f.FieldType == typeof(float));
                    int stringCount = fields.Count(f => f.FieldType == typeof(string));
                    int boolCount = fields.Count(f => f.FieldType == typeof(bool));

                    // SystemBody-like: has many numerics (orbital params), a few strings (name), some bools
                    if (numericCount >= 10 && numericCount <= 40 && stringCount >= 1 && stringCount <= 5 && fields.Length >= 12 && fields.Length <= 50)
                    {
                        // Check if this type appears as a List<> on GameState
                        string onGameState = "";
                        if (gsType != null)
                        {
                            foreach (var gf in gsType.GetFields(AccessTools.all))
                            {
                                if (gf.FieldType.IsGenericType && gf.FieldType.GenericTypeArguments.Any(a => a == type))
                                {
                                    string count = "?";
                                    if (gsInstance != null)
                                    {
                                        try
                                        {
                                            var val = gf.GetValue(gsInstance);
                                            if (val != null)
                                                count = val.GetType().GetProperty("Count")?.GetValue(val)?.ToString() ?? "?";
                                        }
                                        catch { }
                                    }
                                    onGameState = $" ** ON GAMESTATE as \"{gf.Name}\" count={count} **";
                                    break;
                                }
                            }
                        }

                        sb.AppendLine($"  Type \"{type.Name}\"  fields:{fields.Length} (num:{numericCount} str:{stringCount} bool:{boolCount}){onGameState}");
                    }
                }
                catch { }
            }

            // 7. Dump live instances from jo (SystemBody?) and jl (StarSystem?)
            sb.AppendLine();
            sb.AppendLine("=== LIVE DATA: jo INSTANCES (SystemBody?) from GameState.bv ===");
            if (gsInstance != null && gsType != null)
            {
                try
                {
                    var bvField = gsType.GetField("bv", AccessTools.all);
                    if (bvField != null)
                    {
                        var bvDict = bvField.GetValue(gsInstance);
                        if (bvDict != null)
                        {
                            var values = bvDict.GetType().GetProperty("Values").GetValue(bvDict) as System.Collections.IEnumerable;
                            int idx = 0;
                            foreach (var item in values)
                            {
                                if (idx >= 5) { sb.AppendLine("  ... (showing first 5)"); break; }
                                sb.AppendLine($"  --- jo instance #{idx} ---");
                                DumpInstanceFields(sb, item, auroraAsm);
                                idx++;
                            }
                            if (idx == 0) sb.AppendLine("  (empty)");
                        }
                        else sb.AppendLine("  bv is null");
                    }
                }
                catch (Exception ex) { sb.AppendLine($"  Error: {ex.Message}"); }
            }
            else sb.AppendLine("  (no GameState instance)");

            sb.AppendLine();
            sb.AppendLine("=== LIVE DATA: jl INSTANCES (StarSystem?) from GameState.co ===");
            if (gsInstance != null && gsType != null)
            {
                try
                {
                    var coField = gsType.GetField("co", AccessTools.all);
                    if (coField != null)
                    {
                        var coDict = coField.GetValue(gsInstance);
                        if (coDict != null)
                        {
                            var values = coDict.GetType().GetProperty("Values").GetValue(coDict) as System.Collections.IEnumerable;
                            int idx = 0;
                            foreach (var item in values)
                            {
                                if (idx >= 3) { sb.AppendLine("  ... (showing first 3)"); break; }
                                sb.AppendLine($"  --- jl instance #{idx} ---");
                                DumpInstanceFields(sb, item, auroraAsm);
                                idx++;
                            }
                            if (idx == 0) sb.AppendLine("  (empty)");
                        }
                        else sb.AppendLine("  co is null");
                    }
                }
                catch (Exception ex) { sb.AppendLine($"  Error: {ex.Message}"); }
            }
            else sb.AppendLine("  (no GameState instance)");

            // Missing forms reminder
            var missing = auroraTypeMap.Where(x => !cached.ContainsKey(x.FormName)).Select(x => x.FormName).ToList();
            if (missing.Count > 0)
            {
                sb.AppendLine();
                sb.AppendLine($"=== STILL NEED TO OPEN ({missing.Count} remaining) ===");
                foreach (var name in missing)
                    sb.AppendLine($"  {name}");
            }
            else
            {
                sb.AppendLine();
                sb.AppendLine("=== ALL FORMS DISCOVERED! ===");
            }

            return sb.ToString();
        }

        private static void DumpTypeInfo(StringBuilder sb, Type type, Assembly auroraAsm)
        {
            sb.AppendLine($"  Base type: {type.BaseType?.Name ?? "none"}");
            var fields = type.GetFields(AccessTools.all);
            var methods = type.GetMethods(AccessTools.all);
            sb.AppendLine($"  Fields: {fields.Length}  Methods: {methods.Length}");

            // Group fields by type
            var netFields = new Dictionary<string, List<string>>();
            var auroraFields = new Dictionary<string, List<string>>();

            foreach (var f in fields)
            {
                var typeName = f.FieldType.Name;
                if (f.FieldType.IsGenericType)
                    typeName = $"{f.FieldType.Name}<{string.Join(",", f.FieldType.GenericTypeArguments.Select(a => a.Name))}>";

                var dict = f.FieldType.Assembly == auroraAsm ? auroraFields : netFields;
                if (!dict.ContainsKey(typeName)) dict[typeName] = new List<string>();
                dict[typeName].Add(f.Name);
            }

            sb.AppendLine("  .NET fields:");
            foreach (var kvp in netFields.OrderByDescending(x => x.Value.Count))
            {
                var names = kvp.Value.Count <= 5
                    ? string.Join(", ", kvp.Value)
                    : string.Join(", ", kvp.Value.Take(5)) + $"... +{kvp.Value.Count - 5}";
                sb.AppendLine($"    {kvp.Key,-35} x{kvp.Value.Count,-4} ({names})");
            }

            sb.AppendLine("  Aurora fields:");
            foreach (var kvp in auroraFields.OrderByDescending(x => x.Value.Count))
            {
                // Show sub-type field count for Aurora types
                int subFields = 0;
                try
                {
                    var subType = auroraAsm.GetTypes().FirstOrDefault(t => t.Name == kvp.Key.Split('<')[0]);
                    if (subType != null) subFields = subType.GetFields(AccessTools.all).Length;
                }
                catch { }

                var names = kvp.Value.Count <= 3
                    ? string.Join(", ", kvp.Value)
                    : string.Join(", ", kvp.Value.Take(3)) + $"... +{kvp.Value.Count - 3}";
                sb.AppendLine($"    {kvp.Key,-35} x{kvp.Value.Count,-4} ({subFields} sub-fields)  ({names})");
            }

            // Show collections specifically
            sb.AppendLine("  Collections:");
            foreach (var f in fields)
            {
                if (!f.FieldType.IsGenericType) continue;
                var genDef = f.FieldType.GetGenericTypeDefinition();
                if (genDef != typeof(List<>) && genDef != typeof(Dictionary<,>)) continue;

                var args = f.FieldType.GenericTypeArguments;
                string argNames = string.Join(", ", args.Select(a => a.Name));
                string typeInfo = "";
                foreach (var a in args)
                {
                    if (a.Assembly == auroraAsm)
                    {
                        int fc = 0;
                        try { fc = a.GetFields(AccessTools.all).Length; } catch { }
                        typeInfo += $" [{a.Name}: {fc} fields]";
                    }
                }
                sb.AppendLine($"    {f.Name,-20} {genDef.Name}<{argNames}>{typeInfo}");
            }
        }

        private static void DumpInstanceFields(StringBuilder sb, object instance, Assembly auroraAsm)
        {
            if (instance == null) { sb.AppendLine("    null"); return; }

            var type = instance.GetType();
            foreach (var f in type.GetFields(AccessTools.all))
            {
                try
                {
                    var val = f.GetValue(instance);
                    string valStr;

                    if (val == null)
                    {
                        valStr = "null";
                    }
                    else if (f.FieldType.Assembly == auroraAsm && !f.FieldType.IsEnum)
                    {
                        // Aurora object - just show type name, don't recurse
                        valStr = $"[{f.FieldType.Name} object]";
                    }
                    else if (f.FieldType.IsGenericType)
                    {
                        // Collection - show count
                        var countProp = f.FieldType.GetProperty("Count");
                        if (countProp != null)
                            valStr = $"[{f.FieldType.Name} count={countProp.GetValue(val)}]";
                        else
                            valStr = val.ToString();
                    }
                    else
                    {
                        valStr = val.ToString();
                        if (valStr.Length > 80) valStr = valStr.Substring(0, 80) + "...";
                    }

                    sb.AppendLine($"    {f.FieldType.Name,-18} {f.Name,-12} = {valStr}");
                }
                catch
                {
                    sb.AppendLine($"    {f.FieldType.Name,-18} {f.Name,-12} = <error>");
                }
            }
        }

        private static string MatchFormNameToAuroraType(string formName)
        {
            switch (formName)
            {
                case "TacticalMap": return "-> TacticalMapForm";
                case "Economics": return "-> EconomicsForm";
                case "ClassDesign": return "-> ClassDesignForm";
                case "CreateProject": return "-> CreateProjectForm";
                case "FleetWindow": return "-> FleetWindowForm";
                case "MissileDesign": return "-> MissileDesignForm";
                case "TurretDesign": return "-> TurretDesignForm";
                case "GroundUnitDesign": return "-> GroundUnitDesignForm";
                case "CommandersWindow": return "-> CommandersWindowForm";
                case "Medals": return "-> MedalsForm";
                case "RaceWindow": return "-> RaceWindowForm";
                case "SystemView": return "-> SystemViewForm";
                case "GalacticMap": return "-> GalacticMapForm";
                case "RaceComparison": return "-> RaceComparisonForm";
                case "Diplomacy": return "-> DiplomacyForm";
                case "TechnologyView": return "-> TechnologyViewForm";
                case "Minerals": return "-> MineralsForm";
                case "Sectors": return "-> SectorsForm";
                case "Events": return "-> EventsForm";
                case "GameDetails": return "-> GameDetailsForm";
                default: return "(not in AuroraType enum)";
            }
        }

        // === F12: Inspect current form ===

        private static string BuildFormInspectorReport(Form form)
        {
            var sb = new StringBuilder();

            string obfuscatedName = form.GetType().Name;
            string knownType = "UNKNOWN";

            foreach (var kvp in lib.KnowledgeBase.GetKnownTypeNames())
            {
                if (kvp.Value == obfuscatedName)
                {
                    knownType = kvp.Key.ToString();
                    break;
                }
            }

            sb.AppendLine("=== FORM IDENTITY ===");
            sb.AppendLine($"Checksum:         {checksum}");
            sb.AppendLine($"Form.Name:        {form.Name}");
            sb.AppendLine($"Form.Text:        {form.Text}");
            sb.AppendLine($"Type.Name:        {obfuscatedName}");
            sb.AppendLine($"AuroraType:       {knownType}");
            sb.AppendLine($"Size:             {form.Width}x{form.Height}");
            sb.AppendLine($"ClientSize:       {form.ClientSize.Width}x{form.ClientSize.Height}");
            sb.AppendLine($"Controls count:   {CountControls(form)}");
            sb.AppendLine();

            sb.AppendLine("=== FIELDS (non-Control) ===");
            try
            {
                foreach (var field in form.GetType().GetFields(AccessTools.all))
                {
                    if (typeof(Control).IsAssignableFrom(field.FieldType))
                        continue;

                    string val;
                    try
                    {
                        var obj = field.GetValue(form);
                        val = obj?.ToString() ?? "null";
                        if (val.Length > 80) val = val.Substring(0, 80) + "...";
                    }
                    catch
                    {
                        val = "<error>";
                    }

                    sb.AppendLine($"  {field.FieldType.Name,-20} {field.Name,-25} = {val}");
                }
            }
            catch (Exception ex)
            {
                sb.AppendLine($"  (error reading fields: {ex.Message})");
            }
            sb.AppendLine();

            sb.AppendLine("=== CONTROL TREE ===");
            BuildControlTree(sb, form, 0);

            return sb.ToString();
        }

        private static int CountControls(Control root)
        {
            int count = 0;
            foreach (Control c in root.Controls)
            {
                count++;
                count += CountControls(c);
            }
            return count;
        }

        private static void BuildControlTree(StringBuilder sb, Control parent, int depth)
        {
            foreach (Control c in parent.Controls)
            {
                string indent = new string(' ', depth * 2);
                string typeName = c.GetType().Name;
                string name = string.IsNullOrEmpty(c.Name) ? "(no name)" : c.Name;
                string text = string.IsNullOrEmpty(c.Text) ? "" : c.Text;

                if (text.Length > 60)
                    text = text.Substring(0, 60) + "...";

                string flags = "";
                if (!c.Visible) flags += " [HIDDEN]";
                if (!c.Enabled) flags += " [DISABLED]";

                sb.AppendLine($"{indent}[{typeName}] {name}  ({c.Width}x{c.Height} @ {c.Left},{c.Top}){flags}  \"{text}\"");

                if (c is TabControl tc)
                {
                    foreach (TabPage tp in tc.TabPages)
                    {
                        string tpIndent = new string(' ', (depth + 1) * 2);
                        sb.AppendLine($"{tpIndent}[TabPage] {tp.Name}  \"{tp.Text}\"");
                        BuildControlTree(sb, tp, depth + 2);
                    }
                }
                else
                {
                    BuildControlTree(sb, c, depth + 1);
                }
            }
        }

        private static void ShowDebug(string text, string title)
        {
            var form = new Form()
            {
                Width = 900,
                Height = 700,
                Text = title,
                StartPosition = FormStartPosition.CenterScreen,
                TopMost = true
            };

            var textBox = new TextBox()
            {
                Multiline = true,
                ScrollBars = ScrollBars.Both,
                ReadOnly = true,
                Dock = DockStyle.Fill,
                Font = new System.Drawing.Font("Consolas", 9),
                Text = text,
                WordWrap = false
            };

            form.Controls.Add(textBox);
            form.Show();
        }
    }
}
