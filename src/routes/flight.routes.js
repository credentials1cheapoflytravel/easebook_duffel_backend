import express from "express";
import { searchFlights } from "../controllers/flight.controllers.js";
import { flightSearchLimiter } from "../config/rateLimiter.js";

const router = express.Router();

router.post("/search", flightSearchLimiter, searchFlights);

export default router;
