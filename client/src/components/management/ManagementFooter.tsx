/**
 * ManagementFooter — Premium footer for equiprofile.online
 *
 * Rich navy background, management-focused links, subtle cross-link to School.
 */
import { Link } from "wouter";
import { Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ManagementFooter({ hidePreFooterCta = false }: { hidePreFooterCta?: boolean }) {
  return (
    <footer className="relative bg-[#0a1628] text-gray-300 overflow-hidden">
      {/* Pre-footer CTA strip — hidden on pages where the form/content IS the conversion action (e.g. Contact) */}
      {!hidePreFooterCta && (
      <div className="relative border-b border-white/[0.06] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#0e2040] via-[#142b52] to-[#0e2040]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_100%_at_50%_0%,_rgba(197,165,90,0.06)_0%,_transparent_100%)]" />
        <div className="relative container mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 max-w-4xl mx-auto text-center sm:text-left">
            <div>
              <p className="text-white font-bold text-lg font-serif">
                Ready to get started?
              </p>
              <p className="text-white/40 text-sm mt-0.5">
                7-day free trial · No credit card required
              </p>
            </div>
            <Link href="/register">
              <Button
                size="lg"
                className="bg-[#c5a55a] hover:bg-[#d4b468] text-[#0f1d2e] font-bold px-8 h-11 rounded-full shadow-lg shadow-[#c5a55a]/20 border-0 transition-all duration-200 hover:-translate-y-0.5 whitespace-nowrap flex-shrink-0"
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
      )}

      {/* Subtle top gradient line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#2e6da4]/30 to-transparent" />

      {/* Decorative glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-[#2e6da4]/4 rounded-full blur-3xl pointer-events-none" />

      <div className="container relative mx-auto px-4 sm:px-6 pt-14 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-3 mb-5 group">
              <img
                src="/logo.png"
                alt="EquiProfile"
                className="h-9 w-auto object-contain opacity-90 group-hover:opacity-100 transition-opacity"
              />
              <div className="flex flex-col">
                <span className="text-base font-bold font-serif text-white leading-none">
                  EquiProfile
                </span>
              </div>
            </Link>
            <p className="text-sm text-gray-500 leading-relaxed mb-5 max-w-xs">
              Professional horse management platform. Health tracking,
              training logs, nutrition plans, and complete stable operations
              — all in one premium system.
            </p>
            <a
              href="mailto:hello@equiprofile.online"
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#4a9eca] transition-colors"
            >
              <Mail className="w-3.5 h-3.5" /> hello@equiprofile.online
            </a>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-xs font-bold text-white/80 uppercase tracking-[0.18em] mb-4">
              Product
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/features" className="text-gray-500 hover:text-white transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-gray-500 hover:text-white transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/for-stables" className="text-gray-500 hover:text-white transition-colors">
                  Stable Landing
                </Link>
              </li>
              <li>
                <Link href="/for-schools" className="text-gray-500 hover:text-white transition-colors">
                  School Landing
                </Link>
              </li>
              <li>
                <Link href="/ai-operations" className="text-gray-500 hover:text-white transition-colors">
                  AI Operations
                </Link>
              </li>
              <li>
                <Link href="/register" className="text-[#c5a55a]/80 hover:text-[#c5a55a] transition-colors font-medium">
                  Start Free Trial
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-xs font-bold text-white/80 uppercase tracking-[0.18em] mb-4">
              Company
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/about" className="text-gray-500 hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-500 hover:text-white transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <a href="https://school.equiprofile.online" className="text-gray-500 hover:text-white transition-colors">
                  EquiProfile Academy
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-bold text-white/80 uppercase tracking-[0.18em] mb-4">
              Legal
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/privacy" className="text-gray-500 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-500 hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/[0.05] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} EquiProfile.online · Part of{" "}
            <a
              href="https://amarktai.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-400 transition-colors"
            >
              Amarkt<span className="text-[#4a9eca] font-semibold">AI</span> Network
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
