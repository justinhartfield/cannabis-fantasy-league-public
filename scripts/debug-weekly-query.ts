import { getIsoYearWeek, getWeekDateRange } from "../server/utils/isoWeek";

function debugWeeklyQuery() {
    const now = new Date();
    console.log(`Current Date: ${now.toISOString()}`);

    const { year, week } = getIsoYearWeek(now);
    console.log(`Calculated ISO Week: ${week}, Year: ${year}`);

    const { startDate, endDate } = getWeekDateRange(year, week);
    console.log(`Calculated Range: ${startDate} to ${endDate}`);
}

debugWeeklyQuery();
