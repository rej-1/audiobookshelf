/**
 * REJ1 patch: helpers for "yearly reading plan" podcasts (one episode per calendar date, e.g. Bible in a year).
 * Episodes are matched to today's date by month and day of their publish date (UTC, the feeds publish early
 * morning UTC so UTC is the same calendar day everywhere that matters). Feb 29 shows Feb 28's episode because
 * the plans have 365 days.
 * Keep the client copy in sync: client/components/tables/podcast/LazyEpisodesTable.vue (yearlyPlanDayOfYear).
 */

/**
 * @param {Date} [date] defaults to now (server local date)
 * @returns {string} 'MM-DD' for the local calendar date of `date`, with Feb 29 mapped to Feb 28
 */
function todayMonthDay(date = new Date()) {
  let month = date.getMonth() + 1
  let day = date.getDate()
  if (month === 2 && day === 29) day = 28
  return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const DAYS_BEFORE_MONTH = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]

/**
 * Day of year (1-365) in a non-leap year for a month (1-12) and day. Feb 29 counts as Feb 28.
 * @param {number} month
 * @param {number} day
 * @returns {number}
 */
function dayOfYear(month, day) {
  if (month === 2 && day === 29) day = 28
  return DAYS_BEFORE_MONTH[month - 1] + day
}

module.exports = { todayMonthDay, dayOfYear }
