/* Deployment refresh — no functional changes. */
(()=>{
"use strict";
const form=document.getElementById("emdon-contact-form");
if(!form)return;
const status=form.querySelector(".emdon-contact-status");
const button=form.querySelector(".emdon-submit");
const turnstileBox=document.getElementById("emdon-turnstile");
let widget=null,ready=false;
const setStatus=(message,error=false)=>{status.textContent=message;status.classList.toggle("error",error);};
const verifyReady=()=>ready&&window.turnstile&&widget!==null;
async function loadSecurity(){
  try{
    const response=await fetch("/api/contact",{cache:"no-store"});
    if(!response.ok)throw Error("Security configuration is not available.");
    const config=await response.json();
    if(!config.turnstileSiteKey)throw Error("Turnstile has not been configured for this site.");
    const script=document.createElement("script");
    script.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async=true;
    script.onload=()=>{
      if(!window.turnstile){setStatus("Security verification failed to load. Please refresh.",true);return;}
      try{
        widget=window.turnstile.render(turnstileBox,{sitekey:config.turnstileSiteKey,theme:"auto"});
        ready=true;
      }catch(err){console.error("Turnstile render error",err);setStatus("Security verification failed to load. Please refresh.",true);}
    };
    script.onerror=()=>setStatus("Security verification could not load. Please refresh.",true);
    document.head.appendChild(script);
  }catch(err){console.error("Security initialization error",err);setStatus("Security verification is unavailable. Please try again later.",true);}
}
form.addEventListener("submit",async event=>{
  event.preventDefault();
  event.stopImmediatePropagation();
  if(!form.reportValidity())return;
  const data=Object.fromEntries(new FormData(form).entries());
  if(!data.email.trim()&&!data.phone.trim()){setStatus("Please enter an email address or phone number.",true);return;}
  if(!verifyReady()){setStatus("Security verification is still loading. Please try again.",true);return;}
  const token=window.turnstile.getResponse(widget);
  if(!token){setStatus("Please complete the security check.",true);return;}
  button.disabled=true;
  setStatus("Sending your request…");
  try{
    const response=await fetch("/api/contact",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...data,turnstileToken:token})});
    const result=await response.json();
    if(!response.ok)throw Error(result.error||"Could not send your message.");
    form.querySelector(".emdon-fields").hidden=true;
    const success=form.querySelector(".emdon-contact-success");
    success.hidden=false;
    success.focus({preventScroll:true});
    setStatus("");
  }catch(err){
    setStatus(err.message||"Could not send your message.",true);
    if(verifyReady())window.turnstile.reset(widget);
  }finally{button.disabled=false;}
},true);
loadSecurity();
})();