/**
 * Input validation and sanitization utilities for FFSA Portal
 */

// Strip HTML tags and dangerous characters to prevent XSS
export function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/[<>]/g, '')       // Strip angle brackets
    .replace(/javascript:/gi, '') // Strip JS protocol
    .replace(/on\w+=/gi, '')     // Strip event handlers
    .trim();
}

// Validate email format
export function isValidEmail(email) {
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(email);
}

// Validate SA phone number (or international format)
export function isValidPhone(phone) {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  // SA numbers: 0xx xxx xxxx or +27 xx xxx xxxx, or international +XX...
  return /^(\+?\d{10,15}|0\d{9})$/.test(cleaned);
}

// Validate South African ID number (13 digits with Luhn check)
export function isValidSAId(id) {
  if (!id || id.length !== 13 || !/^\d{13}$/.test(id)) return false;
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    let digit = parseInt(id[i], 10);
    if (i % 2 !== 0) digit *= 2;
    sum += digit > 9 ? digit - 9 : digit;
  }
  return sum % 10 === 0;
}

// Validate name fields (letters, spaces, hyphens, apostrophes only)
export function isValidName(name) {
  return /^[a-zA-Z\s\-']{2,50}$/.test(name);
}

// Validate age is within acceptable range for adult league
export function isValidAge(dob) {
  if (!dob) return false;
  const age = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  return age >= 16 && age <= 80;
}

// Photo validation constants
export const PHOTO_MAX_SIZE_MB = 5;
export const PHOTO_MAX_SIZE_BYTES = PHOTO_MAX_SIZE_MB * 1024 * 1024;
export const PHOTO_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Validate uploaded photo file
export function validatePhoto(file) {
  if (!file) return { valid: false, error: 'No file selected.' };
  if (!PHOTO_ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Only JPG, PNG, and WebP images are allowed.' };
  }
  if (file.size > PHOTO_MAX_SIZE_BYTES) {
    return { valid: false, error: `Photo must be smaller than ${PHOTO_MAX_SIZE_MB}MB.` };
  }
  return { valid: true, error: null };
}

// Sanitize all string fields in an object
export function sanitizeObject(obj) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = typeof value === 'string' ? sanitize(value) : value;
  }
  return result;
}

// Validate team registration form
export function validateTeamForm(f) {
  const errors = [];
  if (!f.teamName || sanitize(f.teamName).length < 2) errors.push('Team name is required (min 2 characters).');
  if (!isValidName(f.managerName)) errors.push('Manager name is required (letters only, 2-50 characters).');
  if (!isValidEmail(f.managerEmail)) errors.push('A valid email address is required.');
  if (!isValidPhone(f.managerPhone)) errors.push('A valid phone number is required.');
  if (!f.terms) errors.push('You must accept the terms and conditions.');
  return errors;
}

// Validate player registration form
export function validatePlayerForm(f, photo) {
  const errors = [];
  if (!isValidName(f.firstName)) errors.push('First name is required (letters only, 2-50 characters).');
  if (!isValidName(f.lastName)) errors.push('Last name is required (letters only, 2-50 characters).');
  if (!f.dob) errors.push('Date of birth is required.');
  else if (!isValidAge(f.dob)) errors.push('Player must be between 16 and 80 years old.');
  if (!f.gender) errors.push('Gender is required.');
  if (!isValidEmail(f.email)) errors.push('A valid email address is required.');
  if (!isValidPhone(f.phone)) errors.push('A valid phone number is required.');
  if (f.idNumber && f.idNumber.length === 13 && !isValidSAId(f.idNumber)) {
    errors.push('Invalid SA ID number. If using a passport, ensure it is correct.');
  }
  if (f.emergencyPhone && !isValidPhone(f.emergencyPhone)) {
    errors.push('Emergency phone number is not valid.');
  }
  if (!photo) errors.push('Player photo is required.');
  if (!f.terms) errors.push('You must accept the terms and conditions.');
  return errors;
}
