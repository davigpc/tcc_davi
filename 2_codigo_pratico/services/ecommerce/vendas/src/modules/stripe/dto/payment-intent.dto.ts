import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { StripeMetadata } from '@stripe/interfaces/metadata.interface';

export class PaymentIntentDto {
  @ApiProperty({ description: 'The amount to be paid', example: 228 })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'The currency of the payment', example: 'usd' })
  @IsString()
  currency: string;

  @ApiProperty({
    description: 'Additional metadata for the payment',
    type: 'object',
    example: {
      billing_details: {
        name: 'John Doe',
        email: 'john.doe@example.com',
        address: '123 Main St, Anytown, USA',
      },
      order_notes: 'Please deliver between 9 AM and 5 PM',
    },
  })
  @IsNotEmpty()
  metadata: StripeMetadata;
}
