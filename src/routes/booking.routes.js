import express from "express";
import { protect } from "../middlewares/authMiddlewares.js";
import {
  addTravellerInfo,
  createDraftBooking,
  getBooking,
  getBookingByReference,
  savePaymentDetails,
  updateFareType,
  updateInternalAddons,
} from "../controllers/booking.controllers.js";
import {
  capturePaypalPayment,
  createPaypalOrder,
} from "../controllers/payment.controllers.js";

const router = express.Router();

router.post("/draft", protect, createDraftBooking);
router.put("/:id/travellers", protect, addTravellerInfo);
router.post("/:bookingId/addons", protect, updateInternalAddons);
router.get("/:id", protect, getBooking);
router.put("/:id/fare", protect, updateFareType);
// Save payment details
router.post("/:id/payment-details", protect, savePaymentDetails);
router.get("/reference/:reference", protect, getBookingByReference);

// Step 1 – Create PayPal Order (after Duffel hold)
router.post("/:bookingId/pay", protect, createPaypalOrder);

// Step 2 – Capture Payment + Confirm Duffel
router.post("/:bookingId/capture", protect, capturePaypalPayment);

export default router;
