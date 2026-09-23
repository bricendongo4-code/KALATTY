import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import type { Json } from '../types/supabase';
import { CreateStudioProjectDto } from './dto/create-studio-project.dto';
import { StudioAiDto } from './dto/studio-ai.dto';
import { UpdateStudioProjectDto } from './dto/update-studio-project.dto';

type AuthUser = { id: string; role?: string };
type StudioRow = {
  id: string;
  teacher_id: string;
  course_id: string;
  lesson_id: string | null;
  title: string;
  status: string;
  script: string;
  transcript: string;
  scenes: unknown;
  video_path: string | null;
  version: number;
  created_at: string;
  updated_at: string;
};

@Injectable()
export class StudioService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async list(user: AuthUser) {
    await this.assertTeacher(user);
    const { data, error } = await this.supabaseService.client
      .from('studio_projects')
      .select('id, course_id, lesson_id, title, status, version, updated_at, courses ( title ), lessons ( title )')
      .eq('teacher_id', user.id)
      .neq('status', 'archived')
      .order('updated_at', { ascending: false });
    if (error) throw new BadRequestException(error.message);
    return {
      projects: (data ?? []).map((project: any) => ({
        id: project.id,
        courseId: project.course_id,
        lessonId: project.lesson_id,
        title: project.title,
        status: project.status,
        version: project.version,
        updatedAt: project.updated_at,
        courseTitle: project.courses?.title ?? 'Formation',
        lessonTitle: project.lessons?.title ?? 'Leçon non liée',
      })),
    };
  }

  async create(user: AuthUser, body: CreateStudioProjectDto) {
    await this.assertCourseOwnership(user, body.courseId, body.lessonId);
    const { data, error } = await this.supabaseService.client
      .from('studio_projects')
      .insert({
        teacher_id: user.id,
        course_id: body.courseId,
        lesson_id: body.lessonId ?? null,
        title: body.title.trim() || 'Projet Studio',
      })
      .select('*')
      .single();
    if (error || !data) {
      throw new BadRequestException(error?.message ?? 'Création du projet impossible.');
    }
    return this.formatProject(data as StudioRow);
  }

  async get(user: AuthUser, projectId: string) {
    await this.assertTeacher(user);
    const project = await this.getOwnedProject(user.id, projectId);
    return this.formatProject(project);
  }

  async update(user: AuthUser, projectId: string, body: UpdateStudioProjectDto) {
    await this.assertTeacher(user);
    const project = await this.getOwnedProject(user.id, projectId);
    const updates = {
      ...(body.title !== undefined ? { title: body.title.trim() || project.title } : {}),
      ...(body.script !== undefined ? { script: body.script } : {}),
      ...(body.transcript !== undefined ? { transcript: body.transcript } : {}),
      ...(body.scenes !== undefined ? { scenes: body.scenes as Json } : {}),
      ...(body.videoPath !== undefined ? { video_path: body.videoPath.trim() || null } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      version: body.version + 1,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await this.supabaseService.client
      .from('studio_projects')
      .update(updates)
      .eq('id', projectId)
      .eq('teacher_id', user.id)
      .eq('version', body.version)
      .select('*')
      .maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!data) {
      throw new ConflictException('Ce projet a été modifié ailleurs. Rechargez la version la plus récente.');
    }
    return this.formatProject(data as StudioRow);
  }

  async generate(user: AuthUser, projectId: string, body: StudioAiDto) {
    await this.assertTeacher(user);
    const project = await this.getOwnedProject(user.id, projectId);
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException(
        "L'assistant IA n'est pas encore configuré. Ajoutez OPENAI_API_KEY dans Railway.",
      );
    }

    const model = process.env.OPENAI_MODEL?.trim() || 'gpt-5-mini';
    const task = {
      outline: 'Propose un plan pédagogique découpé en scènes courtes.',
      script: 'Rédige un script oral clair, naturel et adapté à une vidéo pédagogique.',
      quiz: 'Crée un quiz de validation à choix multiples avec les bonnes réponses.',
    }[body.action];
    const prompt = body.prompt?.trim() || task;
    const input = `Titre du projet: ${project.title}\nScript actuel: ${project.script.slice(0, 12000)}\nDemande du formateur: ${prompt}`;
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        store: false,
        input: [
          { role: 'developer', content: [{ type: 'input_text', text: `Tu es l'assistant pédagogique de Kalatty. ${task} Réponds en français, sans inventer de références externes. Si le contenu est insuffisant, reste général et utile.` }] },
          { role: 'user', content: [{ type: 'input_text', text: input }] },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'kalatty_studio_assistance',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                title: { type: 'string' },
                summary: { type: 'string' },
                script: { type: 'string' },
                outline: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { title: { type: 'string' }, objective: { type: 'string' }, durationSeconds: { type: 'number' } }, required: ['title', 'objective', 'durationSeconds'] } },
                quiz: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { question: { type: 'string' }, choices: { type: 'array', items: { type: 'string' } }, answerIndex: { type: 'number' }, explanation: { type: 'string' } }, required: ['question', 'choices', 'answerIndex', 'explanation'] } },
              },
              required: ['title', 'summary', 'script', 'outline', 'quiz'],
            },
          },
        },
      }),
    });
    const responseBody = (await response.json()) as any;
    if (!response.ok) {
      throw new ServiceUnavailableException(responseBody?.error?.message ?? 'Assistant IA momentanément indisponible.');
    }
    const outputText = (responseBody.output ?? [])
      .flatMap((item: any) => item.content ?? [])
      .find((item: any) => item.type === 'output_text')?.text;
    if (!outputText) throw new ServiceUnavailableException("L'assistant IA n'a produit aucun contenu exploitable.");

    let result: Record<string, unknown>;
    try {
      result = JSON.parse(outputText) as Record<string, unknown>;
    } catch {
      throw new ServiceUnavailableException("La réponse de l'assistant IA est invalide.");
    }
    await this.supabaseService.client.from('studio_ai_generations').insert({
      project_id: project.id,
      teacher_id: user.id,
      action: body.action,
      prompt,
      result: result as Json,
      model,
    });
    return { action: body.action, model, result };
  }

  private async getOwnedProject(teacherId: string, projectId: string): Promise<StudioRow> {
    const { data, error } = await this.supabaseService.client
      .from('studio_projects')
      .select('*')
      .eq('id', projectId)
      .eq('teacher_id', teacherId)
      .maybeSingle();
    if (error || !data) throw new BadRequestException(error?.message ?? 'Projet Studio introuvable.');
    return data as StudioRow;
  }

  private async assertTeacher(user: AuthUser) {
    const { data, error } = await this.supabaseService.client.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (error || !data || !['teacher', 'admin'].includes(data.role ?? '')) {
      throw new ForbiddenException('Le Studio est réservé aux formateurs.');
    }
  }

  private async assertCourseOwnership(user: AuthUser, courseId: string, lessonId?: string) {
    await this.assertTeacher(user);
    const { data: course, error } = await this.supabaseService.client
      .from('courses')
      .select('id')
      .eq('id', courseId)
      .eq('teacher_id', user.id)
      .maybeSingle();
    if (error || !course) throw new ForbiddenException("Cette formation ne vous appartient pas.");
    if (lessonId) {
      const { data: lesson } = await this.supabaseService.client.from('lessons').select('id').eq('id', lessonId).eq('course_id', courseId).maybeSingle();
      if (!lesson) throw new BadRequestException("La leçon choisie n'appartient pas à cette formation.");
    }
  }

  private formatProject(project: StudioRow) {
    return {
      id: project.id,
      courseId: project.course_id,
      lessonId: project.lesson_id,
      title: project.title,
      status: project.status,
      script: project.script ?? '',
      transcript: project.transcript ?? '',
      scenes: Array.isArray(project.scenes) ? project.scenes : [],
      videoPath: project.video_path ?? '',
      version: Number(project.version ?? 1),
      createdAt: project.created_at,
      updatedAt: project.updated_at,
    };
  }
}
