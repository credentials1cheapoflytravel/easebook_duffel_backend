import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";

export const protect = async (req, res, next) => {
  let token;

  // Check Authorization header for Bearer token
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    console.log("❌ No token found in Authorization header");
    throw new ApiError(401, "Not authorized");
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("✅ Token verified for user ID:", decoded.id);

    // Find user by id
    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      console.log("❌ User not found for ID:", decoded.id);
      throw new ApiError(401, "User not found");
    }

    console.log("✅ User authenticated:", req.user.email);
    next();
  } catch (error) {
    console.log("❌ Token verification failed:", error.message);
    throw new ApiError(401, "Not authorized");
  }
};
