import Link from "next/link";
import { Icon, Progress } from "../establishment/ui";
import styles from "./learning.module.css";

const courses = [
  { title: "Marketing digital", trainer: "Sarah K.", progress: 64, tone: "teal", image: "MK" },
  { title: "Gestion de projet", trainer: "Thomas R.", progress: 28, tone: "orange", image: "GP" },
  { title: "Design UX/UI", trainer: "Emma D.", progress: 12, tone: "purple", image: "UX" },
];

export type LearningDashboardData = {
  role: "student" | "teacher" | "institution";
  profile?: { fullname?: string; expertise?: string | null };
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
};


function Stat({ icon, value, label, tone = "teal" }: { icon: string; value: string; label: string; tone?: string }) {
  return <article className={styles.stat}><span className={`${styles.statIcon} ${styles[`stat_${tone}`]}`}><Icon name={icon} /></span><span><strong>{value}</strong><small>{label}</small></span></article>;
}

type CourseView = (typeof courses)[number] & { id?: string; learners?: number };

function CourseRow({ course, trainer = false }: { course: CourseView; trainer?: boolean }) {
  return <article className={styles.courseRow}>
    <span className={`${styles.courseThumb} ${styles[`thumb_${course.tone}`]}`}>{course.image}</span>
    <span className={styles.courseInfo}><strong>{course.title}</strong><small>{trainer ? `${course.learners ?? course.progress + 3} apprenants` : `Par ${course.trainer}`}</small></span>
    <span className={styles.courseProgress}><Progress value={course.progress} color={course.progress > 45 ? "green" : "orange"} /><small>{course.progress}%</small></span>
    <Link href={trainer ? course.id ? `/creator/courses/${course.id}/builder` : "/creator/courses/new" : course.id ? `/learn/courses/${course.id}` : "/learn/my-courses"} className={styles.smallButton}>{trainer ? "Gérer" : "Continuer"}</Link>
  </article>;
}

export function LearnerHome({ data }: { data?: LearningDashboardData }) {
  const liveCourses: CourseView[] = data
    ? (data.courses ?? []).map((course, index) => ({
        id: course.id,
        title: course.title ?? "Formation",
        trainer: course.teacherName ?? "Formateur Kalatty",
        progress: Number(course.progress ?? 0),
        tone: ["teal", "orange", "purple"][index % 3],
        image: (course.title ?? "KF").slice(0, 2).toUpperCase(),
      }))
    : courses;
  const resume = liveCourses[0];
  const name = data?.profile?.fullname?.split(" ")[0] ?? "Joss";
  const average = Number(data?.stats?.progressAverage ?? resume?.progress ?? 0);
  return <>
    <section className={styles.hero}>
      <div><span className={styles.eyebrow}>Bonjour {name} 👋</span><h1>Continuez là où vous vous êtes arrêté.</h1><p>Votre prochaine étape est prête. Quelques minutes aujourd&apos;hui suffisent pour avancer.</p></div>
      <div className={styles.goalCard}><small>Progression moyenne</small><strong>{liveCourses.length} formation{liveCourses.length > 1 ? "s" : ""} active{liveCourses.length > 1 ? "s" : ""}</strong><div className={styles.goalRing}>{average}%</div><span>{Number(data?.stats?.completedLessons ?? 0)} leçons terminées</span></div>
    </section>
    {resume ? <section className={styles.resumeCard}>
      <span className={`${styles.courseThumb} ${styles.thumb_teal}`}>MK</span>
      <div><small>Continuer mon apprentissage</small><h2>{resume.title}</h2><p>Prochaine étape disponible</p><Progress value={resume.progress} color="green" /></div>
      <span className={styles.resumeMeta}><strong>{resume.progress}%</strong><small>Progression enregistrée</small></span>
      <Link href={resume.id ? `/learn/courses/${resume.id}` : "/learn/my-courses"} className={styles.primaryButton}><Icon name="play" /> Reprendre</Link>
    </section> : <section className={styles.emptyLearning}><Icon name="book" /><div><h2>Aucune formation en cours</h2><p>Explorez le catalogue pour commencer votre premier parcours.</p></div><Link href="/learn/explore" className={styles.primaryButton}>Explorer</Link></section>}
    <div className={styles.sectionHead}><h2>Mes formations en cours</h2><Link href="/learn/my-courses">Voir toutes</Link></div>
    <div className={styles.courseGrid}>{liveCourses.map((course) => <CourseRow key={course.id ?? course.title} course={course} />)}</div>
    <div className={styles.twoColumns}>
      <section className={styles.panel}><div className={styles.sectionHead}><h2>Prochaines étapes</h2></div><ul className={styles.activityList}><li><Icon name="clipboard" /><span><strong>Quiz — Acquisition</strong><small>Marketing digital · 10 questions</small></span><b>Aujourd&apos;hui</b></li><li><Icon name="video" /><span><strong>Chapitre 5 — SEO</strong><small>Durée estimée : 18 min</small></span><b>À suivre</b></li><li><Icon name="award" /><span><strong>Objectif certification</strong><small>Encore 3 cours à terminer</small></span><b>75%</b></li></ul></section>
      <section className={styles.panel}><div className={styles.sectionHead}><h2>Recommandations pour vous</h2><Link href="/learn/explore">Explorer</Link></div><div className={styles.recommendations}><span>Intelligence artificielle<small>1 164 apprenants</small></span><span>Entrepreneuriat<small>980 apprenants</small></span><span>Communication efficace<small>760 apprenants</small></span></div></section>
    </div>
  </>;
}

export function TrainerHome({ data }: { data?: LearningDashboardData }) {
  const liveCourses: CourseView[] = data
    ? (data.courses ?? []).map((course, index) => ({
        id: course.id,
        title: course.title ?? "Formation",
        trainer: "Vous",
        progress: Math.min(100, Number(course.lessonsCount ?? 0) * 12),
        learners: Number(course.learners ?? 0),
        tone: ["teal", "orange", "purple"][index % 3],
        image: (course.title ?? "KF").slice(0, 2).toUpperCase(),
      }))
    : courses;
  const stats = data?.stats ?? {};
  const name = data?.profile?.fullname ?? "Prof. Martin";
  return <>
    <section className={`${styles.hero} ${styles.heroTrainer}`}><div><span className={styles.eyebrow}>Bonjour {name},</span><h1>Votre savoir avance, vos apprenants aussi.</h1><p>Voici les éléments prioritaires de vos formations aujourd&apos;hui.</p></div><Link href="/creator/courses/new" className={styles.primaryButton}><Icon name="plus" /> Créer une formation</Link></section>
    <div className={styles.stats}><Stat icon="users" value={String(stats.totalLearners ?? 0)} label="Apprenants" /><Stat icon="book" value={String(stats.publishedCourses ?? 0)} label="Formations" tone="blue" /><Stat icon="layers" value={String(stats.activeClasses ?? 0)} label="Classes actives" tone="orange" /><Stat icon="chart" value={String(stats.averageLearners ?? 0)} label="Apprenants / cours" tone="purple" /></div>
    <div className={styles.stats}><Stat icon="euro" value={`${new Intl.NumberFormat("fr-FR").format(stats.monthRevenue ?? 0)} FCFA`} label="Revenus ce mois" /><Stat icon="euro" value={`${new Intl.NumberFormat("fr-FR").format(stats.totalRevenue ?? 0)} FCFA`} label="Revenus cumulés" tone="blue" /><Stat icon="video" value={String(liveCourses.reduce((sum, course) => sum + Math.round(course.progress / 12), 0))} label="Leçons publiées" tone="orange" /><Stat icon="mail" value="—" label="Questions à traiter" tone="purple" /></div>
    <div className={styles.twoColumns}>
      <section className={styles.panel}><div className={styles.sectionHead}><h2>Mes formations</h2><Link href="/creator/courses">Voir toutes</Link></div>{liveCourses.length ? liveCourses.map((course) => <CourseRow key={course.id ?? course.title} course={course} trainer />) : <p className={styles.mutedText}>Aucune formation créée pour le moment.</p>}</section>
      <section className={styles.panel}><div className={styles.sectionHead}><h2>Activité récente</h2></div><ul className={styles.activityList}><li><Icon name="award" /><span><strong>Sophie M. a terminé le module 3</strong><small>Marketing digital</small></span><b>Il y a 2 min</b></li><li><Icon name="mail" /><span><strong>Nouvelle question sur « SEO »</strong><small>À traiter</small></span><b>12 min</b></li><li><Icon name="userPlus" /><span><strong>3 nouveaux inscrits aujourd&apos;hui</strong><small>Deux formations</small></span><b>1 h</b></li></ul></section>
    </div>
    <section className={styles.studioCallout}><div><Icon name="video" /><span><strong>Créez votre prochain cours avec Kalatty Studio</strong><small>Enregistrez, montez, ajoutez des interactions et publiez facilement.</small></span></div><Link href="/creator/studio" className={styles.primaryButton}>Ouvrir le Studio →</Link></section>
  </>;
}
