const clerkJwtIssuerDomain = process.env.CLERK_JWT_ISSUER_DOMAIN;
if (!clerkJwtIssuerDomain) {
  throw new Error(
    "CLERK_JWT_ISSUER_DOMAIN environment variable is required but not set. " +
    "Please add it to your Convex environment variables."
  );
}

export default {
  providers: [
    {
      domain: clerkJwtIssuerDomain,
      applicationID: "convex",
    },
  ],
};
