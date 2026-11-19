const { expect } = require('chai')
const { todayMonthDay, dayOfYear } = require('../../../server/utils/yearlyPlan')

describe('yearly reading plan helpers (REJ1)', () => {
  it('formats today as MM-DD with zero padding', () => {
    expect(todayMonthDay(new Date(2026, 0, 5))).to.equal('01-05')
    expect(todayMonthDay(new Date(2026, 10, 18))).to.equal('11-18')
    expect(todayMonthDay(new Date(2026, 11, 31))).to.equal('12-31')
  })

  it('maps Feb 29 to Feb 28 because the plans have 365 days', () => {
    expect(todayMonthDay(new Date(2028, 1, 29))).to.equal('02-28')
    expect(todayMonthDay(new Date(2028, 2, 1))).to.equal('03-01')
  })

  it('computes day of year on a non-leap calendar', () => {
    expect(dayOfYear(1, 1)).to.equal(1)
    expect(dayOfYear(2, 28)).to.equal(59)
    expect(dayOfYear(2, 29)).to.equal(59)
    expect(dayOfYear(3, 1)).to.equal(60)
    expect(dayOfYear(11, 18)).to.equal(322)
    expect(dayOfYear(12, 31)).to.equal(365)
  })
})
