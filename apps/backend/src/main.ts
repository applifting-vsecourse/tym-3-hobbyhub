import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { toNodeHandler } from 'better-auth/node';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import { AppModule } from './app.module';
import {
  ADMIN_AUTH,
  ADMIN_AUTH_BASE_PATH,
  AdminAuth,
} from './shared/admin-auth/providers/admin-auth.provider';
import { BetterAuth } from './shared/auth/providers/better-auth.provider';
import { Config } from './shared/config/config.service';

/**
 * Main application entry point
 * Initializes and configures the NestJS application
 */
async function main(): Promise<void> {
  // Create NestJS application instance
  const app = await NestFactory.create(AppModule, { bufferLogs: false });

  // Get configuration service
  const config = app.get(Config);

  // Configure CORS - Allows cross-origin requests from specific origins
  app.enableCors({
    origin: [config.backendUrl, config.frontendUrl],
    credentials: true,
  });

  // Setup cookie parser middleware
  app.use(cookieParser());

  const appInstance = app.getHttpAdapter().getInstance();
  const betterAuth = app.get<BetterAuth>('BetterAuth');
  // Express 5 (via NestJS 11) requires named wildcards — a bare `*` throws.
  appInstance.all('/api/auth/*splat', toNodeHandler(betterAuth));
  // ADR-0010, #238: the administrators' sign-in, a separate instance.
  const adminAuth = app.get<AdminAuth>(ADMIN_AUTH);
  appInstance.all(`${ADMIN_AUTH_BASE_PATH}/*splat`, toNodeHandler(adminAuth));
  // Room for the profile photo and cover as base64 data URLs (a 2 MB picture
  // is ~2.8 MB, and both can come in one request); every other route keeps the
  // default limit. The first parser to read a body wins, so this goes first.
  appInstance.use(
    ['/api/profile', '/api/onboarding'],
    express.json({ limit: '8mb' }),
  );
  appInstance.use(express.json());

  // Configure API prefix for all routes
  app.setGlobalPrefix('api');

  // Setup Swagger API documentation at /api/docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle(config.name)
    .setDescription(config.description)
    .setVersion(config.version)
    // No `.addServer('/api')`: the paths already carry the global prefix, and
    // a server prefix would make "Try it out" call /api/api/….
    .addCookieAuth('better-auth.session_token')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // Print debug information for development purposes
  if (config.nodeEnv !== 'production') {
    console.log('App configuration:', {
      nodeEnv: config.nodeEnv,
      port: config.port,
      backendUrl: config.backendUrl,
      frontendUrl: config.frontendUrl,
    });
  }

  // Start the application
  await app.listen(config.port);
  console.log(`Application is running on: ${config.backendUrl}`);
}

// Execute the main function
main().catch((error) => console.error('Application error:', error));
