'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuth = async () => {
      const supabase = createClient();
      const next = searchParams.get('next') || '/app';

      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/963b891c-d04d-4a93-bbc6-c60d82dcc595',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'callback/page.tsx:handleAuth:entry',message:'Callback page processing',data:{origin:window.location.origin,host:window.location.host,href:window.location.href,next},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'F'})}).catch(()=>{});
      // #endregion

      // Check for hash fragment (magic link tokens)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          console.error('Error setting session:', error);
          setError(error.message);
          return;
        }

        router.push(next);
        return;
      }

      // Check for code (OAuth flow)
      const code = searchParams.get('code');
      
      if (code) {
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/963b891c-d04d-4a93-bbc6-c60d82dcc595',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'callback/page.tsx:handleAuth:codeFound',message:'Code found, checking if session already exists',data:{codePrefix:code.substring(0,8)},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'F'})}).catch(()=>{});
        // #endregion

        // First check if session already exists (middleware may have exchanged the code)
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/963b891c-d04d-4a93-bbc6-c60d82dcc595',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'callback/page.tsx:handleAuth:sessionCheck',message:'Checked for existing session',data:{hasSession:!!existingSession,userId:existingSession?.user?.id?.substring(0,8)},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'F'})}).catch(()=>{});
        // #endregion

        if (existingSession) {
          // Session already exists, middleware handled the exchange
          router.push(next);
          return;
        }

        // No session yet, try to exchange the code
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/963b891c-d04d-4a93-bbc6-c60d82dcc595',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'callback/page.tsx:handleAuth:afterExchange',message:'Exchange result',data:{success:!error,errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'F'})}).catch(()=>{});
        // #endregion

        if (error) {
          console.error('Error exchanging code:', error);
          setError(error.message);
          return;
        }

        router.push(next);
        return;
      }

      // No auth params found, check if already authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push(next);
      } else {
        router.push('/login');
      }
    };

    handleAuth();
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Authentication Error</h2>
          <p className="text-white/60 mb-6">{error}</p>
          <a
            href="/login"
            className="inline-block px-6 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
          >
            Try again
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/60">Signing you in...</p>
      </div>
    </div>
  );
}

function AuthCallbackFallback() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/60">Loading...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<AuthCallbackFallback />}>
      <AuthCallbackContent />
    </Suspense>
  );
}

