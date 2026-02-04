import { validate, ValidationError } from 'class-validator';

/**
 * Validate a DTO and return formatted error messages
 */
export async function validateDto(dto: any): Promise<string[]> {
  const errors: ValidationError[] = await validate(dto);
  return formatValidationErrors(errors);
}

/**
 * Format validation errors into readable messages
 */
export function formatValidationErrors(errors: ValidationError[]): string[] {
  const messages: string[] = [];
  
  for (const error of errors) {
    if (error.constraints) {
      messages.push(...Object.values(error.constraints));
    }
    
    if (error.children && error.children.length > 0) {
      messages.push(...formatValidationErrors(error.children));
    }
  }
  
  return messages;
}

/**
 * Check if a string is a valid UUID
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}