# REJ1 patches on top of upstream Audiobookshelf

Branch `rej1` = an upstream release tag + the commits below. Nothing else is changed.

1. **Podcast Home window** – "Newest Episodes" / "Recently Added" only looked back 60 days, so an older
   podcast library showed "Library is empty" on Home. The window is now ~10 years
   (`PODCAST_HOME_RECENT_DAYS` env var overrides it).
2. **Podcast Discover shelf** – podcast Home gets the same "Discover" shelf books have: random shows the
   user has not started or finished (`getDiscoverLibraryItems` in `libraryItemsPodcastFilters.js`).

## Updating to a new upstream release
    git fetch upstream --tags
    git checkout -b rej1-vX.Y.Z vX.Y.Z
    git cherry-pick <patch commits from the previous rej1 branch>   # resolve conflicts if upstream moved
    ./deploy/update.sh   # build, test against a DB copy, switch the service (see script header)
