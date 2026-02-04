import { SetMetadata } from '@nestjs/common';

export const SENSITIVE_OPERATION_KEY = 'sensitive_operation';
export const SensitiveOperation = (requireAdditionalAuth: boolean = true) => 
  SetMetadata(SENSITIVE_OPERATION_KEY, requireAdditionalAuth);