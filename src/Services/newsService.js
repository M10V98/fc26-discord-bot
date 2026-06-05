const NEWS_CACHE_MS = 5 * 60 * 1000;

const FEEDS = [
    {
        name: "BBC News",
        url: "https://feeds.bbci.co.uk/news/rss.xml"
    },
    {
        name: "Sky News",
        url: "https://feeds.skynews.com/feeds/rss/home.xml"
    }
];

let cache = {
    fetchedAt: 0,
    items: []
};

function normalize(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

function decodeXml(value) {
    return String(value || "")
        .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function tag(block, name) {
    const match =
        block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"));

    return decodeXml(match?.[1] || "");
}

function parseFeed(xml, source) {
    return [...String(xml || "").matchAll(/<item\b[\s\S]*?<\/item>/gi)]
        .map(match => {
            const block =
                match[0];

            return {
                source,
                title: tag(block, "title"),
                link: tag(block, "link"),
                description: tag(block, "description"),
                publishedAt: tag(block, "pubDate")
            };
        })
        .filter(item => item.title && item.link);
}

async function fetchFeed(feed) {
    const controller =
        new AbortController();
    const timeout =
        setTimeout(
            () => controller.abort(),
            8000
        );

    try {
        const response =
            await fetch(
                feed.url,
                {
                    headers: {
                        "User-Agent": "BellaCiaoFCBot/1.0"
                    },
                    signal: controller.signal
                }
            );

        if (!response.ok) {
            throw new Error(`${response.status} ${response.statusText}`);
        }

        return parseFeed(
            await response.text(),
            feed.name
        );
    } finally {
        clearTimeout(timeout);
    }
}

async function getNewsItems(options = {}) {
    const maxAge =
        options.maxAge || NEWS_CACHE_MS;

    if (
        cache.items.length &&
        Date.now() - cache.fetchedAt < maxAge
    ) {
        return cache.items;
    }

    const results =
        await Promise.allSettled(
            FEEDS.map(fetchFeed)
        );
    const items =
        results
            .flatMap(result =>
                result.status === "fulfilled"
                    ? result.value
                    : []
            )
            .slice(0, 20);

    if (items.length) {
        cache = {
            fetchedAt: Date.now(),
            items
        };
    }

    return items;
}

function isNewsQuestion(value) {
    const text =
        normalize(value);

    return /\b(news|headlines|latest stories|current events|what happened today|anything happened|what's going on|whats going on|world news|uk news)\b/
        .test(text);
}

async function answerNewsQuestion(question) {
    if (!isNewsQuestion(question)) {
        return null;
    }

    const items =
        await getNewsItems().catch(err => {
            console.error("news fetch failed:", err.message);
            return [];
        });

    if (!items.length) {
        return "I could not fetch live news right now. I will avoid guessing.";
    }

    const lines =
        items
            .slice(0, 4)
            .map((item, index) =>
                `${index + 1}. ${item.title} (${item.source})\n${item.link}`
            );

    return [
        "Latest headlines I can see:",
        ...lines
    ].join("\n");
}

module.exports = {
    answerNewsQuestion,
    isNewsQuestion
};
