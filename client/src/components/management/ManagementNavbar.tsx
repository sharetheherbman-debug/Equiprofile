/**
 * ManagementNavbar — Premium navigation for equiprofile.online
 *
 * Shows: About · Features · Pricing · Contact | Login · Get Started
 * Permanent rich navy background, premium feel, serif logo.
 */
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

const navLinks = [
  { label: "About", path: "/about" },
  { label: "Features", path: "/features" },
  { label: "Pricing", path: "/pricing" },
  { label: "Contact", path: "/contact" },
];

export function ManagementNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [location] = useLocation();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-[#1e3a5f]/98 backdrop-blur-xl shadow-lg shadow-black/10 border-b border-white/[0.06]"
          : "bg-gradient-to-b from-[#1e3a5f]/95 to-[#1e3a5f]/80 backdrop-blur-md"
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-[72px]">
          {/* Logo */}
          <Link
            href={isAuthenticated ? "/dashboard" : "/"}
            className="flex items-center gap-3 group"
          >
            <img
              src="/logo.png"
              alt="EquiProfile"
              className="h-11 w-auto object-contain drop-shadow-sm"
            />
            <div className="flex flex-col">
              <span className="text-xl font-bold text-white tracking-tight font-serif leading-none">
                EquiProfile
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = location === link.path;
              return (
                <Link
                  key={link.path}
                  href={link.path}
                  className={`relative px-4 py-2 text-[13px] font-medium tracking-wide rounded-lg transition-all duration-200 ${
                    isActive
                      ? "text-white"
                      : "text-white/70 hover:text-white hover:bg-white/[0.06]"
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <motion.div
                      layoutId="mgmt-nav-indicator"
                      className="absolute bottom-0 left-3 right-3 h-[2px] bg-gradient-to-r from-[#1a7a6d] to-[#2e6da4] rounded-full"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center gap-3">
            {isAuthenticated ? (
              <Link href="/dashboard">
                <Button
                  size="sm"
                  className="bg-white/10 hover:bg-white/15 text-white border border-white/10 backdrop-blur-sm"
                >
                  Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/80 hover:text-white hover:bg-white/[0.06]"
                  >
                    Log In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-[#2e6da4] to-[#3a8dc7] hover:from-[#3578b0] hover:to-[#4a9dd7] text-white shadow-lg shadow-blue-900/25 border-0"
                  >
                    Start Free Trial
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Toggle */}
          <button
            className="lg:hidden p-2.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mgmt-mobile"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="lg:hidden bg-[#1e3a5f] border-t border-white/[0.06] overflow-hidden"
          >
            <div className="container mx-auto px-4 py-4 flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  href={link.path}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    location === link.path
                      ? "text-white bg-white/10"
                      : "text-white/70 hover:text-white hover:bg-white/[0.06]"
                  }`}
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-white/10">
                {isAuthenticated ? (
                  <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                    <Button className="w-full bg-white/10 hover:bg-white/15 text-white border border-white/10">
                      Dashboard
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link href="/login" onClick={() => setMobileOpen(false)}>
                      <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
                        Log In
                      </Button>
                    </Link>
                    <Link href="/register" onClick={() => setMobileOpen(false)}>
                      <Button className="w-full bg-gradient-to-r from-[#2e6da4] to-[#3a8dc7] text-white">
                        Start Free Trial
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
