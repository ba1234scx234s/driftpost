# Changelog

What's new in each version of Driftpost. Each version is also a [release on GitHub](https://github.com/ba1234scx234s/driftpost/releases).

## 0.9.0 (27 November 2026)

### Changed
- Settings has a nav beside it (on wider screens) that jumps to each part: Appearance, Reading, Filters, Import and export, Backup, Privacy and About. It highlights the part you're reading. On phones it's still one page to scroll.
- "Import OPML" in the + menu opens Settings right at Import and export.

### New
- About says where Driftpost is made: Melbourne, Australia.

## 0.8.0 (27 November 2026)

### New
- Coloured unread dots: the dot next to an unread post takes the main colour of its feed's icon, so you can tell feeds apart at a glance. Icons without a clear colour keep the usual dot. On by default; turn it off in Settings → Reading.

## 0.7.2 (27 November 2026)

### New
- On touch screens, swipe an article right-to-left for the next one (like →), or left-to-right for the previous one (like ←).

## 0.7.1 (27 November 2026)

### Fixed
- The line under the sidebar's logo now lines up with the line under the list's title, at every text size.

### Changed
- Topics now look exactly like a feed's tags.

## 0.7.0 (27 November 2026)

### Changed
- On phones, the posts list now fills the screen. Your feeds, the + button and Settings moved into a menu (☰) that slides in from the left and closes when you pick something.

### Fixed
- Switching lists could mark the posts you were leaving as read.

## 0.6.3 (27 November 2026)

### New
- "Import OPML" under Discover when you press +. It opens Settings at Import and export.

## 0.6.2 (27 November 2026)

### Changed
- OPML import and export moved from the ••• menu next to the logo into Settings → Import and export.
- Following a site now starts from a + button next to the logo, once you follow at least one feed. It opens the address field with Discover right below it. Esc closes it.

## 0.6.1 (26 November 2026)

### New
- Report a problem or share an idea from Settings → About. It opens the issues page on GitHub.

## 0.6.0 (26 November 2026)

### New
- A backup reminder: every 30 days, Driftpost asks you to download your feeds, read status and settings in one file. "Later" asks again in a week. On by default; turn it off in Settings → Backup.

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
