"use client";

import { useEffect, useMemo, useState } from "react";
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
};

const formatRoleLabel = (role: string) => {
  if (role === "student") return "Etudiant";
  if (role === "teacher") return "Professeur";
  if (role === "assistant") return "Assistant";
  if (role === "owner") return "Proprietaire";
  if (role === "admin") return "Administrateur";
  return role;
};

const formatDate = (value?: string | null) => {
  if (!value) return "Date non definie";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

export default function InstitutionWorkspace({ apiBaseUrl }: Props) {
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
  const [assignmentRoomId, setAssignmentRoomId] = useState("");
  const [assignmentCourseId, setAssignmentCourseId] = useState("");
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentInstructions, setAssignmentInstructions] = useState("");
  const [inviteRoomId, setInviteRoomId] = useState("");
  const [inviteRole, setInviteRole] = useState<"student" | "teacher" | "assistant">("student");
  const [generatedLink, setGeneratedLink] = useState("");
  const [assignedCourseId, setAssignedCourseId] = useState("");

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
  const activeInvitesCount = (detail?.invites ?? []).filter((invite) => invite.is_active).length;
  const campusQuickStats = [
    {
      label: "Classes",
      value: detail?.rooms.length ?? 0,
      note: `Capacite plan: ${detail?.max_rooms ?? 0}`,
    },
    {
      label: "Professeurs",
      value: institutionCounts.teachers,
      note: `${institutionCounts.admins + institutionCounts.owners} admin / owner`,
    },
    {
      label: "Etudiants",
      value: institutionCounts.students,
      note: `Capacite plan: ${detail?.max_students ?? 0}`,
    },
    {
      label: "Devoirs",
      value: detail?.assignments.length ?? 0,
      note: "Travaux diffuses",
    },
  ];
  const campusActionCards = [
    {
      title: "Structurer les classes",
      text: "Creer les salles par niveau, filiere ou groupe de formation.",
    },
    {
      title: "Inviter par role",
      text: "Generer des liens distincts pour professeurs, etudiants et assistants.",
    },
    {
      title: "Affecter les cours",
      text: "Relier les contenus aux classes avant de diffuser devoirs et consignes.",
    },
  ];

  const roomCounts = useMemo(() => {
    const members = roomDetail?.members ?? [];
    return {
      teachers: members.filter((member) => member.role === "teacher").length,
      students: members.filter((member) => member.role === "student").length,
      assistants: members.filter((member) => member.role === "assistant").length,
    };
  }, [roomDetail]);
  const roomOperationalStats = [
    {
      label: "Professeurs",
      value: roomCounts.teachers,
      text: "Enseignants qui pilotent les contenus de cette classe.",
    },
    {
      label: "Etudiants",
      value: roomCounts.students,
      text: "Apprenants actuellement relies a cette classe.",
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
  ];

  const unassignedCatalogCourses = useMemo(() => {
    const assignedIds = new Set(
      (roomDetail?.courses ?? []).map((entry) => String(entry.course?.id ?? "")),
    );

    return catalogCourses.filter((course) => !assignedIds.has(course.id));
  }, [catalogCourses, roomDetail]);

  const selectedCourseForAssignment = useMemo(
    () =>
      catalogCourses.find((course) => course.id === assignmentCourseId) ??
      roomDetail?.courses.find((entry) => entry.course?.id === assignmentCourseId)?.course ??
      null,
    [assignmentCourseId, catalogCourses, roomDetail],
  );

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
        setMessage("Impossible de charger les etablissements.");
        return;
      }

      setInstitutions(data);
      if (data[0]?.id) {
        setSelectedInstitutionId((current) => current || data[0].id);
      }
    } catch {
      setMessage("Le chargement des etablissements a echoue.");
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
        setMessage("Impossible de charger le detail de l'etablissement.");
        return;
      }

      setDetail(data);
      const defaultRoomId = data.rooms[0]?.id || "";
      setAssignmentRoomId((current) => current || defaultRoomId);
      setInviteRoomId((current) => current || defaultRoomId);
      setSelectedRoomId((current) => current || defaultRoomId);
    } catch {
      setMessage("Le detail de l'etablissement n'a pas pu etre charge.");
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
        setMessage("Impossible de charger le detail de la classe.");
        return;
      }

      setRoomDetail(data);
    } catch {
      setMessage("Le detail de la classe n'a pas pu etre charge.");
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
      setMessage("La creation de l'etablissement a echoue.");
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
      setMessage("La creation de la classe a echoue.");
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
      setMessage("L'affectation du cours a echoue.");
    }
  };

  const handleCreateAssignment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !assignmentRoomId) return;

    try {
      const res = await fetch(`${apiBaseUrl}/institutions/rooms/${assignmentRoomId}/assignments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          course_id: assignmentCourseId || undefined,
          title: assignmentTitle,
          instructions: assignmentInstructions,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message ?? "Creation du devoir impossible.");
        return;
      }

      setAssignmentTitle("");
      setAssignmentInstructions("");
      setAssignmentCourseId("");
      setMessage("Devoir publie dans la classe.");
      await loadInstitutionDetails(selectedInstitutionId);
      if (assignmentRoomId === selectedRoomId) {
        await loadRoomDetails(selectedRoomId);
      }
    } catch {
      setMessage("La creation du devoir a echoue.");
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
      setMessage("La creation du lien a echoue.");
    }
  };

  if (loading) {
    return (
      <section className={styles.grid}>
        <section className={styles.card}>
          <h2>Chargement de l&apos;espace etablissement...</h2>
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
              <p className={styles.sectionLabel}>Pilotage etablissement</p>
              <h2>{selectedInstitution?.name || "Espace etablissement"}</h2>
              <p className={styles.paragraph}>
                Un cockpit pour organiser les classes, inviter les professeurs,
                rattacher les etudiants, affecter les cours et suivre les devoirs.
              </p>
              <div className={styles.courseMetaGrid}>
                <span>{detail?.rooms.length ?? 0} classes</span>
                <span>{activeInvitesCount} liens actifs</span>
                <span>{catalogCourses.length} cours disponibles</span>
              </div>
            </div>

            <div className={styles.institutionHeroStack}>
              <article className={styles.institutionHeroBadge}>
                <span>Plan</span>
                <strong>{selectedInstitution?.plan_name || "Starter"}</strong>
              </article>
              <article className={styles.institutionHeroBadge}>
                <span>Statut</span>
                <strong>{selectedInstitution?.subscription_status || "trial"}</strong>
              </article>
              <article className={styles.institutionHeroBadge}>
                <span>Type</span>
                <strong>{selectedInstitution?.institution_type || "Etablissement"}</strong>
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
              <span>Etablissement actif</span>
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
        </section>

        <section className={styles.card}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionLabel}>Classes du campus</p>
              <h2>Hub des classes et filieres</h2>
            </div>
            <span className={styles.sectionHint}>
              Chaque classe peut recevoir des professeurs, des etudiants, des cours et des devoirs.
            </span>
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
                  <p>{room.description || "Classe prete pour centraliser les cours et les devoirs."}</p>
                </button>
              ))
            ) : (
              <p className={styles.paragraph}>Aucune classe ne correspond a cette recherche.</p>
            )}
          </div>
        </section>

        {roomDetail ? (
          <section className={styles.card}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionLabel}>Classe active</p>
                <h2>{roomDetail.name}</h2>
              </div>
              <span className={styles.sectionHint}>
                {roomDetail.slug ? `#${roomDetail.slug}` : "Classe sans slug"}
              </span>
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

            <div className={styles.institutionStudioGrid}>
              <section className={styles.institutionStudioPanel}>
                <div className={styles.sectionHeader}>
                  <div>
                    <p className={styles.sectionLabel}>Equipe de classe</p>
                    <h3>Professeurs et etudiants</h3>
                  </div>
                </div>
                <div className={styles.institutionMemberGrid}>
                  {roomDetail.members.length > 0 ? (
                    roomDetail.members.map((member) => (
                      <article key={member.id} className={styles.institutionMemberCardWide}>
                        <strong>
                          {member.profile?.fullname || member.profile?.email || "Membre"}
                        </strong>
                        <span>{formatRoleLabel(member.role)}</span>
                        <small>{member.profile?.email || "Email non visible"}</small>
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
                    <p className={styles.sectionLabel}>Travaux</p>
                    <h3>Devoirs et exercices</h3>
                  </div>
                </div>
                <div className={styles.roadmapList}>
                  {roomDetail.assignments.length > 0 ? (
                    roomDetail.assignments.map((assignment) => (
                      <article key={assignment.id} className={styles.roadmapItem}>
                        <strong>{assignment.title}</strong>
                        <p>{assignment.instructions || "Aucune consigne detaillee."}</p>
                        <small>
                          {assignment.status} | {formatDate(assignment.due_at)}
                        </small>
                        <small>
                          {Number(assignment.submissionCount ?? 0)} remises |{" "}
                          {Number(assignment.pendingCount ?? 0)} a corriger |{" "}
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
                    <h3>Acces par role</h3>
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
                    <span>A corriger</span>
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

        <section className={styles.institutionActionGrid}>
          <section className={styles.card}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionLabel}>Nouvelle classe</p>
                <h2>Creer une classe</h2>
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
                Creer la classe
              </button>
            </form>
          </section>

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

        <section className={styles.institutionActionGrid}>
          <section className={styles.card}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionLabel}>Devoir</p>
                <h2>Publier un devoir de classe</h2>
              </div>
            </div>
            <form onSubmit={handleCreateAssignment} className={styles.teacherForm}>
              <div className={styles.metaFields}>
                <label className={styles.formField}>
                  <span>Classe cible</span>
                  <select
                    className={styles.selectField}
                    value={assignmentRoomId}
                    onChange={(event) => setAssignmentRoomId(event.target.value)}
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
                  <span>Cours lie</span>
                  <select
                    className={styles.selectField}
                    value={assignmentCourseId}
                    onChange={(event) => setAssignmentCourseId(event.target.value)}
                  >
                    <option value="">Aucun cours precis</option>
                    {(roomDetail?.courses ?? []).map((entry) =>
                      entry.course?.id ? (
                        <option key={entry.id} value={String(entry.course.id)}>
                          {entry.course.title}
                        </option>
                      ) : null,
                    )}
                  </select>
                </label>
              </div>
              <label className={styles.formField}>
                <span>Titre du devoir</span>
                <input
                  type="text"
                  value={assignmentTitle}
                  onChange={(event) => setAssignmentTitle(event.target.value)}
                  placeholder="Devoir de mathematiques semaine 2"
                />
              </label>
              <label className={styles.formField}>
                <span>Consignes</span>
                <textarea
                  className={styles.formTextarea}
                  rows={4}
                  value={assignmentInstructions}
                  onChange={(event) => setAssignmentInstructions(event.target.value)}
                  placeholder="Instructions, format attendu, date limite et criteres."
                />
              </label>
              <button type="submit" className={styles.submitButton}>
                Publier le devoir
              </button>
              {selectedCourseForAssignment ? (
                <p className={styles.inlineMessage}>
                  Devoir rattache a: {"title" in selectedCourseForAssignment
                    ? String(selectedCourseForAssignment.title ?? "")
                    : ""}
                </p>
              ) : null}
            </form>
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
                    <option value="student">Etudiant</option>
                    <option value="teacher">Professeur</option>
                    <option value="assistant">Assistant</option>
                  </select>
                </label>
              </div>

              <button type="submit" className={styles.submitButton}>
                Generer un lien d&apos;invitation
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
      </div>

      <div className={styles.sideColumn}>
        <section className={styles.cardAccent}>
          <p className={styles.sectionLabel}>Campus</p>
          <h2>Creer un etablissement</h2>
          <form onSubmit={handleCreateInstitution} className={styles.teacherForm}>
            <label className={styles.formField}>
              <span>Nom de l&apos;etablissement</span>
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
              Creer l&apos;etablissement
            </button>
          </form>
        </section>

        <section className={styles.card}>
          <p className={styles.sectionLabel}>Annuaire campus</p>
          <h2>Repartition des roles</h2>
          <div className={styles.roadmapList}>
            <article className={styles.roadmapItem}>
              <strong>{institutionCounts.teachers} professeurs</strong>
              <p>Peuvent etre invites classe par classe avec un lien dedie.</p>
            </article>
            <article className={styles.roadmapItem}>
              <strong>{institutionCounts.students} etudiants</strong>
              <p>Rejoignent leurs classes sans saisie manuelle via invitation.</p>
            </article>
            <article className={styles.roadmapItem}>
              <strong>{institutionCounts.admins + institutionCounts.owners} administrateurs</strong>
              <p>Pilotent l&apos;organisation globale du campus.</p>
            </article>
          </div>
        </section>

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

        {message ? <p className={styles.inlineMessage}>{message}</p> : null}
      </div>
    </section>
  );
}
