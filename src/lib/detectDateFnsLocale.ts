import {ja, enUS, pt, ko} from 'date-fns/locale';
import {setDefaultOptions} from 'date-fns';

export function detectDateFnsLocale(locale) {
    switch (locale) {
        case 'ja':
            setDefaultOptions({ locale: ja });
            break;
        case 'ko':
            setDefaultOptions({ locale: ko });
            break;
        case 'pt':
        case 'pt-BR':
            setDefaultOptions({ locale: pt });
            break;
        default:
            setDefaultOptions({ locale: enUS });
    }
}
