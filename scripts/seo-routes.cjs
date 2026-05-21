const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const toolsPath = path.join(root, 'tools.json');
const data = JSON.parse(fs.readFileSync(toolsPath, 'utf8'));

const site = data.site || {};
const siteName = site.name || 'DevTools Hub AI';
const baseUrl = (site.baseUrl || 'https://devtools-hubpro.netlify.app').replace(/\/$/, '');
const ogImage = `${baseUrl}/icon-512.png`;

const withBrand = (title) => (title.includes(siteName) ? title : `${title} | ${siteName}`);

const staticRoutes = [
  {
    path: '/',
    title: 'Professional Developer Tools',
    description:
      'Use browser-first developer tools for JSON formatting, JWT decoding, regex testing, SQL formatting, Base64 conversion, and AI-assisted code workflows.',
    keywords:
      'developer tools, ai developer tools, online json formatter, jwt decoder, regex tester, sql formatter',
    priority: '1.0',
    changefreq: 'weekly',
    type: 'WebSite',
  },
  {
    path: '/articles',
    title: 'Developer Guides & Articles',
    description:
      'Read practical developer guides for JWT debugging, JSON formatting, SQL cleanup, regex validation, and AI-assisted code review workflows.',
    keywords:
      'developer guides, coding best practices, ai developer tools, json formatting guide, jwt debugging',
    priority: '0.7',
    changefreq: 'monthly',
    type: 'CollectionPage',
  },
  {
    path: '/about',
    title: 'About DevTools Hub AI',
    description:
      'Learn about DevTools Hub AI, a browser-first developer toolkit for JSON formatting, JWT decoding, regex testing, SQL formatting, and AI-assisted code workflows.',
    keywords:
      'about DevTools Hub AI, developer tools, AI developer utilities, browser developer tools',
    priority: '0.6',
    changefreq: 'yearly',
    type: 'AboutPage',
  },
  {
    path: '/contact',
    title: 'Contact DevTools Hub AI',
    description:
      'Contact DevTools Hub AI for product support, privacy questions, bug reports, partnership requests, and general developer tool feedback.',
    keywords: 'contact DevTools Hub AI, developer tools support, privacy contact, bug report',
    priority: '0.6',
    changefreq: 'yearly',
    type: 'ContactPage',
  },
  {
    path: '/privacy',
    title: 'Privacy Policy',
    description:
      'Privacy Policy for DevTools Hub AI, covering local browser processing, AI requests, analytics, cookies, Google advertising disclosures, and user choices.',
    keywords:
      'privacy policy, Google AdSense privacy, developer tool privacy, browser-based tools',
    priority: '0.5',
    changefreq: 'yearly',
    type: 'PrivacyPolicy',
  },
  {
    path: '/terms',
    title: 'Terms of Service',
    description:
      'Terms of Service for DevTools Hub AI, including acceptable use, AI output review, service limits, advertising, and liability terms.',
    keywords: 'terms of service, acceptable use policy, developer tools terms, AI tools terms',
    priority: '0.5',
    changefreq: 'yearly',
    type: 'WebPage',
  },
];

const toolRoutes = (data.tools || []).map((tool) => ({
  path: tool.path,
  title: tool.seoTitle || tool.name,
  description: tool.seoDescription || tool.desc,
  keywords: tool.keywords || '',
  priority: tool.category === 'AI' ? '0.9' : '0.8',
  changefreq: 'monthly',
  type: 'WebApplication',
  tool,
}));

const notFoundRoute = {
  path: '/404',
  title: '404 - Page Not Found',
  description:
    'This page could not be found. Return to the hub or jump directly to popular developer tools.',
  robots: 'noindex, follow',
  priority: '0.0',
  changefreq: 'yearly',
  type: 'WebPage',
};

const routes = [...staticRoutes.slice(0, 1), ...toolRoutes, ...staticRoutes.slice(1)];

const urlFor = (routePath) => `${baseUrl}${routePath === '/' ? '/' : routePath}`;

const breadcrumbSchema = (route) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: `${baseUrl}/`,
    },
    ...(route.path === '/'
      ? []
      : [
          {
            '@type': 'ListItem',
            position: 2,
            name: route.tool?.name || route.title,
            item: urlFor(route.path),
          },
        ]),
  ],
});

const schemaForRoute = (route) => {
  const page = {
    '@context': 'https://schema.org',
    '@type': route.type || 'WebPage',
    name: withBrand(route.title),
    description: route.description,
    url: urlFor(route.path),
    isPartOf: {
      '@type': 'WebSite',
      name: siteName,
      url: `${baseUrl}/`,
    },
  };

  const schema = [page, breadcrumbSchema(route)];

  if (route.path === '/') {
    page.potentialAction = {
      '@type': 'SearchAction',
      target: `${baseUrl}/?q={search_term_string}`,
      queryInput: 'required name=search_term_string',
    };
    if (data.faqs?.length) {
      schema.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: data.faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.q,
          acceptedAnswer: { '@type': 'Answer', text: faq.a },
        })),
      });
    }
  }

  if (route.tool?.faqs?.length) {
    schema.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: route.tool.faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.q,
        acceptedAnswer: { '@type': 'Answer', text: faq.a },
      })),
    });
  }

  return schema.length === 1 ? schema[0] : schema;
};

module.exports = {
  site,
  siteName,
  baseUrl,
  ogImage,
  routes,
  notFoundRoute,
  urlFor,
  withBrand,
  schemaForRoute,
};
