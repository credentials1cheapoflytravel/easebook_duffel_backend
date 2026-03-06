import Booking from "../models/booking.model.js";
import { ApiError } from "../utils/ApiError.js";
import { successResponse } from "../utils/ApiResponse.js";

// Pricing multipliers by passenger type
const PASSENGER_PRICE_MULTIPLIERS = {
  adult: 1.0, // Full price
  child: 0.75, // 25% discount (ages 2-11)
  infant: 0.1, // 90% discount (under 2, no seat)
};

export const createDraftBooking = async (req, res) => {
  const { offer } = req.body;

  if (!offer) {
    throw new ApiError(400, "Offer object is required");
  }

  // Check expiry
  if (new Date() > new Date(offer.expires_at)) {
    throw new ApiError(400, "Offer expired. Please re-search flights.");
  }

  const firstSlice = offer.slices[0];
  const firstSegment = firstSlice.segments[0];

  const baggageData = Array.isArray(firstSegment?.passengers[0]?.baggages)
    ? firstSegment.passengers[0].baggages.map((b) => ({
        type: b.type,
        quantity: b.quantity,
      }))
    : [];

  const snapshot = {
    airline: {
      name: offer.owner?.name,
      code: offer.owner?.iata_code,
    },

    slices: offer.slices.map((slice) => ({
      origin: slice.origin?.iata_code,
      destination: slice.destination?.iata_code,
      departureTime: slice.segments[0]?.departing_at,
      arrivalTime: slice.segments[slice.segments.length - 1]?.arriving_at,
      duration: slice.duration,
      flightNumber: slice.segments[0]?.marketing_carrier_flight_number,
    })),

    fareBrandName: firstSlice?.fare_brand_name,
    cabinClass: firstSegment?.passengers[0]?.cabin_class || "economy",

    baggageIncluded: baggageData,

    baseAmount: Number(offer.base_amount),
    taxAmount: Number(offer.tax_amount),
    totalAmount: Number(offer.total_amount),
    currency: offer.total_currency,

    expiresAt: offer.expires_at,
  };

  const booking = await Booking.create({
    user: req.user._id,
    offerId: offer.id,
    offerPassengerIds: offer.passengers.map((p) => p.id),
    offerSnapshot: snapshot,
    itinerary: {
      origin: snapshot.slices[0].origin,
      destination: snapshot.slices[0].destination,
      departureDate: snapshot.slices[0].departureTime,
    },
    totalAmount: snapshot.totalAmount,
    bookingStatus: "draft",
  });

  return successResponse(res, "Draft booking created", booking);
};

// Add Traveller Info with passenger-based pricing
export const addTravellerInfo = async (req, res) => {
  const { id } = req.params;
  const { contactInfo, passengers } = req.body;

  if (!contactInfo || !passengers?.length) {
    throw new ApiError(400, "Contact info and passengers are required");
  }

  const booking = await Booking.findById(id);

  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  if (booking.bookingStatus !== "draft") {
    throw new ApiError(400, "Cannot modify this booking");
  }

  booking.contactInfo = contactInfo;
  booking.passengers = passengers;

  /* ================= PASSENGER-BASED PRICE CALCULATION ================= */

  const baseFare = booking.offerSnapshot?.baseAmount || 0;
  const tax = booking.offerSnapshot?.taxAmount || 0;

  // Calculate totals by passenger type
  let baseTotal = 0;
  let taxTotal = 0;
  let passengerBreakdown = [];

  // Group passengers by type for breakdown
  const counts = {
    adult: passengers.filter((p) => p.type === "adult").length,
    child: passengers.filter((p) => p.type === "child").length,
    infant: passengers.filter((p) => p.type === "infant").length,
  };

  // Calculate adult totals
  if (counts.adult > 0) {
    const adultBase =
      baseFare * PASSENGER_PRICE_MULTIPLIERS.adult * counts.adult;
    const adultTax = tax * PASSENGER_PRICE_MULTIPLIERS.adult * counts.adult;
    baseTotal += adultBase;
    taxTotal += adultTax;
    passengerBreakdown.push({
      type: "adult",
      count: counts.adult,
      basePrice: adultBase,
      taxPrice: adultTax,
      totalPrice: adultBase + adultTax,
      multiplier: PASSENGER_PRICE_MULTIPLIERS.adult,
    });
  }

  // Calculate child totals (25% discount)
  if (counts.child > 0) {
    const childBase =
      baseFare * PASSENGER_PRICE_MULTIPLIERS.child * counts.child;
    const childTax = tax * PASSENGER_PRICE_MULTIPLIERS.child * counts.child;
    baseTotal += childBase;
    taxTotal += childTax;
    passengerBreakdown.push({
      type: "child",
      count: counts.child,
      basePrice: childBase,
      taxPrice: childTax,
      totalPrice: childBase + childTax,
      multiplier: PASSENGER_PRICE_MULTIPLIERS.child,
      discount: "25% off",
    });
  }

  // Calculate infant totals (90% discount, no seat)
  if (counts.infant > 0) {
    const infantBase =
      baseFare * PASSENGER_PRICE_MULTIPLIERS.infant * counts.infant;
    const infantTax = tax * PASSENGER_PRICE_MULTIPLIERS.infant * counts.infant;
    baseTotal += infantBase;
    taxTotal += infantTax;
    passengerBreakdown.push({
      type: "infant",
      count: counts.infant,
      basePrice: infantBase,
      taxPrice: infantTax,
      totalPrice: infantBase + infantTax,
      multiplier: PASSENGER_PRICE_MULTIPLIERS.infant,
      discount: "90% off (no seat)",
    });
  }

  // Store the breakdown and totals
  booking.passengerBreakdown = passengerBreakdown;
  booking.baseTotal = baseTotal;
  booking.taxTotal = taxTotal;

  // Recalculate total amount
  booking.totalAmount =
    baseTotal +
    taxTotal +
    (booking.internalAddonsAmount || 0) +
    (booking.fareAmount || 0);

  await booking.save();

  return successResponse(res, "Traveller information saved", booking);
};

// Add On's Service
const PRICING = {
  extraBaggagePerBag: 50,
  travelInsurance: 33,
  tripProtection: 39,
  priceDropProtection: 21,
  autoCheckIn: 15,
};

export const updateInternalAddons = async (req, res) => {
  const { bookingId } = req.params;

  const {
    extraBaggageOutbound = 0,
    extraBaggageReturn = 0,
    travelInsurance = false,
    tripProtection = false,
    priceDropProtection = false,
    autoCheckIn = false,
  } = req.body;

  const booking = await Booking.findById(bookingId);

  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  if (booking.bookingStatus !== "draft") {
    throw new ApiError(400, "Cannot modify confirmed booking");
  }

  // Get passenger counts for per-person pricing
  const passengerCount = booking.passengers?.length || 1;

  // Separate counts for addons that might have different rules
  const adultCount =
    booking.passengers?.filter((p) => p.type === "adult").length || 1;
  const childCount =
    booking.passengers?.filter((p) => p.type === "child").length || 0;
  const infantCount =
    booking.passengers?.filter((p) => p.type === "infant").length || 0;

  // Calculate prices with passenger count
  const baggagePrice =
    (extraBaggageOutbound + extraBaggageReturn) *
    PRICING.extraBaggagePerBag *
    passengerCount;

  // Some addons might only apply to adults (e.g., alcohol, certain insurances)
  const insurancePrice = travelInsurance
    ? PRICING.travelInsurance * (adultCount + childCount) // Infants might not need insurance
    : 0;

  const tripPrice = tripProtection
    ? PRICING.tripProtection * passengerCount
    : 0;

  const priceDropPrice = priceDropProtection
    ? PRICING.priceDropProtection * passengerCount
    : 0;

  const autoCheckPrice = autoCheckIn ? PRICING.autoCheckIn * passengerCount : 0;

  const totalAddonAmount =
    baggagePrice + insurancePrice + tripPrice + priceDropPrice + autoCheckPrice;

  // Save in DB
  booking.internalAddons = {
    extraBaggage: {
      outbound: extraBaggageOutbound,
      return: extraBaggageReturn,
      price: baggagePrice,
    },
    travelInsurance: {
      selected: travelInsurance,
      price: insurancePrice,
    },
    tripProtection: {
      selected: tripProtection,
      price: tripPrice,
    },
    priceDropProtection: {
      selected: priceDropProtection,
      price: priceDropPrice,
    },
    autoCheckIn: {
      selected: autoCheckIn,
      price: autoCheckPrice,
    },
  };

  booking.internalAddonsAmount = totalAddonAmount;

  // Recalculate total amount including all components
  const baseTotal = booking.baseTotal || 0;
  const taxTotal = booking.taxTotal || 0;

  booking.totalAmount =
    baseTotal +
    taxTotal +
    booking.internalAddonsAmount +
    (booking.fareAmount || 0);

  await booking.save();

  return successResponse(res, "Addons updated successfully", booking);
};

export const getBooking = async (req, res) => {
  const { id } = req.params;

  const booking = await Booking.findById(id);

  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  return successResponse(res, "Booking fetched", booking);
};

export const updateFareType = async (req, res) => {
  const { id } = req.params;
  const { fareType } = req.body;

  const booking = await Booking.findById(id);

  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  if (booking.bookingStatus !== "draft") {
    throw new ApiError(400, "Cannot modify confirmed booking");
  }

  let fareAmount = 0;

  if (fareType === "flexi") {
    fareAmount = 49.99;
  }

  booking.fareType = fareType;
  booking.fareAmount = fareAmount;

  // Recalculate total
  const baseTotal = booking.baseTotal || 0;
  const taxTotal = booking.taxTotal || 0;

  booking.totalAmount =
    baseTotal + taxTotal + (booking.internalAddonsAmount || 0) + fareAmount;

  await booking.save();

  return successResponse(res, "Fare type updated successfully", booking);
};

// Save payment details (without processing)
export const savePaymentDetails = async (req, res) => {
  const { id } = req.params;
  const {
    cardNumber,
    cardHolder,
    expiryMonth,
    expiryYear,
    cvv,
    paymentMethod,
  } = req.body;

  const booking = await Booking.findById(id);

  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  if (booking.bookingStatus !== "draft") {
    throw new ApiError(400, "Cannot modify confirmed booking");
  }

  // Mask card number for storage (store only last 4 digits)
  const maskedCardNumber = cardNumber ? `****${cardNumber.slice(-4)}` : null;

  // Save payment details (in production, you'd use a payment processor)
  booking.paymentDetails = {
    cardHolder,
    maskedCardNumber,
    expiryMonth,
    expiryYear,
    paymentMethod: paymentMethod || "credit_card",
    savedAt: new Date(),
  };

  // Update booking status to confirmed (simulating successful payment)
  booking.bookingStatus = "confirmed";
  booking.paymentStatus = "paid";

  // Generate booking reference / PNR
  booking.bookingReference = generateBookingReference();

  await booking.save();

  // ============ CLEANUP: Delete all other draft/pending bookings for this user ============
  await Booking.deleteMany({
    user: booking.user,
    _id: { $ne: booking._id }, // Exclude the current confirmed booking
    bookingStatus: { $in: ["draft", "pending"] },
  });

  return successResponse(res, "Payment details saved successfully", booking);
};

// Helper function to generate booking reference
const generateBookingReference = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const getBookingByReference = async (req, res) => {
  const { reference } = req.params;

  const booking = await Booking.findOne({ bookingReference: reference });

  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  return successResponse(res, "Booking fetched", booking);
};
