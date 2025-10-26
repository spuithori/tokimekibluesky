![Logo](/static/ogp.jpg)

# What is TOKIMEKI?

TOKIMEKI is a third-party client of [Bluesky](https://github.com/bluesky-social/atproto). It supports multi-column and multi-account.

- Deck-like multi-column/account/profile support🚀

- Support for lists (also official curate lists) and bookmarks🔖

- Push notifications 🔔

- Insta-like media timeline 📷

- keyword mute 🔇

- Colorful and varied themes 🌈

## How to build

### Setup .env file

First, rename the .env.example file to .env.

### Developing
```
npm install

npm run dev
```

With no environment variable values entered, some features, such as push notifications, cannot be enabled.
Documentation to enable this is under construction.

## MCP Server

TOKIMEKI includes an MCP (Model Context Protocol) server that allows AI assistants like Claude to easily explain features and guide users.

### Setup

```bash
cd mcp-server
npm install
npm run build
```

See [mcp-server/README.md](mcp-server/README.md) for detailed installation and usage instructions.

### Features

The MCP server provides:
- Comprehensive feature documentation
- FAQ and troubleshooting guides
- Interactive help for setting up and using TOKIMEKI
- Searchable documentation

## License

[MIT](LICENSE)

## Acknowledgment

This project is tested with Browserstack.
