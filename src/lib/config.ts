export const SHOP_LOCATION = {
  // Defaults to St. Charles / St. Peters area if env vars are not set.
  lat:
    typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_SHOP_LAT &&
    !Number.isNaN(Number(process.env.NEXT_PUBLIC_SHOP_LAT))
      ? Number(process.env.NEXT_PUBLIC_SHOP_LAT)
      : 38.7839,
  lng:
    typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_SHOP_LNG &&
    !Number.isNaN(Number(process.env.NEXT_PUBLIC_SHOP_LNG))
      ? Number(process.env.NEXT_PUBLIC_SHOP_LNG)
      : -90.4974,
  address:
    (typeof process !== "undefined" &&
      process.env.NEXT_PUBLIC_SHOP_ADDRESS) ||
    "16 Cherokee Dr, St Peters, MO",
}

export const GOOGLE_MAPS_BROWSER_API_KEY =
  (typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) ||
  ""

export const GOOGLE_MAPS_SERVER_API_KEY =
  (typeof process !== "undefined" &&
    process.env.GOOGLE_MAPS_SERVER_API_KEY) ||
  (typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) ||
  ""

export const RECAPTCHA_SITE_KEY =
  (typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) ||
  ""

