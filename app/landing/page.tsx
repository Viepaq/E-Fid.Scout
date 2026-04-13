import LandingPageClient from '../LandingPageClient';

// Always renders the landing page regardless of auth state.
export default function LandingRoute() {
  return <LandingPageClient />;
}
