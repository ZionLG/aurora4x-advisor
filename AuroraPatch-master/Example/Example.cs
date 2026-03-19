using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text;
using System.Windows.Forms;

using HarmonyLib;
using AuroraPatch;
using Lib;

namespace Example
{
    public class Example : AuroraPatch.Patch
    {
        public override string Description => "Form inspector patch - press F12 on any Aurora form.";
        public override IEnumerable<string> Dependencies => new[] { "Lib" };

        private static Lib.Lib lib;

        protected override void Loaded(Harmony harmony)
        {
            LogInfo("Loading FormInspector...");

            lib = GetDependency<Lib.Lib>("Lib");

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
                ShowDebug(report, $"Inspector: {form.Name} [{form.GetType().Name}]");
            }
        }

        private static string BuildFormInspectorReport(Form form)
        {
            var sb = new StringBuilder();

            // Reverse-lookup: obfuscated type name -> known AuroraType
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
            sb.AppendLine($"Form.Name:        {form.Name}");
            sb.AppendLine($"Form.Text:        {form.Text}");
            sb.AppendLine($"Type.Name:        {obfuscatedName}");
            sb.AppendLine($"AuroraType:       {knownType}");
            sb.AppendLine($"Size:             {form.Width}x{form.Height}");
            sb.AppendLine($"ClientSize:       {form.ClientSize.Width}x{form.ClientSize.Height}");
            sb.AppendLine($"Controls count:   {CountControls(form)}");
            sb.AppendLine();

            // List fields on the form's type (the obfuscated internal state)
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

                // Show visibility and enabled state
                string flags = "";
                if (!c.Visible) flags += " [HIDDEN]";
                if (!c.Enabled) flags += " [DISABLED]";

                sb.AppendLine($"{indent}[{typeName}] {name}  ({c.Width}x{c.Height} @ {c.Left},{c.Top}){flags}  \"{text}\"");

                // For TabControls, list tab pages explicitly
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
