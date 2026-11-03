; Precify Financy Windows user installer. Build with scripts/package-desktop.ps1.
#ifndef AppVersion
 #define AppVersion "2.1.0"
#endif
#ifndef SourceDir
 #define SourceDir "..\dist\desktop\Precify-Financy-" + AppVersion
#endif

[Setup]
AppId={{8BCF3210-9C20-441C-89D2-1BA9C8F936A7}
AppName=Precify Financy
AppVersion={#AppVersion}
AppVerName=Precify Financy {#AppVersion}
AppPublisher=Precify Financy Contributors
AppPublisherURL=https://github.com/BrunoPavil18/Precify-Financy
DefaultDirName={localappdata}\Programs\Precify Financy
DefaultGroupName=Precify Financy
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0
OutputDir=..\dist\desktop
OutputBaseFilename=Precify-Financy-{#AppVersion}-setup
SetupIconFile=..\apps\desktop\src-tauri\icons\icon.ico
Compression=lzma2/fast
SolidCompression=yes
WizardStyle=modern
CloseApplications=yes
UninstallDisplayIcon={app}\precify-financy.exe
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
Name: "{autoprograms}\Precify Financy"; Filename: "{app}\precify-financy.exe"
Name: "{autodesktop}\Precify Financy"; Filename: "{app}\precify-financy.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\precify-financy.exe"; Description: "{cm:LaunchProgram,Precify Financy}"; Flags: nowait postinstall skipifsilent
