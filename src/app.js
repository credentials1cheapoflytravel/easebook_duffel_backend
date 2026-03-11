import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import ENV from "./config/env.js";
import { errorHandler } from "./middlewares/errorMiddlewares.js";
import { notFound } from "./middlewares/notFoundMiddlewares.js";
import airportRoutes from "./routes/airport.routes.js";
import authRoutes from "./routes/auth.routes.js";
import flightRoutes from "./routes/flight.routes.js";
import bookingRoutes from "./routes/booking.routes.js";

const app = express();

// Parse CLIENT_URLS from environment variable
const clientUrls = process.env.CLIENT_URLS
  ? process.env.CLIENT_URLS.split(",")
  : [];

// === Dynamic CORS Configuration ===
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  ...clientUrls,
];

console.log("🌐 Allowed CORS origins:", allowedOrigins);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (e.g., mobile apps, Postman)
      if (!origin) return callback(null, true);

      // Allow all origins in development
      if (process.env.NODE_ENV !== "production") {
        return callback(null, true);
      }

      // Check if origin is allowed
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        console.warn(`🚫 CORS blocked request from: ${origin}`);
        return callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    optionsSuccessStatus: 200,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// === Logger (only for dev)
if (ENV.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// === API Routes ===
app.get("/", (req, res) => res.send("🚀 API is running..."));
app.use("/api/airports", airportRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/flights", flightRoutes);
app.use("/api/bookings", bookingRoutes);

// === Error Handlers ===
app.use(notFound);
app.use(errorHandler);

export default app;
