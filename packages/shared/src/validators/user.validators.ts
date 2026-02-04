import { IsEnum, IsString, IsEmail, IsBoolean, IsOptional, IsUUID, MinLength } from 'class-validator';
import { UserRole, UserRoleEnum } from '@pdcp/types';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  name: string;

  @IsEnum(UserRoleEnum)
  role: UserRole;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class UpdateUserDto {
  @IsUUID()
  id: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(UserRoleEnum)
  role?: UserRole;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class ChangePasswordDto {
  @IsUUID()
  userId: string;

  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}