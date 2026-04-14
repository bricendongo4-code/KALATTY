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
};

type Props = {
  apiBaseUrl: string;
};

const formatRoleLabel = (role: string) => {
  if (role === "student") return "Eleve / etudiant";
  if (role === "teacher") return "Professeur";
  if (role === "assistant") return "Assistant";
  if (role === "owner") return "Proprietaire";
  if (role === "admin") return "Administrateur";
  return role;
};

export default function InstitutionWorkspace({ apiBaseUrl }: Props) {
  const [institutions, setInstitutions] = useState<InstitutionSummary[]>([]);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [detail, setDetail] = useState<InstitutionDetail | null>(null);
  const [roomDetail, setRoomDetail] = useState<RoomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [institutionType, setInstitutionType] = useState("");
  const [roomName, setRoomName] = useState("");
  const [roomDescription, setRoomDescription] = useState("");
  const [assignmentRoomId, setAssignmentRoomId] = useState("");
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentInstructions, setAssignmentInstructions] = useState("");
  const [inviteRoomId, setInviteRoomId] = useState("");
  const [inviteRole, setInviteRole] = useState<"student" | "teacher" | "assistant">("student");
  const [generatedLink, setGeneratedLink] = useState("");

  const token =
    typeof window !== "undefined" ? localStorage.getItem("kalatty_token") : null;

  const selectedInstitution = useMemo(
    () => institutions.find((institution) => institution.id === selectedInstitutionId) ?? null,
    [institutions, selectedInstitutionId],
  );

  const filteredRooms = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!detail) return [];
    return detail.rooms.filter((room) =>
      [room.name, room.description, room.slug]
        .map((value) => String(value ?? ""))
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [detail, query]);

  const filteredInvites = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!detail) return [];
    return detail.invites.filter((invite) =>
      [invite.invite_role, invite.token, invite.room_id]
        .map((value) => String(value ?? ""))
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [detail, query]);

  const roomLookup = useMemo(() => {
    return new Map((detail?.rooms ?? []).map((room) => [room.id, room.name]));
  }, [detail]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const loadInstitutions = async () => {
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

    void loadInstitutions();
  }, [apiBaseUrl, token]);

  useEffect(() => {
    if (!token || !selectedInstitutionId) {
      return;
    }

    const loadDetails = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/institutions/${selectedInstitutionId}`, {
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
        setAssignmentRoomId((current) => current || data.rooms[0]?.id || "");
        setInviteRoomId((current) => current || data.rooms[0]?.id || "");
        setSelectedRoomId((current) => current || data.rooms[0]?.id || "");
      } catch {
        setMessage("Le detail de l'etablissement n'a pas pu etre charge.");
      }
    };

    void loadDetails();
  }, [apiBaseUrl, selectedInstitutionId, token]);

  useEffect(() => {
    if (!token || !selectedRoomId) {
      setRoomDetail(null);
      return;
    }

    const loadRoomDetails = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/institutions/rooms/${selectedRoomId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = (await res.json()) as RoomDetail;

        if (!res.ok) {
          setMessage("Impossible de charger le detail de la salle.");
          return;
        }

        setRoomDetail(data);
      } catch {
        setMessage("Le detail de la salle n'a pas pu etre charge.");
      }
    };

    void loadRoomDetails();
  }, [apiBaseUrl, selectedRoomId, token]);

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
        setMessage(data.message ?? "Creation de salle impossible.");
        return;
      }

      setDetail((current) =>
        current ? { ...current, rooms: [data, ...current.rooms] } : current,
      );
      setSelectedRoomId(String(data.id));
      setRoomName("");
      setRoomDescription("");
      setMessage("Salle creee.");
    } catch {
      setMessage("La creation de la salle a echoue.");
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
          title: assignmentTitle,
          instructions: assignmentInstructions,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message ?? "Creation de l'exercice impossible.");
        return;
      }

      setDetail((current) =>
        current ? { ...current, assignments: [data, ...current.assignments] } : current,
      );
      setRoomDetail((current) =>
        current && current.id === assignmentRoomId
          ? { ...current, assignments: [data, ...current.assignments] }
          : current,
      );
      setAssignmentTitle("");
      setAssignmentInstructions("");
      setMessage("Exercice publie.");
    } catch {
      setMessage("La creation de l'exercice a echoue.");
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
      setDetail((current) =>
        current ? { ...current, invites: [data, ...current.invites] } : current,
      );
      setRoomDetail((current) =>
        current && current.id === inviteRoomId
          ? { ...current, invites: [data, ...current.invites] }
          : current,
      );
      setMessage("Lien d'invitation genere.");
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
          <div className={styles.institutionHero}>
            <div>
              <p className={styles.sectionLabel}>Campus workspace</p>
              <h2>{selectedInstitution?.name || "Pilotage de l'etablissement"}</h2>
              <p className={styles.paragraph}>
                Gere les salles, les invitations, les professeurs et les devoirs
                depuis un espace plus detaille et mieux structure.
              </p>
            </div>

            <div className={styles.institutionHeroMeta}>
              <span>{selectedInstitution?.plan_name || "Starter"}</span>
              <span>{selectedInstitution?.subscription_status || "trial"}</span>
              <span>{selectedInstitution?.institution_type || "Etablissement"}</span>
            </div>
          </div>

          <div className={styles.institutionToolbar}>
            <label className={styles.searchBar}>
              <span>Recherche interne</span>
              <input
                type="search"
                placeholder="Salles, invitations, organisation"
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
              <span>Salle active</span>
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

          <div className={styles.statsRow}>
            <article className={styles.statCard}>
              <span>Salles</span>
              <strong>{detail?.rooms.length ?? 0}</strong>
              <small>Limite plan: {detail?.max_rooms ?? 0}</small>
            </article>
            <article className={styles.statCard}>
              <span>Membres</span>
              <strong>{detail?.members.length ?? 0}</strong>
              <small>Capacite apprenants: {detail?.max_students ?? 0}</small>
            </article>
            <article className={styles.statCard}>
              <span>Exercices</span>
              <strong>{detail?.assignments.length ?? 0}</strong>
              <small>Travaux diffuses a tes salles</small>
            </article>
          </div>

          <div className={styles.institutionGridWide}>
            {filteredRooms.length > 0 ? (
              filteredRooms.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  className={
                    selectedRoomId === room.id
                      ? styles.institutionRoomCardActive
                      : styles.institutionRoomCard
                  }
                  onClick={() => setSelectedRoomId(room.id)}
                >
                  <span>Salle</span>
                  <h3>{room.name}</h3>
                  <p>{room.description || "Salle prete pour cours, devoirs et invitations."}</p>
                  <small>#{room.slug || "sans-slug"}</small>
                </button>
              ))
            ) : (
              <p className={styles.paragraph}>Aucune salle ne correspond a cette recherche.</p>
            )}
          </div>
        </section>

        {roomDetail ? (
          <section className={styles.card}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionLabel}>Salle active</p>
                <h2>{roomDetail.name}</h2>
              </div>
              <span className={styles.sectionHint}>#{roomDetail.slug || "sans-slug"}</span>
            </div>

            <div className={styles.institutionRoomHero}>
              <div className={styles.institutionRoomHeroPanel}>
                <strong>Vue d&apos;ensemble</strong>
                <p>
                  {roomDetail.description ||
                    "Salle prete pour centraliser cours, devoirs et invitations."}
                </p>
              </div>
              <div className={styles.institutionRoomHeroPanel}>
                <strong>Membres</strong>
                <p>{roomDetail.members.length} rattaches a cette salle.</p>
              </div>
              <div className={styles.institutionRoomHeroPanel}>
                <strong>Contenus</strong>
                <p>{roomDetail.courses.length} cours et {roomDetail.assignments.length} devoirs.</p>
              </div>
            </div>

            <div className={styles.dualPane}>
              <section className={styles.institutionColumnPanel}>
                <div className={styles.sectionHeader}>
                  <div>
                    <p className={styles.sectionLabel}>Membres</p>
                    <h3>Equipe et apprenants</h3>
                  </div>
                </div>
                <div className={styles.roadmapList}>
                  {roomDetail.members.length > 0 ? (
                    roomDetail.members.map((member) => (
                      <article key={member.id} className={styles.institutionMemberCard}>
                        <strong>
                          {member.profile?.fullname || member.profile?.email || "Membre"}
                        </strong>
                        <p>{formatRoleLabel(member.role)}</p>
                        <small>{member.profile?.email || "Profil sans email visible"}</small>
                      </article>
                    ))
                  ) : (
                    <p className={styles.paragraph}>Aucun membre dans cette salle pour le moment.</p>
                  )}
                </div>
              </section>

              <section className={styles.institutionColumnPanel}>
                <div className={styles.sectionHeader}>
                  <div>
                    <p className={styles.sectionLabel}>Cours attribues</p>
                    <h3>Bibliotheque de salle</h3>
                  </div>
                </div>
                <div className={styles.roadmapList}>
                  {roomDetail.courses.length > 0 ? (
                    roomDetail.courses.map((entry) => (
                      <article key={entry.id} className={styles.roadmapItem}>
                        <strong>{entry.course?.title || "Cours"}</strong>
                        <p>
                          {entry.course?.description ||
                            entry.course?.short_description ||
                            "Cours affecte a la salle."}
                        </p>
                      </article>
                    ))
                  ) : (
                    <p className={styles.paragraph}>Aucun cours n&apos;est encore lie a cette salle.</p>
                  )}
                </div>
              </section>
            </div>

            <div className={styles.dualPane}>
              <section className={styles.institutionColumnPanel}>
                <div className={styles.sectionHeader}>
                  <div>
                    <p className={styles.sectionLabel}>Travaux</p>
                    <h3>Devoirs publies</h3>
                  </div>
                </div>
                <div className={styles.roadmapList}>
                  {roomDetail.assignments.length > 0 ? (
                    roomDetail.assignments.map((assignment) => (
                      <article key={assignment.id} className={styles.roadmapItem}>
                        <strong>{assignment.title}</strong>
                        <p>{assignment.instructions || "Sans consignes supplementaires."}</p>
                        <small>{assignment.status}</small>
                      </article>
                    ))
                  ) : (
                    <p className={styles.paragraph}>Aucun devoir publie pour cette salle.</p>
                  )}
                </div>
              </section>

              <section className={styles.institutionColumnPanel}>
                <div className={styles.sectionHeader}>
                  <div>
                    <p className={styles.sectionLabel}>Invitations</p>
                    <h3>Liens d&apos;acces a la salle</h3>
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
                    <p className={styles.paragraph}>Aucun lien genere pour cette salle.</p>
                  )}
                </div>
              </section>
            </div>
          </section>
        ) : null}

        <section className={styles.dualPane}>
          <section className={styles.card}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionLabel}>Invitations</p>
                <h2>Generer un lien d&apos;acces</h2>
              </div>
              <span className={styles.sectionHint}>Mode Teams pour salle</span>
            </div>

            <form onSubmit={handleCreateInvite} className={styles.teacherForm}>
              <div className={styles.metaFields}>
                <label className={styles.formField}>
                  <span>Salle cible</span>
                  <select
                    className={styles.selectField}
                    value={inviteRoomId}
                    onChange={(event) => setInviteRoomId(event.target.value)}
                  >
                    <option value="">Choisir une salle</option>
                    {(detail?.rooms ?? []).map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.formField}>
                  <span>Type d&apos;invitation</span>
                  <select
                    className={styles.selectField}
                    value={inviteRole}
                    onChange={(event) =>
                      setInviteRole(
                        event.target.value as "student" | "teacher" | "assistant",
                      )
                    }
                  >
                    <option value="student">Eleve / etudiant</option>
                    <option value="teacher">Professeur</option>
                    <option value="assistant">Assistant</option>
                  </select>
                </label>
              </div>

              <button type="submit" className={styles.submitButton}>
                Generer un lien
              </button>
            </form>

            {generatedLink ? (
              <div className={styles.inviteLinkBox}>
                <strong>Lien genere</strong>
                <p>{generatedLink}</p>
              </div>
            ) : null}
          </section>

          <section className={styles.card}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionLabel}>Historique</p>
                <h2>Invitations existantes</h2>
              </div>
            </div>

            <div className={styles.roadmapList}>
              {filteredInvites.length > 0 ? (
                filteredInvites.map((invite) => (
                  <article key={invite.id} className={styles.institutionInviteCard}>
                    <strong>{formatRoleLabel(invite.invite_role)}</strong>
                    <p>{roomLookup.get(invite.room_id) || "Salle inconnue"}</p>
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
        </section>

        <section className={styles.dualPane}>
          <section className={styles.card}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionLabel}>Creation de salle</p>
                <h2>Ajouter une salle</h2>
              </div>
            </div>
            <form onSubmit={handleCreateRoom} className={styles.teacherForm}>
              <label className={styles.formField}>
                <span>Nom de la salle</span>
                <input
                  type="text"
                  value={roomName}
                  onChange={(event) => setRoomName(event.target.value)}
                  placeholder="Salle Terminale A"
                />
              </label>
              <label className={styles.formField}>
                <span>Description</span>
                <textarea
                  className={styles.formTextarea}
                  rows={4}
                  value={roomDescription}
                  onChange={(event) => setRoomDescription(event.target.value)}
                  placeholder="Classe, filiere ou groupe cible"
                />
              </label>
              <button type="submit" className={styles.submitButton}>
                Creer la salle
              </button>
            </form>
          </section>

          <section className={styles.card}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionLabel}>Travaux</p>
                <h2>Donner un exercice</h2>
              </div>
            </div>
            <form onSubmit={handleCreateAssignment} className={styles.teacherForm}>
              <label className={styles.formField}>
                <span>Salle cible</span>
                <select
                  className={styles.selectField}
                  value={assignmentRoomId}
                  onChange={(event) => setAssignmentRoomId(event.target.value)}
                >
                  <option value="">Choisir une salle</option>
                  {(detail?.rooms ?? []).map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.formField}>
                <span>Titre</span>
                <input
                  type="text"
                  value={assignmentTitle}
                  onChange={(event) => setAssignmentTitle(event.target.value)}
                  placeholder="Exercice de revision"
                />
              </label>
              <label className={styles.formField}>
                <span>Consignes</span>
                <textarea
                  className={styles.formTextarea}
                  rows={4}
                  value={assignmentInstructions}
                  onChange={(event) => setAssignmentInstructions(event.target.value)}
                  placeholder="Travail a faire, date limite, pieces attendues"
                />
              </label>
              <button type="submit" className={styles.submitButton}>
                Publier l&apos;exercice
              </button>
            </form>
          </section>
        </section>
      </div>

      <div className={styles.sideColumn}>
        <section className={styles.cardAccent}>
          <p className={styles.sectionLabel}>Creation</p>
          <h2>Nouveau campus</h2>
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
          <p className={styles.sectionLabel}>Organisation</p>
          <h2>Proposition produit</h2>
          <div className={styles.roadmapList}>
            <article className={styles.roadmapItem}>
              <strong>1 salle = 1 hub d&apos;apprentissage</strong>
              <p>Cours assignes, membres, exercices et liens au meme endroit.</p>
            </article>
            <article className={styles.roadmapItem}>
              <strong>Liens d&apos;invitation distincts</strong>
              <p>Un lien etudiant, un lien professeur, un lien assistant si besoin.</p>
            </article>
            <article className={styles.roadmapItem}>
              <strong>Administration progressive</strong>
              <p>Etablissement, puis salles, puis contenus, puis suivi des remises.</p>
            </article>
          </div>
        </section>

        <section className={styles.card}>
          <p className={styles.sectionLabel}>Plan actif</p>
          <h2>Capacites du campus</h2>
          <div className={styles.roadmapList}>
            <article className={styles.roadmapItem}>
              <strong>{detail?.max_rooms ?? 0} salles max</strong>
              <p>Selon le plan actuel de l&apos;etablissement.</p>
            </article>
            <article className={styles.roadmapItem}>
              <strong>{detail?.max_students ?? 0} apprenants max</strong>
              <p>Capacite globale de rattachement au campus.</p>
            </article>
          </div>
        </section>

        {message ? <p className={styles.inlineMessage}>{message}</p> : null}
      </div>
    </section>
  );
}
