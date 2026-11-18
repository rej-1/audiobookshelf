/**
 * REJ1 patch: optional per-podcast conversion of downloaded episodes.
 * The conversion happens inside the ffmpeg pass that already tags downloads, so there is no extra step.
 * Keep the preset table in sync with client/components/widgets/PodcastEpisodeFilter.vue (size estimates).
 */
const PRESETS = {
  'mp3-64-mono': { id: 'mp3-64-mono', ext: 'mp3', kbps: 64, args: ['-c:a', 'libmp3lame', '-b:a', '64k', '-ac', '1'] },
  'aac-64-mono': { id: 'aac-64-mono', ext: 'm4a', kbps: 64, args: ['-c:a', 'aac', '-b:a', '64k', '-ac', '1'] },
  'opus-48-mono': { id: 'opus-48-mono', ext: 'opus', kbps: 48, args: ['-c:a', 'libopus', '-b:a', '48k', '-ac', '1'] },
  'opus-32-mono': { id: 'opus-32-mono', ext: 'opus', kbps: 32, args: ['-c:a', 'libopus', '-b:a', '32k', '-ac', '1', '-application', 'voip'] }
}

/** Do not re-encode a source that is already at or below this multiple of the target bitrate (it would not get smaller). */
const SKIP_IF_SOURCE_BELOW = 1.15

/**
 * @param {*} id
 * @returns {string|null} a valid preset id, or null (meaning "keep original")
 */
function normalizeEpisodeFormat(id) {
  return typeof id === 'string' && PRESETS[id] ? id : null
}

/**
 * @param {string|null|undefined} id preset id stored on the podcast
 * @param {{enclosure?: {length?: string|number}, durationSeconds?: number|null}} rssPodcastEpisode
 * @returns {{id: string, ext: string, kbps: number, args: string[]}|null} the preset to apply, or null to copy the original audio
 */
function resolveFormatPreset(id, rssPodcastEpisode) {
  const preset = PRESETS[normalizeEpisodeFormat(id)]
  if (!preset) return null
  const bytes = Number(rssPodcastEpisode?.enclosure?.length)
  const seconds = Number(rssPodcastEpisode?.durationSeconds)
  if (bytes > 0 && seconds > 0) {
    const sourceKbps = (bytes * 8) / seconds / 1000
    if (sourceKbps <= preset.kbps * SKIP_IF_SOURCE_BELOW) return null
  }
  return preset
}

module.exports = { PRESETS, normalizeEpisodeFormat, resolveFormatPreset }
