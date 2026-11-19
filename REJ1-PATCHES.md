# REJ1 patches on top of upstream Audiobookshelf

Branch `rej1` = an upstream release tag + the commits below. Nothing else is changed.

1. **Podcast Home window** – "Newest Episodes" / "Recently Added" only looked back 60 days, so an older
   podcast library showed "Library is empty" on Home. The window is now ~10 years
   (`PODCAST_HOME_RECENT_DAYS` env var overrides it).
2. **Podcast Discover shelf** – podcast Home gets the same "Discover" shelf books have: random shows the
   user has not started or finished (`getDiscoverLibraryItems` in `libraryItemsPodcastFilters.js`).
3. **No update notifier** – removed the version/"Update" footer from the left sidebar (the button list now runs to the bottom of the screen) and the orange "Latest: x" link in Settings. The version number is still shown in Settings.

4. **Podcast episode title filters** – two optional per-podcast fields, `episodeIncludePattern` and `episodeExcludePattern` (case-insensitive regular expressions, max 300 chars, matched against episode titles). Auto download and "Check & Download New Episodes" only fetch episodes that match the include pattern (if set) and do not match the exclude pattern (if set). Blank means no filtering. UI: "Episode filters" section in the Add Podcast form (with a live "N of M episodes in the feed match" preview) and in each podcast's Schedule tab. Files: `server/utils/podcastUtils.js` (`normalizeEpisodeTitlePattern`, `filterEpisodesByTitlePatterns`), `server/models/Podcast.js`, `server/managers/PodcastManager.js`, `server/Database.js` (`ensureRej1Columns` adds the two columns on startup, idempotent, so no versioned migration is needed), `client/components/widgets/PodcastEpisodeFilter.vue`, `NewModal.vue`, `Schedule.vue`, and seven `LabelEpisodeFilter*` strings in `en-us.json`. Test: `test/server/utils/podcastTitleFilter.test.js`. Example include pattern for Jocko Podcast: `^\\s*(?:jocko podcast\\s*)?#?\\d{1,3}\\s*[:.\\-–—]`.

5. **Per-podcast download format** – optional `episodeFormat` column (preset ids in `server/utils/podcastFormats.js`: `mp3-64-mono`, `aac-64-mono`, `opus-48-mono`, `opus-32-mono`; empty = keep original). Newly downloaded episodes are converted inside the existing ffmpeg tagging pass in `server/utils/ffmpegHelpers.js` (`downloadPodcastEpisode`), so there is no extra step; the file extension follows the preset (`PodcastEpisodeDownload.fileExtension`). A source already at or below ~1.15x the target bitrate is copied unchanged so a file never gets bigger. Already downloaded episodes are never touched. UI: "Download format" dropdown in `PodcastEpisodeFilter.vue` (Add Podcast form, Schedule tab, and the Episodes tab above "Check & Download"; the Episodes tab saves pending filter/format changes automatically before a check) with a size estimate for the filtered episodes since an optional date. Conversion sizes are calculated from duration x bitrate (accurate); original sizes come from the feed's `enclosure.length`, which can understate real files (Jocko: feed 14.8 GB vs 19.2 GB real). Column added by `Database.ensureRej1Columns`. Tests: `test/server/utils/podcastFormats.test.js`. Keep the preset table in sync with the client widget.

6. **Bounded manual episode check** – the Episodes tab has an optional "and before" date next to "Look for new episodes after". With it, `GET /api/podcasts/:id/checknew?limit=N&before=<ms>` downloads the window [after, before] **oldest first** (without it, upstream keeps the newest N, newest first) and leaves the podcast's last-check date as the user set it instead of stamping "now". The Episodes tab also no longer overwrites a typed date when the podcast is updated. Files: `PodcastController.checkNewEpisodes`, `PodcastManager.checkAndDownloadNewEpisodes` / `checkPodcastForNewEpisodes`, `Episodes.vue`, string `LabelLookForNewEpisodesBeforeDate`.

7. **Yearly reading plans ("Today")** – for shows with one episode per calendar date (Bible-in-a-year). Per-podcast flag `isYearlyPlan` (checkbox "Treat as a yearly reading plan" on the Episodes tab, admin only; stored on the podcast so it applies to every user). Effects: (a) a **Today** sort for every podcast's episode list, ordered by calendar date starting at the viewer's today (ascending: today, tomorrow, ... wrapping the year; descending: today, yesterday, ...), (b) plan podcasts open on the Today sort by default (remembered per podcast in localStorage key `podcastEpisodesSortBy:<libraryItemId>`) and today's episode gets a TODAY badge, (c) a **Today's Reading** Home shelf, first on podcast libraries, listing today's episode of each plan podcast (matched server-side with SQLite `strftime('%m-%d', publishedAt)` against the server's local date). Matching uses the episode's UTC month/day and the viewer's local date; Feb 29 maps to Feb 28. Files: `server/utils/yearlyPlan.js`, `libraryItemsPodcastFilters.getFilteredPodcastEpisodes` (filter group `todays-reading`), `libraryFilters.getTodaysReadingEpisodes`, `LibraryItem.getPersonalizedShelves`, `Podcast.js`, `Database.ensureRej1Columns` (now takes a type per column), `LazyEpisodesTable.vue` / `LazyEpisodeRow.vue`, `Episodes.vue`, strings `LabelToday`, `LabelTodaysReading`, `LabelYearlyReadingPlan*`. Test: `test/server/utils/yearlyPlan.test.js`.

## Updating to a new upstream release
`rej1` is the default branch and carries our commits on top of upstream. To take a new release:

    git fetch upstream --tags
    git checkout rej1
    git merge vX.Y.Z                    # our patches live in 3 files; resolve conflicts only if upstream touched them
    npm ci --omit=dev && (cd client && npm ci && NODE_OPTIONS=--openssl-legacy-provider npm run generate)
    # test the Home shelves against a COPY of absdatabase.sqlite, then:
    git tag vX.Y.Z-rej1 && git push origin rej1 --tags
    sudo bash rej1-ops/rej1-deploy.sh   # DB backup, new release dir, restart, health check, auto-rollback

Merging (not rebasing) keeps `rej1` fast-forwardable, so no force pushes.
