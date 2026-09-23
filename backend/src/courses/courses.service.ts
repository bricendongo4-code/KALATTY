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
  id?: string;
  title: string;
  content?: string;
  video_path?: string;
  duration_seconds?: number;
  is_preview?: boolean;
};

type ModulePayload = {
  id?: string;
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
  status?: 'draft' | 'published' | 'archived';
  objectives?: string;
  prerequisites?: string;
  level?: string;
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
  positionSeconds?: number;
  progressPct?: number;
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
  lastPositionSeconds: number;
  progressPct: number;
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

  // Set once we know whether database/2026-09-15_add_course_pedagogical_fields.sql
  // has been applied. Cached for the process lifetime; restart after running
  // the migration to pick up the change.
  private pedagogicalFieldsAvailable: boolean | null = null;

  private async supportsPedagogicalFields(): Promise<boolean> {
    if (this.pedagogicalFieldsAvailable !== null) {
      return this.pedagogicalFieldsAvailable;
    }

    const { error } = await this.supabaseService.client
      .from('courses')
      .select('objectives')
      .limit(1);

    this.pedagogicalFieldsAvailable = !this.isMissingColumnError(error);
    return this.pedagogicalFieldsAvailable;
  }

  private pedagogicalSelectFragment(available: boolean): string {
    return available ? 'objectives, prerequisites, level,' : '';
  }

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
      throw new BadRequestException('La miniature doit etre une image valide.');
    }

    if (category === 'video' && !file.mimetype.startsWith('video/')) {
      throw new BadRequestException(
        'La ressource envoyee doit etre une video.',
      );
    }

    const bucket =
      category === 'thumbnail' ? 'course-thumbnails' : 'course-videos';
    const safeName = this.sanitizeFilename(
      file.originalname || `${category}.bin`,
    );
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
      .neq('status', 'archived')
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

  async getTeacherQuestions(user: AuthUser) {
    await this.assertTeacher(user);
    const { data: courses, error: courseError } =
      await this.supabaseService.client
        .from('courses')
        .select('id, title')
        .eq('teacher_id', user.id);
    if (courseError) throw new BadRequestException(courseError.message);

    const courseIds = (courses ?? []).map((course) => course.id);
    if (!courseIds.length) return { questions: [] };
    const titleById = new Map(
      (courses ?? []).map((course) => [course.id, course.title]),
    );
    const { data, error } = await this.supabaseService.client
      .from('course_questions')
      .select(
        'id, course_id, lesson_id, author_id, body, status, answer, created_at, answered_at',
      )
      .in('course_id', courseIds)
      .order('created_at', { ascending: false });
    if (error) {
      throw new BadRequestException(
        error.message ?? 'Impossible de charger les questions.',
      );
    }

    const authorIds = Array.from(
      new Set((data ?? []).map((question) => question.author_id)),
    );
    const lessonIds = Array.from(
      new Set(
        (data ?? [])
          .map((question) => question.lesson_id)
          .filter((id): id is string => Boolean(id)),
      ),
    );
    const [profilesResult, lessonsResult] = await Promise.all([
      authorIds.length
        ? this.supabaseService.client
            .from('profiles')
            .select('id, fullname')
            .in('id', authorIds)
        : Promise.resolve({ data: [], error: null }),
      lessonIds.length
        ? this.supabaseService.client
            .from('lessons')
            .select('id, title')
            .in('id', lessonIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    const secondaryError = profilesResult.error ?? lessonsResult.error;
    if (secondaryError) throw new BadRequestException(secondaryError.message);
    const authorById = new Map(
      (profilesResult.data ?? []).map((profile) => [
        profile.id,
        profile.fullname,
      ]),
    );
    const lessonById = new Map(
      (lessonsResult.data ?? []).map((lesson) => [lesson.id, lesson.title]),
    );

    return {
      questions: (data ?? []).map((question) => ({
        id: question.id,
        courseId: question.course_id,
        courseTitle: titleById.get(question.course_id) ?? 'Formation',
        lessonTitle: question.lesson_id
          ? lessonById.get(question.lesson_id) ?? 'Lecon'
          : 'Formation',
        authorName:
          authorById.get(question.author_id) ?? 'Apprenant Kalatty',
        body: question.body,
        status: question.status,
        answer: question.answer ?? '',
        createdAt: question.created_at,
        answeredAt: question.answered_at,
      })),
    };
  }

  async getLearnerCertificates(user: AuthUser) {
    const role = await this.resolveRole(user);
    if (role !== 'student') {
      throw new ForbiddenException(
        'Les certificats sont reserves aux apprenants.',
      );
    }
    const { data, error } = await this.supabaseService.client
      .from('certificates')
      .select('id, course_id, verification_code, issued_at, revoked_at')
      .eq('user_id', user.id)
      .is('revoked_at', null)
      .order('issued_at', { ascending: false });
    if (error) {
      throw new BadRequestException(
        error.message ?? 'Impossible de charger les certificats.',
      );
    }
    const courseIds = (data ?? []).map((certificate) => certificate.course_id);
    const { data: courses, error: courseError } = courseIds.length
      ? await this.supabaseService.client
          .from('courses')
          .select('id, title, teacher_id')
          .in('id', courseIds)
      : { data: [], error: null };
    if (courseError) throw new BadRequestException(courseError.message);
    const courseById = new Map<string, { id: string; title: string }>(
      (courses ?? []).map((course) => [course.id, course] as const),
    );
    return {
      certificates: (data ?? []).map((certificate) => ({
        id: certificate.id,
        courseId: certificate.course_id,
        courseTitle:
          courseById.get(certificate.course_id)?.title ?? 'Formation Kalatty',
        verificationCode: certificate.verification_code,
        issuedAt: certificate.issued_at,
      })),
    };
  }

  async answerTeacherQuestion(
    user: AuthUser,
    questionId: string,
    answer: string,
  ) {
    await this.assertTeacher(user);
    const normalizedAnswer = answer.trim();
    if (normalizedAnswer.length < 2) {
      throw new BadRequestException('La reponse est trop courte.');
    }

    const { data: question, error: questionError } =
      await this.supabaseService.client
        .from('course_questions')
        .select('id, course_id, author_id')
        .eq('id', questionId)
        .maybeSingle();
    if (questionError || !question) {
      throw new BadRequestException(
        questionError?.message ?? 'Question introuvable.',
      );
    }
    await this.assertTeacherCourseAccess(user, question.course_id);
    const now = new Date().toISOString();
    const { error } = await this.supabaseService.client
      .from('course_questions')
      .update({
        answer: normalizedAnswer,
        status: 'answered',
        answered_by: user.id,
        answered_at: now,
        updated_at: now,
      })
      .eq('id', questionId);
    if (error) throw new BadRequestException(error.message);

    await this.supabaseService.client.from('notifications').insert({
      user_id: question.author_id,
      type: 'course_question_answered',
      title: 'Votre formateur vous a repondu',
      message: normalizedAnswer.slice(0, 180),
      href: `/learn/courses/${question.course_id}`,
    });
    return { id: questionId, status: 'answered', answer: normalizedAnswer };
  }

  async getTeacherCourseForEdit(user: AuthUser, courseId: string) {
    const course = await this.assertTeacherCourseAccess(user, courseId);

    return {
      id: course.id,
      title: course.title ?? '',
      description: course.description ?? '',
      short_description: course.short_description ?? '',
      price_fcfa: Number(course.price_fcfa ?? 0),
      thumbnail_path: course.thumbnail_url ?? '',
      status: course.status ?? 'published',
      objectives: course.objectives ?? '',
      prerequisites: course.prerequisites ?? '',
      level: course.level ?? '',
      learners_count: (course.enrollments ?? []).length,
      modules: (course.course_modules ?? [])
        .slice()
        .sort(
          (a: any, b: any) =>
            Number(a.order_index ?? 0) - Number(b.order_index ?? 0),
        )
        .map((module: any) => ({
          id: module.id,
          title: module.title ?? '',
          description: module.description ?? '',
          lessons: (module.lessons ?? [])
            .slice()
            .sort(
              (a: any, b: any) =>
                Number(a.order_index ?? 0) - Number(b.order_index ?? 0),
            )
            .map((lesson: any) => ({
              id: lesson.id,
              title: lesson.title ?? '',
              content: lesson.content ?? '',
              video_path: lesson.video_path ?? '',
              duration_seconds:
                lesson.duration_seconds !== null &&
                lesson.duration_seconds !== undefined
                  ? Number(lesson.duration_seconds)
                  : null,
              is_preview: Boolean(lesson.is_preview),
            })),
          exercises: (module.exercises ?? []).map((exercise: any) => ({
            id: exercise.id,
            title: exercise.title ?? '',
            instructions: exercise.instructions ?? '',
            correction: exercise.correction ?? '',
          })),
        })),
    };
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

    const { data: teacherReviews, error: teacherReviewsError } =
      teacherIds.length
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
    const pedagogicalFields = this.pedagogicalSelectFragment(
      await this.supportsPedagogicalFields(),
    );

    const { data: course, error } = await this.supabaseService.client
      .from('courses')
      .select<string, any>(
        `
          id,
          title,
          description,
          short_description,
          price_fcfa,
          thumbnail_url,
          teacher_id,
          status,
          ${pedagogicalFields}
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

    const studentAccess =
      role === 'student'
        ? await this.getStudentCourseAccess(user.id, courseId)
        : { hasAccess: false, institutionAccess: false };

    if (
      course.status !== 'published' &&
      role !== 'admin' &&
      !(role === 'teacher' && course.teacher_id === user.id) &&
      !(role === 'student' && studentAccess.hasAccess)
    ) {
      throw new ForbiddenException("Ce cours n'est pas accessible.");
    }

    const lessonIds = (course.course_modules ?? []).flatMap((module: any) =>
      (module.lessons ?? []).map((lesson: any) => lesson.id),
    );
    const progressMap =
      role === 'student' && lessonIds.length > 0
        ? await this.getLessonProgressMap(user.id, lessonIds)
        : new Map<
            string,
            { status: string; positionSeconds: number; progressPct: number }
          >();

    const modules = await Promise.all(
      (course.course_modules ?? [])
        .slice()
        .sort(
          (a: any, b: any) =>
            Number(a.order_index ?? 0) - Number(b.order_index ?? 0),
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
                async (lesson: any): Promise<SignedLesson> => {
                  const progress = progressMap.get(lesson.id);
                  return {
                    id: lesson.id,
                    title: lesson.title ?? 'Lecon',
                    content: lesson.content ?? '',
                    videoPath: await this.resolveStorageUrl(
                      'course-videos',
                      lesson.video_path ?? '',
                    ),
                    durationSeconds: Number(lesson.duration_seconds ?? 0),
                    isPreview: Boolean(lesson.is_preview),
                    progressStatus: progress?.status ?? 'not_started',
                    lastPositionSeconds: progress?.positionSeconds ?? 0,
                    progressPct: progress?.progressPct ?? 0,
                  };
                },
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
      (sum: number, module: { lessons: Array<unknown> }) =>
        sum + module.lessons.length,
      0,
    );
    const completedLessons = Array.from(progressMap.values()).filter(
      (progress) => progress.status === 'completed',
    ).length;
    const startedLessons = Array.from(progressMap.values()).filter(
      (progress) =>
        progress.status === 'started' || progress.status === 'completed',
    ).length;

    const courseReviews = await this.getCourseReviews(course.id);
    const teacherReviews = course.teacher_id
      ? await this.getTeacherReviews(course.teacher_id, course.id)
      : [];

    return {
      id: course.id,
      title: course.title ?? 'Cours sans titre',
      description: course.description ?? '',
      shortDescription: course.short_description ?? '',
      objectives: course.objectives ?? '',
      prerequisites: course.prerequisites ?? '',
      level: course.level ?? '',
      priceFcfa: Number(course.price_fcfa ?? 0),
      thumbnailUrl: await this.resolveStorageUrl(
        'course-thumbnails',
        course.thumbnail_url ?? '',
      ),
      teacherName:
        (course.profiles as { fullname?: string; expertise?: string } | null)
          ?.fullname ?? 'Formateur Kalatty',
      teacherExpertise:
        (course.profiles as { fullname?: string; expertise?: string } | null)
          ?.expertise ?? '',
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
        totalLessons > 0
          ? Math.round((startedLessons / totalLessons) * 100)
          : 0,
      enrolled: role === 'student' ? studentAccess.hasAccess : false,
      ownerPreview:
        role === 'admin' || (role === 'teacher' && course.teacher_id === user.id),
      institutionAccess:
        role === 'student' ? studentAccess.institutionAccess : false,
      accessSource:
        role === 'student' && studentAccess.institutionAccess
          ? 'institution'
          : role === 'student' && studentAccess.hasAccess
            ? 'enrollment'
            : null,
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
    if (!course.teacher_id) {
      throw new BadRequestException(
        "Ce cours n'a pas encore de professeur assigne.",
      );
    }
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

    const { data: course, error: courseError } =
      await this.supabaseService.client
        .from('courses')
        .select('id, title, description, short_description, price_fcfa, status')
        .eq('id', courseId)
        .eq('status', 'published')
        .maybeSingle();

    if (courseError || !course) {
      throw new BadRequestException(
        courseError?.message ??
          "Le cours n'est pas disponible a l'inscription.",
      );
    }

    const studentAccess = await this.getStudentCourseAccess(user.id, courseId);
    if (studentAccess.institutionAccess) {
      return {
        id: course.id,
        title: course.title ?? 'Cours sans titre',
        description:
          course.short_description ?? course.description ?? 'Cours Kalatty',
        progress: 0,
        nextLesson: 'Commencer la premiere lecon',
        enrolled: true,
        institutionAccess: true,
        accessSource: 'institution',
        message: "Acces inclus par l'etablissement.",
      };
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
        existingError.message ??
          "Impossible de verifier l'inscription existante.",
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
    const positionSeconds = Math.max(
      0,
      Math.round(Number(payload.positionSeconds ?? 0)),
    );
    const progressPct = Math.min(
      100,
      Math.max(0, Number(payload.progressPct ?? 0)),
    );

    if (role !== 'student' && role !== 'teacher' && role !== 'admin') {
      throw new ForbiddenException(
        "Cette progression n'est accessible qu'aux comptes lies au cours.",
      );
    }

    const { data: lesson, error: lessonError } =
      await this.supabaseService.client
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

    const { data: course, error: courseError } =
      await this.supabaseService.client
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
      const studentAccess = await this.getStudentCourseAccess(
        user.id,
        courseId,
      );
      if (!studentAccess.hasAccess && !lesson.is_preview) {
        throw new ForbiddenException(
          'Inscris-toi au cours ou rejoins une classe autorisee pour enregistrer ta progression.',
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
        .select('id, status, position_seconds, progress_pct')
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
          position_seconds:
            finalStatus === 'completed' ? 0 : positionSeconds,
          progress_pct: finalStatus === 'completed' ? 100 : progressPct,
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
          position_seconds: nextStatus === 'completed' ? 0 : positionSeconds,
          progress_pct: nextStatus === 'completed' ? 100 : progressPct,
          updated_at: new Date().toISOString(),
        });

      if (insertError) {
        throw new BadRequestException(
          insertError.message ?? "Impossible d'enregistrer la progression.",
        );
      }
    }

    if (nextStatus === 'completed' && isStudent) {
      await this.maybeIssueCertificate(user.id, courseId);
    }

    return {
      lessonId,
      courseId,
      status:
        existingProgress?.status === 'completed' ? 'completed' : nextStatus,
      positionSeconds: nextStatus === 'completed' ? 0 : positionSeconds,
      progressPct: nextStatus === 'completed' ? 100 : progressPct,
    };
  }

  async getLessonEngagement(
    user: AuthUser,
    courseId: string,
    lessonId: string,
  ) {
    await this.assertLearnerLessonAccess(user, courseId, lessonId);

    const [noteResult, questionsResult, favoriteResult] = await Promise.all([
      this.supabaseService.client
        .from('lesson_notes')
        .select('id, content, updated_at')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
        .maybeSingle(),
      this.supabaseService.client
        .from('course_questions')
        .select('id, body, status, answer, created_at, answered_at')
        .eq('author_id', user.id)
        .eq('course_id', courseId)
        .eq('lesson_id', lessonId)
        .order('created_at', { ascending: false }),
      this.supabaseService.client
        .from('course_favorites')
        .select('course_id')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .maybeSingle(),
    ]);

    const error =
      noteResult.error ?? questionsResult.error ?? favoriteResult.error;
    if (error) {
      throw new BadRequestException(
        error.message ?? "Impossible de charger l'espace de travail.",
      );
    }

    return {
      note: noteResult.data?.content ?? '',
      noteUpdatedAt: noteResult.data?.updated_at ?? null,
      favorite: Boolean(favoriteResult.data?.course_id),
      questions: (questionsResult.data ?? []).map((question) => ({
        id: question.id,
        body: question.body,
        status: question.status,
        answer: question.answer ?? '',
        createdAt: question.created_at,
        answeredAt: question.answered_at,
      })),
    };
  }

  async saveLessonNote(
    user: AuthUser,
    courseId: string,
    lessonId: string,
    content: string,
  ) {
    await this.assertLearnerLessonAccess(user, courseId, lessonId);
    const normalizedContent = content.trim().slice(0, 10000);
    const { data, error } = await this.supabaseService.client
      .from('lesson_notes')
      .upsert(
        {
          user_id: user.id,
          lesson_id: lessonId,
          content: normalizedContent,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,lesson_id' },
      )
      .select('content, updated_at')
      .single();

    if (error) {
      throw new BadRequestException(
        error.message ?? "Impossible d'enregistrer la note.",
      );
    }
    return { note: data.content, updatedAt: data.updated_at };
  }

  async createLessonQuestion(
    user: AuthUser,
    courseId: string,
    lessonId: string,
    body: string,
  ) {
    await this.assertLearnerLessonAccess(user, courseId, lessonId);
    const normalizedBody = body.trim();
    if (normalizedBody.length < 3) {
      throw new BadRequestException('La question est trop courte.');
    }

    const { data, error } = await this.supabaseService.client
      .from('course_questions')
      .insert({
        course_id: courseId,
        lesson_id: lessonId,
        author_id: user.id,
        body: normalizedBody,
      })
      .select('id, body, status, created_at')
      .single();

    if (error) {
      throw new BadRequestException(
        error.message ?? "Impossible d'envoyer la question.",
      );
    }
    return {
      id: data.id,
      body: data.body,
      status: data.status,
      createdAt: data.created_at,
    };
  }

  async toggleFavorite(user: AuthUser, courseId: string) {
    const role = await this.resolveRole(user);
    if (role !== 'student') {
      throw new ForbiddenException(
        'Les favoris sont reserves aux apprenants.',
      );
    }

    const { data: course, error: courseError } =
      await this.supabaseService.client
        .from('courses')
        .select('id')
        .eq('id', courseId)
        .eq('status', 'published')
        .maybeSingle();
    if (courseError || !course) {
      throw new BadRequestException(
        courseError?.message ?? 'Formation introuvable.',
      );
    }

    const { data: existing, error: lookupError } =
      await this.supabaseService.client
        .from('course_favorites')
        .select('course_id')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .maybeSingle();
    if (lookupError) throw new BadRequestException(lookupError.message);

    if (existing) {
      const { error } = await this.supabaseService.client
        .from('course_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('course_id', courseId);
      if (error) throw new BadRequestException(error.message);
      return { favorite: false };
    }

    const { error } = await this.supabaseService.client
      .from('course_favorites')
      .insert({ user_id: user.id, course_id: courseId });
    if (error) throw new BadRequestException(error.message);
    return { favorite: true };
  }

  private async assertLearnerLessonAccess(
    user: AuthUser,
    courseId: string,
    lessonId: string,
  ) {
    const role = await this.resolveRole(user);
    if (role !== 'student') {
      throw new ForbiddenException(
        'Cette action est reservee aux apprenants.',
      );
    }

    const { data: lesson, error } = await this.supabaseService.client
      .from('lessons')
      .select('id, course_id, is_preview')
      .eq('id', lessonId)
      .eq('course_id', courseId)
      .maybeSingle();
    if (error || !lesson) {
      throw new BadRequestException(error?.message ?? 'Lecon introuvable.');
    }

    const access = await this.getStudentCourseAccess(user.id, courseId);
    if (!access.hasAccess && !lesson.is_preview) {
      throw new ForbiddenException(
        "Cette lecon n'est pas accessible avec ce compte.",
      );
    }
  }

  private async maybeIssueCertificate(userId: string, courseId: string) {
    const [lessonsResult, completedResult] = await Promise.all([
      this.supabaseService.client
        .from('lessons')
        .select('id')
        .eq('course_id', courseId),
      this.supabaseService.client
        .from('progress')
        .select('lesson_id')
        .eq('user_id', userId)
        .eq('status', 'completed'),
    ]);
    const error = lessonsResult.error ?? completedResult.error;
    if (error) throw new BadRequestException(error.message);
    const lessonIds = new Set((lessonsResult.data ?? []).map((item) => item.id));
    const completedIds = new Set(
      (completedResult.data ?? [])
        .map((item) => item.lesson_id)
        .filter((id): id is string => Boolean(id)),
    );
    if (!lessonIds.size || !Array.from(lessonIds).every((id) => completedIds.has(id))) return;

    const { error: certificateError } = await this.supabaseService.client
      .from('certificates')
      .upsert({ user_id: userId, course_id: courseId }, { onConflict: 'user_id,course_id' });
    if (certificateError && !this.isMissingTableError(certificateError)) {
      throw new BadRequestException(certificateError.message);
    }
  }

  private async getStudentCourseAccess(userId: string, courseId: string) {
    const [enrollmentResult, membershipsResult] = await Promise.all([
      this.supabaseService.client
        .from('enrollments')
        .select('id')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .maybeSingle(),
      this.supabaseService.client
        .from('room_members')
        .select('room_id')
        .eq('user_id', userId)
        .eq('role', 'student'),
    ]);

    if (enrollmentResult.error) {
      throw new BadRequestException(
        enrollmentResult.error.message ??
          "Impossible de verifier l'inscription au cours.",
      );
    }

    if (membershipsResult.error) {
      throw new BadRequestException(
        membershipsResult.error.message ??
          "Impossible de verifier l'acces de la classe.",
      );
    }

    if (enrollmentResult.data?.id) {
      return { hasAccess: true, institutionAccess: false };
    }

    const roomIds = (membershipsResult.data ?? [])
      .map((membership: any) => String(membership.room_id ?? ''))
      .filter(Boolean);

    if (roomIds.length === 0) {
      return { hasAccess: false, institutionAccess: false };
    }

    const { data: assignedCourse, error: assignedCourseError } =
      await this.supabaseService.client
        .from('room_courses')
        .select('id')
        .eq('course_id', courseId)
        .in('room_id', roomIds)
        .limit(1)
        .maybeSingle();

    if (assignedCourseError) {
      throw new BadRequestException(
        assignedCourseError.message ??
          "Impossible de verifier l'affectation du cours a la classe.",
      );
    }

    const institutionAccess = Boolean(assignedCourse?.id);
    return { hasAccess: institutionAccess, institutionAccess };
  }

  private async getLessonProgressMap(userId: string, lessonIds: string[]) {
    const { data, error } = await this.supabaseService.client
      .from('progress')
      .select(
        'lesson_id, status, position_seconds, progress_pct, updated_at',
      )
      .eq('user_id', userId)
      .in('lesson_id', lessonIds)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new BadRequestException(
        error.message ?? 'Impossible de charger la progression des lecons.',
      );
    }

    const progressMap = new Map<
      string,
      { status: string; positionSeconds: number; progressPct: number }
    >();

    for (const row of data ?? []) {
      if (row.lesson_id && !progressMap.has(row.lesson_id)) {
        progressMap.set(row.lesson_id, {
          status: row.status ?? 'started',
          positionSeconds: Number(row.position_seconds ?? 0),
          progressPct: Number(row.progress_pct ?? 0),
        });
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
      message.includes('could not find the table') ||
      message.includes('schema cache') ||
      message.includes('course_reviews') ||
      message.includes('teacher_reviews')
    );
  }

  private isMissingColumnError(
    error: { message?: string; code?: string } | null | undefined,
  ) {
    // Postgres raises 42703 (undefined_column) for a SELECT referencing a
    // missing column; PostgREST raises PGRST204 with a "could not find the
    // ... column ... in the schema cache" message for INSERT/UPDATE. Both
    // mean the same thing here: the migration-gated column isn't present.
    if (error?.code === '42703' || error?.code === 'PGRST204') {
      return true;
    }
    const message = String(error?.message ?? '').toLowerCase();
    return (
      (message.includes('could not find the') && message.includes('column')) ||
      (message.includes('column') && message.includes('does not exist'))
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

    const { data: course, error: courseError } =
      await this.supabaseService.client
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
      const studentAccess = await this.getStudentCourseAccess(
        user.id,
        courseId,
      );
      if (!studentAccess.hasAccess) {
        throw new ForbiddenException(
          'Tu dois etre inscrit au cours ou y avoir acces via ta classe avant de laisser un avis.',
        );
      }
    }

    return course;
  }

  async createCourse(user: AuthUser, payload: CreateCoursePayload) {
    await this.assertTeacher(user);

    const title = typeof payload.title === 'string' ? payload.title.trim() : '';
    const description = payload.description?.trim() || null;
    const shortDescription = payload.short_description?.trim() || null;
    const thumbnailPath =
      payload.thumbnail_path?.trim() || this.getDefaultCourseThumbnailUrl();
    const priceFcfa = Number(payload.price_fcfa ?? 0);
    const status = this.normalizeCourseStatus(payload.status, 'draft');
    const objectives = payload.objectives?.trim() || null;
    const prerequisites = payload.prerequisites?.trim() || null;
    const level = payload.level?.trim() || null;
    const modules = (payload.modules ?? []).filter((module) =>
      module?.title?.trim(),
    );

    if (!title) {
      throw new BadRequestException('Le titre du cours est obligatoire.');
    }

    if (Number.isNaN(priceFcfa) || priceFcfa < 0) {
      throw new BadRequestException('Le prix du cours est invalide.');
    }

    if (status === 'published') {
      this.assertPublishReady(shortDescription, description, modules);
    }

    const hasPedagogicalFields = await this.supportsPedagogicalFields();
    const pedagogicalPayload = hasPedagogicalFields
      ? { objectives, prerequisites, level }
      : {};
    const pedagogicalSelect: string = hasPedagogicalFields
      ? ', objectives, prerequisites, level'
      : '';

    const { data: course, error: courseError } =
      await this.supabaseService.client
        .from('courses')
        .insert({
          title,
          description,
          short_description: shortDescription,
          price_fcfa: priceFcfa,
          thumbnail_url: thumbnailPath,
          teacher_id: user.id,
          status,
          ...pedagogicalPayload,
        })
        .select<string, any>(
          `id, title, description, short_description, price_fcfa, thumbnail_url, status, created_at${pedagogicalSelect}`,
        )
        .single();

    if (courseError || !course) {
      throw new BadRequestException(
        courseError?.message ??
          'Impossible de creer le cours. Verifie les policies Supabase et la structure SQL.',
      );
    }

    await this.upsertCourseContent(course.id, modules, { allowUpdates: false });

    return {
      id: course.id,
      title: course.title,
      description: course.description ?? '',
      shortDescription: course.short_description ?? '',
      priceFcfa: Number(course.price_fcfa ?? 0),
      thumbnailPath: course.thumbnail_url ?? '',
      status: course.status ?? 'published',
      objectives: course.objectives ?? '',
      prerequisites: course.prerequisites ?? '',
      level: course.level ?? '',
      createdAt: course.created_at,
      modulesCount: modules.length,
      lessonsCount: modules.reduce(
        (sum, module) =>
          sum +
          (module.lessons?.filter((lesson) => lesson?.title?.trim()).length ??
            0),
        0,
      ),
      learners: 0,
    };
  }

  async updateCourse(
    user: AuthUser,
    courseId: string,
    payload: CreateCoursePayload,
  ) {
    const course = await this.assertTeacherCourseAccess(user, courseId);

    const title = typeof payload.title === 'string' ? payload.title.trim() : '';
    const description = payload.description?.trim() || null;
    const shortDescription = payload.short_description?.trim() || null;
    const thumbnailPath =
      payload.thumbnail_path?.trim() ||
      String(course.thumbnail_url ?? '').trim() ||
      this.getDefaultCourseThumbnailUrl();
    const priceFcfa = Number(payload.price_fcfa ?? 0);
    const status = this.normalizeCourseStatus(payload.status, course.status);
    const objectives = payload.objectives?.trim() || null;
    const prerequisites = payload.prerequisites?.trim() || null;
    const level = payload.level?.trim() || null;
    const publicationUpdate =
      status === 'published' && course.status !== 'published'
        ? { created_at: new Date().toISOString() }
        : {};
    const modules = (payload.modules ?? []).filter((module) =>
      module?.title?.trim(),
    );

    if (!title) {
      throw new BadRequestException('Le titre du cours est obligatoire.');
    }

    if (Number.isNaN(priceFcfa) || priceFcfa < 0) {
      throw new BadRequestException('Le prix du cours est invalide.');
    }

    if (status === 'published') {
      this.assertPublishReady(shortDescription, description, modules);
    }

    const hasPedagogicalFields = await this.supportsPedagogicalFields();
    const pedagogicalPayload = hasPedagogicalFields
      ? { objectives, prerequisites, level }
      : {};
    const pedagogicalSelect: string = hasPedagogicalFields
      ? ', objectives, prerequisites, level'
      : '';

    const { data: updatedCourse, error: updateError } =
      await this.supabaseService.client
        .from('courses')
        .update({
          title,
          description,
          short_description: shortDescription,
          price_fcfa: priceFcfa,
          thumbnail_url: thumbnailPath,
          status,
          ...pedagogicalPayload,
          ...publicationUpdate,
        })
        .eq('id', course.id)
        .select<string, any>(
          `id, title, description, short_description, price_fcfa, thumbnail_url, status, created_at${pedagogicalSelect}`,
        )
        .single();

    if (updateError || !updatedCourse) {
      throw new BadRequestException(
        updateError?.message ?? 'Impossible de mettre a jour ce cours.',
      );
    }

    await this.upsertCourseContent(course.id, modules, { allowUpdates: true });

    return {
      id: updatedCourse.id,
      title: updatedCourse.title,
      description: updatedCourse.description ?? '',
      shortDescription: updatedCourse.short_description ?? '',
      priceFcfa: Number(updatedCourse.price_fcfa ?? 0),
      thumbnailPath: updatedCourse.thumbnail_url ?? '',
      status: updatedCourse.status ?? 'published',
      objectives: updatedCourse.objectives ?? '',
      prerequisites: updatedCourse.prerequisites ?? '',
      level: updatedCourse.level ?? '',
      createdAt: updatedCourse.created_at,
      modulesCount: modules.length,
      lessonsCount: modules.reduce(
        (sum, module) =>
          sum +
          (module.lessons?.filter((lesson) => lesson?.title?.trim()).length ??
            0),
        0,
      ),
      learners: 0,
      message:
        'Cours mis a jour. Les modules et lecons retires ont ete synchronises.',
    };
  }

  async deleteCourse(user: AuthUser, courseId: string) {
    const course = await this.assertTeacherCourseAccess(user, courseId);

    const [lessonsResult, exercisesResult, assetsResult, paymentsResult] =
      await Promise.all([
        this.supabaseService.client
          .from('lessons')
          .select('id, video_path')
          .eq('course_id', course.id),
        this.supabaseService.client
          .from('exercises')
          .select('id')
          .eq('course_id', course.id),
        this.supabaseService.client
          .from('course_assets')
          .select('file_path')
          .eq('course_id', course.id),
        this.supabaseService.client
          .from('payments')
          .select('id, status')
          .eq('course_id', course.id),
      ]);

    this.assertCourseDeletionQuery(lessonsResult.error, 'les lecons');
    this.assertCourseDeletionQuery(exercisesResult.error, 'les exercices');
    this.assertCourseDeletionQuery(assetsResult.error, 'les ressources');
    this.assertCourseDeletionQuery(paymentsResult.error, 'les paiements');

    const protectedPayments = (paymentsResult.data ?? []).filter((payment) =>
      ['paid', 'refunded'].includes(String(payment.status ?? '')),
    );
    if (protectedPayments.length > 0) {
      const { error: archiveError } = await this.supabaseService.client
        .from('courses')
        .update({ status: 'archived' })
        .eq('id', course.id);
      this.assertCourseDeletionQuery(archiveError, 'le retrait du cours');

      return {
        id: course.id,
        status: 'archived',
        deletionMode: 'financial-archive',
        message:
          'Cours retire du catalogue et de ton espace. Les apprenants deja inscrits conservent leur acces.',
      };
    }

    const lessonIds = (lessonsResult.data ?? [])
      .map((lesson) => String(lesson.id ?? ''))
      .filter(Boolean);
    const exerciseIds = (exercisesResult.data ?? [])
      .map((exercise) => String(exercise.id ?? ''))
      .filter(Boolean);
    const exerciseFilesResult = exerciseIds.length
      ? await this.supabaseService.client
          .from('exercise_files')
          .select('file_path')
          .in('exercise_id', exerciseIds)
      : { data: [], error: null };

    this.assertCourseDeletionQuery(
      exerciseFilesResult.error,
      "les fichiers d'exercices",
    );

    const assignmentsUpdate = await this.supabaseService.client
      .from('assignments')
      .update({ course_id: null, lesson_id: null })
      .eq('course_id', course.id);
    this.assertCourseDeletionQuery(assignmentsUpdate.error, 'les devoirs');

    const teacherReviewsUpdate = await this.supabaseService.client
      .from('teacher_reviews')
      .update({ course_id: null })
      .eq('course_id', course.id);
    if (
      teacherReviewsUpdate.error &&
      !this.isMissingTableError(teacherReviewsUpdate.error)
    ) {
      this.assertCourseDeletionQuery(
        teacherReviewsUpdate.error,
        'les avis formateur',
      );
    }

    if (lessonIds.length > 0) {
      const progressDelete = await this.supabaseService.client
        .from('progress')
        .delete()
        .in('lesson_id', lessonIds);
      this.assertCourseDeletionQuery(progressDelete.error, 'la progression');
    }

    if (exerciseIds.length > 0) {
      const exerciseFilesDelete = await this.supabaseService.client
        .from('exercise_files')
        .delete()
        .in('exercise_id', exerciseIds);
      this.assertCourseDeletionQuery(
        exerciseFilesDelete.error,
        "les fichiers d'exercices",
      );
    }

    const contentDeleteResults = await Promise.all([
      this.supabaseService.client
        .from('exercises')
        .delete()
        .eq('course_id', course.id),
      this.supabaseService.client
        .from('course_assets')
        .delete()
        .eq('course_id', course.id),
    ]);
    contentDeleteResults.forEach((result) =>
      this.assertCourseDeletionQuery(result.error, 'le contenu du cours'),
    );

    const lessonsDelete = await this.supabaseService.client
      .from('lessons')
      .delete()
      .eq('course_id', course.id);
    this.assertCourseDeletionQuery(lessonsDelete.error, 'les lecons');

    const modulesDelete = await this.supabaseService.client
      .from('course_modules')
      .delete()
      .eq('course_id', course.id);
    this.assertCourseDeletionQuery(modulesDelete.error, 'les modules');

    const associationDeleteResults = await Promise.all([
      this.supabaseService.client
        .from('enrollments')
        .delete()
        .eq('course_id', course.id),
      this.supabaseService.client
        .from('room_courses')
        .delete()
        .eq('course_id', course.id),
      this.supabaseService.client
        .from('institution_courses')
        .delete()
        .eq('course_id', course.id),
      this.supabaseService.client
        .from('course_reviews')
        .delete()
        .eq('course_id', course.id),
      this.supabaseService.client
        .from('payments')
        .delete()
        .eq('course_id', course.id),
    ]);
    associationDeleteResults.forEach((result) =>
      this.assertCourseDeletionQuery(result.error, 'les associations du cours'),
    );

    const { error: courseDeleteError } = await this.supabaseService.client
      .from('courses')
      .delete()
      .eq('id', course.id);
    this.assertCourseDeletionQuery(courseDeleteError, 'le cours');

    const thumbnailPath = String(course.thumbnail_url ?? '').trim();
    const videoPaths = (lessonsResult.data ?? [])
      .map((lesson) => String(lesson.video_path ?? '').trim())
      .filter(Boolean);
    const filePaths = [
      ...(assetsResult.data ?? []).map((asset) =>
        String(asset.file_path ?? '').trim(),
      ),
      ...(exerciseFilesResult.data ?? []).map((file) =>
        String(file.file_path ?? '').trim(),
      ),
    ].filter(Boolean);

    await Promise.all([
      this.removeStorageFiles(
        'course-thumbnails',
        thumbnailPath && !thumbnailPath.startsWith('http')
          ? [thumbnailPath]
          : [],
      ),
      this.removeStorageFiles('course-videos', videoPaths),
      this.removeStorageFiles('course-files', filePaths),
    ]);

    return {
      id: course.id,
      status: 'deleted',
      message: 'Cours supprime definitivement.',
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

  private normalizeCourseStatus(
    value: CreateCoursePayload['status'],
    fallback: string,
  ): 'draft' | 'published' | 'archived' {
    if (value === 'draft' || value === 'published' || value === 'archived') {
      return value;
    }

    if (
      fallback === 'draft' ||
      fallback === 'published' ||
      fallback === 'archived'
    ) {
      return fallback;
    }

    return 'draft';
  }

  private assertPublishReady(
    shortDescription: string | null,
    description: string | null,
    modules: ModulePayload[],
  ) {
    const hasVideoLesson = modules.some((module) =>
      (module.lessons ?? []).some((lesson) => lesson.video_path?.trim()),
    );

    if (!shortDescription || !description || !hasVideoLesson) {
      throw new BadRequestException(
        'Ce cours doit avoir une description courte, une description complete et au moins une lecon avec une video avant publication.',
      );
    }
  }

  private async assertTeacherCourseAccess(user: AuthUser, courseId: string) {
    const role = await this.resolveRole(user);

    if (role !== 'teacher' && role !== 'admin') {
      throw new ForbiddenException(
        'Cette action est reservee aux enseignants.',
      );
    }

    const pedagogicalFields = this.pedagogicalSelectFragment(
      await this.supportsPedagogicalFields(),
    );

    const { data, error } = await this.supabaseService.client
      .from('courses')
      .select<string, any>(
        `
          id,
          teacher_id,
          title,
          description,
          short_description,
          price_fcfa,
          thumbnail_url,
          status,
          ${pedagogicalFields}
          enrollments ( id ),
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
              correction
            )
          )
        `,
      )
      .eq('id', courseId)
      .maybeSingle();

    if (error || !data) {
      throw new BadRequestException(error?.message ?? 'Cours introuvable.');
    }

    if (role !== 'admin' && data.teacher_id !== user.id) {
      throw new ForbiddenException(
        'Tu ne peux modifier que tes propres cours.',
      );
    }

    return data;
  }

  private async upsertCourseContent(
    courseId: string,
    modules: ModulePayload[],
    options: { allowUpdates: boolean },
  ) {
    const existingCourse = options.allowUpdates
      ? await this.assertTeacherCourseAccess(
          { id: '', role: 'admin' },
          courseId,
        )
      : null;

    const existingModulesById = new Map<string, any>(
      (existingCourse?.course_modules ?? []).map((module: any) => [
        module.id,
        module,
      ]),
    );
    const existingLessonsById = new Map<string, any>();
    const keptModuleIds = new Set<string>();
    const keptLessonIds = new Set<string>();

    for (const module of existingCourse?.course_modules ?? []) {
      for (const lesson of module.lessons ?? []) {
        existingLessonsById.set(lesson.id, {
          ...lesson,
          module_id: module.id,
        });
      }
    }

    for (let moduleIndex = 0; moduleIndex < modules.length; moduleIndex += 1) {
      const modulePayload = modules[moduleIndex];
      let moduleId = modulePayload.id?.trim() || '';

      if (
        options.allowUpdates &&
        moduleId &&
        existingModulesById.has(moduleId)
      ) {
        const { error: moduleUpdateError } = await this.supabaseService.client
          .from('course_modules')
          .update({
            title: modulePayload.title.trim(),
            description: modulePayload.description?.trim() || null,
            order_index: moduleIndex,
          })
          .eq('id', moduleId)
          .eq('course_id', courseId);

        if (moduleUpdateError) {
          throw new BadRequestException(
            moduleUpdateError.message ??
              `Impossible de mettre a jour le module ${modulePayload.title}.`,
          );
        }
      } else {
        const { data: moduleRow, error: moduleError } =
          await this.supabaseService.client
            .from('course_modules')
            .insert({
              course_id: courseId,
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

        moduleId = moduleRow.id;
      }

      if (moduleId) {
        keptModuleIds.add(moduleId);
      }

      const lessons = (modulePayload.lessons ?? []).filter((lesson) =>
        lesson?.title?.trim(),
      );

      for (
        let lessonIndex = 0;
        lessonIndex < lessons.length;
        lessonIndex += 1
      ) {
        const lesson = lessons[lessonIndex];
        const lessonId = lesson.id?.trim() || '';

        if (
          options.allowUpdates &&
          lessonId &&
          existingLessonsById.has(lessonId)
        ) {
          const { error: lessonUpdateError } = await this.supabaseService.client
            .from('lessons')
            .update({
              module_id: moduleId,
              title: lesson.title.trim(),
              content: lesson.content?.trim() || null,
              order_index: lessonIndex,
              lesson_type: 'video',
              video_path: lesson.video_path?.trim() || null,
              duration_seconds: lesson.duration_seconds ?? null,
              is_preview: lesson.is_preview ?? false,
            })
            .eq('id', lessonId)
            .eq('course_id', courseId);

          if (lessonUpdateError) {
            throw new BadRequestException(
              lessonUpdateError.message ??
                `Impossible de mettre a jour la lecon ${lesson.title}.`,
            );
          }

          keptLessonIds.add(lessonId);
        } else {
          const { data: lessonRow, error: lessonError } =
            await this.supabaseService.client
              .from('lessons')
              .insert({
                course_id: courseId,
                module_id: moduleId,
                title: lesson.title.trim(),
                content: lesson.content?.trim() || null,
                order_index: lessonIndex,
                lesson_type: 'video',
                video_path: lesson.video_path?.trim() || null,
                duration_seconds: lesson.duration_seconds ?? null,
                is_preview: lesson.is_preview ?? false,
              })
              .select('id')
              .single();

          if (lessonError || !lessonRow) {
            throw new BadRequestException(
              lessonError?.message ??
                `Impossible d'ajouter la lecon ${lesson.title}.`,
            );
          }

          keptLessonIds.add(lessonRow.id);
        }
      }

      if (options.allowUpdates && moduleId) {
        const { error: exerciseDeleteError } = await this.supabaseService.client
          .from('exercises')
          .delete()
          .eq('course_id', courseId)
          .eq('module_id', moduleId);

        if (exerciseDeleteError) {
          throw new BadRequestException(
            exerciseDeleteError.message ??
              'Impossible de mettre a jour les exercices de ce module.',
          );
        }
      }

      const exercises = (modulePayload.exercises ?? []).filter((exercise) =>
        exercise?.title?.trim(),
      );

      for (const exercise of exercises) {
        const { error: exerciseError } = await this.supabaseService.client
          .from('exercises')
          .insert({
            course_id: courseId,
            module_id: moduleId,
            title: exercise.title.trim(),
            instructions: exercise.instructions?.trim() || null,
            correction: exercise.correction?.trim() || null,
          });

        if (exerciseError) {
          throw new BadRequestException(
            exerciseError.message ??
              `Impossible d'enregistrer l'exercice ${exercise.title}.`,
          );
        }
      }
    }

    if (options.allowUpdates && existingCourse) {
      await this.removeDeletedCourseContent(
        courseId,
        existingCourse.course_modules ?? [],
        keptModuleIds,
        keptLessonIds,
      );
    }
  }

  private async removeDeletedCourseContent(
    courseId: string,
    existingModules: any[],
    keptModuleIds: Set<string>,
    keptLessonIds: Set<string>,
  ) {
    const existingModuleIds = existingModules
      .map((module) => String(module.id ?? ''))
      .filter(Boolean);
    const existingLessonIds = existingModules.flatMap((module) =>
      (module.lessons ?? [])
        .map((lesson: any) => String(lesson.id ?? ''))
        .filter(Boolean),
    );
    const removedLessonIds = existingLessonIds.filter(
      (lessonId) => !keptLessonIds.has(lessonId),
    );
    const removedModuleIds = existingModuleIds.filter(
      (moduleId) => !keptModuleIds.has(moduleId),
    );

    if (removedLessonIds.length > 0) {
      await this.supabaseService.client
        .from('assignments')
        .update({ lesson_id: null })
        .eq('course_id', courseId)
        .in('lesson_id', removedLessonIds);

      await this.supabaseService.client
        .from('course_assets')
        .update({ lesson_id: null })
        .eq('course_id', courseId)
        .in('lesson_id', removedLessonIds);

      const exerciseIds = await this.getExerciseIdsForLessons(removedLessonIds);
      if (exerciseIds.length > 0) {
        await this.supabaseService.client
          .from('exercise_files')
          .delete()
          .in('exercise_id', exerciseIds);
        await this.supabaseService.client
          .from('exercises')
          .delete()
          .in('id', exerciseIds);
      }

      await this.supabaseService.client
        .from('progress')
        .delete()
        .in('lesson_id', removedLessonIds);

      const { error } = await this.supabaseService.client
        .from('lessons')
        .delete()
        .eq('course_id', courseId)
        .in('id', removedLessonIds);

      if (error) {
        throw new BadRequestException(
          error.message ?? 'Impossible de supprimer les lecons retirees.',
        );
      }
    }

    if (removedModuleIds.length > 0) {
      await this.supabaseService.client
        .from('course_assets')
        .update({ module_id: null })
        .eq('course_id', courseId)
        .in('module_id', removedModuleIds);

      await this.supabaseService.client
        .from('exercises')
        .update({ module_id: null })
        .eq('course_id', courseId)
        .in('module_id', removedModuleIds);

      const { error } = await this.supabaseService.client
        .from('course_modules')
        .delete()
        .eq('course_id', courseId)
        .in('id', removedModuleIds);

      if (error) {
        throw new BadRequestException(
          error.message ?? 'Impossible de supprimer les modules retires.',
        );
      }
    }
  }

  private async getExerciseIdsForLessons(lessonIds: string[]) {
    if (lessonIds.length === 0) {
      return [];
    }

    const { data } = await this.supabaseService.client
      .from('exercises')
      .select('id')
      .in('lesson_id', lessonIds);

    return (data ?? []).map((exercise: any) => exercise.id).filter(Boolean);
  }

  private assertCourseDeletionQuery(
    error: { message?: string } | null | undefined,
    resource: string,
  ) {
    if (!error) {
      return;
    }

    throw new BadRequestException(
      error.message ?? `Impossible de supprimer ${resource}.`,
    );
  }

  private async removeStorageFiles(bucket: string, paths: string[]) {
    const uniquePaths = Array.from(
      new Set(paths.map((path) => path.trim()).filter(Boolean)),
    );
    if (uniquePaths.length === 0) {
      return;
    }

    await this.supabaseService.client.storage.from(bucket).remove(uniquePaths);
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

  private getDefaultCourseThumbnailUrl() {
    const frontendUrl = (
      process.env.FRONTEND_URL ?? 'https://kalatty-frontend.vercel.app'
    ).replace(/\/+$/, '');

    return `${frontendUrl}/kalatty-logo.png`;
  }
}
