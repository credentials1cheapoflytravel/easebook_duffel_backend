import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    offerId: {
      type: String,
      required: true,
    },

    offerSnapshot: {
      airline: {
        name: String,
        code: String,
      },

      slices: [
        {
          origin: String,
          destination: String,
          departureTime: String,
          arrivalTime: String,
          duration: String,
          flightNumber: String,
        },
      ],

      fareBrandName: String,
      cabinClass: String,

      baggageIncluded: [
        {
          type: {
            type: String,
            required: true,
          },
          quantity: {
            type: Number,
            required: true,
          },
        },
      ],

      baseAmount: Number,
      taxAmount: Number,
      totalAmount: Number,
      currency: String,
      expiresAt: String,
    },

    itinerary: {
      origin: String,
      destination: String,
      departureDate: String,
      returnDate: String,
    },

    contactInfo: {
      email: { type: String },
      phone: { type: String },
      country: String,
      state: String,
      city: String,
      street1: String,
      street2: String,
      zip: String,
    },

    passengers: [
      {
        title: {
          type: String,
          enum: ["Mr", "Mrs", "Ms", "Miss"],
          required: true,
        },

        gender: {
          type: String,
          enum: ["male", "female", "other"],
          required: true,
        },

        type: {
          type: String,
          enum: ["adult", "child", "infant"],
          required: true,
        },

        firstName: String,
        lastName: String,
        dateOfBirth: String,

        passportNumber: String,
        passportExpiry: String,
        nationality: String,

        frequentFlyer: {
          airline: String,
          number: String,
        },
      },
    ],

    // New fields for passenger-based pricing
    passengerBreakdown: [
      {
        type: {
          type: String,
          enum: ["adult", "child", "infant"],
        },
        count: Number,
        basePrice: Number,
        taxPrice: Number,
        totalPrice: Number,
        multiplier: Number,
        discount: String,
      },
    ],

    // Add to bookingSchema
    paymentDetails: {
      cardHolder: String,
      maskedCardNumber: String,
      expiryMonth: String,
      expiryYear: String,
      paymentMethod: {
        type: String,
        default: "credit_card",
      },
      savedAt: Date,
    },

    bookingReference: {
      type: String,
      unique: true,
      sparse: true,
    },

    baseTotal: { type: Number, default: 0 },
    taxTotal: { type: Number, default: 0 },

    paypalOrderId: String,
    paypalCaptureId: String,
    paypalPayerId: String,
    paypalStatus: String,
    ticketNumbers: [String],
    pnr: String,

    offerPassengerIds: {
      type: [String],
      default: [],
    },

    airlineServices: [],
    internalAddons: {
      extraBaggage: {
        outbound: { type: Number, default: 0 },
        return: { type: Number, default: 0 },
        price: { type: Number, default: 0 },
      },

      travelInsurance: {
        selected: { type: Boolean, default: false },
        price: { type: Number, default: 0 },
      },

      tripProtection: {
        selected: { type: Boolean, default: false },
        price: { type: Number, default: 0 },
      },

      priceDropProtection: {
        selected: { type: Boolean, default: false },
        price: { type: Number, default: 0 },
      },

      autoCheckIn: {
        selected: { type: Boolean, default: false },
        price: { type: Number, default: 0 },
      },
    },

    airlineServicesAmount: { type: Number, default: 0 },
    internalAddonsAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },

    bookingStatus: {
      type: String,
      enum: ["draft", "pending", "confirmed", "cancelled"],
      default: "draft",
    },

    fareType: {
      type: String,
      enum: ["standard", "flexi"],
      default: "standard",
    },

    fareAmount: {
      type: Number,
      default: 0,
    },

    duffelOrderId: String,
  },
  { timestamps: true },
);

export default mongoose.models.Booking ||
  mongoose.model("Booking", bookingSchema);
