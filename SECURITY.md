# Security Policy

## Supported Versions

UniShader Studio is an open-source, client-side offline shader analysis and transpilation tool.

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Safe & Deterministic Execution

- **Zero AI / External API Dependencies**: UniShader Studio operates 100% locally via deterministic Abstract Syntax Tree (AST) parsing and WebGL sandboxed compilation. No shader code, telemetry, or user inputs are sent to remote servers or AI model endpoints.
- **No Secrets or Credentials**: The application does not require or store any sensitive tokens, secrets, or API keys.
- **Client-Side Processing**: All transpilation, zip packaging, and performance static analysis happen entirely in-memory inside the client browser.

## Reporting a Vulnerability

If you discover a potential security issue in the AST parser, WebGL shader execution context, or repository configuration, please report it by opening a security advisory or contacting the maintainers directly on GitHub.
