class DayAndMonth {
    public day: number;
    public month: number;
    public isValid: boolean;

    constructor(day: number, month: number, isValid: boolean) {
        this.day = day;
        this.month = month;
        this.isValid = isValid;
    }
}

export class DateTime {
    private static cultures = [{
        culture: 'ru-RU',
        months: ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'],
        monthsShort: ['янв', 'фев', 'мар', 'апр', 'иай', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
        weekDays: ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'],
        weekDaysShort: ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']
    }, {
        culture: 'uk-UA',
        months: ['січень', 'лютий', 'березень', 'квітень', 'травень', 'червень', 'липень', 'серпень', 'вересень', 'жовтень', 'листопад', 'грудень'],
        monthsShort: ['січ', 'лют', 'бер', 'квiт', 'трав', 'черв', 'лип', 'серп', 'вер', 'жовт', 'лист', 'груд'],
        weekDays: ['неділя', 'понеділок', 'вівторок', 'середа', 'четвер', 'п’ятниця', 'субота'],
        weekDaysShort: ['нд', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']
    }, {
        culture: 'en-GB',
        months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
        monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        weekDays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        weekDaysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    }];
    private static daysPerMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    private _date: Date;
    private _offset: number;
    private _isDateTime: boolean;

    private static isInteger(value: any): boolean {
        return value === parseInt(value, 10);
    }

    private static isMatch(date: string, substring: string): boolean {
        return date.match(new RegExp(substring, 'i')) !== null;
    }

    // TODO: Strongly type parameters.
    private static getTotalDate(year: any, month: any, day: any, hours?: any, minutes?: any, seconds?: any, milliseconds?: any, offset?: any): DateTime {
        let finalMonth: number,
            dateTime = DateTime.createEmpty();
        day = day.toString();
        month = month.toString();
        hours = Number(hours) || 0;
        minutes = Number(minutes) || 0;
        seconds = Number(seconds) || 0;
        milliseconds = Number(milliseconds) || 0;
        offset = offset || 0;

        // Convert YY to YYYY.
        if (year <= 99) {
            if (year >= 0 && year < 30) {
                year = '20' + year;
            } else {
                year = '19' + year;
            }
        }

        // Detect leap year and change amount of days in daysPerMonth for February.
        let isLeap = new Date(year, 1, 29).getMonth() === 1;

        if (isLeap) {
            DateTime.daysPerMonth[1] = 29;
        } else {
            DateTime.daysPerMonth[1] = 28;
        }

        // Convert month to number.
        if (month.match(/([^\u0000-\u0080]|[a-zA-Z])$/) !== null) {
            for (let culture of DateTime.cultures) {
                for (let i = 0; i < culture.months.length; i++) {
                    if (DateTime.isMatch(month, 'мая')) {
                        finalMonth = 5;
                        break;
                    } else if (DateTime.isMatch(month, culture.months[i].slice(0, 3))) {
                        finalMonth = i + 1;
                        break;
                    }
                }
            }

            if (!finalMonth) {
                return dateTime;
            }

            month = finalMonth;
        }

        if (month > 12) {
            return dateTime;
        }

        if (day > DateTime.daysPerMonth[month - 1]) {
            return dateTime;
        }

        let date = new Date(Number(year), Number(month - 1), Number(day), hours, minutes, seconds);
        date.setMilliseconds(milliseconds);

        dateTime = new DateTime(date);
        dateTime.offset(offset);

        return dateTime;
    }

    private static getDayAndMonth(day: number, month: number, culture: string): DayAndMonth {
        let dayAndMonth = new DayAndMonth(day, month, true);

        // Handle difference between en-GB and en-US culture formats.
        if (culture === 'en-GB' && month > 12) {
            dayAndMonth.isValid = false;
        }

        if (culture === 'en-US') {
            dayAndMonth.day = month;
            dayAndMonth.month = day;

            if (day > 12) {
                dayAndMonth.isValid = false;
            }
        }

        // Give priority to en-GB if culture is not set.
        if (!culture && month > 12) {
            dayAndMonth.day = month;
            dayAndMonth.month = day;
        }

        return dayAndMonth;
    }

    private static formatNumber(value: number, length: number): string {
        let formattedNumber = '';

        for (let i = 0; i < length; i++) {
            formattedNumber += '0';
        }

        return (formattedNumber + value).slice(-length);
    }

    private static isValidTimeZoneOffset(offset: number): boolean {
        return offset >= -720 && offset <= 840;
    }

    private static formatTimeZone(offset: number): string {
        if (offset === 0) {
            return 'Z';
        }

        if (!DateTime.isInteger(offset)) {
            return null;
        }

        // Time zones vary from -12:00 to 14:00.
        if (offset < -720 || offset > 840) {
            return null;
        }

        let sign = '+';

        if (offset < 0) {
            offset *= -1;
            sign = '-';
        }

        let minutes = offset % 60,
            hours = (offset - minutes) / 60;

        return sign + DateTime.formatNumber(hours, 2) + ':' + DateTime.formatNumber(minutes, 2);
    }

    public static parse(value: DateTime | Date | string, culture?: string): DateTime {
        let pattern: RegExp,
            parts: RegExpExecArray,
            dayAndMonth: DayAndMonth,
            date = DateTime.createEmpty();

        // Check if a date requires parsing.
        if (DateTime.isDate(value)) {
            // TODO: Check this. Should we create a new DateTime from Date object here?
            return <DateTime>value;
        }

        if (DateTime.isDateTime(value)) {
            return <DateTime>value;
        }

        if (typeof value !== 'string') {
            return date;
        }

        // Replace multiple whitespaces with a single one.
        value = value.replace(/\s+/g, ' ');

        // 21
        pattern = /^\d{1,2}$/;

        if (value.match(pattern) !== null) {
            let currentDate = new Date();

            return DateTime.getTotalDate(currentDate.getFullYear(), currentDate.getMonth() + 1, value);
        }

        // 21-02
        pattern = /^(\d{1,2})(\/|-|\.|\s|)(\d{1,2})$/;

        if (value.match(pattern) !== null) {
            parts = pattern.exec(value);
            dayAndMonth = DateTime.getDayAndMonth(Number(parts[1]), Number(parts[3]), culture);

            if (!dayAndMonth.isValid) {
                return date;
            }

            return DateTime.getTotalDate(new Date().getFullYear(), dayAndMonth.month, dayAndMonth.day);
        }

        // 21 Feb 15
        // 21 February 2015
        pattern = /^(\d{1,2})(\/|-|\.|\s|)(([^\u0000-\u0080]|[a-zA-Z]){1,12})(\/|-|\.|\s|)(\d{2,4}\b)/;

        if (value.match(pattern) !== null) {
            parts = pattern.exec(value);

            return DateTime.getTotalDate(parts[6], parts[3], parts[1]);
        }

        // Feb 21, 15
        // Feb 21, 2015
        pattern = /(([^\u0000-\u0080]|[a-zA-Z]){3})(\s|)(\d{1,2})(,)(\s|)(\d{2,4})$/;

        if (value.match(pattern) !== null) {
            parts = pattern.exec(value);

            return DateTime.getTotalDate(parts[7], parts[1], parts[4]);
        }

        // Feb 21 15
        // February 21 2015
        pattern = /^(([^\u0000-\u0080]|[a-zA-Z]){1,12})(\/|-|\.|\s|)(\d{1,2})(\/|-|\.|\s|)(\d{2,4}\b)/;

        if (value.match(pattern) !== null) {
            parts = pattern.exec(value);

            return DateTime.getTotalDate(parts[6], parts[1], parts[4]);
        }

        // 2015-02-21
        pattern = /^(\d{4})(\/|-|\.|\s)(\d{1,2})(\/|-|\.|\s)(\d{1,2})$/;

        if (value.match(pattern) !== null) {
            parts = pattern.exec(value);

            return DateTime.getTotalDate(parts[1], parts[3], parts[5]);
        }

        // 21-02-15
        // 21-02-2015
        pattern = /^(\d{1,2})(\/|-|\.|\s|)(\d{1,2})(\/|-|\.|\s|)(\d{2,4})$/;

        if (value.match(pattern) !== null) {
            parts = pattern.exec(value);
            dayAndMonth = DateTime.getDayAndMonth(Number(parts[1]), Number(parts[3]), culture);

            if (!dayAndMonth.isValid) {
                return date;
            }

            return DateTime.getTotalDate(parts[5], dayAndMonth.month, dayAndMonth.day);
        }

        // 2015-February-21
        pattern = /^(\d{4})(\/|-|\.|\s|)(([^\u0000-\u0080]|[a-zA-Z]){1,12})(\/|-|\.|\s|)(\d{1,2})$/;

        if (value.match(pattern) !== null) {
            parts = pattern.exec(value);

            return DateTime.getTotalDate(parts[1], parts[3], parts[6]);
        }

        // 2015-02-21T10:00:00Z
        // 2015-02-21T10:00:00.652+03:00
        pattern = /^(\d{4})(\/|-|\.|\s)(\d{1,2})(\/|-|\.|\s)(\d{1,2})T(?:(?:([01]?\d|2[0-3]):)?([0-5]?\d):)?([0-5]?\d)(\.(\d{3}))?(?:Z|([+-])(2[0-3]|[01][0-9]):([0-5][0-9]))$/;

        if (value.match(pattern) !== null) {
            parts = pattern.exec(value);
            let offset = 0;

            // Get time zone offset.
            if (parts.length === 14) {
                offset = (Number(parts[12]) || 0) * 60 + (Number(parts[13]) || 0);

                if (parts[11] === '-' && offset !== 0) {
                    offset = -offset;
                }
            }

            return DateTime.getTotalDate(parts[1], parts[3], parts[5], parts[6], parts[7], parts[8], parts[10], offset);
        }

        return date;

    }

    // TODO: How to deal with overloads in TypeScript?
    /*
        Overloads:
        - format(date)
        - format(DateTime)
        - format(date, format)
        - format(DateTime, format)
        - format(date, offset)
        - format(DateTime, offset)
        - format(date, format, offset)
        - format(DateTime, format, offset)
    */
    public static format(date: any, ...parameters: any[]): string {
        if (!DateTime.isDate(date) && !DateTime.isDateTime(date)) {
            return null;
        }

        let format: string,
            offset = 0;

        if (parameters.length === 1) {
            if (typeof parameters[0] === 'string') {
                format = parameters[0];
            } else {
                offset = parameters[0];

                if (!DateTime.isValidTimeZoneOffset(offset)) {
                    return null;
                }
            }
        } else if (parameters.length === 2) {
            format = parameters[0];
            offset = parameters[1];

            if (!DateTime.isValidTimeZoneOffset(offset)) {
                return null;
            }
        }

        format = format || 'yyyy-MM-ddTHH:mm:ssK';

        let languageIndex = 2,
            timeZone = DateTime.formatTimeZone(offset),
            _date = DateTime.isDateTime(date) ? date.toDate() : date,
            // Possible formats of date parts (day, month, year).
            datePartFormats = {
                f: ['fff'],
                s: ['s', 'ss'],
                m: ['m', 'mm'],
                H: ['H', 'HH'],
                d: ['d', 'dd', 'ddd', 'dddd'],
                M: ['M', 'MM', 'MMM', 'MMMM'],
                y: ['yy', 'yyyy'],
                K: ['K']
            },
            day = <number>_date.getDate(),
            dayOfWeek = <number>_date.getDay(),
            month = <number>_date.getMonth(),
            year = <number>_date.getFullYear(),
            hours = <number>_date.getHours(),
            minutes = <number>_date.getMinutes(),
            seconds = <number>_date.getSeconds(),
            milliseconds = <number>_date.getMilliseconds();

        // Checks format string parts on conformity with available date formats.
        let checkDatePart = (dateChar: string): number => {
            let datePart = '';

            // Try-catch construction because some sub-formats may be not listed.
            try {
                datePart = format.match(new RegExp(dateChar + '+', ''))[0];
            } catch (error) { }

            return datePartFormats[dateChar].indexOf(datePart);
        };

        // Formats date parts.
        let formatDatePart = (datePartFormat: string): string => {
            let datePart: any = '';

            switch (datePartFormat) {
                // d
                case datePartFormats.d[0]:
                    datePart = day;
                    break;
                // dd
                case datePartFormats.d[1]:
                    datePart = DateTime.formatNumber(day, 2);
                    break;
                // ddd
                case datePartFormats.d[2]:
                    datePart = DateTime.cultures[languageIndex].weekDaysShort[dayOfWeek];
                    break;
                // dddd
                case datePartFormats.d[3]:
                    datePart = DateTime.cultures[languageIndex].weekDays[dayOfWeek];
                    break;
                // M
                case datePartFormats.M[0]:
                    datePart = month + 1;
                    break;
                // MM
                case datePartFormats.M[1]:
                    datePart = DateTime.formatNumber(month + 1, 2);
                    break;
                // MMM
                case datePartFormats.M[2]:
                    datePart = DateTime.cultures[languageIndex].monthsShort[month];
                    break;
                // MMMM
                case datePartFormats.M[3]:
                    datePart = DateTime.cultures[languageIndex].months[month];
                    break;
                // yy
                case datePartFormats.y[0]:
                    datePart = DateTime.formatNumber(year, 2);
                    break;
                // yyyy
                case datePartFormats.y[1]:
                    datePart = year;
                    break;
                // H
                case datePartFormats.H[0]:
                    datePart = hours;
                    break;
                // HH
                case datePartFormats.H[1]:
                    datePart = DateTime.formatNumber(hours, 2);
                    break;
                // m
                case datePartFormats.m[0]:
                    datePart = minutes;
                    break;
                // mm
                case datePartFormats.m[1]:
                    datePart = DateTime.formatNumber(minutes, 2);
                    break;
                // s
                case datePartFormats.s[0]:
                    datePart = seconds;
                    break;
                // ss
                case datePartFormats.s[1]:
                    datePart = DateTime.formatNumber(seconds, 2);
                    break;
                // fff
                case datePartFormats.f[0]:
                    datePart = DateTime.formatNumber(milliseconds, 3);
                    break;
                // K
                case datePartFormats.K[0]:
                    datePart = timeZone || 'Z';
                    break;
                default:
                    break;
            }

            return datePart;
        };

        // Check format of each part of the obtained format.
        let dateParts = {
            days: formatDatePart(datePartFormats.d[checkDatePart('d')]),
            months: formatDatePart(datePartFormats.M[checkDatePart('M')]),
            years: formatDatePart(datePartFormats.y[checkDatePart('y')]),
            hours: formatDatePart(datePartFormats.H[checkDatePart('H')]),
            minutes: formatDatePart(datePartFormats.m[checkDatePart('m')]),
            seconds: formatDatePart(datePartFormats.s[checkDatePart('s')]),
            milliseconds: formatDatePart(datePartFormats.f[checkDatePart('f')]),
            timeZone: formatDatePart(datePartFormats.K[0]),
            separator: /^\w+([^\w])/.exec(format)
        };

        // Return formatted date string.
        return format
            .replace(/d+/, dateParts.days)
            .replace(/y+/, dateParts.years)
            .replace(/M+/, dateParts.months)
            .replace(/H+/, dateParts.hours)
            .replace(/m+/, dateParts.minutes)
            .replace(/s+/, dateParts.seconds)
            .replace(/f+/, dateParts.milliseconds)
            .replace(/K+/, dateParts.timeZone);
    }

    public static parseTimeZone(timeZone: string): number {
        if (!timeZone) {
            return 0;
        }

        timeZone = timeZone.replace(/GMT/gi, '');

        let parts = /^(?:Z|([+-]?)(2[0-3]|[01][0-9]):([0-5][0-9]))$/.exec(timeZone);

        if (!parts || parts.length !== 4) {
            return 0;
        }

        if (parts[0] === 'Z') {
            return 0;
        }

        // Calculate time zone offset in minutes.
        let offset = Number(parts[2]) * 60 + Number(parts[3]);

        if (offset !== 0 && parts[1] === '-') {
            offset *= -1;
        }

        return offset;
    }

    public static isDate(value: any): boolean {
        if (!value) {
            return false;
        }

        return Object.prototype.toString.call(value) === '[object Date]' && value.getTime && !isNaN(value.getTime());
    }

    public static isDateTime(value: any): boolean {
        return value instanceof DateTime || (!!value && value._isDateTime);
    }

    public static createEmpty(): DateTime {
        return new DateTime(null);
    }

    // TODO: How to deal with overloads in TypeScript?
    /*
        Overloads:
        - new DateTime() +
        - new DateTime(Date) +
        - new DateTime(DateTime) +
        - new DateTime(dateString) +
        - new DateTime(dateString, culture) +
        - new DateTime(year)
        - new DateTime(year, month)
        - new DateTime(year, month, date)
        - new DateTime(year, month, date, hour)
        - new DateTime(year, month, date, hour, minute)
        - new DateTime(year, month, date, hour, minute, second)
    */
    constructor(...parameters: any[]) {
        let date: any;
        this._date = null;
        this._offset = 0;
        this._isDateTime = true;

        if (parameters.length === 0) {
            // Create a current date.
            this._date = new Date();
        } else if (parameters.length === 1) {
            date = parameters[0];

            if (DateTime.isDate(date)) {
                this._date = new Date(date.valueOf());
            } else if (DateTime.isDateTime(date)) {
                // DateTime is provided - copy it.
                if (!date.isEmpty()) {
                    this._date = new Date(date.toDate().valueOf());
                }

                this._offset = date.offset();
            } else if (typeof date === 'string') {
                // Parse date.
                date = DateTime.parse(date);
                this._date = date.toDate();
                this._offset = <number>date.offset();
            } else if (DateTime.isInteger(date)) {
                // Year.
                this._date = new Date(date, 0, 1, 0, 0, 0);
            }
        } else if (parameters.length === 2) {
            // Date string and culture.
            if (typeof parameters[0] === 'string' && typeof parameters[1] === 'string') {
                date = DateTime.parse(parameters[0], parameters[1]);
                this._date = date.toDate();
                this._offset = <number>date.offset();
            } else if (DateTime.isInteger(parameters[0]) && DateTime.isInteger(parameters[1])) {
                // Year and month.
                this._date = new Date(parameters[0], parameters[1], 1, 0, 0, 0);
            }
        } else if (parameters.length === 3 && DateTime.isInteger(parameters[0]) && DateTime.isInteger(parameters[1]) && DateTime.isInteger(parameters[2])) {
            // Year, month and date.
            this._date = new Date(parameters[0], parameters[1], parameters[2], 0, 0, 0);
        } else if (parameters.length === 4 && DateTime.isInteger(parameters[0]) && DateTime.isInteger(parameters[1]) && DateTime.isInteger(parameters[2]) &&
            DateTime.isInteger(parameters[3])) {
            // Year, month and date.
            this._date = new Date(parameters[0], parameters[1], parameters[2], parameters[3], 0, 0);
        } else if (parameters.length === 5 && DateTime.isInteger(parameters[0]) && DateTime.isInteger(parameters[1]) && DateTime.isInteger(parameters[2]) &&
            DateTime.isInteger(parameters[3]) && DateTime.isInteger(parameters[4])) {
            // Year, month and date.
            this._date = new Date(parameters[0], parameters[1], parameters[2], parameters[3], parameters[4], 0);
        } else if (parameters.length === 6 && DateTime.isInteger(parameters[0]) && DateTime.isInteger(parameters[1]) && DateTime.isInteger(parameters[2]) &&
            DateTime.isInteger(parameters[3]) && DateTime.isInteger(parameters[4]) && DateTime.isInteger(parameters[5])) {
            // Year, month and date.
            this._date = new Date(parameters[0], parameters[1], parameters[2], parameters[3], parameters[4], parameters[5]);
        }
    }

    public copy(): DateTime {
        return new DateTime(this);
    }

    public toDate(): Date {
        return this._date;
    }

    public offset(offset?: number): any {
        if (arguments.length === 0) {
            return this._offset;
        }

        this._offset = offset;
        return this;
    }

    public toUtc(): DateTime {
        if (this.isEmpty() || this._offset === 0) {
            return this;
        }

        this.subtract(this._offset, 'minute');
        this._offset = 0;

        return this;
    }

    public isEmpty(): boolean {
        return !this._date;
    }

    public isUtc(): boolean {
        return !this.isEmpty() && this._offset === 0;
    }

    public isEqual(date: DateTime | Date | string): boolean {
        return this.difference(date) === 0;
    }

    public isLess(date: DateTime | Date | string): boolean {
        return this.difference(date) < 0;
    }

    public isLessOrEqual(date: DateTime | Date | string): boolean {
        return this.difference(date) <= 0;
    }

    public isGreater(date: DateTime | Date | string): boolean {
        return this.difference(date) > 0;
    }

    public isGreaterOrEqual(date: DateTime | Date | string): boolean {
        return this.difference(date) >= 0;
    }

    public isBetween(startDate: DateTime | Date | string, endDate: DateTime | Date | string, isInclusive?: boolean): boolean {
        let _startDate = new DateTime(startDate),
            _endDate = new DateTime(endDate);

        if (this.isEmpty() || _startDate.isEmpty() || _endDate.isEmpty()) {
            return false;
        }

        if (isInclusive) {
            return this.isGreaterOrEqual(_startDate) && this.isLessOrEqual(_endDate);
        }

        return this.isGreater(_startDate) && this.isLess(_endDate);
    }

    public difference(date: DateTime | Date | string): number {
        return this.valueOf() - new DateTime(date).valueOf();
    }

    public valueOf(): number {
        if (this.isEmpty()) {
            return 0;
        }

        let time = this._date.valueOf();

        // Add offset which is in minutes, and thus should be converted to milliseconds.
        if (this._offset !== 0) {
            time -= this._offset * 60000;
        }

        return time;
    }

    public format(format?: string): string {
        if (this.isEmpty()) {
            return null;
        }

        return DateTime.format(this._date, format, this._offset);
    }

    public add(value: number, unit: string): DateTime {
        if (this.isEmpty() || !value) {
            return this;
        }

        // Don't change original date.
        let date = new Date(this._date);

        switch (unit) {
            case 'year':
                date.setFullYear(date.getFullYear() + value);
                break;
            case 'quarter':
                date.setMonth(date.getMonth() + 3 * value);
                break;
            case 'month':
                date.setMonth(date.getMonth() + value);
                break;
            case 'week':
                date.setDate(date.getDate() + 7 * value);
                break;
            case 'day':
                date.setDate(date.getDate() + value);
                break;
            case 'hour':
                date.setTime(date.getTime() + value * 3600000);
                break;
            case 'minute':
                date.setTime(date.getTime() + value * 60000);
                break;
            case 'second':
                date.setTime(date.getTime() + value * 1000);
                break;
            case 'millisecond':
                date.setTime(date.getTime() + value);
                break;
            default:
                break;
        }

        this._date = date;

        return this;
    }

    public subtract(value: number, unit: string): DateTime {
        return this.add(value * -1, unit);
    }

    public millisecond(millisecond?: number): any {
        if (this.isEmpty()) {
            return 0;
        }

        if (arguments.length === 0) {
            return this._date.getMilliseconds();
        } else {
            this._date.setMilliseconds(millisecond);
            return this;
        }
    }

    public second(second?: number): any {
        if (this.isEmpty()) {
            return 0;
        }

        if (arguments.length === 0) {
            return this._date.getSeconds();
        } else {
            this._date.setSeconds(second);
            return this;
        }
    }

    public minute(minute?: number): any {
        if (this.isEmpty()) {
            return 0;
        }

        if (arguments.length === 0) {
            return this._date.getMinutes();
        } else {
            this._date.setMinutes(minute);
            return this;
        }
    }

    public hour(hour?: number): any {
        if (this.isEmpty()) {
            return 0;
        }

        if (arguments.length === 0) {
            return this._date.getHours();
        } else {
            this._date.setHours(hour);
            return this;
        }
    }

    public date(date?: number): any {
        if (this.isEmpty()) {
            return 0;
        }

        if (arguments.length === 0) {
            return this._date.getDate();
        } else {
            this._date.setDate(date);
            return this;
        }
    }

    public month(month?: number): any {
        if (this.isEmpty()) {
            return 0;
        }

        if (arguments.length === 0) {
            return this._date.getMonth();
        } else {
            this._date.setMonth(month);
            return this;
        }
    }

    public year(year?: number): any {
        if (this.isEmpty()) {
            return 0;
        }

        if (arguments.length === 0) {
            return this._date.getFullYear();
        } else {
            this._date.setFullYear(year);
            return this;
        }
    }

    public startOf(unit: string): DateTime {
        switch (unit) {
            case 'year':
                this.month(0);
            /* falls through */
            case 'month':
                this.date(1);
            /* falls through */
            case 'day':
                this.hour(0);
            /* falls through */
            case 'hour':
                this.minute(0);
            /* falls through */
            case 'minute':
                this.second(0);
            /* falls through */
            case 'second':
                this.millisecond(0);
                break;
            default:
                break;
        }

        return this;
    }

    public endOf(unit: string): DateTime {
        if (!unit) {
            return this;
        }

        return this.startOf(unit).add(1, unit).subtract(1, 'millisecond');
    }
}