import User from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { successResponse } from "../utils/ApiResponse.js";
import { generateToken } from "../utils/generateToken.js";

const cookieOptions = {
  httpOnly: true,
  secure: false,
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
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

  res.cookie("token", token, cookieOptions);

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

  res.cookie("token", token, cookieOptions);

  return successResponse(res, "Login successful", {
    id: user._id,
    name: user.name,
    email: user.email,
  });
};

// LOGOUT
export const logout = async (req, res) => {
  res.clearCookie("token");
  return successResponse(res, "Logged out successfully");
};

// GET CURRENT USER
export const getMe = async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  return successResponse(res, "User fetched", user);
};
