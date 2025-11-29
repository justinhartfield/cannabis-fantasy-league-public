import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Mail,
  MessageSquare,
  Building2,
  Shield,
  HelpCircle,
  Bug,
  Send,
  CheckCircle,
} from "lucide-react";

type ContactReason =
  | "general"
  | "privacy"
  | "brand-optout"
  | "pharmacy-optout"
  | "bug"
  | "feedback";

const CONTACT_REASONS: { value: ContactReason; label: string; icon: typeof Mail }[] = [
  { value: "general", label: "General Inquiry", icon: HelpCircle },
  { value: "privacy", label: "Privacy Question", icon: Shield },
  { value: "brand-optout", label: "Brand Opt-Out Request", icon: Building2 },
  { value: "pharmacy-optout", label: "Pharmacy Opt-Out Request", icon: Building2 },
  { value: "bug", label: "Report a Bug", icon: Bug },
  { value: "feedback", label: "Feature Feedback", icon: MessageSquare },
];

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    reason: "" as ContactReason | "",
    entityName: "",
    message: "",
  });

  const showEntityField = ["brand-optout", "pharmacy-optout"].includes(formData.reason);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsSubmitting(false);
    setSubmitted(true);
    toast.success("Your message has been sent! We'll get back to you soon.");
  };

  if (submitted) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl pb-24">
        <Card className="border-weed-green/30 bg-gradient-to-br from-weed-green/5 to-transparent">
          <CardContent className="pt-12 pb-12">
            <div className="text-center space-y-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-weed-green/20 border border-weed-green/30">
                <CheckCircle className="w-10 h-10 text-weed-green" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">
                  Message Sent!
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Thank you for reaching out. We typically respond within 24-48 hours.
                </p>
              </div>
              <Button
                onClick={() => {
                  setSubmitted(false);
                  setFormData({
                    name: "",
                    email: "",
                    reason: "",
                    entityName: "",
                    message: "",
                  });
                }}
                variant="outline"
                className="mt-4"
              >
                Send Another Message
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl space-y-8 pb-24">
      {/* Header */}
      <div className="text-center space-y-4 mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-weed-coral/10 border border-weed-coral/20 mb-4">
          <Mail className="w-8 h-8 text-weed-coral" />
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-weed-green to-weed-coral bg-clip-text text-transparent">
          Contact Us
        </h1>
        <p className="text-xl text-muted-foreground max-w-lg mx-auto">
          Have a question or request? We're here to help.
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-3">
        <Card
          className="cursor-pointer hover:border-weed-green/50 transition-colors"
          onClick={() => setFormData((prev) => ({ ...prev, reason: "privacy" }))}
        >
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <h3 className="font-medium text-sm text-foreground">Privacy</h3>
                <p className="text-xs text-muted-foreground">Data questions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-weed-green/50 transition-colors"
          onClick={() => setFormData((prev) => ({ ...prev, reason: "brand-optout" }))}
        >
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h3 className="font-medium text-sm text-foreground">Opt-Out</h3>
                <p className="text-xs text-muted-foreground">Brand/Pharmacy</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contact Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Send a Message
          </CardTitle>
          <CardDescription>
            Fill out the form below and we'll get back to you as soon as possible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name & Email Row */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Your name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  required
                />
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">What's this about?</Label>
              <Select
                value={formData.reason}
                onValueChange={(value: ContactReason) =>
                  setFormData((prev) => ({ ...prev, reason: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_REASONS.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      <div className="flex items-center gap-2">
                        <reason.icon className="w-4 h-4 text-muted-foreground" />
                        {reason.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Entity Name (for opt-out requests) */}
            {showEntityField && (
              <div className="space-y-2">
                <Label htmlFor="entityName">
                  {formData.reason === "brand-optout" ? "Brand Name" : "Pharmacy Name"}
                </Label>
                <Input
                  id="entityName"
                  placeholder={
                    formData.reason === "brand-optout"
                      ? "Enter your brand name"
                      : "Enter your pharmacy name"
                  }
                  value={formData.entityName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, entityName: e.target.value }))
                  }
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Please provide the exact name as it appears in the CFL app.
                </p>
              </div>
            )}

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder={
                  formData.reason === "brand-optout" || formData.reason === "pharmacy-optout"
                    ? "Please provide any additional details about your opt-out request..."
                    : "Tell us more about your inquiry..."
                }
                value={formData.message}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, message: e.target.value }))
                }
                rows={5}
                required
              />
            </div>

            {/* Opt-Out Info Box */}
            {showEntityField && (
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <h4 className="font-medium text-sm text-foreground mb-2">
                  About Opt-Out Requests
                </h4>
                <ul className="text-xs text-muted-foreground space-y-1.5">
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-weed-green mt-1.5" />
                    Your entity will remain in aggregated statistics (normal gameplay)
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-weed-coral mt-1.5" />
                    You'll be excluded from featured spots and promotional materials
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                    Requests are typically processed within 5-7 business days
                  </li>
                </ul>
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              className="w-full gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Message
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Direct Contact */}
      <Card className="border-border bg-muted/30">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Prefer direct email?
            </p>
            <a
              href="mailto:support@cfl.app"
              className="text-primary hover:underline font-medium"
            >
              support@cfl.app
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

