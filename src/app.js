import express from "express";
import cors from "cors";
import morgan from "morgan";

import ENV from "./config/env.js";
import { errorHandler } from "./middlewares/errorMiddlewares.js";
import { notFound } from "./middlewares/notFoundMiddlewares.js";
import airportRoutes from "./routes/airport.routes.js";
import authRoutes from "./routes/auth.routes.js";
import flightRoutes from "./routes/flight.routes.js";
import bookingRoutes from "./routes/booking.routes.js";

const app = express();

// Trust proxy for rate limiting
app.set("trust proxy", 1);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: ENV.NODE_ENV,
  });
});

// Parse CLIENT_URLS from environment variable
const clientUrls = ENV.CLIENT_URLS || [];

// === CORS Configuration  ===
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://air-reservation.us",
  "https://www.air-reservation.us",
  ...clientUrls,
];

console.log("🌐 Allowed CORS origins:", allowedOrigins);

// ✅ Simplified CORS - no credentials needed since we're not using cookies
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (ENV.NODE_ENV !== "production") {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      console.warn(`🚫 CORS blocked request from: ${origin}`);
      return callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger (only for dev)
if (ENV.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// API Routes
app.get("/", (req, res) => res.send("🚀 API is running..."));
app.use("/api/airports", airportRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/flights", flightRoutes);
app.use("/api/bookings", bookingRoutes);

// Error Handlers
app.use(notFound);
app.use(errorHandler);

export default app;
