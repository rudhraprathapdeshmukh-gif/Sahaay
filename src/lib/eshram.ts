/**
 * e-SHRAM Certificate Validation Utilities
 * Uses Tesseract.js for client-side OCR to extract UAN and occupation from card images.
 */

import { createWorker, Worker } from 'tesseract.js';
import { supabase } from './supabase';

export interface CertificateData {
  uan: string | null;
  occupation: string | null;
  rawText?: string; // For debugging
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  uan?: string;
  name?: string;
  occupation?: string;
  dob?: string;
}

// UAN is a 12-digit number - look for patterns in the OCR text
const UAN_PATTERNS = [
  /\b(\d{12})\b/g,                    // Exact 12 digits
  /UAN[:\s]*(\d{12})/gi,              // UAN: 123456789012
  /Universal\s*Account\s*Number[:\s]*(\d{12})/gi,
  /(\d{4}[\s-]?\d{4}[\s-]?\d{4})\b/g, // 1234 5678 9012 format
];

// Common occupation keywords to search for in the OCR text
const OCCUPATION_KEYWORDS = [
  { keyword: 'Electrician', serviceId: 1 },
  { keyword: 'Electrical Worker', serviceId: 1 },
  { keyword: 'Plumber', serviceId: 2 },
  { keyword: 'Plumbing Worker', serviceId: 2 },
  { keyword: 'Carpenter', serviceId: 3 },
  { keyword: 'Wood Worker', serviceId: 3 },
  { keyword: 'Painter', serviceId: 4 },
  { keyword: 'House Painter', serviceId: 4 },
  { keyword: 'Cleaner', serviceId: 5 },
  { keyword: 'Cleaning Worker', serviceId: 5 },
  { keyword: 'Driver', serviceId: 6 },
  { keyword: 'Vehicle Driver', serviceId: 6 },
  { keyword: 'Appliance Technician', serviceId: 7 },
  { keyword: 'Repair Technician', serviceId: 7 },
  { keyword: 'Care Worker', serviceId: 8 },
  { keyword: 'Nursing Assistant', serviceId: 8 },
];

let worker: Worker | null = null;

/**
 * Initialize Tesseract worker (reused across calls for performance)
 */
async function getWorker(): Promise<Worker> {
  if (!worker) {
    worker = await createWorker('eng', 1, {
      logger: m => console.log('[Tesseract]', m.status, m.progress)
    });
  }
  return worker;
}

/**
 * Extract UAN from OCR text using multiple patterns
 */
function extractUAN(text: string): string | null {
  console.log('[e-SHRAM] Searching for UAN in text (length:', text.length, ')');

  // Remove newlines and normalize spaces for easier pattern matching
  const normalizedText = text.replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ');

  // Try each pattern
  for (const pattern of UAN_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(normalizedText);
    if (match) {
      // Clean up the match (remove spaces/dashes if any)
      const cleaned = match[1].replace(/[\s-]/g, '');
      if (cleaned.length === 12 && /^\d{12}$/.test(cleaned)) {
        console.log('[e-SHRAM] Found UAN via pattern:', pattern, '→', cleaned);
        return cleaned;
      }
    }
  }

  // Fallback 1: look for any 12-digit number anywhere in text
  const fallbackMatch = normalizedText.match(/\b\d{12}\b/);
  if (fallbackMatch) {
    console.log('[e-SHRAM] Found UAN (fallback 1):', fallbackMatch[0]);
    return fallbackMatch[0];
  }

  // Fallback 2: look for sequences of digits with spaces or dashes (common OCR error)
  // Example: "1234 5678 9012" or "1234-5678-9012" or even "12 34 56 78 90 12"
  const digitGroups = normalizedText.match(/\d+/g);
  if (digitGroups) {
    // Join all digit groups and see if we get exactly 12 digits
    const allDigits = digitGroups.join('');
    console.log('[e-SHRAM] All digits found:', allDigits, '(length:', allDigits.length, ')');

    if (allDigits.length >= 12) {
      // Try to find a 12-digit sequence
      const twelveDigitMatch = allDigits.match(/\d{12}/);
      if (twelveDigitMatch) {
        console.log('[e-SHRAM] Found UAN (fallback 2 - digit groups):', twelveDigitMatch[0]);
        return twelveDigitMatch[0];
      }
    }
  }

  // Fallback 3: Handle common OCR misreadings
  // OCR often mistakes: O→0, l→1, I→1, S→5, B→8, etc.
  // Try to fix common patterns
  const fixedText = normalizedText
    .replace(/[O]/g, '0')  // O → 0
    .replace(/[l]/g, '1')  // l → 1
    .replace(/[I]/g, '1')  // I → 1
    .replace(/[S]/g, '5')  // S → 5
    .replace(/[B]/g, '8')  // B → 8
    .replace(/[Z]/g, '2')  // Z → 2
    .replace(/[G]/g, '9')  // G → 9

  console.log('[e-SHRAM] Attempting OCR error correction...');
  const digitGroupsFixed = fixedText.match(/\d+/g);
  if (digitGroupsFixed) {
    const allDigitsFixed = digitGroupsFixed.join('');
    console.log('[e-SHRAM] After correction:', allDigitsFixed, '(length:', allDigitsFixed.length, ')');

    if (allDigitsFixed.length >= 12) {
      const twelveDigitMatchFixed = allDigitsFixed.match(/\d{12}/);
      if (twelveDigitMatchFixed) {
        console.log('[e-SHRAM] Found UAN (fallback 3 - after correction):', twelveDigitMatchFixed[0]);
        return twelveDigitMatchFixed[0];
      }
    }
  }

  console.warn('[e-SHRAM] Could not find UAN in text. First 300 chars of raw text:');
  console.warn(text.substring(0, 300));
  console.warn('[e-SHRAM] First 300 chars of normalized text:');
  console.warn(normalizedText.substring(0, 300));

  return null;
}

/**
 * Extract occupation from OCR text
 */
function extractOccupation(text: string): string | null {
  const lowerText = text.toLowerCase();

  // First, try to find explicit "Occupation:" label
  const occupationLineMatch = text.match(/Occupation[:\s]*([A-Za-z]+(?:[\s]+[A-Za-z]+)?)/i);
  if (occupationLineMatch) {
    const occupation = occupationLineMatch[1].trim();
    console.log('[e-SHRAM] Found occupation (explicit):', occupation);
    return occupation;
  }

  // Fallback: search for known occupation keywords
  for (const { keyword } of OCCUPATION_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      console.log('[e-SHRAM] Found occupation (keyword):', keyword);
      return keyword;
    }
  }

  return null;
}

/**
 * Extract UAN and occupation from image using Tesseract OCR
 */
export async function extractCertificateData(file: File): Promise<CertificateData> {
  console.log('[e-SHRAM] Starting OCR extraction for file:', file.name);

  try {
    const worker = await getWorker();

    // Convert file to image for processing
    const imageBitmap = await createImageBitmap(file);

    // Resize if too large (improves OCR performance)
    const maxDim = 2000;
    let width = imageBitmap.width;
    let height = imageBitmap.height;

    if (width > maxDim || height > maxDim) {
      const scale = maxDim / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('[e-SHRAM] Failed to get canvas context');
      return { uan: null, occupation: null };
    }

    // Draw image
    ctx.drawImage(imageBitmap, 0, 0, width, height);

    // Run OCR
    console.log('[e-SHRAM] Running OCR...');
    const { data: { text } } = await worker.recognize(canvas);

    console.log('[e-SHRAM] Raw OCR text:', text.substring(0, 500), '...');

    // Extract UAN
    const uan = extractUAN(text);

    // Extract occupation
    const occupation = extractOccupation(text);

    console.log('[e-SHRAM] Extraction result:', { uan, occupation });

    return { uan, occupation, rawText: text };
  } catch (error) {
    console.error('[e-SHRAM] OCR extraction failed:', error);
    return { uan: null, occupation: null };
  }
}

/**
 * Validate certificate data against Supabase RPC
 */
export async function validateCertificate(
  uan: string,
  occupation: string,
  serviceId: number
): Promise<ValidationResult> {
  if (!uan) {
    return { valid: false, error: 'Could not extract UAN from certificate. Please ensure the image is clear and try again.' };
  }

  if (!occupation) {
    return { valid: false, error: 'Could not extract occupation from certificate. Please ensure the image is clear and try again.' };
  }

  // Validate serviceId is provided
  if (!serviceId || serviceId <= 0) {
    return { valid: false, error: 'Please select a service category before uploading the certificate.' };
  }

  // Clean and validate UAN - remove all whitespace and ensure exactly 12 digits
  const cleanUAN = uan.replace(/\s/g, ''); // Remove all whitespace
  if (!/^\d{12}$/.test(cleanUAN)) {
    console.warn('[e-SHRAM] UAN format invalid after cleaning:', { original: uan, cleaned: cleanUAN });
    return { valid: false, error: 'Invalid UAN format. Please ensure the certificate is clear and try again.' };
  }

  // Clean occupation - trim whitespace
  const cleanOccupation = occupation.trim();

  try {
    console.log('[e-SHRAM] Validating certificate:', { uan: cleanUAN, occupation: cleanOccupation, serviceId });

    const { data, error } = await supabase.rpc('validate_provider_certificate', {
      p_uan: cleanUAN,
      p_extracted_occupation: cleanOccupation,
      p_provider_service_id: serviceId,
    });

    if (error) {
      console.error('[e-SHRAM] Validation RPC error:', error);
      // Check if it's a "not found" type error and provide more context
      if (error.message?.includes('not found') || error.message?.includes('UAN not found')) {
        return {
          valid: false,
          error: "UAN not found in registry. This could mean: 1) The UAN is incorrect, 2) The UAN is not in our registry yet, or 3) There's a formatting issue. Please double-check the UAN on your certificate and try again."
        };
      }
      // Check for occupation not recognized
      if (error.message?.includes('not recognized') || error.message?.includes('Occupation')) {
        return {
          valid: false,
          error: 'Occupation not recognized. The occupation extracted from your certificate does not match any known occupation for the selected service category. Please ensure the certificate is clear and try again, or select a different service category if the occupation on your certificate is different.'
        };
      }
      // Check for duplicate UAN
      if (error.message?.includes('already in use') || error.message?.includes('duplicate')) {
        return {
          valid: false,
          error: 'This UAN is already in use by another provider. Each UAN can only be registered once.'
        };
      }
      return { valid: false, error: 'Unable to verify certificate. Please check your connection and try again.' };
    }

    console.log('[e-SHRAM] Validation result:', data);
    return data as ValidationResult;
  } catch (error) {
    console.error('[e-SHRAM] Validation error:', error);
    return { valid: false, error: 'Unable to verify certificate. Please check your connection and try again.' };
  }
}

/**
 * Terminate OCR worker (cleanup)
 */
export async function terminateOcrWorker(): Promise<void> {
  if (worker) {
    await worker.terminate();
    worker = null;
  }
}