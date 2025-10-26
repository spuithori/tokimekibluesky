#!/usr/bin/env node

/**
 * TOKIMEKI Bluesky Client - MCP Server
 *
 * This MCP server provides documentation and help for the TOKIMEKI Bluesky client.
 * It enables AI assistants like Claude to easily explain features and guide users.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { FEATURES, FAQ, GETTING_STARTED, TROUBLESHOOTING, CATEGORIES } from './documentation.js';

/**
 * Create MCP server instance
 */
const server = new Server(
  {
    name: 'tokimeki-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_feature_info',
        description: 'TOKIMEKIの特定の機能について詳しい情報を取得します。マルチカラム、ブックマーク、通知、テーマなどの機能説明が利用できます。',
        inputSchema: {
          type: 'object',
          properties: {
            feature: {
              type: 'string',
              description: '機能名（例: multi-column, bookmarks, push-notifications, themes, chat, lists, keyword-mute, moderation, search, post-composer, realtime, settings）',
              enum: Object.keys(FEATURES),
            },
          },
          required: ['feature'],
        },
      },
      {
        name: 'search_documentation',
        description: 'TOKIMEKIのドキュメントをキーワードで検索します。機能、FAQ、トラブルシューティング情報を検索できます。',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: '検索キーワード（例: ログイン, カラム追加, 通知設定）',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_troubleshooting',
        description: 'TOKIMEKIの問題に対するトラブルシューティング情報を取得します。',
        inputSchema: {
          type: 'object',
          properties: {
            issue: {
              type: 'string',
              description: '問題の種類（例: login-failed, notifications-not-working, columns-not-loading）',
              enum: Object.keys(TROUBLESHOOTING),
            },
          },
          required: ['issue'],
        },
      },
      {
        name: 'list_all_features',
        description: 'TOKIMEKIの全機能のリストをカテゴリ別に取得します。',
        inputSchema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              description: 'カテゴリ（任意）。指定しない場合は全カテゴリ',
              enum: ['core', 'features', 'customization', 'settings', 'technical', 'all'],
            },
          },
        },
      },
      {
        name: 'get_faq',
        description: 'TOKIMEKIのよくある質問（FAQ）を取得します。',
        inputSchema: {
          type: 'object',
          properties: {
            question_number: {
              type: 'number',
              description: '質問番号（任意）。指定しない場合は全FAQ',
            },
          },
        },
      },
    ],
  };
});

/**
 * Handle tool calls
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_feature_info': {
        const feature = args?.feature as string;
        const featureInfo = FEATURES[feature as keyof typeof FEATURES];

        if (!featureInfo) {
          return {
            content: [
              {
                type: 'text',
                text: `機能 "${feature}" が見つかりません。利用可能な機能: ${Object.keys(FEATURES).join(', ')}`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `# ${featureInfo.name}\n\n${featureInfo.description}\n\n${featureInfo.details}\n\n**カテゴリ**: ${CATEGORIES[featureInfo.category as keyof typeof CATEGORIES]}`,
            },
          ],
        };
      }

      case 'search_documentation': {
        const query = (args?.query as string).toLowerCase();
        const results: string[] = [];

        // Search in features
        for (const [key, feature] of Object.entries(FEATURES)) {
          if (
            feature.name.toLowerCase().includes(query) ||
            feature.description.toLowerCase().includes(query) ||
            feature.details.toLowerCase().includes(query)
          ) {
            results.push(`**${feature.name}** (${key}): ${feature.description}`);
          }
        }

        // Search in FAQ
        for (const [index, faq] of FAQ.entries()) {
          if (
            faq.question.toLowerCase().includes(query) ||
            faq.answer.toLowerCase().includes(query)
          ) {
            results.push(`**FAQ #${index + 1}**: ${faq.question}`);
          }
        }

        // Search in troubleshooting
        for (const [key, issue] of Object.entries(TROUBLESHOOTING)) {
          if (issue.problem.toLowerCase().includes(query)) {
            results.push(`**トラブルシューティング** (${key}): ${issue.problem}`);
          }
        }

        if (results.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `"${query}" に関する情報が見つかりませんでした。別のキーワードで検索してください。`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `# 検索結果: "${query}"\n\n${results.join('\n\n')}`,
            },
          ],
        };
      }

      case 'get_troubleshooting': {
        const issue = args?.issue as string;
        const troubleshoot = TROUBLESHOOTING[issue as keyof typeof TROUBLESHOOTING];

        if (!troubleshoot) {
          return {
            content: [
              {
                type: 'text',
                text: `問題 "${issue}" が見つかりません。利用可能な問題: ${Object.keys(TROUBLESHOOTING).join(', ')}`,
              },
            ],
          };
        }

        const solutions = troubleshoot.solutions.map((s, i) => `${i + 1}. ${s}`).join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `# トラブルシューティング: ${troubleshoot.problem}\n\n## 解決方法\n\n${solutions}`,
            },
          ],
        };
      }

      case 'list_all_features': {
        const category = (args?.category as string) || 'all';
        const featuresByCategory: { [key: string]: string[] } = {};

        for (const [key, feature] of Object.entries(FEATURES)) {
          if (category === 'all' || feature.category === category) {
            if (!featuresByCategory[feature.category]) {
              featuresByCategory[feature.category] = [];
            }
            featuresByCategory[feature.category].push(
              `- **${feature.name}** (${key}): ${feature.description}`
            );
          }
        }

        let output = '# TOKIMEKIの機能一覧\n\n';
        for (const [cat, features] of Object.entries(featuresByCategory)) {
          output += `## ${CATEGORIES[cat as keyof typeof CATEGORIES]}\n\n${features.join('\n')}\n\n`;
        }

        return {
          content: [
            {
              type: 'text',
              text: output,
            },
          ],
        };
      }

      case 'get_faq': {
        const questionNumber = args?.question_number as number | undefined;

        if (questionNumber !== undefined) {
          const faq = FAQ[questionNumber - 1];
          if (!faq) {
            return {
              content: [
                {
                  type: 'text',
                  text: `FAQ #${questionNumber} が見つかりません。利用可能なFAQ: 1-${FAQ.length}`,
                },
              ],
            };
          }

          return {
            content: [
              {
                type: 'text',
                text: `# FAQ #${questionNumber}\n\n## ${faq.question}\n\n${faq.answer}`,
              },
            ],
          };
        }

        const allFaq = FAQ.map((faq, i) => `### ${i + 1}. ${faq.question}\n\n${faq.answer}`).join(
          '\n\n'
        );

        return {
          content: [
            {
              type: 'text',
              text: `# よくある質問（FAQ）\n\n${allFaq}`,
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: `不明なツール: ${name}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

/**
 * List available resources
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'tokimeki://docs/features',
        name: 'TOKIMEKI Features',
        description: 'TOKIMEKIの全機能のリスト',
        mimeType: 'text/plain',
      },
      {
        uri: 'tokimeki://docs/getting-started',
        name: 'Getting Started Guide',
        description: 'TOKIMEKIの使い始めるガイド',
        mimeType: 'text/plain',
      },
      {
        uri: 'tokimeki://docs/faq',
        name: 'Frequently Asked Questions',
        description: 'よくある質問と回答',
        mimeType: 'text/plain',
      },
      {
        uri: 'tokimeki://docs/troubleshooting',
        name: 'Troubleshooting Guide',
        description: 'トラブルシューティングガイド',
        mimeType: 'text/plain',
      },
    ],
  };
});

/**
 * Read resource content
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  try {
    switch (uri) {
      case 'tokimeki://docs/features': {
        const featuresList = Object.entries(FEATURES)
          .map(([key, feature]) => `## ${feature.name} (${key})\n\n${feature.description}`)
          .join('\n\n');

        return {
          contents: [
            {
              uri,
              mimeType: 'text/plain',
              text: `# TOKIMEKIの機能\n\n${featuresList}`,
            },
          ],
        };
      }

      case 'tokimeki://docs/getting-started':
        return {
          contents: [
            {
              uri,
              mimeType: 'text/plain',
              text: GETTING_STARTED,
            },
          ],
        };

      case 'tokimeki://docs/faq': {
        const faqList = FAQ.map(
          (faq, i) => `### ${i + 1}. ${faq.question}\n\n${faq.answer}`
        ).join('\n\n');

        return {
          contents: [
            {
              uri,
              mimeType: 'text/plain',
              text: `# よくある質問（FAQ）\n\n${faqList}`,
            },
          ],
        };
      }

      case 'tokimeki://docs/troubleshooting': {
        const troubleshootList = Object.entries(TROUBLESHOOTING)
          .map(([key, issue]) => {
            const solutions = issue.solutions.map((s, i) => `${i + 1}. ${s}`).join('\n');
            return `## ${issue.problem} (${key})\n\n${solutions}`;
          })
          .join('\n\n');

        return {
          contents: [
            {
              uri,
              mimeType: 'text/plain',
              text: `# トラブルシューティング\n\n${troubleshootList}`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown resource URI: ${uri}`);
    }
  } catch (error) {
    throw new Error(
      `Failed to read resource: ${error instanceof Error ? error.message : String(error)}`
    );
  }
});

/**
 * List available prompts
 */
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: 'explain_feature',
        description: 'TOKIMEKIの特定の機能について詳しく説明します',
        arguments: [
          {
            name: 'feature',
            description: '説明してほしい機能名',
            required: true,
          },
        ],
      },
      {
        name: 'help_setup',
        description: 'TOKIMEKIのセットアップを手伝います',
        arguments: [
          {
            name: 'step',
            description: 'セットアップのステップ（任意）',
            required: false,
          },
        ],
      },
      {
        name: 'troubleshoot',
        description: 'TOKIMEKIの問題を診断し、解決策を提案します',
        arguments: [
          {
            name: 'problem',
            description: '発生している問題の説明',
            required: true,
          },
        ],
      },
      {
        name: 'compare_features',
        description: '複数の機能を比較します（例: ブックマークの種類）',
        arguments: [
          {
            name: 'features',
            description: '比較したい機能（カンマ区切り）',
            required: true,
          },
        ],
      },
    ],
  };
});

/**
 * Get prompt content
 */
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'explain_feature': {
        const feature = args?.feature as string;

        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `TOKIMEKI Blueskyクライアントの「${feature}」機能について、初心者にもわかりやすく詳しく説明してください。使い方、メリット、注意点などを含めてください。`,
              },
            },
          ],
        };
      }

      case 'help_setup': {
        const step = args?.step as string | undefined;
        const text = step
          ? `TOKIMEKIの「${step}」のセットアップを手伝ってください。具体的な手順を順番に説明してください。`
          : 'TOKIMEKIを初めて使う人向けに、最初のセットアップ手順を順番に説明してください。ログイン、基本設定、カラムの追加など、必要なステップを含めてください。';

        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text,
              },
            },
          ],
        };
      }

      case 'troubleshoot': {
        const problem = args?.problem as string;

        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `TOKIMEKIで次の問題が発生しています: ${problem}\n\n考えられる原因と解決方法を、簡単なものから順番に教えてください。`,
              },
            },
          ],
        };
      }

      case 'compare_features': {
        const features = args?.features as string;

        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `TOKIMEKIの次の機能を比較してください: ${features}\n\nそれぞれの特徴、違い、どんな場合にどれを使うべきかを説明してください。`,
              },
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown prompt: ${name}`);
    }
  } catch (error) {
    throw new Error(
      `Failed to get prompt: ${error instanceof Error ? error.message : String(error)}`
    );
  }
});

/**
 * Start the server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('TOKIMEKI MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
