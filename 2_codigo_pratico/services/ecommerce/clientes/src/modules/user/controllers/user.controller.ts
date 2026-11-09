import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Put,
  Delete,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateUserDto } from '@user/dto/create-user.dto';
import { UpdateUserDto } from '@user/dto/update-user.dto';
import { User } from '@user/schemas/user.schema';
import { UserService } from '@user/services/user.service';

@ApiTags('Users')
@Controller('/users')
export class UserController {
  private readonly logger: Logger = new Logger(UserController.name);

  public constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'Users found', type: [User] })
  public async getAllUsers(): Promise<User[]> {
    this.logger.log('REST request to get all users');
    return this.userService.getAllUsers();
  }

  @Get('/:id')
  @ApiOperation({ summary: 'Get user by id' })
  @ApiResponse({ status: 200, description: 'User found', type: User })
  public async getUserById(@Param('id') id: string): Promise<User> {
    this.logger.log(`REST request to get a user: ${id}`);
    return this.userService.getUserById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a user' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: 'User created', type: User })
  public async createNewUser(@Body() user: CreateUserDto): Promise<User> {
    this.logger.log(`REST request to create a user: ${JSON.stringify(user)}`);
    return this.userService.createUser(user);
  }

  @Put('/:id')
  @ApiOperation({ summary: 'Update a user by id' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, description: 'User updated', type: User })
  public async updateUser(
    @Param('id') id: string,
    @Body() user: UpdateUserDto,
  ): Promise<User> {
    this.logger.log(`REST request to update a user: ${id}`);
    return this.userService.updateUser(id, user);
  }

  @Delete('/:id')
  @ApiOperation({ summary: 'Delete a user by id' })
  @ApiResponse({ status: 204, description: 'User deleted' })
  public async removeUser(@Param('id') id: string): Promise<void> {
    this.logger.log(`REST request to delete a user: ${id}`);
    return this.userService.removeUser(id);
  }
}
