; Precify Colombia Windows user installer. Build with scripts/package-desktop.ps1.
#ifndef AppVersion
 #define AppVersion "2.1.0"
#endif
#ifndef SourceDir
 #define SourceDir "..\dist\desktop\Precify-Colombia-" + AppVersion
#endif

[Setup]
AppId={{EAC2EC77-F692-45CC-A387-F61171A5D4B0}
AppName=Precify Colombia
AppVersion={#AppVersion}
AppVerName=Precify Colombia {#AppVersion}
AppPublisher=Precify Colombia Contributors
AppPublisherURL=https://github.com/BrunoPavil18/Precify-Colombia
DefaultDirName={localappdata}\Programs\Precify Colombia
DefaultGroupName=Precify Colombia
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0
OutputDir=..\dist\desktop
OutputBaseFilename=Precify-Colombia-{#AppVersion}-setup
SetupIconFile=..\apps\desktop\src-tauri\icons\icon.ico
Compression=lzma2/fast
SolidCompression=yes
WizardStyle=modern
CloseApplications=yes
UninstallDisplayIcon={app}\precify-colombia.exe
VersionInfoVersion={#AppVersion}

[Languages]
Name: "brazilianportuguese"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\Precify Colombia"; Filename: "{app}\precify-colombia.exe"
Name: "{autodesktop}\Precify Colombia"; Filename: "{app}\precify-colombia.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\precify-colombia.exe"; Description: "{cm:LaunchProgram,Precify Colombia}"; Flags: nowait postinstall skipifsilent
