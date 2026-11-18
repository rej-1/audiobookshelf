const { expect } = require('chai')
const { normalizeEpisodeTitlePattern, filterEpisodesByTitlePatterns } = require('../../../server/utils/podcastUtils')

describe('podcast episode title filters (REJ1)', () => {
  const eps = [{ title: '567: Faith, Failure' }, { title: 'Jocko Podcast 16: Machete Season' }, { title: 'Jocko Underground: Mindset' }, { title: 'The Debrief w/ Jocko #32' }, { title: '004 Jocko Manual: War' }]
  const include = '^\\s*(?:jocko podcast\\s*)?#?\\d{1,3}\\s*[:.\\-–—]'

  it('normalizes patterns: trims, rejects empty, invalid and overlong input', () => {
    expect(normalizeEpisodeTitlePattern('  abc ')).to.equal('abc')
    expect(normalizeEpisodeTitlePattern('')).to.equal(null)
    expect(normalizeEpisodeTitlePattern('   ')).to.equal(null)
    expect(normalizeEpisodeTitlePattern('(unclosed')).to.equal(null)
    expect(normalizeEpisodeTitlePattern('a'.repeat(301))).to.equal(null)
    expect(normalizeEpisodeTitlePattern(null)).to.equal(null)
    expect(normalizeEpisodeTitlePattern(5)).to.equal(null)
  })

  it('returns all episodes when no filter is set', () => {
    expect(filterEpisodesByTitlePatterns({}, eps)).to.have.length(5)
    expect(filterEpisodesByTitlePatterns({ episodeIncludePattern: '', episodeExcludePattern: null }, eps)).to.have.length(5)
  })

  it('include keeps only matching titles, case-insensitively', () => {
    const out = filterEpisodesByTitlePatterns({ episodeIncludePattern: include }, eps).map((e) => e.title)
    expect(out).to.deep.equal(['567: Faith, Failure', 'Jocko Podcast 16: Machete Season'])
    expect(filterEpisodesByTitlePatterns({ episodeIncludePattern: 'UNDERGROUND' }, eps)).to.have.length(1)
  })

  it('exclude drops matching titles; include and exclude combine', () => {
    expect(filterEpisodesByTitlePatterns({ episodeExcludePattern: 'underground|debrief|manual' }, eps)).to.have.length(2)
    const out = filterEpisodesByTitlePatterns({ episodeIncludePattern: include, episodeExcludePattern: 'machete' }, eps)
    expect(out.map((e) => e.title)).to.deep.equal(['567: Faith, Failure'])
  })

  it('ignores an invalid stored pattern instead of dropping everything', () => {
    expect(filterEpisodesByTitlePatterns({ episodeIncludePattern: '(bad' }, eps)).to.have.length(5)
  })
})
