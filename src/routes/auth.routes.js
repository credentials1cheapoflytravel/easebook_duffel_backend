import express from "express";

import { protect } from "../middlewares/authMiddlewares.js";
import {
  getMe,
  login,
  logout,
  register,
} from "../controllers/auth.controllers.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", protect, getMe);

export default router;
