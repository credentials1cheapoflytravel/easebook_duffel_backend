import User from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { successResponse } from "../utils/ApiResponse.js";
import { generateToken } from "../utils/generateToken.js";
import ENV from "../config/env.js";

// Dynamic cookie options based on request origin
const getCookieOptions = (req) => {
  const isProduction = ENV.NODE_ENV === "production";
  const origin = req.get("origin") || "";

  // Extract domain from origin for cookie domain setting
  let domain;
  if (isProduction && origin) {
    try {
      const url = new URL(origin);
      // For subdomains, use the parent domain
      const hostParts = url.hostname.split(".");
      if (hostParts.length > 2) {
        // Handle subdomains like www.air-reservation.us
        domain = "." + hostParts.slice(-2).join("."); // .air-reservation.us
      } else {
        domain = "." + url.hostname; // .air-reservation.us
      }
      console.log(`🍪 Setting cookie domain: ${domain} for origin: ${origin}`);
    } catch (e) {
      console.error("Error parsing origin for cookie domain:", e);
      domain = undefined;
    }
  }

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    domain: domain,
  };
};

// REGISTER
export const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, "All fields are required");
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(400, "Email already registered");
  }

  const user = await User.create({ name, email, password });

  const token = generateToken(user._id);

  // Use dynamic cookie options
  res.cookie("token", token, getCookieOptions(req));

  return successResponse(res, "User registered successfully", {
    id: user._id,
    name: user.name,
    email: user.email,
  });
};

// LOGIN
export const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(400, "Invalid credentials");
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new ApiError(400, "Invalid credentials");
  }

  const token = generateToken(user._id);

  // Log for debugging
  console.log("Setting cookie for user:", user.email);
  console.log("Origin:", req.get("origin"));
  console.log("Cookie options:", getCookieOptions(req));

  // Use dynamic cookie options
  res.cookie("token", token, getCookieOptions(req));

  return successResponse(res, "Login successful", {
    id: user._id,
    name: user.name,
    email: user.email,
  });
};

// LOGOUT
export const logout = async (req, res) => {
  res.clearCookie("token", getCookieOptions(req));
  return successResponse(res, "Logged out successfully");
};

// GET CURRENT USER
export const getMe = async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  return successResponse(res, "User fetched", user);
};
