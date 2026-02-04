import { GeoCoordinate } from '@pdcp/types';

/**
 * Calculate distance between two geographic coordinates using Haversine formula
 * @param coord1 First coordinate
 * @param coord2 Second coordinate
 * @returns Distance in kilometers
 */
export function calculateDistance(coord1: GeoCoordinate, coord2: GeoCoordinate): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(coord2.latitude - coord1.latitude);
  const dLon = toRadians(coord2.longitude - coord1.longitude);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.latitude)) * Math.cos(toRadians(coord2.latitude)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Check if a coordinate is within a bounding box
 */
export function isWithinBounds(
  coord: GeoCoordinate,
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }
): boolean {
  return (
    coord.latitude >= bounds.south &&
    coord.latitude <= bounds.north &&
    coord.longitude >= bounds.west &&
    coord.longitude <= bounds.east
  );
}