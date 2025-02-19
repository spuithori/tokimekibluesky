import {ja, enUS, pt, ko, bg, zhCN, fr} from 'date-fns/locale';
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
        case 'bg':
            setDefaultOptions({ locale: bg });
            break;
        case 'zh':
        case 'zh-CN':
            setDefaultOptions({ locale: zhCN });
            break;
        case 'fr':
            setDefaultOptions({ locale: fr });
            break;
        default:
            setDefaultOptions({ locale: enUS });
    }
}
