import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class AuthResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  @Expose()
  accessToken: string;

  refreshToken: string;

  @ApiProperty({
    example: {
      _id: '66829081894baf6d7bca705b',
      name: 'John',
      surname: 'Doe',
      email: 'example@example.com',
      role: 'Buyer',
      profile_picture: 'https://example.com/image.jpg',
      stripe_cus_id: 'cus_JKJH',
    },
  })
  @Expose()
  user: {
    _id: string;
    name: string;
    surname?: string;
    email: string;
    role?: string;
    profile_picture?: string;
    stripe_cus_id: string;
  };
}
