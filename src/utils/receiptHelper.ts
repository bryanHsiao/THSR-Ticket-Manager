/**
 * Receipt Helper Utilities
 *
 * Provides utilities for downloading receipts from THSR website
 * including station code mapping and date formatting
 */

/**
 * Station name to THSR website option value mapping
 */
export const STATION_OPTIONS: Record<string, string> = {
  '南港': '南港 (Nangang)',
  '台北': '台北 (Taipei)',
  '板橋': '板橋 (Banqiao)',
  '桃園': '桃園 (Taoyuan)',
  '新竹': '新竹 (Hsinchu)',
  '苗栗': '苗栗 (Miaoli)',
  '台中': '台中 (Taichung)',
  '彰化': '彰化 (Changhua)',
  '雲林': '雲林 (Yunlin)',
  '嘉義': '嘉義 (Chiayi)',
  '台南': '台南 (Tainan)',
  '左營': '左營 (Zuoying)',
};

/**
 * Get THSR website station option value from station name
 * @param stationName - Chinese station name (e.g., '台北')
 * @returns Station option value for THSR website (e.g., '台北 (Taipei)')
 */
export function getStationOption(stationName: string): string {
  return STATION_OPTIONS[stationName] || stationName;
}

/**
 * Format date from ISO format to THSR website format
 * @param isoDate - Date in YYYY-MM-DD format
 * @returns Date in YYYY/MM/DD format
 */
export function formatDateForTHSR(isoDate: string): string {
  return isoDate.replace(/-/g, '/');
}

/**
 * Format ticket number by removing all non-digit characters
 * @param ticketNumber - Ticket number (may contain separators like '-')
 * @returns Clean 13-digit ticket number
 */
export function formatTicketNumber(ticketNumber: string): string {
  return ticketNumber.replace(/\D/g, '');
}

/**
 * THSR receipt download website URL
 */
export const THSR_RECEIPT_URL = 'https://ptis.thsrc.com.tw/ptis/';

/**
 * Receipt download information for a ticket
 */
export interface ReceiptDownloadInfo {
  ticketNumber: string;
  travelDate: string;
  departure: string;
  destination: string;
  bookingCode?: string;
}

/**
 * Generate formatted receipt download info for display
 * @param info - Receipt download information
 * @returns Formatted display strings
 */
export function getReceiptDisplayInfo(info: ReceiptDownloadInfo): {
  formattedTicketNumber: string;
  formattedDate: string;
  route: string;
} {
  return {
    formattedTicketNumber: info.ticketNumber,
    formattedDate: formatDateForTHSR(info.travelDate),
    route: `${info.departure} → ${info.destination}`,
  };
}

/**
 * Generate the local receipt file path based on ticket info
 * Path format: /downloads/高鐵憑證/{YYYY-MM}/THSR_{date}_{from}-{to}_{ticketId}.pdf
 * @param info - Receipt download information
 * @returns URL path to the local receipt file
 */
export function getReceiptFilePath(info: ReceiptDownloadInfo): string {
  const { travelDate, departure, destination, ticketNumber, bookingCode } = info;
  const ticketId = bookingCode || formatTicketNumber(ticketNumber);
  const monthFolder = travelDate.substring(0, 7); // "YYYY-MM"
  const fileName = `THSR_${travelDate}_${departure}-${destination}_${ticketId}.pdf`;
  return `/downloads/高鐵憑證/${monthFolder}/${fileName}`;
}

/**
 * Check if a local receipt file exists
 * @param filePath - URL path to check
 * @returns Promise<boolean> - true if file exists
 */
export async function checkReceiptExists(filePath: string): Promise<boolean> {
  try {
    const response = await fetch(filePath, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}
