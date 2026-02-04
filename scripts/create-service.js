const fs = require('fs');
const path = require('path');

const services = [{
        name: 'parcel-management',
        port: 3003,
        description: 'Parcel Management Service for PDCP'
    },
    {
        name: 'custody-service',
        port: 3004,
        description: 'Custody Service for PDCP'
    },
    {
        name: 'analytics-service',
        port: 3005,
        description: 'Analytics Service for PDCP'
    },
    {
        name: 'audit-service',
        port: 3006,
        description: 'Audit Service for PDCP'
    }
];

function createPackageJson(service) {
    return `{
  "name": "@pdcp/${service.name}",
  "version": "1.0.0",
  "description": "${service.description}",
  "scripts": {
    "build": "nest build",
    "dev": "nest start --watch",
    "start": "node dist/main",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "lint": "eslint \\"{src,apps,libs,test}/**/*.ts\\" --fix",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "@nestjs/typeorm": "^10.0.0",
    "@nestjs/config": "^3.0.0",
    "@nestjs/swagger": "^7.0.0",
    "@pdcp/types": "workspace:*",
    "@pdcp/shared": "workspace:*",
    "typeorm": "^0.3.17",
    "pg": "^8.11.0",
    "ioredis": "^5.3.0",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.1",
    "reflect-metadata": "^0.1.13",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.0.0",
    "@nestjs/schematics": "^10.0.0",
    "@nestjs/testing": "^10.0.0",
    "@types/express": "^4.17.17",
    "@types/jest": "^29.5.2",
    "@types/node": "^20.3.1",
    "@types/pg": "^8.10.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.42.0",
    "eslint-config-prettier": "^9.0.0",
    "eslint-plugin-prettier": "^5.0.0",
    "jest": "^29.5.0",
    "prettier": "^3.0.0",
    "source-map-support": "^0.5.21",
    "supertest": "^6.3.3",
    "ts-jest": "^29.1.0",
    "ts-loader": "^9.4.3",
    "ts-node": "^10.9.1",
    "tsconfig-paths": "^4.1.0",
    "typescript": "^5.1.3"
  }
}`;
}

function createMainTs(service) {
    const serviceName = service.name.split('-').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');

    return `import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const config = new DocumentBuilder()
    .setTitle('PDCP ${serviceName} API')
    .setDescription('Post-Dispatch Consolidation Platform - ${serviceName}')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(\`${serviceName} running on port \${port}\`);
  console.log(\`API Documentation available at http://localhost:\${port}/api/docs\`);
}

bootstrap();`;
}

function createAppModule() {
    return `import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from '@pdcp/shared';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      ...getDatabaseConfig(),
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
      migrationsRun: true,
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}`;
}

function createDockerfile(service) {
    return `FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY turbo.json ./
COPY tsconfig.json ./

# Copy workspace packages
COPY packages/ ./packages/
COPY apps/${service.name}/ ./apps/${service.name}/

# Install dependencies
RUN npm ci

# Build the application
RUN npm run build --workspace=@pdcp/${service.name}

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start", "--workspace=@pdcp/${service.name}"]`;
}

function createNestCliJson() {
    return `{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}`;
}

function createTsConfig() {
    return `{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "declaration": false,
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test", "**/*spec.ts"]
}`;
}

// Create services
services.forEach(service => {
    const serviceDir = path.join(__dirname, '..', 'apps', service.name);
    const srcDir = path.join(serviceDir, 'src');

    // Create directories
    if (!fs.existsSync(serviceDir)) {
        fs.mkdirSync(serviceDir, {
            recursive: true
        });
    }
    if (!fs.existsSync(srcDir)) {
        fs.mkdirSync(srcDir, {
            recursive: true
        });
    }

    // Create files
    fs.writeFileSync(path.join(serviceDir, 'package.json'), createPackageJson(service));
    fs.writeFileSync(path.join(serviceDir, 'nest-cli.json'), createNestCliJson());
    fs.writeFileSync(path.join(serviceDir, 'tsconfig.json'), createTsConfig());
    fs.writeFileSync(path.join(serviceDir, 'Dockerfile'), createDockerfile(service));
    fs.writeFileSync(path.join(srcDir, 'main.ts'), createMainTs(service));
    fs.writeFileSync(path.join(srcDir, 'app.module.ts'), createAppModule());

    console.log(`Created service: ${service.name}`);
});

console.log('All services created successfully!');