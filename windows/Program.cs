using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace FieldForceHub.Windows
{
    internal static class AppLinks
    {
        internal const string Home = "https://mehedialimayon-del.github.io/salesman-performance-app/";
        internal static bool SameOrigin(string value)
        {
            return Uri.TryCreate(value, UriKind.Absolute, out var uri) &&
                uri.Scheme == "https" && uri.Host.Equals("mehedialimayon-del.github.io", StringComparison.OrdinalIgnoreCase) && uri.IsDefaultPort;
        }
        internal static bool InsideApp(string value)
        {
            if (value == "about:blank") return true;
            if (value != null && value.StartsWith("blob:", StringComparison.Ordinal)) return SameOrigin(value.Substring(5));
            return SameOrigin(value) && new Uri(value).AbsolutePath.StartsWith("/salesman-performance-app/", StringComparison.Ordinal);
        }
        internal static bool CanOpenExternal(string value)
        {
            return Uri.TryCreate(value, UriKind.Absolute, out var uri) &&
                (uri.Scheme == "https" || uri.Scheme == "mailto" || uri.Scheme == "tel");
        }
        internal static void OpenExternal(string value)
        {
            if (!CanOpenExternal(value)) return;
            try { Process.Start(new ProcessStartInfo(value) { UseShellExecute = true }); }
            catch (Exception ex) { MessageBox.Show("Windows could not open this link.\n" + ex.Message, "FieldForce Hub"); }
        }
    }

    internal static class Program
    {
        [STAThread]
        private static int Main(string[] args)
        {
            if (args.Length > 0 && args[0] == "--self-test")
            {
                bool passed = AppLinks.InsideApp(AppLinks.Home) &&
                    AppLinks.InsideApp(AppLinks.Home + "?screen=income") &&
                    !AppLinks.InsideApp("https://mehedialimayon-del.github.io.evil.test/salesman-performance-app/") &&
                    !AppLinks.InsideApp("http://mehedialimayon-del.github.io/salesman-performance-app/") &&
                    !AppLinks.InsideApp("https://mehedialimayon-del.github.io/another-app/") &&
                    !AppLinks.InsideApp("file:///C:/Windows/notepad.exe") &&
                    !AppLinks.CanOpenExternal("javascript:alert(1)") &&
                    !AppLinks.CanOpenExternal("file:///C:/Windows/notepad.exe") &&
                    AppLinks.CanOpenExternal("https://meet.google.com/example");
                return passed ? 0 : 1;
            }
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            string smokeFile = args.Length == 2 && args[0] == "--smoke-test" ? args[1] : null;
            using (var form = new HubForm(smokeFile)) Application.Run(form);
            return Environment.ExitCode;
        }
    }

    internal sealed class HubForm : Form
    {
        private readonly WebView2 view = new WebView2 { Dock = DockStyle.Fill, DefaultBackgroundColor = Color.FromArgb(15, 12, 10) };
        private readonly ToolStrip toolbar = new ToolStrip { GripStyle = ToolStripGripStyle.Hidden, BackColor = Color.FromArgb(34, 24, 16), ForeColor = Color.White, Padding = new Padding(6, 3, 6, 3) };
        private readonly ToolStripLabel status = new ToolStripLabel("Connecting…") { Alignment = ToolStripItemAlignment.Right };
        private readonly string smokeFile;
        private CoreWebView2Environment environment;
        private readonly Timer timeout = new Timer { Interval = 60000 };
        private bool finished;
        private FormWindowState previousState;
        private FormBorderStyle previousBorder;
        private bool fullscreen;

        internal HubForm(string smokeFile = null)
        {
            this.smokeFile = smokeFile;
            Text = "FieldForce Hub";
            StartPosition = FormStartPosition.CenterScreen;
            ClientSize = new Size(1280, 820);
            MinimumSize = new Size(800, 600);
            try { Icon = System.Drawing.Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }
            Controls.Add(view);
            Controls.Add(toolbar);
            toolbar.Items.Add(Button("‹ Back", () => { if (view.CanGoBack) view.GoBack(); }));
            toolbar.Items.Add(Button("Home", () => view.CoreWebView2?.Navigate(AppLinks.Home)));
            toolbar.Items.Add(Button("Refresh", () => view.Reload()));
            toolbar.Items.Add(Button("Downloads", () => view.CoreWebView2?.OpenDefaultDownloadDialog()));
            toolbar.Items.Add(Button("Open in browser", () => AppLinks.OpenExternal(AppLinks.Home)));
            toolbar.Items.Add(status);
            Shown += async (_, __) => await InitializeAsync();
            FormClosed += (_, __) => { timeout.Dispose(); view.Dispose(); };
            timeout.Tick += (_, __) => FinishSmoke(false, "Startup timed out");
        }

        private ToolStripButton Button(string text, Action action)
        {
            var button = new ToolStripButton(text) { ForeColor = Color.White, DisplayStyle = ToolStripItemDisplayStyle.Text, Margin = new Padding(3) };
            button.Click += (_, __) => { if (view.CoreWebView2 != null) action(); };
            return button;
        }

        private async Task InitializeAsync()
        {
            if (smokeFile != null) timeout.Start();
            try
            {
                string profile = smokeFile == null
                    ? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "FieldForceHub", "WebView2")
                    : Path.Combine(Path.GetTempPath(), "FFH-Smoke-" + Guid.NewGuid().ToString("N"));
                environment = await CoreWebView2Environment.CreateAsync(null, profile);
                await view.EnsureCoreWebView2Async(environment);
                var core = view.CoreWebView2;
                core.Settings.AreHostObjectsAllowed = false;
                core.Settings.AreDevToolsEnabled = false;
                core.Settings.IsStatusBarEnabled = false;
                core.Settings.IsPasswordAutosaveEnabled = false;
                core.Settings.IsGeneralAutofillEnabled = false;
                core.NavigationStarting += (_, e) =>
                {
                    if (AppLinks.InsideApp(e.Uri)) { status.Text = "Connecting…"; return; }
                    e.Cancel = true;
                    if (e.IsUserInitiated) AppLinks.OpenExternal(e.Uri);
                };
                core.NewWindowRequested += OnNewWindow;
                core.PermissionRequested += OnPermission;
                core.DocumentTitleChanged += (_, __) => Text = "FieldForce Hub";
                core.DownloadStarting += (_, __) => status.Text = "Download started · see Downloads";
                core.NavigationCompleted += async (_, e) =>
                {
                    status.Text = e.IsSuccess ? "Online · same FieldForce account" : "Connection failed · use Refresh";
                    if (smokeFile == null || finished) return;
                    if (!e.IsSuccess) { FinishSmoke(false, "Navigation: " + e.WebErrorStatus); return; }
                    await Task.Delay(500);
                    try
                    {
                        string result = "false";
                        for (int i = 0; i < 50 && !finished; i++)
                        {
                            result = await core.ExecuteScriptAsync("!!(document.title.includes('FieldForce') && document.querySelector('input[type=password]'))");
                            if (result == "true") break;
                            await Task.Delay(500);
                        }
                        if (result != "true") { FinishSmoke(false, "Public login page did not render"); return; }
                        using (var stream = File.Create(smokeFile + ".png")) await core.CapturePreviewAsync(CoreWebView2CapturePreviewImageFormat.Png, stream);
                        FinishSmoke(true, "Public live login rendered in installed Windows app");
                    }
                    catch (Exception ex) { FinishSmoke(false, ex.GetType().Name); }
                };
                core.Navigate(AppLinks.Home);
            }
            catch (Exception ex)
            {
                if (smokeFile != null) { FinishSmoke(false, ex.GetType().Name + ": " + ex.Message); return; }
                var answer = MessageBox.Show(this,
                    "FieldForce Hub could not start. Check your internet connection and Microsoft Edge WebView2 Runtime.\n\n" + ex.Message +
                    "\n\nOpen the same app in your browser?", "FieldForce Hub", MessageBoxButtons.YesNo, MessageBoxIcon.Information);
                if (answer == DialogResult.Yes) AppLinks.OpenExternal(AppLinks.Home);
                Close();
            }
        }

        private void OnPermission(object sender, CoreWebView2PermissionRequestedEventArgs e)
        {
            if (smokeFile != null || !AppLinks.SameOrigin(e.Uri) || !AppLinks.InsideApp(view.Source?.AbsoluteUri))
            { e.State = CoreWebView2PermissionState.Deny; return; }
            string permission;
            switch (e.PermissionKind)
            {
                case CoreWebView2PermissionKind.Geolocation: permission = "your location"; break;
                case CoreWebView2PermissionKind.Camera: permission = "your camera"; break;
                case CoreWebView2PermissionKind.Microphone: permission = "your microphone"; break;
                case CoreWebView2PermissionKind.Notifications: permission = "notifications while the app is running"; break;
                case CoreWebView2PermissionKind.ClipboardRead: permission = "the clipboard"; break;
                default: e.State = CoreWebView2PermissionState.Deny; return;
            }
            e.State = MessageBox.Show(this, "Allow FieldForce Hub to access " + permission + "?", "FieldForce Hub permission",
                MessageBoxButtons.YesNo, MessageBoxIcon.Question) == DialogResult.Yes ? CoreWebView2PermissionState.Allow : CoreWebView2PermissionState.Deny;
        }

        private async void OnNewWindow(object sender, CoreWebView2NewWindowRequestedEventArgs e)
        {
            if (!AppLinks.InsideApp(e.Uri))
            {
                e.Handled = true;
                if (e.IsUserInitiated) AppLinks.OpenExternal(e.Uri);
                return;
            }
            var deferral = e.GetDeferral();
            try
            {
                var window = new Form { Text = "FieldForce Hub · Document", Width = 1000, Height = 760, StartPosition = FormStartPosition.CenterParent, Icon = Icon };
                var popup = new WebView2 { Dock = DockStyle.Fill };
                window.Controls.Add(popup);
                window.Show(this);
                await popup.EnsureCoreWebView2Async(environment);
                popup.CoreWebView2.Settings.AreHostObjectsAllowed = false;
                popup.CoreWebView2.NavigationStarting += (_, nav) =>
                {
                    if (AppLinks.InsideApp(nav.Uri)) return;
                    nav.Cancel = true;
                    if (nav.IsUserInitiated) AppLinks.OpenExternal(nav.Uri);
                };
                popup.CoreWebView2.PermissionRequested += (_, request) => request.State = CoreWebView2PermissionState.Deny;
                window.FormClosed += (_, __) => popup.Dispose();
                e.NewWindow = popup.CoreWebView2;
                e.Handled = true;
            }
            catch { e.Handled = true; }
            finally { deferral.Complete(); }
        }

        private void FinishSmoke(bool success, string message)
        {
            if (smokeFile == null || finished) return;
            finished = true;
            timeout.Stop();
            File.WriteAllText(smokeFile, (success ? "PASS: " : "FAIL: ") + message);
            Environment.ExitCode = success ? 0 : 1;
            Close();
        }

        protected override bool ProcessCmdKey(ref Message message, Keys keyData)
        {
            if (keyData == (Keys.Alt | Keys.Left)) { if (view.CanGoBack) view.GoBack(); return true; }
            if (keyData == Keys.F5) { if (view.CoreWebView2 != null) view.Reload(); return true; }
            if (keyData == Keys.F11 || (keyData == Keys.Escape && fullscreen))
            {
                if (!fullscreen) { previousState = WindowState; previousBorder = FormBorderStyle; FormBorderStyle = FormBorderStyle.None; WindowState = FormWindowState.Maximized; toolbar.Visible = false; }
                else { FormBorderStyle = previousBorder; WindowState = previousState; toolbar.Visible = true; }
                fullscreen = !fullscreen;
                return true;
            }
            return base.ProcessCmdKey(ref message, keyData);
        }
    }
}
