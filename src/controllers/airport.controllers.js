import Airport from "../models/airport.model.js";
import { successResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

export const searchAirports = async (req, res) => {
  const { q } = req.query;

  if (!q || q.length < 2) {
    throw new ApiError(400, "Minimum 2 characters required");
  }

  const query = q.trim();

  const airports = await Airport.aggregate([
    {
      $match: {
        $or: [
          { iata_code: { $regex: query, $options: "i" } },
          { city: { $regex: query, $options: "i" } },
          { name: { $regex: query, $options: "i" } },
        ],
      },
    },
    {
      $addFields: {
        priority: {
          $switch: {
            branches: [
              {
                case: {
                  $regexMatch: {
                    input: "$iata_code",
                    regex: `^${query}`,
                    options: "i",
                  },
                },
                then: 1,
              },
              {
                case: {
                  $regexMatch: {
                    input: "$city",
                    regex: `^${query}`,
                    options: "i",
                  },
                },
                then: 2,
              },
              {
                case: {
                  $regexMatch: {
                    input: "$name",
                    regex: `^${query}`,
                    options: "i",
                  },
                },
                then: 3,
              },
            ],
            default: 4,
          },
        },
      },
    },
    { $sort: { priority: 1 } },
    { $limit: 10 },
    {
      $project: {
        name: 1,
        city: 1,
        country: 1,
        iata_code: 1,
      },
    },
  ]);

  return successResponse(res, "Airports fetched successfully", airports);
};

export const getAirportByIata = async (req, res) => {
  const { code } = req.params;

  const airport = await Airport.findOne({
    iata_code: code.toUpperCase(),
  }).select("name city country iata_code");

  if (!airport) {
    throw new ApiError(404, "Airport not found");
  }

  return successResponse(res, "Airport fetched", airport);
};
