"use client";
import {useCallback,useEffect,useState} from "react";
import styles from "./agents-directory.module.css";
type Source={table:string;available:boolean;count?:number};
type Agent={department:string;available:boolean;sources:Source[]};
const labels:Record<string,string>={security:"Sécurité",qa:"Qualité",developer:"Développeur",ux:"UX/UI",product:"Produit",marketing:"Marketing",sales:"Commercial",support:"Support",finance:"Finance",analytics:"Analytics",crm:"CRM"};
const missions:Record<string,string>={security:"Contrôles d'accès et sécurité",qa:"Tests et qualité",developer:"Code et performance",ux:"Expérience utilisateur",product:"Parcours et fonctionnalités",marketing:"Acquisition et engagement",sales:"Conversions et ventes",support:"Demandes et assistance",finance:"Paiements et revenus",analytics:"Indicateurs de la plateforme",crm:"Suivi des utilisateurs"};
const API=process.env.NEXT_PUBLIC_API_BASE_URL??"http://localhost:4000";
export default function AgentsDirectory({onChoose}:{onChoose:(department:string)=>void}){
 const [agents,setAgents]=useState<Agent[]>([]),[selected,setSelected]=useState("security"),[tab,setTab]=useState("overview"),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 const load=useCallback(async()=>{setBusy(true);try{const token=localStorage.getItem("kalatty_token");if(!token)throw Error("Connexion nécessaire pour consulter les agents.");const r=await fetch(API+"/ai-control-center/signals",{headers:{Authorization:"Bearer "+token},cache:"no-store"});if(!r.ok)throw Error("Signaux indisponibles ("+r.status+")");const body=await r.json() as {agents?:Agent[]};setAgents(Array.isArray(body.agents)?body.agents:[]);setError("");}catch(e){setError(e instanceof Error?e.message:"Erreur")}finally{setBusy(false)}},[]);
 useEffect(()=>{void load()},[load]);
 const agent=agents.find(a=>a.department===selected);
 return <section className={styles.root}><header className={styles.head}><div><p>11 DÉPARTEMENTS</p><h2>Vos agents IA</h2><span>Choisissez un agent pour afficher son espace de travail et ses sources.</span></div><button onClick={()=>void load()} disabled={busy}>{busy?"Chargement…":"Actualiser"}</button></header>
 {error&&<p role="alert">{error}</p>}
 <div className={styles.cards}>{Object.entries(labels).map(([id,name])=><button type="button" className={selected===id?styles.selected:styles.card} key={id} onClick={()=>{setSelected(id);setTab("overview");onChoose(id)}}><strong>{name}</strong><span>{missions[id]}</span><small>{agents.length===0?"En attente de connexion":agents.find(a=>a.department===id)?.available?"Sources disponibles":"Sources incomplètes"}</small></button>)}</div>
 <div className={styles.detail}><div className={styles.detailHead}><div><h3>Agent {labels[selected]}</h3><p>{missions[selected]}</p></div><button type="button" onClick={()=>{onChoose(selected);document.getElementById("ai-department")?.scrollIntoView({behavior:"smooth",block:"center"})}}>Lancer une analyse ↗</button></div><nav className={styles.tabs} aria-label="Détails de l'agent">{[["overview","Vue d'ensemble"],["analysis","Analyses"],["history","Historique"],["settings","Configuration"]].map(([id,name])=><button type="button" key={id} aria-pressed={tab===id} onClick={()=>setTab(id)}>{name}</button>)}</nav>
 {tab==="overview"&&<div><h4>Sources de données</h4>{agent?<ul>{agent.sources.map((s,i)=><li key={s?.table??i}>{s?.table??"Source inconnue"} : {s?.available?(s.count??0)+" enregistrements":"indisponible"}</li>)}</ul>:<p>Aucun signal chargé.</p>}</div>}
 {tab==="analysis"&&<p>Les analyses sont déclenchées manuellement. Sélectionnez cet agent puis utilisez le formulaire « Analyse GPT à la demande » ci-dessous.</p>}
 {tab==="history"&&<p>Les propositions et leurs décisions sont consultables dans le Centre de validation. Les rapports importés restent dans la section historique existante.</p>}
 {tab==="settings"&&<p>Sources : données agrégées en lecture seule. Aucun agent ne peut modifier les données ou déployer. Les paramètres techniques restent gérés côté serveur.</p>}
 </div></section>
}
