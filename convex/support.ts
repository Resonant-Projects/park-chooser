import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getUserFromIdentity } from "./lib/userHelpers";

/**
 * Create a new support ticket
 */
export const createTicket = mutation({
  args: {
    email: v.string(),
    subject: v.union(
      v.literal("bug"),
      v.literal("billing"),
      v.literal("feature"),
      v.literal("other")
    ),
    message: v.string(),
    userId: v.optional(v.id("users")),
    ipHash: v.optional(v.string()),
  },
  handler: async (ctx, { email, subject, message, userId, ipHash }) => {
    // Generate unique reference ID with retry logic
    const maxAttempts = 5;
    let referenceId: string | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const candidateId = generateReferenceId();
      const existing = await ctx.db
        .query("supportTickets")
        .withIndex("by_reference", (q) => q.eq("referenceId", candidateId))
        .first();

      if (!existing) {
        referenceId = candidateId;
        break;
      }
    }

    if (!referenceId) {
      throw new Error("Failed to generate unique reference ID. Please try again.");
    }

    const ticketId = await ctx.db.insert("supportTickets", {
      email,
      subject,
      message,
      userId,
      status: "new",
      referenceId,
      createdAt: Date.now(),
      ipHash,
    });

    return { ticketId, referenceId };
  },
});

/**
 * Get a ticket by reference ID (for users to check status)
 * Returns limited information to protect sensitive data.
 * Full details only returned if the authenticated user owns the ticket.
 */
export const getByReference = query({
  args: {
    referenceId: v.string(),
  },
  handler: async (ctx, { referenceId }) => {
    const ticket = await ctx.db
      .query("supportTickets")
      .withIndex("by_reference", (q) => q.eq("referenceId", referenceId))
      .first();

    if (!ticket) {
      return null;
    }

    // Check if current user owns this ticket
    const user = await getUserFromIdentity(ctx);
    const isOwner = ticket.userId !== undefined && user?._id === ticket.userId;

    // Return full details to owner, limited info to others
    if (isOwner) {
      return ticket;
    }

    // Return only non-sensitive fields for public status check
    return {
      referenceId: ticket.referenceId,
      subject: ticket.subject,
      status: ticket.status,
      createdAt: ticket.createdAt,
      respondedAt: ticket.respondedAt,
    };
  },
});

/**
 * List tickets by status (for admin - internal only)
 */
export const listByStatus = internalQuery({
  args: {
    status: v.union(
      v.literal("new"),
      v.literal("in_progress"),
      v.literal("resolved"),
      v.literal("closed")
    ),
  },
  handler: async (ctx, { status }) => {
    return await ctx.db
      .query("supportTickets")
      .withIndex("by_status", (q) => q.eq("status", status))
      .order("desc")
      .collect();
  },
});

/**
 * Update ticket status (for admin - internal only)
 */
export const updateStatus = internalMutation({
  args: {
    ticketId: v.id("supportTickets"),
    status: v.union(
      v.literal("new"),
      v.literal("in_progress"),
      v.literal("resolved"),
      v.literal("closed")
    ),
  },
  handler: async (ctx, { ticketId, status }) => {
    // Verify ticket exists before updating
    const ticket = await ctx.db.get(ticketId);
    if (!ticket) {
      throw new Error(`Support ticket ${ticketId} not found`);
    }

    const updates: Record<string, unknown> = { status };

    if (status === "resolved" || status === "closed") {
      updates.respondedAt = Date.now();
    }

    await ctx.db.patch(ticketId, updates);
  },
});

/**
 * Generate a user-friendly reference ID
 * Format: TP-XXXXXX (6 alphanumeric characters)
 */
function generateReferenceId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excluding similar chars (0/O, 1/I)
  let result = "TP-";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
