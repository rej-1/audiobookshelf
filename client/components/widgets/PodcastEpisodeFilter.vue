<template>
  <div class="w-full">
    <p class="text-base md:text-lg font-semibold mb-1">{{ $strings.LabelEpisodeFilters }}</p>
    <p class="text-xs md:text-sm text-gray-300 mb-2">{{ $strings.LabelEpisodeFilterHelp }}</p>
    <div class="flex flex-wrap -mx-2">
      <div class="w-full md:w-1/2 px-2 py-1">
        <ui-text-input-with-label v-model="includeValue" :label="$strings.LabelEpisodeFilterInclude" placeholder="^\d+:" />
        <p v-if="includeInvalid" class="text-xs text-error mt-1">{{ $strings.LabelEpisodeFilterInvalid }}</p>
      </div>
      <div class="w-full md:w-1/2 px-2 py-1">
        <ui-text-input-with-label v-model="excludeValue" :label="$strings.LabelEpisodeFilterExclude" placeholder="clip|bonus" />
        <p v-if="excludeInvalid" class="text-xs text-error mt-1">{{ $strings.LabelEpisodeFilterInvalid }}</p>
      </div>
    </div>

    <p class="text-base md:text-lg font-semibold mt-4 mb-1">{{ $strings.LabelEpisodeFormat }}</p>
    <p class="text-xs md:text-sm text-gray-300 mb-2">{{ $strings.LabelEpisodeFormatHelp }}</p>
    <div class="flex flex-wrap -mx-2">
      <div class="w-full md:w-1/2 px-2 py-1">
        <ui-dropdown v-model="formatValue" :items="formatItems" :label="$strings.LabelEpisodeFormat" />
      </div>
      <div class="w-full md:w-1/2 px-2 py-1">
        <ui-text-input-with-label v-model="sinceDate" type="date" :label="$strings.LabelEpisodeFormatSince" />
      </div>
    </div>

    <div class="mt-2 text-sm text-gray-200">
      <template v-if="episodes">
        <p v-if="anyInvalid" class="text-error">{{ $strings.LabelEpisodeFilterInvalid }}</p>
        <template v-else>
          <p>{{ $getString('LabelEpisodeFilterMatches', [matching.length, episodes.length]) }}</p>
          <p v-if="matching.length" class="text-xs text-gray-300 truncate">{{ previewText }}</p>
          <p v-if="estimate && estimate.count" class="mt-1">
            <span v-if="estimate.converted !== null">{{ $getString('LabelEpisodeFormatEstimate', [estimate.count, $bytesPretty(estimate.original), $bytesPretty(estimate.converted), estimate.savedPercent]) }}</span>
            <span v-else>{{ $getString('LabelEpisodeFormatSizeOnly', [estimate.count, $bytesPretty(estimate.original)]) }}</span>
          </p>
          <p v-if="estimate && estimate.count" class="text-xs text-gray-400">{{ $strings.LabelEpisodeFormatEstimateNote }}</p>
        </template>
      </template>
      <ui-btn v-else-if="feedUrl" small :loading="loadingFeed" class="mr-2" @click="loadFeed">{{ $strings.LabelEpisodeFilterTest }}</ui-btn>
    </div>
  </div>
</template>

<script>
// Keep in sync with server/utils/podcastFormats.js
const PRESETS = {
  'mp3-64-mono': { kbps: 64, labelKey: 'LabelEpisodeFormatMp364' },
  'aac-64-mono': { kbps: 64, labelKey: 'LabelEpisodeFormatAac64' },
  'opus-48-mono': { kbps: 48, labelKey: 'LabelEpisodeFormatOpus48' },
  'opus-32-mono': { kbps: 32, labelKey: 'LabelEpisodeFormatOpus32' }
}
const SKIP_IF_SOURCE_BELOW = 1.15

export default {
  props: {
    include: String,
    exclude: String,
    format: String,
    // Feed episodes to preview against: [{ title, size, seconds, publishedAt }] (optional)
    feedEpisodes: {
      type: Array,
      default: null
    },
    // When set (existing podcasts), the preview can fetch the feed on demand
    feedUrl: String
  },
  data() {
    return {
      loadedEpisodes: null,
      loadingFeed: false,
      sinceDate: ''
    }
  },
  computed: {
    includeValue: {
      get() {
        return this.include || ''
      },
      set(val) {
        this.$emit('update:include', val)
      }
    },
    excludeValue: {
      get() {
        return this.exclude || ''
      },
      set(val) {
        this.$emit('update:exclude', val)
      }
    },
    formatValue: {
      get() {
        return this.format || ''
      },
      set(val) {
        this.$emit('update:format', val)
      }
    },
    formatItems() {
      return [{ text: this.$strings.LabelEpisodeFormatOriginal, value: '' }, ...Object.entries(PRESETS).map(([value, p]) => ({ text: this.$strings[p.labelKey], value }))]
    },
    episodes() {
      return this.feedEpisodes || this.loadedEpisodes
    },
    includeInvalid() {
      return !this.compile(this.includeValue).ok
    },
    excludeInvalid() {
      return !this.compile(this.excludeValue).ok
    },
    anyInvalid() {
      return this.includeInvalid || this.excludeInvalid
    },
    matching() {
      if (!this.episodes || this.anyInvalid) return []
      const inc = this.compile(this.includeValue).re
      const exc = this.compile(this.excludeValue).re
      return this.episodes.filter((e) => (!inc || inc.test(e.title)) && !(exc && exc.test(e.title)))
    },
    previewText() {
      return this.matching
        .slice(0, 3)
        .map((e) => e.title.slice(0, 40))
        .join(' · ')
    },
    estimate() {
      if (!this.episodes || this.anyInvalid) return null
      const since = this.sinceDate ? new Date(this.sinceDate + 'T00:00:00').valueOf() : 0
      const eps = this.matching.filter((e) => !since || (e.publishedAt || 0) >= since)
      const preset = PRESETS[this.formatValue]
      let original = 0
      let converted = 0
      for (const e of eps) {
        original += e.size
        if (!preset) continue
        const sourceKbps = e.size && e.seconds ? (e.size * 8) / e.seconds / 1000 : null
        if (sourceKbps !== null && sourceKbps <= preset.kbps * SKIP_IF_SOURCE_BELOW) converted += e.size
        else converted += e.seconds ? (e.seconds * preset.kbps * 1000) / 8 : e.size
      }
      return {
        count: eps.length,
        original,
        converted: preset ? converted : null,
        savedPercent: preset && original ? Math.max(0, Math.round(100 - (100 * converted) / original)) : 0
      }
    }
  },
  methods: {
    compile(value) {
      const pattern = (value || '').trim()
      if (!pattern) return { ok: true, re: null }
      if (pattern.length > 300) return { ok: false, re: null }
      try {
        return { ok: true, re: new RegExp(pattern, 'i') }
      } catch (error) {
        return { ok: false, re: null }
      }
    },
    async loadFeed() {
      this.loadingFeed = true
      const payload = await this.$axios.$post('/api/podcasts/feed', { rssFeed: this.feedUrl }).catch((error) => {
        console.error('Failed to get feed', error)
        this.$toast.error(this.$strings.ToastPodcastGetFeedFailed)
        return null
      })
      this.loadingFeed = false
      if (payload?.podcast?.episodes) this.loadedEpisodes = this.toPreviewEpisodes(payload.podcast.episodes)
    },
    toPreviewEpisodes(episodes) {
      return episodes.map((e) => ({ title: e.title || '', size: Number(e.enclosure?.length) || 0, seconds: Number(e.durationSeconds) || 0, publishedAt: e.publishedAt || 0 }))
    }
  }
}
</script>
