
(()=>{
  const URL='https://cnnhstlguewrxjihhlqc.supabase.co',KEY='sb_publishable_uWEwYEMkAe3YkeAzX7ACAg_0aEYHmM6';
  window.notifyGpsTelegram=async function(matchId,playerId){
    try{
      const p=fetch(`${URL}/functions/v1/telegram-notify`,{method:'POST',keepalive:true,headers:{apikey:KEY,Authorization:`Bearer ${KEY}`,'Content-Type':'application/json'},body:JSON.stringify({type:'gps',entity_id:`${matchId}:${playerId}`,action:'created'})});
      await Promise.race([p,new Promise(r=>setTimeout(r,1300))]);return true;
    }catch(err){console.warn('[GPS] Telegram',err);return false}
  };
})();
