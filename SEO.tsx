import { useEffect } from 'react';
import { site } from './toolsData';

type JsonLdSchema = object | object[];

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  schema?: JsonLdSchema;
  image?: string;
  keywords?: string;
  robots?: string;
}

const setMetaTag = (attr: 'name' | 'property', key: string, content: string) => {
  const head = document.head;
  const selector = `meta[${attr}="${key}"]`;
  const elements = Array.from(head.querySelectorAll(selector)) as HTMLMetaElement[];

  let element = elements[0] ?? null;
  elements.slice(1).forEach((duplicate) => duplicate.remove());

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attr, key);
    head.appendChild(element);
  }

  element.setAttribute('content', content);
  element.setAttribute('data-seo-managed', 'true');
};

const removeMetaTag = (attr: 'name' | 'property', key: string) => {
  document.head
    .querySelectorAll(`meta[${attr}="${key}"]`)
    .forEach((element) => element.remove());
};

const setLinkTag = (rel: string, href: string) => {
  const head = document.head;
  const selector = `link[rel="${rel}"]`;
  const elements = Array.from(head.querySelectorAll(selector)) as HTMLLinkElement[];

  let element = elements[0] ?? null;
  elements.slice(1).forEach((duplicate) => duplicate.remove());

  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    head.appendChild(element);
  }

  element.setAttribute('href', href);
  element.setAttribute('data-seo-managed', 'true');
};

const removeManagedSchemaScripts = () => {
  document.head
    .querySelectorAll('script[data-seo-schema]')
    .forEach((element) => element.remove());
};

const setSchemaScript = (schema: JsonLdSchema) => {
  const head = document.head;
  const existing = head.querySelector('script[data-seo-schema]') as HTMLScriptElement | null;

  if (existing) {
    existing.textContent = JSON.stringify(schema);
    return;
  }

  const script = document.createElement('script');
  script.setAttribute('type', 'application/ld+json');
  script.setAttribute('data-seo-schema', 'true');
  script.textContent = JSON.stringify(schema);
  head.appendChild(script);
};

export const SEO = ({ title, description, canonical, schema, image, keywords, robots }: SEOProps) => {
  useEffect(() => {
    const siteName = site.name || 'Zyphoric';
    const pageTitle = title.includes(siteName) ? title : `${title} | ${siteName}`;
    const pageUrl = canonical
      ? new URL(canonical, site.baseUrl).toString()
      : new URL(window.location.pathname, site.baseUrl).toString();
    const resolvedImage = image
      ? new URL(image, site.baseUrl).toString()
      : new URL('/zyphoric-og-image.png', site.baseUrl).toString();
    const resolvedSocialImage = image
      ? resolvedImage
      : new URL('/zyphoric-social-preview.png', site.baseUrl).toString();

    document.title = pageTitle;

    setMetaTag('name', 'application-name', siteName);
    setMetaTag('name', 'apple-mobile-web-app-title', siteName);
    setMetaTag('name', 'description', description);
    setMetaTag('name', 'theme-color', '#0f2549');
    setMetaTag('name', 'color-scheme', 'dark light');
    setMetaTag('name', 'robots', robots ?? 'index, follow, max-image-preview:large');

    if (keywords) {
      setMetaTag('name', 'keywords', keywords);
    } else {
      removeMetaTag('name', 'keywords');
    }

    setLinkTag('canonical', pageUrl);

    setMetaTag('property', 'og:title', pageTitle);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:type', 'website');
    setMetaTag('property', 'og:url', pageUrl);
    setMetaTag('property', 'og:site_name', siteName);
    setMetaTag('property', 'og:locale', 'en_US');
    setMetaTag('property', 'og:image', resolvedImage);
    setMetaTag('property', 'og:image:secure_url', resolvedImage);
    setMetaTag('property', 'og:image:type', 'image/png');
    setMetaTag('property', 'og:image:width', '1200');
    setMetaTag('property', 'og:image:height', '630');
    setMetaTag('property', 'og:image:alt', `${siteName} preview image`);

    setMetaTag('name', 'twitter:card', 'summary_large_image');
    removeMetaTag('name', 'twitter:site');
    removeMetaTag('name', 'twitter:creator');
    setMetaTag('name', 'twitter:url', pageUrl);
    setMetaTag('name', 'twitter:title', pageTitle);
    setMetaTag('name', 'twitter:description', description);
    setMetaTag('name', 'twitter:image', resolvedSocialImage);
    setMetaTag('name', 'twitter:image:alt', `${siteName} preview image`);

    if (schema) {
      setSchemaScript(schema);
    } else {
      removeManagedSchemaScripts();
    }

    return () => {
      removeManagedSchemaScripts();
    };
  }, [title, description, canonical, schema, image, keywords, robots]);

  return null;
};
