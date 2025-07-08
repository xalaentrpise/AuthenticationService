#!/bin/bash

# GitHub Repository Cleanup Script
# This script will close all open pull requests and cancel all workflow runs

set -e

REPO="xalaentrpise/AuthenticationService"

echo "Starting GitHub cleanup for repository: $REPO"
echo "======================================="

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "Error: GitHub CLI (gh) is not installed"
    echo "Please install it from: https://cli.github.com/"
    exit 1
fi

# Check if user is authenticated
if ! gh auth status &> /dev/null; then
    echo "Error: Not authenticated with GitHub CLI"
    echo "Please run: gh auth login"
    exit 1
fi

echo "Step 1: Closing all open pull requests..."
echo "----------------------------------------"

# Get all open pull requests
OPEN_PRS=$(gh pr list --repo $REPO --state open --json number --jq '.[].number')

if [ -z "$OPEN_PRS" ]; then
    echo "No open pull requests found"
else
    echo "Found open pull requests: $OPEN_PRS"
    
    for PR_NUMBER in $OPEN_PRS; do
        echo "Closing PR #$PR_NUMBER..."
        gh pr close $PR_NUMBER --repo $REPO --comment "Closed during repository cleanup" || true
    done
fi

echo ""
echo "Step 2: Cancelling all running workflow runs..."
echo "-----------------------------------------------"

# Get all running/queued workflow runs
RUNNING_RUNS=$(gh api repos/$REPO/actions/runs --jq '.workflow_runs[] | select(.status == "queued" or .status == "in_progress") | .id')

if [ -z "$RUNNING_RUNS" ]; then
    echo "No running workflow runs found"
else
    echo "Found running/queued workflow runs"
    
    for RUN_ID in $RUNNING_RUNS; do
        echo "Cancelling workflow run $RUN_ID..."
        gh api repos/$REPO/actions/runs/$RUN_ID/cancel -X POST || true
    done
fi

echo ""
echo "Step 3: Deleting old workflow runs (keeping last 5)..."
echo "----------------------------------------------------"

# Get workflow runs (skip first 5, delete the rest)
OLD_RUNS=$(gh api repos/$REPO/actions/runs --jq '.workflow_runs[5:] | .[].id')

if [ -z "$OLD_RUNS" ]; then
    echo "No old workflow runs to delete"
else
    echo "Deleting old workflow runs..."
    
    for RUN_ID in $OLD_RUNS; do
        echo "Deleting workflow run $RUN_ID..."
        gh api repos/$REPO/actions/runs/$RUN_ID -X DELETE || true
    done
fi

echo ""
echo "Step 4: Cleaning up branches (Dependabot branches)..."
echo "----------------------------------------------------"

# Get all dependabot branches
DEPENDABOT_BRANCHES=$(gh api repos/$REPO/branches --jq '.[] | select(.name | startswith("dependabot/")) | .name')

if [ -z "$DEPENDABOT_BRANCHES" ]; then
    echo "No dependabot branches found"
else
    echo "Found dependabot branches"
    
    for BRANCH in $DEPENDABOT_BRANCHES; do
        echo "Deleting branch: $BRANCH..."
        gh api repos/$REPO/git/refs/heads/$BRANCH -X DELETE || true
    done
fi

echo ""
echo "✅ Cleanup completed!"
echo "===================="
echo "Summary:"
echo "- Closed all open pull requests"
echo "- Cancelled all running workflow runs"
echo "- Deleted old workflow runs (kept last 5)"
echo "- Removed dependabot branches"
echo ""
echo "The repository should now be clean and ready for use."