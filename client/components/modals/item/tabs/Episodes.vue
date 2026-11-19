<template>
  <div class="w-full h-full overflow-y-auto overflow-x-hidden px-4 py-6">
    <div class="w-full mb-4">
      <!-- REJ1: filters and download format live here too, right next to "Check & Download", and are saved automatically before a check -->
      <div v-if="userIsAdminOrUp && feedUrl" class="w-full mb-6 p-4 bg-primary/40 rounded">
        <widgets-podcast-episode-filter :include.sync="newEpisodeIncludePattern" :exclude.sync="newEpisodeExcludePattern" :format.sync="newEpisodeFormat" :feed-url="feedUrl" />
        <div class="mt-4">
          <ui-checkbox v-model="newIsYearlyPlan" :label="$strings.LabelYearlyReadingPlan" checkbox-bg="bg" label-class="pl-2 text-base font-semibold" />
          <p class="text-xs md:text-sm text-gray-300 mt-1">{{ $strings.LabelYearlyReadingPlanHelp }}</p>
        </div>
        <div class="flex justify-end mt-3">
          <ui-btn small :disabled="!filtersUpdated" :loading="savingFilters" @click="saveFilters">{{ $strings.ButtonSave }}</ui-btn>
        </div>
      </div>

      <div v-if="userIsAdminOrUp" class="flex items-end justify-end mb-4">
        <ui-text-input-with-label ref="lastCheckInput" v-model="lastEpisodeCheckInput" :disabled="checkingNewEpisodes" type="datetime-local" :label="$strings.LabelLookForNewEpisodesAfterDate" class="max-w-xs mr-2" />
        <ui-text-input-with-label v-model="beforeEpisodeInput" :disabled="checkingNewEpisodes" type="datetime-local" :label="$strings.LabelLookForNewEpisodesBeforeDate" class="max-w-xs mr-2" />
        <ui-text-input-with-label ref="maxEpisodesInput" v-model="maxEpisodesToDownload" :disabled="checkingNewEpisodes" type="number" :label="$strings.LabelLimit" class="w-16 mr-2" input-class="h-10">
          <div class="flex -mb-0.5">
            <p class="px-1 text-sm font-semibold" :class="{ 'text-gray-400': checkingNewEpisodes }">{{ $strings.LabelLimit }}</p>
            <ui-tooltip direction="top" :text="$strings.LabelMaxEpisodesToDownload">
              <span class="material-symbols text-base">info</span>
            </ui-tooltip>
          </div>
        </ui-text-input-with-label>
        <ui-btn :loading="checkingNewEpisodes" @click="checkForNewEpisodes">{{ $strings.ButtonCheckAndDownloadNewEpisodes }}</ui-btn>
      </div>

      <div v-if="episodes.length" class="w-full p-4 bg-primary">
        <p>{{ $strings.HeaderEpisodes }}</p>
      </div>
      <div v-if="!episodes.length" class="flex my-4 text-center justify-center text-xl">{{ $strings.MessageNoEpisodes }}</div>
      <table v-else class="text-sm tracksTable">
        <tr>
          <th class="text-center w-20 min-w-20">{{ $strings.LabelEpisode }}</th>
          <th class="text-left">{{ $strings.LabelEpisodeTitle }}</th>
          <th class="text-center w-28">{{ $strings.LabelEpisodeDuration }}</th>
          <th class="text-center w-28">{{ $strings.LabelEpisodeSize }}</th>
        </tr>
        <tr v-for="episode in episodes" :key="episode.id">
          <td class="text-center w-20 min-w-20">
            <p>{{ episode.episode }}</p>
          </td>
          <td dir="auto">
            {{ episode.title }}
          </td>
          <td class="font-mono text-center">
            {{ $secondsToTimestamp(episode.duration) }}
          </td>
          <td class="font-mono text-center">
            {{ $bytesPretty(episode.size) }}
          </td>
        </tr>
      </table>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    libraryItem: {
      type: Object,
      default: () => {}
    }
  },
  data() {
    return {
      checkingNewEpisodes: false,
      lastEpisodeCheckInput: null,
      beforeEpisodeInput: '',
      maxEpisodesToDownload: 3,
      newEpisodeIncludePattern: '',
      newEpisodeExcludePattern: '',
      newEpisodeFormat: '',
      newIsYearlyPlan: false,
      savingFilters: false
    }
  },
  watch: {
    libraryItem: {
      immediate: true,
      handler() {
        this.initFilters()
      }
    },
    lastEpisodeCheck: {
      handler(newVal) {
        // REJ1: only fill the box when it is empty; never overwrite what the user typed (a check stamps "now" on the server)
        if (newVal && !this.lastEpisodeCheckInput) {
          this.setLastEpisodeCheckInput()
        }
      }
    }
  },
  computed: {
    userIsAdminOrUp() {
      return this.$store.getters['user/getIsAdminOrUp']
    },
    autoDownloadEpisodes() {
      return !!this.media.autoDownloadEpisodes
    },
    lastEpisodeCheck() {
      return this.media.lastEpisodeCheck
    },
    media() {
      return this.libraryItem ? this.libraryItem.media || {} : {}
    },
    libraryItemId() {
      return this.libraryItem ? this.libraryItem.id : null
    },
    episodes() {
      return this.media.episodes || []
    },
    feedUrl() {
      return this.media.metadata?.feedUrl || null
    },
    filtersUpdated() {
      return (this.media.episodeIncludePattern || '') !== this.newEpisodeIncludePattern.trim() || (this.media.episodeExcludePattern || '') !== this.newEpisodeExcludePattern.trim() || (this.media.episodeFormat || '') !== this.newEpisodeFormat || !!this.media.isYearlyPlan !== this.newIsYearlyPlan
    }
  },
  methods: {
    initFilters() {
      this.newEpisodeIncludePattern = this.media.episodeIncludePattern || ''
      this.newEpisodeExcludePattern = this.media.episodeExcludePattern || ''
      this.newEpisodeFormat = this.media.episodeFormat || ''
      this.newIsYearlyPlan = !!this.media.isYearlyPlan
    },
    /** @returns {Promise<boolean>} true when nothing needed saving or the save worked */
    async saveFilters() {
      if (!this.filtersUpdated) return true
      const invalid = [this.newEpisodeIncludePattern, this.newEpisodeExcludePattern].some((p) => {
        try {
          if (p && p.trim()) new RegExp(p.trim(), 'i')
          return false
        } catch (error) {
          return true
        }
      })
      if (invalid) {
        this.$toast.error(this.$strings.LabelEpisodeFilterInvalid)
        return false
      }
      this.savingFilters = true
      const payload = { episodeIncludePattern: this.newEpisodeIncludePattern.trim(), episodeExcludePattern: this.newEpisodeExcludePattern.trim(), episodeFormat: this.newEpisodeFormat, isYearlyPlan: this.newIsYearlyPlan }
      const result = await this.$axios.$patch(`/api/items/${this.libraryItemId}/media`, payload).catch((error) => {
        console.error('Failed to update', error)
        this.$toast.error(this.$strings.ToastFailedToUpdate)
        return null
      })
      this.savingFilters = false
      if (!result) return false
      this.$toast.success(this.$strings.ToastItemDetailsUpdateSuccess)
      return true
    },
    async checkForNewEpisodes() {
      if (this.$refs.lastCheckInput) {
        this.$refs.lastCheckInput.blur()
      }
      if (this.$refs.maxEpisodesInput) {
        this.$refs.maxEpisodesInput.blur()
      }

      // REJ1: make sure the chosen filters and format are saved before downloading
      if (!(await this.saveFilters())) return

      if (this.maxEpisodesToDownload < 0) {
        this.maxEpisodesToDownload = 3
        this.$toast.error(this.$strings.ToastInvalidMaxEpisodesToDownload)
        return
      }

      this.checkingNewEpisodes = true
      const lastEpisodeCheck = new Date(this.lastEpisodeCheckInput).valueOf()
      const beforeTs = this.beforeEpisodeInput ? new Date(this.beforeEpisodeInput).valueOf() : 0
      if (this.beforeEpisodeInput && (!beforeTs || beforeTs <= lastEpisodeCheck)) {
        this.$toast.error(this.$strings.ToastDateTimeInvalidOrIncomplete)
        this.checkingNewEpisodes = false
        return false
      }
      const beforeQuery = beforeTs ? `&before=${beforeTs}` : ''

      // If last episode check changed then update it first
      if (lastEpisodeCheck && lastEpisodeCheck !== this.lastEpisodeCheck) {
        var updateResult = await this.$axios.$patch(`/api/items/${this.libraryItemId}/media`, { lastEpisodeCheck }).catch((error) => {
          console.error('Failed to update', error)
          return false
        })
        console.log('updateResult', updateResult)
      } else if (!lastEpisodeCheck) {
        this.$toast.error(this.$strings.ToastDateTimeInvalidOrIncomplete)
        this.checkingNewEpisodes = false
        return false
      }

      this.$axios
        .$get(`/api/podcasts/${this.libraryItemId}/checknew?limit=${this.maxEpisodesToDownload}${beforeQuery}`)
        .then((response) => {
          if (response.episodes && response.episodes.length) {
            console.log('New episodes', response.episodes.length)
            this.$toast.success(this.$getString('ToastNewEpisodesFound', [response.episodes.length]))
          } else {
            this.$toast.info(this.$strings.ToastNoNewEpisodesFound)
          }
          this.checkingNewEpisodes = false
        })
        .catch((error) => {
          console.error('Failed', error)
          var errorMsg = error.response && error.response.data ? error.response.data : 'Unknown Error'
          this.$toast.error(errorMsg)
          this.checkingNewEpisodes = false
        })
    },
    setLastEpisodeCheckInput() {
      this.lastEpisodeCheckInput = this.lastEpisodeCheck ? this.$formatDate(this.lastEpisodeCheck, "yyyy-MM-dd'T'HH:mm") : null
    }
  },
  mounted() {
    this.setLastEpisodeCheckInput()
  }
}
</script>
