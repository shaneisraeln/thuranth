import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FirebaseAuthService } from '../services/firebase-auth.service';
import { User } from '../entities/user.entity';
import { AuthUser } from '../interfaces/auth.interfaces';

@Injectable()
export class FirebaseStrategy extends PassportStrategy(Strategy, 'firebase') {
  constructor(
    private firebaseAuthService: FirebaseAuthService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    super();
  }

  async validate(req: Request): Promise<AuthUser> {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No Firebase token provided');
    }

    const idToken = authHeader.substring(7);

    try {
      const decodedToken = await this.firebaseAuthService.verifyIdToken(idToken);
      
      // Find user by Firebase UID or email
      let user = await this.userRepository.findOne({ 
        where: { firebaseUid: decodedToken.uid } 
      });

      if (!user && decodedToken.email) {
        user = await this.userRepository.findOne({ 
          where: { email: decodedToken.email } 
        });

        // Link Firebase UID to existing user
        if (user) {
          user.firebaseUid = decodedToken.uid;
          await this.userRepository.save(user);
        }
      }

      if (!user) {
        throw new UnauthorizedException('User not found in system');
      }

      if (!user.isActive) {
        throw new UnauthorizedException('User account is inactive');
      }

      return {
        id: user.id,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid Firebase token');
    }
  }
}