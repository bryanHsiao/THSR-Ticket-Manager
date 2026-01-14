/**
 * Ticket Parser Utilities
 * Task 8: Ticket number parsing tools
 *
 * Provides utility functions for parsing THSR ticket information from OCR text:
 * - parseTicketNumber: Extract 13-digit ticket number
 * - parseDirection: Determine travel direction (northbound/southbound)
 * - parseDateTime: Extract travel date and time
 * - normalizeStation: Standardize station names
 *
 * Requirements: 1.2, 1.3, 1.4
 */

import type { TravelDirection } from '../types/ticket';

/**
 * THSR station names in order from north to south
 * Used for direction detection and station name normalization
 */
const THSR_STATIONS = [
  '南港',
  '台北',
  '板橋',
  '桃園',
  '新竹',
  '苗栗',
  '台中',
  '彰化',
  '雲林',
  '嘉義',
  '台南',
  '左營',
] as const;

/**
 * Station name aliases for normalization
 * Maps various representations to standard station names
 */
const STATION_ALIASES: Record<string, string> = {
  // Full names with prefix
  '高鐵南港': '南港',
  '高鐵台北': '台北',
  '高鐵板橋': '板橋',
  '高鐵桃園': '桃園',
  '高鐵新竹': '新竹',
  '高鐵苗栗': '苗栗',
  '高鐵台中': '台中',
  '高鐵彰化': '彰化',
  '高鐵雲林': '雲林',
  '高鐵嘉義': '嘉義',
  '高鐵台南': '台南',
  '高鐵左營': '左營',
  // Alternative character variants
  '臺北': '台北',
  '臺中': '台中',
  '臺南': '台南',
  '高鐵臺北': '台北',
  '高鐵臺中': '台中',
  '高鐵臺南': '台南',
  // With station suffix
  '南港站': '南港',
  '台北站': '台北',
  '板橋站': '板橋',
  '桃園站': '桃園',
  '新竹站': '新竹',
  '苗栗站': '苗栗',
  '台中站': '台中',
  '彰化站': '彰化',
  '雲林站': '雲林',
  '嘉義站': '嘉義',
  '台南站': '台南',
  '左營站': '左營',
  '臺北站': '台北',
  '臺中站': '台中',
  '臺南站': '台南',
  // Kaohsiung alias for Zuoying
  '高雄': '左營',
  '高雄站': '左營',
  // English station names (from physical tickets)
  'Nangang': '南港',
  'Taipei': '台北',
  'Banciao': '板橋',
  'Banqiao': '板橋',
  'Taoyuan': '桃園',
  'Hsinchu': '新竹',
  'Miaoli': '苗栗',
  'Taichung': '台中',
  'Changhua': '彰化',
  'Yunlin': '雲林',
  'Chiayi': '嘉義',
  'Tainan': '台南',
  'Zuoying': '左營',
  'Kaohsiung': '左營',
  // Lowercase variants
  'nangang': '南港',
  'taipei': '台北',
  'banciao': '板橋',
  'banqiao': '板橋',
  'taoyuan': '桃園',
  'hsinchu': '新竹',
  'miaoli': '苗栗',
  'taichung': '台中',
  'changhua': '彰化',
  'yunlin': '雲林',
  'chiayi': '嘉義',
  'tainan': '台南',
  'zuoying': '左營',
  'kaohsiung': '左營',
};

/**
 * DateTime parsing result interface
 */
export interface ParsedDateTime {
  date: string;  // YYYY-MM-DD format
  time: string;  // HH:mm format
}

/**
 * Parse ticket number from OCR text
 * Extracts 13-digit THSR ticket number
 *
 * Supports multiple formats:
 * - 13 consecutive digits: 1234567890123
 * - Dashed format: 12-1-31-1-345-0036 (physical ticket format)
 * - Spaced format: 12 1 31 1 345 0036
 *
 * @param text - Raw text from OCR or user input
 * @returns 13-digit ticket number string or null if not found
 *
 * @example
 * parseTicketNumber('票號: 1234567890123') // Returns '1234567890123'
 * parseTicketNumber('12-1-31-1-345-0036') // Returns '1213113450036'
 * parseTicketNumber('No valid ticket') // Returns null
 */
export function parseTicketNumber(text: string): string | null {
  if (!text) {
    return null;
  }

  // Pattern 1: THSR physical ticket format with dashes: XX-X-XX-X-XXX-XXXX
  // Example: 12-1-31-1-345-0036
  const dashedPattern = /(\d{2})-(\d)-(\d{2})-(\d)-(\d{3})-(\d{4})/g;
  const dashedMatches = [...text.matchAll(dashedPattern)];
  if (dashedMatches.length > 0) {
    const match = dashedMatches[0];
    // Combine all groups to form 13-digit number
    const ticketNumber = match[1] + match[2] + match[3] + match[4] + match[5] + match[6];
    if (ticketNumber.length === 13) {
      return ticketNumber;
    }
  }

  // Pattern 2: Dashed format with varying segment lengths
  // Look for sequences of digits separated by dashes that total 13 digits
  const anyDashedPattern = /(\d+(?:-\d+)+)/g;
  const anyDashedMatches = [...text.matchAll(anyDashedPattern)];
  for (const match of anyDashedMatches) {
    const digits = match[1].replace(/-/g, '');
    if (digits.length === 13) {
      return digits;
    }
  }

  // Pattern 3: Look for standalone 13-digit sequences
  const ticketNumberPattern = /\b(\d{13})\b/g;
  const matches = text.match(ticketNumberPattern);
  if (matches && matches.length > 0) {
    return matches[0];
  }

  // Pattern 4: Try to find 13 consecutive digits even without word boundaries
  const loosePattern = /(\d{13})/;
  const looseMatch = text.match(loosePattern);
  if (looseMatch) {
    return looseMatch[1];
  }

  // Pattern 5: Spaced format - digits separated by spaces
  const spacedPattern = /(\d+(?:\s+\d+)+)/g;
  const spacedMatches = [...text.matchAll(spacedPattern)];
  for (const match of spacedMatches) {
    const digits = match[1].replace(/\s/g, '');
    if (digits.length === 13) {
      return digits;
    }
  }

  return null;
}

/**
 * Parse travel direction from OCR text
 * Determines if the trip is northbound or southbound based on:
 * 1. Explicit direction keywords (北上, 南下)
 * 2. Station pair analysis (departure -> destination)
 *
 * Direction logic:
 * - northbound (北上): traveling towards 台北/南港 (from south to north)
 * - southbound (南下): traveling towards 左營 (from north to south)
 *
 * @param text - Raw text from OCR or user input
 * @returns 'northbound', 'southbound', or null if direction cannot be determined
 *
 * @example
 * parseDirection('北上列車') // Returns 'northbound'
 * parseDirection('台中 → 台北') // Returns 'northbound'
 */
export function parseDirection(text: string): TravelDirection | null {
  if (!text) {
    return null;
  }

  // Check for explicit direction keywords
  const northboundKeywords = ['北上', '往北', '北行'];
  const southboundKeywords = ['南下', '往南', '南行'];

  for (const keyword of northboundKeywords) {
    if (text.includes(keyword)) {
      return 'northbound';
    }
  }

  for (const keyword of southboundKeywords) {
    if (text.includes(keyword)) {
      return 'southbound';
    }
  }

  // Try to infer direction from station names
  // Find all station mentions in the text
  const foundStations: { name: string; index: number; position: number }[] = [];

  for (const station of THSR_STATIONS) {
    const idx = text.indexOf(station);
    if (idx !== -1) {
      foundStations.push({
        name: station,
        index: THSR_STATIONS.indexOf(station),
        position: idx,
      });
    }
  }

  // Also check for aliases
  for (const [alias, standard] of Object.entries(STATION_ALIASES)) {
    const idx = text.indexOf(alias);
    if (idx !== -1) {
      const standardIndex = THSR_STATIONS.indexOf(standard as typeof THSR_STATIONS[number]);
      if (standardIndex !== -1) {
        // Only add if not already found
        const alreadyFound = foundStations.some(s => s.name === standard);
        if (!alreadyFound) {
          foundStations.push({
            name: standard,
            index: standardIndex,
            position: idx,
          });
        }
      }
    }
  }

  // Sort by position in text to get order of appearance
  foundStations.sort((a, b) => a.position - b.position);

  // If we have at least 2 stations, determine direction
  if (foundStations.length >= 2) {
    const departure = foundStations[0];
    const destination = foundStations[foundStations.length - 1];

    // If destination station index is less than departure, it's northbound
    // (moving towards the beginning of the list, which is north)
    if (destination.index < departure.index) {
      return 'northbound';
    } else if (destination.index > departure.index) {
      return 'southbound';
    }
  }

  return null;
}

/**
 * Parse travel date and time from OCR text
 * Supports various date/time formats commonly found on THSR tickets
 *
 * Supported date formats:
 * - YYYY/MM/DD, YYYY-MM-DD, YYYY.MM.DD
 * - MM/DD/YYYY, DD/MM/YYYY (less common)
 * - Chinese format: YYYY年MM月DD日
 * - ROC calendar: 民國XXX年MM月DD日 or XXX/MM/DD
 *
 * Supported time formats:
 * - HH:MM, HH:mm
 * - Chinese format: HH時MM分
 *
 * @param text - Raw text from OCR or user input
 * @returns Object with date (YYYY-MM-DD) and time (HH:mm) or null if not found
 *
 * @example
 * parseDateTime('2024/03/15 14:30') // Returns { date: '2024-03-15', time: '14:30' }
 * parseDateTime('民國113年03月15日 14時30分') // Returns { date: '2024-03-15', time: '14:30' }
 */
export function parseDateTime(text: string): ParsedDateTime | null {
  if (!text) {
    return null;
  }

  let date: string | null = null;
  let time: string | null = null;

  // Try to parse date
  date = parseDateFromText(text);

  // Try to parse time
  time = parseTimeFromText(text);

  // Return null if neither date nor time could be parsed
  if (!date && !time) {
    return null;
  }

  return {
    date: date || '',
    time: time || '',
  };
}

/**
 * Parse date from text
 * @internal
 */
function parseDateFromText(text: string): string | null {
  // ROC calendar: 民國XXX年MM月DD日 or XXX年MM月DD日
  const rocChinesePattern = /民國?(\d{2,3})年(\d{1,2})月(\d{1,2})日/;
  const rocMatch = text.match(rocChinesePattern);
  if (rocMatch) {
    const rocYear = parseInt(rocMatch[1], 10);
    const year = rocYear + 1911; // Convert ROC year to AD year
    const month = rocMatch[2].padStart(2, '0');
    const day = rocMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // ROC calendar numeric: XXX/MM/DD (3 digit year starting with 1)
  const rocNumericPattern = /\b(1\d{2})\/(\d{1,2})\/(\d{1,2})\b/;
  const rocNumericMatch = text.match(rocNumericPattern);
  if (rocNumericMatch) {
    const rocYear = parseInt(rocNumericMatch[1], 10);
    const year = rocYear + 1911;
    const month = rocNumericMatch[2].padStart(2, '0');
    const day = rocNumericMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Chinese format: YYYY年MM月DD日
  const chinesePattern = /(20\d{2})年(\d{1,2})月(\d{1,2})日/;
  const chineseMatch = text.match(chinesePattern);
  if (chineseMatch) {
    const year = chineseMatch[1];
    const month = chineseMatch[2].padStart(2, '0');
    const day = chineseMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Standard formats: YYYY/MM/DD, YYYY-MM-DD, YYYY.MM.DD
  const standardPattern = /(20\d{2})[/\-.](\d{1,2})[/\-.](\d{1,2})/;
  const standardMatch = text.match(standardPattern);
  if (standardMatch) {
    const year = standardMatch[1];
    const month = standardMatch[2].padStart(2, '0');
    const day = standardMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // MM/DD/YYYY format
  const mdyPattern = /\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/;
  const mdyMatch = text.match(mdyPattern);
  if (mdyMatch) {
    const year = mdyMatch[3];
    const month = mdyMatch[1].padStart(2, '0');
    const day = mdyMatch[2].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return null;
}

/**
 * Parse time from text
 * @internal
 */
function parseTimeFromText(text: string): string | null {
  // Chinese format: HH時MM分
  const chineseTimePattern = /(\d{1,2})時(\d{1,2})分/;
  const chineseTimeMatch = text.match(chineseTimePattern);
  if (chineseTimeMatch) {
    const hours = chineseTimeMatch[1].padStart(2, '0');
    const minutes = chineseTimeMatch[2].padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  // Standard format: HH:MM or HH:mm (24-hour format)
  // Avoid matching dates like 2024/03/15 by requiring time context
  const standardTimePattern = /\b(\d{1,2}):(\d{2})\b/g;
  const matches = [...text.matchAll(standardTimePattern)];

  for (const match of matches) {
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);

    // Validate time range
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
  }

  return null;
}

/**
 * Normalize station name to standard format
 * Converts various representations of station names to a standard form
 *
 * Handles:
 * - Station name aliases (e.g., '高鐵台北' -> '台北')
 * - Character variants (e.g., '臺北' -> '台北')
 * - Station suffixes (e.g., '台北站' -> '台北')
 * - Kaohsiung references (e.g., '高雄' -> '左營')
 *
 * @param name - Station name in any format
 * @returns Normalized station name, or original input if no match found
 *
 * @example
 * normalizeStation('高鐵台北') // Returns '台北'
 * normalizeStation('臺中站') // Returns '台中'
 * normalizeStation('高雄') // Returns '左營'
 */
export function normalizeStation(name: string): string {
  if (!name) {
    return name;
  }

  // Trim whitespace
  const trimmed = name.trim();

  // Check if it's already a standard station name
  if (THSR_STATIONS.includes(trimmed as typeof THSR_STATIONS[number])) {
    return trimmed;
  }

  // Check aliases
  if (STATION_ALIASES[trimmed]) {
    return STATION_ALIASES[trimmed];
  }

  // Try partial matching - check if input contains a standard station name
  for (const station of THSR_STATIONS) {
    if (trimmed.includes(station)) {
      return station;
    }
  }

  // Try partial matching with aliases
  for (const [alias, standard] of Object.entries(STATION_ALIASES)) {
    if (trimmed.includes(alias)) {
      return standard;
    }
  }

  // Return original if no match found
  return trimmed;
}

/**
 * Get station index for direction comparison
 * @internal
 * @param stationName - Normalized station name
 * @returns Index in THSR_STATIONS array or -1 if not found
 */
export function getStationIndex(stationName: string): number {
  const normalized = normalizeStation(stationName);
  return THSR_STATIONS.indexOf(normalized as typeof THSR_STATIONS[number]);
}

/**
 * Determine direction from departure and destination stations
 *
 * @param departure - Departure station name
 * @param destination - Destination station name
 * @returns 'northbound', 'southbound', or null if cannot determine
 *
 * @example
 * getDirectionFromStations('台中', '台北') // Returns 'northbound'
 * getDirectionFromStations('台北', '左營') // Returns 'southbound'
 */
export function getDirectionFromStations(
  departure: string,
  destination: string
): TravelDirection | null {
  const departureIndex = getStationIndex(departure);
  const destinationIndex = getStationIndex(destination);

  if (departureIndex === -1 || destinationIndex === -1) {
    return null;
  }

  if (destinationIndex < departureIndex) {
    return 'northbound';
  } else if (destinationIndex > departureIndex) {
    return 'southbound';
  }

  // Same station - cannot determine direction
  return null;
}

/**
 * Export station list for use in other modules
 */
export const STATIONS = THSR_STATIONS;

/**
 * Export station aliases for use in other modules
 */
export { STATION_ALIASES };
