import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{...corsHeaders,"Content-Type":"application/json"}})}
const POSITION_MAP:Record<string,{label:string;short:string}>={
  portero:{label:"PORTERO",short:"POR"},"defensa central":{label:"DEFENSA CENTRAL",short:"DFC"},central:{label:"DEFENSA CENTRAL",short:"DFC"},
  "lateral derecho":{label:"LATERAL DERECHO",short:"LD"},"lateral izquierdo":{label:"LATERAL IZQUIERDO",short:"LI"},
  "carrilero derecho":{label:"CARRILERO DERECHO",short:"CAD"},"carrilero izquierdo":{label:"CARRILERO IZQUIERDO",short:"CAI"},
  centrocampista:{label:"CENTROCAMPISTA",short:"MC"},"mediocentro defensivo":{label:"MEDIOCENTRO DEFENSIVO",short:"MCD"},
  mediapunta:{label:"MEDIAPUNTA",short:"MCO"},"mediocentro ofensivo":{label:"MEDIOCENTRO OFENSIVO",short:"MCO"},
  "extremo derecho":{label:"EXTREMO DERECHO",short:"ED"},"extremo izquierdo":{label:"EXTREMO IZQUIERDO",short:"EI"},
  "segundo delantero":{label:"SEGUNDO DELANTERO",short:"SD"},delantero:{label:"DELANTERO",short:"DC"},"delantero centro":{label:"DELANTERO CENTRO",short:"DC"}
};
function cleanText(value:FormDataEntryValue|null,max=80){return String(value??"").trim().replace(/\s+/g," ").slice(0,max)}
function normalizePosition(value:string){return POSITION_MAP[value.toLocaleLowerCase("es-ES").trim()]??null}
function makePrompt(data:{name:string;nickname:string;body:string;height:string;weight:string;position:string;positionShort:string}){
  const nicknameRule=data.nickname?`NICKNAME: "${data.nickname.toUpperCase()}".\nPlace the nickname in quotation marks, uppercase, smaller gold lettering directly beneath the main name. Shift the main name slightly upward to make room.`:`NO NICKNAME. Do not create, invent or leave a blank nickname line.`;
  const physicalLines=[data.height?`HEIGHT: ${data.height} CM`:"",data.weight?`WEIGHT: ${data.weight} KG`:""].filter(Boolean).join("\n");
  const physicalRules=[data.height?`- Show height ${data.height} CM.`:"- Do NOT show any height field, height label or invented height.",data.weight?`- Show weight ${data.weight} KG.`:"- Do NOT show any weight field, weight label or invented weight."].join("\n");
  const allowedNumbers=[data.height?`${data.height} CM`:"",data.weight?`${data.weight} KG`:"","season 26/27"].filter(Boolean).join(", ");
  return `Create a finished vertical vintage football collectible card using BOTH supplied images as references.

REFERENCE IMAGE 1 is the MASTER CARD and is the definitive visual template. Preserve its overall composition, black-and-gold ornamental frame, stadium/crowd atmosphere, flags, dramatic vintage lighting, distressed print texture, upper gold boot, upper-right Patxanguilles crest, lower gold football, typography hierarchy and premium retro football-card aesthetic as closely as possible.

REFERENCE IMAGE 2 is the SELFIE and is the definitive identity reference for the player. Preserve the person's recognizable facial identity, face shape, hair, facial hair, skin tone and natural ${data.body} anatomy. Do not copy the selfie background or clothing.

Replace the master-card player with the person from the selfie. Render the player as a believable footballer wearing the SAME fixed Patxanguilles vintage kit used by the master design: red-and-black vertical stripes, black collar, retro lace-up neckline, short sleeves, distressed fabric and Patxanguilles crest. Absolutely no Nike, Adidas, Puma or commercial sponsor logos.

PLAYER DATA — reproduce only the supplied strings accurately:
NAME: ${data.name.toUpperCase()}
${nicknameRule}
${physicalLines}${physicalLines?"\n":""}POSITION: ${data.position}
POSITION SHORT: ${data.positionShort}

TEXT / LAYOUT RULES:
- Main name: ${data.name.toUpperCase()}, uppercase, prominent gold lettering.
- Show position abbreviation ${data.positionShort} clearly.
${physicalRules}
- Keep fixed footer text: TEMPORADA 26/27 and PATXANGUILLES ANTIFEIXISTES.
- Do NOT add player ratings, attribute numbers, statistics, scores or FIFA/EA-style stat columns.
- The only numeric information allowed is ${allowedNumbers}.
- Keep all visible text correctly spelled. Do not invent extra text.
- If height or weight was not supplied, remove that data cleanly from the card layout without blank labels, placeholders, dashes or awkward empty gaps.

The result must look like a new card from exactly the same collectible-card series as the MASTER CARD, not merely a portrait pasted onto a template. Maintain the master card's framing, icon placement, visual density, gold/black palette and vintage print finish while changing only the player identity and variable player information.`;
}
function decodeBase64(base64:string){const bin=atob(base64),bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);return bytes}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  if(req.method!=="POST")return json({ok:false,error:"Método no permitido"},405);
  let generationId:number|null=null;let supabase:ReturnType<typeof createClient>|null=null;
  try{
    const openaiKey=Deno.env.get("OPENAI_API_KEY"),supabaseUrl=Deno.env.get("SUPABASE_URL"),serviceRoleKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if(!openaiKey||!supabaseUrl||!serviceRoleKey)return json({ok:false,error:"Configuración del servidor incompleta"},500);
    supabase=createClient(supabaseUrl,serviceRoleKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const form=await req.formData(),action=cleanText(form.get("action"),20).toLowerCase(),playerId=Number(cleanText(form.get("player_id"),30));
    if(!Number.isInteger(playerId)||playerId<=0)return json({ok:false,error:"Jugador no válido"},400);
    if(action==="save"){
      const generationIdToSave=Number(cleanText(form.get("generation_id"),30));
      if(!Number.isInteger(generationIdToSave)||generationIdToSave<=0)return json({ok:false,error:"Generación no válida"},400);
      const {data:generation,error:generationError}=await supabase.from("card_generations").select("id,player_id,status,image_url").eq("id",generationIdToSave).eq("player_id",playerId).maybeSingle();
      if(generationError||!generation||generation.status!=="completed"||!generation.image_url)return json({ok:false,error:"La carta generada no está disponible"},404);
      const publishResponse=await fetch(`${supabaseUrl}/functions/v1/publish-player-card`,{method:"POST",headers:{Authorization:`Bearer ${serviceRoleKey}`,"Content-Type":"application/json"},body:JSON.stringify({generation_id:generation.id})});
      const publication=await publishResponse.json().catch(()=>({}));
      if(publishResponse.ok&&publication?.card_url)return json({ok:true,message:"Carta publicada en el perfil",card_url:publication.card_url,generation_id:generation.id});
      const {data:currentPlayer,error:currentPlayerError}=await supabase.from("players").select("card_url").eq("id",playerId).maybeSingle();
      if(currentPlayerError)throw new Error(`No se pudo comprobar la carta anterior: ${currentPlayerError.message}`);
      let fallbackUrl=currentPlayer?.card_url||null;
      if(!fallbackUrl){const {error:fallbackError}=await supabase.from("players").update({card_url:generation.image_url}).eq("id",playerId);if(fallbackError)throw new Error(`No se pudo activar la copia temporal: ${fallbackError.message}`);fallbackUrl=generation.image_url;}
      return json({ok:true,message:"Carta conservada temporalmente; publicación pendiente",card_url:fallbackUrl,generation_id:generation.id,publication_pending:true});
    }
    const selfie=form.get("selfie"),name=cleanText(form.get("name"),60),nickname=cleanText(form.get("nickname"),50);
    const heightRaw=cleanText(form.get("height"),10).replace(",","."),weightRaw=cleanText(form.get("weight"),10).replace(",",".");
    const heightNum=heightRaw?Number(heightRaw):null,weightNum=weightRaw?Number(weightRaw):null;
    const positionInput=cleanText(form.get("position"),60),position=normalizePosition(positionInput);
    if(!(selfie instanceof File))return json({ok:false,error:"La selfie es obligatoria"},400);
    if(!name)return json({ok:false,error:"El nombre es obligatorio"},400);
    if(heightNum!==null&&(!Number.isFinite(heightNum)||heightNum<120||heightNum>230))return json({ok:false,error:"Altura no válida"},400);
    if(weightNum!==null&&(!Number.isFinite(weightNum)||weightNum<35||weightNum>200))return json({ok:false,error:"Peso no válido"},400);
    if(!position)return json({ok:false,error:"Posición no válida"},400);
    const allowedTypes=new Set(["image/jpeg","image/png","image/webp"]);if(!allowedTypes.has(selfie.type))return json({ok:false,error:"La selfie debe ser JPG, PNG o WebP"},400);if(selfie.size>5*1024*1024)return json({ok:false,error:"La selfie supera el máximo de 5 MB"},400);
    const {data:player,error:playerError}=await supabase.from("players").select("id,nickname").eq("id",playerId).maybeSingle();if(playerError||!player)return json({ok:false,error:"El jugador no existe"},404);
    const body=["Rosana","Erika"].includes(String(player.nickname||""))?"female":"male";
    const {data:masterBlob,error:masterError}=await supabase.storage.from("card-assets").download("master-card.png");if(masterError||!masterBlob)return json({ok:false,error:"No se pudo leer la MASTER CARD"},500);
    const {data:claimRows,error:claimError}=await supabase.rpc("claim_card_generation",{p_player_id:playerId});if(claimError)return json({ok:false,error:"No se pudo reservar el intento",details:claimError.message},500);
    const claim=Array.isArray(claimRows)?claimRows[0]:claimRows;
    if(!claim?.claimed){const reason=claim?.reason;if(reason==="LIMIT_REACHED")return json({ok:false,code:"LIMIT_REACHED",error:"Este jugador ya ha utilizado sus 3 generaciones",attempts:claim.attempts_used,remaining:0},429);if(reason==="ALREADY_PROCESSING")return json({ok:false,code:"ALREADY_PROCESSING",error:"Ya hay una carta generándose para este jugador",attempts:claim.attempts_used,remaining:claim.remaining},409);return json({ok:false,error:"No se pudo iniciar la generación",code:reason??"CLAIM_FAILED"},400)}
    generationId=Number(claim.generation_id);
    const height=heightNum===null?"":String(Math.round(heightNum)),weight=weightNum===null?"":String(Math.round(weightNum));
    const prompt=makePrompt({name,nickname,body,height,weight,position:position.label,positionShort:position.short});
    const openaiForm=new FormData();openaiForm.append("model","gpt-image-2");openaiForm.append("prompt",prompt);openaiForm.append("size","1024x1536");openaiForm.append("quality","medium");openaiForm.append("background","opaque");openaiForm.append("output_format","jpeg");openaiForm.append("output_compression","84");
    openaiForm.append("image[]",new File([await masterBlob.arrayBuffer()],"master-card.png",{type:masterBlob.type||"image/png"}));
    const selfieExt=selfie.type==="image/png"?"png":selfie.type==="image/webp"?"webp":"jpg";openaiForm.append("image[]",new File([await selfie.arrayBuffer()],`selfie.${selfieExt}`,{type:selfie.type}));
    const openaiResponse=await fetch("https://api.openai.com/v1/images/edits",{method:"POST",headers:{Authorization:`Bearer ${openaiKey}`},body:openaiForm});const openaiJson=await openaiResponse.json();if(!openaiResponse.ok)throw new Error(openaiJson?.error?.message??"OpenAI no pudo generar la carta");
    const b64=openaiJson?.data?.[0]?.b64_json;if(!b64)throw new Error("OpenAI no devolvió la imagen esperada");
    const bytes=decodeBase64(b64),path=`generated/${playerId}/card-${generationId}.jpg`;const {error:uploadError}=await supabase.storage.from("player-photos").upload(path,bytes,{contentType:"image/jpeg",upsert:true});if(uploadError)throw new Error(`No se pudo guardar la carta: ${uploadError.message}`);
    const {data:publicUrlData}=supabase.storage.from("player-photos").getPublicUrl(path),cardUrl=publicUrlData.publicUrl;
    const {error:completeError}=await supabase.from("card_generations").update({status:"completed",image_url:cardUrl,error_message:null,completed_at:new Date().toISOString(),publication_status:"generated",publication_error:null}).eq("id",generationId);if(completeError)throw new Error(`No se pudo cerrar la generación: ${completeError.message}`);
    return json({ok:true,message:"Carta generada",card_url:cardUrl,generation_id:generationId,attempts_used:Number(claim.attempts_used),remaining:Number(claim.remaining),position_short:position.short});
  }catch(error){console.error(error);if(supabase&&generationId)await supabase.from("card_generations").update({status:"failed",error_message:error instanceof Error?error.message.slice(0,500):"Error interno",completed_at:new Date().toISOString()}).eq("id",generationId);return json({ok:false,error:error instanceof Error?error.message:"Error interno",attempt_consumed:generationId!==null},500)}
});
