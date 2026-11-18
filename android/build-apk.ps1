<#
  Compila y firma v2+v3 el APK nativo de «agent Bot OpenSource» sin Gradle pesado:
    powershell -ExecutionPolicy Bypass -File android\build-apk.ps1
  Salida: release\agent-Bot-1.2.0-android.apk
#>
param(
    [string]$SdkRoot = "D:\.build-cache\android-herramientas",
    [int]$VersionCode = 4,
    [string]$VersionName = "1.2.0"
)
$ErrorActionPreference = "Stop"

$Here = $PSScriptRoot
$RepoRoot = (Resolve-Path (Join-Path $Here "..")).Path
$ReleaseDir = Join-Path $RepoRoot "release"
New-Item -ItemType Directory -Force $ReleaseDir | Out-Null

$JavacFile = Get-ChildItem "$SdkRoot\jdk" -Recurse -Filter "javac.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $JavacFile) { throw "No se encontró javac.exe en $SdkRoot\jdk" }
$JdkHome = (Resolve-Path (Join-Path $JavacFile.DirectoryName "..")).Path
$env:JAVA_HOME = $JdkHome
$env:PATH = "$JdkHome\bin;$env:PATH"

$BtDir = (Get-ChildItem "$SdkRoot\sdk\build-tools" -Directory | Sort-Object Name -Descending | Select-Object -First 1).FullName
$AndroidJar = (Get-ChildItem "$SdkRoot\sdk\platforms" -Recurse -Filter "android.jar" | Select-Object -First 1).FullName

$BuildDir = Join-Path $Here "build"
if (Test-Path $BuildDir) { Remove-Item $BuildDir -Recurse -Force }
New-Item -ItemType Directory -Force "$BuildDir\gen", "$BuildDir\obj", "$BuildDir\dex" | Out-Null

python "$Here\make_icons.py"

& "$BtDir\aapt2.exe" compile --dir "$Here\res" -o "$BuildDir\res.zip"
if ($LASTEXITCODE -ne 0) { throw "aapt2 compile falló ($LASTEXITCODE)" }

& "$BtDir\aapt2.exe" link -I $AndroidJar `
    --manifest "$Here\AndroidManifest.xml" `
    --min-sdk-version 24 `
    --target-sdk-version 35 `
    --version-code $VersionCode `
    --version-name $VersionName `
    --java "$BuildDir\gen" `
    -A "$Here\assets" `
    -o "$BuildDir\unsigned.apk" `
    "$BuildDir\res.zip"
if ($LASTEXITCODE -ne 0) { throw "aapt2 link falló ($LASTEXITCODE)" }

$JavaSources = @(Get-ChildItem "$Here\src" -Recurse -Filter "*.java" | ForEach-Object FullName) +
               @(Get-ChildItem "$BuildDir\gen" -Recurse -Filter "*.java" | ForEach-Object FullName)

& "$JdkHome\bin\javac.exe" --release 11 -encoding UTF-8 -Xlint:-options -classpath $AndroidJar -d "$BuildDir\obj" @JavaSources
if ($LASTEXITCODE -ne 0) { throw "javac falló ($LASTEXITCODE)" }

& "$JdkHome\bin\jar.exe" cf "$BuildDir\classes.jar" -C "$BuildDir\obj" .
if ($LASTEXITCODE -ne 0) { throw "jar falló ($LASTEXITCODE)" }

& "$BtDir\d8.bat" --release --lib $AndroidJar --min-api 24 --output "$BuildDir\dex" "$BuildDir\classes.jar"
if ($LASTEXITCODE -ne 0) { throw "d8 falló ($LASTEXITCODE)" }

Add-Type -AssemblyName System.IO.Compression.FileSystem
$Zip = [System.IO.Compression.ZipFile]::Open("$BuildDir\unsigned.apk", "Update")
[void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($Zip, "$BuildDir\dex\classes.dex", "classes.dex", "Optimal")
$Zip.Dispose()

& "$BtDir\zipalign.exe" -f -p 4 "$BuildDir\unsigned.apk" "$BuildDir\aligned.apk"
if ($LASTEXITCODE -ne 0) { throw "zipalign falló ($LASTEXITCODE)" }

$KeyDir = "D:\.build-cache\apk-signing"
New-Item -ItemType Directory -Force $KeyDir | Out-Null
$Keystore = Join-Path $KeyDir "agentbot-release.p12"
$KeyPass = "agentbot-open-key-2026"
$PrevEA = $ErrorActionPreference
$ErrorActionPreference = "Continue"
if (-not (Test-Path $Keystore)) {
    & "$JdkHome\bin\keytool.exe" -genkeypair -keystore $Keystore -storetype PKCS12 -alias agentbot `
        -keyalg RSA -keysize 2048 -validity 10950 `
        -dname "CN=Agent Bot OpenSource, O=ZeroPhoenix" `
        -storepass $KeyPass -keypass $KeyPass *> $null
    if ($LASTEXITCODE -ne 0) { throw "keytool falló ($LASTEXITCODE)" }
}

$OutApk = Join-Path $ReleaseDir "agent-Bot-$VersionName-android.apk"
& "$BtDir\apksigner.bat" sign --ks $Keystore --ks-pass "pass:$KeyPass" --ks-key-alias agentbot --out $OutApk "$BuildDir\aligned.apk" *> $null
if ($LASTEXITCODE -ne 0) { throw "apksigner sign falló ($LASTEXITCODE)" }

$VerifyOut = & "$BtDir\apksigner.bat" verify --verbose $OutApk 2>&1
if ($LASTEXITCODE -ne 0) { throw "apksigner verify falló ($LASTEXITCODE): $VerifyOut" }
$ErrorActionPreference = $PrevEA

$SizeKb = [Math]::Round((Get-Item $OutApk).Length / 1KB, 1)
$Hash16 = (Get-FileHash $OutApk -Algorithm SHA256).Hash.Substring(0, 16)
Write-Host "APK_OK: $OutApk ($SizeKb KB, SHA256=$Hash16)"
