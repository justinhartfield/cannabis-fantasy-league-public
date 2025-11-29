import { useEffect } from "react";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "article" | "profile";
  siteName?: string;
  twitterCard?: "summary" | "summary_large_image";
}

const DEFAULT_TITLE = "Cannabis Fantasy League - The Official Metagame";
const DEFAULT_DESCRIPTION = "Draft your team of manufacturers, strains, and pharmacies. Compete against other players based on real German cannabis market performance data.";
const DEFAULT_IMAGE = "/og-image.png";
const SITE_NAME = "Cannabis Fantasy League";

export function SEO({ title, description = DEFAULT_DESCRIPTION, image = DEFAULT_IMAGE, url = typeof window !== "undefined" ? window.location.href : "", type = "website", siteName = SITE_NAME, twitterCard = "summary_large_image" }: SEOProps) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;

  useEffect(() => {
    document.title = fullTitle;
    const setMetaTag = (property: string, content: string, isName = false) => {
      const attribute = isName ? "name" : "property";
      let element = document.querySelector(`meta[${attribute}="${property}"]`);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, property);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };
    setMetaTag("description", description, true);
    setMetaTag("og:title", fullTitle);
    setMetaTag("og:description", description);
    setMetaTag("og:image", image.startsWith("http") ? image : `${window.location.origin}${image}`);
    setMetaTag("og:url", url);
    setMetaTag("og:type", type);
    setMetaTag("og:site_name", siteName);
    setMetaTag("twitter:card", twitterCard, true);
    setMetaTag("twitter:title", fullTitle, true);
    setMetaTag("twitter:description", description, true);
    setMetaTag("twitter:image", image.startsWith("http") ? image : `${window.location.origin}${image}`, true);
    return () => { document.title = DEFAULT_TITLE; };
  }, [fullTitle, description, image, url, type, siteName, twitterCard]);

  return null;
}

export function RankingsSEO({ category }: { category?: string }) {
  const categoryTitles: Record<string, string> = { manufacturer: "Top Cannabis Manufacturers", pharmacy: "Top Cannabis Pharmacies", brand: "Top Cannabis Brands", product: "Top Cannabis Products", strain: "Top Cannabis Strains" };
  const title = category && categoryTitles[category] ? categoryTitles[category] : "Cannabis Market Rankings";
  const description = category && categoryTitles[category] ? `Real-time rankings of ${categoryTitles[category].toLowerCase()} in the German medical cannabis market. Updated daily.` : "Official rankings of manufacturers, pharmacies, brands, and strains in the German medical cannabis market.";
  return <SEO title={title} description={description} />;
}

export function EntitySEO({ name, type, rank, score, imageUrl }: { name: string; type: string; rank: number; score: number; imageUrl?: string | null }) {
  const title = `${name} - Rank #${rank} ${type.charAt(0).toUpperCase() + type.slice(1)}`;
  const description = `${name} is ranked #${rank} with ${score.toLocaleString()} points in the Cannabis Fantasy League. View detailed performance history and statistics.`;
  return <SEO title={title} description={description} image={imageUrl || undefined} type="profile" />;
}

export function DisplayModeSEO() {
  return <SEO title="Live Leaderboard Display" description="Real-time cannabis market rankings display for events and venues." />;
}

