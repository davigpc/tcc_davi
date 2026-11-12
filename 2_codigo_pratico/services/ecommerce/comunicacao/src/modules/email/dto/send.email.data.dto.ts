import { IsEmail, IsNotEmpty, IsObject, IsString } from 'class-validator';

export class SendMailDataDto {
  @IsString()
  @IsNotEmpty()
  template: string;

  @IsObject()
  @IsNotEmpty()
  dataTemplate: object;

  @IsEmail()
  @IsNotEmpty()
  to: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  text: string;
}
