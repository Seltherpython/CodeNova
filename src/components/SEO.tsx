import { Helmet } from 'react-helmet-async';
import { useEffect, useState } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogType?: 'website' | 'article';
}

export default function SEO({ 
  title, 
  description = 'Repo Trace is a professional tool to understand any GitHub project. Get fast, clear, and free code analysis for developers and AI enthusiasts alike.', 
  canonical,
  ogType = 'website'
}: SEOProps) {
  const [hostname, setHostname] = useState('Repo Trace.ai');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentHost = window.location.hostname;
      if (currentHost !== 'localhost' && currentHost !== '127.0.0.1' && currentHost !== '') {
        setHostname(currentHost);
      } else {
        setHostname('Repo Trace.ai');
      }
    }
  }, []);

  const siteName = 'Repo Trace';
  
  // SEO Fix: Ensure title is longer and more descriptive than 11 characters
  const displayTitle = title 
    ? (title.length < 30 ? `${title} | ${siteName} - Advanced Repository Insights` : title)
    : `${siteName} | Professional GitHub Code Analysis and Help`;

  const cleanPath = window.location.pathname.endsWith('/') && window.location.pathname.length > 1 
    ? window.location.pathname.slice(0, -1) 
    : window.location.pathname;

  const fullCanonical = canonical || `https://${hostname}${cleanPath}`;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{displayTitle}</title>
      <meta name="title" content={displayTitle} />
      <meta name="description" content={description} />
      <link rel="canonical" href={fullCanonical} />

      {/* Language & Publisher */}
      <html lang="en" />
      <meta name="author" content="Repo Trace" />
      <link rel="publisher" href={`https://${hostname}`} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={fullCanonical} />
      <meta property="og:title" content={displayTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={`https://${hostname}/og-image.png`} />
      <meta property="og:site_name" content={siteName} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={fullCanonical} />
      <meta property="twitter:title" content={displayTitle} />
      <meta property="twitter:description" content={description} />
      
      {/* Canonical URL */}
      <link rel="canonical" href="https://www.repodata.vercel.app" />

      {/* Security & Crawling */}
      <meta name="robots" content="index, follow" />
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      
      {/* Keywords Audit */}
      <meta name="keywords" content="AI, Code Help, GitHub Scan, Developer Tools, Simple Analysis, Project Helper" />
    </Helmet>
  );
}
