import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Webhook } from "svix";

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
    const result = await validateRequest(request);
    if (!result.success) {
      return new Response(result.error, { status: 400 });
    }
    const event = result.event;

    console.log("Received Clerk Billing webhook:", event.type);

    try {
      switch (event.type) {
        // Handle user creation from Clerk
        case "user.created": {
          const data = event.data as ClerkUserData;

          // Get primary email
          const primaryEmail = data.email_addresses.find(
            (e) => e.id === data.primary_email_address_id
          )?.email_address;

          await ctx.runMutation(internal.users.upsertFromClerkWebhook, {
            clerkUserId: data.id,
            email: primaryEmail,
            firstName: data.first_name ?? undefined,
            lastName: data.last_name ?? undefined,
            imageUrl: data.image_url ?? undefined,
          });

          console.log("User created from webhook:", data.id);
          break;
        }

        case "subscriptionItem.created":
        case "subscriptionItem.updated":
        case "subscriptionItem.active": {
          const data = event.data as ClerkSubscriptionItemData;
          const clerkUserId = data.payer?.user_id;

          if (!clerkUserId) {
            console.warn("No user_id in subscription item:", data.id);
            return new Response("Missing user_id", { status: 400 });
          }

          // Look up user by Clerk ID
          const user = await ctx.runQuery(internal.users.getUserByClerkId, { clerkUserId });

          if (!user) {
            console.warn("User not found for Clerk ID:", clerkUserId);
            return new Response("User not found", { status: 404 });
          }

          const result = await ctx.runMutation(internal.entitlements.upsertFromClerkWebhook, {
            userId: user._id,
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
            const referralResult = await ctx.runAction(
              internal.actions.processReferralConversion.processReferralConversion,
              {
                refereeId: user._id,
                subscriptionStatus: data.status,
              }
            );
            console.log("Referral conversion result:", referralResult);
          }

          break;
        }

        case "subscriptionItem.deleted":
        case "subscriptionItem.canceled":
        case "subscriptionItem.ended": {
          const data = event.data as ClerkSubscriptionItemData;
          const clerkUserId = data.payer?.user_id;

          if (clerkUserId) {
            const user = await ctx.runQuery(internal.users.getUserByClerkId, { clerkUserId });

            if (user) {
              // Set status to canceled, which will trigger downgrade logic
              await ctx.runMutation(internal.entitlements.upsertFromClerkWebhook, {
                userId: user._id,
                clerkSubscriptionId: data.subscription_id,
                clerkSubscriptionItemId: data.id,
                clerkPlanId: data.plan_id,
                clerkPlanSlug: data.plan?.slug,
                status: "canceled",
              });
              console.log("Subscription canceled for user:", clerkUserId);
            } else {
              console.warn("User not found for canceled subscription:", clerkUserId);
            }
          }
          break;
        }

        // Handle subscription-level events (different structure than subscriptionItem.* events)
        case "subscription.created":
        case "subscription.updated":
        case "subscription.active":
        case "subscription.past_due": {
          const data = event.data as ClerkSubscriptionData;
          const clerkUserId = data.payer?.user_id;

          if (!clerkUserId) {
            console.warn("No user_id in subscription:", data.id);
            return new Response("Missing user_id", { status: 400 });
          }

          // Look up user by Clerk ID
          const user = await ctx.runQuery(internal.users.getUserByClerkId, { clerkUserId });

          if (!user) {
            console.warn("User not found for Clerk ID:", clerkUserId);
            return new Response("User not found", { status: 404 });
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

          // For past_due events, use "past_due" status directly
          const status = event.type === "subscription.past_due" ? "past_due" : activeItem.status;

          const result = await ctx.runMutation(internal.entitlements.upsertFromClerkWebhook, {
            userId: user._id,
            clerkSubscriptionId: data.id,
            clerkSubscriptionItemId: activeItem.id,
            clerkPlanId: activeItem.plan_id,
            clerkPlanSlug: activeItem.plan?.slug,
            status,
            periodStart: activeItem.period_start,
            periodEnd: activeItem.period_end,
          });

          console.log("Entitlement sync result:", result);

          // Process referral conversion for active subscriptions
          if (data.status === "active") {
            const referralResult = await ctx.runAction(
              internal.actions.processReferralConversion.processReferralConversion,
              {
                refereeId: user._id,
                subscriptionStatus: data.status,
              }
            );
            console.log("Referral conversion result:", referralResult);
          }

          break;
        }

        case "subscription.canceled":
        case "subscription.ended": {
          const data = event.data as ClerkSubscriptionData;
          const clerkUserId = data.payer?.user_id;

          if (clerkUserId) {
            const user = await ctx.runQuery(internal.users.getUserByClerkId, { clerkUserId });

            if (user) {
              // Find any item to get plan info (use first item as reference)
              const item = data.items[0];

              await ctx.runMutation(internal.entitlements.upsertFromClerkWebhook, {
                userId: user._id,
                clerkSubscriptionId: data.id,
                clerkSubscriptionItemId: item?.id ?? data.id,
                clerkPlanId: item?.plan_id,
                clerkPlanSlug: item?.plan?.slug,
                status: "canceled",
              });
              console.log("Subscription canceled/ended for user:", clerkUserId);
            } else {
              console.warn("User not found for canceled subscription:", clerkUserId);
            }
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

type ValidationResult =
  | { success: true; event: ClerkWebhookEvent }
  | { success: false; error: string };

/**
 * Validate Svix webhook signature.
 */
async function validateRequest(req: Request): Promise<ValidationResult> {
  const payloadString = await req.text();

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    console.error("Missing Svix headers");
    return { success: false, error: "Missing Svix headers" };
  }

  const webhookSecret = process.env.CLERK_BILLING_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("CLERK_BILLING_WEBHOOK_SECRET not configured");
    return { success: false, error: "Webhook secret not configured" };
  }

  const wh = new Webhook(webhookSecret);

  try {
    const event = wh.verify(payloadString, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as unknown as ClerkWebhookEvent;
    return { success: true, event };
  } catch (error) {
    console.error("Error verifying webhook signature:", error);
    return { success: false, error: "Invalid webhook signature" };
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

/**
 * Type definition for Clerk user.created webhook event
 */
interface ClerkUserData {
  id: string;
  email_addresses: Array<{ email_address: string; id: string }>;
  primary_email_address_id: string | null;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
}

export default http;
