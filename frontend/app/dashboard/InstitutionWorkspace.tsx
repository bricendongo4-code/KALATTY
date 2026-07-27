"use client";

import { useEffect, useMemo, useState } from "react";
import PasswordSettings from "./PasswordSettings";
import styles from "./dashboard.module.css";

type InstitutionSummary = {
  id: string;
  name: string;
  slug: string;
  institution_type?: string | null;
  plan_name?: string | null;
  subscription_status?: string | null;
};

type InstitutionDetail = {
  id: string;
  name: string;
  slug: string;
  institution_type?: string | null;
  description?: string | null;
  plan_name?: string | null;
  subscription_status?: string | null;
  max_students?: number;
  max_rooms?: number;
  stats?: {
    roomsCount: number;
    assignmentsCount: number;
    assignedCoursesCount: number;
    totalMembers: number;
    ownersCount: number;
    adminsCount: number;
    teachersCount: number;
    studentsCount: number;
    activeInvitesCount: number;
    totalSubmissions: number;
    reviewedSubmissions: number;
    pendingSubmissions: number;
    managedAccountsCount?: number;
    scheduleItemsCount?: number;
    attendanceSessionsCount?: number;
    roomUsagePercentage: number;
    studentUsagePercentage: number;
  };
  rooms: Array<{
    id: string;
    name: string;
    slug?: string | null;
    description?: string | null;
    created_at?: string;
  }>;
  members: Array<{
    id: string;
    role: string;
    joinedAt?: string;
    profile?: {
      id?: string;
      fullname?: string | null;
      email?: string | null;
    } | null;
  }>;
  assignments: Array<{
    id: string;
    title: string;
    status: string;
    due_at?: string | null;
    room_id: string;
  }>;
  invites: Array<{
    id: string;
    room_id: string;
    token: string;
    invite_role: string;
    expires_at?: string | null;
    max_uses: number;
    used_count: number;
    is_active: boolean;
  }>;
  managedUsers?: Array<{
    id: string;
    institution_id: string;
    user_id: string;
    login_email: string;
    full_name: string;
    managed_role: string;
    source: string;
    status: string;
    must_reset_password: boolean;
    created_at?: string;
    profiles?: {
      id?: string;
      fullname?: string | null;
      email?: string | null;
      level?: string | null;
      expertise?: string | null;
      school_name?: string | null;
    } | null;
  }>;
  scheduleItems?: Array<ScheduleItem>;
  attendanceSessions?: Array<AttendanceSession>;
};

type ScheduleItem = {
  id: string;
  room_id: string;
  title: string;
  weekday: number;
  starts_at: string;
  ends_at?: string | null;
  location?: string | null;
  notes?: string | null;
};

type AttendanceSession = {
  id: string;
  room_id: string;
  title: string;
  session_date: string;
  created_at?: string;
  room_attendance_records?: Array<{
    id: string;
    student_id: string;
    status: string;
    note?: string | null;
    profiles?: {
      fullname?: string | null;
      email?: string | null;
    } | null;
  }>;
};

type RoomDetail = {
  id: string;
  institution_id: string;
  name: string;
  slug?: string | null;
  description?: string | null;
  members: Array<{
    id: string;
    role: string;
    joinedAt?: string;
    access?: {
      status: string;
      reason?: string;
    };
    profile?: {
      id?: string;
      fullname?: string | null;
      email?: string | null;
    } | null;
  }>;
  courses: Array<{
    id: string;
    assignedAt?: string;
    course?: {
      id?: string;
      title?: string | null;
      description?: string | null;
      short_description?: string | null;
      price_fcfa?: number | null;
    } | null;
  }>;
  assignments: Array<{
    id: string;
    title: string;
    instructions?: string | null;
    status: string;
    due_at?: string | null;
    max_score?: number | null;
    submissionCount?: number;
    reviewedCount?: number;
    pendingCount?: number;
    files?: Array<{
      id: string;
      name: string;
      file_path: string;
      file_type: string;
    }>;
  }>;
  invites: Array<{
    id: string;
    token: string;
    invite_role: string;
    expires_at?: string | null;
    max_uses: number;
    used_count: number;
    is_active: boolean;
  }>;
  submissionSummary?: {
    total: number;
    reviewed: number;
    pending: number;
  };
  recentSubmissions?: Array<{
    id: string;
    status: string;
    submittedAt?: string | null;
    score?: number | null;
    assignmentTitle: string;
    studentName: string;
  }>;
  scheduleItems?: Array<ScheduleItem>;
  attendanceSessions?: Array<AttendanceSession>;
};

type DiscoveryCourse = {
  id: string;
  title: string;
  description: string;
  shortDescription: string;
  priceFcfa: number;
  teacherName: string;
  teacherExpertise: string;
  lessonsCount: number;
  courseRatingAverage: number;
};

type DiscoveryPayload = {
  featuredCourses: DiscoveryCourse[];
  topRatedCourses: DiscoveryCourse[];
};

type Props = {
  apiBaseUrl: string;
  navigationView?: InstitutionView;
  onNavigationViewChange?: (view: InstitutionView) => void;
};

export type InstitutionView = "overview" | "accounts" | "classes" | "courses" | "billing" | "settings";

const formatRoleLabel = (role: string) => {
  if (role === "student") return "Étudiant";
  if (role === "teacher") return "Professeur";
  if (role === "assistant") return "Assistant";
  if (role === "owner") return "Propriétaire";
  if (role === "admin") return "Administrateur";
  return role;
};

const formatDate = (value?: string | null) => {
  if (!value) return "Date non définie";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

const formatCurrency = (value: number) =>
  `${new Intl.NumberFormat("fr-FR").format(value)} FCFA`;

const formatPlanLabel = (value?: string | null) => {
  if (value === "growth") return "Growth";
  if (value === "campus") return "Campus";
  return "Starter";
};

const formatSubscriptionStatus = (value?: string | null) => {
  if (value === "active") return "Actif";
  if (value === "past_due") return "Paiement en attente";
  if (value === "cancelled") return "Suspendu";
  return "Essai";
};

const weekdayLabels = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];

export default function InstitutionWorkspace({
  apiBaseUrl,
  navigationView,
  onNavigationViewChange,
}: Props) {
  const [internalActiveView, setInternalActiveView] =
    useState<InstitutionView>("overview");
  const activeView = navigationView ?? internalActiveView;
  const setActiveView = (view: InstitutionView) => {
    setInternalActiveView(view);
    onNavigationViewChange?.(view);
  };
  const [institutions, setInstitutions] = useState<InstitutionSummary[]>([]);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [detail, setDetail] = useState<InstitutionDetail | null>(null);
  const [roomDetail, setRoomDetail] = useState<RoomDetail | null>(null);
  const [catalogCourses, setCatalogCourses] = useState<DiscoveryCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [institutionType, setInstitutionType] = useState("");
  const [roomName, setRoomName] = useState("");
  const [roomDescription, setRoomDescription] = useState("");
  const [inviteRoomId, setInviteRoomId] = useState("");
  const [inviteRole, setInviteRole] = useState<"student" | "teacher" | "assistant">("student");
  const [generatedLink, setGeneratedLink] = useState("");
  const [assignedCourseId, setAssignedCourseId] = useState("");
  const [billingLoading, setBillingLoading] = useState(false);
  const [managedUserFullname, setManagedUserFullname] = useState("");
  const [managedUserRole, setManagedUserRole] = useState<"student" | "teacher" | "admin">("student");
  const [managedUserLevel, setManagedUserLevel] = useState("");
  const [managedUserExpertise, setManagedUserExpertise] = useState("");
  const [managedUserRoomId, setManagedUserRoomId] = useState("");
  const [provisioningUser, setProvisioningUser] = useState(false);
  const [lastProvisionedAccess, setLastProvisionedAccess] = useState<{
    loginEmail: string;
    temporaryPassword: string;
    fullname: string;
    role: string;
  } | null>(null);
  const [resettingManagedUserId, setResettingManagedUserId] = useState("");
  const [savingCampusLife, setSavingCampusLife] = useState(false);
  const [memberStatusReason, setMemberStatusReason] = useState("");

  const token =
    typeof window !== "undefined" ? localStorage.getItem("kalatty_token") : null;

  const selectedInstitution = useMemo(
    () => institutions.find((institution) => institution.id === selectedInstitutionId) ?? null,
    [institutions, selectedInstitutionId],
  );

  const roomLookup = useMemo(
    () => new Map((detail?.rooms ?? []).map((room) => [room.id, room.name])),
    [detail],
  );

  const normalizedQuery = query.trim().toLowerCase();

  const filteredRooms = useMemo(() => {
    if (!detail) return [];
    return detail.rooms.filter((room) =>
      [room.name, room.description, room.slug]
        .map((value) => String(value ?? ""))
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [detail, normalizedQuery]);

  const filteredAssignments = useMemo(() => {
    if (!detail) return [];
    return detail.assignments.filter((assignment) =>
      [assignment.title, assignment.status, roomLookup.get(assignment.room_id)]
        .map((value) => String(value ?? ""))
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [detail, normalizedQuery, roomLookup]);

  const filteredInvites = useMemo(() => {
    if (!detail) return [];
    return detail.invites.filter((invite) =>
      [invite.invite_role, invite.token, roomLookup.get(invite.room_id)]
        .map((value) => String(value ?? ""))
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [detail, normalizedQuery, roomLookup]);

  const institutionCounts = useMemo(() => {
    const members = detail?.members ?? [];
    return {
      owners: members.filter((member) => member.role === "owner").length,
      admins: members.filter((member) => member.role === "admin").length,
      teachers: members.filter((member) => member.role === "teacher").length,
      students: members.filter((member) => member.role === "student").length,
    };
  }, [detail]);
  const managedUsers = useMemo(
    () => detail?.managedUsers ?? [],
    [detail?.managedUsers],
  );
  const filteredManagedUsers = useMemo(
    () =>
      managedUsers.filter((managedUser) =>
        [
          managedUser.full_name,
          managedUser.login_email,
          managedUser.managed_role,
          managedUser.status,
          managedUser.profiles?.level,
          managedUser.profiles?.expertise,
        ]
          .map((value) => String(value ?? ""))
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      ),
    [managedUsers, normalizedQuery],
  );
  const activeInvitesCount = (detail?.invites ?? []).filter((invite) => invite.is_active).length;
  const campusQuickStats = [
    {
      label: "Classes",
      value: detail?.stats?.roomsCount ?? detail?.rooms.length ?? 0,
      note: `Capacité plan : ${detail?.max_rooms ?? 0}`,
    },
    {
      label: "Professeurs",
      value: detail?.stats?.teachersCount ?? institutionCounts.teachers,
      note: `${institutionCounts.admins + institutionCounts.owners} admin / owner`,
    },
    {
      label: "Étudiants",
      value: detail?.stats?.studentsCount ?? institutionCounts.students,
      note: `Capacité plan : ${detail?.max_students ?? 0}`,
    },
    {
      label: "Comptes geres",
      value: detail?.stats?.managedAccountsCount ?? managedUsers.length,
      note: "Accès créés par l'établissement",
    },
    {
      label: "Devoirs",
      value: detail?.stats?.assignmentsCount ?? detail?.assignments.length ?? 0,
      note: "Travaux diffuses",
    },
  ];
  const institutionPlanCards = [
    {
      code: "starter",
      label: "Starter",
      amountFcfa: 25000,
      studentCap: 100,
      roomCap: 10,
      target: "Pour lancer un petit campus numerique proprement.",
      highlight: "100 apprenants et 10 classes.",
    },
    {
      code: "growth",
      label: "Growth",
      amountFcfa: 65000,
      studentCap: 500,
      roomCap: 30,
      target: "Pour plusieurs niveaux, sections ou filieres.",
      highlight: "500 apprenants et 30 classes.",
    },
    {
      code: "campus",
      label: "Campus",
      amountFcfa: 120000,
      studentCap: 2000,
      roomCap: 120,
      target: "Pour un grand établissement ou un réseau de formation.",
      highlight: "2 000 apprenants et 120 classes.",
    },
  ];
  const currentPlanCode = String(
    detail?.plan_name ?? selectedInstitution?.plan_name ?? "starter",
  );
  const selectedPlan =
    institutionPlanCards.find((plan) => plan.code === currentPlanCode) ??
    institutionPlanCards[0];
  const recommendedPlan =
    institutionPlanCards.find(
      (plan) =>
        Number(detail?.stats?.studentsCount ?? institutionCounts.students) <= plan.studentCap &&
        Number(detail?.stats?.roomsCount ?? detail?.rooms.length ?? 0) <= plan.roomCap,
    ) ?? institutionPlanCards[institutionPlanCards.length - 1];
  const billingHighlights = [
    `Plan actif: ${formatPlanLabel(currentPlanCode)}`,
    `${detail?.stats?.roomsCount ?? 0} classe(s) utilisée(s) sur ${detail?.max_rooms ?? 0}`,
    `${detail?.stats?.studentsCount ?? 0} étudiant(s) rattaché(s) sur ${detail?.max_students ?? 0}`,
    `${detail?.stats?.pendingSubmissions ?? 0} copie(s) à corriger`,
  ];
  const campusActionCards = [
    {
      title: "Structurer les classes",
      text: "Créer les salles par niveau, filière ou groupe de formation.",
    },
    {
      title: "Inviter par rôle",
      text: "Générer des liens distincts pour professeurs, étudiants et assistants.",
    },
    {
      title: "Affecter les cours",
      text: "Relier les contenus aux classes avant de diffuser devoirs et consignes.",
    },
  ];
  const adminControlCards = [
    {
      label: "Capacité classes",
      value: `${detail?.stats?.roomUsagePercentage ?? 0}%`,
      text: `${detail?.stats?.roomsCount ?? 0} classe(s) utilisées sur ${detail?.max_rooms ?? 0}.`,
      view: "classes" as InstitutionView,
    },
    {
      label: "Capacité élèves",
      value: `${detail?.stats?.studentUsagePercentage ?? 0}%`,
      text: `${detail?.stats?.studentsCount ?? 0} élève(s) rattaché(s) sur ${detail?.max_students ?? 0}.`,
      view: "accounts" as InstitutionView,
    },
    {
      label: "Comptes internes",
      value: detail?.stats?.managedAccountsCount ?? managedUsers.length,
      text: "Accès créés par l'établissement, sans inscription libre côté élève.",
      view: "accounts" as InstitutionView,
    },
    {
      label: "Cours affectés",
      value: detail?.stats?.assignedCoursesCount ?? 0,
      text: "Cours disponibles gratuitement pour les élèves des classes concernées.",
      view: "courses" as InstitutionView,
    },
    {
      label: "Copies à suivre",
      value: detail?.stats?.pendingSubmissions ?? 0,
      text: `${detail?.stats?.reviewedSubmissions ?? 0} copie(s) déjà corrigée(s).`,
      view: "classes" as InstitutionView,
    },
    {
      label: "Invitations",
      value: activeInvitesCount,
      text: "Liens actifs pour rattacher professeurs, élèves ou assistants.",
      view: "accounts" as InstitutionView,
    },
  ];

  const roomCounts = useMemo(() => {
    const members = roomDetail?.members ?? [];
    return {
      teachers: members.filter((member) => member.role === "teacher").length,
      students: members.filter((member) => member.role === "student").length,
      blockedStudents: members.filter(
        (member) =>
          member.role === "student" && member.access?.status === "blocked",
      ).length,
      assistants: members.filter((member) => member.role === "assistant").length,
    };
  }, [roomDetail]);
  const roomStudentMembers = useMemo(
    () => (roomDetail?.members ?? []).filter((member) => member.role === "student"),
    [roomDetail],
  );
  const scheduleItems = useMemo(
    () =>
      (roomDetail?.scheduleItems ?? [])
        .slice()
        .sort(
          (a, b) =>
            Number(a.weekday ?? 0) - Number(b.weekday ?? 0) ||
            String(a.starts_at ?? "").localeCompare(String(b.starts_at ?? "")),
        ),
    [roomDetail],
  );
  const attendanceSessions = roomDetail?.attendanceSessions ?? [];
  const latestAttendance = attendanceSessions[0];
  const latestAttendanceRecords = latestAttendance?.room_attendance_records ?? [];
  const presentCount = latestAttendanceRecords.filter((record) =>
    ["present", "late"].includes(String(record.status)),
  ).length;
  const attendanceRate =
    latestAttendanceRecords.length > 0
      ? Math.round((presentCount / latestAttendanceRecords.length) * 100)
      : 0;
  const roomOperationalStats = [
    {
      label: "Professeurs",
      value: roomCounts.teachers,
      text: "Enseignants qui pilotent les contenus de cette classe.",
    },
    {
      label: "Étudiants",
      value: roomCounts.students,
      text:
        roomCounts.blockedStudents > 0
          ? `${roomCounts.blockedStudents} compte(s) bloque(s) a surveiller.`
          : "Apprenants actuellement relies a cette classe.",
    },
    {
      label: "Assistants",
      value: roomCounts.assistants,
      text: "Support pedagogique ou encadrement additionnel.",
    },
    {
      label: "Contenus",
      value: roomDetail?.courses.length ?? 0,
      text: "Cours assignes a cette classe.",
    },
    {
      label: "Remises",
      value: Number(roomDetail?.submissionSummary?.total ?? 0),
      text: `${Number(roomDetail?.submissionSummary?.pending ?? 0)} en attente de correction.`,
    },
    {
      label: "Presence",
      value: latestAttendanceRecords.length > 0 ? `${attendanceRate}%` : "N/A",
      text: latestAttendance
        ? `Dernier appel: ${formatDate(latestAttendance.session_date)}.`
        : "Aucun appel enregistre pour cette classe.",
    },
  ];
  const campusAdminCards = [
    {
      title: "Direction campus",
      text:
        institutions.length > 0
          ? "Ton espace campus est deja actif. Tu peux maintenant le structurer, ajouter des comptes et diffuser les cours."
          : "Cree un premier campus Kalatty pour separer administration, classes, professeurs et etudiants.",
    },
    {
      title: "Plan recommande",
      text:
        recommendedPlan.code === currentPlanCode
          ? `${recommendedPlan.label} couvre deja la taille actuelle du campus.`
        : `${recommendedPlan.label} serait plus adapté au volume actuel des classes et étudiants.`,
    },
  ];
  const campusOperatingSteps = [
    {
      step: "01",
      title: "Créer les accès",
      text: "L'administration ajoute les élèves, professeurs et admins sans leur demander de créer eux-mêmes un compte.",
      view: "accounts" as InstitutionView,
    },
    {
      step: "02",
      title: "Organiser les classes",
      text: "Chaque salle regroupe ses étudiants, ses professeurs, son planning, ses présences et ses devoirs.",
      view: "classes" as InstitutionView,
    },
    {
      step: "03",
      title: "Affecter les cours",
      text: "Les cours liés à une classe deviennent accessibles aux élèves de cette classe sans paiement individuel.",
      view: "courses" as InstitutionView,
    },
    {
      step: "04",
      title: "Piloter le suivi",
      text: "Le responsable garde une vue globale sur devoirs, copies, blocages, invitations et utilisation du plan.",
      view: "overview" as InstitutionView,
    },
  ];
  const campusRoleCards = [
    {
      role: "Administrateur",
      count: institutionCounts.admins + institutionCounts.owners,
      title: "Pilotage et droits",
      text: "Configure le campus, crée les accès, suit les classes et contrôle l'abonnement.",
      view: "accounts" as InstitutionView,
    },
    {
      role: "Professeur",
      count: institutionCounts.teachers,
      title: "Pédagogie de classe",
      text: "Anime les cours, publie les devoirs, fait l'appel et corrige les copies.",
      view: "classes" as InstitutionView,
    },
    {
      role: "Élève",
      count: institutionCounts.students,
      title: "Apprentissage encadré",
      text: "Accède uniquement aux cours, devoirs, planning et annonces de son établissement.",
      view: "classes" as InstitutionView,
    },
  ];
  const classManagementCards = [
    {
      label: "Admin",
      title: "Superviser",
      text: "Voir les membres, les cours affectés, les devoirs, présences et blocages sans remplacer le professeur.",
    },
    {
      label: "Professeur",
      title: "Animer",
      text: "Publier le planning, donner les exercices, faire l'appel et corriger les remises depuis son espace.",
    },
    {
      label: "Élève",
      title: "Suivre",
      text: "Voir seulement les contenus de sa classe, son emploi du temps, ses devoirs et ses corrections.",
    },
  ];
  const classControlCards = [
    {
      label: "Effectif",
      value: `${roomCounts.students} élèves`,
      text:
        roomCounts.blockedStudents > 0
          ? `${roomCounts.blockedStudents} compte(s) bloqué(s) à traiter.`
          : `${roomCounts.teachers} professeur(s) et ${roomCounts.assistants} assistant(s) rattaché(s).`,
    },
    {
      label: "Pédagogie",
      value: `${roomDetail?.courses.length ?? 0} cours`,
      text: `${roomDetail?.assignments.length ?? 0} devoir(s) publiés et ${
        Number(roomDetail?.submissionSummary?.pending ?? 0)
      } copie(s) en attente.`,
    },
    {
      label: "Présence",
      value: latestAttendanceRecords.length > 0 ? `${attendanceRate}%` : "Non suivie",
      text: latestAttendance
        ? `Dernier appel le ${formatDate(latestAttendance.session_date)}.`
        : "Aucun registre d'appel encore enregistré.",
    },
  ];

  const unassignedCatalogCourses = useMemo(() => {
    const assignedIds = new Set(
      (roomDetail?.courses ?? []).map((entry) => String(entry.course?.id ?? "")),
    );

    return catalogCourses.filter((course) => !assignedIds.has(course.id));
  }, [catalogCourses, roomDetail]);

  const loadInstitutions = async () => {
    if (!token) return;

    try {
      const res = await fetch(`${apiBaseUrl}/institutions/mine`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = (await res.json()) as InstitutionSummary[];
      if (!res.ok) {
        setMessage("Impossible de charger les établissements.");
        return;
      }

      setInstitutions(data);
      if (data[0]?.id) {
        setSelectedInstitutionId((current) => current || data[0].id);
      }
    } catch {
      setMessage("Le chargement des établissements a échoué.");
    } finally {
      setLoading(false);
    }
  };

  const loadInstitutionDetails = async (institutionId: string) => {
    if (!token || !institutionId) return;

    try {
      const res = await fetch(`${apiBaseUrl}/institutions/${institutionId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = (await res.json()) as InstitutionDetail;

      if (!res.ok) {
        setMessage("Impossible de charger le détail de l'établissement.");
        return;
      }

      setDetail(data);
      const defaultRoomId = data.rooms[0]?.id || "";
      setInviteRoomId((current) => current || defaultRoomId);
      setManagedUserRoomId((current) => current || defaultRoomId);
      setSelectedRoomId((current) => current || defaultRoomId);
    } catch {
      setMessage("Le détail de l'établissement n'a pas pu être chargé.");
    }
  };

  const loadRoomDetails = async (roomId: string) => {
    if (!token || !roomId) {
      setRoomDetail(null);
      return;
    }

    try {
      const res = await fetch(`${apiBaseUrl}/institutions/rooms/${roomId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = (await res.json()) as RoomDetail;

      if (!res.ok) {
        setMessage("Impossible de charger le détail de la classe.");
        return;
      }

      setRoomDetail(data);
    } catch {
      setMessage("Le détail de la classe n'a pas pu être chargé.");
    }
  };

  useEffect(() => {
    void loadInstitutions();
  }, [apiBaseUrl, token]);

  useEffect(() => {
    if (!selectedInstitutionId) return;
    void loadInstitutionDetails(selectedInstitutionId);
  }, [apiBaseUrl, selectedInstitutionId, token]);

  useEffect(() => {
    if (!selectedRoomId) {
      setRoomDetail(null);
      return;
    }
    void loadRoomDetails(selectedRoomId);
  }, [apiBaseUrl, selectedRoomId, token]);

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/courses/discover`);
        const data = (await res.json()) as DiscoveryPayload;
        if (!res.ok) {
          return;
        }

        const merged = [...(data.featuredCourses ?? []), ...(data.topRatedCourses ?? [])];
        const uniqueCourses = merged.filter(
          (course, index, array) => array.findIndex((item) => item.id === course.id) === index,
        );
        setCatalogCourses(uniqueCourses);
      } catch {
        setCatalogCourses([]);
      }
    };

    void loadCatalog();
  }, [apiBaseUrl]);

  const handleCreateInstitution = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;

    try {
      const res = await fetch(`${apiBaseUrl}/institutions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: institutionName,
          institution_type: institutionType,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message ?? "Creation impossible.");
        return;
      }

      setInstitutions((current) => [data as InstitutionSummary, ...current]);
      setSelectedInstitutionId(String(data.id));
      setInstitutionName("");
      setInstitutionType("");
      setMessage("Etablissement cree.");
    } catch {
      setMessage("La création de l'établissement a échoué.");
    }
  };

  const handleCreateRoom = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !selectedInstitutionId) return;

    try {
      const res = await fetch(`${apiBaseUrl}/institutions/${selectedInstitutionId}/rooms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: roomName,
          description: roomDescription,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message ?? "Creation de classe impossible.");
        return;
      }

      setRoomName("");
      setRoomDescription("");
      setMessage("Classe creee.");
      await loadInstitutionDetails(selectedInstitutionId);
      setSelectedRoomId(String(data.id));
    } catch {
      setMessage("La création de la classe a échoué.");
    }
  };

  const handleAssignCourseToRoom = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !selectedRoomId || !assignedCourseId) return;

    try {
      const res = await fetch(`${apiBaseUrl}/institutions/rooms/${selectedRoomId}/courses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          course_id: assignedCourseId,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message ?? "Affectation du cours impossible.");
        return;
      }

      setAssignedCourseId("");
      setMessage("Cours affecte a la classe.");
      await loadRoomDetails(selectedRoomId);
    } catch {
      setMessage("L'affectation du cours a échoué.");
    }
  };

  const handleSetMemberStatus = async (
    memberUserId: string,
    status: "active" | "blocked",
  ) => {
    if (!token || !selectedRoomId || !memberUserId) return;

    setSavingCampusLife(true);
    try {
      const res = await fetch(
        `${apiBaseUrl}/institutions/rooms/${selectedRoomId}/members/${memberUserId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status,
            reason: status === "blocked" ? memberStatusReason : "",
          }),
        },
      );
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message ?? "Modification du statut impossible.");
        return;
      }

      setMemberStatusReason("");
      setMessage(
        status === "blocked"
          ? "Étudiant bloqué dans cette classe."
          : "Étudiant réactivé dans cette classe.",
      );
      await loadRoomDetails(selectedRoomId);
    } catch {
      setMessage("Le statut de l'etudiant n'a pas pu etre modifie.");
    } finally {
      setSavingCampusLife(false);
    }
  };

  const handleCreateInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !inviteRoomId) return;

    try {
      const res = await fetch(`${apiBaseUrl}/institutions/rooms/${inviteRoomId}/invites`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          invite_role: inviteRole,
          max_uses: 1,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message ?? "Creation du lien impossible.");
        return;
      }

      const inviteUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/invite/${data.token}`
          : data.token;

      setGeneratedLink(inviteUrl);
      setMessage("Lien d'invitation genere.");
      await loadInstitutionDetails(selectedInstitutionId);
      if (inviteRoomId === selectedRoomId) {
        await loadRoomDetails(selectedRoomId);
      }
    } catch {
      setMessage("La création du lien a échoué.");
    }
  };

  const handleProvisionManagedUser = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !selectedInstitutionId) {
        setMessage("Choisis d'abord un établissement actif.");
      return;
    }

    setProvisioningUser(true);
    setMessage("");
    setLastProvisionedAccess(null);

    try {
      const res = await fetch(
        `${apiBaseUrl}/institutions/${selectedInstitutionId}/provision-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            fullname: managedUserFullname,
            role: managedUserRole,
            level: managedUserRole === "student" ? managedUserLevel : undefined,
            expertise: managedUserRole !== "student" ? managedUserExpertise : undefined,
            room_ids: managedUserRoomId ? [managedUserRoomId] : [],
          }),
        },
      );
      const data = await res.json();

      if (!res.ok) {
        setMessage(
          typeof data.message === "string"
            ? data.message
            : "La création du compte géré a échoué.",
        );
        return;
      }

      setLastProvisionedAccess({
        loginEmail: String(data.loginEmail ?? ""),
        temporaryPassword: String(data.temporaryPassword ?? ""),
        fullname: String(data.fullname ?? managedUserFullname),
        role: String(data.role ?? managedUserRole),
      });
      setManagedUserFullname("");
      setManagedUserLevel("");
      setManagedUserExpertise("");
      setMessage("Compte gere cree avec succes.");
      await loadInstitutionDetails(selectedInstitutionId);
      if (managedUserRoomId) {
        await loadRoomDetails(managedUserRoomId);
      }
    } catch {
      setMessage("La création du compte géré a échoué.");
    } finally {
      setProvisioningUser(false);
    }
  };

  const handleResetManagedPassword = async (managedUserId: string) => {
    if (!token || !selectedInstitutionId) {
      setMessage("Choisis d'abord un établissement actif.");
      return;
    }

    setResettingManagedUserId(managedUserId);
    setMessage("");

    try {
      const res = await fetch(
        `${apiBaseUrl}/institutions/${selectedInstitutionId}/managed-users/${managedUserId}/reset-password`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const data = await res.json();

      if (!res.ok) {
        setMessage(
          typeof data.message === "string"
            ? data.message
            : "La régénération du mot de passe a échoué.",
        );
        return;
      }

      setLastProvisionedAccess({
        loginEmail: String(data.loginEmail ?? ""),
        temporaryPassword: String(data.temporaryPassword ?? ""),
        fullname: "Compte gere",
        role: "reset",
      });
      setMessage("Mot de passe provisoire regenere.");
      await loadInstitutionDetails(selectedInstitutionId);
    } catch {
      setMessage("La régénération du mot de passe a échoué.");
    } finally {
      setResettingManagedUserId("");
    }
  };

  const handleActivatePlan = async (planName: string) => {
    if (!token || !selectedInstitutionId) return;

    setBillingLoading(true);
    setMessage("");

    try {
      const checkoutRes = await fetch(
        `${apiBaseUrl}/payments/institutions/${selectedInstitutionId}/checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ planName }),
        },
      );
      const checkoutData = await checkoutRes.json();

      if (!checkoutRes.ok) {
        setMessage(checkoutData.message ?? "Preparation de l'abonnement impossible.");
        return;
      }

      const activateRes = await fetch(
        `${apiBaseUrl}/payments/institutions/${selectedInstitutionId}/activate-demo`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ planName }),
        },
      );
      const activateData = await activateRes.json();

      if (!activateRes.ok) {
        setMessage(activateData.message ?? "Activation de l'abonnement impossible.");
        return;
      }

      setMessage(
        `Abonnement ${checkoutData.plan?.label ?? planName} active. Capacite disponible: ${activateData.plan?.maxStudents ?? 0} apprenants et ${activateData.plan?.maxRooms ?? 0} classes.`,
      );
      await loadInstitutions();
      await loadInstitutionDetails(selectedInstitutionId);
    } catch {
      setMessage("L'activation de l'abonnement a échoué.");
    } finally {
      setBillingLoading(false);
    }
  };

  if (loading) {
    return (
      <section className={styles.grid}>
        <section className={styles.card}>
          <h2>Chargement de l&apos;espace établissement...</h2>
        </section>
      </section>
    );
  }

  return (
    <section className={styles.grid}>
      <div className={styles.primaryColumn}>
        <section className={styles.card}>
          <div className={styles.institutionHeroV2}>
            <div className={styles.institutionHeroLead}>
              <p className={styles.sectionLabel}>Pilotage établissement</p>
              <h2>{selectedInstitution?.name || "Espace établissement"}</h2>
              <p className={styles.paragraph}>
                Gère les classes, les comptes internes, les cours attribués et le
                suivi pédagogique depuis un seul espace.
              </p>
              <div className={styles.courseMetaGrid}>
                <span>{detail?.rooms.length ?? 0} classes actives</span>
                <span>{activeInvitesCount} liens encore valides</span>
                <span>{catalogCourses.length} cours disponibles</span>
              </div>
            </div>

            <div className={styles.institutionHeroStack}>
              <article className={styles.institutionHeroBadge}>
                <span>Plan</span>
                <strong>{formatPlanLabel(selectedInstitution?.plan_name)}</strong>
              </article>
              <article className={styles.institutionHeroBadge}>
                <span>Statut</span>
                <strong>{formatSubscriptionStatus(selectedInstitution?.subscription_status)}</strong>
              </article>
              <article className={styles.institutionHeroBadge}>
                <span>Type</span>
                <strong>{selectedInstitution?.institution_type || "Établissement"}</strong>
              </article>
            </div>
          </div>

          <div className={styles.institutionToolbarExpanded}>
            <label className={styles.searchBar}>
              <span>Recherche campus</span>
              <input
                type="search"
                placeholder="Classes, devoirs, liens, organisation"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>

            <label className={styles.formField}>
              <span>Établissement actif</span>
              <select
                className={styles.selectField}
                value={selectedInstitutionId}
                onChange={(event) => setSelectedInstitutionId(event.target.value)}
              >
                <option value="">Choisir</option>
                {institutions.map((institution) => (
                  <option key={institution.id} value={institution.id}>
                    {institution.name}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.formField}>
              <span>Classe active</span>
              <select
                className={styles.selectField}
                value={selectedRoomId}
                onChange={(event) => setSelectedRoomId(event.target.value)}
              >
                <option value="">Choisir</option>
                {(detail?.rooms ?? []).map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className={styles.institutionStatsGrid}>
            {campusQuickStats.map((stat) => (
              <article key={stat.label} className={styles.institutionStatCard}>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
                <small>{stat.note}</small>
              </article>
            ))}
          </div>

          <div
            className={styles.campusOperatingMap}
            aria-label="Parcours de gestion établissement"
          >
            <div className={styles.campusOperatingIntro}>
              <span>Mode administration</span>
              <strong>Gérer l'école en ligne, étape par étape.</strong>
              <p>
                L'administrateur pilote l'organisation. Les professeurs se
                concentrent ensuite sur leurs classes, les devoirs et le suivi.
              </p>
            </div>
            <div className={styles.campusOperatingSteps}>
              {campusOperatingSteps.map((item) => (
                <button
                  key={item.step}
                  type="button"
                  className={styles.campusOperatingStep}
                  onClick={() => setActiveView(item.view)}
                >
                  <span>{item.step}</span>
                  <strong>{item.title}</strong>
                  <small>{item.text}</small>
                </button>
              ))}
            </div>
          </div>

          <div className={`${styles.studentTabs} ${styles.desktopViewTabs}`}>
            <button
              type="button"
              className={activeView === "overview" ? styles.activeTab : styles.studentTab}
              onClick={() => setActiveView("overview")}
            >
              Vue d&apos;ensemble
            </button>
            <button
              type="button"
              className={activeView === "accounts" ? styles.activeTab : styles.studentTab}
              onClick={() => setActiveView("accounts")}
            >
              Comptes
            </button>
            <button
              type="button"
              className={activeView === "classes" ? styles.activeTab : styles.studentTab}
              onClick={() => setActiveView("classes")}
            >
              Classes
            </button>
            <button
              type="button"
              className={activeView === "courses" ? styles.activeTab : styles.studentTab}
              onClick={() => setActiveView("courses")}
            >
              Cours
            </button>
            <button
              type="button"
              className={activeView === "billing" ? styles.activeTab : styles.studentTab}
              onClick={() => setActiveView("billing")}
            >
              Abonnement
            </button>
            <button
              type="button"
              className={activeView === "settings" ? styles.activeTab : styles.studentTab}
              onClick={() => setActiveView("settings")}
            >
              Paramètres
            </button>
          </div>
        </section>

        {activeView === "overview" ? (
          <section
            className={styles.adminControlTower}
            aria-label="Tableau de pilotage administrateur"
          >
            <div className={styles.adminControlIntro}>
              <span>Console administrateur</span>
              <h2>Diriger le campus sans mélanger les rôles.</h2>
              <p>
                L&apos;admin organise, contrôle et supervise. Les professeurs
                gardent les actions pédagogiques quotidiennes dans leurs classes.
              </p>
            </div>

            <div className={styles.adminControlGrid}>
              {adminControlCards.map((card) => (
                <button
                  key={card.label}
                  type="button"
                  className={styles.adminControlCard}
                  onClick={() => setActiveView(card.view)}
                >
                  <span>{card.label}</span>
                  <strong>{card.value}</strong>
                  <small>{card.text}</small>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {activeView === "settings" ? (
          <section className={`${styles.grid} ${styles.singleColumn}`}>
            <PasswordSettings apiBaseUrl={apiBaseUrl} />
          </section>
        ) : null}

        {activeView === "billing" ? (
        <section className={styles.card}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionLabel}>Abonnement</p>
              <h2>Choisir le bon plan pour ton campus</h2>
            </div>
            <span className={styles.sectionHint}>
              Lis les capacités, compare l&apos;usage actuel et active le niveau adapté à ton établissement.
            </span>
          </div>

          <div className={styles.statsRow}>
            <article className={styles.statCard}>
              <span>Plan actif</span>
              <strong>{selectedPlan.label}</strong>
              <small>{formatSubscriptionStatus(detail?.subscription_status ?? selectedInstitution?.subscription_status)}</small>
            </article>
            <article className={styles.statCard}>
              <span>Classes utilisées</span>
              <strong>{detail?.stats?.roomUsagePercentage ?? 0}%</strong>
              <small>{detail?.stats?.roomsCount ?? 0} / {detail?.max_rooms ?? 0}</small>
            </article>
            <article className={styles.statCard}>
              <span>Comptes etudiants utilises</span>
              <strong>{detail?.stats?.studentUsagePercentage ?? 0}%</strong>
              <small>{detail?.stats?.studentsCount ?? 0} / {detail?.max_students ?? 0}</small>
            </article>
            <article className={styles.statCard}>
              <span>Copies à corriger</span>
              <strong>{detail?.stats?.pendingSubmissions ?? 0}</strong>
              <small>{detail?.stats?.reviewedSubmissions ?? 0} déjà traitées</small>
            </article>
          </div>

          <div className={styles.institutionActionGrid}>
            <section className={styles.card}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.sectionLabel}>Lecture rapide</p>
                  <h3>Ce que ton abonnement couvre</h3>
                </div>
              </div>
              <div className={styles.roadmapList}>
                {billingHighlights.map((item) => (
                  <article key={item} className={styles.roadmapItem}>
                    <strong>{item}</strong>
                    <p>Ces chiffres t&apos;aident a voir rapidement s&apos;il faut garder le plan actuel ou passer au niveau suivant.</p>
                  </article>
                ))}
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.sectionLabel}>Recommendation</p>
                  <h3>Plan conseille aujourd&apos;hui</h3>
                </div>
              </div>
              <div className={styles.roadmapList}>
                <article className={styles.roadmapItem}>
                  <strong>{recommendedPlan.label}</strong>
                  <p>{recommendedPlan.target}</p>
                  <small>
                    {recommendedPlan.studentCap} apprenants | {recommendedPlan.roomCap} classes
                  </small>
                </article>
              </div>
            </section>
          </div>

          <div className={styles.institutionRoomBoard}>
            {institutionPlanCards.map((plan) => (
              <article key={plan.code} className={styles.institutionRoomBoardCard}>
                <div className={styles.institutionRoomBoardTop}>
                  <span>Plan {plan.label}</span>
                  <small>{formatCurrency(plan.amountFcfa)}</small>
                </div>
                <h3>{plan.highlight}</h3>
                <p>{plan.target}</p>
                <div className={styles.courseMetaGrid}>
                  <span>{plan.studentCap} apprenants</span>
                  <span>{plan.roomCap} classes</span>
                  <span>
                    {plan.code === (detail?.plan_name ?? selectedInstitution?.plan_name)
                      ? "Plan actuel"
                      : "Disponible"}
                  </span>
                </div>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  disabled={billingLoading || !selectedInstitutionId}
                  onClick={() => void handleActivatePlan(plan.code)}
                >
                  {billingLoading
                    ? "Activation..."
                    : plan.code === currentPlanCode
                      ? `${plan.label} actif`
                      : recommendedPlan.code === plan.code
                        ? `Passer a ${plan.label}`
                        : `Choisir ${plan.label}`}
                </button>
              </article>
            ))}
          </div>
        </section>
        ) : null}

        {activeView === "classes" ? (
        <section className={styles.card}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionLabel}>Classes du campus</p>
              <h2>Classes et groupes</h2>
            </div>
            <span className={styles.sectionHint}>
              Chaque classe peut recevoir des professeurs, des eleves, des cours et des devoirs.
            </span>
          </div>

          <div className={styles.classManagementStrip}>
            {classManagementCards.map((card) => (
              <article key={card.label} className={styles.classManagementCard}>
                <span>{card.label}</span>
                <strong>{card.title}</strong>
                <p>{card.text}</p>
              </article>
            ))}
          </div>

          <div className={styles.institutionRoomBoard}>
            {filteredRooms.length > 0 ? (
              filteredRooms.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  className={
                    selectedRoomId === room.id
                      ? styles.institutionRoomBoardActive
                      : styles.institutionRoomBoardCard
                  }
                  onClick={() => setSelectedRoomId(room.id)}
                >
                  <div className={styles.institutionRoomBoardTop}>
                    <span>Classe</span>
                    <small>#{room.slug || "sans-slug"}</small>
                  </div>
                  <h3>{room.name}</h3>
                  <p>{room.description || "Classe prete a recevoir cours, devoirs et membres."}</p>
                </button>
              ))
            ) : (
              <p className={styles.paragraph}>Aucune classe ne correspond a cette recherche.</p>
            )}
          </div>
        </section>
        ) : null}

        {activeView === "accounts" ? (
        <section className={styles.card}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionLabel}>Comptes campus</p>
              <h2>Élèves et professeurs créés par l&apos;établissement</h2>
            </div>
            <span className={styles.sectionHint}>
              Ici, l&apos;ecole cree directement les acces sans attendre une inscription externe.
            </span>
          </div>

          <div className={styles.accountRoleMatrix}>
            {campusRoleCards.map((card) => (
              <button
                key={card.role}
                type="button"
                className={styles.accountRoleCard}
                onClick={() => setActiveView(card.view)}
              >
                <span>{card.role}</span>
                <strong>{card.count}</strong>
                <b>{card.title}</b>
                <small>{card.text}</small>
              </button>
            ))}
          </div>

          <div className={styles.institutionActionGrid}>
            <section className={styles.card}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.sectionLabel}>Provisionnement</p>
                  <h3>Créer un compte géré</h3>
                </div>
              </div>
              <form onSubmit={handleProvisionManagedUser} className={styles.teacherForm}>
                <label className={styles.formField}>
                  <span>Nom complet</span>
                  <input
                    type="text"
                    value={managedUserFullname}
                    onChange={(event) => setManagedUserFullname(event.target.value)}
                    placeholder="Marie Ndongo"
                  />
                </label>
                <div className={styles.metaFields}>
                  <label className={styles.formField}>
                    <span>Role</span>
                    <select
                      className={styles.selectField}
                      value={managedUserRole}
                      onChange={(event) =>
                        setManagedUserRole(
                          event.target.value as "student" | "teacher" | "admin",
                        )
                      }
                    >
                      <option value="student">Étudiant</option>
                      <option value="teacher">Professeur</option>
                      <option value="admin">Administrateur</option>
                    </select>
                  </label>
                  <label className={styles.formField}>
                    <span>Classe de rattachement</span>
                    <select
                      className={styles.selectField}
                      value={managedUserRoomId}
                      onChange={(event) => setManagedUserRoomId(event.target.value)}
                    >
                      <option value="">Aucune classe pour l&apos;instant</option>
                      {(detail?.rooms ?? []).map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {managedUserRole === "student" ? (
                  <label className={styles.formField}>
                    <span>Niveau / filiere</span>
                    <input
                      type="text"
                      value={managedUserLevel}
                      onChange={(event) => setManagedUserLevel(event.target.value)}
                      placeholder="Terminale C, Licence 1, BTS..."
                    />
                  </label>
                ) : (
                  <label className={styles.formField}>
                    <span>Matiere / expertise</span>
                    <input
                      type="text"
                      value={managedUserExpertise}
                      onChange={(event) => setManagedUserExpertise(event.target.value)}
                      placeholder="Maths, Histoire, Informatique..."
                    />
                  </label>
                )}
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={provisioningUser}
                >
                  {provisioningUser ? "Création..." : "Créer le compte"}
                </button>
              </form>
              {lastProvisionedAccess ? (
                <div className={styles.inlineAssetStatus}>
                  Identifiant: {lastProvisionedAccess.loginEmail} | Mot de passe provisoire:{" "}
                  {lastProvisionedAccess.temporaryPassword}
                </div>
              ) : null}
            </section>

            <section className={styles.card}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.sectionLabel}>Registre</p>
                  <h3>Comptes déjà créés</h3>
                </div>
              </div>
              <div className={styles.roadmapList}>
                {filteredManagedUsers.length > 0 ? (
                  filteredManagedUsers.map((managedUser) => (
                    <article key={managedUser.id} className={styles.roadmapItem}>
                      <strong>{managedUser.full_name}</strong>
                      <p>
                        {formatRoleLabel(managedUser.managed_role)} | {managedUser.login_email}
                      </p>
                      <small>
                        {managedUser.profiles?.level || managedUser.profiles?.expertise || "Profil interne"}
                        {" | "}
                        {managedUser.must_reset_password
                          ? "Mot de passe provisoire actif"
                          : "Accès actif"}
                      </small>
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        disabled={resettingManagedUserId === managedUser.id}
                        onClick={() => void handleResetManagedPassword(managedUser.id)}
                      >
                        {resettingManagedUserId === managedUser.id
                          ? "Regeneration..."
                          : "Regenerer le mot de passe"}
                      </button>
                    </article>
                  ))
                ) : (
                  <p className={styles.paragraph}>
                    Aucun compte géré n&apos;est encore créé pour cet établissement.
                  </p>
                )}
              </div>
            </section>
          </div>
        </section>
        ) : null}

        {roomDetail && activeView === "classes" ? (
          <section className={styles.card}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionLabel}>Dossier de classe</p>
                <h2>{roomDetail.name}</h2>
              </div>
              <span className={styles.sectionHint}>
                {roomDetail.slug ? `#${roomDetail.slug}` : "Classe sans slug"}
              </span>
            </div>

            <div className={styles.classControlDeck}>
              <article className={styles.classControlLead}>
                <span>Supervision admin</span>
                <strong>Une vue complète sans remplacer le professeur.</strong>
                <p>
                  L'administration garde le contrôle des accès, de la sécurité,
                  des affectations et du suivi global. Les actions pédagogiques
                  quotidiennes restent côté professeur.
                </p>
              </article>
              <div className={styles.classControlCards}>
                {classControlCards.map((card) => (
                  <article key={card.label} className={styles.classControlCard}>
                    <span>{card.label}</span>
                    <strong>{card.value}</strong>
                    <p>{card.text}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className={styles.institutionOpsGrid}>
              {roomOperationalStats.map((stat) => (
                <article key={stat.label} className={styles.institutionOpsCard}>
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                  <p>{stat.text}</p>
                </article>
              ))}
            </div>

            <p className={styles.inlineMessage}>
              Vue administrateur: vous gardez la supervision, les droits et la
              securite. Les devoirs, l&apos;appel et les ajustements de planning
              restent dans l&apos;espace des professeurs rattachés à la classe.
            </p>

            <div className={styles.institutionStudioGrid}>
              <section className={styles.institutionStudioPanel}>
                <div className={styles.sectionHeader}>
                  <div>
                    <p className={styles.sectionLabel}>Equipe de classe</p>
                    <h3>Professeurs et etudiants</h3>
                  </div>
                </div>
                {roomStudentMembers.length > 0 ? (
                  <div className={styles.institutionMemberAdminBar}>
                    <label className={styles.formField}>
                      <span>Motif applique au prochain blocage</span>
                      <input
                        type="text"
                        value={memberStatusReason}
                        onChange={(event) =>
                          setMemberStatusReason(event.target.value)
                        }
                        placeholder="Ex: frais en attente, discipline, verification administrative"
                      />
                    </label>
                    <small>
                      Ce motif sera uniquement utilise si vous bloquez un etudiant.
                    </small>
                  </div>
                ) : null}
                <div className={styles.institutionMemberGrid}>
                  {roomDetail.members.length > 0 ? (
                    roomDetail.members.map((member) => (
                      <article key={member.id} className={styles.institutionMemberCardWide}>
                        <strong>
                          {member.profile?.fullname || member.profile?.email || "Membre"}
                        </strong>
                        <span>{formatRoleLabel(member.role)}</span>
                        <small>{member.profile?.email || "Email non visible"}</small>
                        {member.role === "student" ? (
                          <>
                            <small>
                              Statut:{" "}
                              {member.access?.status === "blocked"
                                ? "bloque"
                                : "actif"}
                              {member.access?.reason
                                ? ` | ${member.access.reason}`
                                : ""}
                            </small>
                            <div className={styles.courseActionRow}>
                              {member.access?.status === "blocked" ? (
                                <button
                                  type="button"
                                  className={styles.secondaryButton}
                                  disabled={savingCampusLife}
                                  onClick={() =>
                                    void handleSetMemberStatus(
                                      String(member.profile?.id ?? ""),
                                      "active",
                                    )
                                  }
                                >
                                  Reactiver
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className={styles.secondaryButton}
                                  disabled={savingCampusLife}
                                  onClick={() =>
                                    void handleSetMemberStatus(
                                      String(member.profile?.id ?? ""),
                                      "blocked",
                                    )
                                  }
                                >
                                  Bloquer
                                </button>
                              )}
                            </div>
                          </>
                        ) : null}
                      </article>
                    ))
                  ) : (
                    <p className={styles.paragraph}>Aucun membre encore relie a cette classe.</p>
                  )}
                </div>
              </section>

              <section className={styles.institutionStudioPanel}>
                <div className={styles.sectionHeader}>
                  <div>
                    <p className={styles.sectionLabel}>Cours de la classe</p>
                    <h3>Catalogue affecte</h3>
                  </div>
                </div>
                <div className={styles.institutionCourseBoard}>
                  {roomDetail.courses.length > 0 ? (
                    roomDetail.courses.map((entry) => (
                      <article key={entry.id} className={styles.institutionCourseCard}>
                        <strong>{entry.course?.title || "Cours"}</strong>
                        <p>
                          {entry.course?.short_description ||
                            entry.course?.description ||
                            "Cours affecte a la classe."}
                        </p>
                        <small>{Number(entry.course?.price_fcfa ?? 0)} FCFA</small>
                      </article>
                    ))
                  ) : (
                    <p className={styles.paragraph}>Aucun cours encore attribue a cette classe.</p>
                  )}
                </div>
              </section>
            </div>

            <div className={styles.institutionStudioGrid}>
              <section className={styles.institutionStudioPanel}>
                <div className={styles.sectionHeader}>
                  <div>
                    <p className={styles.sectionLabel}>Emploi du temps</p>
                    <h3>Semaine publiee</h3>
                  </div>
                </div>
                <p className={styles.paragraph}>
                  L&apos;administration supervise les creneaux. La publication et
                  les ajustements quotidiens doivent rester dans l&apos;espace du
                  professeur rattaché à la classe.
                </p>
                <div className={styles.roadmapList}>
                  {scheduleItems.length > 0 ? (
                    scheduleItems.map((item) => (
                      <article key={item.id} className={styles.roadmapItem}>
                        <strong>{item.title}</strong>
                        <p>
                          {weekdayLabels[Number(item.weekday ?? 1) - 1] ??
                            "Jour"}
                          {" | "}
                          {String(item.starts_at).slice(0, 5)}
                          {item.ends_at
                            ? ` - ${String(item.ends_at).slice(0, 5)}`
                            : ""}
                        </p>
                        <small>{item.location || "Lieu non precise"}</small>
                      </article>
                    ))
                  ) : (
                    <p className={styles.paragraph}>
                      Aucun creneau publie pour cette classe.
                    </p>
                  )}
                </div>
              </section>

              <section className={styles.institutionStudioPanel}>
                <div className={styles.sectionHeader}>
                  <div>
                    <p className={styles.sectionLabel}>Presence</p>
                    <h3>Registre d&apos;appel</h3>
                  </div>
                </div>
                <p className={styles.paragraph}>
                  Les appels sont consultables par l&apos;admin, mais doivent etre
                  effectues par les professeurs depuis leur espace classe.
                </p>
                <div className={styles.roadmapList}>
                  {attendanceSessions.length > 0 ? (
                    attendanceSessions.slice(0, 4).map((session) => (
                      <article key={session.id} className={styles.roadmapItem}>
                        <strong>{session.title}</strong>
                        <p>{formatDate(session.session_date)}</p>
                        <small>
                          {(session.room_attendance_records ?? []).length} marque(s)
                        </small>
                      </article>
                    ))
                  ) : (
                    <p className={styles.paragraph}>
                      Aucun appel enregistre pour le moment.
                    </p>
                  )}
                </div>
              </section>
            </div>

            <div className={styles.institutionStudioGrid}>
              <section className={styles.institutionStudioPanel}>
                <div className={styles.sectionHeader}>
                  <div>
                    <p className={styles.sectionLabel}>Travaux</p>
                    <h3>Devoirs et exercices</h3>
                  </div>
                </div>
                <div className={styles.roadmapList}>
                  {roomDetail.assignments.length > 0 ? (
                    roomDetail.assignments.map((assignment) => (
                      <article key={assignment.id} className={styles.roadmapItem}>
                        <strong>{assignment.title}</strong>
                        <p>{assignment.instructions || "Aucune consigne détaillée."}</p>
                        <small>
                          {assignment.status} | {formatDate(assignment.due_at)}
                        </small>
                        {(assignment.files ?? []).length > 0 ? (
                          <small>
                            Piece jointe:{" "}
                            {assignment.files?.[0]?.name ?? "Document"}
                          </small>
                        ) : null}
                        <small>
                          {Number(assignment.submissionCount ?? 0)} remises |{" "}
                          {Number(assignment.pendingCount ?? 0)} à corriger |{" "}
                          {Number(assignment.reviewedCount ?? 0)} corrigees
                        </small>
                      </article>
                    ))
                  ) : (
                    <p className={styles.paragraph}>Aucun devoir publie dans cette classe.</p>
                  )}
                </div>
              </section>

              <section className={styles.institutionStudioPanel}>
                <div className={styles.sectionHeader}>
                  <div>
                    <p className={styles.sectionLabel}>Liens d&apos;invitation</p>
                    <h3>Accès par rôle</h3>
                  </div>
                </div>
                <div className={styles.roadmapList}>
                  {roomDetail.invites.length > 0 ? (
                    roomDetail.invites.map((invite) => (
                      <article key={invite.id} className={styles.institutionInviteCard}>
                        <strong>{formatRoleLabel(invite.invite_role)}</strong>
                        <p>{invite.token}</p>
                        <small>
                          {invite.used_count}/{invite.max_uses} utilisation |{" "}
                          {invite.is_active ? "actif" : "clos"}
                        </small>
                      </article>
                    ))
                  ) : (
                    <p className={styles.paragraph}>Aucun lien encore genere pour cette classe.</p>
                  )}
                </div>
              </section>
            </div>

            <div className={styles.institutionStudioGrid}>
              <section className={styles.institutionStudioPanel}>
                <div className={styles.sectionHeader}>
                  <div>
                    <p className={styles.sectionLabel}>Suivi des remises</p>
                    <h3>Copies recentes de la classe</h3>
                  </div>
                </div>
                <div className={styles.roadmapList}>
                  {(roomDetail.recentSubmissions ?? []).length > 0 ? (
                    (roomDetail.recentSubmissions ?? []).map((submission) => (
                      <article key={submission.id} className={styles.roadmapItem}>
                        <strong>{submission.studentName}</strong>
                        <p>{submission.assignmentTitle}</p>
                        <small>
                          {submission.status} | {formatDate(submission.submittedAt)}
                          {submission.score !== null && submission.score !== undefined
                            ? ` | score ${submission.score}`
                            : ""}
                        </small>
                      </article>
                    ))
                  ) : (
                    <p className={styles.paragraph}>Aucune copie n&apos;a encore ete remise dans cette classe.</p>
                  )}
                </div>
              </section>

              <section className={styles.institutionStudioPanel}>
                <div className={styles.sectionHeader}>
                  <div>
                    <p className={styles.sectionLabel}>Synthese correction</p>
                    <h3>Etat global des devoirs</h3>
                  </div>
                </div>
                <div className={styles.institutionStatsGrid}>
                  <article className={styles.institutionStatCard}>
                    <span>Total remises</span>
                    <strong>{Number(roomDetail.submissionSummary?.total ?? 0)}</strong>
                    <small>Toutes copies confondues</small>
                  </article>
                  <article className={styles.institutionStatCard}>
                    <span>À corriger</span>
                    <strong>{Number(roomDetail.submissionSummary?.pending ?? 0)}</strong>
                    <small>Demandent une revue enseignant</small>
                  </article>
                  <article className={styles.institutionStatCard}>
                    <span>Corrigees</span>
                    <strong>{Number(roomDetail.submissionSummary?.reviewed ?? 0)}</strong>
                    <small>Copies deja traitees</small>
                  </article>
                </div>
              </section>
            </div>
          </section>
        ) : null}

        {activeView === "classes" ? (
        <section className={styles.institutionActionGrid}>
          <section className={styles.card}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionLabel}>Nouvelle classe</p>
                <h2>Créer une classe</h2>
              </div>
            </div>
            <form onSubmit={handleCreateRoom} className={styles.teacherForm}>
              <label className={styles.formField}>
                <span>Nom de la classe</span>
                <input
                  type="text"
                  value={roomName}
                  onChange={(event) => setRoomName(event.target.value)}
                  placeholder="Licence 1 Informatique"
                />
              </label>
              <label className={styles.formField}>
                <span>Description</span>
                <textarea
                  className={styles.formTextarea}
                  rows={4}
                  value={roomDescription}
                  onChange={(event) => setRoomDescription(event.target.value)}
                  placeholder="Filiere, niveau, objectif pedagogique et organisation"
                />
              </label>
              <button type="submit" className={styles.submitButton}>
                Créer la classe
              </button>
            </form>
          </section>
        </section>
        ) : null}

        {activeView === "courses" ? (
        <section className={styles.institutionActionGrid}>
          <section className={styles.card}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionLabel}>Affectation</p>
                <h2>Donner un cours a la classe</h2>
              </div>
            </div>
            <form onSubmit={handleAssignCourseToRoom} className={styles.teacherForm}>
              <label className={styles.formField}>
                <span>Classe cible</span>
                <select
                  className={styles.selectField}
                  value={selectedRoomId}
                  onChange={(event) => setSelectedRoomId(event.target.value)}
                >
                  <option value="">Choisir une classe</option>
                  {(detail?.rooms ?? []).map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.formField}>
                <span>Cours a affecter</span>
                <select
                  className={styles.selectField}
                  value={assignedCourseId}
                  onChange={(event) => setAssignedCourseId(event.target.value)}
                >
                  <option value="">Choisir un cours</option>
                  {unassignedCatalogCourses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title} - {course.teacherName}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className={styles.submitButton}>
                Affecter le cours
              </button>
            </form>
          </section>
        </section>
        ) : null}

        {activeView === "accounts" ? (
        <section className={styles.institutionActionGrid}>
          <section className={styles.card}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionLabel}>Séparation des rôles</p>
                <h2>Admin, professeurs et eleves</h2>
              </div>
            </div>
            <div className={styles.roadmapList}>
              <article className={styles.roadmapItem}>
                <strong>Administrateur</strong>
                <p>Créer les comptes, structurer les classes, affecter les cours, bloquer ou réactiver un élève.</p>
              </article>
              <article className={styles.roadmapItem}>
                <strong>Professeur</strong>
                <p>Publier les devoirs, faire l&apos;appel, ajuster le planning et suivre les copies de ses classes.</p>
              </article>
              <article className={styles.roadmapItem}>
                <strong>Étudiant</strong>
                <p>Accéder uniquement aux cours, devoirs, planning et annonces de son établissement.</p>
              </article>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionLabel}>Invitations</p>
                <h2>Ajouter professeurs et etudiants</h2>
              </div>
            </div>
            <form onSubmit={handleCreateInvite} className={styles.teacherForm}>
              <div className={styles.metaFields}>
                <label className={styles.formField}>
                  <span>Classe cible</span>
                  <select
                    className={styles.selectField}
                    value={inviteRoomId}
                    onChange={(event) => setInviteRoomId(event.target.value)}
                  >
                    <option value="">Choisir une classe</option>
                    {(detail?.rooms ?? []).map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.formField}>
                  <span>Role invite</span>
                  <select
                    className={styles.selectField}
                    value={inviteRole}
                    onChange={(event) =>
                      setInviteRole(
                        event.target.value as "student" | "teacher" | "assistant",
                      )
                    }
                  >
                    <option value="student">Étudiant</option>
                    <option value="teacher">Professeur</option>
                    <option value="assistant">Assistant</option>
                  </select>
                </label>
              </div>

              <button type="submit" className={styles.submitButton}>
                Générer un lien d&apos;invitation
              </button>
            </form>

            {generatedLink ? (
              <div className={styles.inviteLinkBox}>
                <strong>Lien pret a partager</strong>
                <p>{generatedLink}</p>
              </div>
            ) : null}
          </section>
        </section>
        ) : null}

        {activeView === "overview" ? (
        <section className={styles.card}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionLabel}>Journal campus</p>
              <h2>Devoirs et liens recents</h2>
            </div>
          </div>
          <div className={styles.institutionFeedGrid}>
            <section className={styles.institutionStudioPanel}>
              <h3>Devoirs recents</h3>
              <div className={styles.roadmapList}>
                {filteredAssignments.length > 0 ? (
                  filteredAssignments.slice(0, 6).map((assignment) => (
                    <article key={assignment.id} className={styles.roadmapItem}>
                      <strong>{assignment.title}</strong>
                      <p>{roomLookup.get(assignment.room_id) || "Classe"}</p>
                      <small>{assignment.status} | {formatDate(assignment.due_at)}</small>
                    </article>
                  ))
                ) : (
                  <p className={styles.paragraph}>Aucun devoir ne correspond a la recherche.</p>
                )}
              </div>
            </section>

            <section className={styles.institutionStudioPanel}>
              <h3>Liens actifs</h3>
              <div className={styles.roadmapList}>
                {filteredInvites.length > 0 ? (
                  filteredInvites.slice(0, 6).map((invite) => (
                    <article key={invite.id} className={styles.institutionInviteCard}>
                      <strong>{formatRoleLabel(invite.invite_role)}</strong>
                      <p>{roomLookup.get(invite.room_id) || "Classe inconnue"}</p>
                      <small>
                        {invite.used_count}/{invite.max_uses} utilisation |{" "}
                        {invite.is_active ? "actif" : "clos"}
                      </small>
                    </article>
                  ))
                ) : (
                  <p className={styles.paragraph}>Aucun lien ne correspond a la recherche.</p>
                )}
              </div>
            </section>
          </div>
        </section>
        ) : null}
      </div>

      <div className={styles.sideColumn}>
        {activeView === "overview" ? (
        <section className={styles.cardAccent}>
          <p className={styles.sectionLabel}>Campus</p>
          <h2>{institutions.length > 0 ? "Pilotage administrateur" : "Créer un établissement"}</h2>
          {institutions.length > 0 ? (
            <div className={styles.roadmapList}>
              {campusAdminCards.map((card) => (
                <article key={card.title} className={styles.roadmapItem}>
                  <strong>{card.title}</strong>
                  <p>{card.text}</p>
                </article>
              ))}
            </div>
          ) : (
            <form onSubmit={handleCreateInstitution} className={styles.teacherForm}>
              <label className={styles.formField}>
                <span>Nom de l&apos;établissement</span>
                <input
                  type="text"
                  value={institutionName}
                  onChange={(event) => setInstitutionName(event.target.value)}
                  placeholder="Institut Horizon"
                />
              </label>
              <label className={styles.formField}>
                <span>Type</span>
                <input
                  type="text"
                  value={institutionType}
                  onChange={(event) => setInstitutionType(event.target.value)}
                  placeholder="Lycee, universite, centre"
                />
              </label>
              <button type="submit" className={styles.submitButton}>
                Créer l&apos;établissement
              </button>
            </form>
          )}
        </section>
        ) : null}

        {(activeView === "overview" || activeView === "accounts") ? (
        <section className={styles.card}>
          <p className={styles.sectionLabel}>Annuaire campus</p>
          <h2>Répartition des rôles</h2>
          <div className={styles.roadmapList}>
            <article className={styles.roadmapItem}>
              <strong>{institutionCounts.teachers} professeurs</strong>
              <p>Encadrent les cours et les devoirs des classes attribuees.</p>
            </article>
            <article className={styles.roadmapItem}>
              <strong>{institutionCounts.students} etudiants</strong>
              <p>Peuvent recevoir un accès généré directement par l&apos;établissement.</p>
            </article>
            <article className={styles.roadmapItem}>
              <strong>{institutionCounts.admins + institutionCounts.owners} administrateurs</strong>
              <p>Pilotent l&apos;organisation globale du campus.</p>
            </article>
          </div>
        </section>
        ) : null}

        {activeView === "overview" ? (
        <section className={styles.card}>
          <p className={styles.sectionLabel}>Recommandations produit</p>
          <h2>Actions prioritaires</h2>
          <div className={styles.roadmapList}>
            {campusActionCards.map((card) => (
              <article key={card.title} className={styles.roadmapItem}>
                <strong>{card.title}</strong>
                <p>{card.text}</p>
              </article>
            ))}
          </div>
        </section>
        ) : null}

        {(activeView === "overview" || activeView === "courses") ? (
        <section className={styles.card}>
          <p className={styles.sectionLabel}>Catalogue</p>
          <h2>Cours disponibles a affecter</h2>
          <div className={styles.roadmapList}>
            {catalogCourses.length > 0 ? (
              catalogCourses.slice(0, 5).map((course) => (
                <article key={course.id} className={styles.roadmapItem}>
                  <strong>{course.title}</strong>
                  <p>{course.teacherName} | {course.lessonsCount} lecons</p>
                  <small>{course.courseRatingAverage.toFixed(1)}/5</small>
                </article>
              ))
            ) : (
              <p className={styles.paragraph}>Le catalogue public n&apos;est pas encore charge.</p>
            )}
          </div>
        </section>
        ) : null}

        {activeView === "billing" ? (
        <section className={styles.cardAccent}>
          <p className={styles.sectionLabel}>Abonnement campus</p>
          <h2>Comprendre les differences</h2>
          <div className={styles.roadmapList}>
            <article className={styles.roadmapItem}>
              <strong>Starter</strong>
              <p>Bon choix pour demarrer avec peu de classes et une premiere equipe pedagogique.</p>
            </article>
            <article className={styles.roadmapItem}>
              <strong>Growth</strong>
              <p>Adapte si le campus gere plusieurs niveaux, sections ou promotions en meme temps.</p>
            </article>
            <article className={styles.roadmapItem}>
              <strong>Campus</strong>
              <p>Concu pour une structure importante avec beaucoup de classes, d&apos;eleves et de comptes internes.</p>
            </article>
          </div>
        </section>
        ) : null}

        {message ? <p className={styles.inlineMessage}>{message}</p> : null}
      </div>
    </section>
  );
}
