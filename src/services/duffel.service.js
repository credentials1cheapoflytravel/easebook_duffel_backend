import { Duffel } from "@duffel/api";
import ENV from "../config/env.js";
import axios from "axios";

const duffel = new Duffel({
  token: ENV.DUFFEL_API_KEY,
});

const headers = {
  Authorization: `Bearer ${ENV.DUFFEL_API_KEY}`,
  "Duffel-Version": "v2",
  "Content-Type": "application/json",
};

// 🔥 Convert passenger counts to Duffel format
const buildPassengersArray = (passengers = {}) => {
  const { adults = 1, children = 0, infants = 0 } = passengers;

  return [
    ...Array(adults).fill({ type: "adult" }),
    ...Array(children).fill({ type: "child" }),
    ...Array(infants).fill({ type: "infant_without_seat" }),
  ];
};

export const createOfferRequest = async ({
  origin,
  destination,
  departureDate,
  returnDate,
  tripType,
  passengers,
  cabinClass,
}) => {
  const passengerArray = buildPassengersArray(passengers);

  const slices = [
    {
      origin,
      destination,
      departure_date: departureDate,
    },
  ];

  if (tripType === "roundtrip" && returnDate) {
    slices.push({
      origin: destination,
      destination: origin,
      departure_date: returnDate,
    });
  }

  console.log("Passengers sent to Duffel:", passengerArray);

  const offerRequest = await duffel.offerRequests.create({
    slices,
    passengers: passengerArray,
    cabin_class: cabinClass || "economy",
    return_offers: true,
    supplier_timeout: 15000,
    max_connections: 2,
  });

  return offerRequest?.data?.offers || [];
};

// Create Order request
export const createDuffelOrder = async (booking) => {
  try {
    if (!booking.offerPassengerIds || booking.offerPassengerIds.length === 0) {
      throw new Error("Offer passenger IDs missing. Please re-search flights.");
    }

    if (booking.passengers.length !== booking.offerPassengerIds.length) {
      throw new Error("Passenger count mismatch. Please re-search flights.");
    }

    const response = await axios.post(
      `${ENV.DUFFEL_BASE_URL}/air/orders`,
      {
        data: {
          type: "orders",
          selected_offers: [booking.offerId],

          passengers: booking.passengers.map((p, index) => ({
            id: booking.offerPassengerIds[index],
            type: p.type,
            title: "mr",
            gender: p.gender === "female" || p.gender === "f" ? "f" : "m",
            given_name: p.firstName,
            family_name: p.lastName,
            born_on: p.dateOfBirth,

            identity_documents: [
              {
                type: "passport",
                unique_identifier: p.passportNumber,
                issuing_country_code: p.nationality,
                expires_on: p.passportExpiry,
              },
            ],

            email: booking.contactInfo.email,
            phone_number: booking.contactInfo.phone,
          })),

          // 🔥 THIS WAS MISSING
          payments: [
            {
              type: "balance",
              amount: Number(booking.offerSnapshot.totalAmount).toFixed(2),
              currency: booking.offerSnapshot.currency,
            },
          ],
        },
      },
      { headers },
    );

    return response.data.data;
  } catch (error) {
    console.log("DUFFEL ERROR:", error.response?.data || error.message);
    console.log(
      "DUFFEL ERROR FULL:",
      JSON.stringify(error.response?.data, null, 2),
    );
    throw error;
  }
};

// Confirm duffel payment
export const confirmDuffelPayment = async (booking) => {
  const response = await axios.post(
    `${ENV.DUFFEL_BASE_URL}/air/orders/${booking.duffelOrderId}/payments`,
    {
      payments: [
        {
          type: "balance",
          amount: booking.totalAmount.toFixed(2),
          currency: booking.offerSnapshot.currency,
        },
      ],
    },
    { headers },
  );

  return response.data.data;
};
