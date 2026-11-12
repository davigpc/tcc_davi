import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class HashingService {
  public async hashPassword(password: string): Promise<string> {
    try {
      return await argon2.hash(password);
    } catch (error) {
      throw new Error('Failed to hash password');
    }
  }

  public async verifyPassword(
    hash: string,
    password: string,
  ): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch (error) {
      throw new Error('Failed to verify password');
    }
  }
}
