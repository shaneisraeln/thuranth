import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { FirebaseAuthConfig } from '../interfaces/auth.interfaces';

@Injectable()
export class FirebaseAuthService {
  private readonly logger = new Logger(FirebaseAuthService.name);
  private firebaseApp: admin.app.App;

  constructor(private configService: ConfigService) {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      const config: FirebaseAuthConfig = {
        projectId: this.configService.get<string>('FIREBASE_PROJECT_ID'),
        privateKey: this.configService.get<string>('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
        clientEmail: this.configService.get<string>('FIREBASE_CLIENT_EMAIL'),
      };

      if (!config.projectId || !config.privateKey || !config.clientEmail) {
        this.logger.warn('Firebase configuration incomplete, Firebase auth will be disabled');
        return;
      }

      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: config.projectId,
          privateKey: config.privateKey,
          clientEmail: config.clientEmail,
        }),
      });

      this.logger.log('Firebase Admin SDK initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin SDK', error);
    }
  }

  async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    if (!this.firebaseApp) {
      throw new UnauthorizedException('Firebase authentication not configured');
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      return decodedToken;
    } catch (error) {
      this.logger.error('Failed to verify Firebase ID token', error);
      throw new UnauthorizedException('Invalid Firebase token');
    }
  }

  async createUser(email: string, password: string, displayName?: string): Promise<admin.auth.UserRecord> {
    if (!this.firebaseApp) {
      throw new Error('Firebase authentication not configured');
    }

    try {
      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName,
        emailVerified: false,
      });

      this.logger.log(`Created Firebase user: ${userRecord.uid}`);
      return userRecord;
    } catch (error) {
      this.logger.error('Failed to create Firebase user', error);
      throw error;
    }
  }

  async updateUser(uid: string, properties: admin.auth.UpdateRequest): Promise<admin.auth.UserRecord> {
    if (!this.firebaseApp) {
      throw new Error('Firebase authentication not configured');
    }

    try {
      const userRecord = await admin.auth().updateUser(uid, properties);
      this.logger.log(`Updated Firebase user: ${uid}`);
      return userRecord;
    } catch (error) {
      this.logger.error('Failed to update Firebase user', error);
      throw error;
    }
  }

  async deleteUser(uid: string): Promise<void> {
    if (!this.firebaseApp) {
      throw new Error('Firebase authentication not configured');
    }

    try {
      await admin.auth().deleteUser(uid);
      this.logger.log(`Deleted Firebase user: ${uid}`);
    } catch (error) {
      this.logger.error('Failed to delete Firebase user', error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<admin.auth.UserRecord> {
    if (!this.firebaseApp) {
      throw new Error('Firebase authentication not configured');
    }

    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      return userRecord;
    } catch (error) {
      this.logger.error('Failed to get Firebase user by email', error);
      throw error;
    }
  }

  isConfigured(): boolean {
    return !!this.firebaseApp;
  }
}