import { checkThemeRecord, type ThemeValidation } from './format';
import { validateProgram } from './program';

export function validateThemeRecord(value: unknown, { strict = true } = {}): ThemeValidation {
    return checkThemeRecord(value, strict, validateProgram);
}
