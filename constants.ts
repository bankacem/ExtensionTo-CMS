import { User, BlogPost, Extension, SEOSettings, AnalyticsData, CMSPage } from './types';

export const STORAGE_KEYS = {
  USERS: 'cms_users_v5',
  POSTS: 'cms_posts_v5',
  PAGES: 'cms_pages_v5',
  EXTENSIONS: 'cms_extensions_v5',
  MEDIA: 'cms_media_v5',
  ANALYTICS: 'cms_analytics_v5',
  INDEX: 'cms_index_v5',
  SCHEDULER: 'cms_scheduler_v5',
  SETTINGS: 'cms_settings_v5',
  AUTH: 'cms_auth_v5',
  DARK_MODE: 'cms_dark_mode_v5',
  SEO: 'cms_seo_v5'
};

export const DEFAULT_USERS: User[] = [
  {
    id: 'user_bankacem',
    username: 'BANKACEM',
    password: '0600231590mM@',
    email: 'contact@bankacem.com',
    role: 'admin',
    createdAt: '2025-01-01T00:00:00Z',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=BANKACEM'
  }
];

export const DEFAULT_SEO_SETTINGS: SEOSettings = {
  robotsTxt: `User-agent: *
Allow: /
Disallow: /admin
Sitemap: https://extensionto.com/sitemap.xml`,
  sitemapLastGenerated: ''
};

export const DEFAULT_PAGES: CMSPage[] = [
  {
    id: 'page-about',
    title: 'About ExtensionTo',
    slug: 'about',
    content: '<h2>Our Professional Mission</h2><p>ExtensionTo is the premier directory for performance-focused browser extensions.</p>',
    status: 'published',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'page-privacy',
    title: 'Privacy Policy',
    slug: 'privacy',
    content: '<h2>Data Protection</h2><p>We do not track users or collect personal information.</p>',
    status: 'published',
    updatedAt: new Date().toISOString()
  }
];

// Helper function to process content
const processPostContent = (post: BlogPost): BlogPost => {
  let { content } = post;

  // 1. Fix broken image SRCs
  if (post.image && (content.includes('src=""') || content.includes('<figure class=\"\" alt=\"\" />'))) {
    const imgTag = `<img src="${post.image}" alt="${post.title}" class="wp-image-11" />`;
    if (content.includes('src=""')) {
      content = content.replace(/<img[^>]*src=""[^>]*>/, imgTag);
    } else {
      content = content.replace(/<figure class=\"\" alt=\"\" \/>/, `<figure>${imgTag}</figure>`);
    }
  }

  // 2. Fix content wrapped in <pre><code> blocks
  const codeBlockRegex = /<pre.*?wp-block-code.*?><code>([\s\S]*?)<\/code><\/pre>/;
  const match = content.match(codeBlockRegex);

  // Heuristic: if a code block is very long, it's probably the article body
  if (match && match[1] && match[1].trim().length > 500) {
    let innerText = match[1];

    // Normalize line breaks from <br> tags
    innerText = innerText.replace(/<br \/>/g, '\n').replace(/<br>/g, '\n');

    const paragraphs = innerText
      .trim()
      .split(/(\n\s*){2,}/) // Split by 2 or more newlines to create paragraphs
      .filter(p => p && p.trim().length > 0)
      .map(p => `<p>${p.trim().replace(/\n/g, '<br />')}</p>`) // Wrap in <p> and preserve single newlines with <br>
      .join('');
    
    // Replace the original code block with the newly formatted HTML
    content = content.replace(codeBlockRegex, paragraphs);
  }

  return { ...post, content, slug: post.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-') };
};

const initialDefaultPosts: BlogPost[] = [
    {
      "id": "post-1767636825089",
      "title": "Chrome Extensions vs. Web Apps: The Ultimate Comparison for Productivity in 2025",
      "slug": "chrome-extensions-vs-web-apps",
      "excerpt": "Discover the future of browser extensions with our curated, high-performance directory.",
      "content": "<p><!-- wp:image {\"id\":11,\"sizeSlug\":\"large\",\"linkDestination\":\"none\"} --></p>\n<figure class=\"wp-block-image size-large\"><img class=\"wp-image-11\" src=\"https://extensionto.com/wp-content/uploads/2025/12/Chrome-Extensions-vs.-Web-Apps-The-Ultimate-Comparison-for-Productivity-in-2025-gav-ma-image-1024x571.png\" alt=\"\" /></figure>\n<p><!-- /wp:image --> <!-- wp:paragraph --></p>\n<p>The browser isn't just a portal anymore; it is the operating system. Developers, marketers, and project managers face a constant choice: install a lightweight tool directly into the browser interface, or rely on a full-scale web application? This analysis of <strong>chrome extensions vs</strong> web apps examines the technical architecture, performance trade-offs, and productivity workflows defining the current landscape.</p>\n<p><!-- /wp:paragraph --> <!-- wp:heading --></p>\n<h2 class=\"wp-block-heading\">Key Takeaways</h2>\n<p><!-- /wp:heading --> <!-- wp:list --></p>\n<ul class=\"wp-block-list\"><!-- wp:list-item -->\n<li><strong>&bull;</strong> <strong>Chrome Extensions</strong> excel at contextual tasks like grammar checking, price tracking, and UI modification requiring access to external sites.</li>\n<!-- /wp:list-item --> <!-- wp:list-item -->\n<li><strong>&bull;</strong> <strong>Web Apps (PWAs)</strong> provide superior stability, offline access, and cross-platform compatibility without locking users into a specific browser ecosystem.</li>\n<!-- /wp:list-item --> <!-- wp:list-item -->\n<li><strong>&bull;</strong> The shift to <strong>Manifest V3</strong> in 2025 altered the extension landscape, prioritizing security but restricting the capabilities of specific ad-blockers and privacy tools.</li>\n<!-- /wp:list-item --> <!-- wp:list-item -->\n<li><strong>&bull;</strong> <strong>Performance Impact:</strong> Excessive extensions drastically increase RAM usage and slow down page load times (LCP), while modern web apps are optimized for speed.</li>\n<!-- /wp:list-item --></ul>\n<p><!-- /wp:list --> <!-- wp:heading --></p>\n<h2 class=\"wp-block-heading\">Defining the Contenders: Architecture and Core Differences</h2>\n<p><!-- /wp:heading --> <!-- wp:paragraph --></p>\n<p>To settle the <strong>chrome extensions vs</strong> web apps debate, look at how they exist within your computer's memory. A Chrome extension is a compact software program designed to customize the browsing experience. It accesses internal browser APIs, allowing it to read page content, modify the interface, and intercept network requests.</p>\n<p><!-- /wp:paragraph --> <!-- wp:paragraph --></p>\n<p>In contrast, a web application (or Progressive Web App) is self-contained software running inside the browser, isolated from other tabs. An extension <em>augments</em> your browsing; a web app <em>is</em> the destination. Think of the Grammarly extension following you across the web, versus the Grammarly Editor web app where you write long-form content in a focused environment.</p>\n<p><!-- /wp:paragraph --> <!-- wp:heading {\"level\":3} --></p>\n<h3 class=\"wp-block-heading\">The Chrome Extension Advantage: Contextual Awareness</h3>\n<p><!-- /wp:heading --> <!-- wp:paragraph --></p>\n<p>The primary strength of extensions is their ability to \"see\" your activity on other websites. Since extensions inject scripts into the Document Object Model (DOM) of any page, they offer real-time assistance. This makes them essential for:</p>\n<p><!-- /wp:paragraph --> <!-- wp:list --></p>\n<ul class=\"wp-block-list\"><!-- wp:list-item -->\n<li><strong>SEO Analysis:</strong> Tools like Ahrefs or Moz displaying metrics directly on Google search results.</li>\n<!-- /wp:list-item --> <!-- wp:list-item -->\n<li><strong>Password Management:</strong> Bitwarden or LastPass auto-filling forms on third-party sites.</li>\n<!-- /wp:list-item --> <!-- wp:list-item -->\n<li><strong>Developer Tools:</strong> React or Vue devtools inspecting the code of the site currently under construction.</li>\n<!-- /wp:list-item --> <!-- wp:list-item -->\n<li><strong>Ad-blocking:</strong> Filtering out intrusive elements before they render on the screen.</li>\n<!-- /wp:list-item --></ul>\n<p><!-- /wp:list --> <!-- wp:heading --></p>\n<h2 class=\"wp-block-heading\">Comparative Analysis: Chrome Extensions vs. Web Apps</h2>\n<p><!-- /wp:heading --> <!-- wp:table --></p>\n<figure class=\"wp-block-table\">\n<table class=\"has-fixed-layout\">\n<thead>\n<tr>\n<th>Feature</th>\n<th>Chrome Extensions</th>\n<th>Web Apps (PWAs)</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td>Integration</td>\n<td>High (Modifies browser UI and page content)</td>\n<td>Low (Isolated within its own tab/window)</td>\n</tr>\n<tr>\n<td>Offline Support</td>\n<td>Limited (Usually requires a connection)</td>\n<td>Strong (Service workers allow full offline use)</td>\n</tr>\n<tr>\n<td>Security</td>\n<td>Variable (Risk of data scraping via permissions)</td>\n<td>High (Standard browser sandboxing)</td>\n</tr>\n<tr>\n<td>Installation</td>\n<td>Chrome Web Store only</td>\n<td>Direct from URL (No store required)</td>\n</tr>\n<tr>\n<td>Mobile Support</td>\n<td>Extremely Limited (Not on Chrome Android/iOS)</td>\n<td>Excellent (Works on all modern smartphones)</td>\n</tr>\n</tbody>\n</table>\n</figure>\n<p><!-- /wp:table --> <!-- wp:heading --></p>\n<h2 class=\"wp-block-heading\">The 2025 \"Great Migration\": Manifest V3 and Its Impact</h2>\n<p><!-- /wp:heading --> <!-- wp:paragraph --></p>\n<p>Google's transition to <strong>Manifest V3 (MV3)</strong> heavily influences the <strong>chrome extensions vs</strong> web apps debate in 2025. This technical shift represents the most significant change to the extension ecosystem in over a decade.</p>\n<p><!-- /wp:paragraph --> <!-- wp:paragraph --></p>\n<p>Google aims to improve security, privacy, and performance with MV3. By replacing the <em>webRequest</em> API with the <em>declarativeNetRequest</em> API, Google limits the ability of extensions to intercept and modify network requests in real-time. While this prevents malicious extensions from spying on data, it also reduces the granular control of popular ad-blockers.</p>\n<p><!-- /wp:paragraph --> <!-- wp:paragraph --></p>\n<p>Extensions are becoming more like \"widgets\" and less like \"system-level modifiers.\" This shift pushes many developers toward the web app model. If a restricted extension cannot provide a powerful enough experience, developers build a robust PWA offering consistency across Chrome, Safari, and Firefox without the hurdles of Chrome Web Store policies.</p>\n<p><!-- /wp:paragraph --> <!-- wp:heading --></p>\n<h2 class=\"wp-block-heading\">Performance Benchmarks: The Hidden Cost of \"Convenience\"</h2>\n<p><!-- /wp:heading --> <!-- wp:paragraph --></p>\n<p>System resources often determine the winner in the <strong>chrome extensions vs</strong> web apps comparison. Every installed extension runs as a background process. With web pages becoming increasingly complex, extension overhead leads to significant \"browser bloat.\"</p>\n<p><!-- /wp:paragraph --> <!-- wp:heading {\"level\":3} --></p>\n<h3 class=\"wp-block-heading\">Memory Usage and CPU Cycles</h3>\n<p><!-- /wp:heading --> <!-- wp:paragraph --></p>\n<p>Research indicates the average Chrome user keeps 5 to 12 extensions active. Each tool adds between 50MB to 200MB of RAM usage. Additionally, extensions performing \"content injection\" (like grammar checkers or dark mode toggles) scan the entire DOM of every loaded page. On sites with thousands of elements, this delays the <strong>Time to Interactive (TTI)</strong> by several seconds.</p>\n<p><!-- /wp:paragraph --> <!-- wp:paragraph --></p>\n<p>Web apps only consume resources when the specific tab is active. Modern browsers \"sleep\" inactive tabs, reducing their RAM footprint to near zero when not in use. Using the Notion web app is often more stable than using a browser extension that attempts to \"clip\" content into Notion, as the latter adds a layer of complexity to every page browsed.</p>\n<p><!-- /wp:paragraph --> <!-- wp:heading --></p>\n<h2 class=\"wp-block-heading\">The Mobile Frontier: Where Web Apps Win</h2>\n<p><!-- /wp:heading --> <!-- wp:paragraph --></p>\n<p>If your workflow requires moving between desktop and mobile, web apps win the battle easily.</p>\n<p><!-- /wp:paragraph --> <!-- wp:paragraph --></p>\n<p>Google Chrome for Android and iOS does not officially support extensions. While competitors like <strong>Firefox</strong> and <strong>Microsoft Edge</strong> support a curated list of extensions on mobile, the ecosystem remains fragmented. Relying on a Chrome extension effectively tethers you to the desktop.</p>\n<p><!-- /wp:paragraph --> <!-- wp:paragraph --></p>\n<p>Web apps, particularly PWAs, solve this. A PWA installs to your home screen on an iPhone or Android device, gaining its own icon and operating without the browser address bar. This cross-platform fluidity causes enterprise tools like Slack, Trello, and Zoom to prioritize their web apps over browser-specific plugins.</p>\n<p><!-- /wp:paragraph --> <!-- wp:heading --></p>\n<h2 class=\"wp-block-heading\">Security and Privacy: A Double-Edged Sword</h2>\n<p><!-- /wp:heading --> <!-- wp:paragraph --></p>\n<p>Enterprise users prioritize security when choosing between <strong>chrome extensions vs</strong> web apps. Extensions are difficult to audit. An extension often requires permission to \"read and change all your data on the websites you visit.\" A single compromised extension can lead to a massive data breach, capturing passwords and private communications.</p>\n<p><!-- /wp:paragraph --> <!-- wp:paragraph --></p>\n<p>Web apps operate under the <strong>Same-Origin Policy</strong>. A web app at <em>dashboard.example.com</em> cannot see activity in your bank account tab. This isolation makes web apps inherently safer for handling sensitive data.</p>\n<p><!-- /wp:paragraph --> <!-- wp:heading --></p>\n<h2 class=\"wp-block-heading\">Top Productivity Tools: Extension vs. Web App Versions</h2>\n<p><!-- /wp:heading --> <!-- wp:table --></p>\n<figure class=\"wp-block-table\">\n<table class=\"has-fixed-layout\">\n<thead>\n<tr>\n<th>Tool</th>\n<th>Best as Extension</th>\n<th>Best as Web App</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td>Grammarly</td>\n<td>Yes (For emails and social media)</td>\n<td>Yes (For long-form drafting)</td>\n</tr>\n<tr>\n<td>Todoist</td>\n<td>Yes (Quick task entry)</td>\n<td>No (Lacks full project view)</td>\n</tr>\n<tr>\n<td>Canva</td>\n<td>No (Limited functionality)</td>\n<td>Yes (Full design suite)</td>\n</tr>\n<tr>\n<td>Pocket</td>\n<td>Yes (One-click saving)</td>\n<td>Yes (Reading experience)</td>\n</tr>\n</tbody>\n</table>\n</figure>\n<p><!-- /wp:table --> <!-- wp:heading --></p>\n<h2 class=\"wp-block-heading\">The Developer's Perspective: Why the Shift is Happening</h2>\n<p><!-- /wp:heading --> <!-- wp:paragraph --></p>\n<p>Developers choose between extensions and web apps based on distribution and maintenance. Developing a Chrome extension means adhering to Google's strict Web Store policies. Updates often take days for approval, and policy changes can disrupt business models instantly.</p>\n<p><!-- /wp:paragraph --> <!-- wp:paragraph --></p>\n<p>Building a web app offers sovereignty. Developers push updates instantly, avoid app store fees, and reach users on any browser. As the technical gap closes due to new browser APIs (like the File System Access API), more developers adopt the \"Web First\" approach.</p>\n<p><!-- /wp:paragraph --> <!-- wp:heading --></p>\n<h2 class=\"wp-block-heading\">The Future: AI and the Hybrid Model</h2>\n<p><!-- /wp:heading --> <!-- wp:paragraph --></p>\n<p>Artificial Intelligence blurs the line in the <strong>chrome extensions vs</strong> web app debate. We see the rise of \"Side-panel extensions\" acting as persistent AI assistants (like ChatGPT or Claude) that remain open regardless of the active tab.</p>\n<p><!-- /wp:paragraph --> <!-- wp:paragraph --></p>\n<p>These hybrid tools combine the contextual awareness of an extension with the processing power of a web app. Instead of choosing one, productive users in 2025 utilize a \"Thin Extension\" to capture data and a \"Deep Web App\" to process and store it.</p>\n<p><!-- /wp:paragraph --> <!-- wp:heading --></p>\n<h2 class=\"wp-block-heading\">Frequently Asked Questions</h2>\n<p><!-- /wp:heading --> <!-- wp:heading {\"level\":3} --></p>\n<h3 class=\"wp-block-heading\">Do Chrome extensions slow down my computer?</h3>\n<p><!-- /wp:heading --> <!-- wp:paragraph --></p>\n<p>Yes. Each active extension runs as a separate process in Chrome's Task Manager. Tools that modify the UI or scan page content use CPU cycles and RAM, noticeably slowing down page loading and decreasing battery life on laptops.</p>\n<p><!-- /wp:paragraph --> <!-- wp:heading {\"level\":3} --></p>\n<h3 class=\"wp-block-heading\">Can I use Chrome extensions on my Android phone?</h3>\n<p><!-- /wp:heading --> <!-- wp:paragraph --></p>\n<p>Official Google Chrome for Android lacks extension support. However, Chromium-based alternatives like Kiwi Browser or Yandex Browser allow installation of extensions from the Chrome Web Store on mobile devices.</p>\n<p><!-- /wp:paragraph --> <!-- wp:heading {\"level\":3} --></p>\n<h3 class=\"wp-block-heading\">Are web apps safer than extensions?</h3>\n<p><!-- /wp:heading --> <!-- wp:paragraph --></p>\n<p>Generally, yes. Web apps are sandboxed within their own tab and cannot access data on other websites. Chrome extensions require broad permissions that, if misused, could allow tracking of browsing history or theft of sensitive information.</p>\n<p><!-- /wp:paragraph --> <!-- wp:heading {\"level\":3} --></p>\n<h3 class=\"wp-block-heading\">What is Manifest V3?</h3>\n<p><!-- /wp:heading --> <!-- wp:paragraph --></p>\n<p>Manifest V3 is the latest version of Chrome's extension platform. It introduces rules designed to make extensions more secure and performant, but simultaneously limits the functionality of certain tools, specifically advanced ad-blockers and privacy extensions.</p>\n<p><!-- /wp:paragraph --> <!-- wp:heading --></p>\n<h2 class=\"wp-block-heading\">Conclusion: Finding Your Productivity Sweet Spot</h2>\n<p><!-- /wp:heading --> <!-- wp:paragraph --></p>\n<p>The \"winner\" of <strong>chrome extensions vs</strong> web apps depends on the task scope. Extensions rule the <em>micro-moment</em>&mdash;saving a link, checking a definition, or filling a password. They serve as the ultimate helpers in the margins of your workflow.</p>\n<p><!-- /wp:paragraph --> <!-- wp:paragraph --></p>\n<p>Web apps dominate <em>deep work</em>. When managing a project, designing a graphic, or writing a report, the isolation and feature-rich environment of a web app (or PWA) provide the stability extensions lack.</p>\n<p><!-- /wp:paragraph --> <!-- wp:paragraph --></p>\n<p>For a truly optimized 2025 workflow, embrace <strong>minimalism</strong>: usage few extensions to keep the browser fast and secure, and rely on Progressive Web Apps for core professional tools. Balancing the contextual power of extensions with the reliability of web apps creates a digital environment that is fast and capable.</p>\n<p><!-- /wp:paragraph --> <!-- wp:heading {\"level\":3} --></p>\n<h3 class=\"wp-block-heading\">Ready to Optimize Your Browser?</h3>\n<p><!-- /wp:heading --> <!-- wp:paragraph --></p>\n<p>Start by auditing your current extensions. Open <strong>chrome://extensions/</strong> and remove anything unused in the last 30 days. Your RAM (and your productivity) will thank you.</p>\n<p><!-- /wp:paragraph --></p>",
      "category": "General",
      "tags": "welcome, introduction, premium",
      "date": "January 5, 2025",
      "publishDate": "2026-01-09T18:12:00.000Z",
      "readTime": "3 min read",
      "image": "https://blogger.googleusercontent.com/img/a/AVvXsEgaEM28enPmTRY5t4M0lRH7_MLW2dLh_cLKPoILLQqX1pp8TUH6dCnipCmbyZDbmTkt3PLkFEyUVOFmrphWgYH7KwVPyAelBrwfVd6XonqegAG5yGng0d1SHGq3jW8wJfn6AS7sROyuFS5rDPj5S_icm_XICxusO4zwOAza5-bAs6m2TS7TfO8E7zt1BVw",
      "status": "scheduled",
      "featured": true,
      "seoTitle": "Welcome to ExtensionTo – Premium Browser Extensions Hub",
      "seoDesc": "Discover curated, high-performance browser extensions.",
      "seoKeywords": "browser extensions, premium tools, productivity",
      "views": 0
    }
  ];

export const DEFAULT_POSTS: BlogPost[] = initialDefaultPosts.map(processPostContent);

export const DEFAULT_EXTENSIONS: Extension[] = [
    {
      "id": "cookie-banner-blocker",
      "name": "Cookie Banner Blocker Pro",
      "description": "Privacy-focused extension to block annoying cookie consent popups and banners automatically.",
      "category": "Security",
      "rating": 4.8,
      "downloads": 1520,
      "icon": "🍪",
      "storeUrl": "https://chromewebstore.google.com/detail/cookie-banner-blocker-pri/mlmiefaloipcahfcgfbccadnnjgpipge",
      "featured": true
    },
    {
      "id": "offline-reader-pro",
      "name": "Offline Reader Pro",
      "description": "Save articles and web pages for distraction-free offline reading with advanced formatting.",
      "category": "Productivity",
      "rating": 4.7,
      "downloads": 840,
      "icon": "📖",
      "storeUrl": "https://chromewebstore.google.com/detail/offline-reader-pro/bgbojccanmjdniomhccefkakjaedajhf",
      "featured": false
    },
    {
      "id": "securakey-pro",
      "name": "Securakey Pro Password Manager",
      "description": "Enterprise-grade password management and secure vault for your digital identities.",
      "category": "Security",
      "rating": 4.9,
      "downloads": 2100,
      "icon": "🔑",
      "storeUrl": "https://chromewebstore.google.com/detail/securakey-pro-password-ma/omeencccnkninlofbggfcfiohapajhgi",
      "featured": true
    },
    {
      "id": "protab-suspender",
      "name": "ProTab Suspender Memory Saver",
      "description": "Reduce browser memory footprint by suspending inactive tabs and boosting overall performance.",
      "category": "Performance",
      "rating": 4.8,
      "downloads": 3200,
      "icon": "⚡",
      "storeUrl": "https://chromewebstore.google.com/detail/protab-suspender-memory-s/gghjdfjjffegohpjhmcmgeonmcomilgj",
      "featured": true
    },
    {
      "id": "light-popup-blocker",
      "name": "Light Popup Blocker",
      "description": "Ultra-lightweight engine to block intrusive popups and redirects without slowing down your browser.",
      "category": "Security",
      "rating": 4.7,
      "downloads": 1100,
      "icon": "🛡️",
      "storeUrl": "https://chromewebstore.google.com/detail/light-popup-blocker/oimngcokgckajdlphggpjpbeljoakpii",
      "featured": false
    },
    {
      "id": "formula-builder-pro",
      "name": "Formula Builder Pro",
      "description": "Advanced calculator and formula builder for spreadsheet enthusiasts and data scientists.",
      "category": "Productivity",
      "rating": 4.6,
      "downloads": 450,
      "icon": "🧪",
      "storeUrl": "https://chromewebstore.google.com/detail/formula-builder-pro/ecmfloopolmkamoklcepdonahkigjlnn",
      "featured": false
    },
    {
      "id": "auto-dark-mode",
      "name": "Auto Dark Mode Switcher",
      "description": "Smart customization tool that toggles dark mode based on your local time or system settings.",
      "category": "Customization",
      "rating": 4.8,
      "downloads": 1900,
      "icon": "🌙",
      "storeUrl": "https://chromewebstore.google.com/detail/auto-dark-mode-switcher-u/obbhliekbfgpcdippngphefofiicgjml",
      "featured": false
    },
    {
      "id": "redirect-shield",
      "name": "Redirect Shield",
      "description": "Stop automatic redirects and protect your browsing session from malicious navigation attempts.",
      "category": "Security",
      "rating": 4.9,
      "downloads": 750,
      "icon": "🛡️",
      "storeUrl": "https://chromewebstore.google.com/detail/redirect-shield-stop-auto/pofolffdhjffglfphiagpbnlegjbnbhp",
      "featured": false
    },
    {
      "id": "quick-screenshot-lite",
      "name": "Quick Screenshot Lite",
      "description": "Capture, annotate, and share screenshots instantly with a minimal memory footprint.",
      "category": "Tools",
      "rating": 4.7,
      "downloads": 1400,
      "icon": "📸",
      "storeUrl": "https://chromewebstore.google.com/detail/quick-screenshot-lite/hddickadgkbfpcelmckpjhcfnoeognee",
      "featured": false
    }
];

export const INITIAL_ANALYTICS: AnalyticsData[] = [
  {
    date: new Date().toISOString().split('T')[0],
    views: 0,
    uniqueVisitors: 0,
    avgSessionDuration: 0,
    bounceRate: 0,
    topPosts: [],
    referrals: []
  }
];
