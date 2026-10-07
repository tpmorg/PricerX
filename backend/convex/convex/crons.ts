import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily("prune pricing rate-limit windows", { hourUTC: 9, minuteUTC: 0 }, internal.rateLimits.pruneExpiredWindows);

export default crons;
