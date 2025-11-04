import { BUILDINGS } from './constants';

/**
 * Get the full building name from a building code
 * @param code - Building code (e.g., "LSB", "ERB")
 * @returns Full building name or the original code if not found
 */
export function getBuildingName(code: string): string {
  return BUILDINGS[code as keyof typeof BUILDINGS] || code;
}

/**
 * Parse a location string to extract building code and room number
 * Examples: "LSB LT1" -> { building: "LSB", room: "LT1", fullName: "Lady Shaw Building LT1" }
 */
export function parseLocation(location: string): {
  building: string;
  room: string;
  fullName: string;
} {
  const parts = location.split(' ');
  const building = parts[0];
  const room = parts.slice(1).join(' ');
  const buildingName = getBuildingName(building);
  
  return {
    building,
    room,
    fullName: room ? `${buildingName} ${room}` : buildingName,
  };
}

/**
 * Format location string with full building name
 * @param location - Location string (e.g., "LSB LT1")
 * @returns Formatted location with full building name
 */
export function formatLocation(location: string): string {
  const { fullName } = parseLocation(location);
  return fullName;
}

/**
 * Get building abbreviation from location
 * @param location - Location string (e.g., "LSB LT1")
 * @returns Building code (e.g., "LSB")
 */
export function getBuildingCode(location: string): string {
  return location.split(' ')[0];
}

/**
 * Check if a building code exists in the BUILDINGS list
 */
export function isValidBuilding(code: string): boolean {
  return code in BUILDINGS;
}

/**
 * Get all building codes
 */
export function getAllBuildingCodes(): string[] {
  return Object.keys(BUILDINGS);
}

/**
 * Search buildings by name or code
 */
export function searchBuildings(query: string): Array<{ code: string; name: string }> {
  const lowerQuery = query.toLowerCase();
  return Object.entries(BUILDINGS)
    .filter(([code, name]) => 
      code.toLowerCase().includes(lowerQuery) || 
      name.toLowerCase().includes(lowerQuery)
    )
    .map(([code, name]) => ({ code, name }));
}
