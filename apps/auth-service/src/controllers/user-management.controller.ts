import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { SensitiveOperationGuard } from '../guards/sensitive-operation.guard';
import { Roles } from '../decorators/roles.decorator';
import { RequirePermissions } from '../decorators/permissions.decorator';
import { SensitiveOperation } from '../decorators/sensitive-operation.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { UserRole, Permission, AuthUser } from '../interfaces/auth.interfaces';
import { RolePermissionService } from '../services/role-permission.service';
import { JwtAuthService } from '../services/jwt-auth.service';

interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  permissions?: Permission[];
  phoneNumber?: string;
  password?: string;
}

interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  permissions?: Permission[];
  phoneNumber?: string;
  isActive?: boolean;
}

interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: UserRole;
  permissions: Permission[];
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

@ApiTags('User Management')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth()
export class UserManagementController {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private rolePermissionService: RolePermissionService,
    private jwtAuthService: JwtAuthService,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.MANAGE_USERS)
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async getUsers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('role') role?: UserRole,
    @Query('active') active?: boolean,
  ): Promise<{ users: UserResponse[]; total: number; page: number; limit: number }> {
    const query = this.userRepository.createQueryBuilder('user');

    if (role) {
      query.andWhere('user.role = :role', { role });
    }

    if (active !== undefined) {
      query.andWhere('user.isActive = :active', { active });
    }

    query.orderBy('user.createdAt', 'DESC')
      .limit(limit)
      .offset((page - 1) * limit);

    const [users, total] = await query.getManyAndCount();

    return {
      users: users.map(user => this.mapToUserResponse(user)),
      total,
      page,
      limit,
    };
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.MANAGE_USERS)
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id') id: string): Promise<UserResponse> {
    const user = await this.userRepository.findOne({ where: { id } });
    
    if (!user) {
      throw new Error('User not found');
    }

    return this.mapToUserResponse(user);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.MANAGE_USERS)
  @SensitiveOperation()
  @UseGuards(SensitiveOperationGuard)
  @ApiOperation({ summary: 'Create new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid user data' })
  async createUser(
    @Body() createUserRequest: CreateUserRequest,
    @CurrentUser() currentUser: AuthUser,
  ): Promise<UserResponse> {
    const { email, firstName, lastName, role, permissions, phoneNumber, password } = createUserRequest;

    // Validate permissions for the role
    const defaultPermissions = this.rolePermissionService.getDefaultPermissionsForRole(role);
    const userPermissions = permissions || defaultPermissions;

    const validation = this.rolePermissionService.validateRolePermissions(role, userPermissions);
    if (!validation.valid) {
      throw new Error(`Invalid permissions for role ${role}: ${validation.invalidPermissions.join(', ')}`);
    }

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    const user = this.userRepository.create({
      email,
      firstName,
      lastName,
      role,
      permissions: userPermissions,
      phoneNumber,
      passwordHash: password ? await this.jwtAuthService.hashPassword(password) : undefined,
      isActive: true,
    });

    const savedUser = await this.userRepository.save(user);
    return this.mapToUserResponse(savedUser);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.MANAGE_USERS)
  @SensitiveOperation()
  @UseGuards(SensitiveOperationGuard)
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserRequest: UpdateUserRequest,
    @CurrentUser() currentUser: AuthUser,
  ): Promise<UserResponse> {
    const user = await this.userRepository.findOne({ where: { id } });
    
    if (!user) {
      throw new Error('User not found');
    }

    const { firstName, lastName, role, permissions, phoneNumber, isActive } = updateUserRequest;

    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
    if (isActive !== undefined) user.isActive = isActive;

    if (role !== undefined) {
      user.role = role;
      // Update permissions based on new role if not explicitly provided
      if (permissions === undefined) {
        user.permissions = this.rolePermissionService.getDefaultPermissionsForRole(role);
      }
    }

    if (permissions !== undefined) {
      const targetRole = role || user.role;
      const validation = this.rolePermissionService.validateRolePermissions(targetRole, permissions);
      if (!validation.valid) {
        throw new Error(`Invalid permissions for role ${targetRole}: ${validation.invalidPermissions.join(', ')}`);
      }
      user.permissions = permissions;
    }

    const savedUser = await this.userRepository.save(user);
    return this.mapToUserResponse(savedUser);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.MANAGE_USERS)
  @SensitiveOperation()
  @UseGuards(SensitiveOperationGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user' })
  @ApiResponse({ status: 204, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteUser(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthUser,
  ): Promise<void> {
    if (id === currentUser.id) {
      throw new Error('Cannot delete your own account');
    }

    const user = await this.userRepository.findOne({ where: { id } });
    
    if (!user) {
      throw new Error('User not found');
    }

    await this.userRepository.remove(user);
  }

  @Get('roles/permissions')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.MANAGE_USERS)
  @ApiOperation({ summary: 'Get role and permission definitions' })
  @ApiResponse({ status: 200, description: 'Role and permission definitions retrieved successfully' })
  getRolePermissions(): {
    roles: UserRole[];
    permissions: Permission[];
    rolePermissions: Record<UserRole, Permission[]>;
  } {
    return {
      roles: Object.values(UserRole),
      permissions: Object.values(Permission),
      rolePermissions: {
        [UserRole.ADMIN]: this.rolePermissionService.getDefaultPermissionsForRole(UserRole.ADMIN),
        [UserRole.DISPATCHER]: this.rolePermissionService.getDefaultPermissionsForRole(UserRole.DISPATCHER),
        [UserRole.DRIVER]: this.rolePermissionService.getDefaultPermissionsForRole(UserRole.DRIVER),
      },
    };
  }

  private mapToUserResponse(user: User): UserResponse {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      role: user.role,
      permissions: user.permissions,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}