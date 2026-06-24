import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  jwtSecret: process.env.JWT_SECRET || 'super-secret-key-change-in-production',
  jwtAccessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
  jwtRefreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  // Google OAuth client IDs — accepted as valid ID-token audiences.
  googleClientIdWeb: process.env.GOOGLE_CLIENT_ID_WEB || '',
  googleClientIdIos: process.env.GOOGLE_CLIENT_ID_IOS || '',
  googleClientIdAndroid: process.env.GOOGLE_CLIENT_ID_ANDROID || '',
}));
