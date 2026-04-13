import LandingPageClient from './LandingPageClient';

// Middleware handles redirecting logged-in users to /select.
export default function LandingPage() {
  return <LandingPageClient />;
}
