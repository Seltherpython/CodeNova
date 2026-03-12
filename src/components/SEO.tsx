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
  description = 'Transform any GitHub repository into LLM-ready perception datasets. The ultimate ingestion protocol for the next generation of agentic coding workflows.', 
  canonical,
  ogType = 'website'
}: SEOProps) {
  const [hostname, setHostname] = useState('repodata.ai');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentHost = window.location.hostname;
      if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
        setHostname(currentHost);
      }
    }
  }, []);

  const siteName = 'Repodata AI';
  
  // SEO Fix: Ensure title is longer and more descriptive than 11 characters
  const displayTitle = title 
    ? (title.length < 20 ? `${title} | ${siteName} - Repository Intelligence` : title)
    : `${siteName} | High-Fidelity Repository Ingestion for Agents`;

  const fullCanonical = canonical || `https://${hostname}${window.location.pathname}`;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{displayTitle}</title>
      <meta name="title" content={displayTitle} />
      <meta name="description" content={description} />
      <link rel="canonical" href={fullCanonical} />

      {/* Language & Publisher */}
      <html lang="en" />
      <meta name="author" content="Repodata AI" />
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

      {/* Security & Crawling */}
      <meta name="robots" content="index, follow" />
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      
      {/* Keywords Audit */}
      <meta name="keywords" content="AI, LLM, Repository Ingestion, Agentic Coding, GitHub Data, Code Analysis, Perception Map, Development Tools" />
    </Helmet>
  );
}
