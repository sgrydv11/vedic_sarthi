param(
  [string]$SdkRoot = $env:ANDROID_HOME,
  [string]$JavaHome = 'C:/Program Files/Android/Android Studio/jbr'
)

$ErrorActionPreference = 'Stop'
$project = $PSScriptRoot
$toolsCache = Join-Path $project '.tools'
$work = Join-Path $project 'build'
$apk = Join-Path $project 'Avantika.apk'

function Run-BuildTool {
  param([string]$Tool, [string[]]$Arguments)
  & $Tool @Arguments
  if ($LASTEXITCODE -ne 0) { throw "Build tool failed with exit code ${LASTEXITCODE}: $Tool" }
}

$platform = if ($SdkRoot) { Join-Path $SdkRoot 'platforms/android-35/android.jar' } else {
  Join-Path $toolsCache 'platform/android-35/android.jar'
}
$buildTools = if ($SdkRoot) { Join-Path $SdkRoot 'build-tools/35.0.0' } else {
  Join-Path $toolsCache 'build-tools/android-15'
}
if (!(Test-Path -LiteralPath $platform)) { throw "Android SDK Platform 35 is missing at $platform" }
if (!(Test-Path -LiteralPath (Join-Path $buildTools 'aapt2.exe'))) { throw "Android SDK Build Tools 35.0.0 are missing at $buildTools" }
if (!(Test-Path -LiteralPath (Join-Path $JavaHome 'bin/javac.exe'))) { throw "JDK is missing at $JavaHome" }
$env:JAVA_HOME = $JavaHome

foreach ($directory in @($work, "$work/classes", "$work/dex", "$work/assets/web", $toolsCache)) {
  New-Item -ItemType Directory -Force -Path $directory | Out-Null
}

foreach ($file in @('index.html','ui.js','style.css','catalog.json','library-gita.json','india-birthplaces.json','india-birthplaces-source.txt','panchang.js','panchang-engine.js','panchang-licenses.txt','jyotish.js','jyotish-engine.js','jyotish-licenses.txt','hero.webp','pandit-arvind.jpg','pandit-madhav.jpg')) {
  Copy-Item -LiteralPath (Join-Path $project "../public/$file") -Destination "$work/assets/web"
}
$manifest = Join-Path $project 'AndroidManifest.xml'
$resources = Join-Path $project 'res'
$source = Join-Path $project 'src/MainActivity.java'

Run-BuildTool "$buildTools/aapt2.exe" @('compile','--dir',$resources,'-o',"$work/resources.zip")
Run-BuildTool "$buildTools/aapt2.exe" @('link','-I',$platform,'--manifest',$manifest,'-A',"$work/assets",'-o',"$work/resources.apk","$work/resources.zip")
Run-BuildTool "$JavaHome/bin/javac.exe" @('-encoding','UTF-8','--release','8','-classpath',$platform,'-d',"$work/classes",$source)
$classFiles = @(Get-ChildItem -LiteralPath "$work/classes" -Recurse -File -Filter '*.class' | ForEach-Object FullName)
Run-BuildTool "$buildTools/d8.bat" (@('--min-api','26','--lib',$platform,'--output',"$work/dex") + $classFiles)

Copy-Item -LiteralPath "$work/resources.apk" -Destination "$work/unsigned.apk" -Force
Push-Location -LiteralPath "$work/dex"
try { Run-BuildTool "$buildTools/aapt.exe" @('add',"$work/unsigned.apk",'classes.dex') } finally { Pop-Location }
Run-BuildTool "$buildTools/zipalign.exe" @('-f','4',"$work/unsigned.apk","$work/aligned.apk")

$key = Join-Path $toolsCache 'avantika-local.p12'
if (!(Test-Path -LiteralPath $key)) {
  Run-BuildTool "$JavaHome/bin/keytool.exe" @('-genkeypair','-alias','avantika-local','-keystore',$key,'-storetype','PKCS12','-storepass','android','-keypass','android','-keyalg','RSA','-keysize','2048','-validity','10000','-dname','CN=Avantika Local Build')
}
Run-BuildTool "$buildTools/apksigner.bat" @('sign','--ks',$key,'--ks-key-alias','avantika-local','--ks-pass','pass:android','--out',"$work/signed.apk","$work/aligned.apk")
Run-BuildTool "$buildTools/zipalign.exe" @('-c','4',"$work/signed.apk")
Run-BuildTool "$buildTools/apksigner.bat" @('verify','--verbose','--print-certs',"$work/signed.apk")
Run-BuildTool "$buildTools/aapt.exe" @('dump','badging',"$work/signed.apk")
Copy-Item -LiteralPath "$work/signed.apk" -Destination $apk -Force
Get-FileHash -Algorithm SHA256 -LiteralPath $apk
