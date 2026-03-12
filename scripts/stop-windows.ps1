$ErrorActionPreference = "Stop"

$containerName = "pm-mvp"

docker rm -f $containerName | Out-Null
