import fs from "fs";
import csv from "csv-parser";
import path from "path";
import connectDB from "../config/db.js";
import ENV from "../config/env.js";
import Airport from "../models/airport.model.js";

const importAirports = async () => {
  try {
    await connectDB(ENV.MONGO_URI);

    const airports = [];

    const filePath = path.resolve(
      process.cwd(),
      "src/airports-data/airports.csv",
    );

    console.log("📂 Reading file:", filePath);

    fs.createReadStream(filePath)
      .pipe(csv({ headers: false }))
      .on("data", (row) => {
        const name = row["1"];
        const city = row["2"];
        const country = row["3"];
        const iata = row["4"];
        const icao = row["5"];
        const latitude = parseFloat(row["6"]);
        const longitude = parseFloat(row["7"]);
        const altitude = parseInt(row["8"]);
        const timezone = row["11"];
        const type = row["12"];
        const source = row["13"];

        // Skip invalid rows
        if (!iata || iata === "\\N") return;
        if (!city || city === "\\N") return;
        if (type !== "airport") return;
        if (isNaN(latitude) || isNaN(longitude)) return;

        airports.push({
          name: name?.trim(),
          city: city?.trim(),
          country: country?.trim(),
          iata_code: iata?.trim(),
          icao_code: icao !== "\\N" ? icao?.trim() : null,
          location: {
            latitude,
            longitude,
          },
          altitude: isNaN(altitude) ? null : altitude,
          timezone: timezone !== "\\N" ? timezone : null,
          type,
          source,
        });
      })
      .on("end", async () => {
        console.log("🧹 Clearing old data...");
        await Airport.deleteMany();

        console.log("📦 Inserting airports...");
        const inserted = await Airport.insertMany(airports);

        console.log(`✅ Successfully Imported ${inserted.length} Airports`);

        process.exit(0);
      })
      .on("error", (err) => {
        console.error("❌ File Read Error:", err.message);
        process.exit(1);
      });
  } catch (error) {
    console.error("❌ Import Failed:", error.message);
    process.exit(1);
  }
};

importAirports();
