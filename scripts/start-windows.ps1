$ErrorActionPreference = "Stop"

$imageName = "pm-mvp"
$containerName = "pm-mvp"
$port = "8000"

docker build -t $imageName .
docker rm -f $containerName | Out-Null

$dockerArgs = @(
  "--detach"
  "--name", $containerName
  "--publish", "${port}:8000"
)

if (Test-Path ".env") {
  $dockerArgs += @("--env-file", ".env")
}

docker run @dockerArgs $imageName | Out-Null

Write-Host "App started at http://localhost:$port"
