import { tokenize } from './lexer';
import type { EntryNode, RiceDiagnostic, RiceDocument, SectionNode, TopStatement } from './model';

export function parse(text: string): RiceDocument {
    const tokens = tokenize(text);
    const statements: TopStatement[] = [];
    const diagnostics: RiceDiagnostic[] = [];
    const stack: SectionNode[] = [];

    const pushChild = (node: EntryNode | SectionNode) => {
        const parent = stack[stack.length - 1];
        if (parent) {
            parent.children.push(node);
        } else if (node.kind === 'section') {
            statements.push(node);
        } else {
            diagnostics.push({
                line: node.line,
                col: 1,
                message: `"${node.key}" はセクションの外では使えません`,
                severity: 'error',
            });
        }
    };

    for (const token of tokens) {
        switch (token.kind) {
            case 'blank':
            case 'comment':
                break;
            case 'var':
                if (stack.length > 0) {
                    diagnostics.push({ line: token.line, col: 1, message: '$変数はトップレベルでのみ定義できます', severity: 'error' });
                    break;
                }
                statements.push({ kind: 'var', name: token.name, value: token.value, line: token.line });
                break;
            case 'set':
                if (stack.length > 0) {
                    diagnostics.push({ line: token.line, col: 1, message: 'set はトップレベルでのみ使えます', severity: 'error' });
                    break;
                }
                statements.push({ kind: 'set', path: token.path, value: token.value, line: token.line });
                break;
            case 'source':
                if (stack.length > 0) {
                    diagnostics.push({ line: token.line, col: 1, message: 'source はトップレベルでのみ使えます', severity: 'error' });
                    break;
                }
                statements.push({ kind: 'source', ref: token.ref, line: token.line });
                break;
            case 'sectionOpen': {
                const section: SectionNode = {
                    kind: 'section',
                    name: token.name,
                    label: token.label,
                    children: [],
                    startLine: token.line,
                    endLine: token.line,
                };
                stack.push(section);
                break;
            }
            case 'sectionClose': {
                const closed = stack.pop();
                if (!closed) {
                    diagnostics.push({ line: token.line, col: 1, message: '対応する "{" のない "}" です', severity: 'error' });
                    break;
                }
                closed.endLine = token.line;
                pushChild(closed);
                break;
            }
            case 'entry':
                pushChild({
                    kind: 'entry',
                    key: token.key,
                    value: token.value,
                    line: token.line,
                    valueStart: token.valueStart,
                    valueEnd: token.valueEnd,
                });
                break;
            case 'invalid':
                diagnostics.push({ line: token.line, col: 1, message: token.message, severity: 'error' });
                break;
        }
    }

    while (stack.length > 0) {
        const unclosed = stack.pop()!;
        diagnostics.push({
            line: unclosed.startLine,
            col: 1,
            message: `セクション "${unclosed.name}" が閉じられていません`,
            severity: 'error',
        });
    }

    return { statements, diagnostics };
}
