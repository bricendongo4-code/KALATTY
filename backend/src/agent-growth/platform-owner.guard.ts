import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
export async function assertOwner(
  db: any,
  user: { id?: string; email?: string },
) {
  const email = process.env.KALATTY_PLATFORM_ADMIN_EMAIL?.trim().toLowerCase();
  if (!email || !user.id || user.email?.trim().toLowerCase() !== email)
    throw new ForbiddenException('Accès réservé au propriétaire de Kalatty.');
  const r = await db.auth.admin.getUserById(user.id);
  if (
    r.error ||
    r.data?.user?.email?.toLowerCase() !== email ||
    !r.data.user.email_confirmed_at
  )
    throw new ForbiddenException('Propriétaire non confirmé.');
  return user.id;
}
@Injectable()
export class PlatformOwnerGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseService) {}
  async canActivate(context: ExecutionContext) {
    await assertOwner(
      this.supabase.client,
      context.switchToHttp().getRequest().user ?? {},
    );
    return true;
  }
}
