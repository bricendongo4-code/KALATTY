"use client";
import { useCallback, useEffect, useState } from "react";
import styles from "./approval-center.module.css";
type Proposal={id:string;department:string;title:string;rationale:string;status:"pending"|"approved"|"rejected"|"revision_requested";decision_note:string|null;created_at:string;decided_at:string|null};
const labels:Record<string,string>={security:"Sécurité",qa:"Qualité",developer:"Développeur",ux:"UX/UI",product:"Produit",marketing:"Marketing",sales:"Commercial",support:"Support",finance:"Finance",analytics:"Analytics",crm:"CRM"};
const API=process.env.NEXT_PUBLIC_API_BASE_URL??"http://localhost:4000";
export default function ApprovalCenter(){
 const [items,setItems]=useState<Proposal[]>([]),[error,setError]=useState(""),[busy,setBusy]=useState<string|null>(null),[filter,setFilter]=useState("pending"),[note,setNote]=useState<Record<string,string>>({}),[ready,setReady]=useState(false);
 const load=useCallback(async()=>{
  const token=localStorage.getItem("kalatty_token");if(!token){setError("Connectez-vous pour consulter les validations.");return;}
  try{const res=await fetch(API+"/ai-control-center/proposals",{headers:{Authorization:"Bearer "+token},cache:"no-store"});if(!res.ok)throw Error(res.status===403?"Accès réservé au propriétaire.":"Service de validation indisponible ("+res.status+").");
   const body=await res.json() as {proposals?:Proposal[]};setItems(Array.isArray(body.proposals)?body.proposals:[]);setError("");setReady(true);
  }catch(e){setError(e instanceof Error?e.message:"Erreur de chargement");}
 },[]);
 useEffect(()=>{void load()},[load]);
 async function decide(p:Proposal,decision:"approved"|"rejected"|"revision_requested"){
  if(busy||!confirm("Confirmer la décision ? Aucune action ne sera exécutée."))return;
  setBusy(p.id);setError("");
  try{const token=localStorage.getItem("kalatty_token");const res=await fetch(API+"/ai-control-center/proposals/"+encodeURIComponent(p.id)+"/decision",{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({decision,note:note[p.id]??""})});if(!res.ok)throw Error("Décision non enregistrée ("+res.status+").");await load();}
  catch(e){setError(e instanceof Error?e.message:"Erreur de décision")}finally{setBusy(null)}
 }
 const visible=items.filter(p=>filter==="all"||p.status===filter);
 return <section className={styles.root} aria-label="Centre de validation des agents">
  <div className={styles.head}><div><p className={styles.eyebrow}>VALIDATION HUMAINE</p><h2>Centre de validation</h2><p>Les agents proposent. Vous décidez. Aucune approbation ne déclenche d'exécution.</p></div><button onClick={()=>void load()} type="button">Actualiser</button></div>
  <div className={styles.stats}><div><strong>{items.filter(p=>p.status==="pending").length}</strong><span>À examiner</span></div><div><strong>{items.filter(p=>p.status==="approved").length}</strong><span>Approuvées</span></div><div><strong>{items.filter(p=>p.status==="rejected").length}</strong><span>Refusées</span></div></div>
  <div className={styles.filters}><label htmlFor="proposal-filter">Afficher</label><select id="proposal-filter" value={filter} onChange={e=>setFilter(e.target.value)}><option value="pending">En attente</option><option value="all">Toutes</option><option value="approved">Approuvées</option><option value="rejected">Refusées</option><option value="revision_requested">Modifications demandées</option></select></div>
  {error&&<p role="alert" className={styles.error}>{error}</p>}
  {ready&&visible.length===0&&<p className={styles.empty}>Aucune proposition dans cette catégorie. Aucun exemple fictif n'est présenté comme une vraie décision.</p>}
  <div className={styles.list}>{visible.map(p=><article key={p.id} className={styles.item}><div className={styles.itemHead}><span>{labels[p.department]??p.department}</span><span>{p.status==="pending"?"En attente":p.status==="approved"?"Approuvée":p.status==="rejected"?"Refusée":"Modification demandée"}</span></div><h3>{p.title}</h3><p>{p.rationale}</p><small>Créée le {new Date(p.created_at).toLocaleString("fr-FR")}</small>{p.decision_note&&<p><strong>Commentaire :</strong> {p.decision_note}</p>}{p.status==="pending"&&<><label className={styles.note}>Commentaire (obligatoire pour une modification)<textarea maxLength={2000} value={note[p.id]??""} onChange={e=>setNote(prev=>({...prev,[p.id]:e.target.value}))} placeholder="Votre retour à l'agent"/></label><div className={styles.actions}><button disabled={busy!==null} onClick={()=>void decide(p,"approved")}>Approuver</button><button disabled={busy!==null||!(note[p.id]??"").trim()} onClick={()=>void decide(p,"revision_requested")}>Demander une modification</button><button disabled={busy!==null} onClick={()=>void decide(p,"rejected")}>Refuser</button></div></>}</article>)}</div>
  <p className={styles.safety}>Sécurité : l'approbation est une décision enregistrée, pas une autorisation d'exécuter du code, d'effectuer un paiement ou de déployer.</p>
 </section>
}
