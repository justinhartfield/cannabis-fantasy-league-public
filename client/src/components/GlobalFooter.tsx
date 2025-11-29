import { Link } from "wouter";
import { FileText, Shield, Mail } from "lucide-react";

export function GlobalFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="app-footer border-t border-white/10 bg-black/40 backdrop-blur-sm">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6">
        {/* Main Footer Links */}
        <nav className="flex flex-wrap items-center justify-center gap-2 sm:gap-6 mb-4">
          <Link
            href="/rules"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
          >
            <FileText className="w-4 h-4" />
            <span>Rules & About</span>
          </Link>

          <span className="hidden sm:block text-white/20">|</span>

          <Link
            href="/privacy"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
          >
            <Shield className="w-4 h-4" />
            <span>Privacy Policy</span>
          </Link>

          <span className="hidden sm:block text-white/20">|</span>

          <Link
            href="/contact"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
          >
            <Mail className="w-4 h-4" />
            <span>Contact</span>
          </Link>
        </nav>

        {/* Copyright and Branding */}
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-xs text-muted-foreground/70">
            © {currentYear} Cannabis Fantasy League. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground/50">
            Powered by aggregated, anonymous market data.
          </p>
        </div>
      </div>
    </footer>
  );
}

