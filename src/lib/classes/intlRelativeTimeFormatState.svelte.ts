type formatOptions = {
    laterDate: Date,
    earlierDate: Date,
}

const SECONDS_IN_MINUTE = 60;
const SECONDS_IN_HOUR = 3600;
const SECONDS_IN_DAY = 86400;
const SECONDS_IN_WEEK = 604800;
const SECONDS_IN_MONTH = SECONDS_IN_DAY * 30;
const SECONDS_IN_YEAR = SECONDS_IN_DAY * 365;

class IntlRelativeTimeFormatState {
    locale = $state<string>(navigator.language);
    instance = new Intl.RelativeTimeFormat(this.locale, { numeric: 'always', style: 'narrow' });

    format({ laterDate, earlierDate = new Date() }: formatOptions) {
        const diffInSeconds = (laterDate.getTime() - earlierDate.getTime()) / 1000;
        const absDiffInSeconds = Math.abs(diffInSeconds);

        let value: number;
        let unit: Intl.RelativeTimeFormatUnit;

        if (absDiffInSeconds < SECONDS_IN_MINUTE) {
            value = Math.round(diffInSeconds);
            unit = 'second';
        } else if (absDiffInSeconds < SECONDS_IN_HOUR) {
            value = Math.round(diffInSeconds / SECONDS_IN_MINUTE);
            unit = 'minute';
        } else if (absDiffInSeconds < SECONDS_IN_DAY) {
            value = Math.round(diffInSeconds / SECONDS_IN_HOUR);
            unit = 'hour';
        } else if (absDiffInSeconds < SECONDS_IN_WEEK) {
            value = Math.round(diffInSeconds / SECONDS_IN_DAY);
            unit = 'day';
        } else if (absDiffInSeconds < SECONDS_IN_MONTH) {
            value = Math.round(diffInSeconds / SECONDS_IN_WEEK);
            unit = 'week';
        } else if (absDiffInSeconds < SECONDS_IN_YEAR) {
            value = Math.round(diffInSeconds / SECONDS_IN_MONTH);
            unit = 'month';
        } else {
            value = Math.round(diffInSeconds / SECONDS_IN_YEAR);
            unit = 'year';
        }

        if (diffInSeconds >= 0) {
            value = -0;
            unit = 'second';
        }

        const formattedString = this.instance.format(value, unit);
        return formattedString.replace(/^in /, '').replace(/ ago$/, '').replace(/^-/, '').trim();
    }

    changeLocale(locale: string) {
        this.locale = locale;
        this.instance = new Intl.RelativeTimeFormat(this.locale, { numeric: 'always', style: 'narrow' });
    }
}

export const intlRelativeTimeFormatState = new IntlRelativeTimeFormatState();
