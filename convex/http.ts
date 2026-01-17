import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Webhook } from "svix";

/**
 * Build a Clerk token identifier from a user ID.
 */
function buildTokenIdentifier(userId: string | undefined): string | null {
  if (!userId) return null;
  const env = process.env.CLERK_PUBLISHABLE_KEY?.split("_")[1] ?? "accounts";
  return `https://clerk.${env}.dev|${userId}`;
}

const http = httpRouter();

/**
 * Clerk Billing Webhook Endpoint
 *
 * Handles subscription events from Clerk Billing to sync user entitlements.
 *
 * Subscription Item Events (subscriptionItem.*):
 *   - subscriptionItem.created, subscriptionItem.updated, subscriptionItem.active
 *   - subscriptionItem.deleted, subscriptionItem.canceled, subscriptionItem.ended
 *
 * Subscription Events (subscription.*):
 *   - subscription.created, subscription.updated, subscription.active
 *   - subscription.canceled, subscription.ended
 *
 * Note: subscription.* events have a different payload structure with items[] array.
 */
http.route({
  path: "/webhooks/clerk-billing",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const event = await validateRequest(request);
    if (!event) {
      return new Response("Invalid webhook signature", { status: 400 });
    }

    console.log("Received Clerk Billing webhook:", event.type);

    try {
      switch (event.type) {
        case "subscriptionItem.created":
        case "subscriptionItem.updated":
        case "subscriptionItem.active": {
          const data = event.data as ClerkSubscriptionItemData;

          const tokenIdentifier = buildTokenIdentifier(data.payer?.user_id);

          if (!tokenIdentifier) {
            console.warn("No user_id in subscription item:", data.id);
            return new Response("Missing user_id", { status: 400 });
          }

          const result = await ctx.runMutation(internal.entitlements.upsertFromClerkWebhook, {
            tokenIdentifier,
            clerkSubscriptionId: data.subscription_id,
            clerkSubscriptionItemId: data.id,
            clerkPlanId: data.plan_id,
            clerkPlanSlug: data.plan?.slug,
            status: data.status,
            periodStart: data.current_period_start
              ? new Date(data.current_period_start).getTime()
              : undefined,
            periodEnd: data.current_period_end
              ? new Date(data.current_period_end).getTime()
              : undefined,
          });

          console.log("Entitlement sync result:", result);

          // Process referral conversion for new active subscriptions
          if (data.status === "active") {
            const user = await ctx.runQuery(internal.users.getUserByTokenInternal, {
              tokenIdentifier,
            });

            if (user) {
              const referralResult = await ctx.runAction(
                internal.actions.processReferralConversion.processReferralConversion,
                {
                  refereeId: user._id,
                  subscriptionStatus: data.status,
                }
              );
              console.log("Referral conversion result:", referralResult);
            }
          }

          break;
        }

        case "subscriptionItem.deleted":
        case "subscriptionItem.canceled":
        case "subscriptionItem.ended": {
          const data = event.data as ClerkSubscriptionItemData;

          const tokenIdentifier = buildTokenIdentifier(data.payer?.user_id);

          if (tokenIdentifier) {
            // Set status to canceled, which will trigger downgrade logic
            await ctx.runMutation(internal.entitlements.upsertFromClerkWebhook, {
              tokenIdentifier,
              clerkSubscriptionId: data.subscription_id,
              clerkSubscriptionItemId: data.id,
              clerkPlanId: data.plan_id,
              clerkPlanSlug: data.plan?.slug,
              status: "canceled",
            });
            console.log("Subscription canceled for user:", data.payer?.user_id);
          }
          break;
        }

        // Handle subscription-level events (different structure than subscriptionItem.* events)
        case "subscription.created":
        case "subscription.updated":
        case "subscription.active": {
          const data = event.data as ClerkSubscriptionData;
          const tokenIdentifier = buildTokenIdentifier(data.payer?.user_id);

          if (!tokenIdentifier) {
            console.warn("No user_id in subscription:", data.id);
            return new Response("Missing user_id", { status: 400 });
          }

          // Find the active subscription item, or fall back to most relevant one
          const activeItem =
            data.items.find((item) => item.status === "active") ??
            data.items.find((item) => item.status !== "ended" && item.status !== "canceled") ??
            data.items[data.items.length - 1]; // fallback to last item

          if (!activeItem) {
            console.warn("No subscription items found in subscription:", data.id);
            return new Response("No subscription items", { status: 400 });
          }

          console.log("Processing subscription event:", {
            subscriptionId: data.id,
            subscriptionStatus: data.status,
            activeItemId: activeItem.id,
            activeItemStatus: activeItem.status,
            planSlug: activeItem.plan?.slug,
          });

          const result = await ctx.runMutation(internal.entitlements.upsertFromClerkWebhook, {
            tokenIdentifier,
            clerkSubscriptionId: data.id,
            clerkSubscriptionItemId: activeItem.id,
            clerkPlanId: activeItem.plan_id,
            clerkPlanSlug: activeItem.plan?.slug,
            status: activeItem.status,
            periodStart: activeItem.period_start,
            periodEnd: activeItem.period_end,
          });

          console.log("Entitlement sync result:", result);

          // Process referral conversion for active subscriptions
          if (data.status === "active") {
            const user = await ctx.runQuery(internal.users.getUserByTokenInternal, {
              tokenIdentifier,
            });

            if (user) {
              const referralResult = await ctx.runAction(
                internal.actions.processReferralConversion.processReferralConversion,
                {
                  refereeId: user._id,
                  subscriptionStatus: activeItem.status,
                }
              );
              console.log("Referral conversion result:", referralResult);
            }
          }

          break;
        }

        case "subscription.canceled":
        case "subscription.ended": {
          const data = event.data as ClerkSubscriptionData;
          const tokenIdentifier = buildTokenIdentifier(data.payer?.user_id);

          if (tokenIdentifier) {
            // Find any item to get plan info (use first item as reference)
            const item = data.items[0];

            await ctx.runMutation(internal.entitlements.upsertFromClerkWebhook, {
              tokenIdentifier,
              clerkSubscriptionId: data.id,
              clerkSubscriptionItemId: item?.id ?? data.id,
              clerkPlanId: item?.plan_id ?? "",
              clerkPlanSlug: item?.plan?.slug,
              status: "canceled",
            });
            console.log("Subscription canceled/ended for user:", data.payer?.user_id);
          }
          break;
        }

        default:
          console.log("Ignored Clerk Billing webhook event:", event.type);
      }

      return new Response(null, { status: 200 });
    } catch (error) {
      console.error("Error processing Clerk Billing webhook:", error);
      return new Response("Internal error", { status: 500 });
    }
  }),
});

/**
 * Validate Svix webhook signature.
 */
async function validateRequest(req: Request): Promise<ClerkWebhookEvent | null> {
  const payloadString = await req.text();

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    console.error("Missing Svix headers");
    return null;
  }

  const webhookSecret = process.env.CLERK_BILLING_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("CLERK_BILLING_WEBHOOK_SECRET not configured");
    return null;
  }

  const wh = new Webhook(webhookSecret);

  try {
    const event = wh.verify(payloadString, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as unknown as ClerkWebhookEvent;
    return event;
  } catch (error) {
    console.error("Error verifying webhook signature:", error);
    return null;
  }
}

// Type definitions for Clerk Billing webhook events
interface ClerkWebhookEvent {
  type: string;
  data: unknown;
}

interface ClerkSubscriptionItemData {
  id: string;
  subscription_id: string;
  plan_id: string;
  payer?: {
    user_id?: string;
    email?: string;
  };
  plan?: {
    slug?: string;
    name?: string;
  };
  status: string;
  current_period_start?: string;
  current_period_end?: string;
}

/**
 * Type definition for subscription-level events (subscription.created, subscription.updated, etc.)
 * These have a different structure than subscriptionItem.* events
 */
interface ClerkSubscriptionData {
  id: string; // subscription ID (csub_xxx)
  status: string;
  items: Array<{
    id: string;
    plan_id: string;
    plan?: {
      slug?: string;
      name?: string;
      amount?: number;
    };
    status: string;
    period_start?: number;
    period_end?: number;
  }>;
  payer?: {
    user_id?: string;
    email?: string;
  };
}

export default http;
