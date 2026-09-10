export const labelKey=s=>s.normalize('NFKC').trim().toLocaleLowerCase('es');
export function shuffle(items,rng=Math.random){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
export function eligibleCards(cards,mode='strict-country'){
 if(mode!=='strict-country')throw Error('Modo no implementado: '+mode);
 const ids=new Map(),labels=new Map();
 for(const c of cards){ids.set(c.id,(ids.get(c.id)||0)+1);const k=labelKey(c.answer_name||'');labels.set(k,(labels.get(k)||0)+1)}
 const valid=cards.filter(c=>c.id&&c.answer_name?.trim()&&c.primary_country&&c.quiz_url&&c.reveal_url&&ids.get(c.id)===1&&labels.get(labelKey(c.answer_name))===1);
 const counts=new Map();for(const c of valid)counts.set(c.primary_country,(counts.get(c.primary_country)||0)+1);
 return valid.filter(c=>counts.get(c.primary_country)>=6);
}
export function choicesFor(card,pool,rng=Math.random){
 const seen=new Set([labelKey(card.answer_name)]);
 const others=shuffle(pool.filter(c=>c.id!==card.id&&c.primary_country===card.primary_country),rng).filter(c=>{const k=labelKey(c.answer_name);if(seen.has(k))return false;seen.add(k);return true});
 if(others.length<5)throw Error('No hay cinco compatriotas distintos');
 return shuffle([card,...others.slice(0,5)],rng);
}
export const scoreFor=elapsed=>500+Math.max(0,500-Math.floor(Math.max(0,elapsed)/20));
