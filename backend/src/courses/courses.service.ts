import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

type AuthUser = {
  id: string;
  role?: string;
};

type AttachmentPayload = {
  name: string;
  file_path: string;
  file_type?: string;
};

type ExercisePayload = {
  title: string;
  instructions?: string;
  correction?: string;
  files?: AttachmentPayload[];
};

type LessonPayload = {
  title: string;
  content?: string;
  video_path?: string;
  duration_seconds?: number;
  is_preview?: boolean;
};

type ModulePayload = {
  title: string;
  description?: string;
  lessons?: LessonPayload[];
  exercises?: ExercisePayload[];
  files?: AttachmentPayload[];
};

type CreateCoursePayload = {
  title: string;
  description?: string;
  short_description?: string;
  price_fcfa?: number;
  thumbnail_path?: string;
  modules?: ModulePayload[];
};

@Injectable()
export class CoursesService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getTeacherCourses(user: AuthUser) {
    this.assertTeacher(user);

    const { data, error } = await this.supabaseService.client
      .from('courses')
      .select(
        `
          id,
          title,
          description,
          short_description,
          price_fcfa,
          thumbnail_url,
          status,
          created_at,
          lessons ( id ),
          enrollments ( id ),
          course_modules ( id )
        `,
      )
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return (data ?? []).map((course: any) => ({
      id: course.id,
      title: course.title,
      description: course.description ?? '',
      shortDescription: course.short_description ?? '',
      priceFcfa: Number(course.price_fcfa ?? 0),
      thumbnailPath: course.thumbnail_url ?? '',
      status: course.status ?? 'draft',
      createdAt: course.created_at,
      modulesCount: course.course_modules?.length ?? 0,
      lessonsCount: course.lessons?.length ?? 0,
      learners: course.enrollments?.length ?? 0,
    }));
  }

  async createCourse(user: AuthUser, payload: CreateCoursePayload) {
    this.assertTeacher(user);

    const title = payload.title.trim();
    const description = payload.description?.trim() || null;
    const shortDescription = payload.short_description?.trim() || null;
    const thumbnailPath = payload.thumbnail_path?.trim() || null;
    const priceFcfa = Number(payload.price_fcfa ?? 0);
    const modules = (payload.modules ?? []).filter((module) =>
      module?.title?.trim(),
    );

    if (!title) {
      throw new BadRequestException('Le titre du cours est obligatoire.');
    }

    if (Number.isNaN(priceFcfa) || priceFcfa < 0) {
      throw new BadRequestException('Le prix du cours est invalide.');
    }

    const { data: course, error: courseError } = await this.supabaseService.client
      .from('courses')
      .insert({
        title,
        description,
        short_description: shortDescription,
        price_fcfa: priceFcfa,
        thumbnail_url: thumbnailPath,
        teacher_id: user.id,
        status: 'draft',
      })
      .select(
        'id, title, description, short_description, price_fcfa, thumbnail_url, status, created_at',
      )
      .single();

    if (courseError || !course) {
      throw new BadRequestException(
        courseError?.message ??
          "Impossible de creer le cours. Verifie les policies Supabase et la structure SQL.",
      );
    }

    for (let moduleIndex = 0; moduleIndex < modules.length; moduleIndex += 1) {
      const modulePayload = modules[moduleIndex];
      const { data: moduleRow, error: moduleError } =
        await this.supabaseService.client
          .from('course_modules')
          .insert({
            course_id: course.id,
            title: modulePayload.title.trim(),
            description: modulePayload.description?.trim() || null,
            order_index: moduleIndex,
          })
          .select('id')
          .single();

      if (moduleError || !moduleRow) {
        throw new BadRequestException(
          moduleError?.message ??
            `Impossible de creer le module ${modulePayload.title}.`,
        );
      }

      const files = (modulePayload.files ?? []).filter(
        (file) => file?.name?.trim() && file?.file_path?.trim(),
      );

      if (files.length > 0) {
        const { error: filesError } = await this.supabaseService.client
          .from('course_assets')
          .insert(
            files.map((file) => ({
              course_id: course.id,
              module_id: moduleRow.id,
              name: file.name.trim(),
              file_path: file.file_path.trim(),
              file_type: file.file_type?.trim() || 'document',
            })),
          );

        if (filesError) {
          throw new BadRequestException(
            filesError.message ??
              `Impossible d'ajouter les fichiers du module ${modulePayload.title}.`,
          );
        }
      }

      const lessons = (modulePayload.lessons ?? []).filter((lesson) =>
        lesson?.title?.trim(),
      );

      for (let lessonIndex = 0; lessonIndex < lessons.length; lessonIndex += 1) {
        const lesson = lessons[lessonIndex];
        const { error: lessonError } = await this.supabaseService.client
          .from('lessons')
          .insert({
            course_id: course.id,
            module_id: moduleRow.id,
            title: lesson.title.trim(),
            content: lesson.content?.trim() || null,
            order_index: lessonIndex,
            lesson_type: 'video',
            video_path: lesson.video_path?.trim() || null,
            duration_seconds: lesson.duration_seconds ?? null,
            is_preview: lesson.is_preview ?? false,
          });

        if (lessonError) {
          throw new BadRequestException(
            lessonError.message ??
              `Impossible d'ajouter la lecon ${lesson.title}.`,
          );
        }
      }

      const exercises = (modulePayload.exercises ?? []).filter((exercise) =>
        exercise?.title?.trim(),
      );

      for (const exercise of exercises) {
        const { data: exerciseRow, error: exerciseError } =
          await this.supabaseService.client
            .from('exercises')
            .insert({
              course_id: course.id,
              module_id: moduleRow.id,
              title: exercise.title.trim(),
              instructions: exercise.instructions?.trim() || null,
              correction: exercise.correction?.trim() || null,
            })
            .select('id')
            .single();

        if (exerciseError || !exerciseRow) {
          throw new BadRequestException(
            exerciseError?.message ??
              `Impossible d'ajouter l'exercice ${exercise.title}.`,
          );
        }

        const exerciseFiles = (exercise.files ?? []).filter(
          (file) => file?.name?.trim() && file?.file_path?.trim(),
        );

        if (exerciseFiles.length > 0) {
          const { error: exerciseFilesError } = await this.supabaseService.client
            .from('exercise_files')
            .insert(
              exerciseFiles.map((file) => ({
                exercise_id: exerciseRow.id,
                name: file.name.trim(),
                file_path: file.file_path.trim(),
                file_type: file.file_type?.trim() || 'document',
              })),
            );

          if (exerciseFilesError) {
            throw new BadRequestException(
              exerciseFilesError.message ??
                `Impossible d'ajouter les fichiers de l'exercice ${exercise.title}.`,
            );
          }
        }
      }
    }

    return {
      id: course.id,
      title: course.title,
      description: course.description ?? '',
      shortDescription: course.short_description ?? '',
      priceFcfa: Number(course.price_fcfa ?? 0),
      thumbnailPath: course.thumbnail_url ?? '',
      status: course.status ?? 'draft',
      createdAt: course.created_at,
      modulesCount: modules.length,
      lessonsCount: modules.reduce(
        (sum, module) => sum + (module.lessons?.filter((lesson) => lesson?.title?.trim()).length ?? 0),
        0,
      ),
      learners: 0,
    };
  }

  private assertTeacher(user: AuthUser) {
    if (user.role !== 'teacher' && user.role !== 'admin') {
      throw new ForbiddenException(
        'Cette action est reservee aux enseignants.',
      );
    }
  }
}
