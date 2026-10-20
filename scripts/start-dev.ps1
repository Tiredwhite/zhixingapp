param(
    [string]$HBuilderPath = 'D:\code-app\HBuilderX.5.26.2026091802\HBuilderX',
    [switch]$ImportHBuilder
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimePath = Join-Path $projectRoot '.local'
New-Item -ItemType Directory -Path $runtimePath -Force | Out-Null

function Test-LocalPort([int]$Port) {
    $tcpClient = [System.Net.Sockets.TcpClient]::new()
    try { $tcpClient.Connect('127.0.0.1', $Port); return $true }
    catch { return $false }
    finally { $tcpClient.Dispose() }
}

$pythonPath = Join-Path $projectRoot 'server\.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $pythonPath)) { throw '请先按 README 创建 server/.venv 并安装依赖。' }
$nodeModulesPath = Join-Path $projectRoot 'mobile\node_modules'
if (-not (Test-Path -LiteralPath $nodeModulesPath)) { throw '请先在 mobile 目录运行 npm ci。' }

$startedProcesses = @()
if (-not (Test-LocalPort 8000)) {
    $apiProcess = Start-Process -FilePath $pythonPath -ArgumentList @('-m','uvicorn','app.main:app','--host','127.0.0.1','--port','8000','--no-access-log') -WorkingDirectory (Join-Path $projectRoot 'server') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtimePath 'api.stdout.log') -RedirectStandardError (Join-Path $runtimePath 'api.stderr.log')
    $startedProcesses += @{ id = $apiProcess.Id; kind = 'api' }
} else { Write-Output '8000端口已有服务，本脚本未替换该进程。' }

if (-not (Test-LocalPort 5173)) {
    $nodePath = (Get-Command node.exe).Source
    $uniCliPath = Join-Path $projectRoot 'mobile\node_modules\@dcloudio\vite-plugin-uni\bin\uni.js'
    $quotedCliPath = '"' + $uniCliPath + '"'
    $webProcess = Start-Process -FilePath $nodePath -ArgumentList @($quotedCliPath,'--host','127.0.0.1','--port','5173','--strictPort') -WorkingDirectory (Join-Path $projectRoot 'mobile') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtimePath 'web.stdout.log') -RedirectStandardError (Join-Path $runtimePath 'web.stderr.log')
    $startedProcesses += @{ id = $webProcess.Id; kind = 'web' }
} else { Write-Output '5173端口已有服务，本脚本未替换该进程。' }

if ($startedProcesses.Count -gt 0) {
    $startedProcesses | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $runtimePath 'dev-processes.json') -Encoding utf8
}
if ($ImportHBuilder) {
    $cliPath = Join-Path $HBuilderPath 'cli.exe'
    if (Test-Path -LiteralPath $cliPath) { & $cliPath project open --path (Join-Path $projectRoot 'mobile') }
    else { Write-Warning '未找到 HBuilderX cli.exe，可在编辑器中手动导入 mobile。' }
}
Write-Output 'Web预览 http://127.0.0.1:5173'
Write-Output '后端健康检查 http://127.0.0.1:8000/healthz'
Write-Output '日志保存在 .local；修改 server/.env 后需要重启后端。'

