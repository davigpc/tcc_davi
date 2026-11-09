import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateUserDto {
  @ApiProperty({ example: 'John', description: 'User name' })
  name: string;

  @ApiProperty({ example: 'Doe', description: 'User surname' })
  surname?: string;

  @ApiProperty({ example: 'Buyer', description: 'User role' })
  @Transform(({ value }) => value.toLowerCase())
  role: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Profile picture file',
  })
  profile_picture?: any;

  @ApiProperty({
    example: 'This is a bio',
    description: 'User bio',
  })
  bio?: string;

  @ApiProperty({
    example: 'Street 1, City, Country',
  })
  address?: string;

  @ApiProperty({
    example: '+421 951 914 764',
    description: 'User phone number',
  })
  phone_number?: string;

  @ApiProperty({ example: 'example@example.com', description: 'User email' })
  email: string;

  @ApiProperty({ example: 'password123', description: 'User password' })
  password: string;
}
