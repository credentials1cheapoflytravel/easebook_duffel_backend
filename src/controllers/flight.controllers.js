import { successResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { createOfferRequest } from "../services/duffel.service.js";

export const searchFlights = async (req, res) => {
  const {
    origin,
    destination,
    departureDate,
    returnDate,
    tripType,
    passengers,
    cabinClass,
  } = req.body;

  if (!origin || !destination || !departureDate) {
    throw new ApiError(400, "Missing required fields");
  }

  if (!passengers || !passengers.adults || passengers.adults < 1) {
    throw new ApiError(400, "At least one adult is required");
  }

  const offers = await createOfferRequest({
    origin,
    destination,
    departureDate,
    returnDate,
    tripType,
    passengers,
    cabinClass,
  });

  return successResponse(res, "Flights fetched successfully", offers);
};
