import type { NextConfig } from "next";
import { PLACE_TYPES } from "./src/lib/place-types";

/**
 * The previous (WordPress) allparx.com spelled category slugs with hyphens
 * — /places/category/hiking-area — while the current keys are the Google
 * Places type names, which use underscores. Those old category URLs are still
 * indexed and still receive traffic, so each one 301s to its modern
 * equivalent rather than 404ing. Only types whose key actually contains an
 * underscore need a rule; the rest already match.
 */
const legacyCategoryRedirects = PLACE_TYPES.filter((type) => type.includes("_")).flatMap((type) => {
  const legacy = type.replace(/_/g, "-");
  return [
    { source: `/places/category/${legacy}`, destination: `/places/category/${type}`, permanent: true },
    {
      source: `/places/category/${legacy}/page/:page`,
      destination: `/places/category/${type}/page/:page`,
      permanent: true,
    },
  ];
});

const nextConfig: NextConfig = {
  async redirects() {
    return legacyCategoryRedirects;
  },
};

export default nextConfig;
