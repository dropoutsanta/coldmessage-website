export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
        {children}
      </div>
      
      {/* Logo in corner */}
      <div className="absolute top-6 left-6">
        <a href="/" className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
          <img src="/coldmessage_logo.png" alt="ColdMessage" className="h-8 w-auto" />
        </a>
      </div>
    </div>
  );
}

