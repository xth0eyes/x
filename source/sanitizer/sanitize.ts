
export type Sanitizable = string | number | boolean | null | undefined | SanitizableObject | SanitizableArray;
export interface SanitizableObject {
  [key: string]: Sanitizable;
}

export type SanitizableArray = Sanitizable[];

export function sanitizeObject<T extends SanitizableObject>(obj: T): T;
export function sanitizeObject<T>(obj: T[]): T[];
export function sanitizeObject<T extends Sanitizable>(obj: T): T;
export function sanitizeObject<T extends Sanitizable>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item)) as T;
  }

  const cleanObj: SanitizableObject = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('$') || (typeof value === 'string' && value.startsWith('$'))) {
      console.warn(`Sanitized dangerous input: key="${key}", value="${value}"`);
      continue;
    }

    cleanObj[key] = sanitizeObject(value);
  }

  return cleanObj as T;
}


