"use client";
import { useEffect, useMemo, useState } from "react";
import styles from "./agents-overview.module.css";

type Signal = { table: string; available: boolean; count?: number };
type Agent = { department: string; sources: Signal[]; available: boolean };
type Snapshot = { generatedAt: string; dataMode: string; agents: Agent[] };
const names: Record<string,string> = {
 security:"Sécurité",qa:"Qualité",developer:"Développement",ux:"Expérience utilisateur",
 product:"Produit",marketing:"Marketing",sales:"Commercial",support:"Support",
 finance:"Finance",analytics:"Analyse de données",crm:"Relation client"
};
const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
export default function AgentsOverview({onChoose}: {onChoose:(department:string)=>void}) {
 const [snapshot,setSnapshot]=useState<Snapshot|null>(null);
 const [status,setStatus]=useState("Chargement des indicateurs réels…");
 const [filter,setFilter]=useState("all");
 const [refresh,setRefresh]=useState(0);
 useEffect(()=>{
  const token=localStorage.getItem("kalatty_token");
  if(!token){setStatus("Connectez-vous pour consulter les indicateurs des agents.");return;}
  const abort=new AbortController();
  fetch(API+"/ai-control-center/signals",{headers:{Authorization:"Bearer "+token},signal:abort.signal,cache:"no-store"})
   .then(async r=>{if(!r.ok)throw Error(r.status===403?"Accès réservé au propriétaire.":"Indicateurs indisponibles ("+r.status+").");return r.json();})
   .then((data:Snapshot)=>{if(!abort.signal.aborted){if(!Array.isArray(data.agents))throw Error("Réponse invalide");setSnapshot(data);setStatus("");}})
   .catch(e=>{if(!abort.signal.aborted)setStatus(e instanceof Error?e.message:"Connexion impossible");});
  return ()=>abort.abort();
 },[refresh]);
 const ready=snapshot?.agents.filter(a=>a.available).length??0;
 const shown=useMemo(()=>snapshot?.agents.filter(a=>filter==="all"||(filter==="ready"?a.available:!a.available))??[],[snapshot,filter]);
 return <section className={styles.section} aria-label="Vue d'ensemble des agents">
  <div className={styles.top}><div><p className={styles.kicker}>VUE D’ENSEMBLE</p><h2>Vos 11 agents IA</h2><p>Indicateurs réels, supervision humaine et analyses sur demande.</p></div>
  <button className={styles.refresh} onClick={()=>setRefresh(n=>n+1)} type="button">Actualiser</button></div>
  {snapshot&&<><div className={styles.stats}>
    <div><span>Agents configurés</span><strong>{snapshot.agents.length}</strong></div>
    <div><span>Sources accessibles</span><strong>{ready}</strong></div>
    <div><span>Sources à vérifier</span><strong>{snapshot.agents.length-ready}</strong></div>
    <div><span>Exécution automatique</span><strong>Inactive</strong></div>
  </div><p className={styles.timestamp}>Dernière lecture : {new Date(snapshot.generatedAt).toLocaleString("fr-FR")} · Données agrégées, lecture seule</p>
  <div className={styles.filters} role="group" aria-label="Filtrer les agents">
   {([["all","Tous"],["ready","Sources accessibles"],["blocked","À vérifier"]] as const).map(([id,label])=><button key={id} type="button" aria-pressed={filter===id} onClick={()=>setFilter(id)} className={filter===id?styles.active:""}>{label}</button>)}
  </div><div className={styles.grid}>{shown.map(agent=><article className={styles.agent} key={agent.department}>
   <div className={styles.agentHead}><span className={styles.avatar}>{(names[agent.department]??agent.department).slice(0,1)}</span><span className={agent.available?styles.ok:styles.warn}>{agent.available?"Sources accessibles":"Sources à vérifier"}</span></div>
   <h3>{names[agent.department]??agent.department}</h3>
   <p>{agent.sources.filter(s=>s.available).length} source(s) disponible(s) sur {agent.sources.length}</p>
   <div className={styles.sources}>{agent.sources.map(s=><span key={s.table} title={s.available?`Nombre agrégé : ${s.count??0}`:"Source indisponible"}>{s.table}{s.available?" ✓":" · indisponible"}</span>)}</div>
   <button type="button" className={styles.action} onClick={()=>onChoose(agent.department)}>Sélectionner cet agent</button>
  </article>)}</div>{shown.length===0&&<p>Aucun agent pour ce filtre.</p>}</>}
  {status&&<p className={styles.message} role="status">{status}</p>}
 </section>;
}
