import { Module } from '@nestjs/common';
import { EMAIL_SENDER } from '../../common/constants/injection-tokens.js';
import { emailConfig, type EmailConfig } from '../../config/index.js';
import { LogEmailSender } from './infrastructure/log-email-sender.js';
import { ResendEmailSender } from './infrastructure/resend-email-sender.js';

/**
 * Elige la implementación del envío de correos según la config:
 * con RESEND_API_KEY envía de verdad; sin ella, escribe en el log.
 * Quien inyecta EMAIL_SENDER no sabe cuál le tocó (ni le importa).
 */
@Module({
  providers: [
    {
      provide: EMAIL_SENDER,
      inject: [emailConfig.KEY],
      useFactory: (config: EmailConfig) =>
        config.resendApiKey
          ? new ResendEmailSender(config.resendApiKey, config.from)
          : new LogEmailSender(),
    },
  ],
  exports: [EMAIL_SENDER],
})
export class NotificationsModule {}
