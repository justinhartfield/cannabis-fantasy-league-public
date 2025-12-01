import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Shield,
  Lock,
  Eye,
  Database,
  FileText,
  BarChart3,
  UserX,
  CheckCircle,
  ExternalLink,
  Scale,
} from "lucide-react";

export default function Privacy() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8 pb-24">
      {/* Header */}
      <div className="text-center space-y-4 mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-weed-green/10 border border-weed-green/20 mb-4">
          <Shield className="w-8 h-8 text-weed-green" />
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-weed-green to-weed-coral bg-clip-text text-transparent">
          Privacy Policy
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Your privacy matters. Here's how we handle your data.
        </p>
        <Badge variant="outline" className="text-xs">
          Last updated: November 2025
        </Badge>
      </div>

      {/* Key Promise Card */}
      <Card className="border-weed-green/30 bg-gradient-to-br from-weed-green/5 to-transparent">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-weed-green/20 flex items-center justify-center">
              <Lock className="w-6 h-6 text-weed-green" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                Our Core Promise
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                <strong className="text-foreground">
                  CFL uses aggregated, anonymous performance indicators—no personal data.
                </strong>
              </p>
              <p className="mt-3 text-muted-foreground">
                All scoring and statistics in the Cannabis Fantasy League are derived from
                aggregated market data that cannot be traced back to individual users or
                transactions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GDPR Section */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Scale className="w-6 h-6 text-primary" />
            <CardTitle>Legal Basis: GDPR Compliance</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-foreground mb-2">
                  GDPR Recital 26 – Anonymous Data
                </h3>
                <blockquote className="text-sm text-muted-foreground italic border-l-2 border-primary/50 pl-4">
                  "The principles of data protection should therefore not apply to anonymous
                  information, namely information which does not relate to an identified or
                  identifiable natural person or to personal data rendered anonymous in such a
                  manner that the data subject is not or no longer identifiable."
                </blockquote>
                <p className="mt-3 text-sm text-muted-foreground">
                  Since CFL exclusively uses aggregated, anonymized market data that cannot
                  identify individuals, this data falls outside the scope of GDPR personal
                  data regulations as defined in Recital 26.
                </p>
              </div>
            </div>
          </div>

          <a
            href="https://gdpr-info.eu/recitals/no-26/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ExternalLink className="w-4 h-4" />
            Read full GDPR Recital 26 text
          </a>
        </CardContent>
      </Card>

      {/* What We Collect */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Database className="w-6 h-6 text-blue-500" />
            <CardTitle>What Data We Use</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-foreground">
                  Aggregated Market Statistics
                </h4>
                <p className="text-sm text-muted-foreground">
                  Total sales volumes, order counts, and market share percentages
                  aggregated across all users and transactions.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-foreground">
                  Bucketed Performance Indicators
                </h4>
                <p className="text-sm text-muted-foreground">
                  Data is rounded and bucketed (e.g., "100-500 orders") to prevent
                  identification of specific entities or patterns.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-foreground">
                  Time-Delayed Statistics
                </h4>
                <p className="text-sm text-muted-foreground">
                  All metrics are calculated with appropriate time delays to ensure
                  data cannot be correlated with real-time activities.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* What We Don't Collect */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <UserX className="w-6 h-6 text-red-500" />
            <CardTitle>What We Don't Use</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {[
              "Individual transaction records",
              "Personal customer information",
              "Real-time order data",
              "Location-specific information below city level",
              "Any data that could identify individual users",
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-red-500/50" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Transparency Section */}
      <Card className="border-weed-coral/20 bg-gradient-to-br from-weed-coral/5 to-transparent">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Eye className="w-6 h-6 text-weed-coral" />
            <CardTitle>In-Product Transparency</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            We believe in complete transparency about how scores are calculated. Every
            point in CFL can be traced back to its source metric.
          </p>

          <div className="p-4 rounded-lg bg-black/20 border border-white/10">
            <div className="flex items-start gap-3">
              <BarChart3 className="w-5 h-5 text-weed-coral mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-foreground mb-2">
                  "Why did I get these points?"
                </h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Click on any score in the app to see a detailed breakdown showing:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1.5 ml-4">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-weed-green" />
                    The exact metric used (e.g., "7-day order count")
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-weed-green" />
                    The data bucket (e.g., "rounded & bucketed: 250-500")
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-weed-green" />
                    The scoring formula applied
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-weed-green" />
                    Any bonuses or multipliers
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Opt-Out Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-purple-500" />
            <CardTitle>Brand & Pharmacy Opt-Out</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Brands and pharmacies can opt out of being highlighted in promotional assets
            while still participating in the aggregated statistics.
          </p>

          <div className="p-4 rounded-lg bg-muted/30 border border-border">
            <h4 className="font-semibold text-foreground mb-2">What opt-out means:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>
                  <strong className="text-foreground">Remains included:</strong> Aggregated
                  statistics and normal gameplay scoring
                </span>
              </li>
              <li className="flex items-start gap-2">
                <UserX className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span>
                  <strong className="text-foreground">Opted out from:</strong> Featured
                  spots, promotional highlights, and marketing materials
                </span>
              </li>
            </ul>
          </div>

          <p className="text-sm text-muted-foreground">
            To request opt-out for your brand or pharmacy, please{" "}
            <a href="/contact" className="text-primary hover:underline">
              contact us
            </a>
            .
          </p>
        </CardContent>
      </Card>

      {/* Account Data */}
      <Card>
        <CardHeader>
          <CardTitle>Your Account Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            When you create a CFL account, we store minimal information necessary for
            the service:
          </p>
          <ul className="space-y-2 text-muted-foreground">
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary/50" />
              Username and display name
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary/50" />
              Email address (for account recovery)
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary/50" />
              Game statistics (your picks, scores, achievements)
            </li>
          </ul>
          <Separator className="my-4" />
          <p className="text-sm text-muted-foreground">
            You can request deletion of your account and all associated data at any time
            through your profile settings or by contacting us.
          </p>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card className="border-border">
        <CardContent className="pt-6">
          <div className="text-center space-y-3">
            <p className="text-muted-foreground">
              Questions about our privacy practices?
            </p>
            <a
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              Contact Our Privacy Team
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}





