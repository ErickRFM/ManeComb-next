param(
  [string]$Package = "com.manecomb.app",
  [int]$DurationMinutes = 30,
  [string]$OutputDir = "artifacts/native-physical",
  [switch]$ForceDoze
)

$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

function Save-Adb([string]$Name, [string[]]$Args) {
  $path = Join-Path $OutputDir $Name
  & adb @Args 2>&1 | Out-File -Encoding utf8 $path
}

$devices = (& adb devices) -join "`n"
if ($devices -notmatch "	device") {
  throw "No adb device is connected and authorized."
}

$start = Get-Date
$meta = [ordered]@{
  startedAt = $start.ToString("o")
  package = $Package
  durationMinutes = $DurationMinutes
  gitSha = (& git rev-parse HEAD 2>$null)
}

Save-Adb "device.txt" @("shell","getprop","ro.product.manufacturer")
& adb shell getprop ro.product.model | Add-Content (Join-Path $OutputDir "device.txt")
& adb shell getprop ro.build.version.release | Add-Content (Join-Path $OutputDir "device.txt")
& adb shell getprop ro.build.version.sdk | Add-Content (Join-Path $OutputDir "device.txt")
Save-Adb "package-start.txt" @("shell","dumpsys","package",$Package)
Save-Adb "battery-start.txt" @("shell","dumpsys","battery")
Save-Adb "power-start.txt" @("shell","dumpsys","power")
Save-Adb "deviceidle-start.txt" @("shell","dumpsys","deviceidle")
Save-Adb "location-start.txt" @("shell","dumpsys","location")

& adb logcat -c | Out-Null
if ($ForceDoze) {
  & adb shell dumpsys deviceidle force-idle | Out-Null
}

Write-Host "Certification capture running for $DurationMinutes minute(s). Keep the requested app/background/lock-screen scenario active."
Start-Sleep -Seconds ($DurationMinutes * 60)

if ($ForceDoze) {
  & adb shell dumpsys deviceidle unforce | Out-Null
}

Save-Adb "battery-end.txt" @("shell","dumpsys","battery")
Save-Adb "power-end.txt" @("shell","dumpsys","power")
Save-Adb "deviceidle-end.txt" @("shell","dumpsys","deviceidle")
Save-Adb "location-end.txt" @("shell","dumpsys","location")
Save-Adb "package-end.txt" @("shell","dumpsys","package",$Package)
& adb logcat -d -v threadtime ManeCombLocation:V '*:S' 2>&1 | Out-File -Encoding utf8 (Join-Path $OutputDir "manecomb-location.log")

$meta.endedAt = (Get-Date).ToString("o")
$meta | ConvertTo-Json | Out-File -Encoding utf8 (Join-Path $OutputDir "run.json")

Write-Host "Evidence captured in $OutputDir. Do not mark PASS until backend telemetry counts and queue recovery are reconciled."
