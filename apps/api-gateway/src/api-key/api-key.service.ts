import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface ApiKey {
  id: string;
  key: string;
  name: string;
  permissions: string[];
  rateLimit: {
    requests: number;
    windowMs: number;
  };
  isActive: boolean;
  createdAt: Date;
  lastUsed?: Date;
}

@Injectable()
export class ApiKeyService {
  private apiKeys: Map<string, ApiKey> = new Map();

  constructor(private configService: ConfigService) {
    // Initialize with default API keys from environment
    this.initializeDefaultKeys();
  }

  private initializeDefaultKeys() {
    const defaultKeys = this.configService.get<string>('DEFAULT_API_KEYS');
    if (defaultKeys) {
      const keys = JSON.parse(defaultKeys);
      keys.forEach((keyData: any) => {
        this.apiKeys.set(keyData.key, {
          ...keyData,
          createdAt: new Date(keyData.createdAt),
          lastUsed: keyData.lastUsed ? new Date(keyData.lastUsed) : undefined,
        });
      });
    }
  }

  generateApiKey(): string {
    return `pdcp_${crypto.randomBytes(32).toString('hex')}`;
  }

  async createApiKey(
    name: string,
    permissions: string[] = [],
    rateLimit: { requests: number; windowMs: number } = { requests: 1000, windowMs: 3600000 }
  ): Promise<ApiKey> {
    const key = this.generateApiKey();
    const apiKey: ApiKey = {
      id: crypto.randomUUID(),
      key,
      name,
      permissions,
      rateLimit,
      isActive: true,
      createdAt: new Date(),
    };

    this.apiKeys.set(key, apiKey);
    return apiKey;
  }

  async validateApiKey(key: string): Promise<ApiKey | null> {
    const apiKey = this.apiKeys.get(key);
    if (!apiKey || !apiKey.isActive) {
      return null;
    }

    // Update last used timestamp
    apiKey.lastUsed = new Date();
    return apiKey;
  }

  async revokeApiKey(key: string): Promise<boolean> {
    const apiKey = this.apiKeys.get(key);
    if (!apiKey) {
      return false;
    }

    apiKey.isActive = false;
    return true;
  }

  async listApiKeys(): Promise<Omit<ApiKey, 'key'>[]> {
    return Array.from(this.apiKeys.values()).map(({ key, ...apiKey }) => apiKey);
  }

  async getApiKeyUsage(key: string): Promise<{ requests: number; lastHour: number } | null> {
    const apiKey = this.apiKeys.get(key);
    if (!apiKey) {
      return null;
    }

    // In a real implementation, this would query usage metrics from Redis or database
    return {
      requests: 0,
      lastHour: 0,
    };
  }
}