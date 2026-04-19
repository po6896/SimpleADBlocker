# Register refresh-har.ps1 as a weekly Windows scheduled task.
# Run once as admin; the task re-runs itself on the defined schedule.
#
# Schedule: every Sunday 03:00 JST.

$taskName = 'SimpleADBlocker HAR Refresh'
$scriptPath = Join-Path $PSScriptRoot 'refresh-har.ps1'
$workDir = Split-Path -Parent $PSScriptRoot

if (-not (Test-Path $scriptPath)) {
  throw "refresh-har.ps1 not found at $scriptPath"
}

$action = New-ScheduledTaskAction -Execute 'powershell.exe' `
  -Argument "-ExecutionPolicy Bypass -File `"$scriptPath`"" `
  -WorkingDirectory $workDir

$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At 3:00am

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Hours 2)

Register-ScheduledTask -TaskName $taskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description 'Weekly refresh of SimpleADBlocker HAR corpus' `
  -Force

Write-Host "Registered '$taskName'. Next run: $(Get-ScheduledTask -TaskName $taskName | Get-ScheduledTaskInfo | Select-Object -ExpandProperty NextRunTime)"
