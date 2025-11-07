# Mercury MCP Server

MCP Server for Mercury Banking API. Supports both stdio (for Docker) and HTTP transports.

## Usage

### Claude Desktop and Cursor

```json
{
  "mcpServers": {
    "mercury": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "MERCURY_API_KEY",
        "ghcr.io/fyko/mercury-mcp-server"
      ],
      "env": {
        "MERCURY_API_KEY": "replace_me"
      }
    }
  }
}
```

### Server Mode

Run the server normally (without `-i` flag or with a tty):

```bash
docker run -e MERCURY_API_KEY=your-key -e MCP_API_KEY=your-auth-key -p 9236:9236 ghcr.io/fyko/mercury-mcp-server
```

or locally:

```ini
# create .env, bun autoloads it
MERCURY_API_KEY=your-key
MCP_API_KEY=your-auth-key
PORT=9236
```

```bash
bun start
```

The server auto-detects which mode to use based on whether stdin is a tty.

## Tools

- `list-accounts` - list all mercury accounts
- `get-account-transactions` - get transactions for an account

## Building

```bash
docker build -t mercury-mcp-server .
```

## Development

```bash
bun install
bun run dev # hot reloading
```
