export const STORAGE_KEYS = {
    USERS: 'cms_users_v4',
    POSTS: 'cms_posts_v4',
    EXTENSIONS: 'cms_extensions_v4',
    MEDIA: 'cms_media_v4',
    ANALYTICS: 'cms_analytics_v4',
    INDEX: 'cms_index_v4',
    SCHEDULER: 'cms_scheduler_v4',
    SETTINGS: 'cms_settings_v4',
    AUTH: 'cms_auth_v4',
    DARK_MODE: 'cms_dark_mode_v4'
};
export const DEFAULT_USERS = [
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
export const DEFAULT_SETTINGS = {
    siteTitle: 'ExtensionTo Hub',
    siteDescription: 'Premium Browser Extensions Directory',
    postsPerPage: 10,
    autoPublish: true,
    seoOptimization: true,
    analyticsEnabled: true,
    backupSchedule: 'weekly'
};
export const DEFAULT_POSTS = [
    {
        id: 'welcome-to-extensionto',
        title: 'Welcome to ExtensionTo – Your Premium Extension Hub',
        excerpt: 'Discover the future of browser extensions with our curated, high-performance directory.',
        content: `<h2>Why ExtensionTo Matters</h2>
             <p>In today's digital landscape, your browser is your primary workspace. Every extension you install affects your productivity, privacy, and overall experience.</p>
             <h2>Our Commitment to Excellence</h2>
             <p>We don't just list extensions – we curate them. Each tool in our directory undergoes rigorous testing for performance impact and privacy standards.</p>`,
        category: 'Announcements',
        tags: 'welcome, introduction, premium',
        date: 'January 5, 2025',
        publishDate: '2025-01-05T10:00:00Z',
        readTime: '3 min read',
        image: 'https://images.unsplash.com/photo-1496065187959-7f07b8353c55?auto=format&fit=crop&q=80',
        status: 'published',
        featured: true,
        seoTitle: 'Welcome to ExtensionTo – Premium Browser Extensions Hub',
        seoDesc: 'Discover curated, high-performance browser extensions.',
        seoKeywords: 'browser extensions, premium tools, productivity',
        wordCount: 150,
        readingTime: 1,
        seoScore: 95,
        views: 0
    }
];
export const DEFAULT_EXTENSIONS = [
    {
        id: 'cookie-banner-blocker',
        name: 'Cookie Banner Blocker Pro',
        description: 'Privacy-focused extension to block annoying cookie consent popups and banners automatically.',
        category: 'Security',
        rating: 4.8,
        downloads: 1520,
        icon: '🍪',
        storeUrl: 'https://chromewebstore.google.com/detail/cookie-banner-blocker-pri/mlmiefaloipcahfcgfbccadnnjgpipge'
    },
    {
        id: 'offline-reader-pro',
        name: 'Offline Reader Pro',
        description: 'Save articles and web pages for distraction-free offline reading with advanced formatting.',
        category: 'Productivity',
        rating: 4.7,
        downloads: 840,
        icon: '📖',
        storeUrl: 'https://chromewebstore.google.com/detail/offline-reader-pro/bgbojccanmjdniomhccefkakjaedajhf'
    },
    {
        id: 'securakey-pro',
        name: 'Securakey Pro Password Manager',
        description: 'Enterprise-grade password management and secure vault for your digital identities.',
        category: 'Security',
        rating: 4.9,
        downloads: 2100,
        icon: '🔑',
        storeUrl: 'https://chromewebstore.google.com/detail/securakey-pro-password-ma/omeencccnkninlofbggfcfiohapajhgi'
    },
    {
        id: 'protab-suspender',
        name: 'ProTab Suspender Memory Saver',
        description: 'Reduce browser memory footprint by suspending inactive tabs and boosting overall performance.',
        category: 'Performance',
        rating: 4.8,
        downloads: 3200,
        icon: '⚡',
        storeUrl: 'https://chromewebstore.google.com/detail/protab-suspender-memory-s/gghjdfjjffegohpjhmcmgeonmcomilgj'
    },
    {
        id: 'light-popup-blocker',
        name: 'Light Popup Blocker',
        description: 'Ultra-lightweight engine to block intrusive popups and redirects without slowing down your browser.',
        category: 'Security',
        rating: 4.7,
        downloads: 1100,
        icon: '🛡️',
        storeUrl: 'https://chromewebstore.google.com/detail/light-popup-blocker/oimngcokgckajdlphggpjpbeljoakpii'
    },
    {
        id: 'formula-builder-pro',
        name: 'Formula Builder Pro',
        description: 'Advanced calculator and formula builder for spreadsheet enthusiasts and data scientists.',
        category: 'Productivity',
        rating: 4.6,
        downloads: 450,
        icon: '🧪',
        storeUrl: 'https://chromewebstore.google.com/detail/formula-builder-pro/ecmfloopolmkamoklcepdonahkigjlnn'
    },
    {
        id: 'auto-dark-mode',
        name: 'Auto Dark Mode Switcher',
        description: 'Smart customization tool that toggles dark mode based on your local time or system settings.',
        category: 'Customization',
        rating: 4.8,
        downloads: 1900,
        icon: '🌙',
        storeUrl: 'https://chromewebstore.google.com/detail/auto-dark-mode-switcher-u/obbhliekbfgpcdippngphefofiicgjml'
    },
    {
        id: 'redirect-shield',
        name: 'Redirect Shield',
        description: 'Stop automatic redirects and protect your browsing session from malicious navigation attempts.',
        category: 'Security',
        rating: 4.9,
        downloads: 750,
        icon: '🛡️',
        storeUrl: 'https://chromewebstore.google.com/detail/redirect-shield-stop-auto/pofolffdhjffglfphiagpbnlegjbnbhp'
    },
    {
        id: 'quick-screenshot-lite',
        name: 'Quick Screenshot Lite',
        description: 'Capture, annotate, and share screenshots instantly with a minimal memory footprint.',
        category: 'Tools',
        rating: 4.7,
        downloads: 1400,
        icon: '📸',
        storeUrl: 'https://chromewebstore.google.com/detail/quick-screenshot-lite/hddickadgkbfpcelmckpjhcfnoeognee'
    }
];
export const INITIAL_ANALYTICS = [
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
//# sourceMappingURL=constants.js.map