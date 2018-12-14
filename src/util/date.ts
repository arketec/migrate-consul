class DateFormater {
    /**
     * Returns current date and time in a YYYYMMDDhhmmss:nnn format
     * @param dateString 
     */
    public now(dateString = Date.now()) {
        const date = new Date(dateString);
        return new Date(
          date.getUTCFullYear(),
          date.getUTCMonth(),
          date.getUTCDate(),
          date.getUTCHours(),
          date.getUTCMinutes(),
          date.getUTCSeconds(),
          date.getUTCMilliseconds()
        );
      };

    /**
     * Returns the current date and time as a formatted file string
     */
    public nowAsString(): string {
        let date = this.now()
        return date.getUTCFullYear()
        + ("0" + (date.getUTCMonth() + 1)).slice(-2)
        + ("0" + date.getUTCDate()).slice(-2)
        + ("0" + date.getUTCHours() + 1).slice(-2)
        + ("0" + date.getUTCMinutes()).slice(-2)
        + ("0" + date.getUTCMilliseconds()).slice(-2);
    }
}

const formatter = new DateFormater()
const now = formatter.now
const nowAsString = formatter.nowAsString
export {
    now,
    nowAsString
}