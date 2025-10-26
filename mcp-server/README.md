# TOKIMEKI Bluesky MCP Server

TOKIMEKI BlueskyクライアントのためのMCP（Model Context Protocol）サーバーです。Claudeや他のAIアシスタントが、TOKIMEKIの使い方を簡単に教えられるようにします。

## 概要

このMCPサーバーは、TOKIMEKIの以下の情報を提供します：

- **機能説明**: マルチカラム、ブックマーク、プッシュ通知、テーマなど全機能の詳細
- **FAQ**: よくある質問と回答
- **使い始めるガイド**: 初回セットアップから基本的な使い方まで
- **トラブルシューティング**: よくある問題と解決方法

## インストール

### 1. MCPサーバーのビルド

```bash
cd mcp-server
npm install
npm run build
```

### 2. Claude Desktopへの設定

Claude Desktopの設定ファイル（`claude_desktop_config.json`）に以下を追加します：

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "tokimeki": {
      "command": "node",
      "args": [
        "/home/user/tokimekibluesky/mcp-server/build/index.js"
      ]
    }
  }
}
```

> **注意**: `args`の中のパスは、実際のプロジェクトの絶対パスに置き換えてください。

### 3. Claude Desktopの再起動

設定を反映するため、Claude Desktopを再起動してください。

## 使い方

### Claudeでの使用

Claude DesktopでMCPサーバーが有効になっていると、TOKIMEKIに関する質問に対して、MCPサーバーの情報を使って答えてくれます。

**例：**
- "TOKIMEKIのマルチカラム機能について教えて"
- "TOKIMEKIでブックマークを使うにはどうすればいい？"
- "プッシュ通知が来ないんだけど、どうしたらいい？"
- "TOKIMEKIの使い方を教えて"

### 利用可能なツール

MCPサーバーは以下のツールを提供します：

#### 1. `get_feature_info`
特定の機能について詳しい情報を取得

```typescript
{
  feature: "multi-column" | "bookmarks" | "push-notifications" | "themes" | "chat" | "lists" | "keyword-mute" | "moderation" | "search" | "post-composer" | "realtime" | "settings"
}
```

#### 2. `search_documentation`
ドキュメントをキーワードで検索

```typescript
{
  query: string  // 例: "ログイン", "カラム追加", "通知設定"
}
```

#### 3. `get_troubleshooting`
問題に対するトラブルシューティング情報を取得

```typescript
{
  issue: "login-failed" | "notifications-not-working" | "columns-not-loading" | "images-not-uploading" | "bookmarks-not-syncing" | "realtime-not-working" | "theme-not-applying" | "slow-performance" | "chat-not-working" | "general-error"
}
```

#### 4. `list_all_features`
全機能のリストをカテゴリ別に取得

```typescript
{
  category?: "core" | "features" | "customization" | "settings" | "technical" | "all"
}
```

#### 5. `get_faq`
よくある質問を取得

```typescript
{
  question_number?: number  // 省略すると全FAQ
}
```

### 利用可能なリソース

MCPサーバーは以下のリソースを提供します：

- `tokimeki://docs/features` - 全機能のリスト
- `tokimeki://docs/getting-started` - 使い始めるガイド
- `tokimeki://docs/faq` - よくある質問
- `tokimeki://docs/troubleshooting` - トラブルシューティングガイド

### 利用可能なプロンプト

MCPサーバーは以下のプロンプトテンプレートを提供します：

#### 1. `explain_feature`
特定の機能について詳しく説明

```typescript
{
  feature: string  // 機能名
}
```

#### 2. `help_setup`
セットアップを手伝う

```typescript
{
  step?: string  // セットアップのステップ（任意）
}
```

#### 3. `troubleshoot`
問題を診断し、解決策を提案

```typescript
{
  problem: string  // 発生している問題の説明
}
```

#### 4. `compare_features`
複数の機能を比較

```typescript
{
  features: string  // 比較したい機能（カンマ区切り）
}
```

## 機能一覧

TOKIMEKIの主な機能：

### コア機能
- **Multi-Column Deck**: Tweetdeckのような複数タイムライン表示
- **Multi-Account Support**: 複数のBlueskyアカウントを同時使用

### 主要機能
- **Bookmarks**: ローカル、クラウド、公式の3種類
- **Push Notifications**: Web Push通知
- **Media Timeline**: 画像・動画専用タイムライン
- **Keyword Mute**: キーワードフィルタリング
- **Chat**: Blueskyチャット機能
- **Lists**: ユーザーリストと公式キュレーションリスト
- **Moderation**: コンテンツラベル、ラベラー、言語フィルター
- **Search**: 投稿、ユーザー、フィード検索

### カスタマイズ
- **Themes**: 豊富なテーマとカスタマイズ機能

### その他
- **Post Composer**: リッチテキストエディタ
- **Realtime Updates**: WebSocketによるリアルタイム更新
- **Settings**: 詳細な設定オプション

## 開発

### ビルド

```bash
npm run build
```

### ウォッチモード

```bash
npm run watch
```

### ドキュメントの更新

ドキュメントを更新する場合は、`src/documentation.ts`を編集してください。

## ライセンス

MIT License - [LICENSE](../LICENSE)ファイルを参照

## 関連リンク

- [TOKIMEKI GitHub](https://github.com/spuithori/tokimekibluesky)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Claude Desktop](https://claude.ai/download)

## サポート

問題が発生した場合は、[GitHubのIssue](https://github.com/spuithori/tokimekibluesky/issues)で報告してください。
