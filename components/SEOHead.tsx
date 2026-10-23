import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SEOHeadProps {
  title: string;
  description: string;
  canonicalPath?: string;
  image?: string;
  robots?: string;
  schema?: Record<string, any> | Array<Record<string, any>>;
}

export const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description,
  canonicalPath,
  image = '/images/re-hunter-350.jpg',
  robots = 'index, follow',
  schema
}) => {
  const location = useLocation();
  const currentPath = canonicalPath || location.pathname;
  const canonicalUrl = `https://rydeit.in${currentPath === '/' ? '' : currentPath}`;
  const fullImageUrl = image.startsWith('http') ? image : `https://rydeit.in${image.startsWith('/') ? '' : '/'}${image}`;

  useEffect(() => {
    // 1. Update Document Title
    document.title = title;

    // 2. Helper to set or create meta tag
    const setMetaTag = (attrName: string, attrVal: string, content: string) => {
      let element = document.querySelector(`meta[${attrName}="${attrVal}"]`) as HTMLMetaElement | null;
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attrName, attrVal);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // 3. Update Standard & Social Meta
    setMetaTag('name', 'description', description);
    setMetaTag('name', 'robots', robots);
    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:url', canonicalUrl);
    setMetaTag('property', 'og:site_name', 'Rydeit');
    setMetaTag('property', 'og:image', fullImageUrl);
    setMetaTag('name', 'twitter:title', title);
    setMetaTag('name', 'twitter:description', description);
    setMetaTag('name', 'twitter:image', fullImageUrl);

    // 4. Update Canonical Link
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonicalUrl);

    // 5. Update or Inject Schema JSON-LD
    let scriptTag = document.getElementById('seo-schema') as HTMLScriptElement | null;
    if (schema) {
      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.id = 'seo-schema';
        scriptTag.type = 'application/ld+json';
        document.head.appendChild(scriptTag);
      }
      scriptTag.text = JSON.stringify(schema);
    } else if (scriptTag) {
      scriptTag.remove();
    }
  }, [title, description, canonicalUrl, fullImageUrl, robots, schema]);

  return null;
};
