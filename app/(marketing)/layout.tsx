export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Marketing pages get the full-width layout
  // The root layout already handles html/body
  return <>{children}</>;
}

