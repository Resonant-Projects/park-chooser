export interface ClerkPlanData {
	slug?: string | null;
	name?: string | null;
	amount?: number | null;
}

export interface ClerkPayerData {
	user_id?: string | null;
	email?: string | null;
}

export interface ClerkUserData {
	id: string;
	email_addresses: Array<{ email_address: string; id: string }>;
	primary_email_address_id: string | null;
	first_name: string | null;
	last_name: string | null;
	image_url: string | null;
}

export interface ClerkSubscriptionItemData {
	id: string;
	subscription_id: string;
	plan_id?: string | null;
	payer?: ClerkPayerData | null;
	plan?: ClerkPlanData | null;
	status: string;
	current_period_start?: string | null;
	current_period_end?: string | null;
	is_free_trial?: boolean | null;
}

export interface ClerkSubscriptionData {
	id: string;
	status: string;
	items: ClerkSubscriptionLineItemData[];
	payer?: ClerkPayerData | null;
}

export interface ClerkSubscriptionLineItemData {
	id: string;
	plan_id?: string | null;
	plan?: ClerkPlanData | null;
	status: string;
	period_start?: number | null;
	period_end?: number | null;
	is_free_trial?: boolean | null;
}

export interface NormalizedEntitlementWebhookData {
	clerkSubscriptionId: string;
	clerkSubscriptionItemId: string;
	clerkPlanId?: string;
	clerkPlanSlug?: string;
	status: string;
	periodStart?: number;
	periodEnd?: number;
	isFreeTrial?: boolean;
}

function nullToUndefined<T>(value: T | null | undefined): T | undefined {
	return value ?? undefined;
}

function toTimestamp(value: string | number | null | undefined): number | undefined {
	if (value === null || value === undefined) {
		return undefined;
	}

	if (typeof value === "number") {
		return Number.isFinite(value) ? value : undefined;
	}

	const timestamp = new Date(value).getTime();
	return Number.isFinite(timestamp) ? timestamp : undefined;
}

export function normalizeSubscriptionItemEntitlement(
	data: ClerkSubscriptionItemData,
	status = data.status
): NormalizedEntitlementWebhookData {
	return {
		clerkSubscriptionId: data.subscription_id,
		clerkSubscriptionItemId: data.id,
		clerkPlanId: nullToUndefined(data.plan_id),
		clerkPlanSlug: nullToUndefined(data.plan?.slug),
		status,
		periodStart: toTimestamp(data.current_period_start),
		periodEnd: toTimestamp(data.current_period_end),
		isFreeTrial: nullToUndefined(data.is_free_trial),
	};
}

export function normalizeSubscriptionEntitlement(
	subscriptionId: string,
	item: ClerkSubscriptionLineItemData,
	status = item.status
): NormalizedEntitlementWebhookData {
	return {
		clerkSubscriptionId: subscriptionId,
		clerkSubscriptionItemId: item.id,
		clerkPlanId: nullToUndefined(item.plan_id),
		clerkPlanSlug: nullToUndefined(item.plan?.slug),
		status,
		periodStart: toTimestamp(item.period_start),
		periodEnd: toTimestamp(item.period_end),
		isFreeTrial: nullToUndefined(item.is_free_trial),
	};
}
