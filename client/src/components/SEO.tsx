import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "article" | "profile";
  siteName?: string;
  twitterCard?: "summary" | "summary_large_image";
  structuredData?: object;
}

const DEFAULT_TITLE = "Cannabis Fantasy League - The Official Metagame";
const DEFAULT_DESCRIPTION = "Draft your team of manufacturers, strains, and pharmacies. Compete against other players based on real German cannabis market performance data.";
const DEFAULT_IMAGE = "/og-image.png";
const SITE_NAME = "Cannabis Fantasy League";

export function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  url = typeof window !== "undefined" ? window.location.href : "",
  type = "website",
  siteName = SITE_NAME,
  twitterCard = "summary_large_image",
  structuredData
}: SEOProps) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
  const fullImage = image.startsWith("http") ? image : `${typeof window !== "undefined" ? window.location.origin : ""}${image}`;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:url" content={url} />
      <meta property="og:site_name" content={siteName} />

      {/* Twitter */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImage} />

      {/* Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
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
