# ⚠️ Emergency Infrastructure Scripts

> [!CAUTION]
> **HIGH-RISK DESTRUCTIVE OPERATION**
> 
> The scripts in this directory are intended **ONLY for disaster recovery or hard resets** when Terraform state becomes corrupt, inconsistent, or locked during deployment failures.
>
> Executing these scripts will **PERMANENTLY DELETE** all cloud resources in the selected environment, including:
> - Azure Cosmos DB (All stored URLs, partition data, and analytics)
> - Azure Functions & Storage Accounts
> - Azure Static Web Apps
> - Application Insights & Logs

---

## Scripts Overview

| Script | Platform | Purpose |
| :--- | :--- | :--- |
| [`emergency_nuke.ps1`](emergency_nuke.ps1) | Windows PowerShell | Tears down an environment and resyncs Terraform state |
| [`emergency_nuke.sh`](emergency_nuke.sh) | Linux / macOS / Git Bash | Bash equivalent of the teardown script |

---

## Safety Mechanism

To prevent accidental execution or unintended production data loss:
1. You must select the target environment (`dev` or `prod`).
2. You must manually type the confirmation string:
   ```text
   DESTROY prod
   ```
3. If the input does not match character-for-character, the script aborts immediately with zero side-effects.

---

## Usage

### PowerShell (Windows)
```powershell
# Interactive prompt
.\infra\scripts\emergency_nuke.ps1

# Or target directly:
.\infra\scripts\emergency_nuke.ps1 -Environment dev
.\infra\scripts\emergency_nuke.ps1 -Environment prod
```

### Bash (macOS / Linux)
```bash
chmod +x ./infra/scripts/emergency_nuke.sh
./infra/scripts/emergency_nuke.sh dev
# or
./infra/scripts/emergency_nuke.sh prod
```
