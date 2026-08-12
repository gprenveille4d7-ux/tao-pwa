const GEOCODING_ENDPOINT = "https://geocoding-api.open-meteo.com/v1/search";

export async function searchBirthPlaces(searchTerm, { signal } = {}) {
  const name = searchTerm.trim();

  if (name.length < 3) return [];

  const query = new URLSearchParams({
    name,
    count: "8",
    language: "fr",
    format: "json",
  });
  const response = await fetch(`${GEOCODING_ENDPOINT}?${query}`, { signal });

  if (!response.ok) {
    throw new Error(`Recherche de lieux indisponible (${response.status}).`);
  }

  const data = await response.json();

  return (data.results ?? [])
    .filter(
      (place) =>
        Number.isFinite(place.latitude) &&
        Number.isFinite(place.longitude) &&
        typeof place.timezone === "string" &&
        place.timezone.length > 0,
    )
    .map((place) =>
      Object.freeze({
        id: `open-meteo:${place.id}`,
        provider: "open-meteo",
        city: place.name,
        region: place.admin1 || place.admin2 || "",
        country: place.country,
        countryCode: place.country_code,
        latitude: place.latitude,
        longitude: place.longitude,
        timezone: place.timezone,
      }),
    );
}
