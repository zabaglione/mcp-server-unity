/**
 * UTF-8 utility functions for handling BOM and encoding issues
 */

const UTF8_BOM = '\ufeff';

/**
 * Check if content starts with UTF-8 BOM
 */
export function hasUTF8BOM(content: string): boolean {
  return content.charCodeAt(0) === 0xFEFF;
}

/**
 * Remove UTF-8 BOM if present
 */
export function removeUTF8BOM(content: string): string {
  if (hasUTF8BOM(content)) {
    return content.slice(1);
  }
  return content;
}

/**
 * Add UTF-8 BOM if not present
 */
export function ensureUTF8BOM(content: string): string {
  if (!hasUTF8BOM(content)) {
    return UTF8_BOM + content;
  }
  return content;
}

/**
 * Preserve BOM status when updating content
 */
export function preserveBOM(originalContent: string, newContent: string): string {
  const hadBOM = hasUTF8BOM(originalContent);
  const cleanContent = removeUTF8BOM(newContent);
  
  return hadBOM ? ensureUTF8BOM(cleanContent) : cleanContent;
}

/**
 * Validate that byte positions don't split UTF-8 characters
 * Returns adjusted positions that are safe for string operations
 */
export function validateUTF8Positions(
  content: string,
  byteStart: number,
  byteEnd: number
): { charStart: number; charEnd: number } {
  // Convert byte positions to character positions
  let byteCount = 0;
  let charStart = -1;
  let charEnd = -1;
  
  for (let i = 0; i < content.length; i++) {
    if (byteCount === byteStart) {
      charStart = i;
    }
    
    const charCode = content.charCodeAt(i);
    
    // Count UTF-8 bytes for this character
    if (charCode < 0x80) {
      byteCount += 1;
    } else if (charCode < 0x800) {
      byteCount += 2;
    } else if (charCode < 0xD800 || (charCode >= 0xE000 && charCode < 0x10000)) {
      byteCount += 3;
    } else {
      // Surrogate pair (4 bytes)
      byteCount += 4;
      i++; // Skip the low surrogate
    }
    
    if (byteCount === byteEnd) {
      charEnd = i + 1;
      break;
    }
  }
  
  // If we couldn't find exact positions, return safe defaults
  if (charStart === -1) charStart = 0;
  if (charEnd === -1) charEnd = content.length;
  
  return { charStart, charEnd };
}

/**
 * Convert character positions to byte positions
 */
export function charToByteBoundaries(
  content: string,
  charStart: number,
  charEnd: number
): { byteStart: number; byteEnd: number } {
  let byteStart = 0;
  let byteEnd = 0;
  
  for (let i = 0; i < Math.min(charStart, content.length); i++) {
    const charCode = content.charCodeAt(i);
    
    if (charCode < 0x80) {
      byteStart += 1;
    } else if (charCode < 0x800) {
      byteStart += 2;
    } else if (charCode < 0xD800 || (charCode >= 0xE000 && charCode < 0x10000)) {
      byteStart += 3;
    } else {
      byteStart += 4;
      i++; // Skip the low surrogate
    }
  }
  
  byteEnd = byteStart;
  
  for (let i = charStart; i < Math.min(charEnd, content.length); i++) {
    const charCode = content.charCodeAt(i);
    
    if (charCode < 0x80) {
      byteEnd += 1;
    } else if (charCode < 0x800) {
      byteEnd += 2;
    } else if (charCode < 0xD800 || (charCode >= 0xE000 && charCode < 0x10000)) {
      byteEnd += 3;
    } else {
      byteEnd += 4;
      i++; // Skip the low surrogate
    }
  }
  
  return { byteStart, byteEnd };
}