#define AppName "FieldForce Hub"
[Setup]
AppId={{1B63AE8F-D12E-4EAB-9374-D784D10C7189}
AppName={#AppName}
AppVersion=1.0.0
AppPublisher=KAM AYON
AppPublisherURL=https://mehedialimayon-del.github.io/salesman-performance-app/
DefaultDirName={localappdata}\Programs\FieldForceHub
DefaultGroupName={#AppName}
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0.19041
OutputDir=..\dist-windows
OutputBaseFilename=FieldForce-Hub-Windows-Setup
SetupIconFile=app.ico
UninstallDisplayIcon={app}\FieldForceHub.exe
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
DisableProgramGroupPage=yes
CloseApplications=yes
SetupLogging=yes

[Files]
Source: "publish\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "runtime\MicrosoftEdgeWebview2Setup.exe"; Flags: dontcopy

[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\FieldForceHub.exe"
Name: "{userdesktop}\{#AppName}"; Filename: "{app}\FieldForceHub.exe"

[Run]
Filename: "{app}\FieldForceHub.exe"; Description: "Open FieldForce Hub"; Flags: nowait postinstall skipifsilent

[Code]
function RuntimePresent: Boolean;
var Version: String;
begin
  Result := (RegQueryStringValue(HKLM32, 'SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}', 'pv', Version) and (Version <> '') and (Version <> '0.0.0.0')) or
    (RegQueryStringValue(HKCU, 'SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}', 'pv', Version) and (Version <> '') and (Version <> '0.0.0.0'));
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
var Code: Integer;
begin
  Result := '';
  if not RuntimePresent then begin
    ExtractTemporaryFile('MicrosoftEdgeWebview2Setup.exe');
    WizardForm.StatusLabel.Caption := 'Installing Microsoft WebView2. Please stay connected to the internet...';
    if not Exec(ExpandConstant('{tmp}\MicrosoftEdgeWebview2Setup.exe'), '/silent /install', '', SW_HIDE, ewWaitUntilTerminated, Code) then
      Result := 'Microsoft WebView2 could not start. Check your internet connection and run Setup again.'
    else if not RuntimePresent then
      Result := 'Microsoft WebView2 is required. Check your internet connection, install the Microsoft WebView2 Runtime, and run Setup again.';
  end;
end;
