import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    console.log('🔒 JwtAuthGuard activated');
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    console.log('🔍 handleRequest - err:', err, 'user:', user, 'info:', info);
    
    if (err || !user) {
      console.log('❌ Auth failed');
      throw err || new Error('Unauthorized');
    }
    
    console.log('✅ Auth success:', user);
    return user;
  }
}