import express from "express";
import {
  getAirportByIata,
  searchAirports,
} from "../controllers/airport.controllers.js";

const router = express.Router();

router.get("/search", searchAirports);
router.get("/iata/:code", getAirportByIata);

export default router;
