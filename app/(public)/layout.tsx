export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Public pages (campaign viewer) - no special layout needed
  return <>{children}</>;
}

