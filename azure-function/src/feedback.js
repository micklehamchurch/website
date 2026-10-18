const {randomBytes,randomUUID,createHash,scrypt:derive,timingSafeEqual}=require('node:crypto');
const {promisify}=require('node:util');
const scrypt=promisify(derive);
const {requireAdministrator}=require('./identity');
const {readJson}=require('./news-publishing');
const {createFeedbackStore}=require('./feedback-store');
const STATUSES=['New','In discussion','Planned','In development','Done'];
const MODES=['off','pcc','public'];
const ORIGIN='https://micklehamchurch.github.io';
const SESSION_MS=14*24*60*60*1000;
const digest=value=>createHash('sha256').update(value).digest('hex');
class Rejected extends Error {constructor(status,code){super(code);this.status=status;}}
const reject=(status,code)=>{throw new Rejected(status,code);};
const result=(status,data)=>({status,headers:{'Cache-Control':'no-store','Pragma':'no-cache','X-Content-Type-Options':'nosniff'},jsonBody:data});
function fields(value,allowed,required=allowed){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!allowed.includes(k))||required.some(k=>!Object.hasOwn(value,k)))reject(400,'invalid-feedback');}
function text(value,max,optional=false){if(optional&&(value===undefined||value===''))return '';if(typeof value!=='string'||!value.trim()||value.length>max||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value))reject(400,'invalid-feedback');return value.trim();}
function pageContext(value){fields(value,['title','path','canonicalPath']);const title=text(value.title,200),path=text(value.path,300),canonicalPath=text(value.canonicalPath,300);for(const p of [path,canonicalPath])if(!/^\/website\/(?:[a-z0-9-]+\/)*[a-z0-9-]*\.?[a-z0-9-]*\/?$/i.test(p)||p.includes('..')||p.includes('//'))reject(400,'invalid-feedback');return {title,path,canonicalPath};}
function rate(state,key,max,period,now){const slot=Math.floor(now/period);const bucket=state.limits[key];state.limits[key]={slot,count:bucket?.slot===slot?bucket.count+1:1,expires:(slot+1)*period};return state.limits[key].count<=max;}
function reviewer(state,request,now){const header=request.headers.get('authorization')||'';if(!/^Bearer [A-Za-z0-9_-]{43}$/.test(header))reject(401,'review-access-required');const tokenHash=digest(header.slice(7));const session=state.sessions.find(s=>s.tokenHash===tokenHash&&s.expires>now&&s.epoch===state.epoch);if(!session)reject(401,'review-access-required');return {name:session.name,role:'reviewer',key:tokenHash};}
function summary(topic){return {id:topic.id,author:topic.author,createdAt:topic.createdAt,page:topic.page,body:topic.body,status:topic.status,updatedAt:topic.updatedAt,reviewed:topic.reviewed,removed:topic.removed,audience:topic.audience,replyCount:topic.replies.length};}
function createFeedbackHandlers({store=createFeedbackStore(),now=Date.now}={}){
 async function run(request,admin){
  if(admin){const denied=requireAdministrator(request);if(denied)return denied;}
  try{
   if(!['GET','POST'].includes(request.method))reject(405,'method-not-allowed');
   if(request.method==='POST'&&!admin&&request.headers.get('origin')!==ORIGIN)reject(403,'origin-not-allowed');
   const action=request.query?.get('action')||'config';
   if([...request.query.keys()].some(k=>!['action','id','page','status','q','cursor'].includes(k)))reject(400,'invalid-feedback');
   let body;
   if(request.method==='POST'){try{body=await readJson(request,32768);}catch(e){reject(e instanceof RangeError?413:400,'invalid-feedback');}}
   const at=now(),stamp=new Date(at).toISOString();
   const act=async(state,save)=>{
    if(save)for(const [key,value] of Object.entries(state.limits))if(value.expires<=at)delete state.limits[key];
    // No raw request, name, message, code or bearer value is logged.
    if(request.method==='GET'&&action==='config')return result(200,{ok:true,mode:state.mode,...(admin?{codeConfigured:!!state.code,newCount:state.topics.filter(t=>!t.reviewed&&!t.removed).length}: {})});
    let actor=admin?{name:'Website Admin',role:'admin',key:'admin'}:null;
    if(!admin&&state.mode==='off')reject(403,'feedback-off');
    if(request.method==='POST'&&action==='access'&&!admin){
     fields(body,['name','code']);if(state.mode!=='pcc')reject(403,'review-access-required');
     const name=text(body.name,80),code=text(body.code,128);
     if(!rate(state,'access',10,5*60000,at)){await save(state);reject(429,'feedback-rate-limited');}
     const salt=state.code?.salt||'unconfigured-review-access';const calculated=await scrypt(code,salt,64);
     const expected=state.code?Buffer.from(state.code.hash,'hex'):Buffer.alloc(64);
     const valid=timingSafeEqual(calculated,expected)&&!!state.code;
     if(!valid){await save(state);reject(401,'review-access-required');}
     state.sessions=state.sessions.filter(s=>s.expires>at&&s.epoch===state.epoch);
     if(state.sessions.length>=200)reject(429,'feedback-rate-limited');
     const token=randomBytes(32).toString('base64url'),expires=at+SESSION_MS;
     state.sessions.push({tokenHash:digest(token),name,expires,epoch:state.epoch});await save(state);
     return result(200,{ok:true,token,name,expires});
    }
    if(!admin&&state.mode==='pcc')actor=reviewer(state,request,at);
    if(request.method==='GET'){
     if(!admin&&!actor)reject(403,'review-access-required');
     const visible=state.topics.filter(t=>admin||(!t.removed&&t.audience==='pcc'));
     if(action==='topic'){const topic=visible.find(t=>t.id===request.query.get('id'));if(!topic)reject(404,'feedback-not-found');return result(200,{ok:true,topic});}
     if(action!=='topics')reject(400,'invalid-feedback');
     const page=request.query.get('page'),status=request.query.get('status'),q=(request.query.get('q')||'').toLowerCase();if(q.length>100||status&&!STATUSES.includes(status))reject(400,'invalid-feedback');
     const cursor=Number(request.query.get('cursor')||0);if(!Number.isSafeInteger(cursor)||cursor<0)reject(400,'invalid-feedback');
     const topics=visible.filter(t=>(!page||t.page.path===page)&&(!status||t.status===status)&&(!q||(t.body+' '+t.author.name+' '+t.page.title).toLowerCase().includes(q))).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
     return result(200,{ok:true,topics:topics.slice(cursor,cursor+30).map(summary),next:cursor+30<topics.length?cursor+30:null,newCount:admin?state.topics.filter(t=>!t.removed&&!t.reviewed).length:undefined});
    }
    if(admin&&action==='settings'){
     fields(body,['mode']);if(!MODES.includes(body.mode)||body.mode==='pcc'&&!state.code)reject(400,'review-code-required');state.mode=body.mode;await save(state);return result(200,{ok:true,mode:state.mode});
    }
    if(admin&&action==='rotate-code'){
     fields(body,['code']);const code=text(body.code,128);if(code.length<12)reject(400,'review-code-too-short');const salt=randomBytes(32).toString('hex');state.code={salt,hash:(await scrypt(code,salt,64)).toString('hex')};state.epoch++;state.sessions=[];await save(state);return result(200,{ok:true});
    }
    if(action==='create'){
     fields(body,['body','page','name','website'],['body','page']);
     if(body.website)reject(400,'invalid-feedback');
     if(!actor&&state.mode!=='public')reject(403,'review-access-required');
     const content=text(body.body,5000),page=pageContext(body.page);
     if(!actor)actor={name:text(body.name,80,true)||'Visitor',role:'visitor',key:'public'};
     if(!rate(state,'create:'+actor.key,actor.role==='visitor'?10:20,5*60000,at)){await save(state);reject(429,'feedback-rate-limited');}
     if(state.topics.length>=1000)reject(507,'feedback-capacity');
     const topic={id:randomUUID(),author:{name:actor.name,role:actor.role},createdAt:stamp,page,body:content,audience:actor.role==='visitor'?'public':'pcc',status:'New',updatedAt:stamp,reviewed:false,removed:false,replies:[],history:[]};state.topics.push(topic);await save(state);return result(201,{ok:true,id:topic.id});
    }
    if(!actor)reject(403,'review-access-required');
    const topic=state.topics.find(t=>t.id===request.query.get('id')&&(admin||!t.removed&&t.audience==='pcc'));if(!topic)reject(404,'feedback-not-found');
    if(action==='reply'){
     fields(body,['body']);const content=text(body.body,3000);if(topic.replies.length>=200)reject(507,'feedback-capacity');if(!rate(state,'reply:'+actor.key,30,5*60000,at)){await save(state);reject(429,'feedback-rate-limited');}
     topic.replies.push({id:randomUUID(),author:{name:actor.name,role:actor.role},createdAt:stamp,body:content});topic.updatedAt=stamp;if(!admin)topic.reviewed=false;await save(state);return result(201,{ok:true});
    }
    if(!admin)reject(403,'administrator-required');
    if(action==='moderate'){
     fields(body,['status','reviewed','removed'],[]);if(!Object.keys(body).length||body.status!==undefined&&!STATUSES.includes(body.status)||['reviewed','removed'].some(k=>body[k]!==undefined&&typeof body[k]!=='boolean'))reject(400,'invalid-feedback');
     if(body.status!==undefined&&body.status!==topic.status){topic.history.push({id:randomUUID(),at:stamp,author:{name:'Website Admin',role:'admin'},status:body.status});if(topic.history.length>200)reject(507,'feedback-capacity');topic.status=body.status;topic.updatedAt=stamp;}
     for(const k of ['reviewed','removed'])if(body[k]!==undefined)topic[k]=body[k];await save(state);return result(200,{ok:true});
    }
    reject(400,'invalid-feedback');
   };
   return request.method==='POST'?await store.locked(act):await act(await store.read());
  }catch(e){if(e instanceof Rejected)return result(e.status,{ok:false,error:e.message});return result(e.message==='feedback-capacity'?507:503,{ok:false,error:e.message==='feedback-capacity'?'feedback-capacity':'feedback-unavailable'});}
 }
 return {publicHandler:request=>run(request,false),adminHandler:request=>run(request,true)};
}
module.exports={createFeedbackHandlers,STATUSES,MODES,SESSION_MS};
