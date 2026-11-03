import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CampusService } from '../campus/campus.service';

type User = { id: string; role?: string };
export type SearchResult = {
  id: string;
  type: string;
  label: string;
  category: string;
  icon: string;
  snippet: string;
  href: string;
  targetHref: string;
};
const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr');
@Injectable()
export class SearchService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly campus: CampusService,
  ) {}
  private get db(): any {
    return this.supabase.client;
  }
  async search(user: User, rawQuery: string, scope: string) {
    if (typeof rawQuery !== 'string')
      throw new BadRequestException('Recherche invalide.');
    const query = rawQuery.trim();
    if (query.length < 2 || query.length > 100)
      throw new BadRequestException('Saisissez entre 2 et 100 caractères.');
    if (!['learn', 'creator', 'campus'].includes(scope))
      throw new BadRequestException('Espace de recherche invalide.');
    // ilike binds its argument; wildcards from the user are escaped, no PostgREST .or expression is interpolated.
    const pattern =
      '%' +
      query
        .replace(/[\\%_]/g, '\\$&')
        .split(/\s+/)
        .join('%') +
      '%';
    const items: SearchResult[] = [],
      unavailableSources: string[] = [];
    const add = (
      type: string,
      row: any,
      label: string,
      category: string,
      icon: string,
      snippet: string,
      targetHref: string,
    ) => {
      const id = String(row.id);
      const focus = encodeURIComponent(type + ':' + id);
      items.push({
        id,
        type,
        label: label.slice(0, 200),
        category,
        icon,
        snippet: String(snippet ?? '').slice(0, 300),
        targetHref,
        href: `/search?q=${encodeURIComponent(query)}&scope=${scope}&focus=${focus}`,
      });
    };
    const collect = async (
      name: string,
      builder: any,
      mapper: (row: any) => void,
    ) => {
      try {
        const { data, error } = await builder;
        if (error) throw Error();
        for (const row of data ?? []) mapper(row);
      } catch {
        unavailableSources.push(name);
      }
    };
    if (scope !== 'campus') {
      let courses = this.db
        .from('courses')
        .select('id,title,short_description')
        .ilike('title', pattern);
      courses =
        scope === 'creator'
          ? courses.eq('teacher_id', user.id).neq('status', 'archived')
          : courses.eq('status', 'published');
      await collect('cours', courses.order('title').limit(10), (r) =>
        add(
          'course',
          r,
          r.title,
          'Cours',
          'book',
          r.short_description,
          scope === 'creator'
            ? `/creator/courses/${r.id}/builder`
            : `/learn/courses/${r.id}`,
        ),
      );
      if (scope === 'creator')
        await collect(
          'studio',
          this.db
            .from('studio_projects')
            .select('id,title,status,course_id')
            .eq('teacher_id', user.id)
            .neq('status', 'archived')
            .ilike('title', pattern)
            .order('title')
            .limit(8),
          (r) =>
            add(
              'studio',
              r,
              r.title,
              'Projet vidéo',
              'video',
              r.status,
              '/creator/studio',
            ),
        );
    } else {
      let context: Awaited<ReturnType<CampusService['getContext']>>;
      try {
        context = await this.campus.getContext(user);
      } catch (e) {
        if (e instanceof NotFoundException)
          throw new ForbiddenException('Aucun établissement accessible.');
        throw e;
      }
      // Context and campusRole come from database memberships, never query parameters or JWT role metadata.
      const institutionId = context.institutionId,
        role = context.campusRole;
      const base = `/establishment/${role}`;
      let roomIds: string[] = [];
      if (role === 'admin') {
        const r = await this.db
          .from('rooms')
          .select('id')
          .eq('institution_id', institutionId);
        if (r.error)
          throw new ServiceUnavailableException('Classes indisponibles.');
        roomIds = (r.data ?? []).map((r: any) => String(r.id));
      } else if (role === 'pedagogy') {
        roomIds = await this.campus.getSearchRoomIds(user);
      } else {
        const membership = await this.db
          .from('room_members')
          .select('room_id')
          .eq('user_id', user.id)
          .eq('role', role);
        if (membership.error)
          throw new ServiceUnavailableException(
            'Accès aux classes indisponible.',
          );
        const ids = (membership.data ?? []).map((r: any) => String(r.room_id));
        if (ids.length) {
          const r = await this.db
            .from('rooms')
            .select('id')
            .eq('institution_id', institutionId)
            .in('id', ids);
          if (r.error)
            throw new ServiceUnavailableException('Classes indisponibles.');
          roomIds = (r.data ?? []).map((r: any) => String(r.id));
        }
      }
      if (roomIds.length) {
        await collect(
          'classes',
          this.db
            .from('rooms')
            .select('id,name,description')
            .eq('institution_id', institutionId)
            .in('id', roomIds)
            .ilike('name', pattern)
            .order('name')
            .limit(8),
          (r) =>
            add(
              'room',
              r,
              r.name,
              'Classe',
              'users',
              r.description,
              `${base}/${role === 'student' ? 'class' : role === 'admin' ? 'academics' : 'classes'}`,
            ),
        );
        // Use only courses explicitly attached to accessible rooms, including non-public campus courses.
        const links = await this.db
          .from('room_courses')
          .select('course_id')
          .in('room_id', roomIds);
        if (links.error) unavailableSources.push('cours');
        else {
          const ids = [
            ...new Set((links.data ?? []).map((r: any) => String(r.course_id))),
          ];
          if (ids.length)
            await collect(
              'cours',
              this.db
                .from('courses')
                .select('id,title,short_description')
                .in('id', ids)
                .ilike('title', pattern)
                .order('title')
                .limit(8),
              (r) =>
                add(
                  'course',
                  r,
                  r.title,
                  'Cours',
                  'book',
                  r.short_description,
                  `/learn/courses/${r.id}`,
                ),
            );
        }
        let members = this.db
          .from('room_members')
          .select('user_id')
          .in('room_id', roomIds);
        if (role === 'student') members = members.eq('role', 'teacher');
        const m = await members;
        if (m.error) unavailableSources.push('personnes');
        else {
          const ids = [
            ...new Set((m.data ?? []).map((r: any) => String(r.user_id))),
          ];
          if (ids.length)
            await collect(
              'personnes',
              this.db
                .from('profiles')
                .select('id,fullname')
                .in('id', ids)
                .ilike('fullname', pattern)
                .order('fullname')
                .limit(8),
              (r) =>
                add(
                  'person',
                  r,
                  r.fullname,
                  role === 'student' ? 'Enseignant' : 'Personne',
                  'user',
                  'Membre de vos classes',
                  `${base}/${role === 'student' ? 'class' : role === 'teacher' ? 'progress' : role === 'admin' ? 'users' : 'students'}`,
                ),
            );
        }
      }
      if (role === 'admin')
        await collect(
          'comptes',
          this.db
            .from('institution_managed_users')
            .select('id,full_name,managed_role')
            .eq('institution_id', institutionId)
            .ilike('full_name', pattern)
            .order('full_name')
            .limit(8),
          (r) =>
            add(
              'account',
              r,
              r.full_name,
              'Compte établissement',
              'user',
              r.managed_role,
              `${base}/users`,
            ),
        );
      if (role === 'admin' || role === 'pedagogy')
        await collect(
          'documents',
          this.db
            .from('institution_documents')
            .select('id,title,category')
            .eq('institution_id', institutionId)
            .ilike('title', pattern)
            .order('title')
            .limit(8),
          (r) =>
            add(
              'document',
              r,
              r.title,
              'Document',
              'file',
              r.category,
              `${base}/documents`,
            ),
        );
    }
    const ranked = [
      ...new Map(items.map((r) => [r.type + ':' + r.id, r])).values(),
    ]
      .sort((a, b) => {
        const score = (s: string) =>
          normalize(s) === normalize(query)
            ? 2
            : normalize(s).startsWith(normalize(query))
              ? 1
              : 0;
        return (
          score(b.label) - score(a.label) ||
          a.label.localeCompare(b.label, 'fr')
        );
      })
      .slice(0, 30);
    return { query, scope, results: ranked, unavailableSources };
  }
}
