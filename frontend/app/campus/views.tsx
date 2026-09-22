import Link from "next/link";
import styles from "./campus.module.css";
import {
  Avatar,
  Badge,
  Card,
  Donut,
  Icon,
  Kpi,
  LineChart,
  Progress,
  Row,
  RowIcon,
  Todo,
  colorForValue,
} from "./ui";

/* Données de démonstration : reprises de la maquette validée. Elles seront remplacées
   par les données réelles (API) lors du branchement de la logique. */

function todayLabel() {
  const d = new Date();
  const weekday = new Intl.DateTimeFormat("fr-FR", { weekday: "long" }).format(
    d,
  );
  const rest = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
  return { weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1), rest };
}

/* =====================================================================
   ÉTUDIANT : « Qu'est-ce que je dois faire aujourd'hui ? »
   ===================================================================== */
export function StudentHome() {
  const { weekday, rest } = todayLabel();
  const day = [
    {
      time: "08:00 - 09:30",
      title: "Marketing",
      sub: "Salle A04 • Mme Martin",
      badge: <Badge kind="live">En cours</Badge>,
      live: true,
    },
    {
      time: "10:00 - 11:30",
      title: "Gestion commerciale",
      sub: "Salle B12 • M. Diallo",
      badge: <Badge kind="soon">À venir</Badge>,
    },
    {
      time: "13:30 - 14:30",
      title: "Anglais professionnel",
      sub: "Salle A06 • Mme Lopez",
      badge: <Badge kind="soon">À venir</Badge>,
    },
    {
      time: "15:00 - 16:30",
      title: "Projet tutoré",
      sub: "Salle C01 • M. Nguema",
      badge: <Badge kind="soon">À venir</Badge>,
    },
  ];
  return (
    <>
      <section className={styles.banner}>
        <div>
          <h1 className={styles.bannerTitle}>Bonjour Joss 👋</h1>
          <p className={styles.bannerText}>
            Une nouvelle journée pour progresser !
          </p>
          <p className={styles.bannerQuote}>
            « La discipline d&apos;aujourd&apos;hui, les opportunités de demain.
            »
          </p>
        </div>
        <div className={styles.bannerRight}>
          <div className={styles.dateCard}>
            <strong>{weekday}</strong>
            <span>{rest}</span>
            <small>Reste constant, tes efforts paient.</small>
          </div>
        </div>
      </section>

      <div className={styles.kpis}>
        <Kpi
          icon="calendar"
          tone="blue"
          value="5"
          label="Cours aujourd'hui"
          link={{
            label: "Voir mon emploi du temps",
            href: "/campus/etudiant/emploi-du-temps",
          }}
        />
        <Kpi
          icon="edit"
          tone="orange"
          value="2"
          label="Travaux à rendre"
          link={{ label: "Voir mes travaux", href: "/campus/etudiant/travaux" }}
        />
        <Kpi
          icon="clipboard"
          tone="violet"
          value="1"
          label="Évaluation à venir"
          link={{
            label: "Voir mes évaluations",
            href: "/campus/etudiant/evaluations",
          }}
        />
        <Kpi
          icon="chart"
          tone="green"
          value="78%"
          label="Progression globale"
          link={{
            label: "Voir mes statistiques",
            href: "/campus/etudiant/resultats",
          }}
        />
      </div>

      <div className={styles.grid3}>
        <div className={styles.rowSpan2}>
          <Card
            title="Mon emploi du temps du jour"
            link={{
              label: "Voir tout",
              href: "/campus/etudiant/emploi-du-temps",
            }}
          >
            <ol className={styles.timeline}>
              {day.map((s) => (
                <li key={s.time} className={styles.tlItem}>
                  <span className={styles.tlTime}>{s.time}</span>
                  <span
                    className={`${styles.tlDot} ${s.live ? styles.tlDotLive : ""}`}
                  />
                  <span className={styles.tlBody}>
                    <strong>{s.title}</strong>
                    <small>{s.sub}</small>
                  </span>
                  {s.badge}
                </li>
              ))}
            </ol>
            <Link
              href="/campus/etudiant/emploi-du-temps"
              className={`${styles.btn} ${styles.btnGhost} ${styles.btnBlock}`}
            >
              Voir tout l&apos;emploi du temps
            </Link>
          </Card>
        </div>

        <Card
          title="Mes travaux"
          link={{ label: "Voir tout", href: "/campus/etudiant/travaux" }}
        >
          <ul className={styles.list}>
            <Row
              lead={<RowIcon icon="edit" tone="red" />}
              title="Étude de cas : segmentation"
              sub="Marketing • À rendre aujourd'hui"
              side={<Badge kind="urgent">Urgent</Badge>}
            />
            <Row
              lead={<RowIcon icon="book" tone="orange" />}
              title="Fiche de lecture"
              sub="Gestion commerciale • À rendre le 18 sept."
              chevron
            />
            <Row
              lead={<RowIcon icon="megaphone" tone="violet" />}
              title="Présentation orale"
              sub="Anglais professionnel • À rendre le 22 sept."
              chevron
            />
          </ul>
        </Card>

        <Card
          title="Messages récents"
          link={{ label: "Voir tout", href: "/campus/etudiant/messagerie" }}
        >
          <ul className={styles.list}>
            <Row
              lead={<Avatar name="Mme Martin" />}
              title="Mme Martin"
              sub="Supports du cours de demain"
              side="Il y a 1 h"
            />
            <Row
              lead={<Avatar name="M. Diallo" />}
              title="M. Diallo"
              sub="Correction disponible"
              side="Il y a 3 h"
            />
            <Row
              lead={<Avatar name="Classe BTS MCO 1" />}
              title="Classe BTS MCO 1"
              sub="Nouvelle annonce"
              side="Hier"
            />
          </ul>
        </Card>

        <div className={styles.span2}>
          <div className={styles.resource}>
            <span className={styles.resourceCover}>
              <Icon name="book" />
            </span>
            <span>
              <small>Ressources recommandées</small>
              <strong>Marketing digital : les fondamentaux</strong>
            </span>
            <Link
              href="/campus/etudiant/ressources"
              className={`${styles.btn} ${styles.btnOrange}`}
            >
              Accéder
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

/* =====================================================================
   PROFESSEUR : cockpit du jour
   ===================================================================== */
export function TeacherHome() {
  const classes = [
    { name: "BTS MCO 1", info: "28 étudiants • Marketing", value: 72 },
    { name: "BTS MCO 2", info: "26 étudiants • Marketing", value: 58 },
    { name: "BTS NDRC 1", info: "30 étudiants • Stratégie", value: 65 },
    { name: "BTS NDRC 2", info: "24 étudiants • Communication", value: 47 },
  ];
  const watch = [
    { name: "Sophie Mbarga", reason: "Absences répétées", kind: "bad" },
    { name: "Lucas Kamin", reason: "Baisse de résultats", kind: "warn" },
    { name: "Amadou Diallo", reason: "Travaux non rendus", kind: "bad" },
    { name: "Leïla Ben Ali", reason: "Très bonne progression", kind: "ok" },
  ];
  return (
    <>
      <section className={styles.banner}>
        <div>
          <h1 className={styles.bannerTitle}>Bonjour Professeur Martin,</h1>
          <p className={styles.bannerText}>Voici votre activité du jour.</p>
        </div>
        <p
          className={styles.bannerQuote}
          style={{ margin: 0, maxWidth: 260, textAlign: "right" }}
        >
          « Enseigner, c&apos;est allumer une lumière, pas remplir un vase. »
        </p>
      </section>

      <div className={styles.kpis}>
        <Kpi
          icon="calendar"
          tone="blue"
          value="3"
          label="Cours aujourd'hui"
          link={{
            label: "Voir mon planning",
            href: "/campus/professeur/emploi-du-temps",
          }}
        />
        <Kpi
          icon="users"
          tone="green"
          value="28"
          label="Étudiants au total"
          link={{
            label: "Toutes mes classes",
            href: "/campus/professeur/classes",
          }}
        />
        <Kpi
          icon="edit"
          tone="red"
          value="12"
          label="Travaux à corriger"
          link={{
            label: "Voir les travaux",
            href: "/campus/professeur/travaux",
          }}
        />
        <Kpi
          icon="checkCircle"
          tone="teal"
          value="2"
          label="Évaluations à venir"
          link={{
            label: "Voir le calendrier",
            href: "/campus/professeur/travaux",
          }}
        />
      </div>

      <div className={styles.grid3wide}>
        <Card title="Mon prochain cours">
          <div className={styles.nextCourse}>
            <span className={styles.nextHead}>
              <span className={styles.pulse} />
              Dans 25 minutes
            </span>
            <div className={styles.nextBox}>
              <RowIcon icon="megaphone" tone="blue" />
              <span className={styles.rowMain}>
                <strong>Marketing</strong>
                <small>10:00 - 11:30 • Salle A04 • 28 étudiants</small>
              </span>
            </div>
            <Link
              href="/campus/professeur/seances"
              className={`${styles.btn} ${styles.btnDark} ${styles.btnBlock}`}
            >
              <Icon name="play" className={styles.navIcon} />
              Démarrer la séance
            </Link>
            <div className={styles.quick}>
              <button type="button" className={styles.quickBtn}>
                <Icon name="book" />
                Voir le cours
              </button>
              <button type="button" className={styles.quickBtn}>
                <Icon name="checkCircle" />
                Faire l&apos;appel
              </button>
              <button type="button" className={styles.quickBtn}>
                <Icon name="share" />
                Partager un document
              </button>
            </div>
          </div>
        </Card>

        <Card
          title="Mes classes"
          link={{ label: "Voir toutes", href: "/campus/professeur/classes" }}
        >
          <ul className={styles.list}>
            {classes.map((c) => (
              <li key={c.name} className={styles.row}>
                <RowIcon
                  icon="clipboard"
                  tone={c.value >= 60 ? "blue" : "orange"}
                />
                <span className={styles.rowMain}>
                  <strong>{c.name}</strong>
                  <small>{c.info}</small>
                </span>
                <span style={{ width: 96 }}>
                  <Progress value={c.value} color={colorForValue(c.value)} />
                </span>
                <span className={styles.progVal}>{c.value}%</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Tâches prioritaires">
          <Todo
            icon="edit"
            tone="red"
            action={{ label: "›", href: "/campus/professeur/travaux" }}
          >
            <strong>Corriger 12 copies</strong>
            <br />
            <small style={{ color: "#647092" }}>Étude de cas • MCO1</small>
          </Todo>
          <Todo
            icon="clipboard"
            tone="green"
            action={{ label: "›", href: "/campus/professeur/travaux" }}
          >
            <strong>Saisir les notes</strong>
            <br />
            <small style={{ color: "#647092" }}>Contrôle continu • NDRC1</small>
          </Todo>
          <Todo
            icon="pen"
            tone="violet"
            action={{ label: "›", href: "/campus/professeur/preparer" }}
          >
            <strong>Préparer le cours</strong>
            <br />
            <small style={{ color: "#647092" }}>Stratégie • NDRC2</small>
          </Todo>
          <Todo
            icon="mail"
            tone="blue"
            action={{ label: "›", href: "/campus/professeur/messagerie" }}
          >
            <strong>Répondre à 3 messages</strong>
            <br />
            <small style={{ color: "#647092" }}>Étudiants</small>
          </Todo>
        </Card>
      </div>

      <div className={styles.grid2}>
        <Card
          title="Étudiants nécessitant une attention"
          link={{ label: "Voir le suivi", href: "/campus/professeur/suivi" }}
        >
          <div className={styles.attnGrid}>
            {watch.map((w) => (
              <div key={w.name} className={styles.attnCard}>
                <Avatar name={w.name} size={40} />
                <span>
                  <strong>{w.name}</strong>
                  <small className={styles[`reason_${w.kind}`]}>
                    {w.reason}
                  </small>
                </span>
              </div>
            ))}
          </div>
        </Card>
        <Card
          title="Ressources récentes"
          link={{ label: "Voir tout", href: "/campus/professeur/ressources" }}
        >
          <ul className={styles.list}>
            <Row
              lead={<RowIcon icon="file" tone="red" />}
              title="Chapitre 4 - Marketing.pdf"
              sub="Ajouté le 15 sept."
            />
            <Row
              lead={<RowIcon icon="video" tone="blue" />}
              title="Vidéo - Étude de marché"
              sub="Ajouté le 14 sept."
            />
          </ul>
        </Card>
      </div>
    </>
  );
}

/* =====================================================================
   RESPONSABLE PÉDAGOGIQUE : sommes-nous dans les temps ?
   ===================================================================== */
export function PedagogyHome() {
  const programmes = [
    { name: "Marketing", value: 72 },
    { name: "Communication", value: 61 },
    { name: "Gestion commerciale", value: 48 },
    { name: "Droit", value: 80 },
    { name: "Anglais professionnel", value: 65 },
  ];
  const events = [
    { title: "Conseil de classe - MCO1", date: "18 sept. 2025 • 14:00" },
    { title: "Réunion enseignants", date: "22 sept. 2025 • 18:00" },
    { title: "Début des évaluations", date: "6 oct. 2025" },
    { title: "Semaine d'intégration", date: "13 oct. 2025" },
  ];
  return (
    <>
      <section className={`${styles.banner} ${styles.bannerStrip}`}>
        <div className={styles.headRow}>
          <div>
            <h1 className={styles.headTitle}>Bonjour Laura,</h1>
            <p className={styles.headSub}>
              Voici la vue pédagogique de votre établissement.
            </p>
          </div>
          <div className={styles.headTools}>
            <select
              className={styles.select}
              defaultValue="2025-2026"
              aria-label="Année académique"
            >
              <option>Année académique 2025 - 2026</option>
            </select>
            <select
              className={styles.select}
              defaultValue="S1"
              aria-label="Semestre"
            >
              <option value="S1">Semestre 1</option>
              <option value="S2">Semestre 2</option>
            </select>
          </div>
        </div>
      </section>

      <div className={styles.kpis}>
        <Kpi
          icon="users"
          tone="green"
          value="126"
          label="Étudiants"
          trend="+8% vs 2024"
        />
        <Kpi icon="cap" tone="blue" value="6" label="Formations actives" />
        <Kpi
          icon="layers"
          tone="violet"
          value="12"
          label="Classes"
          trend="2 nouvelles"
        />
        <Kpi icon="user" tone="blue" value="18" label="Enseignants" />
        <Kpi
          icon="chart"
          tone="green"
          value="72%"
          label="Programmes avancés"
          trend="+12%"
        />
      </div>

      <div className={styles.grid3}>
        <Card
          title="Progression des programmes"
          link={{ label: "Voir le détail", href: "/campus/pedagogie/suivi" }}
        >
          {programmes.map((p) => (
            <div key={p.name} className={styles.progRow}>
              <span>{p.name}</span>
              <Progress value={p.value} color={colorForValue(p.value)} />
              <span className={styles.progVal}>{p.value}%</span>
            </div>
          ))}
        </Card>

        <Card title="Taux de présence (30 derniers jours)">
          <Donut
            segments={[
              { label: "Présents", value: 87, color: "#22b573" },
              { label: "Retards", value: 8, color: "#f59e0b" },
              { label: "Absences", value: 5, color: "#ef5b5b" },
            ]}
            centerValue="87%"
            centerLabel="Présence globale"
          />
          <Link href="/campus/pedagogie/rapports" className={styles.cardLink}>
            Voir les statistiques
          </Link>
        </Card>

        <Card
          title="Événements à venir"
          link={{
            label: "Voir tout",
            href: "/campus/pedagogie/emploi-du-temps",
          }}
        >
          <ul className={styles.list}>
            {events.map((e) => (
              <Row
                key={e.title}
                lead={<RowIcon icon="calendar" tone="blue" />}
                title={e.title}
                sub={e.date}
              />
            ))}
          </ul>
        </Card>
      </div>

      <div className={styles.grid3}>
        <Card title="Alertes & actions">
          <Todo
            icon="alert"
            tone="red"
            action={{
              label: "Voir les détails",
              href: "/campus/pedagogie/suivi",
            }}
          >
            3 classes avec un retard de programme
          </Todo>
          <Todo
            icon="users"
            tone="orange"
            action={{
              label: "Voir la liste",
              href: "/campus/pedagogie/etudiants",
            }}
          >
            5 étudiants en difficulté
          </Todo>
          <Todo
            icon="calendar"
            tone="orange"
            action={{
              label: "Résoudre",
              href: "/campus/pedagogie/emploi-du-temps",
            }}
          >
            2 emplois du temps en conflit
          </Todo>
          <Todo
            icon="shield"
            tone="blue"
            action={{ label: "Suivre", href: "/campus/pedagogie/vie-scolaire" }}
          >
            12 justificatifs d&apos;absence à traiter
          </Todo>
        </Card>

        <Card title="Derniers messages">
          <ul className={styles.list}>
            <Row
              lead={<Avatar name="Prof. Diallo" />}
              title="Prof. Diallo"
              sub="Question sur l'évaluation"
              side="Il y a 1 h"
            />
            <Row
              lead={<Avatar name="Prof. Lopez" />}
              title="Prof. Lopez"
              sub="Emploi du temps"
              side="Il y a 3 h"
            />
            <Row
              lead={<Avatar name="Direction" />}
              title="Direction"
              sub="Réunion pédagogique"
              side="Il y a 5 h"
            />
          </ul>
        </Card>

        <Card
          title="Documents récents"
          link={{ label: "Voir tout", href: "/campus/pedagogie/documents" }}
        >
          <ul className={styles.list}>
            <Row
              lead={<RowIcon icon="file" tone="red" />}
              title="Guide d'évaluation 2025.pdf"
              sub="Ajouté le 14 sept."
            />
            <Row
              lead={<RowIcon icon="file" tone="red" />}
              title="Règlement académique.pdf"
              sub="Ajouté le 10 sept."
            />
            <Row
              lead={<RowIcon icon="file" tone="red" />}
              title="Calendrier 2025-2026.pdf"
              sub="Ajouté le 5 sept."
            />
          </ul>
        </Card>
      </div>
    </>
  );
}

/* =====================================================================
   ADMINISTRATEUR / DIRECTION : vue d'ensemble de l'établissement
   ===================================================================== */
export function DirectionHome() {
  const inscriptions = [
    {
      name: "Sophie Mbarga",
      formation: "BTS MCO",
      status: <Badge kind="ok">Validée</Badge>,
      date: "15 sept.",
    },
    {
      name: "Lucas Kamin",
      formation: "BTS NDRC",
      status: <Badge kind="pending">En attente</Badge>,
      date: "15 sept.",
    },
    {
      name: "Amadou Diallo",
      formation: "BTS MCO",
      status: <Badge kind="ok">Validée</Badge>,
      date: "14 sept.",
    },
    {
      name: "Leïla Ben Ali",
      formation: "BTS NDRC",
      status: <Badge kind="pending">En attente</Badge>,
      date: "14 sept.",
    },
  ];
  return (
    <>
      <section className={`${styles.banner} ${styles.bannerStrip}`}>
        <div className={styles.headRow}>
          <div>
            <h1 className={styles.headTitle}>Bonjour,</h1>
            <p className={styles.headSub}>
              Voici la vue d&apos;ensemble de votre établissement.
            </p>
          </div>
          <div className={styles.headTools}>
            <select
              className={styles.select}
              defaultValue="2025-2026"
              aria-label="Année académique"
            >
              <option>Année académique 2025 - 2026</option>
            </select>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnOrange}`}
            >
              <Icon name="plus" className={styles.navIcon} />
              Générer un rapport
            </button>
          </div>
        </div>
      </section>

      <div className={styles.kpis}>
        <Kpi icon="users" tone="blue" value="126" label="Étudiants" />
        <Kpi icon="user" tone="violet" value="18" label="Enseignants" />
        <Kpi icon="cap" tone="orange" value="6" label="Formations" />
        <Kpi icon="layers" tone="green" value="12" label="Classes" />
        <Kpi
          icon="checkCircle"
          tone="green"
          value="87%"
          label="Taux de présence"
        />
        <Kpi
          icon="chart"
          tone="violet"
          value="72%"
          label="Programmes avancés"
        />
      </div>

      <div className={styles.grid3lead}>
        <Card
          title="Inscriptions récentes"
          link={{
            label: "Voir toutes",
            href: "/campus/direction/inscriptions",
          }}
        >
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Formation</th>
                  <th>Statut</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {inscriptions.map((i) => (
                  <tr key={i.name}>
                    <td>
                      <span className={styles.person}>
                        <Avatar name={i.name} size={28} />
                        {i.name}
                      </span>
                    </td>
                    <td>{i.formation}</td>
                    <td>{i.status}</td>
                    <td>{i.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card
          title="Effectifs par formation"
          link={{
            label: "Voir le détail",
            href: "/campus/direction/formations-classes",
          }}
        >
          <Donut
            segments={[
              { label: "BTS MCO", value: 42, color: "#0f9d9a" },
              { label: "BTS NDRC", value: 38, color: "#1a7fa8" },
              { label: "BTS CG", value: 24, color: "#ffb020" },
              { label: "BTS SIO", value: 22, color: "#ff6a1f" },
            ]}
            centerValue="126"
            centerLabel="Étudiants"
          />
        </Card>

        <Card title="Activité de la plateforme">
          <LineChart
            color="#0f9d9a"
            labels={["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]}
            values={[110, 128, 124, 152, 148, 96, 132]}
          />
          <span className={styles.badge + " " + styles.b_ok}>
            Connexions (7 derniers jours) +12%
          </span>
        </Card>
      </div>

      <div className={styles.grid3}>
        <Card title="Tâches administratives">
          <Todo
            icon="userPlus"
            tone="blue"
            action={{ label: "Voir", href: "/campus/direction/inscriptions" }}
          >
            Valider les inscriptions en attente (4)
          </Todo>
          <Todo
            icon="calendar"
            tone="orange"
            action={{
              label: "Voir",
              href: "/campus/direction/emploi-du-temps",
            }}
          >
            Vérifier les emplois du temps en conflit (2)
          </Todo>
          <Todo
            icon="clipboard"
            tone="violet"
            action={{ label: "Voir", href: "/campus/direction/evaluations" }}
          >
            Générer les bulletins du semestre
          </Todo>
          <Todo
            icon="file"
            tone="green"
            action={{ label: "Voir", href: "/campus/direction/documents" }}
          >
            Mettre à jour les documents officiels
          </Todo>
        </Card>

        <Card title="Alertes">
          <Todo icon="alert" tone="red">
            5 étudiants avec plus de 10% d&apos;absences
          </Todo>
          <Todo icon="alert" tone="orange">
            3 classes en retard de programme
          </Todo>
          <Todo icon="alert" tone="orange">
            2 évaluations non saisies
          </Todo>
          <Todo icon="alert" tone="red">
            1 salle en double réservation
          </Todo>
        </Card>

        <Card title="Accès rapides">
          <div className={styles.quickGrid}>
            <button type="button" className={styles.quickTile}>
              <Icon name="userPlus" />
              Ajouter un étudiant
            </button>
            <button type="button" className={styles.quickTile}>
              <Icon name="layers" />
              Créer une classe
            </button>
            <button type="button" className={styles.quickTile}>
              <Icon name="calendar" />
              Planifier un cours
            </button>
            <button type="button" className={styles.quickTile}>
              <Icon name="send" />
              Envoyer une annonce
            </button>
          </div>
        </Card>
      </div>
    </>
  );
}
