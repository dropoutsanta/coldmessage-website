'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Zap, Target, UserCheck, Rocket, ShieldCheck, ChevronDown, ArrowRight, Star, Users, X, Scale, Lock, AlertTriangle, FileText, BarChart, Send, Mail } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import HeroMap from './HeroMap';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PricingTier {
  price: number;
  rapidoPrice: number;
  emails: string; // e.g. "500"
  emailCount: number;
  duration: string; // e.g. "7 days"
  recommended?: boolean;
}

const tiers: PricingTier[] = [
  {
    price: 79,
    rapidoPrice: 50,
    emails: '500',
    emailCount: 500,
    duration: '7 days',
  },
  {
    price: 999,
    rapidoPrice: 500,
    emails: '7,500',
    emailCount: 7500,
    duration: '7 days',
    recommended: true,
  },
  {
    price: 5000,
    rapidoPrice: 2500,
    emails: '50,000',
    emailCount: 50000,
    duration: '7 days',
  },
];

const faqs = [
  {
    question: "Do I need to connect my own domain?",
    answer: "No! We use our own network of pre-warmed domains. You just give us your target website/offer URL, and we handle the sending infrastructure completely."
  },
  {
    question: "What happens after I pay?",
    answer: "You'll be redirected to a simple form where you input your website and target audience details. Our system generates a campaign report for your approval instantly."
  },
  {
    question: "Is the 'Rapido' option safe?",
    answer: "Yes. We have a massive pool of mailboxes, so we can distribute the sending volume safely across thousands of IPs to ensure high deliverability even at high speeds."
  },
  {
    question: "Can I export the leads?",
    answer: "Absolutely. You get a full report of everyone we contacted, open rates, and positive replies. You own the data."
  }
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();

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

  const goToCampaignBuilder = () => {
    // Navigate to the "new" route which shows the domain entry form
    router.push('/campaign/new');
  };

  return (
    <div className="min-h-screen bg-[#F0F9FF] text-slate-800 font-sans selection:bg-cyan-200 selection:text-cyan-900 relative overflow-hidden">
      
      {/* Background Ambient Glows */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-sky-200/40 rounded-full blur-[100px] pointer-events-none mix-blend-multiply" />
      <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-cyan-200/40 rounded-full blur-[100px] pointer-events-none mix-blend-multiply" />
      
      {/* Grid Pattern Overlay */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#e0f2fe_1px,transparent_1px),linear-gradient(to_bottom,#e0f2fe_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] pointer-events-none z-0 opacity-40"></div>

      {/* Navigation */}
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled ? "bg-white/80 backdrop-blur-md border-b border-slate-200 py-3 shadow-sm" : "bg-transparent py-5"
      )}>
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/coldmessage_logo.png" alt="ColdMessage" className="h-8 w-auto" />
            <span className="font-bold text-slate-900 text-xl tracking-tight">ColdMessage.io</span>
        </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <button onClick={() => scrollToSection('how-it-works')} className="hover:text-sky-600 transition-colors">How it works</button>
            <button onClick={() => scrollToSection('pricing')} className="hover:text-sky-600 transition-colors">Pricing</button>
            <button onClick={() => scrollToSection('faq')} className="hover:text-sky-600 transition-colors">FAQ</button>
            <button 
              onClick={() => scrollToSection('pricing')}
              className="bg-slate-900 text-white px-5 py-2 rounded-full hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      <div className="relative z-10 pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <section className="text-center mb-24 relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/60 border border-slate-200 text-xs font-semibold text-sky-600 mb-6 shadow-sm backdrop-blur-sm cursor-pointer"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                </span>
                New: Rapido Speed Available
              </motion.div>
              
              <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-6 leading-tight">
                Test cold email campaigns, <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-cyan-500">
                  immediately.
                </span>
              </h1>
              
              <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
                We handle the domains, warming, and sending. You just provide the website and we generate the leads and copy. 
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button 
                  onClick={goToCampaignBuilder}
                  className="px-8 py-4 bg-slate-900 text-white rounded-xl font-bold text-lg hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 flex items-center gap-2 hover:scale-105 active:scale-95"
                >
                  Start Campaign <ArrowRight className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2 text-sm text-slate-500 font-medium px-4">
                  <Check className="w-4 h-4 text-green-500" />
                  No credit card required for report
                </div>
              </div>
              
            </motion.div>

            {/* Social Proof */}
            <div className="mt-12 pt-10 border-t border-slate-200/60">
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6">Trusted by fast-moving teams</p>
              <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                {/* Reusing logos from CampaignPage if available, or text placeholders for now to match request */}
                {[
                  { src: '/logos/instantly.svg', alt: 'Instantly' },
                  { src: '/logos/heyreach.png', alt: 'HeyReach' },
                  { src: '/logos/emailbison.png', alt: 'EmailBison' },
                  { src: '/logos/talenthaul.svg', alt: 'TalentHaul' },
                  { src: '/logos/ezshop.png', alt: 'EZShop' },
                ].map((logo) => (
                  <img
                    key={logo.alt}
                    src={logo.src}
                    alt={logo.alt}
                    className="h-8 w-auto object-contain"
                  />
                ))}
            </div>
          </div>
        </section>

          {/* Value Prop / How It Works */}
        <section id="how-it-works" className="mb-32">
          <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">How It Works</h2>
              <p className="text-slate-500 max-w-2xl mx-auto text-lg">
                We've automated the entire cold email stack. From domain procurement to mailbox warming.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
               {/* Connecting Line (Desktop) */}
               <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-sky-200 via-cyan-200 to-sky-200 z-0" />

              {[
                {
                  icon: <Target className="w-6 h-6 text-sky-600" />,
                  title: "1. Enter Domain",
                  desc: "Tell us your website. We'll instantly generate your Ideal Customer Profile (ICP)."
                },
                {
                  icon: <UserCheck className="w-6 h-6 text-cyan-600" />,
                  title: "2. Approve Report",
                  desc: "Review the persona and sample copy we generate for you. One click to approve."
                },
                {
                  icon: <Rocket className="w-6 h-6 text-blue-600" />,
                  title: "3. We Launch",
                  desc: "We start sending immediately using our pre-warmed mailboxes network."
              }
            ].map((step, i) => (
                <div key={i} className="relative z-10 flex flex-col items-center text-center">
                  <div className="w-24 h-24 rounded-2xl bg-white border border-sky-100 shadow-lg flex items-center justify-center mb-6 relative">
                    <div className="absolute inset-0 bg-sky-50 rounded-2xl transform rotate-3 -z-10"></div>
                    {step.icon}
                </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h3>
                  <p className="text-slate-500 leading-relaxed">{step.desc}</p>
                </div>
            ))}
          </div>
        </section>

          {/* Features / Benefits Grid */}
          <section className="mb-32">
            <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-2">
                <div className="p-12 flex flex-col justify-center space-y-8">
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-4">Why wait weeks to test an idea?</h2>
                    <p className="text-slate-500 text-lg">
                      Traditional agencies take months to set up. We take minutes. Perfect for validating new offers or scaling what works.
                    </p>
                  </div>
                  
                  <ul className="space-y-4">
              {[
                "Thousands of pre-warmed mailboxes ready NOW",
                "Start sending emails the SAME DAY",
                "No technical setup or DNS headaches",
                "Perfect for validating new offers quickly"
              ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                          <Check className="w-4 h-4 text-green-600" />
                  </div>
                        <span className="text-slate-700 font-medium">{item}</span>
                </li>
              ))}
            </ul>

                  <div className="pt-4">
                    <div className="inline-block p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-3 mb-2">
                         <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
                         <span className="font-bold text-slate-900">Rapido Speed Available</span>
                      </div>
                      <p className="text-sm text-slate-500">
                        Need results yesterday? Compress the sending schedule into <strong className="text-slate-700">24 hours</strong>.
                      </p>
                    </div>
                  </div>
          </div>
          
                <div className="bg-slate-50 border-t lg:border-t-0 lg:border-l border-slate-200 p-12 flex items-center justify-center">
                   <RoiCalculator />
                </div>
              </div>
            </div>
          </section>

          {/* Pricing Section */}
          <section id="pricing" className="mb-32">
             <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Simple, Transparent Pricing</h2>
              <p className="text-slate-500 max-w-2xl mx-auto text-lg">
                Pay per campaign. No monthly retainers or long-term contracts.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
              {tiers.map((tier, index) => (
                <PricingCard key={index} tier={tier} />
              ))}
          </div>
        </section>

          {/* Comparison Table */}
          <section className="mb-32 max-w-4xl mx-auto">
          <div className="text-center mb-12">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Us vs. The Traditional Way</h2>
          </div>

            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-200 p-6 text-sm font-semibold uppercase tracking-wider text-slate-500">
                <div>Feature</div>
                <div className="text-slate-900">ColdMessage.io</div>
                <div>Agencies</div>
            </div>
              
            {[
              { feat: "Setup Time", us: "Instant", them: "2-4 Weeks" },
              { feat: "Mailbox Cost", us: "$0 (Included)", them: "$50+/mo per inbox" },
              { feat: "Warmup Period", us: "Pre-warmed", them: "14 Days minimum" },
              { feat: "Commitment", us: "Pay per Campaign", them: "3 Month Retainer" },
              { feat: "Speed", us: "24h - 7 Days", them: "Slow Drip" }
            ].map((row, i) => (
                <div key={i} className="grid grid-cols-3 p-6 border-b border-slate-100 last:border-0 items-center">
                  <div className="font-medium text-slate-700">{row.feat}</div>
                  <div className="font-semibold text-sky-600 flex items-center gap-2">
                    <Check className="w-4 h-4" /> {row.us}
                  </div>
                  <div className="text-slate-400 flex items-center gap-2">
                    <X className="w-4 h-4" /> {row.them}
                  </div>
                </div>
            ))}
          </div>
        </section>

          {/* FAQ */}
          <section id="faq" className="max-w-3xl mx-auto mb-32">
          <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Frequently Asked Questions</h2>
          </div>
          
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <FaqItem key={i} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
          <section className="text-center pb-12">
            <div className="bg-slate-900 rounded-3xl p-12 md:p-24 relative overflow-hidden">
              {/* Abstract shapes */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-slate-800 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-900 rounded-full blur-3xl opacity-50 translate-y-1/2 -translate-x-1/2"></div>
              
              <div className="relative z-10 max-w-3xl mx-auto">
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                  Ready to launch your campaign?
                </h2>
                <p className="text-slate-300 text-xl mb-10">
                  Join hundreds of companies filling their pipeline with ColdMessage.io.
                </p>
                <button 
                  onClick={goToCampaignBuilder}
                  className="px-10 py-4 bg-white text-slate-900 rounded-xl font-bold text-lg hover:bg-sky-50 transition-all shadow-xl flex items-center justify-center gap-2 mx-auto"
                >
                  Start Now <ArrowRight className="w-5 h-5" />
                </button>
                <p className="mt-6 text-slate-400 text-sm font-medium">
            100% Deliverability Guarantee
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-950 py-12 px-6 border-t border-slate-800 relative z-10 text-center">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-8 opacity-70">
            <img src="/coldmessage_logo.png" alt="ColdMessage" className="h-10 w-auto grayscale" />
            <span className="text-white font-bold tracking-tight text-xl">ColdMessage.io</span>
          </div>
          <div className="flex justify-center gap-8 mb-8 text-slate-400 text-sm font-medium">
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Support</a>
          </div>
          <p className="text-slate-600 text-sm">
            © {new Date().getFullYear()} ColdMessage Inc. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function PricingCard({ tier }: { tier: PricingTier }) {
  const [isRapido, setIsRapido] = useState(false);
  const currentPrice = isRapido ? tier.price + tier.rapidoPrice : tier.price;
  const router = useRouter();

  const handleSelectPlan = () => {
    // Navigate to the "new" route which shows the domain entry form
    router.push('/campaign/new');
  };

  return (
    <div className={cn(
      "relative bg-white rounded-2xl p-8 border transition-all duration-300 flex flex-col h-full",
      tier.recommended 
        ? "border-sky-200 shadow-2xl shadow-sky-900/10 ring-1 ring-sky-100 scale-105 z-10" 
        : "border-slate-200 shadow-xl hover:shadow-2xl hover:border-sky-100"
    )}>
      {tier.recommended && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-sky-500 to-cyan-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-md">
          Most Popular
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-slate-500 font-semibold uppercase tracking-wider text-sm mb-2">
          {tier.emails} Emails
        </h3>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-slate-900">${currentPrice}</span>
          <span className="text-slate-400 font-medium">/campaign</span>
        </div>
      </div>

      <div className="flex-1 space-y-4 mb-8">
        <div className="flex items-center gap-3 text-slate-700 font-medium">
          <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
            <Check className="w-3 h-3" />
          </div>
          <span>Send {tier.emails} emails</span>
        </div>
        <div className="flex items-center gap-3 text-slate-700 font-medium">
          <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
            <Check className="w-3 h-3" />
          </div>
          <span>Fully automated warming</span>
        </div>
        <div className="flex items-center gap-3 text-slate-700 font-medium">
          <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
            <Check className="w-3 h-3" />
          </div>
          <span>Real-time dashboard</span>
        </div>
        
        {/* Rapido Toggle */}
        <div 
          onClick={() => setIsRapido(!isRapido)}
          className={cn(
            "mt-6 p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between group",
            isRapido 
              ? "bg-amber-50 border-amber-200" 
              : "bg-slate-50 border-slate-200 hover:border-slate-300"
          )}
        >
          <div className="flex items-center gap-3">
             <div className={cn(
               "w-5 h-5 rounded border flex items-center justify-center transition-colors",
               isRapido ? "bg-amber-500 border-amber-500 text-white" : "bg-white border-slate-300"
             )}>
               {isRapido && <Check className="w-3 h-3" />}
             </div>
             <div>
               <p className={cn("font-bold text-sm", isRapido ? "text-amber-800" : "text-slate-700")}>Rapido Speed ⚡️</p>
               <p className="text-xs text-slate-500">Send in 24h (+${tier.rapidoPrice})</p>
            </div>
          </div>
        </div>
      </div>

      <button 
        onClick={handleSelectPlan}
        className={cn(
        "w-full py-3 rounded-xl font-bold transition-all shadow-md active:scale-[0.98]",
        tier.recommended 
          ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white hover:opacity-90 shadow-sky-200" 
          : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
      )}>
        Select Plan
      </button>
    </div>
  );
}

function RoiCalculator() {
  const [emails, setEmails] = useState(500);
  const openRate = 0.45;
  const replyRate = 0.03;
  
  const estOpens = Math.floor(emails * openRate);
  const estReplies = Math.floor(emails * replyRate);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 w-full max-w-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-slate-900">ROI Calculator</h3>
        <BarChart className="w-5 h-5 text-slate-400" />
      </div>

      <div className="mb-8">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
          Campaign Volume: <span className="text-slate-900">{emails.toLocaleString()} emails</span>
        </label>
        <input 
          type="range" 
          min="500" 
          max="50000" 
          step="500" 
          value={emails}
          onChange={(e) => setEmails(parseInt(e.target.value))}
          className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-sky-500"
        />
        <div className="flex justify-between text-xs text-slate-400 mt-2">
          <span>500</span>
          <span>50k</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-slate-900">{estOpens.toLocaleString()}</div>
          <div className="text-xs text-slate-500 font-medium uppercase mt-1">Est. Opens</div>
        </div>
        <div className="bg-sky-50 rounded-xl p-4 text-center border border-sky-100">
          <div className="text-2xl font-bold text-sky-600">{estReplies.toLocaleString()}</div>
          <div className="text-xs text-sky-600/80 font-medium uppercase mt-1">Est. Replies</div>
        </div>
      </div>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-slate-200 rounded-xl bg-white overflow-hidden transition-all hover:border-sky-200">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-5 flex items-center justify-between text-left"
      >
        <span className="font-semibold text-slate-900">{question}</span>
        <ChevronDown 
          className={cn("text-slate-400 transition-transform duration-200", isOpen && "rotate-180")} 
          size={20} 
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <div className="px-5 pb-5 pt-0 text-slate-600 leading-relaxed text-sm">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
