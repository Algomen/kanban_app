This folder contains container lifecycle scripts for local development.

Current scripts:
- `start-mac.sh`
- `stop-mac.sh`
- `start-linux.sh`
- `stop-linux.sh`
- `start-windows.ps1`
- `stop-windows.ps1`

Current behavior:
- Build the Docker image from the repo root
- Run the app container on `http://localhost:8000`
- Stop and remove the named container when requested

Constraints:
- Keep the scripts explicit and easy to read
- Prefer container-first workflows over local host tooling
