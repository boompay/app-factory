import fetch from "node-fetch";
import { loadEnv } from "../env";

loadEnv("stg2");

export interface FakeAddress {
  housenumber: string;
  street: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  country_code?: string;
  county?: string;
  lat?: number;
  lon?: number;
}

export async function getRandomAddress(
  country: "us" | "ca" = "us"
): Promise<FakeAddress> {
  const text = country === "us" ? "United States address" : "Canada address";

  const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(
    text
  )}&apiKey=${process.env.GEOAPIFY_API_KEY}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Geoapify error ${response.status}: ${await response.text()}`
    );
  }

  const json = (await response.json()) as any;
  const result = json.features?.[0]?.properties;

  if (!result) {
    throw new Error("Geoapify returned no address results");
  }

  return {
    housenumber: result.housenumber,
    street: result.street,
    city: result.city,
    state: result.state,
    postcode: result.postcode,
    country: result.country,
    country_code: result.country_code,
    county: result.county,
    lat: result.lat,
    lon: result.lon,
  };
}
