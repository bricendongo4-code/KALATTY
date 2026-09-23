"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "../establishment/ui";
import styles from "./learning.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type TrainerProfile = {
  id: string;
  name: string;
  bio: string;
  expertise: string;
  country: string;
  avatarUrl: string;
  rating: number;
  reviewsCount: number;
  learnersCount: number;
  courses: Array<{ id: string; title: string; description: string; priceFcfa: number; thumbnailUrl: string; lessonsCount: number; learners: number }>;
  reviews: Array<{ id: string; rating: number; comment: string; authorName: string; createdAt: string }>;
};

export default function TrainerProfilePage({ teacherId }: { teacherId: string }) {
  const router = useRouter();
  const [profile, setProfile] = useState<TrainerProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = localStorage.getItem("kalatty_token");
    if (!token) return router.replace(`/login?redirect=/learn/trainers/${teacherId}`);
    const response = await fetch(`${API_BASE}/courses/trainers/${teacherId}`, { headers: { Authorization: `Bearer ${token}` } });
    const body = await response.json();
    if (!response.ok) return setError(body.message ?? "Profil formateur indisponible.");
    setError(null);
    setProfile(body as TrainerProfile);
  }, [router, teacherId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  if (error) return <section className={styles.loadingState}><Icon name="alert" /><h1>Profil indisponible</h1><p>{error}</p><button type="button" onClick={() => void load()}>Réessayer</button></section>;
  if (!profile) return <section className={styles.loadingState}><span /><h1>Chargement du formateur</h1></section>;

  return <>
    <div className={styles.playerHeader}><Link href="/learn/explore">← Retour au catalogue</Link></div>
    <section className={styles.trainerHero}>
      <div className={styles.trainerAvatar}>{profile.avatarUrl ? <span style={{ backgroundImage: `url(${profile.avatarUrl})` }} /> : profile.name.slice(0, 2).toUpperCase()}</div>
      <div><span className={styles.eyebrow}>FORMATEUR KALATTY</span><h1>{profile.name}</h1><p>{profile.expertise || "Expert et créateur de formations"}</p><small>{profile.country}</small></div>
      <dl><div><dt>Note</dt><dd>{profile.rating ? `${profile.rating}/5` : "Nouveau"}</dd></div><div><dt>Apprenants</dt><dd>{profile.learnersCount}</dd></div><div><dt>Formations</dt><dd>{profile.courses.length}</dd></div></dl>
    </section>
    <div className={styles.trainerColumns}>
      <section className={styles.panel}><h2>À propos</h2><p className={styles.courseLongCopy}>{profile.bio || "Ce formateur n’a pas encore ajouté de présentation détaillée."}</p></section>
      <section className={styles.panel}><h2>Avis des apprenants</h2>{profile.reviews.length ? <div className={styles.trainerReviews}>{profile.reviews.slice(0, 5).map((review) => <article key={review.id}><header><strong>{review.authorName}</strong><b>{review.rating}/5</b></header><p>{review.comment || "Évaluation sans commentaire."}</p></article>)}</div> : <p className={styles.mutedText}>Aucun avis publié pour le moment.</p>}</section>
    </div>
    <div className={styles.sectionHead}><div><h2>Formations publiées</h2><p>{profile.courses.length} formation(s) disponible(s)</p></div></div>
    <section className={styles.liveCourseGrid}>{profile.courses.map((course) => <article className={styles.liveCourseCard} key={course.id}><div className={styles.liveCourseCover}>{course.thumbnailUrl ? <span style={{ backgroundImage: `url(${course.thumbnailUrl})` }} /> : <Icon name="book" />}</div><div className={styles.liveCourseBody}><small>{course.learners} apprenant(s) · {course.lessonsCount} leçon(s)</small><h2>{course.title}</h2><p>{course.description}</p><div><strong>{course.priceFcfa ? `${new Intl.NumberFormat("fr-FR").format(course.priceFcfa)} FCFA` : "Gratuit"}</strong><Link href={`/learn/catalog/${course.id}`}>Découvrir</Link></div></div></article>)}</section>
  </>;
}
