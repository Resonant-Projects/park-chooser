import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Webhook } from "svix";

const http = httpRouter();

/**
 * Clerk Billing Webhook Endpoint
 *
 * Handles subscription events from Clerk Billing to sync user entitlements.
 * Events: subscriptionItem.created, subscriptionItem.updated, subscriptionItem.deleted
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
        case "subscriptionItem.updated": {
          const data = event.data as ClerkSubscriptionItemData;

          // Extract user identifier from metadata or subscription
          const tokenIdentifier = data.user_id
            ? `https://clerk.${process.env.CLERK_PUBLISHABLE_KEY?.split("_")[1] || "accounts"}.dev|${data.user_id}`
            : null;

          if (!tokenIdentifier) {
            console.warn("No user_id in subscription item:", data.id);
            return new Response("Missing user_id", { status: 400 });
          }

          const result = await ctx.runMutation(
            internal.entitlements.upsertFromClerkWebhook,
            {
              tokenIdentifier,
              clerkSubscriptionId: data.subscription_id,
              clerkSubscriptionItemId: data.id,
              clerkPlanId: data.plan_id,
              status: data.status,
              periodStart: data.current_period_start
                ? new Date(data.current_period_start).getTime()
                : undefined,
              periodEnd: data.current_period_end
                ? new Date(data.current_period_end).getTime()
                : undefined,
            }
          );

          console.log("Entitlement sync result:", result);

          // Process referral conversion for new active subscriptions
          if (data.status === "active") {
            const user = await ctx.runQuery(
              internal.users.getUserByTokenInternal,
              { tokenIdentifier }
            );

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

        case "subscriptionItem.deleted": {
          const data = event.data as ClerkSubscriptionItemData;

          // Find user by subscription item ID and downgrade
          const tokenIdentifier = data.user_id
            ? `https://clerk.${process.env.CLERK_PUBLISHABLE_KEY?.split("_")[1] || "accounts"}.dev|${data.user_id}`
            : null;

          if (tokenIdentifier) {
            // Set status to canceled, which will trigger downgrade logic
            await ctx.runMutation(internal.entitlements.upsertFromClerkWebhook, {
              tokenIdentifier,
              clerkSubscriptionId: data.subscription_id,
              clerkSubscriptionItemId: data.id,
              clerkPlanId: data.plan_id,
              status: "canceled",
            });
            console.log("Subscription canceled for user:", data.user_id);
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
async function validateRequest(
  req: Request
): Promise<ClerkWebhookEvent | null> {
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
  user_id?: string;
  status: string;
  current_period_start?: string;
  current_period_end?: string;
}

export default http;
