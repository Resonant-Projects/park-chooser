# Business Logic

## Entitlement Tiers

| Tier | Parks | Picks |
|------|-------|-------|
| FREE | 5 max | 1/day |
| PREMIUM | Unlimited | Unlimited |

## Access Check

`getEffectiveTier()` in `convex/lib/entitlements.ts` is the authoritative access check.

It honors the paid period after cancellation (user keeps premium until billing period ends).
