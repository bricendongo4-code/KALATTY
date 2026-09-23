import Link from "next/link";
import { Avatar, Icon, Progress } from "../establishment/ui";
import styles from "./learning.module.css";

export type LearningDashboardData = {
  role: "student" | "teacher" | "institution";
  profile?: {
    fullname?: string;
    expertise?: string | null;
    avatar_url?: string;
    avatarUrl?: string;
  };
  stats?: Record<string, number>;
  courses?: Array<{
    id?: string;
    title?: string;
    progress?: number;
    nextLesson?: string;
    teacherName?: string;
    learners?: number;
    lessonsCount?: number;
  }>;
  catalogCourses?: Array<{
    id: string;
    title: string;
    teacherName?: string;
    lessonsCount?: number;
    level?: string;
    enrolled?: boolean;
  }>;
  tasks?: Array<{
    label: string;
    courseId?: string;
    roomId?: string;
    href?: string;
  }>;
  recentActivity?: Array<{
    id: string;
    type: "question" | "enrollment";
    title: string;
    detail: string;
    createdAt: string;
    href: string;
  }>;
};

function Stat({
  icon,
  value,
  label,
  tone = "teal",
}: {
  icon: string;
  value: string;
  label: string;
  tone?: string;
}) {
  return (
    <article className={styles.stat}>
      <span className={`${styles.statIcon} ${styles[`stat_${tone}`]}`}>
        <Icon name={icon} />
      </span>
      <span>
        <strong>{value}</strong>
        <small>{label}</small>
      </span>
    </article>
  );
}

type CourseView = {
  id?: string;
  title: string;
  trainer: string;
  progress: number;
  tone: string;
  image: string;
  learners?: number;
};

function CourseRow({
  course,
  trainer = false,
}: {
  course: CourseView;
  trainer?: boolean;
}) {
  return (
    <article className={styles.courseRow}>
      <span
        className={`${styles.courseThumb} ${styles[`thumb_${course.tone}`]}`}
      >
        {course.image}
      </span>
      <span className={styles.courseInfo}>
        <strong>{course.title}</strong>
        <small>
          {trainer
            ? `${course.learners ?? course.progress + 3} apprenants`
            : `Par ${course.trainer}`}
        </small>
      </span>
      <span className={styles.courseProgress}>
        <Progress
          value={course.progress}
          color={course.progress > 45 ? "green" : "orange"}
        />
        <small>{course.progress}%</small>
      </span>
      <Link
        href={
          trainer
            ? course.id
              ? `/creator/courses/${course.id}/builder`
              : "/creator/courses/new"
            : course.id
              ? `/learn/courses/${course.id}`
              : "/learn/my-courses"
        }
        className={styles.smallButton}
      >
        {trainer ? "Gérer" : "Continuer"}
      </Link>
    </article>
  );
}

export function LearnerHome({ data }: { data: LearningDashboardData }) {
  const liveCourses: CourseView[] = (data.courses ?? []).map(
    (course, index) => ({
      id: course.id,
      title: course.title ?? "Formation",
      trainer: course.teacherName ?? "Formateur Kalatty",
      progress: Number(course.progress ?? 0),
      tone: ["teal", "orange", "purple"][index % 3],
      image: (course.title ?? "KF").slice(0, 2).toUpperCase(),
    }),
  );
  const resume = liveCourses[0];
  const name = data.profile?.fullname?.split(" ")[0] ?? "Apprenant";
  const average = Number(data.stats?.progressAverage ?? resume?.progress ?? 0);
  const tasks = data.tasks ?? [];
  const recommendations = (data.catalogCourses ?? [])
    .filter((course) => !course.enrolled)
    .slice(0, 3);
  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroIdentity}>
          <Avatar
            name={data.profile?.fullname ?? name}
            src={data.profile?.avatar_url ?? data.profile?.avatarUrl}
            size={58}
          />
          <div>
            <span className={styles.eyebrow}>Bonjour {name} 👋</span>
            <h1>Continuez là où vous vous êtes arrêté.</h1>
            <p>
              Votre prochaine étape est prête. Quelques minutes aujourd&apos;hui
              suffisent pour avancer.
            </p>
          </div>
        </div>
        <div className={styles.goalCard}>
          <small>Progression moyenne</small>
          <strong>
            {liveCourses.length} formation{liveCourses.length > 1 ? "s" : ""}{" "}
            active{liveCourses.length > 1 ? "s" : ""}
          </strong>
          <div className={styles.goalRing}>{average}%</div>
          <span>
            {Number(data?.stats?.completedLessons ?? 0)} leçons terminées
          </span>
        </div>
      </section>
      {resume ? (
        <section className={styles.resumeCard}>
          <span className={`${styles.courseThumb} ${styles.thumb_teal}`}>
            MK
          </span>
          <div>
            <small>Continuer mon apprentissage</small>
            <h2>{resume.title}</h2>
            <p>Prochaine étape disponible</p>
            <Progress value={resume.progress} color="green" />
          </div>
          <span className={styles.resumeMeta}>
            <strong>{resume.progress}%</strong>
            <small>Progression enregistrée</small>
          </span>
          <Link
            href={
              resume.id ? `/learn/courses/${resume.id}` : "/learn/my-courses"
            }
            className={styles.primaryButton}
          >
            <Icon name="play" /> Reprendre
          </Link>
        </section>
      ) : (
        <section className={styles.emptyLearning}>
          <Icon name="book" />
          <div>
            <h2>Aucune formation en cours</h2>
            <p>Explorez le catalogue pour commencer votre premier parcours.</p>
          </div>
          <Link href="/learn/explore" className={styles.primaryButton}>
            Explorer
          </Link>
        </section>
      )}
      <div className={styles.sectionHead}>
        <h2>Mes formations en cours</h2>
        <Link href="/learn/my-courses">Voir toutes</Link>
      </div>
      <div className={styles.courseGrid}>
        {liveCourses.map((course) => (
          <CourseRow key={course.id ?? course.title} course={course} />
        ))}
      </div>
      <div className={styles.twoColumns}>
        <section className={styles.panel}>
          <div className={styles.sectionHead}>
            <h2>Prochaines étapes</h2>
          </div>
          {tasks.length ? (
            <ul className={styles.activityList}>
              {tasks.map((task, index) => (
                <li key={`${task.label}-${index}`}>
                  <Icon name={task.roomId ? "calendar" : "play"} />
                  <span>
                    <strong>{task.label}</strong>
                    <small>Action proposée selon votre progression</small>
                  </span>
                  <Link
                    href={
                      task.courseId
                        ? `/learn/courses/${task.courseId}`
                        : "/learn/activities"
                    }
                  >
                    Ouvrir
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className={styles.empty}>
              <Icon name="checkCircle" />
              <h3>Vous êtes à jour</h3>
              <p>
                Commencez une formation pour recevoir vos prochaines étapes.
              </p>
            </div>
          )}
        </section>
        <section className={styles.panel}>
          <div className={styles.sectionHead}>
            <h2>Recommandations pour vous</h2>
            <Link href="/learn/explore">Explorer</Link>
          </div>
          {recommendations.length ? (
            <div className={styles.recommendations}>
              {recommendations.map((course) => (
                <Link key={course.id} href={`/learn/catalog/${course.id}`}>
                  <strong>{course.title}</strong>
                  <small>
                    {course.teacherName ?? "Formateur Kalatty"} ·{" "}
                    {course.lessonsCount ?? 0} leçon(s)
                  </small>
                </Link>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <Icon name="book" />
              <h3>Catalogue parcouru</h3>
              <p>
                De nouvelles formations seront proposées ici dès leur
                publication.
              </p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

export function TrainerHome({ data }: { data: LearningDashboardData }) {
  const liveCourses: CourseView[] = (data.courses ?? []).map(
    (course, index) => ({
      id: course.id,
      title: course.title ?? "Formation",
      trainer: "Vous",
      progress: Math.min(100, Number(course.lessonsCount ?? 0) * 12),
      learners: Number(course.learners ?? 0),
      tone: ["teal", "orange", "purple"][index % 3],
      image: (course.title ?? "KF").slice(0, 2).toUpperCase(),
    }),
  );
  const stats = data.stats ?? {};
  const name = data.profile?.fullname ?? "Formateur";
  const recentActivity = data.recentActivity ?? [];
  return (
    <>
      <section className={`${styles.hero} ${styles.heroTrainer}`}>
        <div className={styles.heroIdentity}>
          <Avatar
            name={name}
            src={data.profile?.avatar_url ?? data.profile?.avatarUrl}
            size={58}
          />
          <div>
            <span className={styles.eyebrow}>Bonjour {name},</span>
            <h1>Votre savoir avance, vos apprenants aussi.</h1>
            <p>
              Voici les éléments prioritaires de vos formations aujourd&apos;hui.
            </p>
          </div>
        </div>
        <Link href="/creator/courses/new" className={styles.primaryButton}>
          <Icon name="plus" /> Créer une formation
        </Link>
      </section>
      <div className={styles.stats}>
        <Stat
          icon="users"
          value={String(stats.totalLearners ?? 0)}
          label="Apprenants"
        />
        <Stat
          icon="book"
          value={String(stats.publishedCourses ?? 0)}
          label="Formations"
          tone="blue"
        />
        <Stat
          icon="layers"
          value={String(stats.activeClasses ?? 0)}
          label="Classes actives"
          tone="orange"
        />
        <Stat
          icon="chart"
          value={String(stats.averageLearners ?? 0)}
          label="Apprenants / cours"
          tone="purple"
        />
      </div>
      <div className={styles.stats}>
        <Stat
          icon="euro"
          value={`${new Intl.NumberFormat("fr-FR").format(stats.monthRevenue ?? 0)} FCFA`}
          label="Revenus ce mois"
        />
        <Stat
          icon="euro"
          value={`${new Intl.NumberFormat("fr-FR").format(stats.totalRevenue ?? 0)} FCFA`}
          label="Revenus cumulés"
          tone="blue"
        />
        <Stat
          icon="video"
          value={String(stats.totalLessons ?? 0)}
          label="Leçons créées"
          tone="orange"
        />
        <Stat
          icon="mail"
          value={String(stats.pendingQuestions ?? 0)}
          label="Questions à traiter"
          tone="purple"
        />
      </div>
      <div className={styles.twoColumns}>
        <section className={styles.panel}>
          <div className={styles.sectionHead}>
            <h2>Mes formations</h2>
            <Link href="/creator/courses">Voir toutes</Link>
          </div>
          {liveCourses.length ? (
            liveCourses.map((course) => (
              <CourseRow
                key={course.id ?? course.title}
                course={course}
                trainer
              />
            ))
          ) : (
            <p className={styles.mutedText}>
              Aucune formation créée pour le moment.
            </p>
          )}
        </section>
        <section className={styles.panel}>
          <div className={styles.sectionHead}>
            <h2>Activité récente</h2>
          </div>
          {recentActivity.length ? (
            <ul className={styles.activityList}>
              {recentActivity.map((activity) => (
                <li key={activity.id}>
                  <Icon
                    name={activity.type === "question" ? "mail" : "userPlus"}
                  />
                  <span>
                    <strong>{activity.title}</strong>
                    <small>{activity.detail}</small>
                  </span>
                  <Link href={activity.href}>Ouvrir</Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className={styles.empty}>
              <Icon name="chart" />
              <h3>Aucune activité récente</h3>
              <p>Les nouvelles inscriptions et questions apparaîtront ici.</p>
            </div>
          )}
        </section>
      </div>
      <section className={styles.studioCallout}>
        <div>
          <Icon name="video" />
          <span>
            <strong>Créez votre prochain cours avec Kalatty Studio</strong>
            <small>
              Enregistrez, montez, ajoutez des interactions et publiez
              facilement.
            </small>
          </span>
        </div>
        <Link href="/creator/studio" className={styles.primaryButton}>
          Ouvrir le Studio →
        </Link>
      </section>
    </>
  );
}
