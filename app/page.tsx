'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Zap } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PricingTier {
  price: number;
  rapidoPrice: number;
  emails: string; // e.g. "500"
  duration: string; // e.g. "7 days"
  color: 'green' | 'pink' | 'purple';
}

const tiers: PricingTier[] = [
  {
    price: 79,
    rapidoPrice: 50,
    emails: '500',
    duration: '7 days',
    color: 'green',
  },
  {
    price: 999,
    rapidoPrice: 500,
    emails: '7,500',
    duration: '7 days',
    color: 'pink',
  },
  {
    price: 5000,
    rapidoPrice: 2500,
    emails: '50,000',
    duration: '7 days',
    color: 'purple',
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white px-4 py-12 sm:px-6 lg:px-8 font-sans overflow-hidden">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center mb-16 space-y-4">
          <motion.h1 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", bounce: 0.5 }}
            className="text-6xl md:text-8xl font-black tracking-tighter text-black uppercase italic transform -rotate-2"
          >
            coldmessage.io
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-2xl md:text-4xl font-bold text-zinc-800 max-w-3xl mx-auto bg-yellow-300 inline-block px-4 py-2 transform rotate-1 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
          >
            Test cold email campaigns, immediately!
          </motion.p>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 items-start">
          {tiers.map((tier, index) => (
            <PricingCard key={index} tier={tier} index={index} />
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-20 text-center">
          <motion.button
            whileHover={{ scale: 1.05, rotate: -1 }}
            whileTap={{ scale: 0.95 }}
            className="bg-black text-white text-2xl font-black py-6 px-12 rounded-none border-4 border-transparent hover:bg-white hover:text-black hover:border-black transition-all shadow-[10px_10px_0px_0px_#FF00FF]"
          >
            START BLASTING NOW 🚀
          </motion.button>
        </div>
      </div>
    </div>
  );
}

function PricingCard({ tier, index }: { tier: PricingTier; index: number }) {
  const [isRapido, setIsRapido] = useState(false);

  const colorStyles = {
    green: {
      bg: 'bg-green-100',
      border: 'border-green-500',
      text: 'text-green-600',
      highlight: 'bg-green-500',
      shadow: 'shadow-[8px_8px_0px_0px_rgba(34,197,94,1)]',
    },
    pink: {
      bg: 'bg-pink-100',
      border: 'border-pink-500',
      text: 'text-pink-600',
      highlight: 'bg-pink-500',
      shadow: 'shadow-[8px_8px_0px_0px_rgba(236,72,153,1)]',
    },
    purple: {
      bg: 'bg-purple-100',
      border: 'border-purple-500',
      text: 'text-purple-600',
      highlight: 'bg-purple-500',
      shadow: 'shadow-[8px_8px_0px_0px_rgba(168,85,247,1)]',
    },
  };

  const styles = colorStyles[tier.color];
  const currentPrice = isRapido ? tier.price + tier.rapidoPrice : tier.price;

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: index * 0.1, type: "spring" }}
      whileHover={{ y: -10 }}
      className={cn(
        "relative p-8 border-4 border-black bg-white flex flex-col h-full transition-all duration-200",
        styles.shadow
      )}
    >
      {/* Header */}
      <div className={cn("absolute top-0 left-0 w-full h-4", styles.highlight)} />
      
      <div className="mt-4 mb-8 text-center">
        <h3 className={cn("text-2xl font-black uppercase tracking-widest mb-2", styles.text)}>
          {tier.emails} Emails
        </h3>
        <div className="flex items-center justify-center gap-1">
          <span className="text-4xl font-black text-black">$</span>
          <motion.span 
            key={currentPrice}
            initial={{ scale: 1.5, color: styles.highlight }}
            animate={{ scale: 1, color: '#000' }}
            className="text-6xl font-black text-black"
          >
            {currentPrice}
          </motion.span>
        </div>
        <p className="text-gray-500 font-bold mt-2 uppercase tracking-wider">
          {isRapido ? 'In 24 Hours' : 'In 7 Days'}
        </p>
      </div>

      {/* Features */}
      <div className="flex-grow space-y-6">
        <div className="flex items-start gap-3">
          <div className={cn("p-1 rounded-full mt-1 text-white", styles.highlight)}>
            <Check size={16} strokeWidth={4} />
          </div>
          <p className="font-bold text-lg">
            Send <span className={cn("mx-1 px-1 text-white", styles.highlight)}>{tier.emails}</span> emails
          </p>
        </div>
        
        {/* RAPIDO Option */}
        <div 
          className={cn(
            "cursor-pointer border-4 border-black p-4 transition-all relative overflow-hidden group",
            isRapido ? "bg-yellow-300" : "bg-gray-50 hover:bg-gray-100"
          )}
          onClick={() => setIsRapido(!isRapido)}
        >
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-6 h-6 border-2 border-black flex items-center justify-center bg-white transition-colors",
                isRapido && "bg-black"
              )}>
                {isRapido && <Check size={16} className="text-white" strokeWidth={4} />}
              </div>
              <span className="font-black text-xl italic uppercase">RAPIDO!</span>
            </div>
            <Zap size={24} className={cn("transition-colors", isRapido ? "fill-black text-black" : "text-gray-300")} />
          </div>
          
          <p className="mt-2 text-sm font-bold pl-8 relative z-10">
            +${tier.rapidoPrice} to send in 24h
          </p>

          {/* Background effect for selected state */}
          {isRapido && (
            <motion.div 
              layoutId={`highlight-${index}`}
              className="absolute inset-0 bg-yellow-300 z-0" 
            />
          )}
        </div>

        <div className="pt-4 border-t-2 border-dashed border-gray-200">
          <p className="text-sm text-gray-500 font-medium text-center">
            Ideal for {tier.emails === '500' ? 'testing distinct angles' : tier.emails === '7,500' ? 'scaling what works' : 'market domination'}
          </p>
        </div>
      </div>

      <button className={cn(
        "w-full mt-8 py-4 text-xl font-black text-white border-2 border-black uppercase tracking-wider transition-transform active:scale-95 hover:brightness-110 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1",
        styles.highlight
      )}>
        Choose Plan
      </button>
    </motion.div>
  );
}
