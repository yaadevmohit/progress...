"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, CornerDownLeft } from "lucide-react";
import StepLabel from "../get-started/StepLabel";
import FormLeaveGuard from "../ui/components/FormLeaveGuard";
import { CONFIDENCE, validBaseline, type Baseline } from "./model";
import styles from "./page.module.css";
const EMPTY:Baseline={applications:0,tailored:0,recruiterReach:0,networkingEvents:0,confidence:{powerBI:0,python:0},preparing:false,practiceMinutes:0};
export default function FinalQuestions({onComplete}:{onComplete:(baseline:Baseline)=>void}) {
  const [step,setStep]=useState(0);
  const [data,setData]=useState<Baseline>(EMPTY);
  const [applications,setApplications]=useState("");
  const [networking,setNetworking]=useState("");
  const [preparing,setPreparing]=useState<boolean|null>(null);
  const [leaving,setLeaving]=useState(false);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const heading=useRef<HTMLHeadingElement>(null);
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
  useEffect(()=>{heading.current?.focus({preventScroll:true});window.scrollTo({top:0,behavior:"instant"});},[step]);
  const titles=["What did your last week of applying look like?","How many networking events have you attended recently?","How do Power BI and Python feel right now?"];
  function next(){
    if(leaving)return;
    const nextData={...data,preparing:preparing??false,practiceMinutes:preparing?data.practiceMinutes:0};
    if(step===2&&!validBaseline(nextData))return;
    setLeaving(true);
    timer.current=setTimeout(()=>{timer.current=null;if(step===2)onComplete(nextData);else{setStep(current=>current+1);setLeaving(false);}},window.matchMedia("(prefers-reduced-motion: reduce)").matches?0:550);
  }
  return <main className={styles.setupPage}><FormLeaveGuard active/><div className={styles.setupBrand}>jobhunt<span>.</span></div><section key={step} className={`${styles.setupQuestion} ${leaving?styles.setupLeaving:""}`} aria-labelledby="final-question"><StepLabel number={18+step} label={["Your starting snapshot","Beyond applications","Your preparation"][step]}/><h1 ref={heading} tabIndex={-1} id="final-question">{titles[step]}</h1>
    <p className={styles.setupDescription}>{step===0?"A few final details before your workspace. Count applications you actually sent in the last seven days. An honest starting point is more useful than a perfect one.":step===1?"Think about the last month or so: meetups, industry events, career fairs, or a small professional gathering.":"These are useful skills for the analyst track. Confidence helps us understand where you are; practising is what builds momentum."}</p>
    <form onSubmit={event=>{event.preventDefault();next();}}><fieldset disabled={leaving} className={styles.setupFields}>
      <legend className={styles.srOnly}>{titles[step]}</legend>
      {step===0&&<><label className={styles.largeInput}>Applications sent<input type="number" min={0} max={500} step={1} value={applications} placeholder="0" autoFocus required onChange={event=>{const raw=event.target.value;setApplications(raw);const n=Math.max(0,Math.min(500,Number(raw)));setData(current=>({...current,applications:n,tailored:Math.min(current.tailored,n),recruiterReach:Math.min(current.recruiterReach,n)}));}}/></label>
        {applications!==""&&data.applications>0&&<div className={styles.countQuestions}><p>Of those {data.applications} applications…</p><label>How many had a tailored résumé?<div><input aria-label="Applications with a tailored resume" type="number" min={0} max={data.applications} step={1} value={data.tailored} required onChange={event=>setData({...data,tailored:Number(event.target.value)})}/><span>of {data.applications}</span></div></label><label>For how many did you contact a recruiter or someone who could get your application seen?<div><input aria-label="Applications with recruiter or advocate outreach" type="number" min={0} max={data.applications} step={1} value={data.recruiterReach} required onChange={event=>setData({...data,recruiterReach:Number(event.target.value)})}/><span>of {data.applications}</span></div></label><p className={styles.formHelp}>A relevant person may help bring attention to an application. This receives more weight in your effort score than tailoring alone; sending a message does not guarantee a referral or review.</p></div>}
        {applications!==""&&data.applications===0&&<p className={styles.formHelp}>Zero is a valid starting point. We’ll build from here.</p>}
      </>}
      {step===1&&<label className={styles.largeInput}>Events attended in the last month<input type="number" min={0} max={100} step={1} placeholder="0" value={networking} required onChange={event=>{setNetworking(event.target.value);setData({...data,networkingEvents:Number(event.target.value)});}}/><span className={styles.formHelp}>Count events you attended, rather than connections or invitations.</span></label>}
      {step===2&&<><div className={styles.confidenceQuestions}>{([['powerBI','Power BI'],['python','Python']] as const).map(([key,label])=><fieldset key={key}><legend>{label}</legend><div className={styles.confidenceOptions}>{CONFIDENCE.map((text,index)=><label key={text}><input type="radio" name={key} value={index+1} checked={data.confidence[key]===index+1} required onChange={()=>setData({...data,confidence:{...data.confidence,[key]:index+1}})}/><span>{text}</span></label>)}</div></fieldset>)}</div>
        <fieldset className={styles.preparingQuestion}><legend>Are you currently preparing or practising?</legend><div className={styles.choicePair}>{[[true,"Yes, I’ve started"],[false,"Not yet"]].map(([value,label])=><label key={String(value)}><input type="radio" name="preparing" checked={preparing===value} required onChange={()=>{setPreparing(value as boolean);if(!value)setData({...data,practiceMinutes:0});}}/><span>{label}<Check size={15}/></span></label>)}</div></fieldset>
        {preparing&&<label className={styles.practiceInput}>About how many minutes did you practise in the last week?<input type="number" min={0} max={3000} step={1} value={data.practiceMinutes} required onChange={event=>setData({...data,practiceMinutes:Number(event.target.value)})}/></label>}
      </>}
    </fieldset><div className={styles.setupActions}><button type="submit" disabled={leaving||(step===0&&applications==="")||(step===1&&networking==="")||(step===2&&(preparing===null||!data.confidence.powerBI||!data.confidence.python))}>{step===2?"See my workspace":"Enter"}{step===2?<ArrowRight size={17}/>:<CornerDownLeft size={15}/>}</button></div></form>
    <p className={styles.setupFootnote}>Your answers will populate your workspace. We won’t invent individual applications or people from these totals.</p>
  </section></main>;
}
