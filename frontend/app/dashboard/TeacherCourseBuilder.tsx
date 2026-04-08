"use client";

import { useState } from "react";
import styles from "./dashboard.module.css";

type DashboardResponse = {
  stats: Record<string, number>;
  courses: Array<Record<string, unknown>>;
};

type AttachmentDraft = {
  name: string;
  file_path: string;
};

type LessonDraft = {
  title: string;
  video_path: string;
  content: string;
  duration_seconds: string;
  is_preview: boolean;
};

type ExerciseDraft = {
  title: string;
  instructions: string;
  correction: string;
  files: AttachmentDraft[];
};

type ModuleDraft = {
  title: string;
  description: string;
  lessons: LessonDraft[];
  exercises: ExerciseDraft[];
  files: AttachmentDraft[];
};

const createAttachment = (): AttachmentDraft => ({ name: "", file_path: "" });
const createLesson = (): LessonDraft => ({
  title: "",
  video_path: "",
  content: "",
  duration_seconds: "",
  is_preview: false,
});
const createExercise = (): ExerciseDraft => ({
  title: "",
  instructions: "",
  correction: "",
  files: [createAttachment()],
});
const createModule = (): ModuleDraft => ({
  title: "",
  description: "",
  lessons: [createLesson()],
  exercises: [createExercise()],
  files: [createAttachment()],
});

type Props = {
  apiBaseUrl: string;
  onCourseCreated: (updater: (current: DashboardResponse | null) => DashboardResponse | null) => void;
};

export default function TeacherCourseBuilder({
  apiBaseUrl,
  onCourseCreated,
}: Props) {
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [courseShortDescription, setCourseShortDescription] = useState("");
  const [coursePrice, setCoursePrice] = useState("");
  const [courseThumbnailPath, setCourseThumbnailPath] = useState("");
  const [modules, setModules] = useState<ModuleDraft[]>([createModule()]);
  const [courseMessage, setCourseMessage] = useState("");
  const [courseLoading, setCourseLoading] = useState(false);

  const updateModule = (index: number, nextModule: ModuleDraft) => {
    setModules((current) =>
      current.map((module, moduleIndex) =>
        moduleIndex === index ? nextModule : module,
      ),
    );
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("kalatty_token");

    if (!token) {
      setCourseMessage("Session introuvable. Reconnecte-toi.");
      return;
    }

    setCourseLoading(true);
    setCourseMessage("");

    try {
      const res = await fetch(`${apiBaseUrl}/courses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: courseTitle,
          description: courseDescription,
          short_description: courseShortDescription,
          price_fcfa: Number(coursePrice || 0),
          thumbnail_path: courseThumbnailPath,
          modules: modules.map((module) => ({
            title: module.title,
            description: module.description,
            lessons: module.lessons
              .filter((lesson) => lesson.title.trim())
              .map((lesson) => ({
                title: lesson.title,
                content: lesson.content,
                video_path: lesson.video_path,
                duration_seconds: lesson.duration_seconds
                  ? Number(lesson.duration_seconds)
                  : null,
                is_preview: lesson.is_preview,
              })),
            exercises: module.exercises
              .filter((exercise) => exercise.title.trim())
              .map((exercise) => ({
                title: exercise.title,
                instructions: exercise.instructions,
                correction: exercise.correction,
                files: exercise.files.filter(
                  (file) => file.name.trim() && file.file_path.trim(),
                ),
              })),
            files: module.files.filter(
              (file) => file.name.trim() && file.file_path.trim(),
            ),
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCourseMessage(
          typeof data.message === "string"
            ? data.message
            : "Impossible de creer le cours pour le moment.",
        );
        return;
      }

      onCourseCreated((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          stats: {
            ...current.stats,
            publishedCourses: (current.stats.publishedCourses ?? 0) + 1,
          },
          courses: [data, ...current.courses],
        };
      });

      setCourseTitle("");
      setCourseDescription("");
      setCourseShortDescription("");
      setCoursePrice("");
      setCourseThumbnailPath("");
      setModules([createModule()]);
      setCourseMessage("Cours cree avec succes.");
    } catch {
      setCourseMessage("Le cours n'a pas pu etre cree.");
    } finally {
      setCourseLoading(false);
    }
  };

  return (
    <section className={styles.card}>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.sectionLabel}>Creation de cours</p>
          <h2>Construire un cours Kallaty</h2>
        </div>
      </div>

      <form onSubmit={handleCreateCourse} className={styles.teacherForm}>
        <label className={styles.formField}>
          <span>Titre du cours</span>
          <input type="text" value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)} required />
        </label>

        <label className={styles.formField}>
          <span>Description courte</span>
          <input
            type="text"
            value={courseShortDescription}
            onChange={(e) => setCourseShortDescription(e.target.value)}
          />
        </label>

        <label className={styles.formField}>
          <span>Description complete</span>
          <textarea
            className={styles.formTextarea}
            rows={4}
            value={courseDescription}
            onChange={(e) => setCourseDescription(e.target.value)}
          />
        </label>

        <div className={styles.metaFields}>
          <label className={styles.formField}>
            <span>Prix (FCFA)</span>
            <input type="number" min="0" value={coursePrice} onChange={(e) => setCoursePrice(e.target.value)} />
          </label>

          <label className={styles.formField}>
            <span>Chemin miniature Storage</span>
            <input
              type="text"
              value={courseThumbnailPath}
              onChange={(e) => setCourseThumbnailPath(e.target.value)}
              placeholder="course-thumbnails/nom-image.jpg"
            />
          </label>
        </div>

        <div className={styles.moduleList}>
          {modules.map((module, moduleIndex) => (
            <section key={`module-${moduleIndex}`} className={styles.moduleCard}>
              <div className={styles.moduleHeader}>
                <h3>Module {moduleIndex + 1}</h3>
                {modules.length > 1 ? (
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() =>
                      setModules((current) =>
                        current.filter((_, index) => index !== moduleIndex),
                      )
                    }
                  >
                    Supprimer
                  </button>
                ) : null}
              </div>

              <label className={styles.formField}>
                <span>Titre du module</span>
                <input
                  type="text"
                  value={module.title}
                  onChange={(e) =>
                    updateModule(moduleIndex, { ...module, title: e.target.value })
                  }
                />
              </label>

              <label className={styles.formField}>
                <span>Description du module</span>
                <textarea
                  className={styles.formTextarea}
                  rows={3}
                  value={module.description}
                  onChange={(e) =>
                    updateModule(moduleIndex, {
                      ...module,
                      description: e.target.value,
                    })
                  }
                />
              </label>

              <div className={styles.subsection}>
                <div className={styles.subsectionHeader}>
                  <h4>Videos / lecons</h4>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() =>
                      updateModule(moduleIndex, {
                        ...module,
                        lessons: [...module.lessons, createLesson()],
                      })
                    }
                  >
                    Ajouter une video
                  </button>
                </div>

                {module.lessons.map((lesson, lessonIndex) => (
                  <div key={`lesson-${lessonIndex}`} className={styles.nestedCard}>
                    <div className={styles.nestedHeader}>
                      <strong>Video {lessonIndex + 1}</strong>
                    </div>

                    <div className={styles.metaFields}>
                      <label className={styles.formField}>
                        <span>Titre</span>
                        <input
                          type="text"
                          value={lesson.title}
                          onChange={(e) =>
                            updateModule(moduleIndex, {
                              ...module,
                              lessons: module.lessons.map((item, index) =>
                                index === lessonIndex
                                  ? { ...item, title: e.target.value }
                                  : item,
                              ),
                            })
                          }
                        />
                      </label>

                      <label className={styles.formField}>
                        <span>Duree (secondes)</span>
                        <input
                          type="number"
                          min="0"
                          value={lesson.duration_seconds}
                          onChange={(e) =>
                            updateModule(moduleIndex, {
                              ...module,
                              lessons: module.lessons.map((item, index) =>
                                index === lessonIndex
                                  ? { ...item, duration_seconds: e.target.value }
                                  : item,
                              ),
                            })
                          }
                        />
                      </label>
                    </div>

                    <label className={styles.formField}>
                      <span>Chemin video Storage</span>
                      <input
                        type="text"
                        value={lesson.video_path}
                        onChange={(e) =>
                          updateModule(moduleIndex, {
                            ...module,
                            lessons: module.lessons.map((item, index) =>
                              index === lessonIndex
                                ? { ...item, video_path: e.target.value }
                                : item,
                            ),
                          })
                        }
                        placeholder="course-videos/nom-video.mp4"
                      />
                    </label>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => setModules((current) => [...current, createModule()])}
        >
          Ajouter un module
        </button>

        <button type="submit" className={styles.submitButton} disabled={courseLoading}>
          {courseLoading ? "Publication..." : "Creer le cours"}
        </button>

        {courseMessage ? <p className={styles.inlineMessage}>{courseMessage}</p> : null}
      </form>
    </section>
  );
}
