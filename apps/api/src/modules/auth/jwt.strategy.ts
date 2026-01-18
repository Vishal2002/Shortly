import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:'secretkey123',
    });
    console.log('JWT Secret in Strategy:', process.env.JWT_SECRET);
  }

  async validate(payload: any) {
    console.log('🔍 JWT Payload:', payload);
    
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }
    
    const user = { userId: payload.sub, email: payload.email };
    console.log('✅ Validated user:', user);
    
    return user;
  }
}
