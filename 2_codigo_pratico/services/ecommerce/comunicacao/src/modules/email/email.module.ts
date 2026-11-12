import { Logger, Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';
import { EmailService } from './services/email.service';
import { EmailController } from './controllers/email.controller';
import { InternalEmailController } from './controllers/internal-email.controller';

/**
 * Transporte local de e-mail.
 *
 * Substitui o SMTP: a mensagem é montada pelo adapter do Handlebars e
 * descartada depois de registrada no log. Implementa `verify` retornando uma
 * Promise porque o MailerService a chama com `.then()` na inicialização.
 */
const localTransport = {
  name: 'local',
  version: '1.0',
  send(mail: any, callback: (error: Error | null, info?: any) => void) {
    const logger = new Logger('LocalMailTransport');
    const stream = mail.message.createReadStream();
    stream.on('data', () => undefined);
    stream.on('end', () => {
      logger.log(
        `Mensagem local para ${mail.data.to} (assunto: ${mail.data.subject})`,
      );
      callback(null, {
        envelope: mail.data.envelope,
        messageId: `local-${Date.now()}`,
      });
    });
    stream.on('error', (error: Error) => callback(error));
  },
  verify(callback?: (error: Error | null, success?: boolean) => void) {
    const result = Promise.resolve(true);
    if (callback) {
      result.then(() => callback(null, true)).catch((error) => callback(error));
    }
    return result;
  },
};

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: `.${process.env.NODE_ENV}.env`,
    }),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        transport: localTransport as any,
        defaults: {
          from: `"No Reply" <${config.get('FEEDBACK_EMAIL') ?? 'no-reply@localhost'}>`,
        },
        template: {
          dir: join(__dirname, 'templates'),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }) as any,
      inject: [ConfigService],
    }),
  ],
  controllers: [EmailController, InternalEmailController],
  providers: [EmailService],
})
export class EmailModule {}

