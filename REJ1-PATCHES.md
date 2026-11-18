# REJ1 patches on top of upstream Audiobookshelf

Branch `rej1` = an upstream release tag + the commits below. Nothing else is changed.

1. **Podcast Home window** – "Newest Episodes" / "Recently Added" only looked back 60 days, so an older
   podcast library showed "Library is empty" on Home. The window is now ~10 years
   (`PODCAST_HOME_RECENT_DAYS` env var overrides it).
2. **Podcast Discover shelf** – podcast Home gets the same "Discover" shelf books have: random shows the
   user has not started or finished (`getDiscoverLibraryItems` in `libraryItemsPodcastFilters.js`).

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
