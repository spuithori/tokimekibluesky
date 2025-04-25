import { differenceInDays, differenceInHours, differenceInMinutes, differenceInMonths, differenceInSeconds, differenceInWeeks, differenceInYears } from "date-fns";
import { secondsInDay, secondsInHour, secondsInMinute, secondsInWeek } from "date-fns/constants";

type formatOptions = {
    laterDate: Date,
    earlierDate: Date,
}

class IntlRelativeTimeFormatState {
    locale = $state<string>('en-US');
    instance = new Intl.RelativeTimeFormat(this.locale, { numeric: 'always', style: 'narrow' });

    format({laterDate, earlierDate = new Date()}: formatOptions) {
        let value: number = 0;
        let unit: Intl.RelativeTimeFormatUnit;

        const diffInSeconds = differenceInSeconds(laterDate, earlierDate);

        if (Math.abs(diffInSeconds) < secondsInMinute) {
            value = differenceInSeconds(laterDate, earlierDate);
            unit = 'second';
        } else if (Math.abs(diffInSeconds) < secondsInHour) {
            value = differenceInMinutes(laterDate, earlierDate);
            unit = 'minute';
        } else if (Math.abs(diffInSeconds) < secondsInDay) {
            value = differenceInHours(laterDate, earlierDate);
            unit = 'hour';
        } else if (Math.abs(diffInSeconds) < secondsInWeek) {
            value = differenceInDays(laterDate, earlierDate)
            unit = 'day';
        } else if (Math.abs(diffInSeconds) < secondsInDay * 30) {
            value = differenceInWeeks(laterDate, earlierDate);
            unit = 'week';
        } else if (Math.abs(diffInSeconds) < secondsInDay * 365) {
            value = differenceInMonths(laterDate, earlierDate);
            unit = 'month';
        } else {
            value = differenceInYears(laterDate, earlierDate);
            unit = 'year';
        }

        const formattedString = this.instance.format(value, unit);
        return formattedString.replace(/(in | ago|-)/g, '').trim();
    }

    changeLocale(locale: string) {
        this.locale = locale;
        this.instance = new Intl.RelativeTimeFormat(this.locale, { numeric: 'always', style: 'narrow' });
    }
}

export const intlRelativeTimeFormatState = new IntlRelativeTimeFormatState();
