// Feeds to discover, by category. Picked from Feeder's list of popular feeds
// (feeder.co/knowledge-base/rss-content/popular-rss-feeds), leaving out status pages,
// vendor advisories and podcasts (Driftpost has no audio player).

export interface CatalogFeed {
  title: string;
  url: string;
  /** The site, for the icon. */
  site: string;
  about: string;
}

export interface CatalogCategory {
  id: string;
  label: string;
  feeds: CatalogFeed[];
}

const CATEGORIES: CatalogCategory[] = [
  {
    id: "news",
    label: "News",
    feeds: [
      { title: "BBC News", url: "https://feeds.bbci.co.uk/news/rss.xml", site: "https://www.bbc.co.uk/news", about: "Top stories from the BBC" },
      { title: "BBC News – World", url: "https://feeds.bbci.co.uk/news/world/rss.xml", site: "https://www.bbc.co.uk/news", about: "World news from the BBC" },
      { title: "The Guardian – World", url: "https://www.theguardian.com/world/rss", site: "https://www.theguardian.com", about: "World news from The Guardian" },
      { title: "ABC – Top Stories", url: "https://www.abc.net.au/news/feed/10719986/rss.xml", site: "https://www.abc.net.au/news", about: "Top stories from Australia's ABC" },
      { title: "ABC – World", url: "https://www.abc.net.au/news/feed/104217382/rss.xml", site: "https://www.abc.net.au/news", about: "World news from the ABC" },
      { title: "NPR News", url: "https://feeds.npr.org/1001/rss.xml", site: "https://www.npr.org", about: "US public radio news" },
      { title: "The New York Times", url: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml", site: "https://www.nytimes.com", about: "Home page stories" },
      { title: "NYT – World", url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", site: "https://www.nytimes.com", about: "World news from the Times" },
      { title: "Washington Post – World", url: "https://feeds.washingtonpost.com/rss/world", site: "https://www.washingtonpost.com", about: "World news from the Post" },
      { title: "Axios", url: "https://api.axios.com/feed/top/", site: "https://www.axios.com", about: "Short takes on the day's news" },
      { title: "ProPublica", url: "https://feeds.propublica.org/propublica/main", site: "https://www.propublica.org", about: "Investigative journalism" },
      { title: "The Atlantic", url: "https://www.theatlantic.com/feed/all/", site: "https://www.theatlantic.com", about: "Ideas, politics and culture" },
      { title: "The New Yorker", url: "https://www.newyorker.com/feed/everything", site: "https://www.newyorker.com", about: "Reporting, essays and fiction" },
      { title: "Vox", url: "https://www.vox.com/rss/index.xml", site: "https://www.vox.com", about: "News explained" },
      { title: "CBC News", url: "https://www.cbc.ca/webfeed/rss/rss-topstories", site: "https://www.cbc.ca", about: "Top stories from Canada" },
      { title: "Deutsche Welle", url: "https://rss.dw.com/rdf/rss-en-all", site: "https://www.dw.com", about: "Germany's international broadcaster" },
      { title: "Le Monde", url: "https://www.lemonde.fr/rss/une.xml", site: "https://www.lemonde.fr", about: "French news, in French" },
      { title: "Times of India", url: "https://timesofindia.indiatimes.com/rssfeedstopstories.cms", site: "https://timesofindia.indiatimes.com", about: "Top stories from India" },
    ],
  },
  {
    id: "tech",
    label: "Technology",
    feeds: [
      { title: "The Verge", url: "https://www.theverge.com/rss/index.xml", site: "https://www.theverge.com", about: "Tech, science and culture" },
      { title: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index", site: "https://arstechnica.com", about: "In-depth tech news" },
      { title: "TechCrunch", url: "https://techcrunch.com/feed/", site: "https://techcrunch.com", about: "Startups and tech business" },
      { title: "Wired", url: "https://www.wired.com/feed/rss", site: "https://www.wired.com", about: "How technology changes the world" },
      { title: "Techmeme", url: "https://www.techmeme.com/feed.xml", site: "https://www.techmeme.com", about: "The day's top tech stories" },
      { title: "404 Media", url: "https://www.404media.co/rss/", site: "https://www.404media.co", about: "Independent tech journalism" },
      { title: "MIT Technology Review", url: "https://www.technologyreview.com/feed/", site: "https://www.technologyreview.com", about: "Emerging technology" },
      { title: "Daring Fireball", url: "https://daringfireball.net/feeds/main", site: "https://daringfireball.net", about: "Apple and tech commentary" },
      { title: "Engadget", url: "https://www.engadget.com/rss.xml", site: "https://www.engadget.com", about: "Gadgets and consumer tech" },
      { title: "9to5Mac", url: "https://9to5mac.com/feed/", site: "https://9to5mac.com", about: "Apple news" },
      { title: "9to5Google", url: "https://9to5google.com/feed/", site: "https://9to5google.com", about: "Google and Android news" },
      { title: "MacRumors", url: "https://feeds.macrumors.com/MacRumors-All", site: "https://www.macrumors.com", about: "Mac and iPhone news and rumours" },
      { title: "Lifehacker", url: "https://lifehacker.com/rss", site: "https://lifehacker.com", about: "Tips for getting things done" },
      { title: "Hacker News", url: "https://news.ycombinator.com/rss", site: "https://news.ycombinator.com", about: "Links voted up by Hacker News readers" },
      { title: "Slashdot", url: "https://rss.slashdot.org/Slashdot/slashdot", site: "https://slashdot.org", about: "News for nerds" },
      { title: "Product Hunt", url: "https://www.producthunt.com/feed", site: "https://www.producthunt.com", about: "New products, every day" },
    ],
  },
  {
    id: "security",
    label: "Security",
    feeds: [
      { title: "Krebs on Security", url: "https://krebsonsecurity.com/feed/", site: "https://krebsonsecurity.com", about: "Investigations into cybercrime" },
      { title: "Schneier on Security", url: "https://www.schneier.com/blog/atom.xml", site: "https://www.schneier.com", about: "Security and privacy essays" },
      { title: "BleepingComputer", url: "https://www.bleepingcomputer.com/feed/", site: "https://www.bleepingcomputer.com", about: "Security news and how-tos" },
      { title: "The Hacker News", url: "https://feeds.feedburner.com/TheHackersNews", site: "https://thehackernews.com", about: "Cybersecurity news" },
      { title: "Dark Reading", url: "https://www.darkreading.com/rss.xml", site: "https://www.darkreading.com", about: "Security for professionals" },
    ],
  },
  {
    id: "programming",
    label: "Programming",
    feeds: [
      { title: "The GitHub Blog", url: "https://github.blog/feed/", site: "https://github.blog", about: "News from GitHub" },
      { title: "The Pragmatic Engineer", url: "https://blog.pragmaticengineer.com/rss/", site: "https://blog.pragmaticengineer.com", about: "Software engineering and tech careers" },
      { title: "Martin Fowler", url: "https://martinfowler.com/feed.atom", site: "https://martinfowler.com", about: "Software design and architecture" },
      { title: "Simon Willison", url: "https://simonwillison.net/atom/everything/", site: "https://simonwillison.net", about: "Python, data and AI tools" },
      { title: "Coding Horror", url: "https://feeds.feedburner.com/codinghorror", site: "https://blog.codinghorror.com", about: "Programming and people" },
      { title: "Smashing Magazine", url: "https://www.smashingmagazine.com/feed/", site: "https://www.smashingmagazine.com", about: "Web design and development" },
      { title: "CSS-Tricks", url: "https://css-tricks.com/feed/", site: "https://css-tricks.com", about: "Front-end tips and tricks" },
      { title: "Real Python", url: "https://realpython.com/atom.xml", site: "https://realpython.com", about: "Python tutorials" },
      { title: "DEV Community", url: "https://dev.to/feed", site: "https://dev.to", about: "Posts from developers" },
      { title: "The Cloudflare Blog", url: "https://blog.cloudflare.com/rss/", site: "https://blog.cloudflare.com", about: "Networking, security and the web" },
      { title: "Kubernetes", url: "https://kubernetes.io/feed.xml", site: "https://kubernetes.io", about: "News from the Kubernetes project" },
    ],
  },
  {
    id: "ai",
    label: "AI",
    feeds: [
      { title: "OpenAI News", url: "https://openai.com/news/rss.xml", site: "https://openai.com", about: "Announcements from OpenAI" },
      { title: "Google DeepMind", url: "https://deepmind.google/blog/rss.xml", site: "https://deepmind.google", about: "Research from Google DeepMind" },
      { title: "Hugging Face Blog", url: "https://huggingface.co/blog/feed.xml", site: "https://huggingface.co", about: "Open models and tools" },
      { title: "One Useful Thing", url: "https://www.oneusefulthing.org/feed", site: "https://www.oneusefulthing.org", about: "Ethan Mollick on using AI" },
      { title: "Import AI", url: "https://importai.substack.com/feed", site: "https://importai.substack.com", about: "Weekly AI research newsletter" },
    ],
  },
  {
    id: "science",
    label: "Science",
    feeds: [
      { title: "NASA", url: "https://www.nasa.gov/rss/dyn/breaking_news.rss", site: "https://www.nasa.gov", about: "News from NASA" },
      { title: "Nature", url: "https://www.nature.com/nature.rss", site: "https://www.nature.com", about: "Research and news from Nature" },
      { title: "Scientific American", url: "https://www.scientificamerican.com/platform/syndication/rss/", site: "https://www.scientificamerican.com", about: "Science for everyone" },
      { title: "ScienceDaily", url: "https://www.sciencedaily.com/rss/all.xml", site: "https://www.sciencedaily.com", about: "Latest research news" },
      { title: "New Scientist", url: "https://www.newscientist.com/feed/", site: "https://www.newscientist.com", about: "Science and technology news" },
      { title: "Science News", url: "https://www.sciencenews.org/feed", site: "https://www.sciencenews.org", about: "Independent science journalism" },
      { title: "Phys.org", url: "https://phys.org/rss-feed/", site: "https://phys.org", about: "Physics, space and more" },
      { title: "Nautilus", url: "https://nautil.us/feed", site: "https://nautil.us", about: "Science, connected to culture" },
      { title: "Pew Research Center", url: "https://www.pewresearch.org/feed/", site: "https://www.pewresearch.org", about: "Data on society and trends" },
    ],
  },
  {
    id: "business",
    label: "Business",
    feeds: [
      { title: "WSJ – Markets", url: "https://feeds.content.dowjones.io/public/rss/RSSMarketsMain", site: "https://www.wsj.com", about: "Markets news from the Journal" },
      { title: "The Economist – World this week", url: "https://www.economist.com/rss/the_world_this_week_rss.xml", site: "https://www.economist.com", about: "The week's news in brief" },
      { title: "The Economist – Finance", url: "https://www.economist.com/finance-and-economics/rss.xml", site: "https://www.economist.com", about: "Finance and economics" },
      { title: "Financial Times", url: "https://www.ft.com/?format=rss", site: "https://www.ft.com", about: "International business news" },
      { title: "CNBC", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", site: "https://www.cnbc.com", about: "Top news and analysis" },
      { title: "Fast Company", url: "https://www.fastcompany.com/latest/rss?truncated=true", site: "https://www.fastcompany.com", about: "Business, design and innovation" },
      { title: "Fortune", url: "https://fortune.com/feed/", site: "https://fortune.com", about: "Business news" },
      { title: "Seth's Blog", url: "https://seths.blog/feed/", site: "https://seths.blog", about: "Short daily posts on marketing and work" },
      { title: "ABC – Business", url: "https://www.abc.net.au/news/feed/104217374/rss.xml", site: "https://www.abc.net.au/news", about: "Business news from the ABC" },
    ],
  },
  {
    id: "sport",
    label: "Sport",
    feeds: [
      { title: "BBC Sport", url: "https://feeds.bbci.co.uk/sport/rss.xml", site: "https://www.bbc.co.uk/sport", about: "Sport from the BBC" },
      { title: "The Guardian – Football", url: "https://www.theguardian.com/football/rss", site: "https://www.theguardian.com", about: "Football news and reports" },
      { title: "The Athletic", url: "https://www.nytimes.com/athletic/rss/news/", site: "https://www.nytimes.com/athletic", about: "Sports journalism" },
      { title: "Formula 1", url: "https://www.formula1.com/en/latest/all.xml", site: "https://www.formula1.com", about: "Latest F1 news" },
      { title: "Yahoo Sports", url: "https://sports.yahoo.com/rss/", site: "https://sports.yahoo.com", about: "Sport headlines" },
      { title: "ABC – Sport", url: "https://www.abc.net.au/news/feed/103728570/rss.xml", site: "https://www.abc.net.au/news", about: "Sport from the ABC" },
    ],
  },
  {
    id: "gaming",
    label: "Gaming",
    feeds: [
      { title: "Polygon", url: "https://www.polygon.com/rss/index.xml", site: "https://www.polygon.com", about: "Games and entertainment" },
      { title: "PC Gamer", url: "https://www.pcgamer.com/rss/", site: "https://www.pcgamer.com", about: "PC gaming news" },
      { title: "IGN", url: "https://www.ign.com/rss/articles/feed", site: "https://www.ign.com", about: "Game news and reviews" },
      { title: "Rock Paper Shotgun", url: "https://www.rockpapershotgun.com/feed", site: "https://www.rockpapershotgun.com", about: "PC games" },
      { title: "Eurogamer", url: "https://www.eurogamer.net/feed", site: "https://www.eurogamer.net", about: "Game news and reviews" },
      { title: "Nintendo Life", url: "https://www.nintendolife.com/feeds/latest", site: "https://www.nintendolife.com", about: "Nintendo news" },
    ],
  },
  {
    id: "design",
    label: "Design",
    feeds: [
      { title: "Design Milk", url: "https://design-milk.com/feed/", site: "https://design-milk.com", about: "Modern design" },
      { title: "Colossal", url: "https://www.thisiscolossal.com/feed/", site: "https://www.thisiscolossal.com", about: "Art and visual culture" },
      { title: "It's Nice That", url: "https://feeds2.feedburner.com/itsnicethat/SlXC", site: "https://www.itsnicethat.com", about: "Creative work" },
      { title: "UX Collective", url: "https://uxdesign.cc/feed", site: "https://uxdesign.cc", about: "UX design writing" },
      { title: "Dezeen", url: "https://www.dezeen.com/feed/", site: "https://www.dezeen.com", about: "Architecture, interiors and design" },
      { title: "designboom", url: "https://www.designboom.com/feed/", site: "https://www.designboom.com", about: "Architecture, design and art" },
      { title: "Creative Bloq", url: "https://www.creativebloq.com/feed", site: "https://www.creativebloq.com", about: "Art, design and creative tools" },
      { title: "Creative Boom", url: "https://www.creativeboom.com/feed/", site: "https://www.creativeboom.com", about: "Graphic design, illustration and creative careers" },
      { title: "Nielsen Norman Group", url: "https://www.nngroup.com/feed/rss/", site: "https://www.nngroup.com", about: "Research-based UX advice" },
      { title: "Sidebar", url: "https://sidebar.io/feed.xml", site: "https://sidebar.io", about: "Five design links a day" },
      { title: "Codrops", url: "https://tympanus.net/codrops/feed/", site: "https://tympanus.net/codrops", about: "Web design and creative coding" },
      { title: "Core77", url: "https://www.core77.com/blog/rss.xml", site: "https://www.core77.com", about: "Industrial design" },
      { title: "Abduzeedo", url: "https://abduzeedo.com/rss.xml", site: "https://abduzeedo.com", about: "Design inspiration" },
      { title: "Yanko Design", url: "https://www.yankodesign.com/feed/", site: "https://www.yankodesign.com", about: "Product design" },
      { title: "PRINT", url: "https://www.printmag.com/feed/", site: "https://www.printmag.com", about: "Graphic design and visual culture" },
      { title: "Typewolf", url: "https://www.typewolf.com/feed", site: "https://www.typewolf.com", about: "Fonts and type in use" },
      { title: "A List Apart", url: "https://alistapart.com/main/feed/", site: "https://alistapart.com", about: "Web design and content, now and then" },
    ],
  },
  {
    id: "culture",
    label: "Culture",
    feeds: [
      { title: "Atlas Obscura", url: "https://www.atlasobscura.com/feeds/latest", site: "https://www.atlasobscura.com", about: "Curious places and stories" },
      { title: "Open Culture", url: "https://www.openculture.com/feed", site: "https://www.openculture.com", about: "Free culture and education" },
      { title: "Variety", url: "https://variety.com/feed/", site: "https://variety.com", about: "Film, TV and music industry" },
      { title: "Pitchfork", url: "https://pitchfork.com/feed/feed-news/rss", site: "https://pitchfork.com", about: "Music news" },
      { title: "ABC – Culture", url: "https://www.abc.net.au/news/feed/103728568/rss.xml", site: "https://www.abc.net.au/news", about: "Entertainment and culture from the ABC" },
    ],
  },
  {
    id: "food",
    label: "Food",
    feeds: [
      { title: "Bon Appétit", url: "https://www.bonappetit.com/feed/rss", site: "https://www.bonappetit.com", about: "Recipes and food stories" },
      { title: "Smitten Kitchen", url: "https://smittenkitchen.com/feed/", site: "https://smittenkitchen.com", about: "Home cooking" },
      { title: "Budget Bytes", url: "https://www.budgetbytes.com/feed/", site: "https://www.budgetbytes.com", about: "Cheap, good recipes" },
      { title: "Minimalist Baker", url: "https://minimalistbaker.com/feed/", site: "https://minimalistbaker.com", about: "Simple plant-based recipes" },
    ],
  },
  {
    id: "comics",
    label: "Comics",
    feeds: [
      { title: "xkcd", url: "https://xkcd.com/rss.xml", site: "https://xkcd.com", about: "Romance, sarcasm, math and language" },
      { title: "SMBC", url: "https://www.smbc-comics.com/comic/rss", site: "https://www.smbc-comics.com", about: "Saturday Morning Breakfast Cereal" },
      { title: "Poorly Drawn Lines", url: "https://poorlydrawnlines.com/feed/", site: "https://poorlydrawnlines.com", about: "Absurd little comics" },
      { title: "Existential Comics", url: "https://existentialcomics.com/rss.xml", site: "https://existentialcomics.com", about: "Philosophy jokes" },
      { title: "Penny Arcade", url: "https://www.penny-arcade.com/feed", site: "https://www.penny-arcade.com", about: "Games comics" },
      { title: "Gunnerkrigg Court", url: "https://www.gunnerkrigg.com/rss.xml", site: "https://www.gunnerkrigg.com", about: "Long-running fantasy story" },
      { title: "Order of the Stick", url: "https://www.giantitp.com/comics/oots.rss", site: "https://www.giantitp.com", about: "Fantasy stick-figure saga" },
    ],
  },
];

/** Sorts a title the way a library would: a leading "The" doesn't count. */
const sortKey = (title: string) => title.replace(/^the\s+/i, "");

/** The categories in their own order, each with its feeds from A to Z. */
export const CATALOG: CatalogCategory[] = CATEGORIES.map((c) => ({
  ...c,
  feeds: [...c.feeds].sort((a, b) => sortKey(a.title).localeCompare(sortKey(b.title), "en", { sensitivity: "base" })),
}));
