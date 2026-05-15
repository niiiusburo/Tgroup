# TestSprite MCP Setup Guide

## Problem Summary

Claude Code was using an **old TestSprite API key** while a **new key** existed in a separate config file. The env var name was also inconsistent between configs.

## Root Cause

Claude Code reads MCP server configuration from **`~/.claude.json`** (not from `~/.claude/mcp-configs/mcp-servers.json`).

The `~/.claude/mcp-configs/mcp-servers.json` is a **template/reference file** with comments saying:
> "Copy the servers you need to your ~/.claude.json mcpServers section"

## What Was Wrong

| Config File | API Key | Env Var Name | Status |
|---|---|---|---|
| `~/.claude.json` (ACTIVE) | Old key `sk-user-iAv-aL...` | `API_KEY` | ❌ Stale key |
| `~/.claude/mcp-configs/mcp-servers.json` (TEMPLATE) | New key `sk-user-q2QV...` | `TESTSPRITE_API_KEY` | ❌ Wrong env var name |

## Fix Applied

1. **Updated `~/.claude.json`** with the new API key (keeping correct `API_KEY` env var)
2. **Updated `~/.claude/mcp-configs/mcp-servers.json`** to use `API_KEY` instead of `TESTSPRITE_API_KEY`

## Current Working Config (in `~/.claude.json`)

```json
{
  "mcpServers": {
    "TestSprite": {
      "command": "/opt/homebrew/bin/npx",
      "args": [
        "-y",
        "@testsprite/testsprite-mcp@latest"
      ],
      "env": {
        "API_KEY": "sk-user-q2QVL6wkizXq5gfppeOOdb2he8AOFkuWgNdii4gOV8IM11OuwjF6QCjLkwwej6u1lvXktJKwsyKfCslpS6bobmTpoKJ51qQ078ogvf-DLw4v57Ra7M4aN0gi0SpbtlorOXo"
      }
    }
  }
}
```

## How to Update TestSprite API Key in the Future

### Option 1: Edit `~/.claude.json` directly

```bash
# Open the config
open ~/.claude.json

# Find the TestSprite section and update the API_KEY value
# Or use sed:
sed -i '' 's/"API_KEY": "[^"]*"/"API_KEY": "YOUR_NEW_KEY_HERE"/' ~/.claude.json
```

### Option 2: Use Claude Code's built-in MCP management

In Claude Code, you can:
1. Run `/mcp` to see MCP server status
2. The MCP servers should auto-reload when config changes

### Option 3: Restart Claude Code

After updating the key, restart Claude Code to pick up the new config:
```bash
# Quit Claude Code completely and reopen
```

## Where Configs Live

| File | Purpose | Editable? |
|---|---|---|
| `~/.claude.json` | **Claude Code's active config** — this is what matters | ✅ Yes |
| `~/.claude/mcp-configs/mcp-servers.json` | Template/reference with multiple MCP examples | ✅ Yes (but only affects templates) |
| `~/.codex/config.toml` | Codex-specific config (separate tool) | ❌ No effect on Claude Code |

## TestSprite MCP Package Details

- **Package**: `@testsprite/testsprite-mcp@latest`
- **Expected env var**: `API_KEY`
- **Current installed version**: `0.0.19` (via npx)
- **Latest npm version**: `0.0.37`

## Verification Commands

```bash
# Check current config
grep -A 8 '"TestSprite"' ~/.claude.json

# Test MCP server starts
API_KEY="your-key-here" npx -y @testsprite/testsprite-mcp@latest --version

# Check which key is active
grep '"API_KEY"' ~/.claude.json | grep -o 'sk-user-[^"]*'
```

## Troubleshooting

| Issue | Fix |
|---|---|
| "Invalid API key" | Update `~/.claude.json`, not the template file |
| MCP server won't start | Check `npx` is in PATH: `which npx` |
| Env var not recognized | Must be `API_KEY`, not `TESTSPRITE_API_KEY` |
| Changes not picked up | Restart Claude Code completely |

## Getting a New TestSprite API Key

1. Go to https://www.testsprite.com/dashboard/settings/apikey
2. Generate a new key
3. Update `~/.claude.json` with the new key
4. Restart Claude Code
