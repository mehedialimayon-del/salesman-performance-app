# FieldForce Hub for Windows

Windows 10 version 2004 or later / Windows 11, x64. This desktop host loads the current HTTPS FieldForce Hub site and uses the same account and cloud records. Internet is required. Web updates appear without reinstalling the Windows host.

Install `FieldForce-Hub-Windows-Setup.exe`, then open the desktop icon. The installer runs per user and installs Microsoft's signed Evergreen WebView2 Runtime only if missing. Windows 10/11 supply .NET Framework 4.8. The FieldForce installer itself is unsigned; no publisher certificate is fabricated.

Login stays in a dedicated profile in `%LOCALAPPDATA%\FieldForceHub\WebView2`. No passwords are bundled. Browser and phone sessions are separate. Camera, microphone, clipboard, location and notification requests ask the user for permission. External meetings and links open in the system browser; app-created document windows stay separate. PDF/Excel downloads use WebView2's download UI and the toolbar Downloads button. `Alt+Left` goes back, `F5` refreshes and `F11` toggles full screen.

The desktop host does not provide Android's native attendance background service. Laptop location is device/Windows dependent. Notifications and live updates require the app to be open; no claim is made for delivery after closing it. Native Windows sharing differs from Android.

## Build and verification

The Windows workflow compiles the pinned WebView2 SDK, creates the ICO from the existing app logo, checks the Microsoft bootstrapper's Authenticode signature, builds the Inno Setup installer, silently installs it, runs URL policy checks and loads the public live login page in the installed executable, then uninstalls. It does not use real account credentials or change sales data. Manual acceptance on the recipient's laptop remains necessary.
