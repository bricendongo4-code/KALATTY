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

type UploadCategory = 'thumbnail' | 'video';

type UploadedAsset = {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
};

type ReviewPayload = {
  rating?: number;
  comment?: string;
};

type ProgressPayload = {
  status?: 'started' | 'completed';
};

type DiscoveryCourse = {
  id: string;
  title: string;
  description: string;
  shortDescription: string;
  priceFcfa: number;
  thumbnailUrl: string;
  teacherName: string;
  teacherExpertise: string;
  courseRatingAverage: number;
  teacherRatingAverage: number;
  totalReviews: number;
  lessonsCount: number;
};

type SignedCourseFile = {
  id: string;
  name: string;
  filePath: string;
  fileType: string;
};

type SignedExercise = {
  id: string;
  title: string;
  instructions: string;
  correction: string;
  files: SignedCourseFile[];
};

type SignedLesson = {
  id: string;
  title: string;
  content: string;
  videoPath: string;
  durationSeconds: number;
  isPreview: boolean;
  progressStatus: string;
};

type SignedModule = {
  id: string;
  title: string;
  description: string;
  lessons: SignedLesson[];
  exercises: SignedExercise[];
};

@Injectable()
export class CoursesService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async uploadCourseAsset(
    user: AuthUser,
    file: UploadedAsset,
    category: UploadCategory,
  ) {
    await this.assertTeacher(user);

    if (!file.buffer?.length) {
      throw new BadRequestException('Le fichier envoye est vide.');
    }

    if (category === 'thumbnail' && !file.mimetype.startsWith('image/')) {
      throw new BadRequestException(
        'La miniature doit etre une image valide.',
      );
    }

    if (category === 'video' && !file.mimetype.startsWith('video/')) {
      throw new BadRequestException('La ressource envoyee doit etre une video.');
    }

    const bucket = category === 'thumbnail' ? 'course-thumbnails' : 'course-videos';
    const safeName = this.sanitizeFilename(file.originalname || `${category}.bin`);
    const filePath = `${user.id}/${Date.now()}-${safeName}`;

    const { error } = await this.supabaseService.client.storage
      .from(bucket)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      throw new BadRequestException(
        error.message ??
          "L'upload du fichier a echoue. Verifie la configuration Storage Supabase.",
      );
    }

    return {
      bucket,
      path: filePath,
      mimetype: file.mimetype,
      size: file.size,
    };
  }

  async getTeacherCourses(user: AuthUser) {
    await this.assertTeacher(user);

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

  async getPublicDiscovery() {
    const { data: courses, error } = await this.supabaseService.client
      .from('courses')
      .select(
        `
          id,
          title,
          description,
          short_description,
          price_fcfa,
          thumbnail_url,
          teacher_id,
          profiles:teacher_id (
            fullname,
            expertise
          ),
          lessons ( id )
        `,
      )
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(12);

    if (error) {
      throw new BadRequestException(
        error.message ?? 'Impossible de charger la vitrine des cours.',
      );
    }

    const courseIds = (courses ?? []).map((course: any) => course.id);
    const teacherIds = (courses ?? []).map((course: any) => course.teacher_id);

    const { data: courseReviews, error: courseReviewsError } = courseIds.length
      ? await this.supabaseService.client
          .from('course_reviews')
          .select('course_id, rating')
          .in('course_id', courseIds)
      : { data: [] as Array<Record<string, unknown>> };

    const { data: teacherReviews, error: teacherReviewsError } = teacherIds.length
      ? await this.supabaseService.client
          .from('teacher_reviews')
          .select('teacher_id, rating')
          .in('teacher_id', teacherIds)
      : { data: [] as Array<Record<string, unknown>> };

    if (
      (courseReviewsError && !this.isMissingTableError(courseReviewsError)) ||
      (teacherReviewsError && !this.isMissingTableError(teacherReviewsError))
    ) {
      throw new BadRequestException(
        courseReviewsError?.message ??
          teacherReviewsError?.message ??
          'Impossible de charger les avis publics.',
      );
    }

    const discoveryCourses = await Promise.all(
      (courses ?? []).map(async (course: any) => {
        const courseReviewRows = (courseReviews ?? []).filter(
          (review: any) => review.course_id === course.id,
        );
        const teacherReviewRows = (teacherReviews ?? []).filter(
          (review: any) => review.teacher_id === course.teacher_id,
        );

        return {
          id: course.id,
          title: course.title ?? 'Cours sans titre',
          description: course.description ?? '',
          shortDescription: course.short_description ?? '',
          priceFcfa: Number(course.price_fcfa ?? 0),
          thumbnailUrl: await this.resolveStorageUrl(
            'course-thumbnails',
            course.thumbnail_url ?? '',
          ),
          teacherName: course.profiles?.fullname ?? 'Formateur Kalatty',
          teacherExpertise: course.profiles?.expertise ?? '',
          courseRatingAverage: this.getAverageRating(
            courseReviewRows.map((review: any) => ({
              rating: Number(review.rating ?? 0),
            })),
          ),
          teacherRatingAverage: this.getAverageRating(
            teacherReviewRows.map((review: any) => ({
              rating: Number(review.rating ?? 0),
            })),
          ),
          totalReviews: courseReviewRows.length,
          lessonsCount: course.lessons?.length ?? 0,
        } satisfies DiscoveryCourse;
      }),
    );

    const topRated = discoveryCourses
      .slice()
      .sort((a, b) => {
        if (b.courseRatingAverage !== a.courseRatingAverage) {
          return b.courseRatingAverage - a.courseRatingAverage;
        }

        return b.totalReviews - a.totalReviews;
      })
      .slice(0, 6);

    return {
      featuredCourses: discoveryCourses.slice(0, 6),
      topRatedCourses: topRated,
      guides: [
        {
          id: 'guide-student',
          title: 'Commencer un cours',
          description:
            "Inscris-toi, ouvre la fiche du cours, lance la premiere video et suis tes modules depuis l'espace etudiant.",
        },
        {
          id: 'guide-teacher',
          title: 'Publier comme formateur',
          description:
            'Charge ta miniature, ajoute tes videos directement sur Kalatty puis publie ton programme module par module.',
        },
        {
          id: 'guide-campus',
          title: 'Brancher un etablissement',
          description:
            'Cree des salles, invite etudiants et professeurs par lien puis distribue les exercices dans chaque groupe.',
        },
      ],
      promos: [
        {
          id: 'promo-campus',
          title: 'Offre campus',
          description:
            'Regroupe tes apprenants dans des salles Kalatty et suis leur progression depuis un seul espace.',
        },
        {
          id: 'promo-teacher',
          title: 'Studio formateur',
          description:
            'Diffuse tes cours video, collecte les avis et developpe ta visibilite sur la vitrine Kalatty.',
        },
      ],
    };
  }

  async getCourseDetail(user: AuthUser, courseId: string) {
    const role = await this.resolveRole(user);

    const { data: course, error } = await this.supabaseService.client
      .from('courses')
      .select(
        `
          id,
          title,
          description,
          short_description,
          price_fcfa,
          thumbnail_url,
          teacher_id,
          status,
          profiles:teacher_id (
            fullname,
            expertise
          ),
          course_modules (
            id,
            title,
            description,
            order_index,
            lessons (
              id,
              title,
              content,
              video_path,
              duration_seconds,
              is_preview,
              order_index
            ),
            exercises (
              id,
              title,
              instructions,
              correction,
              exercise_files (
                id,
                name,
                file_path,
                file_type
              )
            )
          )
        `,
      )
      .eq('id', courseId)
      .maybeSingle();

    if (error || !course) {
      throw new BadRequestException(
        error?.message ?? 'Le cours demande est introuvable.',
      );
    }

    if (
      course.status !== 'published' &&
      role !== 'admin' &&
      !(role === 'teacher' && course.teacher_id === user.id)
    ) {
      throw new ForbiddenException("Ce cours n'est pas accessible.");
    }

    const lessonIds = (course.course_modules ?? []).flatMap((module: any) =>
      (module.lessons ?? []).map((lesson: any) => lesson.id),
    );
    const progressMap =
      role === 'student' && lessonIds.length > 0
        ? await this.getLessonProgressMap(user.id, lessonIds)
        : new Map<string, string>();

    const modules = await Promise.all(
      (course.course_modules ?? [])
        .slice()
        .sort(
          (a: any, b: any) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0),
        )
        .map(async (module: any) => {
          const lessons = await Promise.all(
            (module.lessons ?? [])
              .slice()
              .sort(
                (a: any, b: any) =>
                  Number(a.order_index ?? 0) - Number(b.order_index ?? 0),
              )
              .map(
                async (lesson: any): Promise<SignedLesson> => ({
                  id: lesson.id,
                  title: lesson.title ?? 'Lecon',
                  content: lesson.content ?? '',
                  videoPath: await this.resolveStorageUrl(
                    'course-videos',
                    lesson.video_path ?? '',
                  ),
                  durationSeconds: Number(lesson.duration_seconds ?? 0),
                  isPreview: Boolean(lesson.is_preview),
                  progressStatus: progressMap.get(lesson.id) ?? 'not_started',
                }),
              ),
          );

          const exercises = await Promise.all(
            (module.exercises ?? []).map(
              async (exercise: any): Promise<SignedExercise> => ({
                id: exercise.id,
                title: exercise.title ?? 'Exercice',
                instructions: exercise.instructions ?? '',
                correction: exercise.correction ?? '',
                files: await Promise.all(
                  (exercise.exercise_files ?? []).map(
                    async (file: any): Promise<SignedCourseFile> => ({
                      id: file.id,
                      name: file.name ?? 'Fichier',
                      filePath: await this.resolveStorageUrl(
                        'course-files',
                        file.file_path ?? '',
                      ),
                      fileType: file.file_type ?? 'document',
                    }),
                  ),
                ),
              }),
            ),
          );

          return {
            id: module.id,
            title: module.title ?? 'Module',
            description: module.description ?? '',
            lessons,
            exercises,
          } satisfies SignedModule;
        }),
    );

    const totalLessons = modules.reduce(
      (sum: number, module: { lessons: Array<unknown> }) => sum + module.lessons.length,
      0,
    );
    const completedLessons = Array.from(progressMap.values()).filter(
      (status) => status === 'completed',
    ).length;
    const startedLessons = Array.from(progressMap.values()).filter(
      (status) => status === 'started' || status === 'completed',
    ).length;

    const courseReviews = await this.getCourseReviews(course.id);
    const teacherReviews = await this.getTeacherReviews(
      course.teacher_id,
      course.id,
    );

    return {
      id: course.id,
      title: course.title ?? 'Cours sans titre',
      description: course.description ?? '',
      shortDescription: course.short_description ?? '',
      priceFcfa: Number(course.price_fcfa ?? 0),
      thumbnailUrl: await this.resolveStorageUrl(
        'course-thumbnails',
        course.thumbnail_url ?? '',
      ),
      teacherName: course.profiles?.fullname ?? 'Formateur Kalatty',
      teacherExpertise: course.profiles?.expertise ?? '',
      status: course.status ?? 'draft',
      modules,
      courseReviews,
      teacherReviews,
      courseRatingAverage: this.getAverageRating(courseReviews),
      teacherRatingAverage: this.getAverageRating(teacherReviews),
      lessonsCount: totalLessons,
      completedLessons,
      startedLessons,
      progressPercentage:
        totalLessons > 0 ? Math.round((startedLessons / totalLessons) * 100) : 0,
      enrolled:
        role === 'student'
          ? await this.isUserEnrolled(user.id, course.id)
          : false,
    };
  }

  async addCourseReview(
    user: AuthUser,
    courseId: string,
    payload: ReviewPayload,
  ) {
    await this.assertStudentReviewer(user, courseId);
    const rating = this.normalizeRating(payload.rating);
    const comment = payload.comment?.trim() || null;

    const { error } = await this.supabaseService.client
      .from('course_reviews')
      .upsert(
        {
          course_id: courseId,
          student_id: user.id,
          rating,
          comment,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'course_id,student_id',
        },
      );

    if (error) {
      throw new BadRequestException(
        error.message ?? "Impossible d'enregistrer l'avis sur le cours.",
      );
    }

    return {
      message: 'Avis sur le cours enregistre.',
    };
  }

  async addTeacherReview(
    user: AuthUser,
    courseId: string,
    payload: ReviewPayload,
  ) {
    const course = await this.assertStudentReviewer(user, courseId);
    const rating = this.normalizeRating(payload.rating);
    const comment = payload.comment?.trim() || null;

    const { error } = await this.supabaseService.client
      .from('teacher_reviews')
      .upsert(
        {
          teacher_id: course.teacher_id,
          student_id: user.id,
          course_id: courseId,
          rating,
          comment,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'teacher_id,student_id,course_id',
        },
      );

    if (error) {
      throw new BadRequestException(
        error.message ?? "Impossible d'enregistrer l'avis sur le professeur.",
      );
    }

    return {
      message: 'Avis sur le professeur enregistre.',
    };
  }

  async enrollInCourse(user: AuthUser, courseId?: string) {
    if (!courseId) {
      throw new BadRequestException('Le cours a inscrire est introuvable.');
    }

    const role = await this.resolveRole(user);
    if (role !== 'student' && role !== 'admin') {
      throw new ForbiddenException(
        "Seuls les etudiants peuvent s'inscrire a un cours.",
      );
    }

    const { data: course, error: courseError } = await this.supabaseService.client
      .from('courses')
      .select('id, title, description, short_description, price_fcfa, status')
      .eq('id', courseId)
      .eq('status', 'published')
      .maybeSingle();

    if (courseError || !course) {
      throw new BadRequestException(
        courseError?.message ?? "Le cours n'est pas disponible a l'inscription.",
      );
    }

    const { data: existingEnrollment, error: existingError } =
      await this.supabaseService.client
        .from('enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .maybeSingle();

    if (existingError) {
      throw new BadRequestException(
        existingError.message ?? "Impossible de verifier l'inscription existante.",
      );
    }

    if (!existingEnrollment) {
      const { error: enrollError } = await this.supabaseService.client
        .from('enrollments')
        .insert({
          user_id: user.id,
          course_id: courseId,
        });

      if (enrollError) {
        throw new BadRequestException(
          enrollError.message ?? "Impossible d'inscrire l'etudiant a ce cours.",
        );
      }
    }

    return {
      id: course.id,
      title: course.title ?? 'Cours sans titre',
      description:
        course.short_description ?? course.description ?? 'Cours Kalatty',
      progress: 0,
      nextLesson: 'Commencer la premiere lecon',
      enrolled: true,
    };
  }

  async updateLessonProgress(
    user: AuthUser,
    courseId: string,
    lessonId: string,
    payload: ProgressPayload,
  ) {
    const role = await this.resolveRole(user);
    const nextStatus = payload.status === 'completed' ? 'completed' : 'started';

    if (role !== 'student' && role !== 'teacher' && role !== 'admin') {
      throw new ForbiddenException(
        "Cette progression n'est accessible qu'aux comptes lies au cours.",
      );
    }

    const { data: lesson, error: lessonError } = await this.supabaseService.client
      .from('lessons')
      .select('id, course_id, is_preview')
      .eq('id', lessonId)
      .eq('course_id', courseId)
      .maybeSingle();

    if (lessonError || !lesson) {
      throw new BadRequestException(
        lessonError?.message ?? 'Lecon introuvable pour ce cours.',
      );
    }

    const { data: course, error: courseError } = await this.supabaseService.client
      .from('courses')
      .select('id, teacher_id, status')
      .eq('id', courseId)
      .maybeSingle();

    if (courseError || !course) {
      throw new BadRequestException(
        courseError?.message ?? 'Cours introuvable pour la progression.',
      );
    }

    const isTeacherOwner = role === 'teacher' && course.teacher_id === user.id;
    const isAdmin = role === 'admin';
    const isStudent = role === 'student';

    if (isStudent) {
      const enrolled = await this.isUserEnrolled(user.id, courseId);
      if (!enrolled && !lesson.is_preview) {
        throw new ForbiddenException(
          "Inscris-toi au cours pour enregistrer ta progression sur cette lecon.",
        );
      }
    } else if (!isTeacherOwner && !isAdmin) {
      throw new ForbiddenException(
        "Tu n'as pas acces a cette progression de lecon.",
      );
    }

    const { data: existingProgress, error: progressLookupError } =
      await this.supabaseService.client
        .from('progress')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
        .maybeSingle();

    if (progressLookupError) {
      throw new BadRequestException(
        progressLookupError.message ??
          'Impossible de verifier la progression existante.',
      );
    }

    if (existingProgress?.id) {
      const currentStatus = existingProgress.status ?? 'started';
      const finalStatus =
        currentStatus === 'completed' ? 'completed' : nextStatus;

      const { error: updateError } = await this.supabaseService.client
        .from('progress')
        .update({
          status: finalStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingProgress.id);

      if (updateError) {
        throw new BadRequestException(
          updateError.message ?? 'Impossible de mettre a jour la progression.',
        );
      }
    } else {
      const { error: insertError } = await this.supabaseService.client
        .from('progress')
        .insert({
          user_id: user.id,
          lesson_id: lessonId,
          status: nextStatus,
          updated_at: new Date().toISOString(),
        });

      if (insertError) {
        throw new BadRequestException(
          insertError.message ?? "Impossible d'enregistrer la progression.",
        );
      }
    }

    return {
      lessonId,
      courseId,
      status: existingProgress?.status === 'completed' ? 'completed' : nextStatus,
    };
  }

  private async isUserEnrolled(userId: string, courseId: string) {
    const { data, error } = await this.supabaseService.client
      .from('enrollments')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(
        error.message ?? "Impossible de verifier l'inscription au cours.",
      );
    }

    return Boolean(data?.id);
  }

  private async getLessonProgressMap(userId: string, lessonIds: string[]) {
    const { data, error } = await this.supabaseService.client
      .from('progress')
      .select('lesson_id, status, updated_at')
      .eq('user_id', userId)
      .in('lesson_id', lessonIds)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new BadRequestException(
        error.message ?? 'Impossible de charger la progression des lecons.',
      );
    }

    const progressMap = new Map<string, string>();

    for (const row of data ?? []) {
      if (!progressMap.has(row.lesson_id)) {
        progressMap.set(row.lesson_id, row.status ?? 'started');
      }
    }

    return progressMap;
  }

  private async getCourseReviews(courseId: string) {
    const { data, error } = await this.supabaseService.client
      .from('course_reviews')
      .select(
        `
          id,
          rating,
          comment,
          created_at,
          profiles:student_id (
            fullname
          )
        `,
      )
      .eq('course_id', courseId)
      .order('created_at', { ascending: false });

    if (error && !this.isMissingTableError(error)) {
      throw new BadRequestException(
        error.message ?? 'Impossible de charger les avis du cours.',
      );
    }

    return (data ?? []).map((review: any) => ({
      id: review.id,
      rating: Number(review.rating ?? 0),
      comment: review.comment ?? '',
      createdAt: review.created_at,
      authorName: review.profiles?.fullname ?? 'Etudiant Kalatty',
    }));
  }

  private async getTeacherReviews(teacherId: string, courseId: string) {
    const { data, error } = await this.supabaseService.client
      .from('teacher_reviews')
      .select(
        `
          id,
          rating,
          comment,
          created_at,
          profiles:student_id (
            fullname
          )
        `,
      )
      .eq('teacher_id', teacherId)
      .eq('course_id', courseId)
      .order('created_at', { ascending: false });

    if (error && !this.isMissingTableError(error)) {
      throw new BadRequestException(
        error.message ?? 'Impossible de charger les avis sur le professeur.',
      );
    }

    return (data ?? []).map((review: any) => ({
      id: review.id,
      rating: Number(review.rating ?? 0),
      comment: review.comment ?? '',
      createdAt: review.created_at,
      authorName: review.profiles?.fullname ?? 'Etudiant Kalatty',
    }));
  }

  private isMissingTableError(error: { message?: string } | null | undefined) {
    const message = String(error?.message ?? '').toLowerCase();
    return (
      message.includes("could not find the table") ||
      message.includes('schema cache') ||
      message.includes('course_reviews') ||
      message.includes('teacher_reviews')
    );
  }

  private getAverageRating(reviews: Array<{ rating: number }>) {
    if (reviews.length === 0) {
      return 0;
    }

    return Number(
      (
        reviews.reduce((sum, review) => sum + Number(review.rating ?? 0), 0) /
        reviews.length
      ).toFixed(1),
    );
  }

  private normalizeRating(value?: number) {
    const rating = Number(value ?? 0);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException('La note doit etre comprise entre 1 et 5.');
    }

    return rating;
  }

  private async assertStudentReviewer(user: AuthUser, courseId: string) {
    const role = await this.resolveRole(user);
    if (role !== 'student' && role !== 'admin') {
      throw new ForbiddenException(
        'Seuls les etudiants peuvent laisser un avis.',
      );
    }

    const { data: course, error: courseError } = await this.supabaseService.client
      .from('courses')
      .select('id, teacher_id, status')
      .eq('id', courseId)
      .maybeSingle();

    if (courseError || !course) {
      throw new BadRequestException(
        courseError?.message ?? 'Cours introuvable pour avis.',
      );
    }

    if (course.status !== 'published' && role !== 'admin') {
      throw new ForbiddenException("Ce cours n'accepte pas encore d'avis.");
    }

    if (role === 'student') {
      const enrolled = await this.isUserEnrolled(user.id, courseId);
      if (!enrolled) {
        throw new ForbiddenException(
          "Tu dois etre inscrit au cours avant de laisser un avis.",
        );
      }
    }

    return course;
  }

  async createCourse(user: AuthUser, payload: CreateCoursePayload) {
    await this.assertTeacher(user);

    const title =
      typeof payload.title === 'string' ? payload.title.trim() : '';
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
        status: 'published',
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
      status: course.status ?? 'published',
      createdAt: course.created_at,
      modulesCount: modules.length,
      lessonsCount: modules.reduce(
        (sum, module) => sum + (module.lessons?.filter((lesson) => lesson?.title?.trim()).length ?? 0),
        0,
      ),
      learners: 0,
    };
  }

  private async assertTeacher(user: AuthUser) {
    const role = await this.resolveRole(user);

    if (role !== 'teacher' && role !== 'admin') {
      throw new ForbiddenException(
        'Cette action est reservee aux enseignants.',
      );
    }
  }

  private async resolveRole(user: AuthUser) {
    if (user.role === 'teacher' || user.role === 'admin') {
      return user.role;
    }

    const { data, error } = await this.supabaseService.client
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(
        error.message ?? "Impossible de verifier le role de l'utilisateur.",
      );
    }

    return data?.role ?? user.role ?? null;
  }

  private sanitizeFilename(value: string) {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120);
  }

  private async resolveStorageUrl(bucket: string, path: string) {
    const normalizedPath = path.trim();

    if (!normalizedPath) {
      return '';
    }

    if (
      normalizedPath.startsWith('http://') ||
      normalizedPath.startsWith('https://')
    ) {
      return normalizedPath;
    }

    const { data, error } = await this.supabaseService.client.storage
      .from(bucket)
      .createSignedUrl(normalizedPath, 60 * 60 * 24 * 7);

    if (error || !data?.signedUrl) {
      return normalizedPath;
    }

    return data.signedUrl;
  }
}
