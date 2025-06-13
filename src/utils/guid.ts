/**
 * Generate a Unity-compatible GUID
 * Unity uses 32 character hex strings for GUIDs
 */
export function generateGuid(): string {
  const hexChars = '0123456789abcdef';
  let guid = '';
  
  for (let i = 0; i < 32; i++) {
    guid += hexChars[Math.floor(Math.random() * 16)];
  }
  
  return guid;
}

/**
 * Validate if a string is a valid Unity GUID
 */
export function isValidGuid(guid: string): boolean {
  return /^[0-9a-f]{32}$/.test(guid);
}

/**
 * Extract GUID from meta file content
 */
export function extractGuidFromMeta(metaContent: string): string | null {
  const match = metaContent.match(/guid:\s*([0-9a-f]{32})/);
  return match ? match[1] : null;
}