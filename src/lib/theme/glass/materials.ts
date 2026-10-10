import { LIQUID, type GlassMaterial } from './shader';

const MATERIALS: Record<string, () => Promise<GlassMaterial>> = {
    liquid: async () => LIQUID,
    iridescence: () => import('./iridescence').then((m) => m.IRIDESCENCE),
};

export function readMaterialName(style: CSSStyleDeclaration): string {
    const name = style.getPropertyValue('--glass-material').trim();
    return Object.hasOwn(MATERIALS, name) ? name : 'liquid';
}

export function loadMaterial(name: string): Promise<GlassMaterial> {
    return (MATERIALS[name] ?? MATERIALS.liquid)();
}
