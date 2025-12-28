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
import { createClient } from '@/lib/supabase/client';

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
  currentUserEmail?: string;
}

type SheetState = 'form' | 'processing' | 'success' | 'error';

// Inline Login Form Component
function InlineLoginForm({
  email,
  onLoginSuccess,
  campaignSlug,
}: {
  email: string;
  onLoginSuccess: () => void;
  campaignSlug: string;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClient();

  const signInWithGoogle = async () => {
    setIsLoading(true);
    setError(null);

    const returnUrl = `/campaign/${campaignSlug}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(returnUrl)}`,
      },
    });

    if (error) {
      setError(error.message);
      setIsLoading(false);
    }
  };

  const sendMagicLink = async () => {
    setIsLoading(true);
    setError(null);

    const returnUrl = `/campaign/${campaignSlug}`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(returnUrl)}`,
      },
    });

    if (error) {
      setError(error.message);
      setIsLoading(false);
    } else {
      setMagicLinkSent(true);
      setIsLoading(false);
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        onLoginSuccess();
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth, onLoginSuccess]);

  if (magicLinkSent) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg
            className="w-5 h-5 text-emerald-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-emerald-800 mb-1">Check your email</p>
        <p className="text-xs text-emerald-600">
          We sent a login link to <strong>{email}</strong>
        </p>
        <button
          onClick={() => setMagicLinkSent(false)}
          className="mt-3 text-xs text-emerald-700 hover:text-emerald-800 font-medium"
        >
          Try another method
        </button>
      </div>
    );
  }

  return (
    <div className="bg-sky-50 border border-sky-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">👋</span>
        <div>
          <p className="text-sm font-semibold text-slate-800">Welcome back!</p>
          <p className="text-xs text-slate-500">Log in to continue checkout</p>
        </div>
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <button
          onClick={signInWithGoogle}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 bg-white text-slate-700 font-medium py-2.5 px-4 rounded-md border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

        <button
          onClick={sendMagicLink}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 bg-slate-800 text-white font-medium py-2.5 px-4 rounded-md hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {isLoading ? (
            <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          )}
          Send magic link
        </button>
      </div>
    </div>
  );
}

// Payment form component (must be inside Elements provider)
function PaymentForm({
  campaign,
  price,
  emails,
  onSuccess,
  onError,
  currentUserEmail,
}: {
  campaign: CampaignData;
  price: number;
  emails: number;
  onSuccess: (email: string) => void;
  onError: (message: string) => void;
  currentUserEmail?: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [email, setEmail] = useState(currentUserEmail || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [existingUser, setExistingUser] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(currentUserEmail || null);

  // Update email when currentUserEmail changes
  useEffect(() => {
    if (currentUserEmail) {
      setEmail(currentUserEmail);
      setSessionEmail(currentUserEmail);
      setExistingUser(false);
    }
  }, [currentUserEmail]);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  // Check if email exists when user stops typing
  const checkEmailExists = useCallback(async (emailToCheck: string) => {
    if (!validateEmail(emailToCheck) || sessionEmail) return;

    setIsCheckingEmail(true);
    try {
      const response = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToCheck }),
      });
      const data = await response.json();
      setExistingUser(data.exists);
    } catch (error) {
      console.error('Error checking email:', error);
    } finally {
      setIsCheckingEmail(false);
    }
  }, [sessionEmail]);

  // Debounce email check
  useEffect(() => {
    if (!email || sessionEmail) return;
    
    const timer = setTimeout(() => {
      checkEmailExists(email);
    }, 500);

    return () => clearTimeout(timer);
  }, [email, checkEmailExists, sessionEmail]);

  const handleLoginSuccess = useCallback(() => {
    // Refresh session and set email as authenticated
    setSessionEmail(email);
    setExistingUser(false);
  }, [email]);

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
    
    // Block if existing user hasn't logged in
    if (existingUser && !sessionEmail) {
      setEmailError('Please log in to continue');
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

  const isLoggedIn = !!sessionEmail;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Email Input - Read-only if logged in, editable otherwise */}
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-slate-700 mb-1.5"
        >
          Email
        </label>
        
        {isLoggedIn ? (
          // Logged in - show read-only email
          <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-md">
            <svg
              className="w-4 h-4 text-emerald-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <span className="text-slate-900 font-medium">{sessionEmail}</span>
            <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full ml-auto">
              Logged in
            </span>
          </div>
        ) : (
          // Not logged in - show input
          <>
            <div className="relative">
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(null);
                  setExistingUser(false);
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
              {isCheckingEmail && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin" />
                </div>
              )}
            </div>
            {emailError && (
              <p className="mt-1.5 text-sm text-red-500">{emailError}</p>
            )}
          </>
        )}
      </div>

      {/* Inline Login Form - Show when email exists */}
      {existingUser && !isLoggedIn && (
        <InlineLoginForm
          email={email}
          onLoginSuccess={handleLoginSuccess}
          campaignSlug={campaign.slug}
        />
      )}

      {/* Payment Element - Only show if not an existing user or already logged in */}
      {(!existingUser || isLoggedIn) && (
        <>
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
        </>
      )}
    </form>
  );
}

export default function CheckoutSheet({
  isOpen,
  onClose,
  campaign,
  tier = 'tier1',
  currentUserEmail,
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
          customerEmail: currentUserEmail,
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
  }, [campaign.slug, campaign.id, campaign.companyName, tier, currentUserEmail]);

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
                <div 
                  className="bg-white rounded-xl p-5 shadow-sm border border-slate-200"
                  onPointerDownCapture={(e) => e.stopPropagation()}
                >
                  <Elements stripe={stripePromise} options={elementsOptions}>
                    <PaymentForm
                      campaign={campaign}
                      price={price}
                      emails={emails}
                      onSuccess={handleSuccess}
                      onError={handleError}
                      currentUserEmail={currentUserEmail}
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
