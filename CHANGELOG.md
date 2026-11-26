# Changelog

What's new in each version of Driftpost. Each version is also a [release on GitHub](https://github.com/ba1234scx234s/driftpost/releases).

## 0.5.3 (26 November 2026)

### Changed
- Driftpost has its own address: https://driftpost.app

## 0.5.2 (26 November 2026)

### Changed
- Topics look different from a feed's own tags: topics are filled with squarer corners, tags stay round and outlined.

## 0.5.1 (26 November 2026)

### Changed
- Driftpost is now open source under the MIT licence.

## 0.5.0 (26 November 2026)

### New
- A welcome screen for new visitors: no account, no login, nothing saved on a server, and a quick way to Discover feeds.
- A new logo: a D with waves, in black and white for light and dark mode.
- Links to the source code and this changelog in Settings → About.

### Changed
- Read posts are hidden by default. You can show them again in Settings → Reading.
- Driftpost has moved to a new address.
- The server that fetches feeds now shares recently fetched feeds between readers for 10 minutes, only passes on feeds and web pages, and limits requests per visitor to stop misuse.
- Settings explains what is and isn't stored, in a new Privacy section.

### Fixed
- Buttons and menu items show the pointer cursor again.

## 0.4.0 (26 November 2026)

### New
- Discover: popular feeds in 14 categories, one click to follow.
- Hide read feeds: feeds with nothing unread tuck away behind an "N feeds read" link.
- Backup and restore: download everything (feeds, posts, read status, settings) in one file and restore it in any browser.

### Changed
- Duplicate feeds are caught even when the same feed hides behind a different address or comes from an OPML import.
- Settings switches are easier to see, and scale with the text size.

### Fixed
- Dark site icons stay visible in dark mode, and sites without a usable icon show their first letter.

## 0.3.0 (26 November 2026)

### New
- Articles open in a reader column next to the list, with the full text when the feed only gives a summary.
- ← and → step through posts; Esc closes the reader.
- Select words in an article to turn them into a filter.
- Filters by topic, worked out from a feed's tags and links, and hiding posts by tag from the article view.
- Posts are marked as read as they scroll past the top of the list.
- Choose any Google Font for reading.

## 0.2.0 (26 November 2026)

### New
- Import and export subscriptions as OPML.
- Today: just the day's posts. Mark all as read.
- Settings: theme, font, text size, thumbnails and descriptions.
- Rename or unfollow a feed from its menu.

### Changed
- Following a feed you already follow points you to it instead of adding it twice.

### Fixed
- Long feed titles are shortened so unread counts stay visible.

## 0.1.0 (25 November 2026)

### New
- Follow any site by pasting its address; Driftpost finds the feed.
- Reads RSS, Atom and JSON Feed, and keeps everything in your browser.
