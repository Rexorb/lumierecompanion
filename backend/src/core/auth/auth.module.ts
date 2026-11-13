import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { MailService } from './services/mail.service';
import { requireJwtSecret } from './jwt-config';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: requireJwtSecret(config.get<string>('JWT_SECRET')),
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRES_IN')
            ? parseInt(config.get<string>('JWT_EXPIRES_IN')!)
            : '7d',
        },
      }),
    }),
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, MailService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
