# Changelog

What's new in each version of Driftpost. Each version is also a [release on GitHub](https://github.com/ba1234scx234s/driftpost/releases).

## 1.3.3 (27 November 2026)

### New
- Discover has 13 more design feeds, including Dezeen, designboom, Nielsen Norman Group, Codrops, Core77 and Typewolf.

### Changed
- Discover no longer has a YouTube section.

### Fixed
- The top bars of the sidebar, the list and the article line up again at every text size.

## 1.3.2 (27 November 2026)

### Changed
- Settings is now called Configure.
- Text size is back under Appearance, with just its four sizes. The custom size is gone; if you had set one, text goes back to the default size.

## 1.3.1 (27 November 2026)

### New
- Discover has five feeds from Australia's ABC: Top Stories and World under News, plus Business, Sport and Culture.

### Changed
- Feeds in Discover are sorted A to Z within each category (a leading "The" doesn't count).

## 1.3.0 (27 November 2026)

### New
- Settings has a new Article list section, with a preview of a post in your lists. The preview changes as you switch thumbnails, descriptions and coloured unread dots.
- Text size has a Custom option, so you can type in your own size.

### Changed
- Settings is regrouped: Appearance has the theme and font, Article list has everything about your lists, and Reading has how articles open, text size and line height.
- "Open articles" is now one switch, "Open articles in app" (on by default). Turn it off to open the article's website in a new tab.

## 1.2.1 (27 November 2026)

### Changed
- Settings → About no longer links to the GitHub issues page; the email address is the way to get in touch.
- The About text is simpler: the version number links to what's new and "open source" links to the code, replacing the two separate links.

## 1.2.0 (27 November 2026)

### New
- Questions and answers in Settings, between Privacy and About: where your feeds are kept, clearing browsing data, using more than one device, following any site, importing from another reader, how often feeds update, summaries, failed feeds, installing as an app, and whether it's really free. Also what each browser does with stored data (Safari clears it after 7 days without a visit), and how long posts are kept.

### Changed
- Read posts are removed 90 days after they were published, once their feed no longer lists them, so storage doesn't keep growing. Unread posts stay.

## 1.1.5 (27 November 2026)

### Changed
- Settings → Privacy explains that post thumbnails and article pictures load from the sites that publish them, and how to keep the list from loading them.

## 1.1.4 (27 November 2026)

### Changed
- Settings → Privacy explains that Google Fonts are loaded from Google, which sees your IP address, and that built-in fonts don't contact anyone.

## 1.1.3 (27 November 2026)

### Changed
- Security headers on every page: a content security policy that only lets Driftpost's own code run, no framing by other sites, HTTPS only, and a stricter referrer policy. Responses from Driftpost's fetch proxy can never run as a page.
- Google Fonts are only loaded once you pick one: opening Settings no longer contacts Google to preview them. A note next to the font picker explains that Google sees your IP address when you use one.

### Fixed
- Updated dependencies with known security issues (none of them reached the app in your browser).

## 1.1.2 (27 November 2026)

### Changed
- The description for search engines and shared links now says Driftpost is open source and anonymous.

## 1.1.1 (27 November 2026)

### New
- A description and preview image for search engines and shared links (Google, Facebook, LinkedIn, Slack, iMessage…), plus robots.txt and a sitemap.

## 1.1.0 (27 November 2026)

### Changed
- Each feed now refreshes on its own schedule, based on how often it posts: busy news feeds every 30 minutes, slower blogs up to every 4 hours, and feeds that have been quiet for a month twice a day. Feeds that ask for a longer wait (RSS `<ttl>`) get it. The refresh button still checks every feed straight away.
- A security.txt at driftpost.app/.well-known/security.txt says where to report security problems.
- A feed that fails to load waits longer before each new try (1, 2, 4, 8, 16 hours, then once a day) instead of every 30 minutes. Being offline doesn't count.

## 1.0.3 (27 November 2026)

### Fixed
- The Android home-screen icon is no longer oversized: the logo now sits at the same size as on iPhone.

## 1.0.2 (27 November 2026)

### Fixed
- Adding Driftpost to your home screen now gives it a proper icon on iPhone, iPad and Android (the white logo on black), and it opens full screen like an app.

## 1.0.1 (27 November 2026)

### New
- Settings → About has an email address for questions and feedback: driftpost_app@pm.me.

## 1.0.0 (27 November 2026)

Driftpost 1.0: the first stable version. Nothing new since 0.14.1; this marks the point where everything below has settled. In short, Driftpost is:

- **Private by design:** no account, no login, and nothing saved on a server. Your feeds, read status and settings live only in your browser, with backups and OPML import and export to keep them safe or take them elsewhere.
- **Free of the usual noise:** no ads, no tracking, no algorithm and no AI that learns from you. Just the posts from the sites you choose, newest first.
- **Made for reading:** full articles in a clean reader, your choice of font, text size and line height, light and dark mode, arrow keys and swipes to move between posts, and an end card that leads you to the next feed.
- **Easy to keep calm:** hide read posts and feeds, filter out topics, tags and words, and tell feeds apart by their colours and icons.
- **Quick to start:** Discover has popular feeds in 14 categories, or paste any site's address.

## 0.14.1 (27 November 2026)

### Changed
- The trash button no longer appears when you hover a feed in the sidebar, so unread counts stay put. Unfollow a feed from the ••• menu next to its name at the top of its list.

## 0.14.0 (27 November 2026)

### New
- Settings → Reading → Thumbnails: Image (the post's picture, or the feed's icon when there's none), Feed icon (the feed's icon for every post) or None. It replaces the "Show thumbnails" switch; if you'd turned that off, you get None.

### Changed
- In lists with pictures, a post without one shows its feed's icon on a tile in the feed's colour, so rows line up and feeds are easy to tell apart. Dark icons that need a light backing in dark mode get a pale tile in their own colour (light grey if they have none). Broken pictures get the tile too.

## 0.13.2 (27 November 2026)

### Changed
- Driftpost no longer fetches article pages just to find pictures for the list, to keep requests down. A post without a picture still gets one when you open it and Driftpost loads its full text anyway.

## 0.13.1 (27 November 2026)

### Changed
- Discover no longer suggests Google News searches (Reuters, AP News and Bloomberg). Feeds you already follow stay.
- Feeds followed from Discover keep Discover's name, so the two BBC News feeds are told apart ("BBC News" and "BBC News – World").

## 0.13.0 (27 November 2026)

### New
- Pictures for posts whose feed has none: as posts come into view, Driftpost looks up the article's own preview image (the one sites set for link previews), a few at a time and once per post.

### Changed
- In lists with pictures, posts without one keep an empty space where it would be, so every row lines up. Text-only feeds keep the full width.

### Fixed
- Pictures in feeds that list them without a type, like the Guardian's, now show (the largest one is used).

## 0.12.2 (27 November 2026)

### Changed
- On the end card, → (or a swipe, or the next button) opens the next feed it suggests.

### Fixed
- Long feed names on the end card: the name sits under the heading (up to two lines), and the next-feed button shortens it instead of running off the edge.
- The Ko-fi note's button now reads "Buy me an iced coffee on Ko-fi", like the link in About.

## 0.12.1 (27 November 2026)

### Changed
- Clicking or tapping the Driftpost logo goes to All posts.

## 0.12.0 (27 November 2026)

### New
- Going past the last article (→, the next button or a swipe) shows an end card instead of doing nothing. It says how many unread posts are still further up, offers the next feed with unread posts (opening its newest one), and has a way back to the list. ← returns to the last article.

### Changed
- The welcome screen adds two points: no algorithm, and no AI agents or anything that learns from you.

## 0.11.0 (27 November 2026)

### New
- Every 5th time you see "You're all caught up", a short note asks if you'd like to buy me an iced coffee on Ko-fi. After you follow the link, it doesn't ask again for 180 days.

### Changed
- The Ko-fi link in Settings → About now reads "Buy me an iced coffee on Ko-fi".

## 0.10.0 (27 November 2026)

### New
- Line height for articles in Settings → Appearance: Compact, Default, Relaxed, or Custom (any value from 1 to 3). It changes the article's text only, not titles or headings.

## 0.9.1 (27 November 2026)

### New
- Settings → About links to Driftpost's Ko-fi page, if you'd like to support it.

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
