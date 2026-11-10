import { IsNotEmpty, IsNumber, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CreateItemDto } from '@item/dto/create-item.dto';

export class CreateOrderDto {
  @ApiProperty({
    description: 'The unique identifier of the customer',
    example: '66b7b3e8c32055a049b55029',
  })
  customer: string;

  @ApiProperty({
    description: 'The items in the order',
    type: [CreateItemDto],
  })
  @IsArray()
  items: CreateItemDto[];

  @ApiProperty({
    description: 'Total amount of the order',
    example: 228.07,
  })
  @IsNumber()
  amount: number;

  @ApiProperty({
    description: 'Billing details of the customer',
    example: {
      name: 'John Doe',
      email: 'john.doe@example.com',
      address: '123 Main St, Anytown, USA',
      city: 'Anytown',
      postcode: '12345',
      phone: '+1234567890',
    },
  })
  @IsNotEmpty()
  billing_details: any;

  @ApiProperty({
    description: 'Notes for the order',
    example: 'Please deliver between 9 AM and 5 PM',
  })
  order_notes: any;
}
