import { init, parse } from 'es-module-lexer';
import { RicePluginError } from './types';

function isBareSpecifier(specifier: string): boolean {
    if (specifier.startsWith('./') || specifier.startsWith('../') || specifier.startsWith('/')) return false;
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(specifier)) return false;
    return true;
}

export async function rewriteImports(code: string, resolve: (specifier: string) => string | undefined): Promise<string> {
    await init;
    const [imports] = parse(code);
    let out = code;
    for (let i = imports.length - 1; i >= 0; i--) {
        const imp = imports[i];
        if (imp.d === -2) continue;
        const specifier = imp.n;
        if (specifier === undefined) {
            if (imp.d > -1) throw new RicePluginError('unsupported-import', '動的な import(式) はプラグインでは使用できません(単一ファイルESMバンドルが必要です)');
            continue;
        }
        const replacement = resolve(specifier);
        if (replacement === undefined) {
            if (isBareSpecifier(specifier)) {
                throw new RicePluginError('unsupported-import', `import "${specifier}" はホストが提供していません`);
            }
            continue;
        }
        const slice = out.slice(imp.s, imp.e);
        const quoted = slice.startsWith('"') || slice.startsWith("'");
        out = out.slice(0, imp.s) + (quoted ? JSON.stringify(replacement) : replacement) + out.slice(imp.e);
    }
    return out;
}
