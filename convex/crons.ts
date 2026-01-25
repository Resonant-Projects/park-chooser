import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Retry failed referral reward grants hourly
crons.interval(
	"retry failed referral rewards",
	{ hours: 1 },
	internal.actions.retryFailedRewards.retryFailedRewards
);

export default crons;
