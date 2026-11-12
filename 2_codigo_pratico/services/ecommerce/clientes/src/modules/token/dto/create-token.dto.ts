import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty } from 'class-validator';

@Exclude()
export class CreateTokenDto {
  @ApiProperty({
    example: 1,
    description: 'The unique identifier of the user.',
  })
  @IsNotEmpty({ message: 'ID is required' })
  @Expose()
  @Transform((value) => value.obj._id.toString())
  _id: string;

  @ApiProperty({
    example: 'John',
    description: 'The first name of the user.',
  })
  @IsNotEmpty({ message: 'Name is required' })
  @Expose()
  name: string;

  @ApiProperty({
    example: 'Doe',
    description: 'The surname of the user.',
  })
  @Expose()
  surname?: string;

  @ApiProperty({
    example: 'buyer',
    description: 'The role of the user.',
  })
  @IsNotEmpty({ message: 'Role is required' })
  @Expose()
  role: string;

  @ApiProperty({
    example: 'https://example.com/image.jpg',
    description: 'The profile picture of the user.',
  })
  @Expose()
  profile_picture?: string;

  @ApiProperty({
    example: 'cus_JKJH',
    description: 'The Stripe customer ID of the user.',
  })
  @IsNotEmpty({ message: 'Stripe customer ID is required' })
  @Expose()
  stripe_cus_id: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'The email address of the user.',
  })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @Expose()
  email: string;
}
