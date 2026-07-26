"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useEffectEvent, useState } from "react";
import InstitutionWorkspace, { InstitutionView } from "./InstitutionWorkspace";
import MobileDashboardMenu, { MobileMenuItem } from "./MobileDashboardMenu";
import PasswordSettings from "./PasswordSettings";
import TeacherCourseBuilder from "./TeacherCourseBuilder";
import styles from "./dashboard.module.css";

type DashboardRole = "student" | "teacher" | "institution";
type WorkspaceKind =
  | "public-student"
  | "public-teacher"
  | "institution-admin"
  | "institution-teacher"
  | "institution-student";
type StudentView = "home" | "progress" | "institutions" | "profile";
type TeacherView = "overview" | "courses" | "classes" | "studio" | "profile";
type StoredUser = {
  email?: string;
  fullname?: string;
  role?: string;
  level?: string | null;
  school_name?: string | null;
  expertise?: string | null;
  bio?: string | null;
};
type DashboardResponse = {
  role: DashboardRole;
  workspace?: {
    kind: WorkspaceKind;
    institutionId?: string | null;
    institutionName?: string | null;
    institutionRole?: string | null;
    managed?: boolean;
  };
  profile: StoredUser;
  stats: Record<string, number>;
  courses: Array<Record<string, unknown>>;
  catalogCourses?: Array<Record<string, unknown>>;
  campusCourses?: Array<Record<string, unknown>>;
  campusSchedule?: Array<Record<string, unknown>>;
  teacherRooms?: Array<Record<string, unknown>>;
  studentInstitutions?: Array<Record<string, unknown>>;
  studentRooms?: Array<Record<string, unknown>>;
  institutions?: Array<Record<string, unknown>>;
  tasks: string[];
};

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  href?: string;
  createdAt: string;
  read: boolean;
  rating?: number;
  authorName?: string;
  courseTitle?: string;
};

type TeacherRoomDetail = {
  id: string;
  name: string;
  slug?: string | null;
  description?: string | null;
  assignments: Array<{
    id: string;
    title: string;
    instructions?: string | null;
    status: string;
    due_at?: string | null;
    submissionCount?: number;
    pendingCount?: number;
    reviewedCount?: number;
  }>;
  recentSubmissions?: Array<{
    id: string;
    status: string;
    submittedAt?: string | null;
    score?: number | null;
    assignmentTitle: string;
    studentName: string;
  }>;
  submissionSummary?: {
    total: number;
    reviewed: number;
    pending: number;
  };
};

type DiscoveryCourse = {
  id: string;
  title: string;
  description: string;
  progress: number;
  badge: string;
  category: string;
  priceFcfa?: number;
  teacherName?: string;
  enrolled?: boolean;
  ratingAverage?: number;
  lessonsCount?: number;
  thumbnailUrl?: string;
  campusOnly?: boolean;
  roomNames?: string[];
};

const studentTimeline = [
  { day: "Lun", topic: "Revision math", time: "19h00" },
  { day: "Mer", topic: "Quiz anglais", time: "18h30" },
  { day: "Sam", topic: "Serie bureautique", time: "09h00" },
];
const teacherInsights = [
  {
    title: "Matiere la plus suivie",
    value: "Maths",
    note: "Forte demande sur les classes d'examen.",
  },
  {
    title: "Format prefere",
    value: "Courtes videos",
    note: "Les capsules de 8 a 12 min retiennent mieux l'attention.",
  },
];
const fallbackDiscovery = [
  {
    id: "1",
    title: "Maths Terminale C",
    description: "Annales, videos et exercices corriges.",
    progress: 0,
    badge: "Populaire",
    category: "Examen",
  },
  {
    id: "2",
    title: "Anglais pratique",
    description: "Grammaire, oral et quiz rapides.",
    progress: 0,
    badge: "Nouveau",
    category: "Langues",
  },
  {
    id: "3",
    title: "Bureautique efficace",
    description: "Word, Excel et presentations.",
    progress: 0,
    badge: "Essentiel",
    category: "Competences",
  },
];
const includesSearch = (values: unknown[], query: string) =>
  values
    .map((value) => String(value ?? ""))
    .join(" ")
    .toLowerCase()
    .includes(query);
const studentViews: StudentView[] = [
  "home",
  "progress",
  "institutions",
  "profile",
];
const teacherViews: TeacherView[] = [
  "overview",
  "courses",
  "classes",
  "studio",
  "profile",
];
const emptyRecords: Array<Record<string, unknown>> = [];
const READ_NOTIFICATIONS_KEY_PREFIX = "kalatty_read_notifications";

const getStoredReadNotifications = (storageKey: string) => {
  if (typeof window === "undefined") return new Set<string>();

  try {
    const raw = localStorage.getItem(storageKey);
    const ids = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(ids.filter(Boolean));
  } catch {
    return new Set<string>();
  }
};

const persistReadNotifications = (storageKey: string, ids: Set<string>) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey, JSON.stringify(Array.from(ids).slice(-200)));
};

export default function DashboardPage() {
  const router = useRouter();
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
  const storageBaseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://njoucnnjlrwbbhnktaho.supabase.co"}/storage/v1/object/public`;
  const getCourseThumbnailUrl = (path: unknown) => {
    const value = String(path ?? "").trim();
    if (!value) return "";
    if (value.startsWith("http://") || value.startsWith("https://")) {
      return value;
    }

    const encodedPath = value
      .split("/")
      .filter(Boolean)
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    return `${storageBaseUrl}/course-thumbnails/${encodedPath}`;
  };
  const [user] = useState<StoredUser | null>(() => {
    if (typeof window === "undefined") return null;
    const rawUser = localStorage.getItem("kalatty_user");
    if (!rawUser) return null;
    try {
      return JSON.parse(rawUser) as StoredUser;
    } catch {
      return null;
    }
  });
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [studentView, setStudentView] = useState<StudentView>("home");
  const [teacherView, setTeacherView] = useState<TeacherView>("overview");
  const [institutionView, setInstitutionView] =
    useState<InstitutionView>("overview");
  const [studentSearch, setStudentSearch] = useState("");
  const [teacherSearch, setTeacherSearch] = useState("");
  const [institutionSearch, setInstitutionSearch] = useState("");
  const [catalogMessage, setCatalogMessage] = useState("");
  const [enrollingCourseId, setEnrollingCourseId] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [selectedTeacherRoomId, setSelectedTeacherRoomId] = useState("");
  const [teacherRoomDetail, setTeacherRoomDetail] =
    useState<TeacherRoomDetail | null>(null);
  const [teacherAssignmentTitle, setTeacherAssignmentTitle] = useState("");
  const [teacherAssignmentInstructions, setTeacherAssignmentInstructions] =
    useState("");
  const [teacherActionMessage, setTeacherActionMessage] = useState("");
  const [editingTeacherCourseId, setEditingTeacherCourseId] = useState("");
  const [reviewForm, setReviewForm] = useState({
    submissionId: "",
    score: "",
    feedback: "",
    status: "reviewed",
  });
  const [profileForm, setProfileForm] = useState({
    fullname: "",
    level: "",
    school_name: "",
    expertise: "",
    bio: "",
  });
  const [notifications, setNotifications] = useState<Array<NotificationItem>>(
    [],
  );
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const updateDashboardUrl = (view: StudentView | TeacherView) => {
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("view", view);
    window.history.pushState({}, "", `${nextUrl.pathname}${nextUrl.search}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const changeStudentView = (view: StudentView) => {
    setStudentView(view);
    updateDashboardUrl(view);
  };

  const changeTeacherView = (view: TeacherView) => {
    setTeacherView(view);
    updateDashboardUrl(view);
  };

  const changeInstitutionView = (view: InstitutionView) => {
    setInstitutionView(view);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const syncViewFromUrl = () => {
      const requestedView = new URLSearchParams(window.location.search).get(
        "view",
      );
      if (studentViews.includes(requestedView as StudentView)) {
        setStudentView(requestedView as StudentView);
      }
      if (teacherViews.includes(requestedView as TeacherView)) {
        setTeacherView(requestedView as TeacherView);
      }
    };

    syncViewFromUrl();
    window.addEventListener("popstate", syncViewFromUrl);
    return () => window.removeEventListener("popstate", syncViewFromUrl);
  }, []);

  const fetchDashboard = async () => {
    const token = localStorage.getItem("kalatty_token");
    if (!token) {
      startTransition(() => router.push("/login"));
      return;
    }

    try {
      const res = await fetch(`${apiBaseUrl}/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem("kalatty_token");
          localStorage.removeItem("kalatty_user");
          startTransition(() => router.push("/login"));
          return;
        }
        setError(data.message ?? "Impossible de charger le dashboard.");
        return;
      }
      const typedData = data as DashboardResponse;
      setDashboardData(typedData);
      try {
        const notificationStorageKey = `${READ_NOTIFICATIONS_KEY_PREFIX}:${
          typedData.profile?.email ?? "local"
        }`;
        const locallyReadIds = getStoredReadNotifications(
          notificationStorageKey,
        );
        const notificationsRes = await fetch(`${apiBaseUrl}/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const notificationsData = await notificationsRes.json();
        if (notificationsRes.ok) {
          const nextNotifications = (
            Array.isArray(notificationsData.notifications)
              ? (notificationsData.notifications as NotificationItem[])
              : []
          ).map((notification) => ({
            ...notification,
            read: Boolean(
              notification.read || locallyReadIds.has(notification.id),
            ),
          }));
          setNotifications(nextNotifications);
          setUnreadNotifications(
            nextNotifications.filter((notification) => !notification.read)
              .length,
          );
        }
      } catch {
        setNotifications([]);
        setUnreadNotifications(0);
      }
      localStorage.setItem(
        "kalatty_user",
        JSON.stringify({
          ...typedData.profile,
          role: typedData.role,
        }),
      );
      setError("");
    } catch {
      setError("Le dashboard n'a pas pu etre charge.");
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardOnLoad = useEffectEvent(fetchDashboard);

  useEffect(() => {
    void fetchDashboardOnLoad();

    const refreshVisibleDashboard = () => {
      if (document.visibilityState === "visible") {
        void fetchDashboardOnLoad();
      }
    };

    window.addEventListener("focus", refreshVisibleDashboard);
    document.addEventListener("visibilitychange", refreshVisibleDashboard);

    return () => {
      window.removeEventListener("focus", refreshVisibleDashboard);
      document.removeEventListener("visibilitychange", refreshVisibleDashboard);
    };
  }, [apiBaseUrl, router]);

  const role: DashboardRole =
    dashboardData?.role === "institution"
      ? "institution"
      : dashboardData?.role === "teacher"
        ? "teacher"
        : user?.role === "teacher"
          ? "teacher"
          : "student";
  const workspace = dashboardData?.workspace;
  const isInstitutionAdmin =
    workspace?.kind === "institution-admin" || role === "institution";
  const isInstitutionTeacher = workspace?.kind === "institution-teacher";
  const isInstitutionStudent = workspace?.kind === "institution-student";
  const workspaceInstitutionName = String(
    workspace?.institutionName ??
      dashboardData?.studentInstitutions?.[0]?.name ??
      dashboardData?.teacherRooms?.[0]?.institutionName ??
      user?.school_name ??
      "",
  ).trim();
  const profile = dashboardData?.profile ?? user;
  const notificationStorageKey = `${READ_NOTIFICATIONS_KEY_PREFIX}:${
    profile?.email ?? "local"
  }`;
  const displayName =
    (isInstitutionAdmin
      ? workspaceInstitutionName
      : profile?.fullname?.trim()) ||
    (role === "teacher"
      ? "Formateur"
      : role === "institution"
        ? "Etablissement"
        : "Apprenant");
  const workspaceTitle =
    role === "institution"
      ? "Espace administrateur etablissement"
      : role === "teacher"
        ? isInstitutionTeacher
          ? "Espace professeur d'etablissement"
          : "Espace formateur"
        : isInstitutionStudent
          ? "Espace etudiant d'etablissement"
          : "Espace etudiant";
  const workspaceHeroTitle =
    role === "institution"
      ? `Campus digital, ${displayName}`
      : role === "teacher"
        ? isInstitutionTeacher
          ? `Classes et cours campus, ${displayName}`
          : `Espace formateur, ${displayName}`
        : isInstitutionStudent
          ? `Suivi campus, ${displayName}`
          : `Bon retour, ${displayName}`;
  const workspaceHeroText =
    role === "institution"
      ? "Regroupe tes eleves, cree des salles, equipe tes professeurs et pilote les devoirs."
      : role === "teacher"
        ? isInstitutionTeacher
          ? "Retrouve tes classes rattachees, publie les devoirs et gere les cours diffuses dans ton etablissement."
          : "Pilote tes contenus, retrouve tes cours et filtre rapidement."
        : isInstitutionStudent
          ? "Retrouve tes cours Kalatty, tes classes d'etablissement et les devoirs diffuses par ton campus."
          : "Accueil catalogue, reprise des cours et lien avec l'etablissement.";
  const mobileMenuItems: MobileMenuItem[] =
    role === "student"
      ? [
          { id: "home", label: "Accueil", icon: "home" },
          { id: "progress", label: "Mon cursus", icon: "book" },
          {
            id: "institutions",
            label: isInstitutionStudent ? "Mon campus" : "Mes etablissements",
            icon: "grid",
          },
          { id: "profile", label: "Mon compte", icon: "user" },
        ]
      : role === "teacher"
        ? [
            { id: "overview", label: "Pilotage", icon: "home" },
            { id: "courses", label: "Mes cours", icon: "folder" },
            { id: "classes", label: "Mes classes", icon: "grid" },
            { id: "studio", label: "Studio de creation", icon: "book" },
            { id: "profile", label: "Mon compte", icon: "user" },
          ]
        : [
            { id: "overview", label: "Vue d'ensemble", icon: "home" },
            { id: "accounts", label: "Comptes du campus", icon: "user" },
            { id: "classes", label: "Classes", icon: "grid" },
            { id: "courses", label: "Cours affectes", icon: "folder" },
            { id: "billing", label: "Abonnement", icon: "card" },
            { id: "settings", label: "Parametres", icon: "settings" },
          ];
  const activeMobileMenuItem =
    role === "student"
      ? studentView
      : role === "teacher"
        ? teacherView
        : institutionView;
  const handleMobileMenuSelect = (itemId: string) => {
    if (role === "student") {
      changeStudentView(itemId as StudentView);
      return;
    }
    if (role === "teacher") {
      changeTeacherView(itemId as TeacherView);
      return;
    }
    changeInstitutionView(itemId as InstitutionView);
  };
  const studentCourses = dashboardData?.courses ?? [];
  const teacherCourses = dashboardData?.courses ?? [];
  const teacherRooms = dashboardData?.teacherRooms ?? emptyRecords;
  const studentInstitutions = dashboardData?.studentInstitutions ?? [];
  const studentRooms = dashboardData?.studentRooms ?? [];
  const campusSchedule = dashboardData?.campusSchedule ?? [];
  const heroCourse = studentCourses[0];
  const discoveryCourses: DiscoveryCourse[] = isInstitutionStudent
    ? (dashboardData?.campusCourses ?? []).map((course, index) => ({
        id: String(course.id ?? `campus-course-${index}`),
        title: String(course.title ?? "Cours campus"),
        description: String(
          course.description ?? "Cours attribue par ton etablissement.",
        ),
        progress: Number(course.progress ?? 0),
        badge: String(course.badge ?? "Campus"),
        category: Array.isArray(course.roomNames)
          ? course.roomNames.join(", ")
          : String(course.category ?? "Classe"),
        priceFcfa: Number(course.priceFcfa ?? 0),
        teacherName: String(course.teacherName ?? "Professeur etablissement"),
        ratingAverage: Number(course.ratingAverage ?? 0),
        lessonsCount: Number(course.lessonsCount ?? 0),
        thumbnailUrl: String(course.thumbnailUrl ?? ""),
        campusOnly: true,
        roomNames: Array.isArray(course.roomNames)
          ? course.roomNames.map(String)
          : [],
      }))
    : (dashboardData?.catalogCourses?.length ?? 0) > 0
      ? (dashboardData?.catalogCourses ?? []).map((course, index) => ({
          id: String(course.id ?? `course-${index}`),
          title: String(course.title ?? "Cours sans titre"),
          description: String(
            course.description ?? "Parcours a decouvrir sur Kalatty.",
          ),
          progress: Number(course.progress ?? 0),
          badge: String(
            course.badge ?? (index === 0 ? "Disponible" : "Catalogue"),
          ),
          category: String(course.category ?? "Catalogue"),
          priceFcfa: Number(course.priceFcfa ?? 0),
          teacherName: String(course.teacherName ?? "Formateur Kalatty"),
          ratingAverage: Number(course.ratingAverage ?? 0),
          lessonsCount: Number(course.lessonsCount ?? 0),
          thumbnailUrl: String(course.thumbnailUrl ?? ""),
        }))
      : fallbackDiscovery;
  const weeklySchedule = isInstitutionStudent
    ? campusSchedule.map((item, index) => ({
        day: String(item.day ?? "A venir"),
        topic: String(item.title ?? "Activite programmee"),
        time: String(item.time ?? ""),
        roomName: String(item.roomName ?? "Salle"),
        id: String(item.id ?? `schedule-${index}`),
      }))
    : studentTimeline.map((item, index) => ({
        ...item,
        roomName: "",
        id: `${item.day}-${item.topic}-${index}`,
      }));
  const studentQuery = studentSearch.trim().toLowerCase();
  const teacherQuery = teacherSearch.trim().toLowerCase();
  const filteredDiscovery = discoveryCourses.filter((course) =>
    includesSearch(
      [course.title, course.description, course.category, course.badge],
      studentQuery,
    ),
  );
  const filteredStudentCourses = studentCourses.filter((course) =>
    includesSearch(
      [course.title, course.description, course.nextLesson],
      studentQuery,
    ),
  );
  const filteredTeacherCourses = teacherCourses.filter((course) =>
    includesSearch(
      [course.title, course.description, course.priceFcfa, course.learners],
      teacherQuery,
    ),
  );
  const teacherReviewNotifications = notifications.filter(
    (notification) => notification.type === "review",
  );
  const latestNotifications = notifications.slice(0, 6);
  const markNotificationsAsRead = async (notificationIds: string[]) => {
    const idsToMark = Array.from(new Set(notificationIds.filter(Boolean)));
    if (idsToMark.length === 0) {
      return;
    }

    const readIds = getStoredReadNotifications(notificationStorageKey);
    idsToMark.forEach((id) => readIds.add(id));
    persistReadNotifications(notificationStorageKey, readIds);

    setNotifications((current) => {
      const next = current.map((notification) =>
        idsToMark.includes(notification.id)
          ? { ...notification, read: true }
          : notification,
      );
      setUnreadNotifications(
        next.filter((notification) => !notification.read).length,
      );
      return next;
    });

    const token = localStorage.getItem("kalatty_token");
    if (!token) {
      return;
    }

    await Promise.allSettled(
      idsToMark.map((notificationId) =>
        fetch(`${apiBaseUrl}/notifications/${notificationId}/read`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        }),
      ),
    );
  };
  const teacherReviewAverage =
    teacherReviewNotifications.length > 0
      ? Math.round(
          (teacherReviewNotifications.reduce(
            (sum, notification) => sum + Number(notification.rating ?? 0),
            0,
          ) /
            teacherReviewNotifications.length) *
            10,
        ) / 10
      : 0;
  const filteredTeacherRooms = teacherRooms.filter((room) =>
    includesSearch(
      [room.name, room.description, room.institutionName, room.role],
      teacherQuery,
    ),
  );
  const institutionQuery = institutionSearch.trim().toLowerCase();
  const filteredStudentInstitutions = studentInstitutions.filter(
    (institution) =>
      includesSearch(
        [
          institution.name,
          institution.institutionType,
          institution.membershipRole,
          institution.planName,
        ],
        institutionQuery,
      ),
  );
  const filteredInstitutionRooms = studentRooms.filter((room) =>
    includesSearch(
      [
        room.name,
        room.description,
        room.institutionName,
        room.role,
        room.latestAssignmentTitle,
      ],
      institutionQuery,
    ),
  );
  const enrolledCoursesCount = Number(
    dashboardData?.stats.enrolledCourses ?? studentCourses.length ?? 0,
  );
  const completedLessonsCount = Number(
    dashboardData?.stats.completedLessons ?? 0,
  );
  const progressAverage = Number(dashboardData?.stats.progressAverage ?? 0);
  const linkedInstitutionsCount = Number(
    dashboardData?.stats.linkedInstitutions ?? studentInstitutions.length ?? 0,
  );
  const linkedRoomsCount = Number(
    dashboardData?.stats.activeRooms ?? studentRooms.length ?? 0,
  );
  const studentTasks =
    (dashboardData?.tasks ?? []).length > 0
      ? (dashboardData?.tasks ?? [])
      : [
          "Completer le profil pour recevoir des recommandations adaptees.",
          "Reprendre le dernier cours commence.",
          "Verifier les exercices transmis par ton etablissement.",
        ];
  const studentQuickStats = [
    {
      label: "Cours actifs",
      value: enrolledCoursesCount,
      note: "Parcours suivis",
      view: "progress" as StudentView,
    },
    {
      label: "Lecons terminees",
      value: completedLessonsCount,
      note: "Progression personnelle",
      view: "progress" as StudentView,
    },
    {
      label: "Moyenne",
      value: `${progressAverage}%`,
      note: "Avancement global",
      view: "progress" as StudentView,
    },
    {
      label: "Salles",
      value: linkedRoomsCount,
      note: "Classes rattachees",
      view: "institutions" as StudentView,
    },
  ];
  const campusStudentHighlights = [
    {
      label: "Campus",
      value: workspaceInstitutionName || "Non relie",
      note: isInstitutionStudent
        ? "Compte eleve pilote par un etablissement"
        : "Compte personnel Kalatty",
    },
    {
      label: "Devoirs campus",
      value: studentRooms.reduce(
        (sum, room) => sum + Number(room.pendingAssignments ?? 0),
        0,
      ),
      note: "Travaux diffuses dans tes classes",
    },
    {
      label: "Classe prioritaire",
      value: String(studentRooms[0]?.name ?? "Aucune"),
      note: String(
        studentRooms[0]?.latestAssignmentTitle ?? "Aucun devoir recent",
      ),
    },
  ];
  const publishedCoursesCount = Number(
    dashboardData?.stats.publishedCourses ?? teacherCourses.length ?? 0,
  );
  const totalLearnersCount = Number(dashboardData?.stats.totalLearners ?? 0);
  const averageLearnersCount = Number(
    dashboardData?.stats.averageLearners ?? 0,
  );
  const activeClassesCount = Number(
    dashboardData?.stats.activeClasses ?? teacherRooms.length ?? 0,
  );
  const teacherTasks =
    (dashboardData?.tasks ?? []).length > 0
      ? (dashboardData?.tasks ?? [])
      : [
          "Verifier les remises en attente dans les classes.",
          "Finaliser la prochaine video de cours.",
          "Mettre a jour le profil formateur et l'expertise.",
        ];
  const teacherQuickStats = [
    {
      label: "Cours publies",
      value: publishedCoursesCount,
      note: "Catalogue formateur",
    },
    {
      label: "Apprenants",
      value: totalLearnersCount,
      note: "Tous cours confondus",
    },
    { label: "Classes", value: activeClassesCount, note: "Salles affectees" },
  ];
  const campusTeacherHighlights = [
    {
      label: "Campus principal",
      value: workspaceInstitutionName || "Non precise",
      note: isInstitutionTeacher
        ? "Espace de diffusion lie a ton etablissement"
        : "Intervention libre sur la plateforme",
    },
    {
      label: "Classe a suivre",
      value: String(teacherRooms[0]?.name ?? "Aucune"),
      note: String(teacherRooms[0]?.institutionName ?? "Aucun campus rattache"),
    },
    {
      label: "Copies en attente",
      value: Number(teacherRoomDetail?.submissionSummary?.pending ?? 0),
      note: "Remises a corriger en priorite",
    },
  ];
  const teacherOperatingCards = [
    {
      label: "Marketplace",
      title: "Vendre mes cours",
      text: "Surveiller les cours publiés, les prix, les apprenants et les avis reçus.",
      action: "Mes cours",
      view: "courses" as TeacherView,
    },
    {
      label: "Studio",
      title: "Créer ou modifier",
      text: "Reprendre un brouillon, ajouter des vidéos, changer le prix ou republier un cours.",
      action: "Ouvrir le studio",
      view: "studio" as TeacherView,
    },
    {
      label: "Classes",
      title: "Enseigner au campus",
      text: "Publier des devoirs, suivre les remises et corriger les étudiants d'une classe.",
      action: "Mes classes",
      view: "classes" as TeacherView,
    },
    {
      label: "Profil",
      title: "Rassurer les apprenants",
      text: "Compléter la bio, l'expertise et les informations qui crédibilisent le formateur.",
      action: "Mon profil",
      view: "profile" as TeacherView,
    },
  ];
  const commandCenterCards =
    role === "student"
      ? [
          {
            label: isInstitutionStudent ? "Campus actif" : "Parcours actif",
            value: isInstitutionStudent
              ? workspaceInstitutionName || "Campus non relié"
              : `${enrolledCoursesCount} cours`,
            note: isInstitutionStudent
              ? "Cours et devoirs filtrés par ton établissement."
              : "Reprends tes apprentissages personnels.",
            action: "Voir mon suivi",
            onClick: () => changeStudentView("progress"),
          },
          {
            label: "Priorité",
            value: String(studentTasks[0] ?? "Continuer"),
            note: "Action recommandée pour avancer aujourd'hui.",
            action: isInstitutionStudent ? "Voir le campus" : "Voir le profil",
            onClick: () =>
              changeStudentView(isInstitutionStudent ? "institutions" : "profile"),
          },
          {
            label: "Progression",
            value: `${progressAverage}%`,
            note: "Avancement moyen des cours suivis.",
            action: "Détails",
            onClick: () => changeStudentView("progress"),
          },
        ]
      : role === "teacher"
        ? [
            {
              label: isInstitutionTeacher ? "Classes campus" : "Catalogue",
              value: isInstitutionTeacher
                ? `${activeClassesCount} classes`
                : `${publishedCoursesCount} cours`,
              note: isInstitutionTeacher
                ? "Cours et devoirs diffusés à tes classes."
                : "Cours publiés ou en préparation.",
              action: isInstitutionTeacher ? "Voir mes classes" : "Voir mes cours",
              onClick: () =>
                changeTeacherView(isInstitutionTeacher ? "classes" : "courses"),
            },
            {
              label: "Priorité",
              value: String(teacherTasks[0] ?? "Publier un cours"),
              note: "Point d'attention formateur.",
              action: "Ouvrir le studio",
              onClick: () => changeTeacherView("studio"),
            },
            {
              label: "Apprenants",
              value: totalLearnersCount,
              note: "Audience totale suivie depuis Kalatty.",
              action: "Analyser",
              onClick: () => changeTeacherView("overview"),
            },
          ]
        : [
            {
              label: "Campus",
              value: workspaceInstitutionName || displayName,
              note: "Vue administrateur, séparée du rôle enseignant.",
              action: "Vue d'ensemble",
              onClick: () => changeInstitutionView("overview"),
            },
            {
              label: "Gestion",
              value: "Comptes et classes",
              note: "Créer les accès, organiser les salles et suivre les rôles.",
              action: "Gérer",
              onClick: () => changeInstitutionView("accounts"),
            },
            {
              label: "Abonnement",
              value: String(dashboardData?.stats?.activePlan ?? "Plan campus"),
              note: "Capacités, limites et paiement de l'établissement.",
              action: "Voir le plan",
              onClick: () => changeInstitutionView("billing"),
            },
          ];

  useEffect(() => {
    setProfileForm({
      fullname: profile?.fullname ?? "",
      level: profile?.level ?? "",
      school_name: profile?.school_name ?? "",
      expertise: profile?.expertise ?? "",
      bio: profile?.bio ?? "",
    });
  }, [
    profile?.bio,
    profile?.expertise,
    profile?.fullname,
    profile?.level,
    profile?.school_name,
  ]);

  useEffect(() => {
    if (!selectedTeacherRoomId && teacherRooms.length > 0) {
      setSelectedTeacherRoomId(String(teacherRooms[0].id ?? ""));
    }
  }, [selectedTeacherRoomId, teacherRooms]);

  useEffect(() => {
    const token = localStorage.getItem("kalatty_token");
    if (!token || !selectedTeacherRoomId || role !== "teacher") {
      setTeacherRoomDetail(null);
      return;
    }

    const loadTeacherRoom = async () => {
      try {
        const res = await fetch(
          `${apiBaseUrl}/institutions/rooms/${selectedTeacherRoomId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        const data = await res.json();

        if (!res.ok) {
          setTeacherActionMessage(
            typeof data.message === "string"
              ? data.message
              : "Impossible de charger les details de la classe.",
          );
          return;
        }

        setTeacherRoomDetail(data as TeacherRoomDetail);
      } catch {
        setTeacherActionMessage(
          "Le detail de la classe n'a pas pu etre charge.",
        );
      }
    };

    void loadTeacherRoom();
  }, [apiBaseUrl, role, selectedTeacherRoomId, teacherRooms]);

  const handleLogout = () => {
    localStorage.removeItem("kalatty_token");
    localStorage.removeItem("kalatty_user");
    localStorage.removeItem("kalatty_role");
    startTransition(() => router.push("/login"));
  };

  const handleEnroll = async (courseId: string) => {
    const token = localStorage.getItem("kalatty_token");
    if (!token || !dashboardData) {
      setCatalogMessage("Session introuvable. Reconnecte-toi.");
      return;
    }

    setEnrollingCourseId(courseId);
    setCatalogMessage("");

    try {
      const res = await fetch(`${apiBaseUrl}/courses/${courseId}/enroll`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ courseId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCatalogMessage(
          typeof data.message === "string"
            ? data.message
            : "Impossible de s'inscrire a ce cours.",
        );
        return;
      }

      setDashboardData((current) => {
        if (!current) return current;

        const alreadyEnrolled = current.courses.some(
          (course) => String(course.id) === String(data.id),
        );

        return {
          ...current,
          stats: {
            ...current.stats,
            enrolledCourses: alreadyEnrolled
              ? Number(current.stats.enrolledCourses ?? 0)
              : Number(current.stats.enrolledCourses ?? 0) + 1,
          },
          courses: alreadyEnrolled
            ? current.courses
            : [data, ...current.courses],
          catalogCourses: (current.catalogCourses ?? []).map((course) =>
            String(course.id) === String(courseId)
              ? { ...course, enrolled: true }
              : course,
          ),
        };
      });

      setCatalogMessage(
        "Inscription reussie. Le cours est maintenant dans ton suivi.",
      );
    } catch {
      setCatalogMessage("L'inscription au cours a echoue.");
    } finally {
      setEnrollingCourseId("");
    }
  };

  const handleProfileFieldChange = (
    field: "fullname" | "level" | "school_name" | "expertise" | "bio",
    value: string,
  ) => {
    setProfileForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleProfileSave = async (event: React.FormEvent) => {
    event.preventDefault();

    const token = localStorage.getItem("kalatty_token");
    if (!token) {
      setProfileMessage("Session introuvable. Reconnecte-toi.");
      return;
    }

    setSavingProfile(true);
    setProfileMessage("");

    try {
      const res = await fetch(`${apiBaseUrl}/dashboard/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profileForm),
      });
      const data = await res.json();

      if (!res.ok) {
        setProfileMessage(
          typeof data.message === "string"
            ? data.message
            : "Impossible de mettre a jour le profil.",
        );
        return;
      }

      setDashboardData((current) =>
        current
          ? {
              ...current,
              profile: data,
            }
          : current,
      );
      localStorage.setItem("kalatty_user", JSON.stringify(data));
      setProfileMessage("Profil mis a jour avec succes.");
    } catch {
      setProfileMessage("La mise a jour du profil a echoue.");
    } finally {
      setSavingProfile(false);
    }
  };

  const refreshTeacherRoom = async () => {
    const token = localStorage.getItem("kalatty_token");
    if (!token || !selectedTeacherRoomId) {
      return;
    }

    const res = await fetch(
      `${apiBaseUrl}/institutions/rooms/${selectedTeacherRoomId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    const data = await res.json();

    if (res.ok) {
      setTeacherRoomDetail(data as TeacherRoomDetail);
    }
  };

  const handleTeacherAssignmentCreate = async (event: React.FormEvent) => {
    event.preventDefault();

    const token = localStorage.getItem("kalatty_token");
    if (!token || !selectedTeacherRoomId) {
      setTeacherActionMessage("Classe introuvable.");
      return;
    }

    setTeacherActionMessage("");

    try {
      const res = await fetch(
        `${apiBaseUrl}/institutions/rooms/${selectedTeacherRoomId}/assignments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: teacherAssignmentTitle,
            instructions: teacherAssignmentInstructions,
          }),
        },
      );
      const data = await res.json();

      if (!res.ok) {
        setTeacherActionMessage(
          typeof data.message === "string"
            ? data.message
            : "Impossible de publier le devoir.",
        );
        return;
      }

      setTeacherAssignmentTitle("");
      setTeacherAssignmentInstructions("");
      setTeacherActionMessage("Devoir publie dans la classe.");
      await refreshTeacherRoom();
    } catch {
      setTeacherActionMessage("La publication du devoir a echoue.");
    }
  };

  const handleSubmissionReview = async (event: React.FormEvent) => {
    event.preventDefault();

    const token = localStorage.getItem("kalatty_token");
    if (!token || !reviewForm.submissionId) {
      setTeacherActionMessage("Selectionne une remise a corriger.");
      return;
    }

    setTeacherActionMessage("");

    try {
      const res = await fetch(
        `${apiBaseUrl}/institutions/submissions/${reviewForm.submissionId}/review`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            score: reviewForm.score ? Number(reviewForm.score) : null,
            feedback: reviewForm.feedback,
            status: reviewForm.status,
          }),
        },
      );
      const data = await res.json();

      if (!res.ok) {
        setTeacherActionMessage(
          typeof data.message === "string"
            ? data.message
            : "Impossible de corriger la remise.",
        );
        return;
      }

      setReviewForm({
        submissionId: "",
        score: "",
        feedback: "",
        status: "reviewed",
      });
      setTeacherActionMessage("Remise corrigee avec succes.");
      await refreshTeacherRoom();
    } catch {
      setTeacherActionMessage("La correction de la remise a echoue.");
    }
  };

  const renderProfileEditor = () => (
    <section className={styles.grid}>
      <div className={styles.primaryColumn}>
        <section className={styles.card}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionLabel}>Profil</p>
              <h2>Modifier mon profil</h2>
            </div>
            <span className={styles.sectionHint}>
              {role === "teacher"
                ? "Mets en avant ton expertise et ta bio formateur."
                : "Complete ton niveau, ton etablissement et tes informations."}
            </span>
          </div>
          <form
            className={styles.profileEditor}
            onSubmit={(event) => void handleProfileSave(event)}
          >
            <div className={styles.metaFields}>
              <label className={styles.formField}>
                <span>Nom complet</span>
                <input
                  type="text"
                  value={profileForm.fullname}
                  onChange={(event) =>
                    handleProfileFieldChange("fullname", event.target.value)
                  }
                  placeholder="Ton nom complet"
                />
              </label>

              {role === "student" ? (
                <label className={styles.formField}>
                  <span>Niveau</span>
                  <input
                    type="text"
                    value={profileForm.level}
                    onChange={(event) =>
                      handleProfileFieldChange("level", event.target.value)
                    }
                    placeholder="Ex: Terminale, Licence 2"
                  />
                </label>
              ) : null}

              <label className={styles.formField}>
                <span>
                  {role === "teacher" ? "Specialite" : "Etablissement"}
                </span>
                <input
                  type="text"
                  value={
                    role === "teacher"
                      ? profileForm.expertise
                      : profileForm.school_name
                  }
                  onChange={(event) =>
                    handleProfileFieldChange(
                      role === "teacher" ? "expertise" : "school_name",
                      event.target.value,
                    )
                  }
                  placeholder={
                    role === "teacher"
                      ? "Ex: Math, Developpement web"
                      : "Nom de ton etablissement"
                  }
                />
              </label>

              {role === "student" ? (
                <label className={styles.formField}>
                  <span>Objectif ou specialite</span>
                  <input
                    type="text"
                    value={profileForm.expertise}
                    onChange={(event) =>
                      handleProfileFieldChange("expertise", event.target.value)
                    }
                    placeholder="Ex: Baccalaureat, Anglais, Informatique"
                  />
                </label>
              ) : null}
            </div>

            <label className={styles.formField}>
              <span>Bio</span>
              <textarea
                className={styles.formTextarea}
                rows={5}
                value={profileForm.bio}
                onChange={(event) =>
                  handleProfileFieldChange("bio", event.target.value)
                }
                placeholder={
                  role === "teacher"
                    ? "Presente ton experience, ta pedagogie et ce que tes apprenants vont trouver."
                    : "Presente ton parcours, tes besoins ou ton contexte d'apprentissage."
                }
              />
            </label>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={savingProfile}
            >
              {savingProfile ? "Enregistrement..." : "Enregistrer le profil"}
            </button>
            {profileMessage ? (
              <p className={styles.inlineMessage}>{profileMessage}</p>
            ) : null}
          </form>
        </section>
        <PasswordSettings apiBaseUrl={apiBaseUrl} />
      </div>

      <div className={styles.sideColumn}>
        <section className={styles.cardAccent}>
          <p className={styles.sectionLabel}>Apercu</p>
          <h2>Profil public Kalatty</h2>
          <div className={styles.profilePreview}>
            <strong>{profileForm.fullname || displayName}</strong>
            <span>
              {role === "teacher"
                ? profileForm.expertise || "Expertise a completer"
                : profileForm.level || "Niveau a completer"}
            </span>
            <p>
              {profileForm.bio ||
                "Ajoute une bio pour mieux presenter ton profil dans l'application."}
            </p>
          </div>
        </section>
      </div>
    </section>
  );

  if (loading) {
    return (
      <main className={styles.dashboardShell}>
        <section className={styles.card}>
          <h2>Chargement du dashboard...</h2>
          <p className={styles.paragraph}>
            Nous recuperons ton profil, tes cours et tes indicateurs depuis
            Kalatty.
          </p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className={styles.dashboardShell}>
        <section className={styles.card}>
          <h2>Impossible de charger le dashboard</h2>
          <p className={styles.paragraph}>{error}</p>
          <button
            type="button"
            className={styles.logoutButtonDark}
            onClick={handleLogout}
          >
            Retour a la connexion
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.dashboardShell}>
      <section className={styles.dashboardMasthead}>
        <Link href="/dashboard" className={styles.dashboardBrandLink}>
          <Image
            src="/kalatty-logo.png"
            alt="Logo Kalatty"
            width={56}
            height={56}
            className={styles.dashboardMastheadLogo}
            priority
          />
          <div>
            <span className={styles.dashboardMastheadTag}>
              Plateforme Kalatty
            </span>
            <strong className={styles.dashboardMastheadName}>
              Learning workspace
            </strong>
          </div>
        </Link>
        <div className={styles.dashboardMastheadActions}>
          <MobileDashboardMenu
            displayName={displayName}
            workspaceTitle={workspaceTitle}
            activeItem={activeMobileMenuItem}
            items={mobileMenuItems}
            onSelect={handleMobileMenuSelect}
            onLogout={handleLogout}
          />
          <div className={styles.notificationDropdown}>
            <button
              type="button"
              className={styles.notificationBell}
              aria-haspopup="menu"
              aria-expanded={notificationsOpen}
              onClick={() => {
                setNotificationsOpen((current) => {
                  const nextOpen = !current;
                  if (nextOpen) {
                    void markNotificationsAsRead(
                      latestNotifications
                        .filter((notification) => !notification.read)
                        .map((notification) => notification.id),
                    );
                  }
                  return nextOpen;
                });
              }}
            >
              <span>Notifications</span>
              <strong>{unreadNotifications}</strong>
            </button>
            {notificationsOpen ? (
              <div className={styles.notificationMenu} role="menu">
                <div className={styles.notificationMenuHeader}>
                  <strong>Centre d&apos;alertes</strong>
                  <small>
                    {unreadNotifications} non lue
                    {unreadNotifications > 1 ? "s" : ""}
                  </small>
                </div>
                <div className={styles.notificationMenuList}>
                  {latestNotifications.length > 0 ? (
                    latestNotifications.map((notification) =>
                      notification.href ? (
                        <Link
                          key={notification.id}
                          href={notification.href}
                          className={styles.notificationItem}
                          role="menuitem"
                          onClick={() => {
                            setNotificationsOpen(false);
                            void markNotificationsAsRead([notification.id]);
                          }}
                        >
                          <span>{notification.type}</span>
                          <strong>{notification.title}</strong>
                          <small>{notification.message}</small>
                        </Link>
                      ) : (
                        <article
                          key={notification.id}
                          className={styles.notificationItem}
                        >
                          <span>{notification.type}</span>
                          <strong>{notification.title}</strong>
                          <small>{notification.message}</small>
                        </article>
                      ),
                    )
                  ) : (
                    <article className={styles.notificationItem}>
                      <span>system</span>
                      <strong>Aucune alerte urgente</strong>
                      <small>
                        Les devoirs, corrections, avis et invitations
                        apparaitront ici.
                      </small>
                    </article>
                  )}
                </div>
                {role === "teacher" ? (
                  <button
                    type="button"
                    className={styles.notificationMenuFooter}
                    onClick={() => {
                      setNotificationsOpen(false);
                      changeTeacherView("courses");
                    }}
                  >
                    Voir les avis et commentaires
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className={styles.dashboardMastheadMeta}>
            <span>{workspaceTitle}</span>
            <span>{displayName}</span>
          </div>
        </div>
      </section>

      <section className={styles.hero}>
        <div className={styles.heroTop}>
          <div>
            <Link href="/dashboard" className={styles.heroBrandLink}>
              <div className={styles.heroBrand}>
                <Image
                  src="/kalatty-logo.png"
                  alt="Logo Kalatty"
                  width={84}
                  height={84}
                  className={styles.heroBrandLogo}
                  priority
                />
                <div>
                  <p className={styles.kicker}>Dashboard Kalatty</p>
                  <strong className={styles.heroBrandName}>Kalatty</strong>
                </div>
              </div>
            </Link>
            <h1>{workspaceHeroTitle}</h1>
            <p className={styles.heroText}>{workspaceHeroText}</p>
          </div>

          <div className={styles.actions}>
            {role === "student" ? (
              <label
                className={`${styles.viewPicker} ${styles.desktopNavigationControl}`}
              >
                <span>
                  {isInstitutionStudent
                    ? "Menu etudiant campus"
                    : "Menu etudiant"}
                </span>
                <select
                  value={studentView}
                  onChange={(event) =>
                    changeStudentView(event.target.value as StudentView)
                  }
                >
                  <option value="home">Accueil</option>
                  <option value="progress">Suivi des cours</option>
                  <option value="institutions">
                    {isInstitutionStudent ? "Mon campus" : "Etablissements"}
                  </option>
                  <option value="profile">Mon profil</option>
                </select>
              </label>
            ) : role === "teacher" ? (
              <label
                className={`${styles.viewPicker} ${styles.desktopNavigationControl}`}
              >
                <span>
                  {isInstitutionTeacher
                    ? "Menu professeur campus"
                    : "Menu enseignant"}
                </span>
                <select
                  value={teacherView}
                  onChange={(event) =>
                    changeTeacherView(event.target.value as TeacherView)
                  }
                >
                  <option value="overview">Pilotage</option>
                  <option value="courses">Mes cours</option>
                  <option value="classes">Mes classes</option>
                  <option value="studio">Studio de creation</option>
                  <option value="profile">Mon profil</option>
                </select>
              </label>
            ) : null}
            <div
              className={`${styles.roleBadge} ${styles.desktopNavigationControl}`}
            >
              {workspaceTitle}
            </div>
            <button
              type="button"
              className={`${styles.logoutButton} ${styles.desktopNavigationControl}`}
              onClick={handleLogout}
            >
              Se deconnecter
            </button>
          </div>
        </div>

        <div className={styles.heroMeta}>
          <div className={styles.profileCard}>
            <span className={styles.profileLabel}>Compte connecte</span>
            <strong>{displayName}</strong>
            <span>{profile?.email ?? "email non disponible"}</span>
          </div>
          <div className={styles.profileCard}>
            <span className={styles.profileLabel}>Profil Kalatty</span>
            <strong>
              {role === "student"
                ? isInstitutionStudent
                  ? "Etudiant d'etablissement"
                  : "Etudiant"
                : role === "teacher"
                  ? isInstitutionTeacher
                    ? "Professeur d'etablissement"
                    : "Enseignant"
                  : "Etablissement"}
            </strong>
            <span>
              {role === "student"
                ? profile?.level || "Niveau a completer dans le profil"
                : role === "teacher"
                  ? profile?.expertise || "Expertise a completer dans le profil"
                  : profile?.expertise ||
                    profile?.school_name ||
                    "Type d'etablissement a completer"}
            </span>
          </div>
        </div>
      </section>

      <section
        className={styles.commandCenter}
        aria-label="Centre de contrôle Kalatty"
      >
        <div className={styles.commandCenterIntro}>
          <span>Vue opérationnelle</span>
          <h2>
            {role === "institution"
              ? "Piloter le campus sans mélanger les rôles."
              : role === "teacher"
                ? "Prioriser les cours, classes et retours apprenants."
                : "Savoir quoi faire maintenant, sans chercher."}
          </h2>
        </div>
        <div className={styles.commandCenterGrid}>
          {commandCenterCards.map((card) => (
            <button
              key={card.label}
              type="button"
              className={styles.commandCard}
              onClick={card.onClick}
            >
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <small>{card.note}</small>
              <b>{card.action}</b>
            </button>
          ))}
        </div>
      </section>

      {role === "student" ? (
        <>
          <section className={styles.studentSwitch}>
            <div className={`${styles.studentTabs} ${styles.desktopViewTabs}`}>
              <button
                type="button"
                className={
                  studentView === "home" ? styles.activeTab : styles.studentTab
                }
                aria-current={studentView === "home" ? "page" : undefined}
                onClick={() => changeStudentView("home")}
              >
                Accueil
              </button>
              <button
                type="button"
                className={
                  studentView === "progress"
                    ? styles.activeTab
                    : styles.studentTab
                }
                aria-current={studentView === "progress" ? "page" : undefined}
                onClick={() => changeStudentView("progress")}
              >
                Suivi des cours
              </button>
              <button
                type="button"
                className={
                  studentView === "institutions"
                    ? styles.activeTab
                    : styles.studentTab
                }
                aria-current={
                  studentView === "institutions" ? "page" : undefined
                }
                onClick={() => changeStudentView("institutions")}
              >
                {isInstitutionStudent ? "Mon campus" : "Etablissements"}
              </button>
              <button
                type="button"
                className={
                  studentView === "profile"
                    ? styles.activeTab
                    : styles.studentTab
                }
                aria-current={studentView === "profile" ? "page" : undefined}
                onClick={() => changeStudentView("profile")}
              >
                Mon profil
              </button>
            </div>
          </section>

          {studentView === "home" ? (
            <section className={styles.grid}>
              <div className={styles.primaryColumn}>
                <section className={styles.studentShowcase}>
                  <div className={styles.showcaseCopy}>
                    <p className={styles.sectionLabel}>
                      {isInstitutionStudent
                        ? "Accueil campus"
                        : "Accueil etudiant"}
                    </p>
                    <h2>
                      {isInstitutionStudent
                        ? "Apprendre avec ton campus"
                        : "Reprendre, apprendre, avancer"}
                    </h2>
                    <p className={styles.paragraph}>
                      {isInstitutionStudent
                        ? "Ton espace regroupe les cours Kalatty, les consignes de tes classes et les actions diffusees par ton etablissement."
                        : "Ton espace regroupe les cours suivis, les prochaines lecons, les recommandations et le lien avec ton etablissement."}
                    </p>
                    <div className={styles.showcaseStats}>
                      {studentQuickStats.map((stat) => (
                        <button
                          key={stat.label}
                          type="button"
                          className={`${styles.showcaseStat} ${styles.interactiveStat}`}
                          onClick={() => changeStudentView(stat.view)}
                          aria-label={`${stat.label}: ${stat.value}. Voir les details`}
                        >
                          <span>{stat.label}</span>
                          <strong>{stat.value}</strong>
                          <small>{stat.note}</small>
                          <b>Voir les details</b>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className={styles.showcaseCourse}>
                    <span className={styles.showcaseBadge}>A reprendre</span>
                    <h3>
                      {String(
                        heroCourse?.title ?? "Ton prochain cours t'attend",
                      )}
                    </h3>
                    <p>
                      {String(
                        heroCourse?.nextLesson ??
                          "Des que tu t'inscris a un cours, Kalatty affiche ici la prochaine lecon a suivre.",
                      )}
                    </p>
                    <div className={styles.progressTrack}>
                      <div
                        className={styles.progressFill}
                        style={{
                          width: `${Number(heroCourse?.progress ?? 0)}%`,
                        }}
                      />
                    </div>
                    <small>{Number(heroCourse?.progress ?? 0)}% complete</small>
                    {heroCourse?.id ? (
                      <Link
                        href={`/courses/${String(heroCourse.id)}`}
                        className={styles.catalogDetailLink}
                      >
                        Reprendre ce cours
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className={styles.catalogDetailLink}
                        onClick={() => changeStudentView("progress")}
                      >
                        Voir mon suivi
                      </button>
                    )}
                  </div>
                </section>

                <nav
                  className={styles.studentQuickNav}
                  aria-label="Acces rapides etudiant"
                >
                  <button
                    type="button"
                    onClick={() => changeStudentView("progress")}
                  >
                    <span>01</span>
                    <strong>Mes apprentissages</strong>
                    <small>
                      Reprendre une video et consulter ma progression
                    </small>
                  </button>
                  <button
                    type="button"
                    onClick={() => changeStudentView("institutions")}
                  >
                    <span>02</span>
                    <strong>Mon campus</strong>
                    <small>Voir mes classes, devoirs et etablissements</small>
                  </button>
                  <button
                    type="button"
                    onClick={() => changeStudentView("profile")}
                  >
                    <span>03</span>
                    <strong>Mon profil</strong>
                    <small>Completer mes informations et preferences</small>
                  </button>
                </nav>

                <section className={styles.card}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <p className={styles.sectionLabel}>
                        {isInstitutionStudent ? "Campus" : "Catalogue"}
                      </p>
                      <h2>
                        {isInstitutionStudent
                          ? "Cours de mon etablissement"
                          : "Parcours recommandes"}
                      </h2>
                    </div>
                    <span className={styles.sectionHint}>
                      {isInstitutionStudent
                        ? workspaceInstitutionName ||
                          "Cours attribues par le campus"
                        : profile?.school_name ||
                          "Selection adaptee a ton profil"}
                    </span>
                  </div>
                  <label className={styles.searchBar}>
                    <span>Recherche etudiant</span>
                    <input
                      type="search"
                      placeholder="Rechercher un cours, une lecon ou un parcours"
                      value={studentSearch}
                      onChange={(event) => setStudentSearch(event.target.value)}
                    />
                  </label>
                  <div className={styles.discoveryGrid}>
                    {filteredDiscovery.map((course) => (
                      <article key={course.id} className={styles.discoveryCard}>
                        <div className={styles.dashboardCourseThumbnail}>
                          {getCourseThumbnailUrl(course.thumbnailUrl) ? (
                            <Image
                              src={getCourseThumbnailUrl(course.thumbnailUrl)}
                              alt={`Miniature du cours ${course.title}`}
                              fill
                              sizes="(max-width: 640px) 64vw, 19rem"
                            />
                          ) : (
                            <div className={styles.dashboardCourseFallback}>
                              <Image
                                src="/kalatty-logo.png"
                                alt=""
                                width={64}
                                height={64}
                              />
                              <span>Cours Kalatty</span>
                            </div>
                          )}
                        </div>
                        <div className={styles.discoveryTop}>
                          <span className={styles.discoveryBadge}>
                            {course.badge}
                          </span>
                          <small>{course.category}</small>
                        </div>
                        <h3>{course.title}</h3>
                        <p>{course.description}</p>
                        <div className={styles.discoveryFooter}>
                          <strong>
                            {isInstitutionStudent
                              ? "Cours campus"
                              : "priceFcfa" in course
                                ? `${Number(course.priceFcfa ?? 0)} FCFA`
                                : `${course.progress}%`}
                          </strong>
                          <span>
                            {"teacherName" in course
                              ? String(
                                  course.teacherName ?? "Formateur Kalatty",
                                )
                              : "Reprendre"}
                          </span>
                        </div>
                        {!isInstitutionStudent && "ratingAverage" in course ? (
                          <div className={styles.discoveryMetaRow}>
                            <span>
                              {Number(course.ratingAverage ?? 0).toFixed(1)}/5
                            </span>
                            <span>
                              {Number(course.lessonsCount ?? 0)} lecons
                            </span>
                          </div>
                        ) : null}
                        {"priceFcfa" in course ? (
                          <Link
                            href={`/courses/${course.id}`}
                            className={styles.catalogDetailLink}
                          >
                            Voir le cours
                          </Link>
                        ) : null}
                        {!isInstitutionStudent && "priceFcfa" in course ? (
                          Number(course.priceFcfa ?? 0) > 0 ? (
                            <Link
                              href={`/courses/${course.id}`}
                              className={styles.catalogActionButton}
                            >
                              {"enrolled" in course && course.enrolled
                                ? "Voir le cours"
                                : "Voir et payer"}
                            </Link>
                          ) : (
                            <button
                              type="button"
                              className={styles.catalogActionButton}
                              disabled={
                                enrollingCourseId === String(course.id) ||
                                Boolean("enrolled" in course && course.enrolled)
                              }
                              onClick={() =>
                                void handleEnroll(String(course.id))
                              }
                            >
                              {"enrolled" in course && course.enrolled
                                ? "Deja inscrit"
                                : enrollingCourseId === String(course.id)
                                  ? "Inscription..."
                                  : "S'inscrire"}
                            </button>
                          )
                        ) : null}
                      </article>
                    ))}
                  </div>
                  {catalogMessage ? (
                    <p className={styles.inlineMessage}>{catalogMessage}</p>
                  ) : null}
                  {filteredDiscovery.length === 0 ? (
                    <p className={styles.paragraph}>
                      {isInstitutionStudent
                        ? "Aucun cours n'est encore attribue a tes classes. Ton etablissement pourra les ajouter depuis l'espace administrateur."
                        : "Aucun parcours ne correspond a cette recherche."}
                    </p>
                  ) : null}
                </section>
              </div>

              <div className={styles.sideColumn}>
                <section className={styles.cardAccent}>
                  <p className={styles.sectionLabel}>Priorites</p>
                  <h2>A faire maintenant</h2>
                  <ul className={styles.simpleList}>
                    {studentTasks.map((task) => (
                      <li key={task}>{task}</li>
                    ))}
                  </ul>
                </section>
                {isInstitutionStudent ? (
                  <section className={styles.card}>
                    <p className={styles.sectionLabel}>Repere campus</p>
                    <h2>Vue rapide etablissement</h2>
                    <div className={styles.revenueGrid}>
                      {campusStudentHighlights.map((item) => (
                        <article
                          key={item.label}
                          className={styles.revenueCard}
                        >
                          <span>{item.label}</span>
                          <strong>{item.value}</strong>
                          <small>{item.note}</small>
                        </article>
                      ))}
                    </div>
                  </section>
                ) : null}
                <section className={styles.card}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <p className={styles.sectionLabel}>Planification</p>
                      <h2>
                        {isInstitutionStudent
                          ? "Emploi du temps campus"
                          : "Mon rythme de la semaine"}
                      </h2>
                    </div>
                  </div>
                  <div className={styles.timeline}>
                    {weeklySchedule.length > 0 ? (
                      weeklySchedule.map((item) => (
                        <div key={item.id} className={styles.timelineItem}>
                          <strong>{item.day}</strong>
                          <div>
                            <p>{item.topic}</p>
                            <span>{item.time}</span>
                            {item.roomName ? (
                              <small>{item.roomName}</small>
                            ) : null}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className={styles.paragraph}>
                        Aucun horaire n&apos;a encore ete publie par ton
                        etablissement.
                      </p>
                    )}
                  </div>
                </section>
                <section className={styles.card}>
                  <p className={styles.sectionLabel}>
                    {isInstitutionStudent ? "Campus actif" : "Etablissement"}
                  </p>
                  <h2>
                    {String(
                      studentInstitutions[0]?.name ??
                        workspaceInstitutionName ??
                        profile?.school_name ??
                        "Aucun rattachement",
                    )}
                  </h2>
                  <p className={styles.paragraph}>
                    {studentInstitutions.length > 0
                      ? "Tes salles, devoirs et cours diffuses par ton etablissement sont maintenant regroupes dans cet espace."
                      : "Complete ton profil ou rejoins une salle pour relier ton compte a un etablissement."}
                  </p>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => changeStudentView("institutions")}
                  >
                    Voir les liaisons
                  </button>
                </section>
              </div>
            </section>
          ) : null}

          {studentView === "progress" ? (
            <section className={styles.grid}>
              <div className={styles.primaryColumn}>
                <section className={styles.card}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <p className={styles.sectionLabel}>Suivi des cours</p>
                      <h2>Mes apprentissages</h2>
                    </div>
                    <span className={styles.sectionHint}>
                      Cours, prochaines lecons et progression
                    </span>
                  </div>
                  <label className={styles.searchBar}>
                    <span>Recherche etudiant</span>
                    <input
                      type="search"
                      placeholder="Filtrer mes cours et prochaines lecons"
                      value={studentSearch}
                      onChange={(event) => setStudentSearch(event.target.value)}
                    />
                  </label>
                  <div className={styles.statsRow}>
                    {studentQuickStats.map((stat) => (
                      <button
                        key={stat.label}
                        type="button"
                        className={`${styles.statCard} ${styles.interactiveStat}`}
                        onClick={() => changeStudentView(stat.view)}
                        aria-label={`${stat.label}: ${stat.value}. Afficher les details`}
                      >
                        <span>{stat.label}</span>
                        <strong>{stat.value}</strong>
                        <small>{stat.note}</small>
                        <b>Ouvrir</b>
                      </button>
                    ))}
                  </div>
                  <div className={styles.courseList}>
                    {filteredStudentCourses.length > 0 ? (
                      filteredStudentCourses.map((course) => (
                        <article
                          key={String(course.id)}
                          className={styles.courseCard}
                        >
                          <div className={styles.dashboardCourseThumbnail}>
                            {getCourseThumbnailUrl(course.thumbnailUrl) ? (
                              <Image
                                src={getCourseThumbnailUrl(course.thumbnailUrl)}
                                alt={`Miniature du cours ${String(course.title ?? "Cours")}`}
                                fill
                                sizes="(max-width: 640px) 64vw, 19rem"
                              />
                            ) : (
                              <div className={styles.dashboardCourseFallback}>
                                <Image
                                  src="/kalatty-logo.png"
                                  alt=""
                                  width={64}
                                  height={64}
                                />
                                <span>Cours Kalatty</span>
                              </div>
                            )}
                          </div>
                          <div className={styles.courseHead}>
                            <div>
                              <h3>
                                {String(course.title ?? "Cours sans titre")}
                              </h3>
                              <p>
                                {String(
                                  course.nextLesson ?? "Aucune lecon commencee",
                                )}
                              </p>
                            </div>
                            <span>{Number(course.progress ?? 0)}%</span>
                          </div>
                          <div className={styles.progressTrack}>
                            <div
                              className={styles.progressFill}
                              style={{
                                width: `${Number(course.progress ?? 0)}%`,
                              }}
                            />
                          </div>
                          <small>
                            {String(
                              course.description ?? "Cours en progression",
                            )}
                          </small>
                          <div className={styles.courseActionRow}>
                            <Link
                              href={`/courses/${String(course.id)}`}
                              className={styles.catalogDetailLink}
                            >
                              Commencer / reprendre
                            </Link>
                          </div>
                        </article>
                      ))
                    ) : (
                      <p className={styles.paragraph}>
                        {studentCourses.length > 0
                          ? "Aucun cours ne correspond a cette recherche."
                          : "Aucun cours n'est encore lie a ce compte."}
                      </p>
                    )}
                  </div>
                </section>
              </div>
              <div className={styles.sideColumn}>
                <section className={styles.card}>
                  <p className={styles.sectionLabel}>Routine</p>
                  <h2>Conseil d&apos;organisation</h2>
                  <p className={styles.paragraph}>
                    Travaille par blocs courts: une lecon, un exercice, puis une
                    verification. C&apos;est adapte aux contraintes de connexion
                    et de disponibilite.
                  </p>
                </section>
                <section className={styles.cardAccent}>
                  <p className={styles.sectionLabel}>Priorites</p>
                  <h2>Ce qui attend ton action</h2>
                  <ul className={styles.simpleList}>
                    {studentTasks.map((task) => (
                      <li key={task}>{task}</li>
                    ))}
                  </ul>
                </section>
              </div>
            </section>
          ) : null}

          {studentView === "institutions" ? (
            <section className={styles.grid}>
              <div className={styles.primaryColumn}>
                <section className={styles.card}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <p className={styles.sectionLabel}>
                        {isInstitutionStudent ? "Campus" : "Etablissements"}
                      </p>
                      <h2>
                        {isInstitutionStudent
                          ? "Mes classes et mon etablissement"
                          : "Mes salles et groupes"}
                      </h2>
                    </div>
                    <span className={styles.sectionHint}>
                      {isInstitutionStudent
                        ? "Organisation pedagogique de ton etablissement"
                        : "Lycees, universites et centres partenaires"}
                    </span>
                  </div>
                  <label className={styles.searchBar}>
                    <span>Recherche institutionnelle</span>
                    <input
                      type="search"
                      placeholder="Rechercher une salle, un groupe ou une action"
                      value={institutionSearch}
                      onChange={(event) =>
                        setInstitutionSearch(event.target.value)
                      }
                    />
                  </label>
                  <div className={styles.institutionGrid}>
                    {filteredStudentInstitutions.length > 0 ? (
                      filteredStudentInstitutions.map((institution) => (
                        <article
                          key={String(
                            institution.id ?? institution.name ?? "institution",
                          )}
                          className={styles.institutionCard}
                        >
                          <span>
                            {String(institution.membershipRole ?? "student")}
                          </span>
                          <h3>{String(institution.name ?? "Etablissement")}</h3>
                          <p>
                            {String(
                              institution.institutionType ??
                                "Structure partenaire",
                            )}
                            {institution.planName
                              ? ` | plan ${String(institution.planName)}`
                              : ""}
                          </p>
                        </article>
                      ))
                    ) : (
                      <p className={styles.paragraph}>
                        {studentInstitutions.length > 0
                          ? "Aucun etablissement ne correspond a cette recherche."
                          : "Aucun etablissement n'est encore relie a ce compte."}
                      </p>
                    )}
                  </div>
                </section>
                <section className={styles.card}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <p className={styles.sectionLabel}>Activite scolaire</p>
                      <h2>Devoirs et consignes attendus</h2>
                    </div>
                  </div>
                  <div className={styles.roadmapList}>
                    {filteredInstitutionRooms.length > 0 ? (
                      filteredInstitutionRooms.map((room) => (
                        <article
                          key={String(room.id ?? room.name ?? "room")}
                          className={styles.roadmapItem}
                        >
                          <strong>{String(room.name ?? "Salle")}</strong>
                          <p>
                            {String(room.institutionName ?? "Etablissement")} |
                            role {String(room.role ?? "student")}
                          </p>
                          <p>
                            {Number(room.pendingAssignments ?? 0) > 0
                              ? `${Number(room.pendingAssignments ?? 0)} devoir(s) publie(s) a consulter.`
                              : "Aucun devoir publie pour le moment."}
                          </p>
                          {room.latestAssignmentTitle ? (
                            <p>{String(room.latestAssignmentTitle)}</p>
                          ) : null}
                        </article>
                      ))
                    ) : (
                      <p className={styles.paragraph}>
                        {studentRooms.length > 0
                          ? "Aucune salle ne correspond a cette recherche."
                          : "Aucune salle n'est encore rattachee a ce compte."}
                      </p>
                    )}
                  </div>
                </section>
              </div>
              <div className={styles.sideColumn}>
                <section className={styles.cardAccent}>
                  <p className={styles.sectionLabel}>Profil rattache</p>
                  <h2>
                    {isInstitutionStudent ? "Mon campus" : "Mon etablissement"}
                  </h2>
                  <p className={styles.paragraph}>
                    {studentInstitutions[0]?.name
                      ? `Compte actuellement relie a ${String(studentInstitutions[0].name)} avec ${linkedRoomsCount} salle(s) active(s).`
                      : "Aucun etablissement n'est encore relie a ce compte."}
                  </p>
                  <p className={styles.paragraph}>
                    {linkedInstitutionsCount > 0
                      ? `${linkedInstitutionsCount} etablissement(s) et ${linkedRoomsCount} salle(s) relies a ce profil.`
                      : "Tu pourras rejoindre un campus via un lien d'invitation d'etablissement."}
                  </p>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => changeStudentView("profile")}
                  >
                    Completer mon profil
                  </button>
                </section>
              </div>
            </section>
          ) : null}

          {studentView === "profile" ? renderProfileEditor() : null}
        </>
      ) : role === "teacher" ? (
        <>
          <section className={styles.studentSwitch}>
            <div
              className={`${styles.studentTabs} ${styles.desktopViewTabs}`}
              aria-label="Sections de l'espace formateur"
            >
              <button
                type="button"
                className={
                  teacherView === "overview"
                    ? styles.activeTab
                    : styles.studentTab
                }
                aria-current={teacherView === "overview" ? "page" : undefined}
                onClick={() => changeTeacherView("overview")}
              >
                Vue d&apos;ensemble
              </button>
              <button
                type="button"
                className={
                  teacherView === "courses"
                    ? styles.activeTab
                    : styles.studentTab
                }
                aria-current={teacherView === "courses" ? "page" : undefined}
                onClick={() => changeTeacherView("courses")}
              >
                Mes cours
              </button>
              <button
                type="button"
                className={
                  teacherView === "classes"
                    ? styles.activeTab
                    : styles.studentTab
                }
                aria-current={teacherView === "classes" ? "page" : undefined}
                onClick={() => changeTeacherView("classes")}
              >
                Mes classes
              </button>
              <button
                type="button"
                className={
                  teacherView === "studio"
                    ? styles.activeTab
                    : styles.studentTab
                }
                aria-current={teacherView === "studio" ? "page" : undefined}
                onClick={() => changeTeacherView("studio")}
              >
                Studio
              </button>
              <button
                type="button"
                className={
                  teacherView === "profile"
                    ? styles.activeTab
                    : styles.studentTab
                }
                aria-current={teacherView === "profile" ? "page" : undefined}
                onClick={() => changeTeacherView("profile")}
              >
                Mon profil
              </button>
            </div>
          </section>

          {teacherView === "profile" ? (
            renderProfileEditor()
          ) : (
            <section
              className={`${styles.grid} ${teacherView !== "overview" ? styles.singleColumn : ""}`}
            >
              <div className={styles.primaryColumn}>
                {teacherView === "overview" ? (
                  <section className={styles.studentShowcase}>
                    <div className={styles.showcaseCopy}>
                      <p className={styles.sectionLabel}>
                        {isInstitutionTeacher
                          ? "Espace professeur campus"
                          : "Espace enseignant"}
                      </p>
                      <h2>
                        {isInstitutionTeacher
                          ? "Enseigner, diffuser, corriger"
                          : "Produire, suivre, corriger"}
                      </h2>
                      <p className={styles.paragraph}>
                        {isInstitutionTeacher
                          ? "Un tableau de bord centre sur tes classes, tes devoirs et les cours diffuses dans ton etablissement."
                          : "Un tableau de bord pour retrouver tes cours, suivre les apprenants et travailler avec les classes rattachees aux etablissements."}
                      </p>
                      <div className={styles.showcaseStats}>
                        {teacherQuickStats.map((stat) => (
                          <article
                            key={stat.label}
                            className={styles.showcaseStat}
                          >
                            <span>{stat.label}</span>
                            <strong>{stat.value}</strong>
                            <small>{stat.note}</small>
                          </article>
                        ))}
                      </div>
                    </div>
                    <div className={styles.showcaseCourse}>
                      <span className={styles.showcaseBadge}>Studio</span>
                      <h3>
                        {String(
                          filteredTeacherCourses[0]?.title ??
                            "Nouveau cours a preparer",
                        )}
                      </h3>
                      <p>
                        {filteredTeacherCourses[0]
                          ? String(
                              filteredTeacherCourses[0].description ??
                                "Continue a enrichir ce cours avec des lecons et des supports.",
                            )
                          : "Cree un cours structure avec modules, lecons, videos et miniature depuis le studio formateur."}
                      </p>
                      <div className={styles.courseMetaGrid}>
                        <span>{publishedCoursesCount} cours</span>
                        <span>{averageLearnersCount} apprenants / cours</span>
                        <span>{activeClassesCount} classes</span>
                      </div>
                    </div>
                  </section>
                ) : null}

                {teacherView === "overview" ? (
                  <section className={styles.teacherOperatingPanel}>
                    <div className={styles.sectionHeader}>
                      <div>
                        <p className={styles.sectionLabel}>Plan de travail</p>
                        <h2>Un espace formateur découpé par objectif</h2>
                      </div>
                      <span className={styles.sectionHint}>
                        Choisis l'action à traiter maintenant
                      </span>
                    </div>
                    <div className={styles.teacherOperatingGrid}>
                      {teacherOperatingCards.map((card) => (
                        <button
                          key={card.label}
                          type="button"
                          className={styles.teacherOperatingCard}
                          onClick={() => changeTeacherView(card.view)}
                        >
                          <span>{card.label}</span>
                          <strong>{card.title}</strong>
                          <small>{card.text}</small>
                          <b>{card.action}</b>
                        </button>
                      ))}
                    </div>
                  </section>
                ) : null}

                {teacherView === "courses" ? (
                  <section className={styles.card}>
                    <div className={styles.sectionHeader}>
                      <div>
                        <p className={styles.sectionLabel}>Cours</p>
                        <h2>Mes contenus publies</h2>
                      </div>
                      <span className={styles.sectionHint}>
                        {profile?.expertise || "Creation, suivi, diffusion"}
                      </span>
                    </div>
                    <label className={styles.searchBar}>
                      <span>Recherche enseignant</span>
                      <input
                        type="search"
                        placeholder="Rechercher un cours, un prix ou un groupe d'apprenants"
                        value={teacherSearch}
                        onChange={(event) =>
                          setTeacherSearch(event.target.value)
                        }
                      />
                    </label>
                    <div className={styles.statsRow}>
                      {teacherQuickStats.map((stat) => (
                        <article key={stat.label} className={styles.statCard}>
                          <span>{stat.label}</span>
                          <strong>{stat.value}</strong>
                          <small>{stat.note}</small>
                        </article>
                      ))}
                    </div>
                    <div className={styles.teacherCourseActionPanel}>
                      <article>
                        <span>Gestion du catalogue</span>
                        <strong>Créer, modifier, republier</strong>
                        <p>
                          Chaque cours peut être repris dans le studio pour
                          corriger le prix, la miniature, les modules, les
                          leçons ou le statut de publication.
                        </p>
                      </article>
                      <div>
                        <button
                          type="button"
                          className={styles.submitButton}
                          onClick={() => {
                            setEditingTeacherCourseId("");
                            changeTeacherView("studio");
                          }}
                        >
                          Créer un nouveau cours
                        </button>
                        <button
                          type="button"
                          className={styles.secondaryButton}
                          onClick={() => changeTeacherView("studio")}
                        >
                          Reprendre le studio
                        </button>
                      </div>
                    </div>
                    <section className={styles.teacherReviewInbox}>
                      <div className={styles.sectionHeader}>
                        <div>
                          <p className={styles.sectionLabel}>
                            Reception des avis
                          </p>
                          <h2>Commentaires et notes recus</h2>
                        </div>
                        <span className={styles.sectionHint}>
                          Moyenne recente: {teacherReviewAverage}/5
                        </span>
                      </div>
                      <div className={styles.reviewInboxSummary}>
                        <article>
                          <span>Total avis</span>
                          <strong>{teacherReviewNotifications.length}</strong>
                        </article>
                        <article>
                          <span>Note moyenne</span>
                          <strong>{teacherReviewAverage}/5</strong>
                        </article>
                        <article>
                          <span>Dernier avis</span>
                          <strong>
                            {teacherReviewNotifications[0]?.authorName ??
                              "Aucun avis"}
                          </strong>
                        </article>
                      </div>
                      <div className={styles.reviewInboxList}>
                        {teacherReviewNotifications.length > 0 ? (
                          teacherReviewNotifications
                            .slice(0, 6)
                            .map((review) => (
                              <article
                                key={review.id}
                                className={styles.reviewInboxItem}
                              >
                                <div>
                                  <span>{Number(review.rating ?? 0)}/5</span>
                                  <strong>
                                    {review.authorName ?? "Etudiant Kalatty"}
                                  </strong>
                                </div>
                                <p>{review.message}</p>
                                <small>
                                  {review.courseTitle ?? "Cours Kalatty"}
                                </small>
                                {review.href ? (
                                  <Link
                                    href={review.href}
                                    className={styles.catalogDetailLink}
                                  >
                                    Voir le cours
                                  </Link>
                                ) : null}
                              </article>
                            ))
                        ) : (
                          <article className={styles.reviewInboxItem}>
                            <div>
                              <span>0/5</span>
                              <strong>Aucun avis recu</strong>
                            </div>
                            <p>
                              Les commentaires et notes des etudiants
                              apparaitront ici des qu&apos;ils laisseront un
                              avis sur tes cours ou ton profil professeur.
                            </p>
                          </article>
                        )}
                      </div>
                    </section>
                    <div className={styles.teacherCourseGrid}>
                      {filteredTeacherCourses.length > 0 ? (
                        filteredTeacherCourses.map((course) => (
                          <article
                            key={String(course.id)}
                            className={styles.teacherCourseCard}
                          >
                            <div className={styles.dashboardCourseThumbnail}>
                              {getCourseThumbnailUrl(course.thumbnailUrl) ? (
                                <Image
                                  src={getCourseThumbnailUrl(
                                    course.thumbnailUrl,
                                  )}
                                  alt={`Miniature du cours ${String(course.title ?? "Cours")}`}
                                  fill
                                  sizes="(max-width: 640px) 64vw, 19rem"
                                />
                              ) : (
                                <div className={styles.dashboardCourseFallback}>
                                  <Image
                                    src="/kalatty-logo.png"
                                    alt=""
                                    width={64}
                                    height={64}
                                  />
                                  <span>Cours Kalatty</span>
                                </div>
                              )}
                            </div>
                            <div className={styles.teacherMeta}>
                              <span>
                                {Number(course.lessonsCount ?? 0)} lecons
                              </span>
                              <strong>
                                {Number(course.learners ?? 0)} apprenants
                              </strong>
                            </div>
                            <h3>
                              {String(course.title ?? "Cours sans titre")}
                            </h3>
                            <p>
                              {String(
                                course.description ?? "Description a completer",
                              )}
                            </p>
                            <div className={styles.courseMetaGrid}>
                              <span>{Number(course.priceFcfa ?? 0)} FCFA</span>
                              <span>
                                {String(course.videoUrl ?? "")
                                  ? "Video reliee"
                                  : "Video a ajouter"}
                              </span>
                              <span>
                                {String(course.thumbnailUrl ?? "")
                                  ? "Miniature prete"
                                  : "Miniature manquante"}
                              </span>
                            </div>
                            <div className={styles.courseActionRow}>
                              <button
                                type="button"
                                className={styles.secondaryButton}
                                onClick={() => {
                                  setEditingTeacherCourseId(
                                    String(course.id ?? ""),
                                  );
                                  changeTeacherView("studio");
                                }}
                              >
                                Modifier le cours
                              </button>
                              <Link
                                href={`/courses/${String(course.id)}`}
                                className={styles.catalogDetailLink}
                              >
                                Voir la fiche publique
                              </Link>
                            </div>
                          </article>
                        ))
                      ) : (
                        <p className={styles.paragraph}>
                          {teacherCourses.length > 0
                            ? "Aucun cours ne correspond a cette recherche."
                            : "Aucun cours n'est encore rattache a cet enseignant."}
                        </p>
                      )}
                    </div>
                  </section>
                ) : null}

                {teacherView === "overview" ? (
                  <section className={styles.card}>
                    <div className={styles.sectionHeader}>
                      <div>
                        <p className={styles.sectionLabel}>Insights</p>
                        <h2>Tendances utiles</h2>
                      </div>
                    </div>
                    <div className={styles.insightGrid}>
                      {teacherInsights.map((insight) => (
                        <article
                          key={insight.title}
                          className={styles.insightCard}
                        >
                          <span>{insight.title}</span>
                          <strong>{insight.value}</strong>
                          <p>{insight.note}</p>
                        </article>
                      ))}
                    </div>
                  </section>
                ) : null}

                {teacherView === "classes" ? (
                  <>
                    <section className={styles.card}>
                      <div className={styles.sectionHeader}>
                        <div>
                          <p className={styles.sectionLabel}>Classes</p>
                          <h2>
                            {isInstitutionTeacher
                              ? "Mes classes campus"
                              : "Mes classes d&apos;etablissement"}
                          </h2>
                        </div>
                        <span className={styles.sectionHint}>
                          {activeClassesCount} classes actives
                        </span>
                      </div>
                      <div className={styles.teacherCourseGrid}>
                        {filteredTeacherRooms.length > 0 ? (
                          filteredTeacherRooms.map((room) => (
                            <button
                              key={String(room.id)}
                              type="button"
                              className={
                                selectedTeacherRoomId === String(room.id)
                                  ? styles.institutionRoomBoardActive
                                  : styles.teacherCourseCard
                              }
                              onClick={() =>
                                setSelectedTeacherRoomId(String(room.id))
                              }
                            >
                              <div className={styles.teacherMeta}>
                                <span>{String(room.role ?? "teacher")}</span>
                                <strong>
                                  {String(
                                    room.institutionName ?? "Etablissement",
                                  )}
                                </strong>
                              </div>
                              <h3>{String(room.name ?? "Classe")}</h3>
                              <p>
                                {String(
                                  room.description ??
                                    "Classe rattachee a un etablissement partenaire.",
                                )}
                              </p>
                              <div className={styles.courseMetaGrid}>
                                <span>
                                  {String(room.slug ?? "")
                                    ? `#${String(room.slug)}`
                                    : "Slug indisponible"}
                                </span>
                                <span>
                                  {String(room.joinedAt ?? "")
                                    ? "Rattachement actif"
                                    : "A confirmer"}
                                </span>
                                <span>Classes institutionnelles</span>
                              </div>
                            </button>
                          ))
                        ) : (
                          <p className={styles.paragraph}>
                            Aucune classe d&apos;etablissement n&apos;est encore
                            rattachee a ce professeur.
                          </p>
                        )}
                      </div>
                    </section>

                    {teacherRoomDetail ? (
                      <section className={styles.card}>
                        <div className={styles.sectionHeader}>
                          <div>
                            <p className={styles.sectionLabel}>Salle active</p>
                            <h2>{teacherRoomDetail.name}</h2>
                          </div>
                          <span className={styles.sectionHint}>
                            {teacherRoomDetail.slug
                              ? `#${teacherRoomDetail.slug}`
                              : "Classe enseignant"}
                          </span>
                        </div>
                        <div className={styles.institutionOpsGrid}>
                          <article className={styles.institutionOpsCard}>
                            <span>Remises</span>
                            <strong>
                              {Number(
                                teacherRoomDetail.submissionSummary?.total ?? 0,
                              )}
                            </strong>
                            <p>Toutes copies remises dans cette classe.</p>
                          </article>
                          <article className={styles.institutionOpsCard}>
                            <span>A corriger</span>
                            <strong>
                              {Number(
                                teacherRoomDetail.submissionSummary?.pending ??
                                  0,
                              )}
                            </strong>
                            <p>Copies qui attendent ton retour.</p>
                          </article>
                          <article className={styles.institutionOpsCard}>
                            <span>Corrigees</span>
                            <strong>
                              {Number(
                                teacherRoomDetail.submissionSummary?.reviewed ??
                                  0,
                              )}
                            </strong>
                            <p>Copies deja traitees.</p>
                          </article>
                        </div>

                        <div className={styles.institutionActionGrid}>
                          <section className={styles.card}>
                            <div className={styles.sectionHeader}>
                              <div>
                                <p className={styles.sectionLabel}>Devoir</p>
                                <h2>Publier dans ma classe</h2>
                              </div>
                            </div>
                            <form
                              onSubmit={(event) =>
                                void handleTeacherAssignmentCreate(event)
                              }
                              className={styles.teacherForm}
                            >
                              <label className={styles.formField}>
                                <span>Titre</span>
                                <input
                                  type="text"
                                  value={teacherAssignmentTitle}
                                  onChange={(event) =>
                                    setTeacherAssignmentTitle(
                                      event.target.value,
                                    )
                                  }
                                  placeholder="Controle continu - semaine 3"
                                />
                              </label>
                              <label className={styles.formField}>
                                <span>Consignes</span>
                                <textarea
                                  className={styles.formTextarea}
                                  rows={4}
                                  value={teacherAssignmentInstructions}
                                  onChange={(event) =>
                                    setTeacherAssignmentInstructions(
                                      event.target.value,
                                    )
                                  }
                                  placeholder="Consignes de rendu, fichier attendu, date et modalites."
                                />
                              </label>
                              <button
                                type="submit"
                                className={styles.submitButton}
                              >
                                Publier le devoir
                              </button>
                            </form>
                          </section>

                          <section className={styles.card}>
                            <div className={styles.sectionHeader}>
                              <div>
                                <p className={styles.sectionLabel}>
                                  Correction
                                </p>
                                <h2>Corriger une remise</h2>
                              </div>
                            </div>
                            <form
                              onSubmit={(event) =>
                                void handleSubmissionReview(event)
                              }
                              className={styles.teacherForm}
                            >
                              <label className={styles.formField}>
                                <span>Copie a corriger</span>
                                <select
                                  className={styles.selectField}
                                  value={reviewForm.submissionId}
                                  onChange={(event) =>
                                    setReviewForm((current) => ({
                                      ...current,
                                      submissionId: event.target.value,
                                    }))
                                  }
                                >
                                  <option value="">Choisir une remise</option>
                                  {(
                                    teacherRoomDetail.recentSubmissions ?? []
                                  ).map((submission) => (
                                    <option
                                      key={submission.id}
                                      value={submission.id}
                                    >
                                      {submission.studentName} -{" "}
                                      {submission.assignmentTitle}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <div className={styles.metaFields}>
                                <label className={styles.formField}>
                                  <span>Note</span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={reviewForm.score}
                                    onChange={(event) =>
                                      setReviewForm((current) => ({
                                        ...current,
                                        score: event.target.value,
                                      }))
                                    }
                                    placeholder="15"
                                  />
                                </label>
                                <label className={styles.formField}>
                                  <span>Statut</span>
                                  <select
                                    className={styles.selectField}
                                    value={reviewForm.status}
                                    onChange={(event) =>
                                      setReviewForm((current) => ({
                                        ...current,
                                        status: event.target.value,
                                      }))
                                    }
                                  >
                                    <option value="reviewed">Corrige</option>
                                    <option value="returned">Retourne</option>
                                  </select>
                                </label>
                              </div>
                              <label className={styles.formField}>
                                <span>Feedback</span>
                                <textarea
                                  className={styles.formTextarea}
                                  rows={4}
                                  value={reviewForm.feedback}
                                  onChange={(event) =>
                                    setReviewForm((current) => ({
                                      ...current,
                                      feedback: event.target.value,
                                    }))
                                  }
                                  placeholder="Retour pedagogique pour l'etudiant."
                                />
                              </label>
                              <button
                                type="submit"
                                className={styles.submitButton}
                              >
                                Enregistrer la correction
                              </button>
                            </form>
                          </section>
                        </div>

                        <section className={styles.card}>
                          <div className={styles.sectionHeader}>
                            <div>
                              <p className={styles.sectionLabel}>
                                Copies recentes
                              </p>
                              <h2>Suivi des remises</h2>
                            </div>
                          </div>
                          <div className={styles.roadmapList}>
                            {(teacherRoomDetail.recentSubmissions ?? [])
                              .length > 0 ? (
                              (teacherRoomDetail.recentSubmissions ?? []).map(
                                (submission) => (
                                  <article
                                    key={submission.id}
                                    className={styles.roadmapItem}
                                  >
                                    <strong>{submission.studentName}</strong>
                                    <p>{submission.assignmentTitle}</p>
                                    <small>
                                      {submission.status}
                                      {submission.score !== null &&
                                      submission.score !== undefined
                                        ? ` | score ${submission.score}`
                                        : ""}
                                    </small>
                                  </article>
                                ),
                              )
                            ) : (
                              <p className={styles.paragraph}>
                                Aucune remise recente dans cette classe.
                              </p>
                            )}
                          </div>
                          {teacherActionMessage ? (
                            <p className={styles.inlineMessage}>
                              {teacherActionMessage}
                            </p>
                          ) : null}
                        </section>
                      </section>
                    ) : null}
                  </>
                ) : null}

                {teacherView === "studio" ? (
                  <TeacherCourseBuilder
                    apiBaseUrl={apiBaseUrl}
                    onCourseCreated={fetchDashboard}
                    editingCourseId={editingTeacherCourseId || null}
                    onCancelEdit={() => setEditingTeacherCourseId("")}
                  />
                ) : null}
              </div>

              {teacherView === "overview" ? (
                <div className={styles.sideColumn}>
                  <section className={styles.cardAccent}>
                    <p className={styles.sectionLabel}>Operations du jour</p>
                    <h2>
                      {isInstitutionTeacher
                        ? "Checklist professeur campus"
                        : "Checklist formateur"}
                    </h2>
                    <ul className={styles.simpleList}>
                      {teacherTasks.map((task) => (
                        <li key={task}>{task}</li>
                      ))}
                    </ul>
                  </section>
                  {isInstitutionTeacher ? (
                    <section className={styles.card}>
                      <p className={styles.sectionLabel}>Repere campus</p>
                      <h2>Vue rapide d&apos;etablissement</h2>
                      <div className={styles.revenueGrid}>
                        {campusTeacherHighlights.map((item) => (
                          <article
                            key={item.label}
                            className={styles.revenueCard}
                          >
                            <span>{item.label}</span>
                            <strong>{item.value}</strong>
                            <small>{item.note}</small>
                          </article>
                        ))}
                      </div>
                    </section>
                  ) : null}
                  <section className={styles.card}>
                    <p className={styles.sectionLabel}>
                      {isInstitutionTeacher ? "Activite formateur" : "Revenus"}
                    </p>
                    <h2>
                      {isInstitutionTeacher
                        ? "Indicateurs de diffusion"
                        : "Remuneration enseignant"}
                    </h2>
                    <div className={styles.revenueGrid}>
                      <article className={styles.revenueCard}>
                        <span>
                          {isInstitutionTeacher
                            ? "Revenus cumules"
                            : "Montant cumule"}
                        </span>
                        <strong>
                          {dashboardData?.stats.totalRevenue ?? 0} FCFA
                        </strong>
                        <small>
                          {isInstitutionTeacher
                            ? "Suivi personnel de tes cours, meme en diffusion campus"
                            : "Somme totale generee par tes cours"}
                        </small>
                      </article>
                      <article className={styles.revenueCard}>
                        <span>
                          {isInstitutionTeacher ? "Ce mois-ci" : "Ce mois-ci"}
                        </span>
                        <strong>
                          {dashboardData?.stats.monthRevenue ?? 0} FCFA
                        </strong>
                        <small>
                          {isInstitutionTeacher
                            ? "Montant recent genere sur Kalatty"
                            : "Revenus recents des inscriptions payantes"}
                        </small>
                      </article>
                    </div>
                  </section>
                </div>
              ) : null}
            </section>
          )}
        </>
      ) : (
        <InstitutionWorkspace
          apiBaseUrl={apiBaseUrl}
          navigationView={institutionView}
          onNavigationViewChange={setInstitutionView}
        />
      )}
    </main>
  );
}
