import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { IsArray, IsUUID } from 'class-validator';
import { PublicUser } from '../users/user.types';
import { UsersService } from '../users/users.service';

class BatchUsersDto {
  @IsArray()
  @IsUUID('4', { each: true })
  ids!: string[];
}

@Controller('api/internal/users')
export class InternalUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  async findById(@Param('id') id: string): Promise<PublicUser> {
    const user = await this.usersService.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.usersService.toPublicUser(user);
  }

  @Post('batch')
  batch(@Body() body: BatchUsersDto): Promise<PublicUser[]> {
    return this.usersService.findManyByIds(body.ids ?? []);
  }
}
