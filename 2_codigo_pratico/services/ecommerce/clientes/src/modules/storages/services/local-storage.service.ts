import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { extname, join } from 'node:path';

/**
 * Substitui o armazenamento no AWS S3 por disco local.
 *
 * Os arquivos são gravados em `UPLOAD_DIR` e servidos publicamente em
 * `/uploads` (ver `main.ts`). A URL devolvida aponta para o próprio serviço.
 */
@Injectable()
export class LocalStorageService {
  private readonly logger = new Logger(LocalStorageService.name);

  private readonly uploadDir: string;
  private readonly publicBaseUrl: string;

  public constructor(private readonly configService: ConfigService) {
    this.uploadDir =
      this.configService.get<string>('UPLOAD_DIR') ?? 'uploads';
    this.publicBaseUrl =
      this.configService.get<string>('PUBLIC_BASE_URL') ??
      'http://localhost:3001';
  }

  public async uploadMultipleFiles(
    files: Array<Express.Multer.File> = [],
  ): Promise<string[]> {
    const results = await Promise.all(
      files.map((file) => this.uploadFile(file)),
    );
    return results.map((result) => result.url);
  }

  public async uploadSingleFile(
    file: Express.Multer.File,
  ): Promise<string> {
    const { url } = await this.uploadFile(file);
    return url;
  }

  public async getUrlAndOriginalNames(
    files: Array<Express.Multer.File> = [],
  ): Promise<{ url: string; originalName: string }[]> {
    return Promise.all(files.map((file) => this.uploadFile(file)));
  }

  private async uploadFile(
    file: Express.Multer.File,
  ): Promise<{ url: string; originalName: string }> {
    await fs.mkdir(this.uploadDir, { recursive: true });
    const key = `${Date.now()}-${randomUUID()}${extname(file.originalname)}`;
    await fs.writeFile(join(this.uploadDir, key), file.buffer);
    const url = `${this.publicBaseUrl.replace(/\/$/, '')}/uploads/${key}`;
    this.logger.log(`Arquivo gravado localmente: ${key}`);
    return { url, originalName: file.originalname };
  }
}
