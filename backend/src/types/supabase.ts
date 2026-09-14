// Auto-generated from the Supabase PostgREST OpenAPI schema.
// Regenerate by re-running the introspection script rather than editing by hand.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      assignment_files: {
        Row: {
          id: string;
          assignment_id: string;
          room_id: string;
          name: string;
          file_path: string;
          file_type: string;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          assignment_id: string;
          room_id: string;
          name: string;
          file_path: string;
          file_type?: string;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          assignment_id?: string;
          room_id?: string;
          name?: string;
          file_path?: string;
          file_type?: string;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'assignment_files_assignment_id_fkey';
            columns: ['assignment_id'];
            referencedRelation: 'assignments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'assignment_files_room_id_fkey';
            columns: ['room_id'];
            referencedRelation: 'rooms';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'assignment_files_uploaded_by_fkey';
            columns: ['uploaded_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      assignment_submissions: {
        Row: {
          id: string;
          assignment_id: string;
          student_id: string;
          content: string | null;
          file_path: string | null;
          status: string;
          submitted_at: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          score: number | null;
          feedback: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          assignment_id: string;
          student_id: string;
          content?: string | null;
          file_path?: string | null;
          status?: string;
          submitted_at?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          score?: number | null;
          feedback?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          assignment_id?: string;
          student_id?: string;
          content?: string | null;
          file_path?: string | null;
          status?: string;
          submitted_at?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          score?: number | null;
          feedback?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'assignment_submissions_assignment_id_fkey';
            columns: ['assignment_id'];
            referencedRelation: 'assignments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'assignment_submissions_student_id_fkey';
            columns: ['student_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'assignment_submissions_reviewed_by_fkey';
            columns: ['reviewed_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      assignments: {
        Row: {
          id: string;
          room_id: string;
          course_id: string | null;
          lesson_id: string | null;
          created_by: string | null;
          title: string;
          instructions: string | null;
          due_at: string | null;
          max_score: number | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          course_id?: string | null;
          lesson_id?: string | null;
          created_by?: string | null;
          title: string;
          instructions?: string | null;
          due_at?: string | null;
          max_score?: number | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          course_id?: string | null;
          lesson_id?: string | null;
          created_by?: string | null;
          title?: string;
          instructions?: string | null;
          due_at?: string | null;
          max_score?: number | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'assignments_room_id_fkey';
            columns: ['room_id'];
            referencedRelation: 'rooms';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'assignments_course_id_fkey';
            columns: ['course_id'];
            referencedRelation: 'courses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'assignments_lesson_id_fkey';
            columns: ['lesson_id'];
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'assignments_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      course_assets: {
        Row: {
          id: string;
          course_id: string;
          module_id: string | null;
          lesson_id: string | null;
          name: string;
          file_path: string;
          file_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          module_id?: string | null;
          lesson_id?: string | null;
          name: string;
          file_path: string;
          file_type?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          module_id?: string | null;
          lesson_id?: string | null;
          name?: string;
          file_path?: string;
          file_type?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'course_assets_course_id_fkey';
            columns: ['course_id'];
            referencedRelation: 'courses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'course_assets_module_id_fkey';
            columns: ['module_id'];
            referencedRelation: 'course_modules';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'course_assets_lesson_id_fkey';
            columns: ['lesson_id'];
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
        ];
      };
      course_modules: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          description: string | null;
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          title: string;
          description?: string | null;
          order_index?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          title?: string;
          description?: string | null;
          order_index?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'course_modules_course_id_fkey';
            columns: ['course_id'];
            referencedRelation: 'courses';
            referencedColumns: ['id'];
          },
        ];
      };
      course_reviews: {
        Row: {
          id: string;
          course_id: string;
          student_id: string;
          rating: number;
          comment: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          student_id: string;
          rating: number;
          comment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          student_id?: string;
          rating?: number;
          comment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'course_reviews_course_id_fkey';
            columns: ['course_id'];
            referencedRelation: 'courses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'course_reviews_student_id_fkey';
            columns: ['student_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      courses: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          teacher_id: string | null;
          created_at: string | null;
          price_fcfa: number;
          thumbnail_url: string | null;
          status: string;
          short_description: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          teacher_id?: string | null;
          created_at?: string | null;
          price_fcfa?: number;
          thumbnail_url?: string | null;
          status?: string;
          short_description?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          teacher_id?: string | null;
          created_at?: string | null;
          price_fcfa?: number;
          thumbnail_url?: string | null;
          status?: string;
          short_description?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'courses_teacher_id_fkey';
            columns: ['teacher_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      enrollments: {
        Row: {
          id: string;
          user_id: string | null;
          course_id: string | null;
          enrolled_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          course_id?: string | null;
          enrolled_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          course_id?: string | null;
          enrolled_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'enrollments_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'enrollments_course_id_fkey';
            columns: ['course_id'];
            referencedRelation: 'courses';
            referencedColumns: ['id'];
          },
        ];
      };
      exercise_files: {
        Row: {
          id: string;
          exercise_id: string;
          name: string;
          file_path: string;
          file_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          exercise_id: string;
          name: string;
          file_path: string;
          file_type?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          exercise_id?: string;
          name?: string;
          file_path?: string;
          file_type?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'exercise_files_exercise_id_fkey';
            columns: ['exercise_id'];
            referencedRelation: 'exercises';
            referencedColumns: ['id'];
          },
        ];
      };
      exercises: {
        Row: {
          id: string;
          course_id: string;
          module_id: string | null;
          lesson_id: string | null;
          title: string;
          instructions: string | null;
          correction: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          module_id?: string | null;
          lesson_id?: string | null;
          title: string;
          instructions?: string | null;
          correction?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          module_id?: string | null;
          lesson_id?: string | null;
          title?: string;
          instructions?: string | null;
          correction?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'exercises_course_id_fkey';
            columns: ['course_id'];
            referencedRelation: 'courses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'exercises_module_id_fkey';
            columns: ['module_id'];
            referencedRelation: 'course_modules';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'exercises_lesson_id_fkey';
            columns: ['lesson_id'];
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
        ];
      };
      institution_courses: {
        Row: {
          id: string;
          institution_id: string;
          course_id: string;
          assigned_by: string | null;
          is_required: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          course_id: string;
          assigned_by?: string | null;
          is_required?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          course_id?: string;
          assigned_by?: string | null;
          is_required?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'institution_courses_institution_id_fkey';
            columns: ['institution_id'];
            referencedRelation: 'institutions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'institution_courses_course_id_fkey';
            columns: ['course_id'];
            referencedRelation: 'courses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'institution_courses_assigned_by_fkey';
            columns: ['assigned_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      institution_managed_users: {
        Row: {
          id: string;
          institution_id: string;
          user_id: string;
          login_email: string;
          full_name: string;
          managed_role: string;
          source: string;
          status: string;
          must_reset_password: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          user_id: string;
          login_email: string;
          full_name: string;
          managed_role: string;
          source?: string;
          status?: string;
          must_reset_password?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          user_id?: string;
          login_email?: string;
          full_name?: string;
          managed_role?: string;
          source?: string;
          status?: string;
          must_reset_password?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'institution_managed_users_institution_id_fkey';
            columns: ['institution_id'];
            referencedRelation: 'institutions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'institution_managed_users_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'institution_managed_users_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      institution_members: {
        Row: {
          id: string;
          institution_id: string;
          user_id: string;
          role: string;
          joined_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          user_id: string;
          role: string;
          joined_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          user_id?: string;
          role?: string;
          joined_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'institution_members_institution_id_fkey';
            columns: ['institution_id'];
            referencedRelation: 'institutions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'institution_members_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      institutions: {
        Row: {
          id: string;
          name: string;
          slug: string;
          owner_user_id: string;
          contact_email: string | null;
          institution_type: string | null;
          description: string | null;
          country: string | null;
          subscription_status: string;
          plan_name: string;
          max_students: number;
          max_rooms: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          owner_user_id: string;
          contact_email?: string | null;
          institution_type?: string | null;
          description?: string | null;
          country?: string | null;
          subscription_status?: string;
          plan_name?: string;
          max_students?: number;
          max_rooms?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          owner_user_id?: string;
          contact_email?: string | null;
          institution_type?: string | null;
          description?: string | null;
          country?: string | null;
          subscription_status?: string;
          plan_name?: string;
          max_students?: number;
          max_rooms?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'institutions_owner_user_id_fkey';
            columns: ['owner_user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      lessons: {
        Row: {
          id: string;
          course_id: string | null;
          title: string;
          content: string | null;
          video_url: string | null;
          order_index: number | null;
          created_at: string | null;
          module_id: string | null;
          lesson_type: string;
          video_path: string | null;
          duration_seconds: number | null;
          is_preview: boolean;
        };
        Insert: {
          id?: string;
          course_id?: string | null;
          title: string;
          content?: string | null;
          video_url?: string | null;
          order_index?: number | null;
          created_at?: string | null;
          module_id?: string | null;
          lesson_type?: string;
          video_path?: string | null;
          duration_seconds?: number | null;
          is_preview?: boolean;
        };
        Update: {
          id?: string;
          course_id?: string | null;
          title?: string;
          content?: string | null;
          video_url?: string | null;
          order_index?: number | null;
          created_at?: string | null;
          module_id?: string | null;
          lesson_type?: string;
          video_path?: string | null;
          duration_seconds?: number | null;
          is_preview?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'lessons_course_id_fkey';
            columns: ['course_id'];
            referencedRelation: 'courses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lessons_module_id_fkey';
            columns: ['module_id'];
            referencedRelation: 'course_modules';
            referencedColumns: ['id'];
          },
        ];
      };
      payments: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          teacher_id: string;
          amount_fcfa: number;
          platform_fee_fcfa: number;
          teacher_earning_fcfa: number;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          teacher_id: string;
          amount_fcfa: number;
          platform_fee_fcfa?: number;
          teacher_earning_fcfa?: number;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string;
          teacher_id?: string;
          amount_fcfa?: number;
          platform_fee_fcfa?: number;
          teacher_earning_fcfa?: number;
          status?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'payments_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payments_course_id_fkey';
            columns: ['course_id'];
            referencedRelation: 'courses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payments_teacher_id_fkey';
            columns: ['teacher_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          email: string | null;
          fullname: string;
          role: string;
          country: string | null;
          level: string | null;
          created_at: string;
          updated_at: string;
          bio: string | null;
          school_name: string | null;
          expertise: string | null;
          // Pending: run database/2026-07-28_profile_avatars.sql on this project.
          avatar_url: string | null;
        };
        Insert: {
          id: string;
          email?: string | null;
          fullname: string;
          role?: string;
          country?: string | null;
          level?: string | null;
          created_at?: string;
          updated_at?: string;
          bio?: string | null;
          school_name?: string | null;
          expertise?: string | null;
          avatar_url?: string | null;
        };
        Update: {
          id?: string;
          email?: string | null;
          fullname?: string;
          role?: string;
          country?: string | null;
          level?: string | null;
          created_at?: string;
          updated_at?: string;
          bio?: string | null;
          school_name?: string | null;
          expertise?: string | null;
          avatar_url?: string | null;
        };
        Relationships: [];
      };
      // Pending: run database/2026-09-14_add_notifications.sql on this project
      // (table does not exist live yet).
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          href: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type?: string;
          title: string;
          message: string;
          href?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          message?: string;
          href?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      progress: {
        Row: {
          id: string;
          user_id: string | null;
          lesson_id: string | null;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          lesson_id?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          lesson_id?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'progress_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'progress_lesson_id_fkey';
            columns: ['lesson_id'];
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
        ];
      };
      room_attendance_records: {
        Row: {
          id: string;
          session_id: string;
          room_id: string;
          student_id: string;
          status: string;
          note: string | null;
          marked_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          room_id: string;
          student_id: string;
          status?: string;
          note?: string | null;
          marked_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          room_id?: string;
          student_id?: string;
          status?: string;
          note?: string | null;
          marked_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'room_attendance_records_session_id_fkey';
            columns: ['session_id'];
            referencedRelation: 'room_attendance_sessions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'room_attendance_records_room_id_fkey';
            columns: ['room_id'];
            referencedRelation: 'rooms';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'room_attendance_records_student_id_fkey';
            columns: ['student_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'room_attendance_records_marked_by_fkey';
            columns: ['marked_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      room_attendance_sessions: {
        Row: {
          id: string;
          room_id: string;
          institution_id: string;
          title: string;
          session_date: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          institution_id: string;
          title: string;
          session_date: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          institution_id?: string;
          title?: string;
          session_date?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'room_attendance_sessions_room_id_fkey';
            columns: ['room_id'];
            referencedRelation: 'rooms';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'room_attendance_sessions_institution_id_fkey';
            columns: ['institution_id'];
            referencedRelation: 'institutions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'room_attendance_sessions_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      room_courses: {
        Row: {
          id: string;
          room_id: string;
          course_id: string;
          assigned_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          course_id: string;
          assigned_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          course_id?: string;
          assigned_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'room_courses_room_id_fkey';
            columns: ['room_id'];
            referencedRelation: 'rooms';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'room_courses_course_id_fkey';
            columns: ['course_id'];
            referencedRelation: 'courses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'room_courses_assigned_by_fkey';
            columns: ['assigned_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      room_invites: {
        Row: {
          id: string;
          institution_id: string;
          room_id: string;
          token: string;
          invite_role: string;
          created_by: string | null;
          expires_at: string | null;
          max_uses: number;
          used_count: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          room_id: string;
          token: string;
          invite_role: string;
          created_by?: string | null;
          expires_at?: string | null;
          max_uses?: number;
          used_count?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          room_id?: string;
          token?: string;
          invite_role?: string;
          created_by?: string | null;
          expires_at?: string | null;
          max_uses?: number;
          used_count?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'room_invites_institution_id_fkey';
            columns: ['institution_id'];
            referencedRelation: 'institutions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'room_invites_room_id_fkey';
            columns: ['room_id'];
            referencedRelation: 'rooms';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'room_invites_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      room_member_controls: {
        Row: {
          id: string;
          room_id: string;
          user_id: string;
          status: string;
          reason: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          user_id: string;
          status?: string;
          reason?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          user_id?: string;
          status?: string;
          reason?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'room_member_controls_room_id_fkey';
            columns: ['room_id'];
            referencedRelation: 'rooms';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'room_member_controls_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'room_member_controls_updated_by_fkey';
            columns: ['updated_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      room_members: {
        Row: {
          id: string;
          room_id: string;
          user_id: string;
          role: string;
          joined_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          user_id: string;
          role: string;
          joined_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          user_id?: string;
          role?: string;
          joined_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'room_members_room_id_fkey';
            columns: ['room_id'];
            referencedRelation: 'rooms';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'room_members_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      room_schedule_items: {
        Row: {
          id: string;
          room_id: string;
          institution_id: string;
          title: string;
          weekday: number;
          starts_at: string;
          ends_at: string | null;
          location: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          institution_id: string;
          title: string;
          weekday: number;
          starts_at: string;
          ends_at?: string | null;
          location?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          institution_id?: string;
          title?: string;
          weekday?: number;
          starts_at?: string;
          ends_at?: string | null;
          location?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'room_schedule_items_room_id_fkey';
            columns: ['room_id'];
            referencedRelation: 'rooms';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'room_schedule_items_institution_id_fkey';
            columns: ['institution_id'];
            referencedRelation: 'institutions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'room_schedule_items_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      rooms: {
        Row: {
          id: string;
          institution_id: string;
          name: string;
          slug: string | null;
          description: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          name: string;
          slug?: string | null;
          description?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          name?: string;
          slug?: string | null;
          description?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'rooms_institution_id_fkey';
            columns: ['institution_id'];
            referencedRelation: 'institutions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'rooms_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      teacher_reviews: {
        Row: {
          id: string;
          teacher_id: string;
          student_id: string;
          course_id: string | null;
          rating: number;
          comment: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          teacher_id: string;
          student_id: string;
          course_id?: string | null;
          rating: number;
          comment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          teacher_id?: string;
          student_id?: string;
          course_id?: string | null;
          rating?: number;
          comment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'teacher_reviews_teacher_id_fkey';
            columns: ['teacher_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'teacher_reviews_student_id_fkey';
            columns: ['student_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'teacher_reviews_course_id_fkey';
            columns: ['course_id'];
            referencedRelation: 'courses';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type AssignmentFilesRow =
  Database['public']['Tables']['assignment_files']['Row'];
export type AssignmentFilesInsert =
  Database['public']['Tables']['assignment_files']['Insert'];
export type AssignmentFilesUpdate =
  Database['public']['Tables']['assignment_files']['Update'];
export type AssignmentSubmissionsRow =
  Database['public']['Tables']['assignment_submissions']['Row'];
export type AssignmentSubmissionsInsert =
  Database['public']['Tables']['assignment_submissions']['Insert'];
export type AssignmentSubmissionsUpdate =
  Database['public']['Tables']['assignment_submissions']['Update'];
export type AssignmentsRow = Database['public']['Tables']['assignments']['Row'];
export type AssignmentsInsert =
  Database['public']['Tables']['assignments']['Insert'];
export type AssignmentsUpdate =
  Database['public']['Tables']['assignments']['Update'];
export type CourseAssetsRow =
  Database['public']['Tables']['course_assets']['Row'];
export type CourseAssetsInsert =
  Database['public']['Tables']['course_assets']['Insert'];
export type CourseAssetsUpdate =
  Database['public']['Tables']['course_assets']['Update'];
export type CourseModulesRow =
  Database['public']['Tables']['course_modules']['Row'];
export type CourseModulesInsert =
  Database['public']['Tables']['course_modules']['Insert'];
export type CourseModulesUpdate =
  Database['public']['Tables']['course_modules']['Update'];
export type CourseReviewsRow =
  Database['public']['Tables']['course_reviews']['Row'];
export type CourseReviewsInsert =
  Database['public']['Tables']['course_reviews']['Insert'];
export type CourseReviewsUpdate =
  Database['public']['Tables']['course_reviews']['Update'];
export type CoursesRow = Database['public']['Tables']['courses']['Row'];
export type CoursesInsert = Database['public']['Tables']['courses']['Insert'];
export type CoursesUpdate = Database['public']['Tables']['courses']['Update'];
export type EnrollmentsRow = Database['public']['Tables']['enrollments']['Row'];
export type EnrollmentsInsert =
  Database['public']['Tables']['enrollments']['Insert'];
export type EnrollmentsUpdate =
  Database['public']['Tables']['enrollments']['Update'];
export type ExerciseFilesRow =
  Database['public']['Tables']['exercise_files']['Row'];
export type ExerciseFilesInsert =
  Database['public']['Tables']['exercise_files']['Insert'];
export type ExerciseFilesUpdate =
  Database['public']['Tables']['exercise_files']['Update'];
export type ExercisesRow = Database['public']['Tables']['exercises']['Row'];
export type ExercisesInsert =
  Database['public']['Tables']['exercises']['Insert'];
export type ExercisesUpdate =
  Database['public']['Tables']['exercises']['Update'];
export type InstitutionCoursesRow =
  Database['public']['Tables']['institution_courses']['Row'];
export type InstitutionCoursesInsert =
  Database['public']['Tables']['institution_courses']['Insert'];
export type InstitutionCoursesUpdate =
  Database['public']['Tables']['institution_courses']['Update'];
export type InstitutionManagedUsersRow =
  Database['public']['Tables']['institution_managed_users']['Row'];
export type InstitutionManagedUsersInsert =
  Database['public']['Tables']['institution_managed_users']['Insert'];
export type InstitutionManagedUsersUpdate =
  Database['public']['Tables']['institution_managed_users']['Update'];
export type InstitutionMembersRow =
  Database['public']['Tables']['institution_members']['Row'];
export type InstitutionMembersInsert =
  Database['public']['Tables']['institution_members']['Insert'];
export type InstitutionMembersUpdate =
  Database['public']['Tables']['institution_members']['Update'];
export type InstitutionsRow =
  Database['public']['Tables']['institutions']['Row'];
export type InstitutionsInsert =
  Database['public']['Tables']['institutions']['Insert'];
export type InstitutionsUpdate =
  Database['public']['Tables']['institutions']['Update'];
export type LessonsRow = Database['public']['Tables']['lessons']['Row'];
export type LessonsInsert = Database['public']['Tables']['lessons']['Insert'];
export type LessonsUpdate = Database['public']['Tables']['lessons']['Update'];
export type PaymentsRow = Database['public']['Tables']['payments']['Row'];
export type PaymentsInsert = Database['public']['Tables']['payments']['Insert'];
export type PaymentsUpdate = Database['public']['Tables']['payments']['Update'];
export type ProfilesRow = Database['public']['Tables']['profiles']['Row'];
export type ProfilesInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfilesUpdate = Database['public']['Tables']['profiles']['Update'];
export type ProgressRow = Database['public']['Tables']['progress']['Row'];
export type ProgressInsert = Database['public']['Tables']['progress']['Insert'];
export type ProgressUpdate = Database['public']['Tables']['progress']['Update'];
export type RoomAttendanceRecordsRow =
  Database['public']['Tables']['room_attendance_records']['Row'];
export type RoomAttendanceRecordsInsert =
  Database['public']['Tables']['room_attendance_records']['Insert'];
export type RoomAttendanceRecordsUpdate =
  Database['public']['Tables']['room_attendance_records']['Update'];
export type RoomAttendanceSessionsRow =
  Database['public']['Tables']['room_attendance_sessions']['Row'];
export type RoomAttendanceSessionsInsert =
  Database['public']['Tables']['room_attendance_sessions']['Insert'];
export type RoomAttendanceSessionsUpdate =
  Database['public']['Tables']['room_attendance_sessions']['Update'];
export type RoomCoursesRow =
  Database['public']['Tables']['room_courses']['Row'];
export type RoomCoursesInsert =
  Database['public']['Tables']['room_courses']['Insert'];
export type RoomCoursesUpdate =
  Database['public']['Tables']['room_courses']['Update'];
export type RoomInvitesRow =
  Database['public']['Tables']['room_invites']['Row'];
export type RoomInvitesInsert =
  Database['public']['Tables']['room_invites']['Insert'];
export type RoomInvitesUpdate =
  Database['public']['Tables']['room_invites']['Update'];
export type RoomMemberControlsRow =
  Database['public']['Tables']['room_member_controls']['Row'];
export type RoomMemberControlsInsert =
  Database['public']['Tables']['room_member_controls']['Insert'];
export type RoomMemberControlsUpdate =
  Database['public']['Tables']['room_member_controls']['Update'];
export type RoomMembersRow =
  Database['public']['Tables']['room_members']['Row'];
export type RoomMembersInsert =
  Database['public']['Tables']['room_members']['Insert'];
export type RoomMembersUpdate =
  Database['public']['Tables']['room_members']['Update'];
export type RoomScheduleItemsRow =
  Database['public']['Tables']['room_schedule_items']['Row'];
export type RoomScheduleItemsInsert =
  Database['public']['Tables']['room_schedule_items']['Insert'];
export type RoomScheduleItemsUpdate =
  Database['public']['Tables']['room_schedule_items']['Update'];
export type RoomsRow = Database['public']['Tables']['rooms']['Row'];
export type RoomsInsert = Database['public']['Tables']['rooms']['Insert'];
export type RoomsUpdate = Database['public']['Tables']['rooms']['Update'];
export type TeacherReviewsRow =
  Database['public']['Tables']['teacher_reviews']['Row'];
export type TeacherReviewsInsert =
  Database['public']['Tables']['teacher_reviews']['Insert'];
export type TeacherReviewsUpdate =
  Database['public']['Tables']['teacher_reviews']['Update'];
