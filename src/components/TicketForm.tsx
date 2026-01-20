/**
 * Ticket Form Component
 * Task 29: Create TicketForm component
 *
 * Provides a form for creating and editing THSR ticket records
 * Includes all required fields with comprehensive validation
 *
 * Requirements: 1.5 (manual editing), 2.2 (record editing), 2.5 (delete confirmation)
 */

import { useState, useCallback, useEffect, type FormEvent, type ChangeEvent } from 'react';
import type { TicketRecord, TravelDirection } from '../types/ticket';
import { getDirectionFromStations } from '../utils/ticketParser';
import { storageService } from '../services/storageService';

/**
 * THSR stations list for dropdowns
 * Ordered from north to south as per requirements
 */
const THSR_STATIONS = [
  '台北',
  '南港',
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
 * Form field values
 */
export interface TicketFormData {
  ticketNumber: string;
  travelDate: string;
  travelTime: string;
  direction: TravelDirection;
  departure: string;
  destination: string;
  purpose: string;
}

/**
 * Form validation errors
 */
export interface TicketFormErrors {
  ticketNumber?: string;
  travelDate?: string;
  travelTime?: string;
  direction?: string;
  departure?: string;
  destination?: string;
  purpose?: string;
}

/**
 * Props for the TicketForm component
 */
export interface TicketFormProps {
  /** Initial ticket data for edit mode */
  initialData?: Partial<TicketRecord>;
  /** Whether the form is in edit mode (false = create mode) */
  isEditMode?: boolean;
  /** Callback when form is submitted with valid data */
  onSubmit: (data: TicketFormData) => void;
  /** Callback when form is cancelled */
  onCancel: () => void;
  /** Whether form submission is in progress */
  isSubmitting?: boolean;
  /** Current ticket ID (for edit mode - to exclude from duplicate check) */
  currentTicketId?: string;
}

/**
 * Validate ticket number (must be exactly 13 digits)
 * @param value - Ticket number to validate
 * @returns Error message or undefined if valid
 */
function validateTicketNumber(value: string): string | undefined {
  if (!value) {
    return '請輸入票號';
  }
  if (!/^\d{13}$/.test(value)) {
    return '票號必須為 13 位數字';
  }
  return undefined;
}

/**
 * Validate date format (YYYY-MM-DD)
 * @param value - Date string to validate
 * @returns Error message or undefined if valid
 */
function validateDate(value: string): string | undefined {
  if (!value) {
    return '請選擇日期';
  }
  // Check format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return '日期格式不正確';
  }
  // Check if valid date
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return '請輸入有效的日期';
  }
  return undefined;
}

/**
 * Validate time format (HH:mm) - optional field
 * @param value - Time string to validate
 * @returns Error message or undefined if valid
 */
function validateTime(value: string): string | undefined {
  // Time is optional
  if (!value) {
    return undefined;
  }
  if (!/^\d{2}:\d{2}$/.test(value)) {
    return '時間格式不正確';
  }
  const [hours, minutes] = value.split(':').map(Number);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return '請輸入有效的時間';
  }
  return undefined;
}

/**
 * Validate station selection
 * @param value - Station name to validate
 * @param fieldName - Field name for error message
 * @returns Error message or undefined if valid
 */
function validateStation(value: string, fieldName: string): string | undefined {
  if (!value) {
    return `請選擇${fieldName}`;
  }
  return undefined;
}

/**
 * Validate stations are different
 * @param departure - Departure station
 * @param destination - Destination station
 * @returns Error message or undefined if valid
 */
function validateStationsDifferent(departure: string, destination: string): string | undefined {
  if (departure && destination && departure === destination) {
    return '起站和迄站不能相同';
  }
  return undefined;
}

/**
 * TicketForm Component
 *
 * A form for creating and editing THSR ticket records with:
 * - All required fields: ticket number, date, time, direction, departure, destination, purpose
 * - Comprehensive validation (13-digit ticket number, date/time format)
 * - Support for both create and edit modes
 * - Auto-detection of direction based on station selection
 * - Traditional Chinese interface
 */
export function TicketForm({
  initialData,
  isEditMode = false,
  onSubmit,
  onCancel,
  isSubmitting = false,
  currentTicketId: _currentTicketId,
}: TicketFormProps) {
  // Form state
  const [formData, setFormData] = useState<TicketFormData>({
    ticketNumber: initialData?.ticketNumber || '',
    travelDate: initialData?.travelDate || '',
    travelTime: initialData?.travelTime || '',
    direction: initialData?.direction || 'northbound',
    departure: initialData?.departure || '',
    destination: initialData?.destination || '',
    purpose: initialData?.purpose || '',
  });

  // Validation errors state
  const [errors, setErrors] = useState<TicketFormErrors>({});

  // Track if form has been touched (for showing validation errors)
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Track if checking for duplicate ticket number
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);

  /**
   * Auto-detect direction when stations change
   */
  useEffect(() => {
    if (formData.departure && formData.destination) {
      const detectedDirection = getDirectionFromStations(formData.departure, formData.destination);
      if (detectedDirection) {
        setFormData(prev => ({ ...prev, direction: detectedDirection }));
      }
    }
  }, [formData.departure, formData.destination]);

  /**
   * Check for duplicate ticket number when it changes
   */
  useEffect(() => {
    const checkDuplicate = async () => {
      // Only check if ticket number is valid (13 digits)
      if (!/^\d{13}$/.test(formData.ticketNumber)) {
        return;
      }

      // In edit mode, don't check if it's the same ticket number
      if (isEditMode && initialData?.ticketNumber === formData.ticketNumber) {
        return;
      }

      setIsCheckingDuplicate(true);
      try {
        const isDuplicate = await storageService.isDuplicateTicketNumber(formData.ticketNumber);
        if (isDuplicate) {
          setErrors(prev => ({ ...prev, ticketNumber: `票號 ${formData.ticketNumber} 已存在` }));
          // Auto-touch the field so error shows immediately
          setTouched(prev => ({ ...prev, ticketNumber: true }));
        } else {
          // Clear duplicate error if it was previously set
          setErrors(prev => {
            if (prev.ticketNumber?.includes('已存在')) {
              const { ticketNumber: _, ...rest } = prev;
              return rest;
            }
            return prev;
          });
        }
      } catch (error) {
        console.error('Failed to check duplicate:', error);
      } finally {
        setIsCheckingDuplicate(false);
      }
    };

    // Debounce the check
    const timeoutId = setTimeout(checkDuplicate, 300);
    return () => clearTimeout(timeoutId);
  }, [formData.ticketNumber, isEditMode, initialData?.ticketNumber]);

  /**
   * Handle input field change
   */
  const handleChange = useCallback((
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error when field is modified
    if (errors[name as keyof TicketFormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  }, [errors]);

  /**
   * Handle field blur for validation
   */
  const handleBlur = useCallback((
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name } = event.target;
    setTouched(prev => ({ ...prev, [name]: true }));
  }, []);

  /**
   * Validate all form fields
   * @returns true if form is valid
   */
  const validateForm = useCallback((): boolean => {
    const newErrors: TicketFormErrors = {};

    // Validate ticket number
    const ticketNumberError = validateTicketNumber(formData.ticketNumber);
    if (ticketNumberError) {
      newErrors.ticketNumber = ticketNumberError;
    }

    // Validate date
    const dateError = validateDate(formData.travelDate);
    if (dateError) {
      newErrors.travelDate = dateError;
    }

    // Validate time
    const timeError = validateTime(formData.travelTime);
    if (timeError) {
      newErrors.travelTime = timeError;
    }

    // Validate stations
    const departureError = validateStation(formData.departure, '起站');
    if (departureError) {
      newErrors.departure = departureError;
    }

    const destinationError = validateStation(formData.destination, '迄站');
    if (destinationError) {
      newErrors.destination = destinationError;
    }

    // Validate stations are different
    const stationsDifferentError = validateStationsDifferent(formData.departure, formData.destination);
    if (stationsDifferentError && !newErrors.destination) {
      newErrors.destination = stationsDifferentError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Mark all fields as touched
    setTouched({
      ticketNumber: true,
      travelDate: true,
      travelTime: true,
      direction: true,
      departure: true,
      destination: true,
      purpose: true,
    });

    // Validate form
    if (validateForm()) {
      onSubmit(formData);
    }
  }, [formData, validateForm, onSubmit]);

  /**
   * Get error message for a field (only if touched)
   */
  const getFieldError = (fieldName: keyof TicketFormErrors): string | undefined => {
    return touched[fieldName] ? errors[fieldName] : undefined;
  };

  // Check if there's a duplicate error
  const hasDuplicateError = errors.ticketNumber?.includes('已存在');

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      {/* Duplicate Warning - Show prominently at top */}
      {hasDuplicateError && (
        <div className="flex-shrink-0 mb-4 p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                此票號已存在
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                票號 {formData.ticketNumber} 已有紀錄，無法重複新增。請確認是否為同一張票。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Scrollable form content */}
      <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-5 pb-2">
      {/* Ticket Number */}
      <div>
        <label
          htmlFor="ticketNumber"
          className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
        >
          票號 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="ticketNumber"
          name="ticketNumber"
          value={formData.ticketNumber}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="請輸入 13 位數字票號"
          maxLength={13}
          disabled={isSubmitting}
          className={`
            w-full px-3 py-2 sm:px-4 sm:py-2.5
            text-sm sm:text-base
            text-gray-900 dark:text-gray-100
            bg-white dark:bg-gray-800
            border rounded-lg
            focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900
            transition-colors duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            ${getFieldError('ticketNumber')
              ? 'border-red-500 focus:ring-red-400'
              : 'border-gray-300 dark:border-gray-600 focus:ring-orange-400 focus:border-orange-400'
            }
          `}
          aria-invalid={!!getFieldError('ticketNumber')}
          aria-describedby={getFieldError('ticketNumber') ? 'ticketNumber-error' : undefined}
        />
        {isCheckingDuplicate && (
          <p className="mt-1 text-sm text-gray-500 flex items-center gap-1">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            檢查票號...
          </p>
        )}
        {!isCheckingDuplicate && getFieldError('ticketNumber') && (
          <p id="ticketNumber-error" className="mt-1 text-sm text-red-500" role="alert">
            {getFieldError('ticketNumber')}
          </p>
        )}
      </div>

      {/* Purpose - Moved to top */}
      <div>
        <label
          htmlFor="purpose"
          className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
        >
          出差目的
        </label>
        <textarea
          id="purpose"
          name="purpose"
          value={formData.purpose}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="請輸入出差目的（選填）"
          rows={1}
          disabled={isSubmitting}
          className="
            w-full px-3 py-2 sm:px-4 sm:py-2.5
            text-sm sm:text-base
            text-gray-900 dark:text-gray-100
            bg-white dark:bg-gray-800
            border border-gray-300 dark:border-gray-600 rounded-lg
            focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400
            focus:ring-offset-2 dark:focus:ring-offset-gray-900
            transition-colors duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            resize-none
          "
        />
      </div>

      {/* Date and Time - Always side by side */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        {/* Travel Date */}
        <div className="min-w-0">
          <label
            htmlFor="travelDate"
            className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
          >
            日期 <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <input
              type="date"
              id="travelDate"
              name="travelDate"
              value={formData.travelDate}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isSubmitting}
              className={`
                w-full min-w-0 pl-8 pr-1 py-2 sm:pl-10 sm:pr-2 sm:py-2.5
                text-xs sm:text-sm
                text-gray-900 dark:text-gray-100
                bg-white dark:bg-gray-800
                border rounded-lg
                focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900
                transition-colors duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                [&::-webkit-calendar-picker-indicator]:opacity-70
                [&::-webkit-calendar-picker-indicator]:cursor-pointer
                ${getFieldError('travelDate')
                  ? 'border-red-500 focus:ring-red-400'
                  : 'border-gray-300 dark:border-gray-600 focus:ring-orange-400 focus:border-orange-400'
                }
              `}
              aria-invalid={!!getFieldError('travelDate')}
              aria-describedby={getFieldError('travelDate') ? 'travelDate-error' : undefined}
            />
          </div>
          {getFieldError('travelDate') && (
            <p id="travelDate-error" className="mt-1 text-sm text-red-500" role="alert">
              {getFieldError('travelDate')}
            </p>
          )}
        </div>

        {/* Travel Time (Optional) */}
        <div className="min-w-0">
          <label
            htmlFor="travelTime"
            className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
          >
            時間
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <input
              type="time"
              id="travelTime"
              name="travelTime"
              value={formData.travelTime}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isSubmitting}
              className={`
                w-full min-w-0 pl-8 pr-1 py-2 sm:pl-10 sm:pr-2 sm:py-2.5
                text-xs sm:text-sm
                text-gray-900 dark:text-gray-100
                bg-white dark:bg-gray-800
                border rounded-lg
                focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900
                transition-colors duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                [&::-webkit-calendar-picker-indicator]:opacity-70
                [&::-webkit-calendar-picker-indicator]:cursor-pointer
                ${getFieldError('travelTime')
                  ? 'border-red-500 focus:ring-red-400'
                  : 'border-gray-300 dark:border-gray-600 focus:ring-orange-400 focus:border-orange-400'
                }
              `}
              aria-invalid={!!getFieldError('travelTime')}
              aria-describedby={getFieldError('travelTime') ? 'travelTime-error' : undefined}
            />
          </div>
          {getFieldError('travelTime') && (
            <p id="travelTime-error" className="mt-1 text-sm text-red-500" role="alert">
              {getFieldError('travelTime')}
            </p>
          )}
        </div>
      </div>

      {/* Departure and Destination - Always side by side */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        {/* Departure Station */}
        <div>
          <label
            htmlFor="departure"
            className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
          >
            起站 <span className="text-red-500">*</span>
          </label>
          <select
            id="departure"
            name="departure"
            value={formData.departure}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={isSubmitting}
            className={`
              w-full px-2 py-2 sm:px-3 sm:py-2.5
              text-xs sm:text-sm
              text-gray-900 dark:text-gray-100
              bg-white dark:bg-gray-800
              border rounded-lg
              focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900
              transition-colors duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              ${getFieldError('departure')
                ? 'border-red-500 focus:ring-red-400'
                : 'border-gray-300 dark:border-gray-600 focus:ring-orange-400 focus:border-orange-400'
              }
            `}
            aria-invalid={!!getFieldError('departure')}
            aria-describedby={getFieldError('departure') ? 'departure-error' : undefined}
          >
            <option value="">起站</option>
            {THSR_STATIONS.map(station => (
              <option key={station} value={station}>
                {station}
              </option>
            ))}
          </select>
          {getFieldError('departure') && (
            <p id="departure-error" className="mt-1 text-sm text-red-500" role="alert">
              {getFieldError('departure')}
            </p>
          )}
        </div>

        {/* Destination Station */}
        <div>
          <label
            htmlFor="destination"
            className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
          >
            迄站 <span className="text-red-500">*</span>
          </label>
          <select
            id="destination"
            name="destination"
            value={formData.destination}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={isSubmitting}
            className={`
              w-full px-2 py-2 sm:px-3 sm:py-2.5
              text-xs sm:text-sm
              text-gray-900 dark:text-gray-100
              bg-white dark:bg-gray-800
              border rounded-lg
              focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900
              transition-colors duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              ${getFieldError('destination')
                ? 'border-red-500 focus:ring-red-400'
                : 'border-gray-300 dark:border-gray-600 focus:ring-orange-400 focus:border-orange-400'
              }
            `}
            aria-invalid={!!getFieldError('destination')}
            aria-describedby={getFieldError('destination') ? 'destination-error' : undefined}
          >
            <option value="">迄站</option>
            {THSR_STATIONS.map(station => (
              <option key={station} value={station}>
                {station}
              </option>
            ))}
          </select>
          {getFieldError('destination') && (
            <p id="destination-error" className="mt-1 text-sm text-red-500" role="alert">
              {getFieldError('destination')}
            </p>
          )}
        </div>
      </div>

      </div>
      {/* End scrollable content */}

      {/* Form Actions - Fixed at bottom */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 pt-4 mt-2 flex flex-col-reverse sm:flex-row gap-3 bg-white dark:bg-gray-800">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="
            flex-1 sm:flex-none
            px-6 py-2.5
            text-sm font-medium
            text-gray-600 dark:text-gray-300
            bg-gray-100 dark:bg-gray-700
            border border-gray-300 dark:border-gray-600
            rounded-lg
            hover:bg-gray-200 dark:hover:bg-gray-600
            hover:border-gray-400 dark:hover:border-gray-500
            active:bg-gray-300 dark:active:bg-gray-500
            focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900
            transition-colors duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          取消
        </button>
        <button
          type="submit"
          disabled={isSubmitting || isCheckingDuplicate || !!errors.ticketNumber?.includes('已存在')}
          style={{ backgroundColor: '#f97316', color: '#ffffff' }}
          className="
            flex-1 sm:flex-none
            px-6 py-2.5
            text-sm font-medium
            !text-white
            !bg-orange-500
            border border-orange-500
            rounded-lg
            hover:!bg-orange-600 hover:border-orange-600
            active:!bg-orange-700 active:border-orange-700
            focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900
            transition-colors duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center justify-center gap-2
          "
        >
          {isSubmitting && (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
          )}
          {isSubmitting
            ? (isEditMode ? '儲存中...' : '新增中...')
            : (isEditMode ? '儲存變更' : '確定')
          }
        </button>
      </div>
    </form>
  );
}

export default TicketForm;
