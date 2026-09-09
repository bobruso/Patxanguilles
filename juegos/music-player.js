(()=>{
  if(document.getElementById('gamesBgMusic'))return;

  const playlist=[
    {file:'../patxanguilles.mp3',title:'Himno de la Champions League',artist:'UEFA Champions League'},
    {file:'../Anuncio Canal Me gusta el futbol.m4a',title:'Me gusta el fútbol',artist:'Canal+'},
    {file:'../Jerry Goldsmith The Dream From Total Recall OST.m4a',title:'The Dream (Total Recall OST)',artist:'Jerry Goldsmith'},
    {file:'../Maradona Andres Calamaro.m4a',title:'Maradona',artist:'Andrés Calamaro'},
    {file:'../Fatboy Slim Rockafeller Skank Official Video.m4a',title:'The Rockafeller Skank',artist:'Fatboy Slim'},
    {file:'../Stop the Rock.m4a',title:'Stop the Rock',artist:'Apollo 440'},
    {file:'../Jerk it out The caesars.m4a',title:'Jerk It Out',artist:'Caesars'},
    {file:'../Bloc Party Helicopter Official Music Video.m4a',title:'Helicopter',artist:'Bloc Party'},
    {file:'../Kasabian Club Foot Official Audio.m4a',title:'Club Foot',artist:'Kasabian'},
    {file:'../KNAAN Wavin Flag Coca Cola Celebration Mix.m4a',title:"Wavin' Flag (Coca-Cola Celebration Mix)",artist:"K'NAAN"},
    {file:'../Blur Song 2 Official Music Video.m4a',title:'Song 2',artist:'Blur'},
    {file:'../Gerry The Pacemakers Youll Never Walk Alone Official Video.m4a',title:"You'll Never Walk Alone",artist:'Gerry and the Pacemakers'},
    {file:'../POR MALVINAS POR EL DIEGO POR LA ULTIMA DE LEO.m4a',title:'POR MALVINAS POR EL DIEGO POR LA ULTIMA DE LEO',artist:''},
    {file:'../Rodrigo Bueno La mano de Dios HOMENAJE DIEGO MARADONA 2021.m4a',title:'Rodrigo Bueno La mano de Dios HOMENAJE DIEGO MARADONA 2021',artist:''},
    {file:'../Su Jugador Favoritoo Etoo La Granja.m4a',title:'Su Jugador Favoritoo Etoo La Granja',artist:''},
    {file:'../The Lightning Seeds Three Lions 98 Official Video.m4a',title:'The Lightning Seeds Three Lions 98 Official Video',artist:''},
    {file:'../Bellini Samba De Janeiro.m4a',title:'Bellini Samba De Janeiro',artist:''},
    {file:'../CTID Haaland Song Ha Ha Ha Man City chant English Version.m4a',title:'CTID Haaland Song Ha Ha Ha Man City chant English Version',artist:''},
    {file:'../Joaquin Sabina Motivos de un Sentimiento.m4a',title:'Joaquin Sabina Motivos de un Sentimiento',artist:''},
    {file:'../Kaos Urbano Como Cantona.m4a',title:'Kaos Urbano Como Cantona',artist:''},
    {file:'../Oliver y Benji Campeones Intro Espana.m4a',title:'Oliver y Benji Campeones Intro Espana',artist:''},
    {file:'../Oliver y Benji Campeones.m4a',title:'Oliver y Benji Campeones',artist:''},
    {file:'../Coldplay Viva La Vida.m4a',title:'Coldplay Viva La Vida(1)',artist:''},
    {file:'../Dr. Calypso himne del F.C. Barcelona al Camp Nou.m4a',title:'Dr. Calypso himne del F.C. Barcelona al Camp Nou(1)',artist:''},
    {file:'../El futbol Sonora Santanera.m4a',title:'El futbol Sonora Santanera(1)',artist:''},
    {file:'../El hincha X Vamos Devuelta Rock.m4a',title:'El hincha X Vamos Devuelta Rock',artist:''},
    {file:'../Encara Messi Swing Lynn.m4a',title:'Encara Messi Swing Lynn(2)',artist:''},
    {file:'../Forte Forte de Lacoste Pra Comecar o Final de Seman.m4a',title:'Forte Forte de Lacoste Pra Comecar o Final de Seman(2)',artist:''},
    {file:'../Joao Bosco Vinicius Chora Me Liga.m4a',title:'Joao Bosco Vinicius Chora Me Liga(2)',artist:''},
    {file:'../LOS LEALES CON EL KUN AGUERO.m4a',title:'LOS LEALES CON EL KUN AGUERO(2)',artist:''},
    {file:'../La Roja Baila Himno Oficial de la Seleccion Espanola.m4a',title:'La Roja Baila Himno Oficial de la Seleccion Espanola(2)',artist:''},
    {file:'../Loko Tropkillaz.m4a',title:'Loko Tropkillaz(2)',artist:''},
    {file:'../Los Calzones Rotos Levanten Las Copas.m4a',title:'Los Calzones Rotos Levanten Las Copas(2)',artist:''},
    {file:'../Los Miserables El Crack.m4a',title:'Los Miserables El Crack(2)',artist:''},
    {file:'../MANU CHAO La vida es una tombola El Pibe.m4a',title:'MANU CHAO La vida es una tombola El Pibe(2)',artist:''},
    {file:'../Mancha de Rolando Arde la ciudad.m4a',title:'Mancha de Rolando Arde la ciudad(2)',artist:''},
    {file:'../Mas Que Nada Sergio Mendes.m4a',title:'Mas Que Nada Sergio Mendes(2)',artist:''},
    {file:'../Melendi Me gusta el futbol Videoclip Oficial.m4a',title:'Melendi Me gusta el futbol Videoclip Oficial(1)',artist:''},
    {file:'../Rey Kamikaze FT Guty Edc America de Cali en la puta casa.m4a',title:'Rey Kamikaze FT Guty Edc America de Cali en la puta casa(2)',artist:''},
    {file:'../SKA P himno del RAYO VALLECANO.m4a',title:'SKA P himno del RAYO VALLECANO(2)',artist:''},
    {file:'../TANTA GLORIA TANTO FUTBOL.m4a',title:'TANTA GLORIA TANTO FUTBOL(2)',artist:''},
    {file:'../The Black Keys Lonely Boy Official Music Video.m4a',title:'The Black Keys Lonely Boy Official Music Video(1)',artist:''},
    {file:'../SAINT MOTEL My Type Official Video.m4a',title:'My Type',artist:'Saint Motel'},
    {file:'../The Killers Human Lyrics.m4a',title:'Human',artist:'The Killers'},
    {file:'../Ticket To Ride KAWALA FIFA 21 Official Soundtrack.m4a',title:'Ticket to Ride',artist:'KAWALA'},
    {file:'../Tom Grennan Found What Ive Been Looking For.m4a',title:"Found What I've Been Looking For",artist:'Tom Grennan'},
    {file:'../Viure Pau Alabajos_fragmento.m4a',title:'Viure',artist:'Pau Alabajos'},
    {file:'../Chumbawamba Tubthumping_fragmento.m4a',title:'Tubthumping',artist:'Chumbawamba'},
    {file:'../Heat Waves Glass Animals FIFA 21 Official Soundtrack.m4a',title:'Heat Waves',artist:'Glass Animals'},
    {file:'../KNAAN Wavin Flag World Cup Song.m4a',title:"Wavin' Flag",artist:"K'NAAN"},
    {file:'../Los Ajenos Ole Ole Ponele Corazon Lyric Video.m4a',title:'Ole Ole Ponele Corazón',artist:'Los Ajenos'},
    {file:'../Queen We Are The Champions Official Video Remastered.m4a',title:'We Are the Champions',artist:'Queen'}
  ];

  const style=document.createElement('style');
  style.textContent=`
    .music-controls{position:fixed;left:8px;bottom:8px;z-index:999;display:flex;align-items:center;gap:6px;padding:5px 7px;border:1px solid rgba(255,255,255,.14);border-radius:10px;background:rgba(10,13,16,.82);backdrop-filter:blur(8px);max-width:min(560px,calc(100vw - 20px));color:#fff;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;transition:.18s}
    .music-controls button{border:0;background:transparent;color:white;cursor:pointer;padding:2px 4px;font-size:14px}
    .music-transport{display:flex;align-items:center;gap:2px}.music-transport .music-toggle{width:30px;height:30px;min-width:30px;border-radius:50%;background:rgba(255,255,255,.08)}
    .music-now-playing{display:flex;flex-direction:column;width:170px;max-width:170px;min-width:0;line-height:1.05;overflow:hidden}.music-now-label{font-size:6px;letter-spacing:.12em;color:#8f99a5;text-transform:uppercase;margin-bottom:2px}.music-track-title,.music-track-artist{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.music-track-title{font-size:9px;font-weight:850}.music-track-artist{font-size:7px;color:#9fa8b2;margin-top:2px}
    .music-controls input[type=range]{width:58px;accent-color:#f3f5f7}.music-volume-label{font-size:7px;color:#aab2bd;min-width:20px;text-align:right}
    .music-controls.compact{gap:5px;padding:4px 6px;max-width:min(235px,calc(100vw - 16px));background:rgba(10,13,16,.68)}
    .music-controls.compact .music-prev,.music-controls.compact .music-next,.music-controls.compact .music-now-label,.music-controls.compact .music-track-artist,.music-controls.compact .music-volume,.music-controls.compact .music-volume-label{display:none}
    .music-controls.compact .music-transport{order:2}.music-controls.compact .music-now-playing{order:1;width:min(170px,55vw);max-width:min(170px,55vw)}.music-controls.compact .music-toggle{width:26px;height:26px;min-width:26px}
    @media(max-width:600px){.music-controls{left:6px;bottom:6px;max-width:calc(100vw - 12px);padding:4px 6px}.music-now-playing{width:135px;max-width:135px}.music-controls input[type=range]{width:42px}.music-controls.compact{max-width:min(205px,calc(100vw - 12px))}.music-controls.compact .music-now-playing{width:min(145px,52vw);max-width:min(145px,52vw)}}
  `;
  document.head.appendChild(style);

  const audio=document.createElement('audio');
  audio.id='gamesBgMusic';audio.preload='auto';
  document.body.appendChild(audio);

  const box=document.createElement('div');
  box.className='music-controls compact';box.title='Música';
  box.innerHTML=`<div class="music-transport"><button class="music-prev" type="button" aria-label="Canción anterior" title="Anterior">⏮</button><button class="music-toggle" type="button" aria-label="Pausar o reproducir música" title="Pausa / reproducir">⏸</button><button class="music-next" type="button" aria-label="Siguiente canción" title="Siguiente">⏭</button></div><div class="music-now-playing"><span class="music-now-label">SONANDO</span><strong class="music-track-title">—</strong><span class="music-track-artist"></span></div><input class="music-volume" type="range" min="0" max="1" step="0.05" value="0.45" aria-label="Volumen"><span class="music-volume-label">45%</span>`;
  document.body.appendChild(box);

  const title=box.querySelector('.music-track-title'),artist=box.querySelector('.music-track-artist'),toggle=box.querySelector('.music-toggle'),vol=box.querySelector('.music-volume'),volLabel=box.querySelector('.music-volume-label');
  let bag=[],history=[],historyPos=-1,current=-1,started=false,collapseTimer=null;
  const savedVolume=Number(localStorage.getItem('patxGamesMusicVolume'));
  if(Number.isFinite(savedVolume)&&savedVolume>=0&&savedVolume<=1){audio.volume=savedVolume;vol.value=String(savedVolume)}else audio.volume=.45;
  volLabel.textContent=`${Math.round(audio.volume*100)}%`;

  function refill(){bag=playlist.map((_,i)=>i);for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]]}if(bag.length>1&&current>=0&&bag[0]===current)[bag[0],bag[1]]=[bag[1],bag[0]]}
  function randomIndex(){if(!bag.length)refill();return bag.shift()}
  function render(){const t=playlist[current];title.textContent=t?.title||'—';artist.textContent=t?.artist||'';toggle.textContent=audio.paused?'▶':'⏸'}
  function load(i,remember=true){if(i<0||i>=playlist.length)return;current=i;audio.src=playlist[i].file;if(remember){history.splice(historyPos+1);history.push(i);historyPos=history.length-1}render()}
  function playCurrent(){if(current<0)load(randomIndex());started=true;audio.play().then(render).catch(()=>render())}
  function next(){load(randomIndex());playCurrent()}
  function prev(){if(historyPos>0){historyPos--;load(history[historyPos],false);playCurrent()}}
  function expand(){box.classList.remove('compact');clearTimeout(collapseTimer);collapseTimer=setTimeout(()=>box.classList.add('compact'),4200)}

  toggle.addEventListener('click',e=>{e.stopPropagation();started=true;if(audio.paused)playCurrent();else{audio.pause();render()}expand()});
  box.querySelector('.music-next').addEventListener('click',e=>{e.stopPropagation();next();expand()});
  box.querySelector('.music-prev').addEventListener('click',e=>{e.stopPropagation();prev();expand()});
  vol.addEventListener('input',e=>{e.stopPropagation();audio.volume=Number(vol.value);volLabel.textContent=`${Math.round(audio.volume*100)}%`;localStorage.setItem('patxGamesMusicVolume',String(audio.volume));expand()});
  box.addEventListener('click',e=>{e.stopPropagation();expand()});
  audio.addEventListener('play',render);audio.addEventListener('pause',render);audio.addEventListener('ended',next);
  document.addEventListener('pointerdown',e=>{if(e.target.closest('.music-controls')||started)return;playCurrent()},{once:false});
  load(randomIndex());render();
})();