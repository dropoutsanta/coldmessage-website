'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { CampaignData } from '@/lib/types';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
  {
    developerTools: {
      assistant: {
        enabled: false,
      },
    },
  }
);

interface CheckoutSheetProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: CampaignData;
  tier?: 'tier1' | 'tier2';
}

type SheetState = 'form' | 'processing' | 'success' | 'error';

// Payment form component (must be inside Elements provider)
function PaymentForm({
  campaign,
  price,
  emails,
  onSuccess,
  onError,
}: {
  campaign: CampaignData;
  price: number;
  emails: number;
  onSuccess: (email: string) => void;
  onError: (message: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [email, setEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    // Validate email
    if (!email) {
      setEmailError('Email is required');
      return;
    }
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email');
      return;
    }
    setEmailError(null);

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          receipt_email: email,
          return_url: `${window.location.origin}/campaign/${campaign.slug}?payment_success=true`,
        },
        redirect: 'if_required',
      });

      if (error) {
        onError(error.message || 'Payment failed');
        setIsProcessing(false);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        onSuccess(email);
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Something went wrong');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Email Input - Stripe-like styling */}
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-slate-700 mb-1.5"
        >
          Email
        </label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (emailError) setEmailError(null);
          }}
          placeholder="you@example.com"
          className={`w-full px-3 py-2.5 bg-white border rounded-md text-slate-900 placeholder:text-slate-400 
            transition-all duration-150 outline-none
            ${
              emailError
                ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
            }`}
        />
        {emailError && (
          <p className="mt-1.5 text-sm text-red-500">{emailError}</p>
        )}
      </div>

      {/* Payment Element */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Payment
        </label>
        <div className="bg-white border border-slate-300 rounded-md p-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all duration-150">
          <PaymentElement
            options={{
              layout: 'tabs',
            }}
          />
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed
          text-white font-semibold py-3 px-4 rounded-md transition-colors duration-150
          flex items-center justify-center gap-2"
      >
        {isProcessing ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Processing...
          </>
        ) : (
          <>Pay ${price}</>
        )}
      </button>

      {/* Secure payment note */}
      <p className="text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        Payments are secure and encrypted
      </p>
    </form>
  );
}

export default function CheckoutSheet({
  isOpen,
  onClose,
  campaign,
  tier = 'tier1',
}: CheckoutSheetProps) {
  const [state, setState] = useState<SheetState>('form');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const price = tier === 'tier1' ? campaign.priceTier1 : campaign.priceTier2;
  const emails =
    tier === 'tier1' ? campaign.priceTier1Emails : campaign.priceTier2Emails;

  const createPaymentIntent = useCallback(async () => {
    try {
      const response = await fetch('/api/checkout/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignSlug: campaign.slug,
          campaignId: campaign.id,
          campaignName: `${campaign.companyName} Outreach Campaign`,
          tier,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize payment');
      }

      setClientSecret(data.clientSecret);
      setPaymentIntentId(data.paymentIntentId);
    } catch (err) {
      console.error('Error creating payment intent:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setState('error');
    }
  }, [campaign.slug, campaign.id, campaign.companyName, tier]);

  useEffect(() => {
    if (isOpen && !clientSecret) {
      createPaymentIntent();
    }
  }, [isOpen, clientSecret, createPaymentIntent]);

  // Reset state when sheet closes
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setClientSecret(null);
        setPaymentIntentId(null);
        setState('form');
        setError(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleSuccess = async (email: string) => {
    setState('processing');

    try {
      // Call complete endpoint to set up account and get auto-login URL
      const response = await fetch('/api/checkout/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentIntentId,
          campaignSlug: campaign.slug,
          email,
          origin: window.location.origin, // Pass origin for correct redirect
        }),
      });

      const data = await response.json();

      if (response.ok && data.autoLoginUrl) {
        // Redirect to magic link which will auto-login and go to dashboard
        window.location.href = data.autoLoginUrl;
        return;
      }
      
      // Fallback: redirect to campaign page (user will need to sign in)
      window.location.href = `/app/campaigns/${campaign.slug}`;
    } catch (err) {
      console.error('Error completing checkout:', err);
      // Still redirect on error - payment succeeded
      window.location.href = `/app/campaigns/${campaign.slug}`;
    }
  };

  const handleError = (message: string) => {
    setError(message);
    setState('error');
  };

  const elementsOptions: StripeElementsOptions = {
    clientSecret: clientSecret || undefined,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#2563eb',
        colorBackground: '#ffffff',
        colorText: '#1e293b',
        colorDanger: '#ef4444',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        borderRadius: '6px',
        spacingUnit: '4px',
      },
      rules: {
        '.Input': {
          border: '1px solid #cbd5e1',
          boxShadow: 'none',
          padding: '10px 12px',
        },
        '.Input:focus': {
          border: '1px solid #2563eb',
          boxShadow: '0 0 0 2px rgba(37, 99, 235, 0.2)',
        },
        '.Tab': {
          border: '1px solid #cbd5e1',
          boxShadow: 'none',
        },
        '.Tab:hover': {
          border: '1px solid #94a3b8',
        },
        '.Tab--selected': {
          border: '1px solid #2563eb',
          boxShadow: '0 0 0 1px #2563eb',
        },
        '.Label': {
          fontWeight: '500',
          fontSize: '14px',
          marginBottom: '6px',
        },
      },
    },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 && info.velocity.y > 0) {
                onClose();
              }
            }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] bg-slate-50 rounded-t-3xl shadow-2xl overflow-hidden"
          >
            {/* Drag Handle */}
            <div className="flex justify-center pt-3 pb-2 bg-white">
              <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
            </div>

            {/* Content */}
            <div className="px-6 pb-8 overflow-y-auto max-h-[calc(90vh-40px)]">
              {/* Header */}
              <div className="flex items-center justify-between mb-6 bg-white -mx-6 px-6 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    {campaign.companyName} Outreach
                  </h2>
                  <p className="text-slate-500 text-sm">
                    {emails} personalized emails
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-900">${price}</p>
                    <p className="text-slate-400 text-xs">one-time</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-slate-100 transition-colors"
                  >
                    <svg
                      className="w-5 h-5 text-slate-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Form State */}
              {state === 'form' && clientSecret && (
                <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
                  <Elements stripe={stripePromise} options={elementsOptions}>
                    <PaymentForm
                      campaign={campaign}
                      price={price}
                      emails={emails}
                      onSuccess={handleSuccess}
                      onError={handleError}
                    />
                  </Elements>
                </div>
              )}

              {/* Loading State */}
              {state === 'form' && !clientSecret && (
                <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200">
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4" />
                    <p className="text-slate-500 text-sm">
                      Preparing payment...
                    </p>
                  </div>
                </div>
              )}

              {/* Processing State */}
              {state === 'processing' && (
                <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200">
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4" />
                    <p className="text-slate-500 text-sm">
                      Setting up your account...
                    </p>
                  </div>
                </div>
              )}

              {/* Success State - brief, redirects immediately */}
              {state === 'success' && (
                <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200">
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-5">
                      <svg
                        className="w-8 h-8 text-emerald-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">
                      Payment Successful
                    </h3>
                    <p className="text-slate-500 text-sm">
                      Redirecting to your dashboard...
                    </p>
                  </div>
                </div>
              )}

              {/* Error State */}
              {state === 'error' && (
                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                  <div className="text-center py-6">
                    <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg
                        className="w-7 h-7 text-red-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                      Payment Failed
                    </h3>
                    <p className="text-slate-500 text-sm mb-5">{error}</p>
                    <button
                      onClick={() => {
                        setError(null);
                        setState('form');
                      }}
                      className="px-5 py-2 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors font-medium text-sm"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              )}

              {/* Features - show only in form state */}
              {state === 'form' && (
                <div className="mt-5 grid grid-cols-2 gap-2">
                  {[
                    'Same-day launch',
                    '99% deliverability',
                    '100% personalized',
                    'Money-back guarantee',
                  ].map((feature) => (
                    <div
                      key={feature}
                      className="flex items-center gap-2 text-xs text-slate-500"
                    >
                      <svg
                        className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {feature}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
