# Refresh HAR files + baseline.json for every corpus entry.
#
# - Runs each site in its own `--only` invocation because record mode
#   occasionally hangs on heavy SPA sites; per-site timeouts contain the
#   damage.
# - Logs to scripts/har-refresh.log with timestamps so Windows Task
#   Scheduler runs are auditable.
#
# Suggested schedule: weekly (Sunday 03:00 JST), because prebid nonces and
# SSP-specific cache-busters drift within ~7 days.

param(
  [int]$PerSiteTimeoutSec = 300
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo

$log = Join-Path $PSScriptRoot 'har-refresh.log'
function Log($msg) {
  $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  "[$stamp] $msg" | Tee-Object -FilePath $log -Append
}

Log "=== refresh-har start (timeout ${PerSiteTimeoutSec}s per site) ==="

# Extract corpus entry ids from targets.yaml without pulling in a YAML parser.
$yaml = Get-Content 'test/corpus/targets.yaml' -Encoding UTF8
$ids = $yaml `
  | Where-Object { $_ -match '^\s*-\s*id:\s*([A-Za-z0-9_]+)' } `
  | ForEach-Object { $Matches[1] }

Log ("Corpus entries: " + ($ids -join ', '))

$failed = @()
foreach ($id in $ids) {
  Log "-- recording $id"
  $proc = Start-Process -FilePath 'node' `
    -ArgumentList @('test/harness/run-corpus.js', '--record', '--only', $id) `
    -NoNewWindow -PassThru
  if (-not $proc.WaitForExit($PerSiteTimeoutSec * 1000)) {
    try { $proc.Kill($true) } catch {}
    Log "  TIMEOUT after ${PerSiteTimeoutSec}s; keeping previous HAR"
    $failed += $id
    continue
  }
  if ($proc.ExitCode -ne 0) {
    Log "  exit=$($proc.ExitCode); keeping previous HAR"
    $failed += $id
    continue
  }
  Log "  OK"
}

Log ("=== refresh-har done; failed: " + ($failed -join ', ').PadRight(1, ' '))

if ($env:DISCORD_NOTIFY -eq '1') {
  $summary = "SimpleADBlocker HAR refresh: $($ids.Count - $failed.Count)/$($ids.Count) OK"
  if ($failed.Count -gt 0) { $summary += " (failed: $($failed -join ','))" }
  try {
    & 'F:/BrainServer/bridge/discord-notify' $summary
  } catch {}
}

exit ($failed.Count -gt 0 ? 1 : 0)
