/**
 * Convert a domain to a URL-friendly slug
 * Examples:
 * - "acme.com" → "acme"
 * - "my-company.io" → "my-company"
 * - "app.stripe.com" → "app-stripe" (subdomain handling)
 */
export function domainToSlug(domain: string): string {
  // Remove protocol and www
  let clean = domain.replace(/^https?:\/\//, '').replace(/^www\./, '');
  // Remove path
  clean = clean.split('/')[0];
  // Remove TLD, keep subdomain if present
  const parts = clean.split('.');
  if (parts.length > 2) {
    // Has subdomain: app.stripe.com → app-stripe
    return parts.slice(0, -1).join('-');
  }
  // Simple domain: acme.com → acme
  return parts[0];
}
