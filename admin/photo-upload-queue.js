/* One photograph at a time: originals never become one large JSON request. */
((root)=>{
  'use strict';
  const MAX_FILES=20,MAX_TOTAL=200000000,MAX_TRANSFER=10*1024*1024;
  const error=category=>Object.assign(new Error(category),{category});
  const mb=bytes=>(bytes/1000000).toFixed(1);
  function validateSelection(files,existing=[]){
    const all=[...existing,...files],total=all.reduce((n,f)=>n+f.size,0);
    if(all.length>MAX_FILES)return `You selected ${all.length} photographs. You can upload up to 20 at a time.`;
    if(total>MAX_TOTAL)return `These photographs total ${mb(total)} MB. The maximum per batch is 200 MB.`;
    return '';
  }
  function supported(file){return ['image/jpeg','image/png','image/webp'].includes(file.type)&&/\.(?:jpe?g|png|webp)$/i.test(file.name);}
  function receipt(id){return 'photo-'+id.slice('upload:'.length);}
  function comparable(a){return a?{title:a.title,context:a.context,status:a.status||'published',cover:a.cover,photos:a.photos.map(p=>({id:p.id,alt:p.alt,caption:p.caption||''}))}:null;}
  async function saveSafely({api,payload,item,getSnapshot,setSnapshot,wait=ms=>new Promise(r=>setTimeout(r,ms))}){
    const expected=JSON.stringify(getSnapshot().albums.find(a=>a.id===payload.id)||null);
    for(let attempt=0;attempt<3;attempt++){
      const current=getSnapshot();
      const result=await api.save({...payload,sha:current.sha,headSha:current.headSha});
      if(result.ok){setSnapshot(result);return result;}
      if(!['network-failure','album-save-unavailable','album-version-conflict'].includes(result.category))throw error(result.category);
      const latest=await api.load();if(!latest.ok)throw error(result.category);
      const id=item?receipt(item.id):null;
      const album=payload.id?latest.albums.find(a=>a.id===payload.id):id?latest.albums.find(a=>a.photos.some(p=>p.id===id)):null;
      setSnapshot(latest);
      if(item&&album?.photos.some(p=>p.id===id)){
        const desired={...payload.album,cover:payload.album.cover===item.id?id:payload.album.cover,photos:payload.album.photos.map(p=>({...p,id:p.id===item.id?id:p.id}))};
        if(JSON.stringify(comparable(album))!==JSON.stringify(desired))throw error('album-version-conflict');
        return {...latest,albumId:album.id};
      }
      if(!item&&album&&JSON.stringify(comparable(album))===JSON.stringify(payload.album))return {...latest,albumId:album.id};
      if(JSON.stringify(album||null)!==expected)throw error('album-version-conflict');
      if(attempt===2||(!payload.id&&!item))throw error(result.category);
      await wait(800*(attempt+1));
    }
  }
  async function optimise(file){
    if(!supported(file))throw error('album-unsupported-format');
    let bitmap;
    try{
      bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});
      if(!bitmap.width||!bitmap.height)throw error('album-invalid-image');
      const scale=Math.min(1,2560/Math.max(bitmap.width,bitmap.height));
      const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
      const context=canvas.getContext('2d');if(!context)throw error('album-invalid-image');
      context.drawImage(bitmap,0,0,canvas.width,canvas.height);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.9));
      canvas.width=canvas.height=1;
      if(!blob||blob.type!=='image/webp'||blob.size>MAX_TRANSFER)throw error('album-too-large');
      const base64=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=()=>reject(error('album-invalid-image'));r.readAsDataURL(blob);});
      return {base64,mimeType:'image/webp',fileName:'photograph.webp',bytes:blob.size};
    }catch(e){throw e.category?e:error('album-invalid-image');}finally{bitmap?.close();}
  }
  async function run(items,{prepare=optimise,upload,onChange=()=>{}}){
    // Deliberately serial: one bitmap, request, Sharp job and Git ref mutation.
    for(const item of items){
      if(item.state==='complete')continue;
      try{
        item.state='optimising';item.error='';onChange(item);
        const prepared=await prepare(item.file);
        item.state='uploading';onChange(item);
        await upload(item,prepared);
        item.state='complete';
      }catch(e){
        item.state='failed';item.error=e.category||'album-invalid-image';
        if(['network-failure','album-save-unavailable','album-version-conflict','authentication-required','administrator-required'].includes(item.error)){onChange(item);break;}
      }
      onChange(item);
    }
    return {complete:items.filter(p=>p.state==='complete').length,failed:items.filter(p=>p.state==='failed').length,remaining:items.filter(p=>!['complete','failed'].includes(p.state)).length};
  }
  const api=Object.freeze({MAX_FILES,MAX_TOTAL,MAX_TRANSFER,mb,validateSelection,supported,receipt,optimise,run,error,saveSafely});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.churchPhotoUploadQueue=api;
})(globalThis);
