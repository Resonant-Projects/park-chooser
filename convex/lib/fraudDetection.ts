import { DatabaseReader, DatabaseWriter } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Fraud detection for referral system.
 * Checks for suspicious patterns that may indicate self-referral or abuse.
 */

// Limits for fraud detection
const LIMITS = {
  maxSignupsPerIp7Days: 3,
  maxSignupsPerDevice7Days: 2,
  maxSignupsPerCodeHour: 10,
  maxSignupsPerCodeDay: 50,
};

/**
 * Check for potential self-referral signals.
 */
export async function checkSelfReferral(
  db: DatabaseReader,
  referrerId: Id<"users">,
  signupIpHash: string | undefined,
  signupDeviceFingerprint: string | undefined
): Promise<{ isSuspicious: boolean; reason?: string }> {
  if (!signupIpHash && !signupDeviceFingerprint) {
    // Can't check without identifiers, allow but flag
    return { isSuspicious: false };
  }

  // Get referrer's recent referrals to check patterns
  const referrerReferrals = await db
    .query("referrals")
    .withIndex("by_referrer", (q) => q.eq("referrerId", referrerId))
    .collect();

  // Check if any recent referral came from same IP
  if (signupIpHash) {
    const sameIpReferrals = referrerReferrals.filter(
      (r) => r.signupIpHash === signupIpHash
    );
    if (sameIpReferrals.length > 0) {
      return { isSuspicious: true, reason: "ip_match_existing_referral" };
    }
  }

  // Check if any recent referral came from same device
  if (signupDeviceFingerprint) {
    const sameDeviceReferrals = referrerReferrals.filter(
      (r) => r.signupDeviceFingerprint === signupDeviceFingerprint
    );
    if (sameDeviceReferrals.length > 0) {
      return { isSuspicious: true, reason: "device_match_existing_referral" };
    }
  }

  return { isSuspicious: false };
}

/**
 * Check and update fraud signals for rate limiting.
 */
export async function checkAndUpdateFraudSignals(
  db: DatabaseWriter,
  identifier: string,
  signalType: string
): Promise<{ blocked: boolean; count: number }> {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  const existing = await db
    .query("referralFraudSignals")
    .withIndex("by_identifier_type", (q) =>
      q.eq("identifier", identifier).eq("signalType", signalType)
    )
    .unique();

  if (existing) {
    // Reset if window has passed
    if (existing.firstSeenAt < sevenDaysAgo) {
      await db.patch(existing._id, {
        count: 1,
        firstSeenAt: now,
        lastSeenAt: now,
      });
      return { blocked: false, count: 1 };
    }

    // Increment count
    const newCount = existing.count + 1;
    await db.patch(existing._id, {
      count: newCount,
      lastSeenAt: now,
    });

    // Check limits based on signal type
    const limit =
      signalType === "ip_signup"
        ? LIMITS.maxSignupsPerIp7Days
        : LIMITS.maxSignupsPerDevice7Days;

    return { blocked: newCount > limit, count: newCount };
  }

  // Create new signal record
  await db.insert("referralFraudSignals", {
    identifier,
    signalType,
    count: 1,
    firstSeenAt: now,
    lastSeenAt: now,
  });

  return { blocked: false, count: 1 };
}

/**
 * Check code velocity (prevent deal-site abuse).
 */
export async function checkCodeVelocity(
  db: DatabaseReader,
  codeId: Id<"referralCodes">
): Promise<{ throttled: boolean; reason?: string }> {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  // Get referrals for this code
  const referrals = await db
    .query("referrals")
    .filter((q) => q.eq(q.field("referralCodeId"), codeId))
    .collect();

  // Check hourly limit
  const lastHourCount = referrals.filter((r) => r.signupAt > oneHourAgo).length;
  if (lastHourCount >= LIMITS.maxSignupsPerCodeHour) {
    return { throttled: true, reason: "hourly_limit_exceeded" };
  }

  // Check daily limit
  const lastDayCount = referrals.filter((r) => r.signupAt > oneDayAgo).length;
  if (lastDayCount >= LIMITS.maxSignupsPerCodeDay) {
    return { throttled: true, reason: "daily_limit_exceeded" };
  }

  return { throttled: false };
}

/**
 * Validate conversion is legitimate.
 */
export function validateConversion(
  signupAt: number,
  subscriptionStatus: string
): { valid: boolean; reason?: string } {
  // Check status is truly active (not trialing, incomplete, etc.)
  if (subscriptionStatus !== "active") {
    return { valid: false, reason: "not_active_subscription" };
  }

  // Ensure 48+ hours since signup (prevents rapid gaming)
  const hoursSinceSignup = (Date.now() - signupAt) / (1000 * 60 * 60);
  if (hoursSinceSignup < 48) {
    return { valid: false, reason: "too_soon_after_signup" };
  }

  return { valid: true };
}
