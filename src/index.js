import ENV from "./config/env.js";
import app from "./app.js";
import connectDB from "./config/db.js";
import { log } from "./utils/logger.js";

const PORT = ENV.PORT || 5000;

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("👋 SIGTERM received. Closing gracefully...");
  server.close(() => {
    console.log("💤 Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("👋 SIGINT received. Closing gracefully...");
  server.close(() => {
    console.log("💤 Server closed");
    process.exit(0);
  });
});

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB(ENV.MONGO_URI);

    // Start server
    const server = app.listen(PORT, "0.0.0.0", () => {
      log(`Server running in ${ENV.NODE_ENV} mode on port ${PORT}`, "success");
      console.log(`📍 Health check: http://localhost:${PORT}/health`);
    });

    // Increase timeouts for Railway
    server.keepAliveTimeout = 120000;
    server.headersTimeout = 120000;
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
