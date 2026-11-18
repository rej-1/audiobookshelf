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
    <div v-if="hasFilter || titles" class="flex items-center flex-wrap mt-2 text-sm text-gray-200">
      <template v-if="titles">
        <p v-if="!anyInvalid" class="pr-3">{{ $getString('LabelEpisodeFilterMatches', [matching.length, titles.length]) }}</p>
        <p v-if="!anyInvalid && matching.length" class="text-xs text-gray-300 truncate">{{ previewText }}</p>
      </template>
      <ui-btn v-else-if="canLoadFeed" small :loading="loadingFeed" class="mr-2" @click="loadFeed">{{ $strings.LabelEpisodeFilterTest }}</ui-btn>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    include: String,
    exclude: String,
    // Episode titles of the feed to preview the filter against (optional)
    feedTitles: {
      type: Array,
      default: null
    },
    // When set (existing podcasts), the preview can fetch the feed on demand
    feedUrl: String
  },
  data() {
    return {
      loadedTitles: null,
      loadingFeed: false
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
    titles() {
      return this.feedTitles || this.loadedTitles
    },
    canLoadFeed() {
      return !!this.feedUrl
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
    hasFilter() {
      return !!(this.includeValue.trim() || this.excludeValue.trim())
    },
    matching() {
      if (!this.titles || this.anyInvalid) return []
      const inc = this.compile(this.includeValue).re
      const exc = this.compile(this.excludeValue).re
      return this.titles.filter((t) => (!inc || inc.test(t)) && !(exc && exc.test(t)))
    },
    previewText() {
      return this.matching
        .slice(0, 3)
        .map((t) => t.slice(0, 40))
        .join(' · ')
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
      if (payload?.podcast?.episodes) this.loadedTitles = payload.podcast.episodes.map((e) => e.title || '')
    }
  }
}
</script>
