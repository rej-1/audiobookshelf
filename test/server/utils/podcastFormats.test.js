const { expect } = require('chai')
const { PRESETS, normalizeEpisodeFormat, resolveFormatPreset } = require('../../../server/utils/podcastFormats')

describe('podcast episode formats (REJ1)', () => {
  const ep = (kbps, seconds = 3600) => ({ enclosure: { length: String(Math.round((kbps * 1000 * seconds) / 8)) }, durationSeconds: seconds })

  it('normalizes ids: only known presets are accepted', () => {
    expect(normalizeEpisodeFormat('mp3-64-mono')).to.equal('mp3-64-mono')
    expect(normalizeEpisodeFormat('opus-32-mono')).to.equal('opus-32-mono')
    expect(normalizeEpisodeFormat('original')).to.equal(null)
    expect(normalizeEpisodeFormat('')).to.equal(null)
    expect(normalizeEpisodeFormat('flac-max')).to.equal(null)
    expect(normalizeEpisodeFormat(null)).to.equal(null)
  })

  it('every preset has an extension, a bitrate and ffmpeg codec args', () => {
    for (const p of Object.values(PRESETS)) {
      expect(p.ext).to.be.a('string')
      expect(p.kbps).to.be.greaterThan(0)
      expect(p.args).to.include('-c:a')
    }
  })

  it('keeps the original when no preset is chosen', () => {
    expect(resolveFormatPreset(null, ep(192))).to.equal(null)
    expect(resolveFormatPreset('', ep(192))).to.equal(null)
    expect(resolveFormatPreset('bogus', ep(192))).to.equal(null)
  })

  it('converts a source clearly above the target bitrate', () => {
    expect(resolveFormatPreset('mp3-64-mono', ep(192)).ext).to.equal('mp3')
    expect(resolveFormatPreset('opus-48-mono', ep(128)).ext).to.equal('opus')
  })

  it('skips conversion when the source is already at or near the target (it would not get smaller)', () => {
    expect(resolveFormatPreset('mp3-64-mono', ep(64))).to.equal(null)
    expect(resolveFormatPreset('mp3-64-mono', ep(70))).to.equal(null)
    expect(resolveFormatPreset('opus-48-mono', ep(40))).to.equal(null)
  })

  it('converts when the feed has no size or duration to judge by', () => {
    expect(resolveFormatPreset('mp3-64-mono', { enclosure: {} }).id).to.equal('mp3-64-mono')
    expect(resolveFormatPreset('mp3-64-mono', {}).id).to.equal('mp3-64-mono')
  })
})
