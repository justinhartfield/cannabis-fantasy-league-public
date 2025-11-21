import { Button } from "@/components/ui/button";
import { Share2, Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface SocialShareProps {
  title: string;
  text: string;
  url?: string;
  className?: string;
}

export function SocialShare({ title, text, url = window.location.href, className }: SocialShareProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url,
        });
        return;
      } catch (error) {
        console.log("Error sharing:", error);
      }
    }

    // Fallback: Copy to clipboard
    handleCopy();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`${title}\n${text}\n${url}`);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      <Button variant="outline" size="sm" onClick={handleShare}>
        <Share2 className="w-4 h-4 mr-2" />
        Share
      </Button>
      
      {!navigator.share && (
        <Button variant="ghost" size="icon" onClick={handleCopy}>
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        </Button>
      )}
    </div>
  );
}


