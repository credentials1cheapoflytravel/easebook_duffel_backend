import mongoose from "mongoose";

const airportSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    city: { type: String, required: true },

    country: { type: String, required: true },

    iata_code: {
      type: String,
      uppercase: true,
      trim: true,
      index: true,
    },

    icao_code: {
      type: String,
      uppercase: true,
      trim: true,
    },

    location: {
      latitude: Number,
      longitude: Number,
    },

    altitude: Number,

    timezone: String,

    type: {
      type: String,
      default: "airport",
    },

    source: String,
  },
  { timestamps: true },
);

// 🔥 TEXT INDEX FOR AUTOSUGGEST
airportSchema.index({
  name: "text",
  city: "text",
  iata_code: "text",
  country: "text",
});

export default mongoose.model("Airport", airportSchema);
