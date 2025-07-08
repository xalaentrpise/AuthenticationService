# GitHub Repository Cleanup Instructions

## Quick Cleanup (Recommended)

Run the automated cleanup script:

```bash
./scripts/cleanup-github.sh
```

This script will:
1. Close all open pull requests
2. Cancel all running/queued workflow runs
3. Delete old workflow runs (keeping last 5)
4. Remove dependabot branches

## Manual Cleanup (Alternative)

If you prefer to do it manually or the script doesn't work:

### 1. Close All Pull Requests

```bash
# List all open PRs
gh pr list --repo xalaentrpise/AuthenticationService

# Close each PR individually
gh pr close 1 --repo xalaentrpise/AuthenticationService --comment "Closed during cleanup"
gh pr close 2 --repo xalaentrpise/AuthenticationService --comment "Closed during cleanup"
# ... continue for all PRs
```

### 2. Cancel All Workflow Runs

```bash
# List all running workflows
gh api repos/xalaentrpise/AuthenticationService/actions/runs --jq '.workflow_runs[] | select(.status == "queued" or .status == "in_progress") | "\(.id) - \(.name)"'

# Cancel all running workflows
gh api repos/xalaentrpise/AuthenticationService/actions/runs --jq '.workflow_runs[] | select(.status == "queued" or .status == "in_progress") | .id' | xargs -I {} gh api repos/xalaentrpise/AuthenticationService/actions/runs/{}/cancel -X POST
```

### 3. Delete Old Workflow Runs

```bash
# Delete all but the latest 5 workflow runs
gh api repos/xalaentrpise/AuthenticationService/actions/runs --jq '.workflow_runs[5:] | .[].id' | xargs -I {} gh api repos/xalaentrpise/AuthenticationService/actions/runs/{} -X DELETE
```

### 4. Clean Up Branches

```bash
# List dependabot branches
gh api repos/xalaentrpise/AuthenticationService/branches --jq '.[] | select(.name | startswith("dependabot/")) | .name'

# Delete dependabot branches
gh api repos/xalaentrpise/AuthenticationService/branches --jq '.[] | select(.name | startswith("dependabot/")) | .name' | xargs -I {} gh api repos/xalaentrpise/AuthenticationService/git/refs/heads/{} -X DELETE
```

## Prerequisites

### Install GitHub CLI

**macOS:**
```bash
brew install gh
```

**Windows:**
```bash
winget install GitHub.cli
```

**Linux:**
```bash
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh
```

### Authenticate

```bash
gh auth login
```

Choose:
- GitHub.com
- HTTPS
- Login with a web browser

## Verification

After cleanup, verify everything is clean:

```bash
# Check for open PRs (should be empty)
gh pr list --repo xalaentrpise/AuthenticationService

# Check for running workflows (should be empty or minimal)
gh api repos/xalaentrpise/AuthenticationService/actions/runs --jq '.workflow_runs[] | select(.status == "queued" or .status == "in_progress") | "\(.id) - \(.name)"'

# Check total workflow runs (should be 5 or less)
gh api repos/xalaentrpise/AuthenticationService/actions/runs --jq '.total_count'
```

## What This Fixes

- **84 Workflow Runs**: Cancels queued runs and deletes old ones
- **15 Open PRs**: Closes all dependency update PRs
- **Queue Backlog**: Clears the GitHub Actions queue
- **Resource Usage**: Frees up GitHub Actions minutes
- **Repository State**: Returns to clean starting point

The repository will be ready for normal development after cleanup.