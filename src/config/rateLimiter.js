import rateLimit from "express-rate-limit";

export const flightSearchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  message: {
    status: "error",
    message: "Too many search requests. Please wait and try again.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  // ✅ Add key generator to handle proxy IPs properly
  keyGenerator: (req) => {
    // Use x-forwarded-for header if available (from proxy), otherwise use IP
    return (
      req.headers["x-forwarded-for"] || req.ip || req.connection.remoteAddress
    );
  },
  // ✅ Skip failed requests (don't count them)
  skipFailedRequests: true,
});
