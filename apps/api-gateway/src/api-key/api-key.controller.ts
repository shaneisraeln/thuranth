import { Controller, Post, Get, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ApiKeyService } from './api-key.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

class CreateApiKeyDto {
  name: string;
  permissions?: string[];
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
}

@ApiTags('API Keys')
@Controller('api-keys')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ApiKeyController {
  constructor(private apiKeyService: ApiKeyService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new API key' })
  @ApiResponse({ status: 201, description: 'API key created successfully' })
  async createApiKey(@Body() createApiKeyDto: CreateApiKeyDto) {
    return this.apiKeyService.createApiKey(
      createApiKeyDto.name,
      createApiKeyDto.permissions,
      createApiKeyDto.rateLimit,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List all API keys' })
  @ApiResponse({ status: 200, description: 'List of API keys' })
  async listApiKeys() {
    return this.apiKeyService.listApiKeys();
  }

  @Delete(':key')
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiResponse({ status: 200, description: 'API key revoked successfully' })
  async revokeApiKey(@Param('key') key: string) {
    const revoked = await this.apiKeyService.revokeApiKey(key);
    return { revoked };
  }

  @Get(':key/usage')
  @ApiOperation({ summary: 'Get API key usage statistics' })
  @ApiResponse({ status: 200, description: 'API key usage statistics' })
  async getApiKeyUsage(@Param('key') key: string) {
    return this.apiKeyService.getApiKeyUsage(key);
  }
}