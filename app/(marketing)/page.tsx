'use client';

import { useState, useEffect, useRef, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { Check, Zap, ArrowRight, ChevronDown, X, Sparkles, Globe, Mail, Users, Shield, TrendingUp } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Snowfall from 'react-snowfall';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Ice card utility for consistent frosty look
const iceCardClass = "bg-white/30 backdrop-blur-2xl border border-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] shadow-inner ring-1 ring-white/30";

// Animation 1: Interactive/Frost Forming (for clickable cards) - slow, thick, glowing
// Uses custom CSS class for smooth transitions
const iceCardInteractive = "cursor-pointer frost-interactive hover:ring-2";

// Animation 2: Static/Subtle (for non-clickable cards) - barely visible shift
const iceCardStatic = "transition-all duration-500 hover:bg-white/35 hover:border-white/50";

// FrostCard component with snowfall on hover
function FrostCard({ children, className }: { children: ReactNode; className?: string }) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      className={cn("relative overflow-hidden", iceCardClass, iceCardStatic, className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isHovered && (
        <Snowfall 
          color="#fff"
          snowflakeCount={150}
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            zIndex: 1,
            pointerEvents: 'none'
          }}
          speed={[1.5, 3]}
          wind={[-0.7, 1.5]}
          radius={[1, 4]}
        />
      )}
      <div className="relative z-0">
        {children}
      </div>
    </div>
  );
}

interface PricingTier {
  price: number;
  rapidoPrice?: number;
  emails: string;
  emailCount: number;
  hasRapido: boolean;
  recommended?: boolean;
}

const tiers: PricingTier[] = [
  {
    price: 99,
    rapidoPrice: 50,
    emails: '500',
    emailCount: 500,
    hasRapido: true,
  },
  {
    price: 999,
    emails: '7,500',
    emailCount: 7500,
    hasRapido: false,
    recommended: true,
  },
  {
    price: 5000,
    emails: '50,000',
    emailCount: 50000,
    hasRapido: false,
  },
];

const faqs = [
  {
    question: "How can you launch campaigns same-day?",
    answer: "We've built a massive network of pre-warmed domains and mailboxes that are ready to send at any time. While traditional setups require weeks of domain warming, ours are already warmed and distributed across thousands of IPs for maximum deliverability."
  },
  {
    question: "Do I need to connect my own domain?",
    answer: "No! We handle everything. You just provide your website and we take care of the entire sending infrastructure."
  },
  {
    question: "What happens after I pay?",
    answer: "You'll see a campaign report with the leads we found and the emails we wrote. Review, tweak if needed, approve—and we start sending the same day."
  },
  {
    question: "Is the 'Rapido' option safe?",
    answer: "Yes. We distribute sending volume across thousands of mailboxes and IPs, so even at high speeds your deliverability stays high."
  },
  {
    question: "Can I export the leads?",
    answer: "Absolutely. You get a full report of everyone we contacted, open rates, and replies. You own the data."
  }
];

export default function LandingPage() {
  const [domain, setDomain] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 1000], [0, 200]);
  const y2 = useTransform(scrollY, [0, 1000], [0, -150]);
  const y3 = useTransform(scrollY, [0, 1000], [0, 100]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!domain.trim()) {
      setError('Enter your domain to get started');
      inputRef.current?.focus();
      return;
    }

    // Basic domain validation
    const domainPattern = /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    
    if (!domainPattern.test(cleanDomain)) {
      setError('Enter a valid domain (e.g., company.com)');
      return;
    }

    setIsLoading(true);
    
    // Generate a unique slug and navigate
    const slug = `campaign-${Date.now().toString(36)}`;
    router.push(`/campaign/${slug}?domain=${encodeURIComponent(cleanDomain)}`);
  };

  return (
    <div className="min-h-screen bg-[#F0F8FF] text-slate-800 font-sans selection:bg-cyan-200 selection:text-cyan-900 relative overflow-hidden">
      
      {/* Deep Freeze Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-sky-50 via-[#F0F8FF] to-cyan-50 pointer-events-none" />
      
      {/* Glacial Orbs - intensified */}
      <motion.div style={{ y: y1 }} className="fixed top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-sky-300/20 rounded-full blur-[100px] pointer-events-none mix-blend-multiply animate-pulse" />
      <motion.div style={{ y: y2 }} className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-cyan-200/30 rounded-full blur-[80px] pointer-events-none mix-blend-multiply" />
      <motion.div style={{ y: y3 }} className="fixed top-[30%] left-[40%] w-[30vw] h-[30vw] bg-indigo-200/20 rounded-full blur-[90px] pointer-events-none mix-blend-multiply" />
      
      {/* Frost Texture Overlay */}
      <div className="fixed inset-0 opacity-[0.4] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150 mix-blend-overlay" />

      {/* Navigation */}
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out border-b",
        scrolled 
          ? "bg-white/60 backdrop-blur-xl border-white/50 py-3 shadow-lg shadow-sky-100/20" 
          : "bg-transparent border-transparent py-5"
      )}>
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-400 blur-md opacity-30 rounded-full"></div>
              <img src="/coldmessage_logo.png" alt="ColdMessage" className="h-12 w-auto relative z-10" />
            </div>
            <span className="font-bold text-slate-900 text-xl tracking-tight">ColdMessage.io</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <button onClick={() => scrollToSection('how-it-works')} className="transition-colors duration-500">How it works</button>
            <button onClick={() => scrollToSection('pricing')} className="transition-colors duration-500">Pricing</button>
            <button onClick={() => scrollToSection('faq')} className="transition-colors duration-500">FAQ</button>
            <a href="/app" className="px-4 py-2 bg-slate-900 text-white rounded-lg transition-colors duration-500">Sign in</a>
          </div>
        </div>
      </nav>

      <div className="relative z-10">
        {/* Hero Section */}
        <section className="min-h-screen flex flex-col items-center justify-center px-6 pt-20 pb-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-center max-w-4xl mx-auto"
          >
            
            <div className="mb-8 relative z-10">
              
              <div className="relative inline-block my-4 py-2 px-4">
                {/* SVG Filters for distortion/texture */}
                <svg className="absolute w-0 h-0">
                  <defs>
                    <filter id="ice-texture" x="0%" y="0%" width="100%" height="100%">
                      <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" result="noise" />
                      <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
                    </filter>
                  </defs>
                </svg>

                {/* Main 3D Ice Text - Wrapper handles flex layout to avoid iOS background-clip:text bug */}
                <div className="flex flex-col items-center">
                  <h2 className="ice-text ice-text--mobile text-5xl sm:text-7xl md:text-8xl lg:text-9xl tracking-normal select-none relative z-10 text-center">
                    <span className="block">Send 500</span>
                    <span className="ice-text ice-text--mobile text-5xl sm:text-7xl md:text-8xl lg:text-9xl block" style={{ '--ice-highlight': '#FFFFFF00' } as React.CSSProperties}>Cold Emails</span>
                    <span className="block">Today</span>
                  </h2>
                </div>
              </div>
            </div>
            
            <p className="text-xl md:text-2xl text-slate-500 max-w-2xl mx-auto mb-14 leading-relaxed font-medium">
              Type your domain. We find the buyers, craft the pitch, and fill your inbox with replies—<span className="text-slate-700 font-bold">100% done-for-you</span>.
            </p>
            
            {/* Domain Input - "Thick Ice" Effect */}
            <motion.form 
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="max-w-xl mx-auto relative z-20"
            >
              <div className="relative group">
                {/* Cold glow behind input */}
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-300 via-sky-300 to-cyan-300 rounded-2xl blur-lg opacity-40 animate-pulse" />
                
                <div className="relative flex items-center bg-white/70 backdrop-blur-2xl rounded-2xl border border-white/80 shadow-[0_8px_32px_0_rgba(31,38,135,0.1)] overflow-hidden p-1.5 sm:p-2 ring-1 ring-white/60">
                  <div className="pl-2 sm:pl-4 text-cyan-500">
                    <Globe className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <input
                    ref={inputRef}
                    type="text"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="yourcompany.com"
                    className="flex-1 min-w-0 bg-transparent px-2 sm:px-4 py-3 sm:py-4 text-base sm:text-lg text-slate-900 placeholder:text-slate-400/80 outline-none focus:ring-0 focus:outline-none border-none font-medium"
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-cyan-600 to-sky-600 text-white font-bold rounded-xl transition-all duration-500 flex items-center gap-1.5 sm:gap-2 disabled:opacity-50 shadow-lg shadow-cyan-500/20 active:scale-[0.98] shrink-0 text-sm sm:text-base"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Generate <Sparkles className="w-4 h-4 text-cyan-100" />
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              {error && (
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 text-red-500 text-sm font-bold bg-white/80 backdrop-blur-sm inline-block px-4 py-1.5 rounded-full border border-red-100 shadow-sm"
                >
                  {error}
                </motion.p>
              )}
            </motion.form>

            {/* Trust indicators */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 mt-12 text-sm font-semibold text-slate-400"
            >
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-full bg-cyan-50 text-cyan-600 border border-cyan-100"><Check className="w-3 h-3" /></div>
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-full bg-cyan-50 text-cyan-600 border border-cyan-100"><Check className="w-3 h-3" /></div>
                Free campaign preview
              </div>
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-full bg-cyan-50 text-cyan-600 border border-cyan-100"><Check className="w-3 h-3" /></div>
                Results in 2 minutes
              </div>
            </motion.div>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-cyan-300/50"
            >
              <ChevronDown className="w-8 h-8" />
            </motion.div>
          </motion.div>
        </section>

        {/* Trusted By */}
        <section className="py-8">
          <div className="max-w-6xl mx-auto px-6">
            <FrostCard className="rounded-3xl p-12">
              <p className="text-center text-slate-400 font-bold uppercase tracking-widest text-sm mb-8">Trusted by industry leaders</p>
              <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60">
                <img src="/logos/instantly.svg" alt="Instantly" className="h-8 w-auto object-contain grayscale" />
                <img src="/logos/heyreach.png" alt="HeyReach" className="h-8 w-auto object-contain grayscale" />
                <img src="/logos/emailguard.png" alt="EmailGuard" className="h-8 w-auto object-contain grayscale" />
                <img src="/logos/emailbison.png" alt="EmailBison" className="h-8 w-auto object-contain grayscale" />
                <img src="/logos/talenthaul.svg" alt="TalentHaul" className="h-8 w-auto object-contain grayscale" />
              </div>
            </FrostCard>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-32 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-24">
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">How It Works</h2>
              <p className="text-slate-500 max-w-2xl mx-auto text-xl font-medium">
                From domain to live campaign in minutes, not months.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: <Globe className="w-6 h-6" />,
                  step: '01',
                  title: "Enter Your Domain",
                  desc: "Just paste your website. Our AI instantly analyzes your business and identifies your ideal customer profile."
                },
                {
                  icon: <Mail className="w-6 h-6" />,
                  step: '02',
                  title: "Review Your Campaign",
                  desc: "See the leads we found and the personalized emails we wrote. Edit anything you want, or approve as-is."
                },
                {
                  icon: <TrendingUp className="w-6 h-6" />,
                  step: '03',
                  title: "We Launch Today",
                  desc: "Once approved, we start sending immediately. Sit back and watch the replies roll in."
                }
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="relative group h-full"
                >
                  <FrostCard className="rounded-[2rem] p-10 h-full flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-50 to-white border border-cyan-100 flex items-center justify-center text-cyan-600 shadow-sm">
                        {item.icon}
                      </div>
                      <span className="text-6xl font-black text-cyan-900/10">{item.step}</span>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-4">{item.title}</h3>
                    <p className="text-slate-500 leading-relaxed font-medium">{item.desc}</p>
                  </FrostCard>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-32 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-24">
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">Everything Included</h2>
              <p className="text-slate-500 max-w-2xl mx-auto text-xl font-medium">
                No hidden fees. No technical setup. No waiting around.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: <Mail className="w-5 h-5" />, title: 'Instant Sending', desc: 'No setup, no waiting—campaigns go live today' },
                { icon: <Users className="w-5 h-5" />, title: 'Verified Lead Data', desc: 'Real contacts at companies that match your ICP' },
                { icon: <Sparkles className="w-5 h-5" />, title: 'AI-Written Copy', desc: 'Personalized emails that actually get replies' },
                { icon: <Shield className="w-5 h-5" />, title: 'Deliverability Guarantee', desc: 'Your emails land in the inbox, not spam' },
                { icon: <TrendingUp className="w-5 h-5" />, title: 'Real-Time Dashboard', desc: 'Track opens, clicks, and replies as they happen' },
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <FrostCard className="flex items-start gap-5 p-8 rounded-[2rem] h-full">
                    <div className="w-12 h-12 rounded-2xl bg-white/80 border border-cyan-50 flex items-center justify-center text-cyan-500 shrink-0 shadow-sm shadow-cyan-100/50">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 mb-2">{feature.title}</h3>
                      <p className="text-slate-500 font-medium leading-relaxed">{feature.desc}</p>
                    </div>
                  </FrostCard>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-32 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-24">
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">Simple Pricing</h2>
              <p className="text-slate-500 max-w-2xl mx-auto text-xl font-medium">
                Pay per campaign. No monthly fees. No contracts.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
              {tiers.map((tier, index) => (
                <PricingCard key={index} tier={tier} />
              ))}
            </div>
          </div>
        </section>

        {/* Comparison */}
        <section className="py-32 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 tracking-tight">Us vs. Traditional Agencies</h2>
            </div>

            <FrostCard className="rounded-[2rem]">
              <div className="grid grid-cols-3 bg-white/40 border-b border-white/50 p-8 text-sm font-bold uppercase tracking-wider text-slate-400">
                <div></div>
                <div className="text-cyan-600">ColdMessage</div>
                <div>Agencies</div>
              </div>
              
              {[
                { feat: "Setup Time", us: "Minutes", them: "2-4 Weeks" },
                { feat: "Infrastructure", us: "Included", them: "$50+/mo per inbox" },
                { feat: "Ready to Send", us: "Immediately", them: "14 Days warmup" },
                { feat: "Commitment", us: "Pay per Campaign", them: "3 Month Retainer" },
                { feat: "Time to Launch", us: "Same Day", them: "Weeks" }
              ].map((row, i) => (
                <div key={i} className="grid grid-cols-3 p-8 border-b border-white/40 last:border-0 items-center">
                  <div className="font-semibold text-slate-700">{row.feat}</div>
                  <div className="font-bold text-cyan-600 flex items-center gap-2">
                    <div className="p-1 bg-cyan-100 rounded-full"><Check className="w-3 h-3" /></div>
                    {row.us}
                  </div>
                  <div className="text-slate-400 flex items-center gap-2">
                    <X className="w-4 h-4" /> {row.them}
                  </div>
                </div>
              ))}
            </FrostCard>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-32 px-6">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">Questions?</h2>
            </div>
            
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <FaqItem key={i} question={faq.question} answer={faq.answer} />
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-32 px-6">
          <div className="max-w-5xl mx-auto">
            <FrostCard className="rounded-[3rem] p-12 md:p-24">
              <div className="text-center">
                <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">
                  Ready to see your campaign?
                </h2>
                <p className="text-slate-500 text-xl md:text-2xl mb-12 max-w-2xl mx-auto font-medium leading-relaxed">
                  Enter your domain and we'll show you exactly who we can reach and what we'll say.
                </p>
                
                <form onSubmit={handleSubmit} className="max-w-xl mx-auto relative">
                  <div className="relative flex items-center bg-white/70 backdrop-blur-2xl rounded-2xl border border-white/80 shadow-[0_8px_32px_0_rgba(31,38,135,0.1)] overflow-hidden p-1.5 sm:p-2 ring-1 ring-white/60">
                    <div className="pl-2 sm:pl-4 text-cyan-500">
                      <Globe className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <input
                      type="text"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      placeholder="yourcompany.com"
                      className="flex-1 min-w-0 bg-transparent px-2 sm:px-4 py-3 sm:py-4 text-base sm:text-lg text-slate-900 placeholder:text-slate-400/80 outline-none focus:ring-0 focus:outline-none border-none font-medium"
                    />
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-4 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-cyan-600 to-sky-600 text-white font-bold rounded-xl transition-all duration-500 flex items-center gap-1.5 sm:gap-2 disabled:opacity-50 shadow-lg shadow-cyan-500/20 active:scale-[0.98] cursor-pointer shrink-0 text-sm sm:text-base"
                    >
                      {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          Generate <Sparkles className="w-4 h-4 text-cyan-100" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </FrostCard>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/60 bg-white/40 backdrop-blur-xl py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src="/coldmessage_logo.png" alt="ColdMessage" className="h-6 w-auto opacity-50 grayscale" />
              <span className="text-slate-400 font-bold text-sm">ColdMessage</span>
            </div>
            <div className="flex gap-8 text-sm font-medium text-slate-500">
              <a href="#" className="transition-colors duration-500">Terms</a>
              <a href="#" className="transition-colors duration-500">Privacy</a>
              <a href="#" className="transition-colors duration-500">Support</a>
            </div>
            <p className="text-slate-400 text-sm font-medium">
              © {new Date().getFullYear()} ColdMessage Inc.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PricingCard({ tier }: { tier: PricingTier }) {
  const [isRapido, setIsRapido] = useState(false);
  const currentPrice = tier.hasRapido && isRapido ? tier.price + (tier.rapidoPrice || 0) : tier.price;
  const router = useRouter();

  const handleSelectPlan = () => {
    router.push('/campaign/new');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={cn(
        "relative rounded-[2rem] p-10 flex flex-col h-full group",
        iceCardInteractive,
        tier.recommended ? "frost-recommended z-10 scale-105" : ""
      )}
    >
      {tier.recommended && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-cyan-500 to-sky-500 text-white px-6 py-2 rounded-full text-xs font-bold uppercase tracking-wide shadow-lg shadow-cyan-500/30 ring-4 ring-white/50 backdrop-blur">
          Most Popular
        </div>
      )}

      <div className="mb-10">
        <h3 className="text-slate-400 font-bold uppercase tracking-wider text-sm mb-4">
          {tier.emails} Emails
        </h3>
        <div className="flex items-baseline gap-1">
          <span className="text-6xl font-black text-slate-900 tracking-tighter drop-shadow-sm">${currentPrice}</span>
          <span className="text-slate-400 font-medium">/campaign</span>
        </div>
      </div>

      <div className="flex-1 space-y-5 mb-10">
        <div className="flex items-center gap-3 text-slate-600 font-medium">
          <div className="p-1 bg-cyan-100/50 rounded-full text-cyan-600 border border-cyan-100"><Check className="w-3 h-3" /></div>
          <span>Send {tier.emails} emails</span>
        </div>
        <div className="flex items-center gap-3 text-slate-600 font-medium">
          <div className="p-1 bg-cyan-100/50 rounded-full text-cyan-600 border border-cyan-100"><Check className="w-3 h-3" /></div>
          <span>High deliverability</span>
        </div>
        <div className="flex items-center gap-3 text-slate-600 font-medium">
          <div className="p-1 bg-cyan-100/50 rounded-full text-cyan-600 border border-cyan-100"><Check className="w-3 h-3" /></div>
          <span>Real-time dashboard</span>
        </div>
        <div className="flex items-center gap-3 text-slate-600 font-medium">
          <div className="p-1 bg-cyan-100/50 rounded-full text-cyan-600 border border-cyan-100"><Check className="w-3 h-3" /></div>
          <span>Same-day launch</span>
        </div>
        
        {/* Rapido Toggle - Only for 500 tier */}
        {tier.hasRapido && (
          <div 
            onClick={() => setIsRapido(!isRapido)}
            className={cn(
              "mt-8 p-5 rounded-2xl border cursor-pointer transition-all duration-500 flex items-center justify-between group backdrop-blur-sm",
              isRapido 
                ? "bg-gradient-to-r from-fuchsia-50/60 to-violet-50/60 border-fuchsia-200/80 ring-1 ring-fuchsia-200/50" 
                : "bg-white/40 border-white/60"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-6 h-6 rounded-full border flex items-center justify-center transition-colors duration-500 shadow-sm",
                isRapido ? "bg-gradient-to-br from-fuchsia-400 to-violet-500 border-fuchsia-400 text-white shadow-fuchsia-300/50" : "bg-white border-slate-200"
              )}>
                {isRapido && <Check className="w-3 h-3" />}
              </div>
              <div>
                <p className={cn("font-bold text-sm", isRapido ? "text-fuchsia-700" : "text-slate-700")}>
                  Rapido Speed <Zap className="w-3 h-3 inline ml-1" />
                </p>
                <p className="text-xs text-slate-400 mt-0.5">Launch in 24h (+${tier.rapidoPrice})</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <button 
        onClick={handleSelectPlan}
        className={cn(
          "w-full py-5 rounded-xl font-bold transition-all duration-500 active:scale-[0.98] shadow-lg text-lg",
          tier.recommended 
            ? "bg-gradient-to-r from-cyan-500 to-sky-500 text-white shadow-cyan-200" 
            : "bg-slate-900 text-white shadow-slate-200"
        )}
      >
        Get Started
      </button>
    </motion.div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div 
      className={cn("rounded-2xl overflow-hidden group", iceCardInteractive)}
    >
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-8 flex items-center justify-between text-left cursor-pointer"
      >
        <span className="font-bold text-lg text-slate-900">{question}</span>
        <ChevronDown 
          className={cn("text-slate-400 transition-transform duration-300 shrink-0 ml-4", isOpen && "rotate-180")} 
          size={24} 
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <div className="px-8 pb-8 text-slate-500 leading-relaxed text-lg font-medium">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

