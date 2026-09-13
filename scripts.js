// ============================================
// 🎵 GESTÃO LITÚRGICA - CORO PAROQUIAL
// Versão 6.0 - Assistente Litúrgico
// ============================================

// ============================================
// CONFIGURAÇÃO GLOBAL
// ============================================

const PROGRAM_PARTS = [
  {id:'entrada', label:'Entrada'},
  {id:'atoPenitencial', label:'Ato Penitencial'},
  {id:'gloria', label:'Glória'},
  {id:'salmo', label:'Salmo Responsorial'},
  {id:'aclamacao', label:'Aclamação ao Evangelho'},
  {id:'ofertorio', label:'Ofertório'},
  {id:'santo', label:'Santo'},
  {id:'paiNosso', label:'Pai Nosso'},
  {id:'paz', label:'Paz'},
  {id:'cordeiro', label:'Cordeiro de Deus'},
  {id:'comunhao', label:'Comunhão'},
  {id:'acaoGracas', label:'Ação de Graças'},
  {id:'final', label:'Final'}
];

window.PROGRAM_PARTS = PROGRAM_PARTS;

let songs = [];
let history = [];
let savedLeaflets = [];
let customSongs = [];
let songUsageHistory = [];
let partLyricsOverrides = {};

// ============================================
// SISTEMA DE TABS
// ============================================

function initTabs() {
  const tabButtons = document.querySelectorAll('.tabs button[data-tab], .tabs-more button[data-tab]');
  const tabContents = document.querySelectorAll('section.tab');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.getAttribute('data-tab');
      
      // Remove active de todos
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Adiciona active ao clicado
      button.classList.add('active');
      const targetContent = document.getElementById(targetTab);
      if (targetContent) {
        targetContent.classList.add('active');
      }
      
      // Salva tab ativa
      localStorage.setItem('coroActiveTab', targetTab);
      
      // Atualiza conteúdo se necessário
      if (targetTab === 'tab-catalogo') {
        renderSongsTable();
      } else if (targetTab === 'tab-pessoas') {
        renderPeople();
      } else if (targetTab === 'tab-historico') {
        renderHistory();
      } else if (targetTab === 'tab-folhetos') {
        renderSavedLeaflets();
      } else if (targetTab === 'tab-dashboard') {
        updateDashboard();
        renderCalendar();
      }
    });
  });
  
  // Restaura última tab ativa
  const lastTab = localStorage.getItem('coroActiveTab') || 'tab-dashboard';
  const lastButton = document.querySelector(`button[data-tab="${lastTab}"]`);
  if (lastButton) {
    lastButton.click();
  } else {
    // Se não encontrar, ativa a primeira
    if (tabButtons.length > 0) {
      tabButtons[0].click();
    }
  }
}

// Navegação secundária
function initMoreNav(){
  const btn=document.getElementById('moreNavBtn');
  const box=document.getElementById('moreNav');
  if(!btn||!box)return;
  btn.addEventListener('click',()=>{
    const open=btn.getAttribute('aria-expanded')==='true';
    btn.setAttribute('aria-expanded',String(!open));
    box.hidden=open;
  });
  box.querySelectorAll('button[data-tab]').forEach(b=>b.addEventListener('click',()=>{
    box.hidden=true;
    btn.setAttribute('aria-expanded','false');
  }));
  document.addEventListener('click',e=>{
    if(!box.hidden && !box.contains(e.target) && !btn.contains(e.target)){
      box.hidden=true;
      btn.setAttribute('aria-expanded','false');
    }
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape' && !box.hidden){
      box.hidden=true;
      btn.setAttribute('aria-expanded','false');
      btn.focus();
    }
  });
}

function getPeopleStore(){
  try{const p=JSON.parse(localStorage.getItem('coroPeople')||'{}');return {salmistas:Array.isArray(p.salmistas)?p.salmistas.filter(Boolean):[],organistas:Array.isArray(p.organistas)?p.organistas.filter(Boolean):[]};}catch(e){return {salmistas:[],organistas:[]};}
}
function savePeopleStore(p){localStorage.setItem('coroPeople',JSON.stringify(p));}
function populatePersonSelects(){
  const p=getPeopleStore();
  (history||[]).forEach(h=>{if(h.salmista&&!p.salmistas.includes(h.salmista))p.salmistas.push(String(h.salmista).trim());if(h.organista&&!p.organistas.includes(h.organista))p.organistas.push(String(h.organista).trim());});
  p.salmistas=[...new Set(p.salmistas.filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt'));
  p.organistas=[...new Set(p.organistas.filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt'));
  savePeopleStore(p);
  [['salmistaPrograma',p.salmistas,'salmista'],['organistaPrograma',p.organistas,'organista']].forEach(([id,arr,type])=>{
    const el=document.getElementById(id);if(!el)return;const current=el.value;el.innerHTML='<option value="">— escolher —</option>'+arr.map(n=>`<option value="${escSmart(n)}">${escSmart(n)}</option>`).join('')+`<option value="__add_${type}__">＋ Adicionar novo...</option>`;if(current&&arr.includes(current))el.value=current;
  });
}
function addPerson(type,name){
  const clean=String(name||'').trim();if(!clean)return false;const p=getPeopleStore();const key=type==='salmista'?'salmistas':'organistas';if(!p[key].some(x=>normSmart(x)===normSmart(clean)))p[key].push(clean);savePeopleStore(p);populatePersonSelects();renderPeople();return true;
}
function removePerson(type,name){
  const p=getPeopleStore(),key=type==='salmista'?'salmistas':'organistas';p[key]=p[key].filter(x=>normSmart(x)!==normSmart(name));savePeopleStore(p);populatePersonSelects();renderPeople();
}
function renderPeople(){
  const p=getPeopleStore();
  const salmistas=new Set(p.salmistas),organistas=new Set(p.organistas);
  (history||[]).forEach(h=>{if(h.salmista)salmistas.add(String(h.salmista).trim());if(h.organista)organistas.add(String(h.organista).trim());});
  const render=(id,set,type)=>{const el=document.getElementById(id);if(!el)return;const arr=[...set].filter(Boolean).sort((a,b)=>a.localeCompare(b,'pt'));el.innerHTML=arr.length?arr.map(n=>`<div class="person-row"><span>${escSmart(n)}</span><button type="button" class="btn secondary tiny" data-remove-person="${type}" data-name="${escSmart(n)}">Remover</button></div>`).join(''):'<span class="muted">Ainda não existem pessoas registadas.</span>';};
  render('peopleSalmistas',salmistas,'salmista');render('peopleOrganistas',organistas,'organista');
  document.querySelectorAll('[data-remove-person]').forEach(b=>b.onclick=()=>{if(confirm(`Remover ${b.dataset.name} da lista?`))removePerson(b.dataset.removePerson,b.dataset.name);});
}
function initPeople(){
  populatePersonSelects();renderPeople();
  document.getElementById('addSalmistaBtn')?.addEventListener('click',()=>{const i=document.getElementById('newSalmistaName');if(addPerson('salmista',i?.value)){i.value='';}});
  document.getElementById('addOrganistaBtn')?.addEventListener('click',()=>{const i=document.getElementById('newOrganistaName');if(addPerson('organista',i?.value)){i.value='';}});
  ['salmistaPrograma','organistaPrograma'].forEach(id=>document.getElementById(id)?.addEventListener('change',e=>{if(e.target.value.startsWith('__add_')){const type=e.target.value.includes('salmista')?'salmista':'organista';const name=prompt(`Nome do ${type}:`,'');if(name&&addPerson(type,name))e.target.value=name;else e.target.value='';}}));
}


// ============================================
// TEMA ESCURO/CLARO
// ============================================

function initTheme() {
  const toggleBtn = document.getElementById('themeToggleBtn');
  if (!toggleBtn) return;
  
  const savedTheme = localStorage.getItem('coroTheme') || 'dark';
  document.documentElement.className = savedTheme;
  updateThemeIcon(savedTheme);
  
  toggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.className || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.className = newTheme;
    localStorage.setItem('coroTheme', newTheme);
    updateThemeIcon(newTheme);
  });
}

function updateThemeIcon(theme) {
  const btn = document.getElementById('themeToggleBtn');
  if (!btn) return;
  btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

// ============================================
// CALENDÁRIO LITÚRGICO
// ============================================

const LITURGICAL_CALENDAR = {"2026-01-01":{"title":"SANTA MARIA, MÃE DE DEUS","color":"Branco","season":"natal","year":"A","type":"Solenidade","psalm":"Deus tenha compaixão de nós","theme":"Maria, Mãe de Deus, bênção, paz"},"2026-01-04":{"title":"EPIFANIA DO SENHOR","color":"Branco","season":"natal","year":"A","type":"Solenidade","psalm":"Virão adorar-Vos, Senhor, todos os povos da terra","theme":"Epifania, adoração, povos, luz, reis"},"2026-01-11":{"title":"BATISMO DO SENHOR","color":"Branco","season":"natal","year":"A","type":"Festa","psalm":"O Senhor abençoará o seu povo","theme":"Batismo, água, Espírito, Filho amado"},"2026-01-18":{"title":"DOMINGO II DO TEMPO COMUM","color":"Verde","season":"tempocomum","year":"A","type":"Domingo","psalm":"Toda a terra vos adore","theme":"Cordeiro de Deus, testemunho, vocação"},"2026-01-25":{"title":"DOMINGO III DO TEMPO COMUM","color":"Verde","season":"tempocomum","year":"A","type":"Domingo","psalm":"O Senhor é a minha luz e a minha salvação","theme":"Palavra de Deus, conversão, luz, missão"},"2026-02-01":{"title":"DOMINGO IV DO TEMPO COMUM","color":"Verde","season":"tempocomum","year":"A","type":"Domingo","psalm":"Bem-aventurados os pobres em espírito","theme":"Bem-aventuranças, pobreza, justiça, reino"},"2026-02-08":{"title":"DOMINGO V DO TEMPO COMUM","color":"Verde","season":"tempocomum","year":"A","type":"Domingo","psalm":"Para o homem recto nascerá uma luz no meio das trevas","theme":"luz, testemunho, sal, boas obras"},"2026-02-15":{"title":"DOMINGO VI DO TEMPO COMUM","color":"Verde","season":"tempocomum","year":"A","type":"Domingo","psalm":"Ditoso o que anda na lei do Senhor","theme":"lei, mandamentos, vida, escolha"},"2026-02-22":{"title":"DOMINGO I DA QUARESMA","color":"Roxo","season":"quaresma","year":"A","type":"Domingo","psalm":"Pecámos, Senhor: tende piedade de nós","theme":"Quaresma, conversão, pecado, misericórdia, deserto"},"2026-03-01":{"title":"DOMINGO II DA QUARESMA","color":"Roxo","season":"quaresma","year":"A","type":"Domingo","psalm":"Esperamos, Senhor, na vossa misericórdia","theme":"Quaresma, transfiguração, glória, esperança"},"2026-03-08":{"title":"DOMINGO III DA QUARESMA","color":"Roxo","season":"quaresma","year":"A","type":"Domingo","psalm":"Hoje se escutardes a voz do Senhor","theme":"água, sede, conversão, escuta, misericórdia"},"2026-03-15":{"title":"DOMINGO IV DA QUARESMA","color":"Rosa/Roxo","season":"quaresma","year":"A","type":"Domingo","psalm":"O Senhor é meu pastor","theme":"luz, cura, pastor, alegria, conversão"},"2026-03-22":{"title":"DOMINGO V DA QUARESMA","color":"Roxo","season":"quaresma","year":"A","type":"Domingo","psalm":"Junto do Senhor a misericórdia","theme":"vida, ressurreição, misericórdia, esperança"},"2026-03-29":{"title":"DOMINGO DE RAMOS E DA PAIXÃO DO SENHOR","color":"Vermelho","season":"quaresma","year":"A","type":"Domingo","psalm":"Meu Deus, meu Deus, porque me abandonastes?","theme":"Ramos, Paixão, cruz, entrega, sofrimento"},"2026-04-02":{"title":"QUINTA-FEIRA SANTA — CEIA DO SENHOR","color":"Branco","season":"pascoa","year":"A","type":"Solenidade","psalm":"O cálice de bênção é comunhão do sangue de Cristo","theme":"Eucaristia, serviço, amor, lava-pés, sacerdócio"},"2026-04-03":{"title":"SEXTA-FEIRA DA PAIXÃO DO SENHOR","color":"Vermelho","season":"pascoa","year":"A","type":"Celebração","psalm":"Pai, em vossas mãos entrego o meu espírito","theme":"Paixão, cruz, sofrimento, entrega"},"2026-04-04":{"title":"VIGÍLIA PASCAL","color":"Branco","season":"pascoa","year":"A","type":"Solenidade","psalm":"Enviai, Senhor, o vosso Espírito e renovai a face da terra","theme":"ressurreição, luz, batismo, vida nova, aleluia"},"2026-04-05":{"title":"DOMINGO DE PÁSCOA DA RESSURREIÇÃO DO SENHOR","color":"Branco","season":"pascoa","year":"A","type":"Solenidade","psalm":"Este é o dia que o Senhor fez: exultemos e cantemos de alegria","theme":"Páscoa, ressurreição, vida nova, alegria, aleluia"},"2026-04-12":{"title":"DOMINGO II DA PÁSCOA — DA DIVINA MISERICÓRDIA","color":"Branco","season":"pascoa","year":"A","type":"Domingo","psalm":"Dai graças ao Senhor, porque Ele é bom, porque é eterna a sua misericórdia","theme":"misericórdia, paz, ressurreição, comunidade"},"2026-04-19":{"title":"DOMINGO III DA PÁSCOA","color":"Branco","season":"pascoa","year":"A","type":"Domingo","psalm":"Mostrai-nos, Senhor, o vosso amor e dai-nos a vossa salvação","theme":"caminho, Emaús, esperança, coração"},"2026-04-26":{"title":"DOMINGO IV DA PÁSCOA","color":"Branco","season":"pascoa","year":"A","type":"Domingo","psalm":"O Senhor é meu pastor: nada me faltará","theme":"Bom Pastor, vocação, pastor, rebanho"},"2026-05-03":{"title":"DOMINGO V DA PÁSCOA","color":"Branco","season":"pascoa","year":"A","type":"Domingo","psalm":"A bondade do Senhor encheu a terra","theme":"caminho, verdade, vida, casa do Pai"},"2026-05-10":{"title":"DOMINGO VI DA PÁSCOA","color":"Branco","season":"pascoa","year":"A","type":"Domingo","psalm":"O Senhor é rei, exulte a terra","theme":"Espírito Santo, esperança, testemunho"},"2026-05-14":{"title":"ASCENSÃO DO SENHOR","color":"Branco","season":"pascoa","year":"A","type":"Solenidade","psalm":"Deus sobe entre aclamações","theme":"Ascensão, missão, céu, glória"},"2026-05-17":{"title":"DOMINGO VII DA PÁSCOA","color":"Branco","season":"pascoa","year":"A","type":"Domingo","psalm":"O Senhor é rei, exulte a terra","theme":"oração, glória, unidade"},"2026-05-24":{"title":"DOMINGO DE PENTECOSTES","color":"Vermelho","season":"pascoa","year":"A","type":"Solenidade","psalm":"Enviai, Senhor, o vosso Espírito e renovai a face da terra","theme":"Pentecostes, Espírito Santo, fogo, dons, missão"},"2026-05-31":{"title":"SANTÍSSIMA TRINDADE","color":"Branco","season":"tempocomum","year":"A","type":"Solenidade","psalm":"Bendito seja Deus, Pai, Filho e Espírito Santo","theme":"Trindade, Pai, Filho, Espírito, amor"},"2026-06-04":{"title":"SANTÍSSIMO CORPO E SANGUE DE CRISTO","color":"Branco","season":"tempocomum","year":"A","type":"Solenidade","psalm":"Jerusalém, louva o teu Senhor","theme":"Eucaristia, Corpo de Cristo, pão, cálice, comunhão"},"2026-06-07":{"title":"DOMINGO X DO TEMPO COMUM","color":"Verde","season":"tempocomum","year":"A","type":"Domingo","psalm":"Eu quero misericórdia e não sacrifício","theme":"misericórdia, vocação, compaixão"},"2026-06-14":{"title":"DOMINGO XI DO TEMPO COMUM","color":"Verde","season":"tempocomum","year":"A","type":"Domingo","psalm":"Nós somos o povo de Deus, somos as ovelhas do seu rebanho","theme":"rebanho, missão, ceifa, pastores"},"2026-06-21":{"title":"DOMINGO XII DO TEMPO COMUM","color":"Verde","season":"tempocomum","year":"A","type":"Domingo","psalm":"Tende compaixão de mim, Senhor, porque sou um pobre pecador","theme":"fé, cruz, discipulado, coragem"},"2026-06-28":{"title":"DOMINGO XIII DO TEMPO COMUM","color":"Verde","season":"tempocomum","year":"A","type":"Domingo","psalm":"Senhor, sois a minha herança","theme":"seguimento, entrega, vocação, missão"},"2026-07-05":{"title":"DOMINGO XIV DO TEMPO COMUM","color":"Verde","season":"tempocomum","year":"A","type":"Domingo","psalm":"Eu Vos louvarei, Senhor, porque me salvastes","theme":"alegria, paz, humildade, salvação"},"2026-07-12":{"title":"DOMINGO XV DO TEMPO COMUM","color":"Verde","season":"tempocomum","year":"A","type":"Domingo","psalm":"Procurai o Senhor, enquanto se pode encontrar","theme":"próximo, misericórdia, amor, Palavra"},"2026-07-19":{"title":"DOMINGO XVI DO TEMPO COMUM","color":"Verde","season":"tempocomum","year":"A","type":"Domingo","psalm":"Vós, Senhor, sois clemente e compassivo","theme":"paciência, misericórdia, perdão, esperança"},"2026-07-26":{"title":"DOMINGO XVII DO TEMPO COMUM","color":"Verde","season":"tempocomum","year":"A","type":"Domingo","psalm":"Quanto amo, Senhor, a vossa lei","theme":"sabedoria, reino, tesouro, vontade de Deus"},"2026-08-02":{"title":"DOMINGO XVIII DO TEMPO COMUM","color":"Verde","season":"tempocomum","year":"A","type":"Domingo","psalm":"Vós abris, Senhor, a vossa mão e saciais a nossa fome","theme":"pão, fome, compaixão, providência"},"2026-08-09":{"title":"DOMINGO XIX DO TEMPO COMUM","color":"Verde","season":"tempocomum","year":"A","type":"Domingo","psalm":"Felizes os que esperam no Senhor","theme":"fé, vigilância, esperança"},"2026-08-15":{"title":"ASSUNÇÃO DA VIRGEM SANTA MARIA","color":"Branco","season":"tempocomum","year":"A","type":"Solenidade","psalm":"À vossa direita, Senhor, está a rainha, ornada de ouro de Ofir","theme":"Maria, Assunção, rainha, glória"},"2026-08-16":{"title":"DOMINGO XX DO TEMPO COMUM","color":"Verde","season":"tempocomum","year":"A","type":"Domingo","psalm":"Deus, vinde em meu auxílio","theme":"fé, universalidade, misericórdia"},"2026-08-23":{"title":"DOMINGO XXI DO TEMPO COMUM","color":"Verde","season":"tempocomum","year":"A","type":"Domingo","psalm":"Senhor, é eterna a vossa misericórdia","theme":"Igreja, Pedro, fé, chave, comunidade"},"2026-08-30":{"title":"DOMINGO XXII DO TEMPO COMUM","color":"Verde","season":"tempocomum","year":"A","type":"Domingo","psalm":"Senhor, pela vossa grande misericórdia, salvai-me","theme":"cruz, entrega, seguimento, misericórdia"},"2026-09-06":{"title":"DOMINGO XXIII DO TEMPO COMUM","color":"Verde","season":"tempocomum","year":"A","type":"Domingo","psalm":"Não fecheis os vossos corações","theme":"escuta, correção fraterna, comunidade, reconciliação"},"2026-09-13":{"title":"DOMINGO XXIV DO TEMPO COMUM","color":"Verde","season":"tempocomum","year":"A","type":"Domingo","psalm":"O Senhor é clemente e compassivo, paciente e cheio de bondade","theme":"perdão, misericórdia, compaixão, reconciliação"},"2026-09-20":{"title":"DOMINGO XXV DO TEMPO COMUM","color":"Verde","season":"tempocomum","year":"A","type":"Domingo","psalm":"O Senhor está perto de quantos O invocam","theme":"bondade, generosidade, conversão, reino"},"2026-09-27":{"title":"DOMINGO XXVI DO TEMPO COMUM","color":"Verde","season":"tempocomum","year":"A","type":"Domingo","psalm":"Lembrai-Vos, Senhor, da vossa misericórdia","theme":"conversão, justiça, humildade, misericórdia"},"2026-10-04":{"title":"DOMINGO XXVII DO TEMPO COMUM","color":"Verde","season":"tempocomum","year":"A","type":"Domingo","psalm":"A vinha do Senhor é a casa de Israel","theme":"vinha, frutos, povo de Deus, fidelidade"},"2026-10-11":{"title":"DOMINGO XXVIII DO TEMPO COMUM","color":"Verde","season":"tempocomum","year":"A","type":"Domingo","psalm":"Habitarei para sempre na casa do Senhor","theme":"banquete, alegria, salvação, casa do Senhor"},"2026-10-18":{"title":"DOMINGO XXIX DO TEMPO COMUM","color":"Verde","season":"tempocomum","year":"A","type":"Domingo","psalm":"A Deus pertence a terra e tudo o que ela contém","theme":"missão, César, justiça, Deus"},"2026-10-25":{"title":"DOMINGO XXX DO TEMPO COMUM","color":"Verde","season":"tempocomum","year":"A","type":"Domingo","psalm":"Eu Vos amo, Senhor, minha força","theme":"amor a Deus, amor ao próximo, mandamento"},"2026-11-01":{"title":"TODOS OS SANTOS","color":"Branco","season":"tempocomum","year":"A","type":"Solenidade","psalm":"Esta é a geração dos que procuram o Senhor","theme":"santos, bem-aventuranças, céu, santidade"},"2026-11-02":{"title":"COMEMORAÇÃO DE TODOS OS FIÉIS DEFUNTOS","color":"Roxo","season":"tempocomum","year":"A","type":"Comemoração","psalm":"O Senhor é minha luz e salvação","theme":"defuntos, esperança, ressurreição, vida eterna"},"2026-11-08":{"title":"DOMINGO XXXII DO TEMPO COMUM","color":"Verde","season":"tempocomum","year":"A","type":"Domingo","psalm":"A minha alma tem sede de Vós, Senhor, meu Deus","theme":"vigilância, sabedoria, espera, encontro"},"2026-11-15":{"title":"DOMINGO XXXIII DO TEMPO COMUM","color":"Verde","season":"tempocomum","year":"A","type":"Domingo","psalm":"Feliz o homem que teme o Senhor","theme":"talentos, fidelidade, trabalho, vigilância"},"2026-11-22":{"title":"NOSSO SENHOR JESUS CRISTO, REI DO UNIVERSO","color":"Branco","season":"tempocomum","year":"A","type":"Solenidade","psalm":"O Senhor é meu pastor: nada me faltará","theme":"Cristo Rei, reino, pastor, misericórdia"},"2026-11-29":{"title":"DOMINGO I DO ADVENTO","color":"Roxo","season":"advento","year":"A","type":"Domingo","psalm":"Vamos com alegria para a casa do Senhor","theme":"Advento, espera, vigilância, vinda do Senhor"},"2026-12-06":{"title":"DOMINGO II DO ADVENTO","color":"Roxo","season":"advento","year":"A","type":"Domingo","psalm":"Nos seus dias florescerá a justiça e a paz para sempre","theme":"Advento, paz, justiça, conversão"},"2026-12-08":{"title":"IMACULADA CONCEIÇÃO DA VIRGEM SANTA MARIA","color":"Branco","season":"advento","year":"A","type":"Solenidade","psalm":"Cantai ao Senhor um cântico novo","theme":"Maria, Imaculada Conceição, graça, alegria"},"2026-12-13":{"title":"DOMINGO III DO ADVENTO — GAUDETE","color":"Rosa/Roxo","season":"advento","year":"A","type":"Domingo","psalm":"Vinde, Senhor, e salvai-nos","theme":"Advento, alegria, esperança, Messias"},"2026-12-20":{"title":"DOMINGO IV DO ADVENTO","color":"Roxo","season":"advento","year":"A","type":"Domingo","psalm":"O Senhor há de entrar: é Ele o Rei glorioso","theme":"Advento, Maria, José, Emanuel, encarnação"},"2026-12-25":{"title":"NATAL DO SENHOR","color":"Branco","season":"natal","year":"A","type":"Solenidade","psalm":"Hoje nasceu o nosso Salvador: Jesus Cristo, Senhor","theme":"Natal, nascimento, encarnação, alegria, luz"},"2026-12-27":{"title":"SAGRADA FAMÍLIA DE JESUS, MARIA E JOSÉ","color":"Branco","season":"natal","year":"A","type":"Festa","psalm":"Felizes os que temem o Senhor e andam nos seus caminhos","theme":"família, Jesus, Maria, José, amor"}};

function seasonLabel(season){const m={tempocomum:'Tempo Comum',pascoa:'Tempo Pascal',quaresma:'Quaresma',advento:'Advento',natal:'Tempo do Natal'};return m[normSmart(season)]||String(season||'');}

function liturgicalYearStartSunday(calendarYear){
  // O ano litúrgico começa no I Domingo do Advento.
  // Este domingo ocorre sempre entre 27 de novembro e 3 de dezembro.
  const nov30=new Date(calendarYear,10,30,12,0,0,0);
  const offsetToSunday=nov30.getDay(); // 0=domingo; recua até ao domingo dessa semana
  const advent1=new Date(calendarYear,10,30-offsetToSunday,12,0,0,0);
  return advent1;
}
function cycleForLiturgicalYearStart(yearStart){
  // 2025-2026 = Ano A; 2026-2027 = Ano B; 2027-2028 = Ano C.
  const idx=((Number(yearStart)-2025)%3+3)%3;
  return ['A','B','C'][idx];
}
function cycleForDate(dateStr){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr||'')))return 'A';
  const [yy,mm,dd]=String(dateStr).split('-').map(Number);
  const d=new Date(yy,mm-1,dd,12,0,0,0);
  if(Number.isNaN(d.getTime()))return 'A';
  const advent=liturgicalYearStartSunday(yy);
  const litYear=d>=advent?yy:yy-1;
  return cycleForLiturgicalYearStart(litYear);
}

// Corrige também os dados históricos embutidos: nenhum ecrã deve ler o "year"
// antigo gravado no calendário em vez do ciclo calculado pela data.
function normalizeLiturgicalCalendarYears(){
  Object.keys(LITURGICAL_CALENDAR||{}).forEach(date=>{
    if(LITURGICAL_CALENDAR[date])LITURGICAL_CALENDAR[date].year=cycleForDate(date);
  });
}

// Dados litúrgicos específicos para celebrações que têm variantes próprias.
// Fonte principal: Secretariado Nacional de Liturgia (liturgia.pt).
const CELEBRATION_LITURGY_DATA = {
  '2026-12-24|Missa da Vigília': {
    title:'NATAL DO SENHOR — MISSA DA VIGÍLIA',
    psalm:'Cantarei eternamente as misericórdias do Senhor',
    psalmRef:'Sl 88 (89)',
    refrain:'Cantarei eternamente as misericórdias do Senhor'
  },
  '2026-12-24|Missa da Noite': {
    title:'NATAL DO SENHOR — MISSA DA NOITE',
    psalm:'Hoje nasceu o nosso Salvador: Jesus Cristo, Senhor',
    psalmRef:'Sl 95 (96)',
    refrain:'Hoje nasceu o nosso Salvador: Jesus Cristo, Senhor'
  },
  '2026-12-25|Missa da Aurora': {
    title:'NATAL DO SENHOR — MISSA DA AURORA',
    psalm:'Hoje sobre nós resplandece uma luz: nasceu o Senhor',
    psalmRef:'Sl 96 (97)',
    refrain:'Hoje sobre nós resplandece uma luz: nasceu o Senhor'
  },
  '2026-12-25|Missa do Dia': {
    title:'NATAL DO SENHOR — MISSA DO DIA',
    psalm:'Todos os confins da terra viram a salvação do nosso Deus',
    psalmRef:'Sl 97 (98)',
    refrain:'Todos os confins da terra viram a salvação do nosso Deus'
  }
};

function getSelectedCelebrationVariant(){
  return document.getElementById('celebrationVariant')?.value||'';
}
function getCelebrationLiturgyData(dateStr){
  const variant=getSelectedCelebrationVariant();
  if(variant){
    const exact=CELEBRATION_LITURGY_DATA[`${dateStr}|${variant}`];
    if(exact)return exact;
  }
  // Para 25 de dezembro, a opção predefinida é a Missa do Dia.
  if(dateStr==='2026-12-25')return CELEBRATION_LITURGY_DATA['2026-12-25|Missa do Dia'];
  if(dateStr==='2026-12-24')return CELEBRATION_LITURGY_DATA['2026-12-24|Missa da Noite'];
  return null;
}
function getOfficialLiturgicalSourceUrl(dateStr){
  return 'https://www.liturgia.pt/liturgiadiaria/dia.php?data='+encodeURIComponent(dateStr||'');
}
function getOfficialPsalmData(dateStr){
  const special=getCelebrationLiturgyData(dateStr);
  if(special?.refrain){
    return {ref:special.psalmRef||'', refrain:special.refrain, source:getOfficialLiturgicalSourceUrl(dateStr), verified:true};
  }
  const r=window.CORO_READINGS_2026?.[dateStr];
  const info=(window.CORO_LIT2026?.[dateStr])||LITURGICAL_CALENDAR[dateStr]||{};
  const refrain=String(r?.refrain||info.refrain||info.psalm||'').trim();
  return {ref:String(r?.psalmRef||info.psalmRef||'').trim(), refrain, source:getOfficialLiturgicalSourceUrl(dateStr), verified:false};
}
function getTargetPsalm(dateStr){
  return getOfficialPsalmData(dateStr).refrain;
}

function getLiturgicalInfo(dateStr) {
  const base=(window.CORO_LIT2026 && window.CORO_LIT2026[dateStr]) || LITURGICAL_CALENDAR[dateStr] || null;
  const special=getCelebrationLiturgyData(dateStr);
  if(base){const info={...base};info.year=cycleForDate(dateStr);if(special){info.title=special.title;info.psalm=special.psalm;info.psalmRef=special.psalmRef;info.refrain=special.refrain;}return info;}
  const date=new Date(dateStr+'T00:00:00'), day=date.getDay();
  const cycle=cycleForDate(dateStr);
  const info=day===0 ? {title:'Domingo do Tempo Comum',color:'Verde',season:'tempocomum',year:cycle,type:'Domingo',psalm:'',theme:''} : {title:'Dia Ferial',color:'Verde',season:'tempocomum',year:cycle,type:'Ferial',psalm:'',theme:''};
  if(special){info.title=special.title;info.psalm=special.psalm;info.psalmRef=special.psalmRef;info.refrain=special.refrain;}
  return info;
}

normalizeLiturgicalCalendarYears();

function updateHeaderLiturgicalInfo(info) {
  const pill=document.getElementById('liturgicalInfoPill');
  const text=document.getElementById('liturgicalInfoText');
  const icon=document.getElementById('liturgicalIcon');
  if(!pill||!text)return;
  if(!info){
    text.textContent='Tempo litúrgico não definido';
    if(icon)icon.textContent='♪';
    pill.dataset.season='';
    pill.dataset.color='';
    return;
  }
  const season=info.time||seasonLabel(info.season)||'Tempo litúrgico';
  const year=info.year?` · Ano ${info.year}`:'';
  const color=info.color?` · ${info.color}`:'';
  text.textContent=season+year+color;
  if(icon) icon.textContent = info.type==='Solenidade' ? '✦' : '♪';
  pill.dataset.season=info.season||'';
  pill.dataset.color=info.color||'';
  pill.title=info.name||info.title||season;
}

function updateLiturgicalFromDate() {
  const dateInput=document.getElementById('date'); if(!dateInput||!dateInput.value){updateHeaderLiturgicalInfo(null);renderProgramAssistant();return;}
  const info=getLiturgicalInfo(dateInput.value), titleInput=document.getElementById('liturgicalTitle'), colorInput=document.getElementById('liturgicalColor'), cycle=document.getElementById('cycleDisplay');
  updateHeaderLiturgicalInfo(info);
  if(titleInput)titleInput.value=info.name||info.title||''; if(colorInput)colorInput.value=info.color||''; if(cycle)cycle.value=seasonLabel(info.time||info.season)+' / Ano '+(info.year||'A');
  updateBodyLiturgicalClass(info.season);
  const panel=document.getElementById('smartLiturgyContent');
  const r=(window.CORO_READINGS_2026&&window.CORO_READINGS_2026[dateInput.value])||{};
  const official='https://www.liturgia.pt/liturgiadiaria/dia.php?data='+dateInput.value.replace(/^0/,'').replace(/-0/g,'-');
  if(panel){panel.innerHTML='<b>'+escSmart(info.name||info.title||'')+'</b>'+(info.type?' · '+escSmart(info.type):'')+'<br>Tempo: '+escSmart(info.time||info.season||'')+' · Ano: '+escSmart(info.year||'A')+' · Cor: '+escSmart(info.color||'')+(r.l1?'<br>📖 <b>Leituras:</b> '+escSmart(r.l1)+(r.l2?' · '+escSmart(r.l2):'')+(r.ev?' · Evangelho: '+escSmart(r.ev):''):'')+(getTargetPsalm(dateInput.value)?'<br>🎵 <b>Salmo responsorial:</b> '+escSmart(getLiturgicalInfo(dateInput.value).psalmRef?getLiturgicalInfo(dateInput.value).psalmRef+' — ':'')+escSmart(getTargetPsalm(dateInput.value)):'')+(info.theme?'<br>💡 <b>Tema:</b> '+escSmart(info.theme):'')+'<br><a href="'+official+'" target="_blank" rel="noopener">🔎 Ver liturgia oficial</a>'; }
  buildSmartSuggestionList(window.currentSmartPart||'entrada');
}
function escSmart(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

function updateBodyLiturgicalClass(season) {
  document.body.className = document.body.className
    .replace(/liturgic-\w+/g, '')
    .trim();
  
  if (season) {
    document.body.classList.add(`liturgic-${season}`);
  }
}

function getSongByTitle(title,author=''){
  const key=normSmart(title), akey=normSmart(author);
  const matches=(songs||[]).filter(s=>normSmart(getSongTitle(s))===key);
  if(akey){const exact=matches.find(s=>normSmart(getSongAuthor(s))===akey); if(exact)return exact;}
  return matches[0]||null;
}
function getSelectedSongForPart(partId){
  const sel=document.getElementById(partId);
  if(!sel)return null;
  const title=sel.value||'';
  const author=sel.dataset.selectedAuthor||sel.selectedOptions?.[0]?.dataset?.author||'';
  return getSongByTitle(title,author);
}
function songLyricsKey(title,author=''){
  return 'coroLyrics_'+normSmart(title)+'__'+normSmart(author);
}
function getSongLyrics(songOrTitle, author=''){
  const song=typeof songOrTitle==='object'?songOrTitle:getSongByTitle(songOrTitle);
  const title=song?getSongTitle(song):String(songOrTitle||'');
  const auth=song?getSongAuthor(song):author;
  const direct=song?.Letra||song?.letra||song?.Lyrics||song?.lyrics||song?.Texto||song?.texto||'';
  if(String(direct).trim()) return String(direct).trim();
  const exact=localStorage.getItem(songLyricsKey(title,auth));
  if(exact) return exact;
  const legacy=localStorage.getItem('coroLyrics_'+normSmart(title));
  return legacy||'';
}
function saveSongLyrics(title,author,lyrics){
  const key=songLyricsKey(title,author);
  if(lyrics) localStorage.setItem(key,lyrics); else localStorage.removeItem(key);
  // Mantém compatibilidade com versões anteriores
  if(lyrics) localStorage.setItem('coroLyrics_'+normSmart(title),lyrics);
}

// ============================================
// LETRAS ONLINE — LAUDATE / CANTICOS.PT
// ============================================
// O Laudate (canticos.pt) disponibiliza títulos, autores e, em muitos casos,
// o texto completo. Como o Coro Litúrgico é uma aplicação estática, não
// copiamos automaticamente o texto protegido para dentro da aplicação.
// Em vez disso, a aplicação encontra a fonte online por título + autor e
// abre a página correspondente. Se o catálogo tiver uma coluna LaudateURL,
// essa ligação é usada diretamente; caso contrário é criada uma pesquisa
// exacta limitada a canticos.pt.
const LAUDATE_KNOWN_LINKS = {
  'hoje se escutardes||manuel luis':'https://www.canticos.pt/hoje-se-escutardes-mluis/',
  'o senhor é clemente e compassivo||manuel luis':'https://www.canticos.pt/o-senhor-e-clemente-e-compassivo-mluis/',
  'dou-vos um mandamento novo||josé pedro martins':'https://www.canticos.pt/dou-vos-um-mandamento-novo-j-p-martins/',
  'onde há caridade e amor||manuel luis':'https://www.canticos.pt/onde-ha-caridade-e-amor-mluis/',
  'a minha alma tem sede de vós||manuel luis':'https://www.canticos.pt/a-minha-alma-tem-sede-de-vos-mluis/',
  'o senhor está próximo||manuel luis':'https://www.canticos.pt/o-senhor-esta-proximo-mluis/',
  'vós abris senhor a vossa mão||manuel luis':'https://www.canticos.pt/vos-abris-senhor-as-vossas-maos-mluis/',
  'ide por todo o mundo||manuel luis':'https://www.canticos.pt/ide-por-todo-o-mundo-mluis/'
};
function laudateKey(title,author=''){return normSmart(title)+'||'+normSmart(author);}
function getLaudateDirectUrl(songOrTitle, author=''){
  const song=typeof songOrTitle==='object'?songOrTitle:getSongByTitle(songOrTitle,author);
  const title=song?getSongTitle(song):String(songOrTitle||'');
  const auth=song?getSongAuthor(song):author;
  const direct=song?.LaudateURL||song?.laudateURL||song?.LAUDATE||song?.CanticosURL||song?.canticosURL||'';
  if(String(direct).trim()) return String(direct).trim();
  return LAUDATE_KNOWN_LINKS[laudateKey(title,auth)]||'';
}
function getLaudateUrl(songOrTitle, author=''){
  const song=typeof songOrTitle==='object'?songOrTitle:getSongByTitle(songOrTitle,author);
  const title=song?getSongTitle(song):String(songOrTitle||'');
  const auth=song?getSongAuthor(song):author;
  const direct=getLaudateDirectUrl(song||title,auth);
  if(direct) return direct;
  const q=[title,auth].filter(Boolean).join(' ').trim();
  return 'https://www.canticos.pt/?s='+encodeURIComponent(q);
}
function getLaudateGoogleUrl(songOrTitle,author=''){
  const song=typeof songOrTitle==='object'?songOrTitle:getSongByTitle(songOrTitle,author);
  const title=song?getSongTitle(song):String(songOrTitle||'');
  const auth=song?getSongAuthor(song):author;
  const q=[title,auth].filter(Boolean).map(v=>'"'+String(v).trim().replace(/"/g,'')+'"').join(' ');
  return 'https://www.google.com/search?q='+encodeURIComponent('site:canticos.pt '+q);
}
function getLaudateSearchLabel(songOrTitle,author=''){
  return getLaudateDirectUrl(songOrTitle,author)?'Abrir no Laudate':'Pesquisar no Laudate';
}
function getCantoNaLiturgiaGoogleUrl(songOrTitle,author=''){
  const song=typeof songOrTitle==='object'?songOrTitle:getSongByTitle(songOrTitle,author);
  const title=song?getSongTitle(song):String(songOrTitle||'');
  const auth=song?getSongAuthor(song):author;
  const q=[title,auth].filter(Boolean).map(v=>'\"'+String(v).trim().replace(/\"/g,'')+'\"').join(' ');
  return 'https://www.google.com/search?q='+encodeURIComponent('site:ocantonaliturgia.pt/obras '+q);
}
function getCantoNaLiturgiaUrl(songOrTitle,author=''){
  const q=getSongTitle(typeof songOrTitle==='object'?songOrTitle:{"Título":String(songOrTitle||''),"Autor":author});
  return 'https://ocantonaliturgia.pt/obras'+(q?'?q='+encodeURIComponent(q):'');
}

function getCantolicoUrl(songOrTitle,author=''){
  const song=typeof songOrTitle==='object'?songOrTitle:getSongByTitle(songOrTitle,author);
  const title=song?getSongTitle(song):String(songOrTitle||'');
  const auth=song?getSongAuthor(song):author;
  const q=[title,auth].filter(Boolean).join(' ').trim();
  return 'https://www.cantolico.pt/musics'+(q?'?q='+encodeURIComponent(q):'');
}
function getSongScoreUrl(songOrTitle,author=''){
  const song=typeof songOrTitle==='object'?songOrTitle:getSongByTitle(songOrTitle,author);
  if(!song)return '';
  return String(song.Partitura||song.partitura||song.PartituraURL||song.partituraURL||'').trim();
}
function getSongOnlineLinks(songOrTitle,author=''){
  const song=typeof songOrTitle==='object'?songOrTitle:getSongByTitle(songOrTitle,author);
  const title=song?getSongTitle(song):String(songOrTitle||'');
  const auth=song?getSongAuthor(song):author;
  return {laudate:getLaudateUrl(song||title,auth),canto:getCantoNaLiturgiaGoogleUrl(song||title,auth),cantolico:getCantolicoUrl(song||title,auth),score:getSongScoreUrl(song||title,auth),google:getLaudateGoogleUrl(song||title,auth)};
}
function getSongMomentLabel(song){
  const m=songMoment(song); return m||'';
}
function getSongCelebrationTags(song){
  const raw=String(song?.Celebrações||song?.Celebracoes||song?.Celebrações||song?.DiaLiturgico||song?.Dia||'');
  return raw;
}
function getSongSearchHaystack(song){
  return normSmart([getSongTitle(song),getSongAuthor(song),song?.Tema||'',song?.Tempo||'',song?.Observações||song?.Observacoes||'',getSongMomentLabel(song),getSongCelebrationTags(song)].join(' '));
}
function openLaudateForSong(songOrTitle,author=''){
  const url=getLaudateUrl(songOrTitle,author);
  if(url)window.open(url,'_blank','noopener,noreferrer');
}
function getLaudateSundayUrl(date){
  const info=getLiturgicalInfo(date||'');
  const name=String(info?.name||'');
  const m=name.match(/DOMINGO\s+([IVXLCDM]+)\s+DO\s+TEMPO\s+COMUM/i);
  if(!m)return '';
  const roman=m[1].toUpperCase(), vals={I:1,V:5,X:10,L:50,C:100,D:500,M:1000};
  let n=0,last=0;
  for(let i=roman.length-1;i>=0;i--){const v=vals[roman[i]]||0;if(v<last)n-=v;else{n+=v;last=v;}}
  const y=String(info.year||'A').toLowerCase();
  const prefix=y==='a'?'ac_':y==='b'?'bc_':'cc_';
  return 'https://www.canticos.pt/domingo/'+prefix+n+'/';
}
function openLaudateSundayForCurrentDate(){
  const date=document.getElementById('date')?.value||'';
  const url=getLaudateSundayUrl(date);
  if(url){window.open(url,'_blank','noopener,noreferrer');return true;}
  alert('O Laudate ainda não tem uma página dominical automática para esta celebração.');
  return false;
}
function getLyricsSourceHtml(songOrTitle,author=''){
  const song=typeof songOrTitle==='object'?songOrTitle:getSongByTitle(songOrTitle,author);
  const title=song?getSongTitle(song):String(songOrTitle||'');
  if(!title)return '';
  const auth=song?getSongAuthor(song):author;
  const direct=getLaudateDirectUrl(song||title,auth);
  const url=getLaudateUrl(song||title,auth);
  const google=getLaudateGoogleUrl(song||title,auth);
  const hasLocal=!!getSongLyrics(song||title,auth);
  const canto=getCantoNaLiturgiaGoogleUrl(song||title,auth);
  return '<div class="lyrics-online-box"><div><b>🌐 Fontes online</b><div class="small muted">Laudate · O Canto na Liturgia · '+escSmart(auth||'autor não indicado')+'</div></div><div class="lyrics-online-actions"><a class="btn secondary small" href="'+escSmart(url)+'" target="_blank" rel="noopener noreferrer">📖 '+escSmart(getLaudateSearchLabel(song||title,auth))+'</a><a class="btn secondary small" href="'+escSmart(canto)+'" target="_blank" rel="noopener noreferrer">🎼 O Canto na Liturgia</a><a class="btn secondary small" href="'+escSmart(google)+'" target="_blank" rel="noopener noreferrer">🔎 Pesquisa ampla</a>'+(hasLocal?' <span class="tiny muted">✓ Letra guardada localmente</span>':'')+'</div></div>';
}
function autoLoadLyricsForPart(partId){
  const title=document.getElementById(partId)?.value||'';
  const song=getSelectedSongForPart(partId)||getSongByTitle(title);
  return getSongLyrics(song||title);
}
function autoApplyLyricsToPart(partId){
  const title=document.getElementById(partId)?.value||'';
  if(!title)return;
  const song=getSelectedSongForPart(partId)||getSongByTitle(title);
  const lyrics=getSongLyrics(song||title);
  if(lyrics){
    partLyricsOverrides[partId]=lyrics;
    let status=document.getElementById('lyricsStatus_'+partId);
    if(!status){
      const btns=document.querySelector(`.program-buttons .program-lyrics-btn[data-part-id="${partId}"]`)?.parentElement;
      if(btns){status=document.createElement('span');status.id='lyricsStatus_'+partId;status.className='tiny muted lyrics-auto-status';btns.appendChild(status);}
    }
    if(status)status.textContent='✓ Letra associada automaticamente';
  }
}
function localISODate(d=new Date()){
  const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function nextCelebrationDate(){
  const today=localISODate();
  const entries=Object.entries(LITURGICAL_CALENDAR||{}).filter(([date])=>date>=today).sort((a,b)=>a[0].localeCompare(b[0]));
  return entries[0]?.[0]||'';
}
function openNewProgramModal(){
  const m=document.getElementById('newProgramModal');
  if(!m)return;
  m.hidden=false; m.setAttribute('aria-hidden','false');
}
function closeNewProgramModal(){
  const m=document.getElementById('newProgramModal');
  if(!m)return;
  m.hidden=true; m.setAttribute('aria-hidden','true');
}
function goToProgramWithDate(dateValue=''){
  const form=document.getElementById('programForm');
  if(form) form.reset();
  setMomentSelection([]);
  const date=document.getElementById('date');
  if(date) date.value=dateValue||'';
  const title=document.getElementById('liturgicalTitle'); if(title)title.value='';
  const color=document.getElementById('liturgicalColor'); if(color)color.value='';
  const extra=document.getElementById('extraTheme'); if(extra)extra.value='';
  closeNewProgramModal();
  document.querySelector('button[data-tab="tab-programa"]')?.click();
  if(dateValue) updateLiturgicalFromDate(); else renderProgramAssistant();
  setTimeout(()=>date?.focus(),80);
}
function prepareNewProgram(){ openNewProgramModal(); }
function duplicatePreviousProgram(){
  loadHistory();
  if(!history.length){ alert('Ainda não existem programas guardados para duplicar.'); return; }
  const labels=history.slice(0,20).map((h,i)=>`${i+1}. ${h.date} — ${h.title||'Programa'}`).join('\n');
  const answer=prompt('Escolha o número do programa que pretende duplicar:\n\n'+labels,'1');
  if(answer===null)return;
  const idx=Number(answer)-1;
  const record=history[idx];
  if(!record){alert('Programa inválido.');return;}
  const copy=JSON.parse(JSON.stringify(record));
  copy.date='';
  goToProgramWithDate('');
  applyProgramToForm({...copy,date:''});
  const date=document.getElementById('date'); if(date)date.value='';
  document.getElementById('liturgicalTitle')?.setAttribute('value','');
  renderProgramAssistant();
}
function initDashboardV3(){
  document.getElementById('newProgramBtn')?.addEventListener('click',prepareNewProgram);
  document.getElementById('dashNewProgramAction')?.addEventListener('click',prepareNewProgram);
  document.querySelectorAll('[data-dash-tab]').forEach(b=>b.addEventListener('click',()=>{
    if(b.dataset.dashTab==='tab-programa') prepareNewProgram();
    else document.querySelector(`button[data-tab="${b.dataset.dashTab}"]`)?.click();
  }));
  ['dashboardCalendarBtn','dashboardAllCalendarBtn'].forEach(id=>document.getElementById(id)?.addEventListener('click',()=>document.querySelector('button[data-tab="tab-calendario"]')?.click()));
  document.getElementById('dashboardHistoryBtn')?.addEventListener('click',()=>document.querySelector('button[data-tab="tab-historico"]')?.click());
  const close=()=>closeNewProgramModal();
  document.getElementById('newProgramCloseBtn')?.addEventListener('click',close);
  document.getElementById('newProgramCancelBtn')?.addEventListener('click',close);
  document.getElementById('newProgramExistingBtn')?.addEventListener('click',()=>{close();document.querySelector('button[data-tab="tab-calendario"]')?.click();});
  document.getElementById('newProgramNextBtn')?.addEventListener('click',()=>goToProgramWithDate(nextCelebrationDate()));
  document.getElementById('newProgramDateBtn')?.addEventListener('click',()=>goToProgramWithDate(''));
  document.getElementById('newProgramDuplicateBtn')?.addEventListener('click',duplicatePreviousProgram);
  document.getElementById('newProgramModal')?.addEventListener('click',e=>{if(e.target.id==='newProgramModal')close();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){const m=document.getElementById('newProgramModal');if(m&&!m.hidden)close();}});
  renderDashboardV3();
}
function renderDashboardV3(){
  const nextBox=document.getElementById('dashboardNextEvent');
  const upcomingBox=document.getElementById('dashboardUpcoming');
  const recentBox=document.getElementById('dashboardRecent');
  const today=new Date(); today.setHours(0,0,0,0);
  const upcoming=Object.entries(LITURGICAL_CALENDAR).map(([date,base])=>({date,...base,...getLiturgicalInfo(date)})).filter(x=>new Date(x.date+'T00:00:00')>=today).sort((a,b)=>a.date.localeCompare(b.date));
  const next=upcoming[0];
  if(nextBox){
    if(next){const d=new Date(next.date+'T00:00:00'); nextBox.innerHTML=`<div class="dash-date"><small>${d.toLocaleDateString('pt-PT',{weekday:'short'})}</small><strong>${d.getDate()}</strong><small>${d.toLocaleDateString('pt-PT',{month:'short',year:'numeric'})}</small></div><div><div class="dash-event-title">${escSmart(next.title||next.name)}</div><div class="dash-event-meta">${escSmart(next.type||'Celebração')} · ${escSmart(next.color||'')}</div>${next.theme?`<div class="dash-event-meta">${escSmart(next.theme)}</div>`:''}</div>`;} else nextBox.innerHTML='<div class="dash-muted">Não há celebrações futuras no calendário integrado.</div>';
  }
  if(upcomingBox){upcomingBox.innerHTML=upcoming.slice(0,5).map(x=>{const d=new Date(x.date+'T00:00:00');return `<div class="dash-list-row"><div class="dash-list-date">${d.toLocaleDateString('pt-PT',{day:'2-digit',month:'short'})}</div><div><div class="dash-list-title">${escSmart(x.title||x.name)}</div><div class="dash-list-sub">${escSmart(x.time||'')} · Ano ${escSmart(x.year||'')}</div></div><span>●</span></div>`}).join('')||'<div class="dash-muted">Sem dados.</div>';}
  loadHistory();
  if(recentBox){recentBox.innerHTML=history.slice(0,5).map((r,i)=>{const d=new Date(r.date+'T00:00:00');return `<div class="dash-list-row"><div class="dash-list-date">${d.toLocaleDateString('pt-PT',{day:'2-digit',month:'short'})}</div><div><div class="dash-list-title">${escSmart(r.title||'Programa')}</div><div class="dash-list-sub">${Object.values(r.program||{}).filter(Boolean).length} cânticos</div></div><button type="button" class="btn secondary tiny dash-view" onclick="loadHistoryItem(${i})">Ver</button></div>`}).join('')||'<div class="dash-muted">Ainda não existem programas guardados.</div>';}
}

function updateDashboard() {
  const container = document.getElementById('upcomingEvents');
  if (!container) return;
  
  const today = new Date();
  const upcoming = [];
  
  Object.entries(LITURGICAL_CALENDAR).forEach(([dateStr, info]) => {
    const date = new Date(dateStr + 'T00:00:00');
    if (date >= today) {
      upcoming.push({date: dateStr, ...info});
    }
  });
  
  upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  let html = '<ul>';
  upcoming.slice(0, 5).forEach(item => {
    const dateObj = new Date(item.date + 'T00:00:00');
    const formatted = dateObj.toLocaleDateString('pt-PT', {
      day: 'numeric',
      month: 'long'
    });
    html += `<li><strong>${formatted}</strong> - ${item.title} (${item.color})</li>`;
  });
  html += '</ul>';
  
  container.innerHTML = html;
}

// ============================================
// CALENDÁRIO INTERATIVO
// ============================================

let currentCalendarDate = new Date();

function renderCalendar() {
  const grid = document.getElementById('calendarGrid');
  const monthYear = document.getElementById('calendarMonthYear');
  
  if (!grid || !monthYear) return;
  
  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();
  
  // Atualiza título
  monthYear.textContent = currentCalendarDate.toLocaleDateString('pt-PT', {
    month: 'long',
    year: 'numeric'
  });
  
  // Limpa grid (mantém headers)
  const headers = grid.querySelectorAll('.calendar-day-header');
  grid.innerHTML = '';
  headers.forEach(h => grid.appendChild(h));
  
  // Primeiro dia do mês
  const firstDay = new Date(year, month, 1);
  const startingDayOfWeek = firstDay.getDay();
  
  // Último dia do mês
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  
  // Dias vazios antes do primeiro dia
  for (let i = 0; i < startingDayOfWeek; i++) {
    const emptyDay = document.createElement('div');
    emptyDay.className = 'calendar-day empty';
    grid.appendChild(emptyDay);
  }
  
  // Dias do mês
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  loadHistory();
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    const dayDiv = document.createElement('div');
    dayDiv.className = 'calendar-day';
    dayDiv.textContent = day;
    
    // Verifica se é hoje
    if (date.getTime() === today.getTime()) {
      dayDiv.classList.add('today');
    }
    
    // Verifica se tem programa guardado
    const existingProgram = history.find(h => h.date === dateStr);
    if (existingProgram) {
      dayDiv.classList.add('has-program');
      dayDiv.title = 'Abrir programa guardado';
    }
    // Verifica se é data litúrgica especial
    if (LITURGICAL_CALENDAR[dateStr]) {
      const info = getLiturgicalInfo(dateStr);
      dayDiv.classList.add('liturgical');
      if(info.season)dayDiv.classList.add(info.season);
      dayDiv.title = existingProgram ? info.title + ' — abrir programa · Ano '+info.year : info.title + ' — criar programa · Ano '+info.year;
    }
    // Qualquer celebração do calendário pode abrir o programa.
    if (existingProgram || LITURGICAL_CALENDAR[dateStr]) {
      dayDiv.style.cursor = 'pointer';
      dayDiv.addEventListener('click', () => {
        if (existingProgram) applyProgramToForm(existingProgram);
        else goToProgramWithDate(dateStr);
        document.querySelector('button[data-tab="tab-programa"]')?.click();
      });
    }
    
    grid.appendChild(dayDiv);
  }
}

function initCalendar() {
  const prevBtn = document.getElementById('prevMonth');
  const nextBtn = document.getElementById('nextMonth');
  const todayBtn = document.getElementById('todayBtn');
  
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
      renderCalendar();
    });
  }
  
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
      renderCalendar();
    });
  }
  
  if (todayBtn) {
    todayBtn.addEventListener('click', () => {
      currentCalendarDate = new Date();
      renderCalendar();
    });
  }
  
  renderCalendar();
}

// ============================================
// UPLOAD DE IMAGEM DO DOMINGO
// ============================================

function initSundayImage() {
  const input = document.getElementById('uploadSundayImage');
  const preview = document.getElementById('sundayImagePreview');
  const previewImg = document.getElementById('sundayImagePreviewImg');
  const removeBtn = document.getElementById('removeSundayImage');
  if (!input || !preview) return;

  const show = (imgData) => {
    if (previewImg) previewImg.src = imgData;
    preview.style.display = 'block';
    if (removeBtn) removeBtn.style.display = 'inline-flex';
  };
  const hide = () => {
    preview.style.display = 'none';
    if (previewImg) previewImg.removeAttribute('src');
    if (removeBtn) removeBtn.style.display = 'none';
  };

  const saved = localStorage.getItem('coroSundayImage');
  if (saved) show(saved); else hide();

  input.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Imagem muito grande! Máximo 2MB.'); input.value=''; return;
    }
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecione uma imagem válida.'); input.value=''; return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      localStorage.setItem('coroSundayImage', ev.target.result);
      show(ev.target.result);
    };
    reader.readAsDataURL(file);
  });

  if (removeBtn) removeBtn.addEventListener('click', () => {
    if (!confirm('Remover imagem do domingo?')) return;
    localStorage.removeItem('coroSundayImage');
    input.value='';
    hide();
  });
}

function loadSavedSundayImage() {
  const imgData = localStorage.getItem('coroSundayImage');
  const preview = document.getElementById('sundayImagePreview');
  const img = document.getElementById('sundayImagePreviewImg');
  const removeBtn = document.getElementById('removeSundayImage');
  if (!preview) return;
  if (imgData) {
    if (img) img.src = imgData;
    preview.style.display='block';
    if (removeBtn) removeBtn.style.display='inline-flex';
  }
}

function displaySundayImage(imgData) {
  const preview = document.getElementById('sundayImagePreview');
  const img = document.getElementById('sundayImagePreviewImg');
  if (!preview || !img) return;
  img.src = imgData;
  preview.style.display='block';
}

// ============================================
// CATÁLOGO DE CÂNTICOS (CSV)
// ============================================

function parseCsvText(text) {
  const rows=[]; let row=[], cell='', quoted=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i], next=text[i+1];
    if(ch==='"'){
      if(quoted && next==='"'){ cell+='"'; i++; }
      else quoted=!quoted;
    } else if(ch===',' && !quoted){ row.push(cell); cell=''; }
    else if((ch==='\n' || ch==='\r') && !quoted){
      if(ch==='\r' && next==='\n') i++;
      row.push(cell); cell='';
      if(row.some(v=>String(v).trim()!=='')){ rows.push(row); }
      row=[];
    } else cell+=ch;
  }
  if(cell!=='' || row.length){ row.push(cell); if(row.some(v=>String(v).trim()!=='')) rows.push(row); }
  if(!rows.length) return [];
  const headers=rows[0].map(x=>String(x).trim());
  return rows.slice(1).map(cols=>{const o={}; headers.forEach((h,i)=>o[h]=(cols[i]??'').trim()); return o;}).filter(o=>Object.values(o).some(v=>v));
}

function useCatalogRows(rows, source='catálogo') {
  if(!Array.isArray(rows) || !rows.length){
    document.getElementById('catalogStatus')?.replaceChildren(document.createTextNode('Nenhum cântico encontrado.'));
    songs=[]; populateProgramSelects(); renderSongsTable(); return;
  }
  songs=rows;
  populateProgramSelects(); renderSongsTable(); renderVideos();
  renderProgramAssistant();
  document.dispatchEvent(new CustomEvent('coro:catalog-updated'));
  const st=document.getElementById('catalogStatus');
  if(st) st.textContent=`${songs.length} cânticos carregados (${source}).`;
}

function loadCsvFromGoogleSheets(forceRemote=false) {
  if(!forceRemote && Array.isArray(window.CORO_EMBEDDED_CATALOG)&&window.CORO_EMBEDDED_CATALOG.length){
    useCatalogRows(window.CORO_EMBEDDED_CATALOG.slice(),'catálogo integrado');
    return;
  }
  const url="https://docs.google.com/spreadsheets/d/e/2PACX-1vTv7BD5eoTpio0s2Vjb6YCuZNmjCyG_leoWxl6v-IkIMV-LiJZNmCwhqA9j68IESZQJiU-H3ri3_flR/pub?gid=1808635095&single=true&output=csv";
  // O catálogo atualiza-se sem recarregar a página. O fallback incorporado continua disponível se a rede falhar.
  fetch(url).then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.text();}).then(text=>useCatalogRows(parseCsvText(text),'Google Sheets')).catch(()=>{
    if(Array.isArray(window.CORO_EMBEDDED_CATALOG)) useCatalogRows(window.CORO_EMBEDDED_CATALOG.slice(),'catálogo integrado (fallback)');
    else useCatalogRows([],'erro');
  });
}

function initCatalogControls(){
  document.getElementById('refreshCatalogBtn')?.addEventListener('click',()=>{
    loadCsvFromGoogleSheets(true);
    const st=document.getElementById('catalogStatus'); if(st) st.textContent='A atualizar catálogo…';
  });
  const csvInput=document.getElementById('csvFile');
  document.getElementById('loadCsvBtn')?.addEventListener('click',()=>{
    const f=csvInput?.files?.[0];
    const err=document.getElementById('csvError');
    if(!f){if(err){err.textContent='Selecione primeiro um ficheiro CSV.';err.style.display='block';}return;}
    const reader=new FileReader();
    reader.onload=e=>{try{const rows=parseCsvText(e.target.result);useCatalogRows(rows,'CSV manual');if(err)err.style.display='none';}catch(ex){if(err){err.textContent='Não foi possível ler o CSV.';err.style.display='block';}}};
    reader.readAsText(f,'utf-8');
  });
}

function populateProgramSelects() {
  PROGRAM_PARTS.forEach(part => {
    const select = document.getElementById(part.id);
    if (!select) return;
    
    const currentValue = select.value;
    select.innerHTML = '<option value="">-- Selecione --</option>';
    
    // Adiciona cânticos do CSV
    songs.forEach(song => {
      const title = song["Título"] || song["Titulo"] || song["titulo"] || "";
      if (title) {
        const option = document.createElement("option");
        option.value = title;
        option.textContent = title;
        option.dataset.author = getSongAuthor(song);
        select.appendChild(option);
      }
    });
    
    // Adiciona cânticos personalizados
    customSongs.forEach(song => {
      const option = document.createElement("option");
      option.value = `[CUSTOM] ${song.title}`;
      option.textContent = `${song.title} ⭐`;
      select.appendChild(option);
    });
    
    // Restaura valor anterior
    if (currentValue) {
      select.value = currentValue;
    }
  });
}

function proposalTitlesForSong(title){
  const key=normSmart(title), out=[];
  Object.values(LITURGICAL_MUSIC_PROPOSALS||{}).forEach(src=>Object.values(src.parts||{}).forEach(arr=>(arr||[]).forEach(x=>{if(normSmart(x[0])===key)out.push(x[0]);})));
  return Array.from(new Set(out));
}
function librarySongStatus(song){
  const title=getSongTitle(song), meta=songLiturgicalMetadata(song), official=proposalTitlesForSong(title).length>0;
  const associations=meta.historicalAssociations||[];
  return {official, historical:associations.length>0, never:usageCount(title)===0};
}
function renderSongsTable() {
  const container=document.getElementById('songsTableContainer'); if(!container)return;
  const q=normSmart(document.getElementById('songSearch')?.value||''), av=normSmart(document.getElementById('filterAuthor')?.value||''), tv=normSmart(document.getElementById('filterTheme')?.value||''), mv=normSmart(document.getElementById('filterMoment')?.value||''), cv=normSmart(document.getElementById('filterCycle')?.value||''), ce=normSmart(document.getElementById('filterCelebration')?.value||''), st=document.getElementById('filterLibraryStatus')?.value||'';
  const all=[...(songs||[])]; if(!all.length){container.innerHTML='<p>Nenhum cântico disponível.</p>';return;}
  const arr=all.filter(s=>{
    const t=normSmart(getSongTitle(s)),a=normSmart(getSongAuthor(s)),th=normSmart(String(s.Tema||''));
    const m=songLiturgicalMetadata(s), moments=(m.moment+' '+(m.historicalMoments||[]).join(' ')), celebrations=(m.celebration+' '+(m.historicalCelebrations||[]).join(' ')), cycles=(m.cycle+' '+(m.historicalCycles||[]).join(' '));
    const status=librarySongStatus(s);
    return (!q||t.includes(q)||a.includes(q)||th.includes(q))&&(!av||a===av)&&(!tv||th.split(';').map(x=>x.trim()).includes(tv))&&(!mv||normSmart(moments).includes(mv))&&(!cv||normSmart(cycles).includes(cv))&&(!ce||normSmart(celebrations).includes(ce))&&(!st||(st==='official'&&status.official)||(st==='historical'&&status.historical)||(st==='never'&&status.never));
  });
  let h='<div class="song-search-summary"><b>'+arr.length+'</b> cântico(s) encontrado(s) · filtros litúrgicos aplicados sem substituir a associação real</div><table><thead><tr><th>Título</th><th>Autor</th><th>Momento</th><th>Celebração</th><th>Ano</th><th>Salmo</th><th>Estado</th><th>Partitura</th><th>Uso</th></tr></thead><tbody>';
  arr.forEach(s=>{
    const t=getSongTitle(s),u=s._uses||usageCount(t),p=s.Partitura||'',m=songLiturgicalMetadata(s),status=librarySongStatus(s),hist=(m.historicalAssociations||[]).length;
    const badges=(status.official?'<span class="badge">⭐ Proposta oficial</span> ':'')+(status.historical?'<span class="badge">🟢 Histórico</span> ':'')+(status.never?'<span class="badge">⭐ Nunca utilizado</span>':'');
    const cycle=(m.historicalCycles||[]).join(', ')||m.cycle||'—';
    h+='<tr><td><b>'+escSmart(t)+'</b><div class="tiny muted">'+escSmart(m.theme||'')+'</div><button type="button" class="btn secondary tiny" data-song-profile="'+escSmart(t)+'" style="margin-top:.3rem">🎵 Ficha</button></td><td>'+escSmart(getSongAuthor(s)||'—')+'</td><td>'+escSmart((m.historicalMoments||[]).join(', ')||m.moment||'—')+'</td><td>'+escSmart((m.historicalCelebrations||[]).join(' · ')||m.celebration||'—')+'</td><td>'+escSmart(cycle)+'</td><td>'+escSmart((m.historicalPsalms||[]).join(' · ')||m.psalm||'—')+'</td><td>'+badges+(hist?' <span class="tiny muted">'+hist+' associação'+(hist===1?'':'ões')+'</span>':'')+'</td><td>'+(p?'<a href="'+escSmart(p)+'" target="_blank" rel="noopener">📄 Abrir</a>':'⚠️ Não associada')+'</td><td>'+u+'</td></tr>';
  });
  h+='</tbody></table>'; container.innerHTML=h;
  const fa=document.getElementById('filterAuthor'),ft=document.getElementById('filterTheme'),fm=document.getElementById('filterMoment'),fc=document.getElementById('filterCycle'),fe=document.getElementById('filterCelebration');
  if(fa){const vals=Array.from(new Set(all.map(s=>getSongAuthor(s)).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'pt'));fa.innerHTML='<option value="">Todos</option>'+vals.map(x=>'<option value="'+escSmart(x)+'">'+escSmart(x)+'</option>').join('');if(av)fa.value=Array.from(fa.options).find(o=>normSmart(o.value)===av)?.value||'';}
  if(ft){const vals=Array.from(new Set(all.flatMap(s=>String(s.Tema||'').split(';').map(x=>x.trim()).filter(Boolean)))).sort((a,b)=>a.localeCompare(b,'pt'));ft.innerHTML='<option value="">Todos</option>'+vals.map(x=>'<option value="'+escSmart(x)+'">'+escSmart(x)+'</option>').join('');if(tv)ft.value=Array.from(ft.options).find(o=>normSmart(o.value)===tv)?.value||'';}
  if(fm){const vals=Array.from(new Set(all.flatMap(s=>{const m=songLiturgicalMetadata(s);return [...(m.historicalMoments||[]),m.moment].filter(Boolean);}))).sort((a,b)=>a.localeCompare(b,'pt'));fm.innerHTML='<option value="">Todos</option>'+vals.map(x=>'<option value="'+escSmart(x)+'">'+escSmart(x)+'</option>').join('');if(mv)fm.value=Array.from(fm.options).find(o=>normSmart(o.value)===mv)?.value||'';}
  if(fc){fc.value=['A','B','C'].includes(cv.toUpperCase())?cv.toUpperCase():'';}
  if(fe){const vals=Array.from(new Set(all.flatMap(s=>{const m=songLiturgicalMetadata(s);return [...(m.historicalCelebrations||[]),m.celebration].filter(Boolean);}))).sort((a,b)=>a.localeCompare(b,'pt'));fe.innerHTML='<option value="">Todas</option>'+vals.map(x=>'<option value="'+escSmart(x)+'">'+escSmart(x)+'</option>').join('');if(ce)fe.value=Array.from(fe.options).find(o=>normSmart(o.value)===ce)?.value||'';}
}

function getSongProfileData(title){
 const song=(songs||[]).find(s=>normSmart(getSongTitle(s))===normSmart(title))||null;
 if(!song) return null;
 const meta=songLiturgicalMetadata(song), prefs=getChoirPreferences().filter(p=>normSmart(p.title)===normSmart(title));
 const usage=getUsageHistory().filter(x=>normSmart(x.song||x.title)===normSmart(title)).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
 const official=[];
 Object.entries(LITURGICAL_MUSIC_PROPOSALS||{}).forEach(([key,src])=>Object.entries(src.parts||{}).forEach(([part,arr])=>(arr||[]).forEach(x=>{if(normSmart(x[0])===normSmart(title)) official.push({key,part,label:x[0],number:x[2]||''});})));
 return {song,meta,prefs,usage,official};
}
function openSongProfile(title){
 const modal=document.getElementById('songProfileModal'),content=document.getElementById('songProfileContent'); if(!modal||!content)return;
 const d=getSongProfileData(title); if(!d)return;
 const s=d.song,m=d.meta,links=getSongOnlineLinks(s),score=getSongScoreUrl(s);
 const uses=d.usage.length, last=d.usage[0]?.date||'';
 const official=d.official.length?d.official.map(x=>`<span class=\"song-profile-tag\">🥇 ${escSmart(x.part)}${x.number?' · nº '+escSmart(x.number):''}</span>`).join(''):'<span class=\"small muted\">Sem proposta oficial identificada no catálogo de propostas integrado.</span>';
 const associations=(m.historicalAssociations||[]).map(a=>`<span class=\"song-profile-tag\">${escSmart(a.celebration||'')} · ${escSmart(a.part||'')} · Ano ${escSmart(a.cycle||'')}</span>`).join('')||'<span class=\"small muted\">Sem associação histórica estruturada.</span>';
 const pref=d.prefs.map(p=>`<span class=\"song-profile-tag\">⭐ ${escSmart((PROGRAM_PARTS.find(x=>x.id===p.partId)||{label:p.partId}).label)} · ${p.count||0}x${p.lastDate?' · '+escSmart(p.lastDate):''}</span>`).join('')||'<span class=\"small muted\">Ainda não existem preferências manuais registadas.</span>';
 const hist=d.usage.length?d.usage.slice(0,30).map(x=>`<div class=\"song-profile-history-row\"><span>${escSmart(x.date||'')}</span><span>${escSmart(x.section||x.part||'Programa')}</span></div>`).join(''):'<div class=\"small muted\">Sem utilizações registadas.</div>';
 const manualBadge=Object.keys(m.manual||{}).length?'<span class=\"song-profile-tag\">✏️ Metadados editados pelo coro</span>':'<span class=\"small muted\">Sem metadados manuais.</span>';
 content.innerHTML=`<div class=\"song-profile-grid\">
 <div class=\"song-profile-item\"><b>Autor / compositor</b>${escSmart(getSongAuthor(s)||'Não indicado')}</div>
 <div class=\"song-profile-item\"><b>Utilizações</b>${uses}${last?' · última em '+escSmart(last):' · nunca utilizado'}</div>
 <div class=\"song-profile-item\"><b>Momento litúrgico</b>${escSmart(m.moment||'Não definido')}</div>
 <div class=\"song-profile-item\"><b>Tempo litúrgico</b>${escSmart(m.season||s.Tempo||'Não definido')}</div>
 <div class=\"song-profile-item\"><b>Ano / ciclo</b>${escSmart(m.cycle||'Não definido')}</div>
 <div class=\"song-profile-item\"><b>Salmo associado</b>${escSmart(m.psalm||'Não definido')}</div>
 <div class=\"song-profile-item\"><b>Celebração</b>${escSmart(m.celebration||'Não definida')}</div>
 <div class=\"song-profile-item\"><b>Tema</b>${escSmart(m.theme||'Não definido')}</div></div>
 <div class=\"song-profile-section\"><b>🛠️ Metadados locais</b><div class=\"song-profile-tags\" style=\"margin-top:.45rem\">${manualBadge}</div><p class=\"small muted\" style=\"margin:.45rem 0 0\">As alterações manuais ficam separadas dos dados das fontes e podem ser revistas a qualquer momento.</p></div>
 <div class=\"song-profile-section\"><b>🥇 Propostas oficiais</b><div class=\"song-profile-tags\" style=\"margin-top:.45rem\">${official}</div></div>
 <div class=\"song-profile-section\"><b>📚 Associações históricas do coro</b><div class=\"song-profile-tags\" style=\"margin-top:.45rem\">${associations}</div></div>
 <div class=\"song-profile-section\"><b>⭐ Preferências do coro</b><div class=\"song-profile-tags\" style=\"margin-top:.45rem\">${pref}</div></div>
 <div class=\"song-profile-section\"><b>🕐 Histórico recente</b><div class=\"song-profile-history\" style=\"margin-top:.35rem\">${hist}</div></div>
 <div class=\"song-profile-actions\"><button type=\"button\" class=\"btn\" data-edit-song-profile=\"${escSmart(title)}\">✏️ Editar ficha</button>${score?`<button type=\"button\" class=\"btn secondary\" data-profile-score=\"${escSmart(score)}\" data-profile-title=\"${escSmart(title)}\">🎼 Ver partitura</button>`:''}<a class=\"btn secondary\" href=\"${escSmart(links.laudate)}\" target=\"_blank\" rel=\"noopener\">📖 Laudate</a><a class=\"btn secondary\" href=\"${escSmart(links.canto)}\" target=\"_blank\" rel=\"noopener\">🎼 O Canto na Liturgia</a><a class=\"btn secondary\" href=\"${escSmart(links.cantolico)}\" target=\"_blank\" rel=\"noopener\">✝️ Cantólico</a></div>`;
 document.getElementById('songProfileTitle').textContent='🎵 '+title;
 document.getElementById('songProfileSubtitle').textContent=getSongAuthor(s)||'Autor não indicado';
 modal.hidden=false;modal.setAttribute('aria-hidden','false');
 content.querySelector('[data-profile-score]')?.addEventListener('click',e=>{openMediaPreview(e.currentTarget.dataset.profileScore,title,getSongAuthor(s)||'Partitura');});
 content.querySelector('[data-edit-song-profile]')?.addEventListener('click',()=>openSongMetadataEditor(title));
}
function openSongMetadataEditor(title){
 const modal=document.getElementById('songMetadataEditorModal'), form=document.getElementById('songMetadataEditorForm'); if(!modal||!form)return;
 const song=(songs||[]).find(s=>normSmart(getSongTitle(s))===normSmart(title)); if(!song)return;
 const m=songLiturgicalMetadata(song), manual=m.manual||{};
 const set=(id,val)=>{const e=document.getElementById(id);if(e)e.value=val||'';};
 set('metaEditTitle',title); set('metaEditMoment',manual.moment||songMoment(song)); set('metaEditSeason',manual.season||songSeason(song)); set('metaEditCycle',manual.cycle||songCycle(song)); set('metaEditCelebration',manual.celebration||songCelebration(song)); set('metaEditPsalm',manual.psalm||songPsalm(song)); set('metaEditTheme',manual.theme||String(song.Tema||'')); set('metaEditNotes',manual.notes||'');
 modal.hidden=false;modal.setAttribute('aria-hidden','false');
}
function closeSongMetadataEditor(){const m=document.getElementById('songMetadataEditorModal');if(m){m.hidden=true;m.setAttribute('aria-hidden','true');}}
function saveSongMetadataEditor(){
 const title=document.getElementById('metaEditTitle')?.value.trim(); if(!title)return;
 const all=getManualSongMetadata(), key=normSmart(title);
 const data={moment:document.getElementById('metaEditMoment')?.value.trim()||'',season:document.getElementById('metaEditSeason')?.value.trim()||'',cycle:document.getElementById('metaEditCycle')?.value.trim().toUpperCase()||'',celebration:document.getElementById('metaEditCelebration')?.value.trim()||'',psalm:document.getElementById('metaEditPsalm')?.value.trim()||'',theme:document.getElementById('metaEditTheme')?.value.trim()||'',notes:document.getElementById('metaEditNotes')?.value.trim()||'',updatedAt:new Date().toISOString()};
 const meaningful=Object.entries(data).some(([k,v])=>k!=='updatedAt'&&v); if(meaningful)all[key]=data; else delete all[key]; saveManualSongMetadata(all);
 closeSongMetadataEditor(); renderSongsTable(); renderProgramAssistant(); openSongProfile(title);
}
function closeSongProfile(){const m=document.getElementById('songProfileModal');if(m){m.hidden=true;m.setAttribute('aria-hidden','true');}}
function initSongProfile(){
 document.getElementById('songProfileClose')?.addEventListener('click',closeSongProfile);
 document.getElementById('songProfileModal')?.addEventListener('click',e=>{if(e.target.id==='songProfileModal')closeSongProfile();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.getElementById('songProfileModal')?.hidden)closeSongProfile();});
 document.addEventListener('click',e=>{const b=e.target.closest('[data-song-profile]');if(b)openSongProfile(b.dataset.songProfile);});
}

function initSongMetadataEditor(){
 document.getElementById('songMetadataEditorClose')?.addEventListener('click',closeSongMetadataEditor);
 document.getElementById('songMetadataEditorCancel')?.addEventListener('click',closeSongMetadataEditor);
 document.getElementById('songMetadataEditorSave')?.addEventListener('click',saveSongMetadataEditor);
 document.getElementById('songMetadataEditorModal')?.addEventListener('click',e=>{if(e.target.id==='songMetadataEditorModal')closeSongMetadataEditor();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.getElementById('songMetadataEditorModal')?.hidden)closeSongMetadataEditor();});
}

function viewSongUsage(title){let h=[];try{h=JSON.parse(localStorage.getItem('coroSongUsage_v1')||'[]')}catch(e){}h=(Array.isArray(h)?h:[]).filter(x=>normSmart(x.title)===normSmart(title));alert(title+'\n\n'+(h.length?h.map(x=>x.date+' — '+(x.section||'')).join('\n'):'Sem utilizações registadas.'));}

// ============================================
// PROGRAMA
// ============================================

function collectProgramFromForm() {
  const date = document.getElementById('date')?.value || '';
  const title = document.getElementById('liturgicalTitle')?.value || '';
  const color = document.getElementById('liturgicalColor')?.value || getLiturgicalInfo(date).color || '';
  const extraTheme = document.getElementById('extraTheme')?.value || '';
  const salmista = document.getElementById('salmistaPrograma')?.value || '';
  const organista = document.getElementById('organistaPrograma')?.value || '';
  const info = getLiturgicalInfo(date);
  
  const program = {};
  const programAuthors = {};
  PROGRAM_PARTS.forEach(part => {
    const el=document.getElementById(part.id);
    const value = el?.value || '';
    program[part.id] = value;
    programAuthors[part.id] = el?.dataset?.selectedAuthor || el?.selectedOptions?.[0]?.dataset?.author || '';
  });
  
  const assistantEvidence = {};
  PROGRAM_PARTS.forEach(part => {
    const value = program[part.id];
    if (!value) return;
    const song = (songs||[]).find(s => normSmart(getSongTitle(s)) === normSmart(value)) || {Título:value};
    const confidence = liturgicalConfidence(song, part.id);
    const meta = assistantScore(song, part.id, program);
    assistantEvidence[part.id] = {
      title: value,
      author: programAuthors[part.id] || getSongAuthor(song) || '',
      confidence: confidence.level,
      confidenceLabel: confidence.label,
      confidenceRank: confidence.rank,
      confidenceReason: confidence.reason,
      reasons: Array.isArray(meta.reasons) ? meta.reasons.slice(0,8) : [],
      score: meta.score,
      savedAt: new Date().toISOString()
    };
  });
  return {date, title, color, extraTheme, season:info.season||'', cycle:info.year||'A', psalm:info.psalm||'', theme:info.theme||'', salmista, organista, program, programAuthors, selectedParts:selectedProgramPartIds(), assistantEvidence};
}

function applyProgramToForm(record) {
  if (!record) return;
  
  const dateInput = document.getElementById('date');
  const titleInput = document.getElementById('liturgicalTitle');
  const colorInput = document.getElementById('liturgicalColor');
  const extraInput = document.getElementById('extraTheme');
  
  if (dateInput) dateInput.value = record.date || '';
  if (titleInput) titleInput.value = record.title || '';
  if (colorInput) colorInput.value = record.color || '';
  if (extraInput) extraInput.value = record.extraTheme || '';
  const salEl=document.getElementById('salmistaPrograma'); if(salEl) salEl.value=record.salmista||'';
  const orgEl=document.getElementById('organistaPrograma'); if(orgEl) orgEl.value=record.organista||'';
  
  PROGRAM_PARTS.forEach(part => {
    const input = document.getElementById(part.id);
    if (input) {
      input.value = (record.program || {})[part.id] || '';
      input.dataset.selectedAuthor = (record.programAuthors || {})[part.id] || input.selectedOptions?.[0]?.dataset?.author || '';
    }
  });
  const selected=Array.isArray(record.selectedParts)?record.selectedParts:PROGRAM_PARTS.filter(p=>record.program?.[p.id]).map(p=>p.id);
  setMomentSelection(selected);
  
  updateLiturgicalFromDate();
  updatePreview();
}

function updatePreview() {
  const container = document.getElementById('previewContainer');
  if (!container) return;
  
  const record = collectProgramFromForm();
  container.innerHTML = buildLeafletHtml(record);
}

function buildLeafletHtml(record) {
  let html = `
    <div style="font-family: 'Noto Serif', serif; max-width: 800px; margin: 0 auto; padding: 2rem;">
      <h1 style="text-align: center; margin-bottom: 0.5rem;">${record.title}</h1>
      <p style="text-align: center; color: #666; margin-bottom: 2rem;">
        ${new Date(record.date + 'T00:00:00').toLocaleDateString('pt-PT', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })}
      </p>
  `;
  
  if (record.extraTheme) {
    html += `<p style="text-align: center; font-style: italic; margin-bottom: 2rem;">${record.extraTheme}</p>`;
  }
  
  html += '<div style="line-height: 1.8;">';
  
  PROGRAM_PARTS.forEach(part => {
    const value = record.program[part.id];
    if (value) {
      html += `
        <div style="margin-bottom: 1rem;">
          <strong>${part.label}:</strong> ${value}
        </div>
      `;
    }
  });
  
  html += '</div></div>';
  return html;
}

// ============================================
// HISTÓRICO
// ============================================

function loadHistory() {
  try { const raw=localStorage.getItem('coroHistory'); history=raw?JSON.parse(raw):[]; if(!raw&&Array.isArray(window.CORO_EMBEDDED_HISTORY)){history=window.CORO_EMBEDDED_HISTORY.slice();localStorage.setItem('coroHistory',JSON.stringify(history));} } catch(e){history=Array.isArray(window.CORO_EMBEDDED_HISTORY)?window.CORO_EMBEDDED_HISTORY.slice():[];} return history;
}

function saveHistory() {
  localStorage.setItem('coroHistory', JSON.stringify(history));
}


function getSongTitle(s){return (s&& (s["Título"]||s.Titulo||s.titulo||'' )).trim();}
function getSongAuthor(s){return (s&&(s.Autor||s.autor||'' )).trim();}
function normSmart(v){let x=String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim(); x=x.replace(/acto penitencial/g,'ato penitencial').replace(/accao de gracas/g,'acao de gracas').replace(/acao de gracas/g,'acao de gracas').replace(/piedadede/g,'piedade de'); return x;}
function songMoment(song){const obs=String(song?.Observações||song?.Observacoes||'');const m=obs.match(/Momento:\s*([^|]+)/i);return m?m[1].trim():'';}
function songPsalm(song){const obs=String(song?.Observações||song?.Observacoes||'');const m=obs.match(/Salmo:\s*([^|]+)/i);return m?m[1].trim():'';}
function songCelebration(song){const obs=String(song?.Observações||song?.Observacoes||'');const m=obs.match(/Celebra(?:ção|cao):\s*([^|]+)/i);return m?m[1].trim():'';}
function songSeason(song){const obs=String(song?.Observações||song?.Observacoes||'');const m=obs.match(/Tempo(?: litúrgico| liturgico)?:\s*([^|]+)/i);return m?m[1].trim():'';}
function songCycle(song){const obs=String(song?.Observações||song?.Observacoes||'');const m=obs.match(/Ano(?: litúrgico| liturgico)?:\s*([^|]+)/i);return m?m[1].trim():'';}
function getManualSongMetadata(){
 try{const x=JSON.parse(localStorage.getItem('coroSongMetadata_v1')||'{}');return x&&typeof x==='object'?x:{};}catch(e){return {};}
}
function saveManualSongMetadata(all){localStorage.setItem('coroSongMetadata_v1',JSON.stringify(all||{}));}
function manualSongMetadata(title){return getManualSongMetadata()[normSmart(title)]||null;}
// ============================================
// ENRIQUECIMENTO AUTOMÁTICO — PROGRAMAS 2026
// Fonte: Programas 2026.xlsx. Não substitui fontes litúrgicas oficiais.
// ============================================
const CORO_2026_AUTO_ENRICHMENT = {"Nós Vos saudamos, ó Mãe Santa":{"source":"Programas 2026.xlsx","variants":["Nós Vos saudamos, ó Mãe Santa"],"authors":["F. Santos"],"associations":[{"date":"2026-01-01","part":"entrada","moment":"Entrada","celebration":"SANTA MARIA, MÃE DE DEUS","cycle":""}]},"**********":{"source":"Programas 2026.xlsx","variants":["***","******","**********"],"authors":[],"associations":[{"date":"2026-01-01","part":"atoPenitencial","moment":"Acto Penitencial","celebration":"SANTA MARIA, MÃE DE DEUS","cycle":""},{"date":"2026-02-22","part":"ofertorio","moment":"Ofertório","celebration":"DOMINGO I DA QUARESMA","cycle":""},{"date":"2026-03-29","part":"atoPenitencial","moment":"Acto Penitencial","celebration":"DOMINGO DE RAMOS NA PAIXÃO DO SENHOR","cycle":""}]},"Glória":{"source":"Programas 2026.xlsx","variants":["Glória"],"authors":["A. Cartageno","Az. Oliveira"],"associations":[{"date":"2026-01-01","part":"gloria","moment":"Glória","celebration":"SANTA MARIA, MÃE DE DEUS","cycle":""},{"date":"2026-02-01","part":"gloria","moment":"Glória","celebration":"DOMINGO IV DO TEMPO COMUM","cycle":""},{"date":"2026-06-20","part":"gloria","moment":"Glória","celebration":"Sacramento da Confirmação  Vesp XII TC","cycle":""}]},"Deus tenha compaixão de nós":{"source":"Programas 2026.xlsx","variants":["Deus tenha compaixão de nós"],"authors":["M.Luis"],"associations":[{"date":"2026-01-01","part":"salmo","moment":"Salmo","celebration":"SANTA MARIA, MÃE DE DEUS","cycle":""}]},"Aleluia":{"source":"Programas 2026.xlsx","variants":["Aleluia"],"authors":["A. Cartageno","Az. Oliveira","Az. oliveira","C. Silva","Chepponis","F. Silva","Gregoriana","Gregoriano","M. Faria","M. Joncas","M. Luis","M. Simões","M.. Simões","M.Faria","M.Joncas","Otis","Roux"],"associations":[{"date":"2026-01-01","part":"aclamacao","moment":"Aclamação","celebration":"SANTA MARIA, MÃE DE DEUS","cycle":""},{"date":"2026-01-04","part":"aclamacao","moment":"Aclamação","celebration":"EPIFANIA DO SENHOR","cycle":""},{"date":"2026-01-11","part":"aclamacao","moment":"Aclamação","celebration":"Batismo do Senhor","cycle":""},{"date":"2026-01-18","part":"aclamacao","moment":"Aclamação","celebration":"DOMINGO II DO TEMPO COMUM","cycle":""},{"date":"2026-01-25","part":"aclamacao","moment":"Aclamação","celebration":"DOMINGO III DO TEMPO COMUM\nou Domingo da Palavra de Deus","cycle":""},{"date":"2026-02-01","part":"aclamacao","moment":"Aclamação","celebration":"DOMINGO IV DO TEMPO COMUM","cycle":""},{"date":"2026-02-08","part":"aclamacao","moment":"Aclamação","celebration":"DOMINGO V DO TEMPO COMUM","cycle":""},{"date":"2026-02-15","part":"aclamacao","moment":"Aclamação","celebration":"DOMINGO VI DO TEMPO COMUM","cycle":""},{"date":"2026-02-22","part":"aclamacao","moment":"Aclamação","celebration":"DOMINGO I DA QUARESMA","cycle":""},{"date":"2026-04-05","part":"aclamacao","moment":"Aclamação","celebration":"DOMINGO DE PÁSCOA DA RESSURREIÇÃO DO SENHOR","cycle":""},{"date":"2026-04-12","part":"aclamacao","moment":"Aclamação","celebration":"DOMINGO II DA PÁSCOA ou da Divina Misericórdia","cycle":""},{"date":"2026-04-19","part":"aclamacao","moment":"Aclamação","celebration":"DOMINGO III DA PÁSCOA","cycle":""},{"date":"2026-04-26","part":"aclamacao","moment":"Aclamação","celebration":"DOMINGO IV DA PÁSCOA","cycle":""},{"date":"2026-05-03","part":"aclamacao","moment":"Aclamação","celebration":"DOMINGO V DA PÁSCOA Dia da Mãe","cycle":""},{"date":"2026-05-10","part":"aclamacao","moment":"Aclamação","celebration":"DOMINGO VI DA PÁSCOA","cycle":""},{"date":"2026-05-12","part":"aclamacao","moment":"Aclamação","celebration":"véspera Nossa Senhora do Rosário de Fátima","cycle":""},{"date":"2026-05-17","part":"aclamacao","moment":"Aclamação","celebration":"DOMINGO VII DA PÁSCOA\nASCENSÃO DO SENHOR","cycle":""},{"date":"2026-05-24","part":"aclamacao","moment":"Aclamação","celebration":"DOMINGO DE PENTECOSTES","cycle":""},{"date":"2026-05-31","part":"aclamacao","moment":"Aclamação","celebration":"DOMINGO IX DO TEMPO COMUM\nSANTÍSSIMA TRINDADE","cycle":""},{"date":"2026-06-14","part":"aclamacao","moment":"Aclamação","celebration":"DOMINGO XI DO TEMPO COMUM","cycle":""},{"date":"2026-06-20","part":"aclamacao","moment":"Aclamação","celebration":"Sacramento da Confirmação  Vesp XII TC","cycle":""},{"date":"2026-06-21","part":"aclamacao","moment":"Aclamação","celebration":"DOMINGO XII DO TEMPO COMUM","cycle":""},{"date":"2026-06-24","part":"aclamacao","moment":"Aclamação","celebration":"NASCIMENTO DE SÃO JOÃO BATISTA – SOLENIDADE","cycle":""},{"date":"2026-06-28","part":"aclamacao","moment":"Aclamação","celebration":"DOMINGO XIII DO TEMPO COMUM","cycle":""},{"date":"2026-07-05","part":"aclamacao","moment":"Aclamação","celebration":"DOMINGO XIV DO TEMPO COMUM","cycle":""},{"date":"2026-07-12","part":"aclamacao","moment":"Aclamação","celebration":"DOMINGO XV DO TEMPO COMUM","cycle":""},{"date":"2026-07-19","part":"aclamacao","moment":"Aclamação","celebration":"DOMINGO XVI DO TEMPO COMUM","cycle":""},{"date":"2026-07-26","part":"aclamacao","moment":"Aclamação","celebration":"DOMINGO XVII DO TEMPO COMUM","cycle":""},{"date":"2026-08-02","part":"aclamacao","moment":"Aclamação","celebration":"DOMINGO XVIII DO TEMPO COMUM","cycle":""},{"date":"2026-08-09","part":"aclamacao","moment":"Aclamação","celebration":"DOMINGO XIX DO TEMPO COMUM","cycle":""},{"date":"2026-08-15","part":"aclamacao","moment":"Aclamação","celebration":"ASSUNÇÃO DA VIRGEM SANTA MARIA – SOLENIDADE","cycle":""},{"date":"2026-08-16","part":"aclamacao","moment":"Aclamação","celebration":"DOMINGO XX DO TEMPO COMUM","cycle":""},{"date":"2026-08-23","part":"aclamacao","moment":"Aclamação","celebration":"DOMINGO XXI DO TEMPO COMUM","cycle":""},{"date":"2026-08-30","part":"aclamacao","moment":"Aclamação","celebration":"DOMINGO XXII DO TEMPO COMUM","cycle":""},{"date":"2026-09-06","part":"aclamacao","moment":"Aclamação","celebration":"DOMINGO XXIII DO TEMPO COMUM","cycle":""},{"date":"2026-09-20","part":"aclamacao","moment":"Aclamação","celebration":"DOMINGO XXV DO TEMPO COMUM","cycle":""},{"date":"2026-09-27","part":"aclamacao","moment":"Aclamação","celebration":"DOMINGO XXVI DO TEMPO COMUM","cycle":""}]},"O pão da vida eterna prometida":{"source":"Programas 2026.xlsx","variants":["O pão da vida eterna prometida"],"authors":["B. Salgado"],"associations":[{"date":"2026-01-01","part":"ofertorio","moment":"Ofertório","celebration":"SANTA MARIA, MÃE DE DEUS","cycle":""}]},"Santo":{"source":"Programas 2026.xlsx","variants":["Santo"],"authors":["A. Cartageno","Az. Oliveira","C. Silva","F. Santos","F. Santos/E. Amorim","F. Silva","H. Faria","H.Faria","M Luis","M. Luis","M.Luis"],"associations":[{"date":"2026-01-01","part":"santo","moment":"Santo","celebration":"SANTA MARIA, MÃE DE DEUS","cycle":""},{"date":"2026-01-04","part":"santo","moment":"Santo","celebration":"EPIFANIA DO SENHOR","cycle":""},{"date":"2026-01-11","part":"santo","moment":"Santo","celebration":"Batismo do Senhor","cycle":""},{"date":"2026-01-18","part":"santo","moment":"Santo","celebration":"DOMINGO II DO TEMPO COMUM","cycle":""},{"date":"2026-01-25","part":"santo","moment":"Santo","celebration":"DOMINGO III DO TEMPO COMUM\nou Domingo da Palavra de Deus","cycle":""},{"date":"2026-02-01","part":"santo","moment":"Santo","celebration":"DOMINGO IV DO TEMPO COMUM","cycle":""},{"date":"2026-02-08","part":"santo","moment":"Santo","celebration":"DOMINGO V DO TEMPO COMUM","cycle":""},{"date":"2026-02-15","part":"santo","moment":"Santo","celebration":"DOMINGO VI DO TEMPO COMUM","cycle":""},{"date":"2026-02-22","part":"santo","moment":"Santo","celebration":"DOMINGO I DA QUARESMA","cycle":""},{"date":"2026-03-01","part":"santo","moment":"Santo","celebration":"DOMINGO II DA QUARESMA","cycle":""},{"date":"2026-03-15","part":"santo","moment":"Santo","celebration":"DOMINGO IV DA QUARESMA","cycle":""},{"date":"2026-03-22","part":"santo","moment":"Santo","celebration":"DOMINGO V DA QUARESMA","cycle":""},{"date":"2026-03-29","part":"santo","moment":"Santo","celebration":"DOMINGO DE RAMOS NA PAIXÃO DO SENHOR","cycle":""},{"date":"2026-04-05","part":"santo","moment":"Santo","celebration":"DOMINGO DE PÁSCOA DA RESSURREIÇÃO DO SENHOR","cycle":""},{"date":"2026-04-12","part":"santo","moment":"Santo","celebration":"DOMINGO II DA PÁSCOA ou da Divina Misericórdia","cycle":""},{"date":"2026-04-19","part":"santo","moment":"Santo","celebration":"DOMINGO III DA PÁSCOA","cycle":""},{"date":"2026-04-26","part":"santo","moment":"Santo","celebration":"DOMINGO IV DA PÁSCOA","cycle":""},{"date":"2026-05-03","part":"santo","moment":"Santo","celebration":"DOMINGO V DA PÁSCOA Dia da Mãe","cycle":""},{"date":"2026-05-10","part":"santo","moment":"Santo","celebration":"DOMINGO VI DA PÁSCOA","cycle":""},{"date":"2026-05-12","part":"santo","moment":"Santo","celebration":"véspera Nossa Senhora do Rosário de Fátima","cycle":""},{"date":"2026-05-13","part":"santo","moment":"Santo","celebration":"Nossa Senhora do Rosário de Fátima","cycle":""},{"date":"2026-05-24","part":"santo","moment":"Santo","celebration":"DOMINGO DE PENTECOSTES","cycle":""},{"date":"2026-05-31","part":"santo","moment":"Santo","celebration":"DOMINGO IX DO TEMPO COMUM\nSANTÍSSIMA TRINDADE","cycle":""},{"date":"2026-06-14","part":"santo","moment":"Santo","celebration":"DOMINGO XI DO TEMPO COMUM","cycle":""},{"date":"2026-06-21","part":"santo","moment":"Santo","celebration":"DOMINGO XII DO TEMPO COMUM","cycle":""},{"date":"2026-06-24","part":"santo","moment":"Santo","celebration":"NASCIMENTO DE SÃO JOÃO BATISTA – SOLENIDADE","cycle":""},{"date":"2026-06-28","part":"santo","moment":"Santo","celebration":"DOMINGO XIII DO TEMPO COMUM","cycle":""},{"date":"2026-07-05","part":"santo","moment":"Santo","celebration":"DOMINGO XIV DO TEMPO COMUM","cycle":""},{"date":"2026-07-12","part":"santo","moment":"Santo","celebration":"DOMINGO XV DO TEMPO COMUM","cycle":""},{"date":"2026-07-19","part":"santo","moment":"Santo","celebration":"DOMINGO XVI DO TEMPO COMUM","cycle":""},{"date":"2026-07-26","part":"santo","moment":"Santo","celebration":"DOMINGO XVII DO TEMPO COMUM","cycle":""},{"date":"2026-08-02","part":"santo","moment":"Santo","celebration":"DOMINGO XVIII DO TEMPO COMUM","cycle":""},{"date":"2026-08-09","part":"santo","moment":"Santo","celebration":"DOMINGO XIX DO TEMPO COMUM","cycle":""},{"date":"2026-08-15","part":"santo","moment":"Santo","celebration":"ASSUNÇÃO DA VIRGEM SANTA MARIA – SOLENIDADE","cycle":""},{"date":"2026-08-16","part":"santo","moment":"Santo","celebration":"DOMINGO XX DO TEMPO COMUM","cycle":""},{"date":"2026-08-23","part":"santo","moment":"Santo","celebration":"DOMINGO XXI DO TEMPO COMUM","cycle":""},{"date":"2026-08-30","part":"santo","moment":"Santo","celebration":"DOMINGO XXII DO TEMPO COMUM","cycle":""},{"date":"2026-09-06","part":"santo","moment":"Santo","celebration":"DOMINGO XXIII DO TEMPO COMUM","cycle":""},{"date":"2026-09-20","part":"santo","moment":"Santo","celebration":"DOMINGO XXV DO TEMPO COMUM","cycle":""},{"date":"2026-09-27","part":"santo","moment":"Santo","celebration":"DOMINGO XXVI DO TEMPO COMUM","cycle":""}]},"Cordeiro de Deus":{"source":"Programas 2026.xlsx","variants":["Cordeiro de Deus","Cordeiro de deus"],"authors":["A. Cartageno","A.Cartageno","Az. Oliveira","C. Silva","F. Silva","M Luis","M. Luis","M. Silva","M. Simões","M.Luis","M.Silva","M.Simões","Mário Silva","T. Aragués"],"associations":[{"date":"2026-01-01","part":"cordeiro","moment":"Cordeiro de Deus","celebration":"SANTA MARIA, MÃE DE DEUS","cycle":""},{"date":"2026-01-04","part":"cordeiro","moment":"Cordeiro de Deus","celebration":"EPIFANIA DO SENHOR","cycle":""},{"date":"2026-01-11","part":"cordeiro","moment":"Cordeiro de Deus","celebration":"Batismo do Senhor","cycle":""},{"date":"2026-01-18","part":"cordeiro","moment":"Cordeiro de Deus","celebration":"DOMINGO II DO TEMPO COMUM","cycle":""},{"date":"2026-01-25","part":"cordeiro","moment":"Cordeiro de Deus","celebration":"DOMINGO III DO TEMPO COMUM\nou Domingo da Palavra de Deus","cycle":""},{"date":"2026-02-01","part":"cordeiro","moment":"Cordeiro de Deus","celebration":"DOMINGO IV DO TEMPO COMUM","cycle":""},{"date":"2026-02-08","part":"cordeiro","moment":"Cordeiro de Deus","celebration":"DOMINGO V DO TEMPO COMUM","cycle":""},{"date":"2026-02-15","part":"cordeiro","moment":"Cordeiro de Deus","celebration":"DOMINGO VI DO TEMPO COMUM","cycle":""},{"date":"2026-02-22","part":"cordeiro","moment":"Cordeiro de Deus","celebration":"DOMINGO I DA QUARESMA","cycle":""},{"date":"2026-03-01","part":"cordeiro","moment":"Cordeiro de Deus","celebration":"DOMINGO II DA QUARESMA","cycle":""},{"date":"2026-03-08","part":"cordeiro","moment":"Cordeiro de Deus","celebration":"DOMINGO III DA QUARESMA","cycle":""},{"date":"2026-03-15","part":"cordeiro","moment":"Cordeiro de Deus","celebration":"DOMINGO IV DA QUARESMA","cycle":""},{"date":"2026-03-22","part":"cordeiro","moment":"Cordeiro de Deus","celebration":"DOMINGO V DA QUARESMA","cycle":""},{"date":"2026-03-29","part":"cordeiro","moment":"Cordeiro de Deus","celebration":"DOMINGO DE RAMOS NA PAIXÃO DO SENHOR","cycle":""},{"date":"2026-04-12","part":"cordeiro","moment":"Cordeiro de Deus","celebration":"DOMINGO II DA PÁSCOA ou da Divina Misericórdia","cycle":""},{"date":"2026-04-19","part":"cordeiro","moment":"Cordeiro de Deus","celebration":"DOMINGO III DA PÁSCOA","cycle":""},{"date":"2026-04-26","part":"cordeiro","moment":"Cordeiro de Deus","celebration":"DOMINGO IV DA PÁSCOA","cycle":""},{"date":"2026-05-03","part":"cordeiro","moment":"Cordeiro de Deus","celebration":"DOMINGO V DA PÁSCOA Dia da Mãe","cycle":""},{"date":"2026-05-10","part":"cordeiro","moment":"Cordeiro de Deus","celebration":"DOMINGO VI DA PÁSCOA","cycle":""},{"date":"2026-05-12","part":"cordeiro","moment":"Cordeiro de Deus","celebration":"véspera Nossa Senhora do Rosário de Fátima","cycle":""},{"date":"2026-05-13","part":"cordeiro","moment":"Cordeiro de Deus","celebration":"Nossa Senhora do Rosário de Fátima","cycle":""},{"date":"2026-05-17","part":"cordeiro","moment":"Cordeiro de Deus","celebration":"DOMINGO VII DA PÁSCOA\nASCENSÃO DO SENHOR","cycle":""},{"date":"2026-05-24","part":"cordeiro","moment":"Cordeiro de Deus","celebration":"DOMINGO DE PENTECOSTES","cycle":""},{"date":"2026-06-14","part":"cordeiro","moment":"Cordeiro de Deus","celebration":"DOMINGO XI DO TEMPO COMUM","cycle":""},{"date":"2026-06-21","part":"cordeiro","moment":"Cordeiro de Deus","celebration":"DOMINGO XII DO TEMPO COMUM","cycle":""},{"date":"2026-06-28","part":"cordeiro","moment":"Cordeiro de Deus","celebration":"DOMINGO XIII DO TEMPO COMUM","cycle":""},{"date":"2026-07-05","part":"cordeiro","moment":"Cordeiro de Deus","celebration":"DOMINGO XIV DO TEMPO COMUM","cycle":""},{"date":"2026-07-12","part":"cordeiro","moment":"Cordeiro de Deus","celebration":"DOMINGO XV DO TEMPO COMUM","cycle":""},{"date":"2026-07-19","part":"cordeiro","moment":"Cordeiro de Deus","celebration":"DOMINGO XVI DO TEMPO COMUM","cycle":""},{"date":"2026-07-26","part":"cordeiro","moment":"Cordeiro de Deus","celebration":"DOMINGO XVII DO TEMPO COMUM","cycle":""},{"date":"2026-08-02","part":"cordeiro","moment":"Cordeiro de Deus","celebration":"DOMINGO XVIII DO TEMPO COMUM","cycle":""},{"date":"2026-08-09","part":"cordeiro","moment":"Cordeiro de Deus","celebration":"DOMINGO XIX DO TEMPO COMUM","cycle":""},{"date":"2026-08-16","part":"cordeiro","moment":"Cordeiro de Deus","celebration":"DOMINGO XX DO TEMPO COMUM","cycle":""},{"date":"2026-08-23","part":"cordeiro","moment":"Cordeiro de Deus","celebration":"DOMINGO XXI DO TEMPO COMUM","cycle":""},{"date":"2026-08-30","part":"cordeiro","moment":"Cordeiro de Deus","celebration":"DOMINGO XXII DO TEMPO COMUM","cycle":""},{"date":"2026-09-06","part":"cordeiro","moment":"Cordeiro de Deus","celebration":"DOMINGO XXIII DO TEMPO COMUM","cycle":""},{"date":"2026-09-13","part":"cordeiro","moment":"Cordeiro de Deus","celebration":"DOMINGO XXIV DO TEMPO COMUM","cycle":""},{"date":"2026-09-20","part":"cordeiro","moment":"Cordeiro de Deus","celebration":"DOMINGO XXV DO TEMPO COMUM","cycle":""},{"date":"2026-09-27","part":"cordeiro","moment":"Cordeiro de Deus","celebration":"DOMINGO XXVI DO TEMPO COMUM","cycle":""}]},"Jesus Cristo, ontem e hoje":{"source":"Programas 2026.xlsx","variants":["Jesus Cristo, ontem e hoje"],"authors":["A. Cartageno"],"associations":[{"date":"2026-01-01","part":"comunhao","moment":"Comunhão","celebration":"SANTA MARIA, MÃE DE DEUS","cycle":""}]},"Alegrem-se os céus e a terra":{"source":"Programas 2026.xlsx","variants":["Alegrem-se os céus e a terra"],"authors":[],"associations":[{"date":"2026-01-01","part":"final","moment":"Final","celebration":"SANTA MARIA, MÃE DE DEUS","cycle":""}]},"Cristo nasceu: Vinde adoremos":{"source":"Programas 2026.xlsx","variants":["Cristo nasceu: Vinde adoremos"],"authors":["C. Silva"],"associations":[{"date":"2026-01-04","part":"entrada","moment":"Entrada","celebration":"EPIFANIA DO SENHOR","cycle":""}]},"Senhor tende piedadede nós":{"source":"Programas 2026.xlsx","variants":["Senhor tende piedade de nós","Senhor tende piedadede nós"],"authors":["Az. Oliveira","C. Silva","F. Santos","F. Silva","F.Santos","J. santos","J.Santos","M. Luis","M. Luis ( Com tropos)","T. Aragués"],"associations":[{"date":"2026-01-04","part":"atoPenitencial","moment":"Acto Penitencial","celebration":"EPIFANIA DO SENHOR","cycle":""},{"date":"2026-02-08","part":"atoPenitencial","moment":"Acto Penitencial","celebration":"DOMINGO V DO TEMPO COMUM","cycle":""},{"date":"2026-03-08","part":"atoPenitencial","moment":"Acto Penitencial","celebration":"DOMINGO III DA QUARESMA","cycle":""},{"date":"2026-04-12","part":"atoPenitencial","moment":"Acto Penitencial","celebration":"DOMINGO II DA PÁSCOA ou da Divina Misericórdia","cycle":""},{"date":"2026-05-03","part":"atoPenitencial","moment":"Acto Penitencial","celebration":"DOMINGO V DA PÁSCOA Dia da Mãe","cycle":""},{"date":"2026-05-17","part":"atoPenitencial","moment":"Acto Penitencial","celebration":"DOMINGO VII DA PÁSCOA\nASCENSÃO DO SENHOR","cycle":""},{"date":"2026-06-21","part":"atoPenitencial","moment":"Acto Penitencial","celebration":"DOMINGO XII DO TEMPO COMUM","cycle":""},{"date":"2026-07-19","part":"atoPenitencial","moment":"Acto Penitencial","celebration":"DOMINGO XVI DO TEMPO COMUM","cycle":""},{"date":"2026-08-15","part":"atoPenitencial","moment":"Acto Penitencial","celebration":"ASSUNÇÃO DA VIRGEM SANTA MARIA – SOLENIDADE","cycle":""},{"date":"2026-09-06","part":"atoPenitencial","moment":"Acto Penitencial","celebration":"DOMINGO XXIII DO TEMPO COMUM","cycle":""},{"date":"2026-09-20","part":"atoPenitencial","moment":"Acto Penitencial","celebration":"DOMINGO XXV DO TEMPO COMUM","cycle":""}]},"Ó luz de Deus":{"source":"Programas 2026.xlsx","variants":["Ó luz de Deus"],"authors":[],"associations":[{"date":"2026-01-04","part":"ofertorio","moment":"Ofertório","celebration":"EPIFANIA DO SENHOR","cycle":""}]},"Uns Magos vindos do além":{"source":"Programas 2026.xlsx","variants":["Uns Magos vindos do além"],"authors":["F. Silva"],"associations":[{"date":"2026-01-04","part":"comunhao","moment":"Comunhão","celebration":"EPIFANIA DO SENHOR","cycle":""}]},"Hino do Jubileu e Cantem cantem os anjos":{"source":"Programas 2026.xlsx","variants":["Hino do Jubileu e Cantem cantem os anjos"],"authors":[],"associations":[{"date":"2026-01-04","part":"final","moment":"Final","celebration":"EPIFANIA DO SENHOR","cycle":""}]},"Águas das fontes dos rios e dos mares":{"source":"Programas 2026.xlsx","variants":["Águas das fontes dos rios e dos mares"],"authors":["A. Cartageno"],"associations":[{"date":"2026-01-11","part":"entrada","moment":"Entrada","celebration":"Batismo do Senhor","cycle":""}]},"O Senhor abençoará o seu povo":{"source":"Programas 2026.xlsx","variants":["O Senhor abençoará o seu povo"],"authors":[],"associations":[{"date":"2026-01-11","part":"salmo","moment":"Salmo","celebration":"Batismo do Senhor","cycle":""}]},"Toda a terra vos adore":{"source":"Programas 2026.xlsx","variants":["Toda a terra vos adore"],"authors":["C. Silva"],"associations":[{"date":"2026-01-18","part":"entrada","moment":"Entrada","celebration":"DOMINGO II DO TEMPO COMUM","cycle":""}]},"Preparais a mesa para mim":{"source":"Programas 2026.xlsx","variants":["Preparais a mesa para mim"],"authors":["C. Silva"],"associations":[{"date":"2026-01-18","part":"comunhao","moment":"Comunhão","celebration":"DOMINGO II DO TEMPO COMUM","cycle":""}]},"Cantai ao Senhor":{"source":"Programas 2026.xlsx","variants":["Cantai ao Senhor"],"authors":["F. Santos"],"associations":[{"date":"2026-01-25","part":"entrada","moment":"Entrada","celebration":"DOMINGO III DO TEMPO COMUM\nou Domingo da Palavra de Deus","cycle":""}]},"Não fostes vós que me escolheste":{"source":"Programas 2026.xlsx","variants":["Não fostes vós que me escolheste"],"authors":["Az. Oliveira"],"associations":[{"date":"2026-01-25","part":"ofertorio","moment":"Ofertório","celebration":"DOMINGO III DO TEMPO COMUM\nou Domingo da Palavra de Deus","cycle":""},{"date":"2026-08-23","part":"comunhao","moment":"Comunhão","celebration":"DOMINGO XXI DO TEMPO COMUM","cycle":""}]},"Tu que nas margens do lago":{"source":"Programas 2026.xlsx","variants":["Tu que nas margens do lago"],"authors":[],"associations":[{"date":"2026-01-25","part":"comunhao","moment":"Comunhão","celebration":"DOMINGO III DO TEMPO COMUM\nou Domingo da Palavra de Deus","cycle":""}]},"A semente é a palavra de Deus":{"source":"Programas 2026.xlsx","variants":["A semente é a palavra de Deus"],"authors":[],"associations":[{"date":"2026-01-25","part":"final","moment":"Final","celebration":"DOMINGO III DO TEMPO COMUM\nou Domingo da Palavra de Deus","cycle":""}]},"Salvai-nos, Senhor, nosso Deus":{"source":"Programas 2026.xlsx","variants":["Salvai-nos, Senhor, nosso Deus"],"authors":["Az. Oliveira"],"associations":[{"date":"2026-02-01","part":"entrada","moment":"Entrada","celebration":"DOMINGO IV DO TEMPO COMUM","cycle":""}]},"Senhor tende piedade":{"source":"Programas 2026.xlsx","variants":["Senhor tende piedade"],"authors":["Az. Oliveira","Az. oliveira","C. Silva","C.Silva","F. Santos","F.Santos","J. Santos","T. Aragués"],"associations":[{"date":"2026-02-01","part":"atoPenitencial","moment":"Acto Penitencial","celebration":"DOMINGO IV DO TEMPO COMUM","cycle":""},{"date":"2026-03-15","part":"atoPenitencial","moment":"Acto Penitencial","celebration":"DOMINGO IV DA QUARESMA","cycle":""},{"date":"2026-04-26","part":"atoPenitencial","moment":"Acto Penitencial","celebration":"DOMINGO IV DA PÁSCOA","cycle":""},{"date":"2026-05-24","part":"atoPenitencial","moment":"Acto Penitencial","celebration":"DOMINGO DE PENTECOSTES","cycle":""},{"date":"2026-05-31","part":"atoPenitencial","moment":"Acto Penitencial","celebration":"DOMINGO IX DO TEMPO COMUM\nSANTÍSSIMA TRINDADE","cycle":""},{"date":"2026-06-14","part":"atoPenitencial","moment":"Acto Penitencial","celebration":"DOMINGO XI DO TEMPO COMUM","cycle":""},{"date":"2026-06-24","part":"atoPenitencial","moment":"Acto Penitencial","celebration":"NASCIMENTO DE SÃO JOÃO BATISTA – SOLENIDADE","cycle":""},{"date":"2026-07-05","part":"atoPenitencial","moment":"Acto Penitencial","celebration":"DOMINGO XIV DO TEMPO COMUM","cycle":""},{"date":"2026-07-26","part":"atoPenitencial","moment":"Acto Penitencial","celebration":"DOMINGO XVII DO TEMPO COMUM","cycle":""},{"date":"2026-08-02","part":"atoPenitencial","moment":"Acto Penitencial","celebration":"DOMINGO XVIII DO TEMPO COMUM","cycle":""},{"date":"2026-08-09","part":"atoPenitencial","moment":"Acto Penitencial","celebration":"DOMINGO XIX DO TEMPO COMUM","cycle":""},{"date":"2026-08-23","part":"atoPenitencial","moment":"Acto Penitencial","celebration":"DOMINGO XXI DO TEMPO COMUM","cycle":""},{"date":"2026-08-30","part":"atoPenitencial","moment":"Acto Penitencial","celebration":"DOMINGO XXII DO TEMPO COMUM","cycle":""},{"date":"2026-09-13","part":"atoPenitencial","moment":"Acto Penitencial","celebration":"DOMINGO XXIV DO TEMPO COMUM","cycle":""},{"date":"2026-09-27","part":"atoPenitencial","moment":"Acto Penitencial","celebration":"DOMINGO XXVI DO TEMPO COMUM","cycle":""}]},"Bem-aventurados os pobres em espírito":{"source":"Programas 2026.xlsx","variants":["Bem-aventurados os pobres em espírito"],"authors":["Az. Oliveira"],"associations":[{"date":"2026-02-01","part":"salmo","moment":"Salmo","celebration":"DOMINGO IV DO TEMPO COMUM","cycle":""}]},"Meu Deus, na simplicidade":{"source":"Programas 2026.xlsx","variants":["Meu Deus, na simplicidade"],"authors":["Az. Oliveira"],"associations":[{"date":"2026-02-01","part":"ofertorio","moment":"Ofertório","celebration":"DOMINGO IV DO TEMPO COMUM","cycle":""}]},"Bendito seja deus nosso pai":{"source":"Programas 2026.xlsx","variants":["Bendito seja deus nosso pai"],"authors":["Az. Oliveira"],"associations":[{"date":"2026-02-01","part":"comunhao","moment":"Comunhão","celebration":"DOMINGO IV DO TEMPO COMUM","cycle":""}]},"Senhor trazei-nos a paz":{"source":"Programas 2026.xlsx","variants":["Senhor trazei-nos a paz"],"authors":["Az. Oliveira"],"associations":[{"date":"2026-02-01","part":"final","moment":"Final","celebration":"DOMINGO IV DO TEMPO COMUM","cycle":""},{"date":"2026-09-13","part":"entrada","moment":"Entrada","celebration":"DOMINGO XXIV DO TEMPO COMUM","cycle":""}]},"Vinde prostremo-nos em terra":{"source":"Programas 2026.xlsx","variants":["Vinde prostremo-nos em terra"],"authors":["Az. Oliveira"],"associations":[{"date":"2026-02-08","part":"entrada","moment":"Entrada","celebration":"DOMINGO V DO TEMPO COMUM","cycle":""}]},"Para o homem recto nascerá uma luz no meio das trevas.":{"source":"Programas 2026.xlsx","variants":["Para o homem recto\nnascerá uma luz no meio das trevas."],"authors":["M.Luis"],"associations":[{"date":"2026-02-08","part":"salmo","moment":"Salmo","celebration":"DOMINGO V DO TEMPO COMUM","cycle":""}]},"Senhor tu és a luz":{"source":"Programas 2026.xlsx","variants":["Senhor tu és a luz"],"authors":["Az. Oliveira"],"associations":[{"date":"2026-02-08","part":"ofertorio","moment":"Ofertório","celebration":"DOMINGO V DO TEMPO COMUM","cycle":""}]},"Brilhe a vossa luz diante dos homens":{"source":"Programas 2026.xlsx","variants":["Brilhe a vossa luz diante dos homens"],"authors":["M. Simões"],"associations":[{"date":"2026-02-08","part":"comunhao","moment":"Comunhão","celebration":"DOMINGO V DO TEMPO COMUM","cycle":""}]},"Quero cantar o vosso nome":{"source":"Programas 2026.xlsx","variants":["Quero cantar o vosso nome"],"authors":["A. Cartageno"],"associations":[{"date":"2026-02-08","part":"final","moment":"Final","celebration":"DOMINGO V DO TEMPO COMUM","cycle":""}]},"Sede a rocha do meu refúgio":{"source":"Programas 2026.xlsx","variants":["Sede a rocha do meu refúgio"],"authors":["M.Simões"],"associations":[{"date":"2026-02-15","part":"entrada","moment":"Entrada","celebration":"DOMINGO VI DO TEMPO COMUM","cycle":""}]},"Kyrie":{"source":"Programas 2026.xlsx","variants":["Kyrie"],"authors":["Berthier","Botor","J. Berthier","M. Carneiro","M.Simões"],"associations":[{"date":"2026-02-15","part":"atoPenitencial","moment":"Acto Penitencial","celebration":"DOMINGO VI DO TEMPO COMUM","cycle":""},{"date":"2026-04-19","part":"atoPenitencial","moment":"Acto Penitencial","celebration":"DOMINGO III DA PÁSCOA","cycle":""},{"date":"2026-05-10","part":"atoPenitencial","moment":"Acto Penitencial","celebration":"DOMINGO VI DA PÁSCOA","cycle":""},{"date":"2026-05-13","part":"atoPenitencial","moment":"Acto Penitencial","celebration":"Nossa Senhora do Rosário de Fátima","cycle":""},{"date":"2026-07-12","part":"atoPenitencial","moment":"Acto Penitencial","celebration":"DOMINGO XV DO TEMPO COMUM","cycle":""}]},"Ditoso o que anda na lei do Senhor.":{"source":"Programas 2026.xlsx","variants":["Ditoso o que anda na lei do Senhor."],"authors":["M.Luis"],"associations":[{"date":"2026-02-15","part":"salmo","moment":"Salmo","celebration":"DOMINGO VI DO TEMPO COMUM","cycle":""}]},"Deus é amor":{"source":"Programas 2026.xlsx","variants":["Deus é amor"],"authors":["M.Luis"],"associations":[{"date":"2026-02-15","part":"fimBencao","moment":"Fim da Benção","celebration":"DOMINGO VI DO TEMPO COMUM","cycle":""}]},"Onde há caridade verdadeira":{"source":"Programas 2026.xlsx","variants":["Onde há caridade verdadeira"],"authors":["C. Silva","C. silva"],"associations":[{"date":"2026-02-15","part":"ofertorio","moment":"Ofertório","celebration":"DOMINGO VI DO TEMPO COMUM","cycle":""},{"date":"2026-09-27","part":"ofertorio","moment":"Ofertório","celebration":"DOMINGO XXVI DO TEMPO COMUM","cycle":""}]},"O Senhor deu-lhes o pão do Céu":{"source":"Programas 2026.xlsx","variants":["O Senhor deu-lhes o pão do Céu"],"authors":["M. Luis"],"associations":[{"date":"2026-02-15","part":"comunhao","moment":"Comunhão","celebration":"DOMINGO VI DO TEMPO COMUM","cycle":""}]},"Povo teu somos":{"source":"Programas 2026.xlsx","variants":["Povo teu somos"],"authors":[],"associations":[{"date":"2026-02-15","part":"final","moment":"Final","celebration":"DOMINGO VI DO TEMPO COMUM","cycle":""},{"date":"2026-07-12","part":"final","moment":"Final","celebration":"DOMINGO XV DO TEMPO COMUM","cycle":""}]},"Cristo Jesus Tu me chamaste":{"source":"Programas 2026.xlsx","variants":["Cristo Jesus Tu me chamaste"],"authors":["H. Faria"],"associations":[{"date":"2026-02-22","part":"entrada","moment":"Entrada","celebration":"DOMINGO I DA QUARESMA","cycle":""}]},"Senhor misericórdia":{"source":"Programas 2026.xlsx","variants":["Senhor misericórdia"],"authors":["A. Cartageno"],"associations":[{"date":"2026-02-22","part":"atoPenitencial","moment":"Acto Penitencial","celebration":"DOMINGO I DA QUARESMA","cycle":""},{"date":"2026-03-01","part":"atoPenitencial","moment":"Acto Penitencial","celebration":"DOMINGO II DA QUARESMA","cycle":""},{"date":"2026-06-28","part":"atoPenitencial","moment":"Acto Penitencial","celebration":"DOMINGO XIII DO TEMPO COMUM","cycle":""}]},"Pecámos, Senhor: tende piedade de nós.":{"source":"Programas 2026.xlsx","variants":["Pecámos, Senhor: tende piedade de nós."],"authors":["M. Luis"],"associations":[{"date":"2026-02-22","part":"salmo","moment":"Salmo","celebration":"DOMINGO I DA QUARESMA","cycle":""}]},"Glória a vós Cristo":{"source":"Programas 2026.xlsx","variants":["Glória a vós Cristo"],"authors":["F. Santos"],"associations":[{"date":"2026-02-22","part":"aclamacao","moment":"Aclamação","celebration":"DOMINGO I DA QUARESMA","cycle":""}]},"Nem só de pão vive o homem":{"source":"Programas 2026.xlsx","variants":["Nem só de pão vive o homem"],"authors":["F. Santos"],"associations":[{"date":"2026-02-22","part":"comunhao","moment":"Comunhão","celebration":"DOMINGO I DA QUARESMA","cycle":""}]},"Irmãos, convertei o vosso coração":{"source":"Programas 2026.xlsx","variants":["Irmãos, convertei o vosso coração"],"authors":["J. P. Lecót"],"associations":[{"date":"2026-02-22","part":"final","moment":"Final","celebration":"DOMINGO I DA QUARESMA","cycle":""},{"date":"2026-03-08","part":"final","moment":"Final","celebration":"DOMINGO III DA QUARESMA","cycle":""}]},"Procurai a face do Senhor":{"source":"Programas 2026.xlsx","variants":["Procurai a face do Senhor"],"authors":["M. Carneiro"],"associations":[{"date":"2026-03-01","part":"entrada","moment":"Entrada","celebration":"DOMINGO II DA QUARESMA","cycle":""}]},"Esperamos, Senhor, na vossa misericórdia.":{"source":"Programas 2026.xlsx","variants":["Esperamos, Senhor, na vossa misericórdia."],"authors":["M. Luis","M.Luis"],"associations":[{"date":"2026-03-01","part":"salmo","moment":"Salmo","celebration":"DOMINGO II DA QUARESMA","cycle":""},{"date":"2026-05-03","part":"salmo","moment":"Salmo","celebration":"DOMINGO V DA PÁSCOA Dia da Mãe","cycle":""}]},"Louvor a vós":{"source":"Programas 2026.xlsx","variants":["Louvor a Vós","Louvor a vós"],"authors":["F. Santos"],"associations":[{"date":"2026-03-01","part":"aclamacao","moment":"Aclamação","celebration":"DOMINGO II DA QUARESMA","cycle":""},{"date":"2026-03-15","part":"aclamacao","moment":"Aclamação","celebration":"DOMINGO IV DA QUARESMA","cycle":""}]},"Jesus tomou consigo":{"source":"Programas 2026.xlsx","variants":["Jesus tomou consigo"],"authors":["C. Silva"],"associations":[{"date":"2026-03-01","part":"ofertorio","moment":"Ofertório","celebration":"DOMINGO II DA QUARESMA","cycle":""}]},"Este é o meu Filho":{"source":"Programas 2026.xlsx","variants":["Este é o meu Filho"],"authors":["M. Carneiro"],"associations":[{"date":"2026-03-01","part":"comunhao","moment":"Comunhão","celebration":"DOMINGO II DA QUARESMA","cycle":""}]},"É preciso renascer":{"source":"Programas 2026.xlsx","variants":["É preciso renascer"],"authors":["J.P.Martins"],"associations":[{"date":"2026-03-01","part":"final","moment":"Final","celebration":"DOMINGO II DA QUARESMA","cycle":""}]},"Olhai para mim, Senhor":{"source":"Programas 2026.xlsx","variants":["Olhai para mim, Senhor"],"authors":["A. Cartageno"],"associations":[{"date":"2026-03-08","part":"entrada","moment":"Entrada","celebration":"DOMINGO III DA QUARESMA","cycle":""}]},"Hoje se escutardes a voz do Senhor":{"source":"Programas 2026.xlsx","variants":["Hoje se escutardes a voz do Senhor"],"authors":["M. Luis","M.Luis"],"associations":[{"date":"2026-03-08","part":"salmo","moment":"Salmo","celebration":"DOMINGO III DA QUARESMA","cycle":""},{"date":"2026-09-06","part":"salmo","moment":"Salmo","celebration":"DOMINGO XXIII DO TEMPO COMUM","cycle":""}]},"Louvor a Vós, Rei da eterna Glória":{"source":"Programas 2026.xlsx","variants":["Louvor a Vós, Rei da eterna Glória"],"authors":["M.Luis"],"associations":[{"date":"2026-03-08","part":"aclamacao","moment":"Aclamação","celebration":"DOMINGO III DA QUARESMA","cycle":""},{"date":"2026-03-22","part":"aclamacao","moment":"Aclamação","celebration":"DOMINGO V DA QUARESMA","cycle":""}]},"Confesso o meu pecado":{"source":"Programas 2026.xlsx","variants":["Confesso o meu pecado"],"authors":["J. Santos"],"associations":[{"date":"2026-03-08","part":"ofertorio","moment":"Ofertório","celebration":"DOMINGO III DA QUARESMA","cycle":""}]},"Santo I":{"source":"Programas 2026.xlsx","variants":["Santo I"],"authors":["A. Cartageno"],"associations":[{"date":"2026-03-08","part":"santo","moment":"Santo","celebration":"DOMINGO III DA QUARESMA","cycle":""}]},"Bebei se tendes sede":{"source":"Programas 2026.xlsx","variants":["Bebei se tendes sede"],"authors":["C. Silva"],"associations":[{"date":"2026-03-08","part":"comunhao","moment":"Comunhão","celebration":"DOMINGO III DA QUARESMA","cycle":""}]},"Alegra-te Jerusalem":{"source":"Programas 2026.xlsx","variants":["Alegra-te Jerusalem"],"authors":["J.P.Martins"],"associations":[{"date":"2026-03-15","part":"entrada","moment":"Entrada","celebration":"DOMINGO IV DA QUARESMA","cycle":""}]},"O Senhor é meu pastor":{"source":"Programas 2026.xlsx","variants":["O Senhor é meu pastor"],"authors":["M.Luis"],"associations":[{"date":"2026-03-15","part":"salmo","moment":"Salmo","celebration":"DOMINGO IV DA QUARESMA","cycle":""}]},"Em vós senhor está a fonte da vida":{"source":"Programas 2026.xlsx","variants":["Em vós senhor está a fonte da vida"],"authors":["Az. Oliveira"],"associations":[{"date":"2026-03-15","part":"ofertorio","moment":"Ofertório","celebration":"DOMINGO IV DA QUARESMA","cycle":""}]},"O Senhor ungiu os meus olhos":{"source":"Programas 2026.xlsx","variants":["O Senhor ungiu os meus olhos"],"authors":["M.Geada"],"associations":[{"date":"2026-03-15","part":"comunhao","moment":"Comunhão","celebration":"DOMINGO IV DA QUARESMA","cycle":""}]},"Aos pés da Cruz":{"source":"Programas 2026.xlsx","variants":["Aos pés da Cruz"],"authors":["H. Faria"],"associations":[{"date":"2026-03-15","part":"final","moment":"Final","celebration":"DOMINGO IV DA QUARESMA","cycle":""}]},"Deus vinde em meu auxilio":{"source":"Programas 2026.xlsx","variants":["Deus vinde em meu auxilio"],"authors":["F. Silva"],"associations":[{"date":"2026-03-22","part":"entrada","moment":"Entrada","celebration":"DOMINGO V DA QUARESMA","cycle":""}]},"Kyrie eleison":{"source":"Programas 2026.xlsx","variants":["Kyrie eleison"],"authors":["M.Simões"],"associations":[{"date":"2026-03-22","part":"atoPenitencial","moment":"Acto Penitencial","celebration":"DOMINGO V DA QUARESMA","cycle":""}]},"Junto do Senhor a misericórdia":{"source":"Programas 2026.xlsx","variants":["Junto do Senhor a misericórdia"],"authors":["M.Luis"],"associations":[{"date":"2026-03-22","part":"salmo","moment":"Salmo","celebration":"DOMINGO V DA QUARESMA","cycle":""}]},"Luz terna suave":{"source":"Programas 2026.xlsx","variants":["Luz terna suave"],"authors":["B. Ferreira"],"associations":[{"date":"2026-03-22","part":"ofertorio","moment":"Ofertório","celebration":"DOMINGO V DA QUARESMA","cycle":""}]},"Se muito pesa irmãos a vossa cruz":{"source":"Programas 2026.xlsx","variants":["Se muito pesa irmãos a vossa cruz"],"authors":["Manuel Faria"],"associations":[{"date":"2026-03-22","part":"comunhao","moment":"Comunhão","celebration":"DOMINGO V DA QUARESMA","cycle":""}]},"Hossana tu reinarás":{"source":"Programas 2026.xlsx","variants":["Hossana tu reinarás"],"authors":[],"associations":[{"date":"2026-03-22","part":"final","moment":"Final","celebration":"DOMINGO V DA QUARESMA","cycle":""}]},"Glória a Vós, Cristo":{"source":"Programas 2026.xlsx","variants":["Glória a Vós, Cristo"],"authors":["F. Santos"],"associations":[{"date":"2026-03-29","part":"aclamacao","moment":"Aclamação","celebration":"DOMINGO DE RAMOS NA PAIXÃO DO SENHOR","cycle":""}]},"Bendita Seja a Paixão":{"source":"Programas 2026.xlsx","variants":["Bendita Seja a Paixão"],"authors":["M. Faria"],"associations":[{"date":"2026-03-29","part":"ofertorio","moment":"Ofertório","celebration":"DOMINGO DE RAMOS NA PAIXÃO DO SENHOR","cycle":""}]},"Pai se este cálice":{"source":"Programas 2026.xlsx","variants":["Pai se este cálice"],"authors":["F. Santos"],"associations":[{"date":"2026-03-29","part":"comunhao","moment":"Comunhão","celebration":"DOMINGO DE RAMOS NA PAIXÃO DO SENHOR","cycle":""}]},"Salvé ó Cruz":{"source":"Programas 2026.xlsx","variants":["Salvé ó Cruz"],"authors":["M.Faria"],"associations":[{"date":"2026-03-29","part":"final","moment":"Final","celebration":"DOMINGO DE RAMOS NA PAIXÃO DO SENHOR","cycle":""}]},"O Senhor ressuscitou verdadeiramente":{"source":"Programas 2026.xlsx","variants":["O Senhor ressuscitou verdadeiramente"],"authors":["A. Cartageno"],"associations":[{"date":"2026-04-05","part":"entrada","moment":"Entrada","celebration":"DOMINGO DE PÁSCOA DA RESSURREIÇÃO DO SENHOR","cycle":""}]},"Glória a Deus":{"source":"Programas 2026.xlsx","variants":["Glória a Deus"],"authors":["A. Cartageno","Az. Oliveira"],"associations":[{"date":"2026-04-05","part":"gloria","moment":"Glória","celebration":"DOMINGO DE PÁSCOA DA RESSURREIÇÃO DO SENHOR","cycle":""},{"date":"2026-06-24","part":"gloria","moment":"Glória","celebration":"NASCIMENTO DE SÃO JOÃO BATISTA – SOLENIDADE","cycle":""}]},"Eis o dia que o Senhor fez":{"source":"Programas 2026.xlsx","variants":["Eis o dia que o Senhor fez"],"authors":["B. Ferreira"],"associations":[{"date":"2026-04-05","part":"salmo","moment":"Salmo","celebration":"DOMINGO DE PÁSCOA DA RESSURREIÇÃO DO SENHOR","cycle":""}]},"Já luz se levantou":{"source":"Programas 2026.xlsx","variants":["Já luz se levantou"],"authors":["A. Cartageno"],"associations":[{"date":"2026-04-05","part":"ofertorio","moment":"Ofertório","celebration":"DOMINGO DE PÁSCOA DA RESSURREIÇÃO DO SENHOR","cycle":""}]},"Cordeiro de Deus V":{"source":"Programas 2026.xlsx","variants":["Cordeiro de Deus V"],"authors":["F.Silva","M. Simões"],"associations":[{"date":"2026-04-05","part":"cordeiro","moment":"Cordeiro de Deus","celebration":"DOMINGO DE PÁSCOA DA RESSURREIÇÃO DO SENHOR","cycle":""},{"date":"2026-05-31","part":"cordeiro","moment":"Cordeiro de Deus","celebration":"DOMINGO IX DO TEMPO COMUM\nSANTÍSSIMA TRINDADE","cycle":""}]},"Cristo nosso cordeiro Pascal":{"source":"Programas 2026.xlsx","variants":["Cristo nosso cordeiro Pascal"],"authors":["C. Silva"],"associations":[{"date":"2026-04-05","part":"comunhao","moment":"Comunhão","celebration":"DOMINGO DE PÁSCOA DA RESSURREIÇÃO DO SENHOR","cycle":""}]},"Ó Páscoa gloriosa":{"source":"Programas 2026.xlsx","variants":["Ó Páscoa gloriosa"],"authors":["F. Santos"],"associations":[{"date":"2026-04-05","part":"final","moment":"Final","celebration":"DOMINGO DE PÁSCOA DA RESSURREIÇÃO DO SENHOR","cycle":""}]},"Exultai de alegria, cantai hinos":{"source":"Programas 2026.xlsx","variants":["Exultai de alegria, cantai hinos"],"authors":["F. Silva"],"associations":[{"date":"2026-04-12","part":"entrada","moment":"Entrada","celebration":"DOMINGO II DA PÁSCOA ou da Divina Misericórdia","cycle":""}]},"Aclamai o Senhor, porque Ele é bom":{"source":"Programas 2026.xlsx","variants":["Aclamai o Senhor, porque Ele é bom"],"authors":["M.Luis"],"associations":[{"date":"2026-04-12","part":"salmo","moment":"Salmo","celebration":"DOMINGO II DA PÁSCOA ou da Divina Misericórdia","cycle":""}]},"O Hino da Alegria":{"source":"Programas 2026.xlsx","variants":["O Hino da Alegria"],"authors":["M. Faria"],"associations":[{"date":"2026-04-12","part":"ofertorio","moment":"Ofertório","celebration":"DOMINGO II DA PÁSCOA ou da Divina Misericórdia","cycle":""}]},"Aproxima a tua mão":{"source":"Programas 2026.xlsx","variants":["Aproxima a tua mão"],"authors":["F. santos"],"associations":[{"date":"2026-04-12","part":"comunhao","moment":"Comunhão","celebration":"DOMINGO II DA PÁSCOA ou da Divina Misericórdia","cycle":""}]},"Na sua dor":{"source":"Programas 2026.xlsx","variants":["Na Sua dor","Na sua dor"],"authors":["A. Cartageno"],"associations":[{"date":"2026-04-12","part":"final","moment":"Final","celebration":"DOMINGO II DA PÁSCOA ou da Divina Misericórdia","cycle":""},{"date":"2026-04-19","part":"final","moment":"Final","celebration":"DOMINGO III DA PÁSCOA","cycle":""}]},"Cristo ressuscitou":{"source":"Programas 2026.xlsx","variants":["Cristo ressuscitou"],"authors":["C. Gabarain"],"associations":[{"date":"2026-04-19","part":"entrada","moment":"Entrada","celebration":"DOMINGO III DA PÁSCOA","cycle":""}]},"Mostrai-me, Senhor, o caminho da vida":{"source":"Programas 2026.xlsx","variants":["Mostrai-me, Senhor, o caminho da vida"],"authors":["M.Luis"],"associations":[{"date":"2026-04-19","part":"salmo","moment":"Salmo","celebration":"DOMINGO III DA PÁSCOA","cycle":""}]},"Ficai conosco Senhor":{"source":"Programas 2026.xlsx","variants":["Ficai conosco Senhor"],"authors":["M. Borda"],"associations":[{"date":"2026-04-19","part":"ofertorio","moment":"Ofertório","celebration":"DOMINGO III DA PÁSCOA","cycle":""}]},"Os discipulos reconheceram":{"source":"Programas 2026.xlsx","variants":["Os discipulos reconheceram"],"authors":["F. Silva"],"associations":[{"date":"2026-04-19","part":"comunhao","moment":"Comunhão","celebration":"DOMINGO III DA PÁSCOA","cycle":""}]},"A bondade do Senhor":{"source":"Programas 2026.xlsx","variants":["A bondade do Senhor"],"authors":["A. Cartageno"],"associations":[{"date":"2026-04-26","part":"entrada","moment":"Entrada","celebration":"DOMINGO IV DA PÁSCOA","cycle":""}]},"O Senhor é meu pastor nada me faltará.":{"source":"Programas 2026.xlsx","variants":["O Senhor é meu pastor nada me faltará."],"authors":["M. Luis"],"associations":[{"date":"2026-04-26","part":"salmo","moment":"Salmo","celebration":"DOMINGO IV DA PÁSCOA","cycle":""}]},"O Senhor é meu pastor nada me falta":{"source":"Programas 2026.xlsx","variants":["O Senhor é meu pastor nada me falta"],"authors":["F. Santos"],"associations":[{"date":"2026-04-26","part":"ofertorio","moment":"Ofertório","celebration":"DOMINGO IV DA PÁSCOA","cycle":""}]},"Ressuscitou o Bom Pastor":{"source":"Programas 2026.xlsx","variants":["Ressuscitou o Bom Pastor"],"authors":["M. Luis"],"associations":[{"date":"2026-04-26","part":"comunhao","moment":"Comunhão","celebration":"DOMINGO IV DA PÁSCOA","cycle":""}]},"Vencida foi a morte":{"source":"Programas 2026.xlsx","variants":["Vencida foi a morte"],"authors":["J.S. Bach"],"associations":[{"date":"2026-04-26","part":"final","moment":"Final","celebration":"DOMINGO IV DA PÁSCOA","cycle":""}]},"Cantai ao Senhor um cântico novo I":{"source":"Programas 2026.xlsx","variants":["Cantai ao Senhor um cântico novo I"],"authors":["F. Silva"],"associations":[{"date":"2026-05-03","part":"entrada","moment":"Entrada","celebration":"DOMINGO V DA PÁSCOA Dia da Mãe","cycle":""}]},"Minha Senhora e minha mãe":{"source":"Programas 2026.xlsx","variants":["Minha Senhora e minha mãe"],"authors":["H. Faria"],"associations":[{"date":"2026-05-03","part":"ofertorio","moment":"Ofertório","celebration":"DOMINGO V DA PÁSCOA Dia da Mãe","cycle":""}]},"Eu sou a verdadeira vide":{"source":"Programas 2026.xlsx","variants":["Eu sou a verdadeira vide"],"authors":["C. Silva"],"associations":[{"date":"2026-05-03","part":"comunhao","moment":"Comunhão","celebration":"DOMINGO V DA PÁSCOA Dia da Mãe","cycle":""}]},"Alegrai-vos mãe de Jesus":{"source":"Programas 2026.xlsx","variants":["Alegrai-vos mãe de Jesus"],"authors":["A. Cartageno"],"associations":[{"date":"2026-05-03","part":"final","moment":"Final","celebration":"DOMINGO V DA PÁSCOA Dia da Mãe","cycle":""},{"date":"2026-05-10","part":"final","moment":"Final","celebration":"DOMINGO VI DA PÁSCOA","cycle":""}]},"Anunciai com voz de júbilo":{"source":"Programas 2026.xlsx","variants":["Anunciai com voz de júbilo"],"authors":["Az.Oliveira"],"associations":[{"date":"2026-05-10","part":"entrada","moment":"Entrada","celebration":"DOMINGO VI DA PÁSCOA","cycle":""}]},"A terra inteira aclame o Senhor":{"source":"Programas 2026.xlsx","variants":["A terra inteira aclame o Senhor"],"authors":["M.Luis"],"associations":[{"date":"2026-05-10","part":"salmo","moment":"Salmo","celebration":"DOMINGO VI DA PÁSCOA","cycle":""}]},"Se vos amardes uns aos outros":{"source":"Programas 2026.xlsx","variants":["Se vos amardes uns aos outros"],"authors":["F. Silva"],"associations":[{"date":"2026-05-10","part":"ofertorio","moment":"Ofertório","celebration":"DOMINGO VI DA PÁSCOA","cycle":""},{"date":"2026-09-13","part":"comunhao","moment":"Comunhão","celebration":"DOMINGO XXIV DO TEMPO COMUM","cycle":""}]},"Vós sereis meus amigos":{"source":"Programas 2026.xlsx","variants":["Vós sereis meus amigos"],"authors":["M. Luis","M.Luis"],"associations":[{"date":"2026-05-10","part":"comunhao","moment":"Comunhão","celebration":"DOMINGO VI DA PÁSCOA","cycle":""},{"date":"2026-09-27","part":"comunhao","moment":"Comunhão","celebration":"DOMINGO XXVI DO TEMPO COMUM","cycle":""}]},"Homens da Galileia":{"source":"Programas 2026.xlsx","variants":["Homens da Galileia"],"authors":["M.Luis"],"associations":[{"date":"2026-05-17","part":"entrada","moment":"Entrada","celebration":"DOMINGO VII DA PÁSCOA\nASCENSÃO DO SENHOR","cycle":""}]},"Ergue-se Deus o Senhor":{"source":"Programas 2026.xlsx","variants":["Ergue-se Deus o Senhor"],"authors":["M.Luis"],"associations":[{"date":"2026-05-17","part":"salmo","moment":"Salmo","celebration":"DOMINGO VII DA PÁSCOA\nASCENSÃO DO SENHOR","cycle":""}]},"Aclamai Jesus Cristo":{"source":"Programas 2026.xlsx","variants":["Aclamai Jesus Cristo"],"authors":["F. Silva"],"associations":[{"date":"2026-05-17","part":"ofertorio","moment":"Ofertório","celebration":"DOMINGO VII DA PÁSCOA\nASCENSÃO DO SENHOR","cycle":""}]},"Santo II":{"source":"Programas 2026.xlsx","variants":["Santo II"],"authors":["A. Cartageno","F. Silva"],"associations":[{"date":"2026-05-17","part":"santo","moment":"Santo","celebration":"DOMINGO VII DA PÁSCOA\nASCENSÃO DO SENHOR","cycle":""},{"date":"2026-09-13","part":"santo","moment":"Santo","celebration":"DOMINGO XXIV DO TEMPO COMUM","cycle":""}]},"Eu estou sempre convosco":{"source":"Programas 2026.xlsx","variants":["Eu estou sempre convosco"],"authors":["C. Silva"],"associations":[{"date":"2026-05-17","part":"comunhao","moment":"Comunhão","celebration":"DOMINGO VII DA PÁSCOA\nASCENSÃO DO SENHOR","cycle":""}]},"Ide por todo o mundo e proclami":{"source":"Programas 2026.xlsx","variants":["Ide por todo o mundo e proclami"],"authors":["J.Santos"],"associations":[{"date":"2026-05-17","part":"final","moment":"Final","celebration":"DOMINGO VII DA PÁSCOA\nASCENSÃO DO SENHOR","cycle":""}]},"O Espírito do Senhor":{"source":"Programas 2026.xlsx","variants":["O Espírito do Senhor"],"authors":["M.Luis"],"associations":[{"date":"2026-05-24","part":"entrada","moment":"Entrada","celebration":"DOMINGO DE PENTECOSTES","cycle":""}]},"Mandai, Senhor, o vosso Espírito":{"source":"Programas 2026.xlsx","variants":["Mandai, Senhor, o vosso Espírito"],"authors":["M. Luis"],"associations":[{"date":"2026-05-24","part":"salmo","moment":"Salmo","celebration":"DOMINGO DE PENTECOSTES","cycle":""}]},"Vinde, ó santo Espírito":{"source":"Programas 2026.xlsx","variants":["Vinde, ó santo Espírito"],"authors":["M.Faria"],"associations":[{"date":"2026-05-24","part":"sequencia","moment":"Sequência","celebration":"DOMINGO DE PENTECOSTES","cycle":""}]},"O Espirito de Deus repousou sobre mim":{"source":"Programas 2026.xlsx","variants":["O Espirito de Deus repousou sobre mim"],"authors":["Az. Oliveira"],"associations":[{"date":"2026-05-24","part":"ofertorio","moment":"Ofertório","celebration":"DOMINGO DE PENTECOSTES","cycle":""},{"date":"2026-06-20","part":"confirmacao","moment":"Confirmação","celebration":"Sacramento da Confirmação  Vesp XII TC","cycle":""}]},"Vinde espirito divino":{"source":"Programas 2026.xlsx","variants":["Vinde espirito divino"],"authors":["M. Borda"],"associations":[{"date":"2026-05-24","part":"comunhao","moment":"Comunhão","celebration":"DOMINGO DE PENTECOSTES","cycle":""}]},"Ide por todo o mundo proclamai":{"source":"Programas 2026.xlsx","variants":["Ide por todo o mundo proclamai"],"authors":["J.Santos"],"associations":[{"date":"2026-05-24","part":"final","moment":"Final","celebration":"DOMINGO DE PENTECOSTES","cycle":""}]},"Pai, Filho, Espírito Santo":{"source":"Programas 2026.xlsx","variants":["Pai, Filho, Espírito Santo"],"authors":["A. Cartageno"],"associations":[{"date":"2026-05-31","part":"entrada","moment":"Entrada","celebration":"DOMINGO IX DO TEMPO COMUM\nSANTÍSSIMA TRINDADE","cycle":""}]},"Digno de louvor e de glória":{"source":"Programas 2026.xlsx","variants":["Digno de louvor e de glória"],"authors":["M.Luis"],"associations":[{"date":"2026-05-31","part":"salmo","moment":"Salmo","celebration":"DOMINGO IX DO TEMPO COMUM\nSANTÍSSIMA TRINDADE","cycle":""}]},"Ao Senhor do universo":{"source":"Programas 2026.xlsx","variants":["Ao Senhor do universo"],"authors":["F. Silva"],"associations":[{"date":"2026-05-31","part":"ofertorio","moment":"Ofertório","celebration":"DOMINGO IX DO TEMPO COMUM\nSANTÍSSIMA TRINDADE","cycle":""}]},"Porque somos filhos de Deus":{"source":"Programas 2026.xlsx","variants":["Porque somos filhos de Deus"],"authors":["A. Cartageno"],"associations":[{"date":"2026-05-31","part":"comunhao","moment":"Comunhão","celebration":"DOMINGO IX DO TEMPO COMUM\nSANTÍSSIMA TRINDADE","cycle":""}]},"Por Cristo e em Cristo":{"source":"Programas 2026.xlsx","variants":["Por Cristo e em Cristo"],"authors":["M. Faria"],"associations":[{"date":"2026-05-31","part":"final","moment":"Final","celebration":"DOMINGO IX DO TEMPO COMUM\nSANTÍSSIMA TRINDADE","cycle":""}]},"Senhora, nós vos louvamos":{"source":"Programas 2026.xlsx","variants":["Senhora, nós vos louvamos"],"authors":["M.Faria"],"associations":[{"date":"2026-05-13","part":"entrada","moment":"Entrada","celebration":"Nossa Senhora do Rosário de Fátima","cycle":""}]},"Escuta e inclina-te":{"source":"Programas 2026.xlsx","variants":["Escuta e inclina-te"],"authors":["Az. Oliveira"],"associations":[{"date":"2026-05-13","part":"salmo","moment":"Salmo","celebration":"Nossa Senhora do Rosário de Fátima","cycle":""}]},"Aleluia I":{"source":"Programas 2026.xlsx","variants":["Aleluia I"],"authors":["Az. Oliveira"],"associations":[{"date":"2026-05-13","part":"aclamacao","moment":"Aclamação","celebration":"Nossa Senhora do Rosário de Fátima","cycle":""},{"date":"2026-09-13","part":"aclamacao","moment":"Aclamação","celebration":"DOMINGO XXIV DO TEMPO COMUM","cycle":""}]},"Senhora do manto lindo":{"source":"Programas 2026.xlsx","variants":["Senhora do manto lindo"],"authors":["H. Faria"],"associations":[{"date":"2026-05-13","part":"ofertorio","moment":"Ofertório","celebration":"Nossa Senhora do Rosário de Fátima","cycle":""}]},"Nossa Senhora de Fátima":{"source":"Programas 2026.xlsx","variants":["Nossa Senhora de Fátima"],"authors":["A. Cartageno"],"associations":[{"date":"2026-05-13","part":"comunhao","moment":"Comunhão","celebration":"Nossa Senhora do Rosário de Fátima","cycle":""}]},"Ave de Fátima":{"source":"Programas 2026.xlsx","variants":["Ave de Fátima"],"authors":[],"associations":[{"date":"2026-05-13","part":"final","moment":"Final","celebration":"Nossa Senhora do Rosário de Fátima","cycle":""}]},"Bendizemos o teu nome":{"source":"Programas 2026.xlsx","variants":["Bendizemos o teu nome"],"authors":[],"associations":[{"date":"2026-05-12","part":"entrada","moment":"Entrada","celebration":"véspera Nossa Senhora do Rosário de Fátima","cycle":""}]},"Avé Maria":{"source":"Programas 2026.xlsx","variants":["Avé Maria"],"authors":["M. Silva"],"associations":[{"date":"2026-05-12","part":"ofertorio","moment":"Ofertório","celebration":"véspera Nossa Senhora do Rosário de Fátima","cycle":""}]},"Tu és o sol":{"source":"Programas 2026.xlsx","variants":["Tu és o sol"],"authors":[],"associations":[{"date":"2026-05-12","part":"comunhao","moment":"Comunhão","celebration":"véspera Nossa Senhora do Rosário de Fátima","cycle":""}]},"Senhora um dia desceste":{"source":"Programas 2026.xlsx","variants":["Senhora um dia desceste"],"authors":[],"associations":[{"date":"2026-05-12","part":"final","moment":"Final","celebration":"véspera Nossa Senhora do Rosário de Fátima","cycle":""}]},"Não me abandoneis, Senhor":{"source":"Programas 2026.xlsx","variants":["Não me abandoneis, Senhor"],"authors":["Az. Oliveira"],"associations":[{"date":"2026-06-14","part":"entrada","moment":"Entrada","celebration":"DOMINGO XI DO TEMPO COMUM","cycle":""}]},"Vimos trazer senhor ao vosso altar":{"source":"Programas 2026.xlsx","variants":["Vimos trazer senhor ao vosso altar"],"authors":["M. Faria"],"associations":[{"date":"2026-06-14","part":"ofertorio","moment":"Ofertório","celebration":"DOMINGO XI DO TEMPO COMUM","cycle":""}]},"Não foste vós que me escolheste":{"source":"Programas 2026.xlsx","variants":["Não foste vós que me escolheste"],"authors":["Az. Oliveira"],"associations":[{"date":"2026-06-14","part":"comunhao","moment":"Comunhão","celebration":"DOMINGO XI DO TEMPO COMUM","cycle":""}]},"Ide por todo o mundo":{"source":"Programas 2026.xlsx","variants":["Ide por todo o mundo"],"authors":["M.Faria"],"associations":[{"date":"2026-06-14","part":"final","moment":"Final","celebration":"DOMINGO XI DO TEMPO COMUM","cycle":""},{"date":"2026-09-27","part":"final","moment":"Final","celebration":"DOMINGO XXVI DO TEMPO COMUM","cycle":""}]},"Deus vive na sua morada santa":{"source":"Programas 2026.xlsx","variants":["Deus vive na Sua morada Santa","Deus vive na sua morada santa"],"authors":["F. Santos"],"associations":[{"date":"2026-06-20","part":"texto","moment":"","celebration":"Sacramento da Confirmação  Vesp XII TC","cycle":""},{"date":"2026-06-21","part":"entrada","moment":"Entrada","celebration":"DOMINGO XII DO TEMPO COMUM","cycle":""}]},"Pela vossa grande misericórdia":{"source":"Programas 2026.xlsx","variants":["Pela vossa grande misericórdia"],"authors":["M.Luis"],"associations":[{"date":"2026-06-20","part":"salmo","moment":"Salmo","celebration":"Sacramento da Confirmação  Vesp XII TC","cycle":""},{"date":"2026-06-21","part":"salmo","moment":"Salmo","celebration":"DOMINGO XII DO TEMPO COMUM","cycle":""}]},"Meu Deus na simplicidade":{"source":"Programas 2026.xlsx","variants":["Meu Deus na Simplicidade","Meu Deus na simplicidade"],"authors":["Az. Oliveira"],"associations":[{"date":"2026-06-21","part":"ofertorio","moment":"Ofertório","celebration":"DOMINGO XII DO TEMPO COMUM","cycle":""},{"date":"2026-08-23","part":"ofertorio","moment":"Ofertório","celebration":"DOMINGO XXI DO TEMPO COMUM","cycle":""}]},"O Corpo de Jesus é alimento":{"source":"Programas 2026.xlsx","variants":["O Corpo de Jesus é alimento"],"authors":["A. Cartageno"],"associations":[{"date":"2026-06-20","part":"comunhao","moment":"Comunhão","celebration":"Sacramento da Confirmação  Vesp XII TC","cycle":""},{"date":"2026-06-21","part":"comunhao","moment":"Comunhão","celebration":"DOMINGO XII DO TEMPO COMUM","cycle":""}]},"Não vou só":{"source":"Programas 2026.xlsx","variants":["Não vou só"],"authors":["M. Carneiro"],"associations":[{"date":"2026-06-20","part":"texto","moment":"","celebration":"Sacramento da Confirmação  Vesp XII TC","cycle":""},{"date":"2026-06-21","part":"final","moment":"Final","celebration":"DOMINGO XII DO TEMPO COMUM","cycle":""}]},"Louvai louvai o Senhor":{"source":"Programas 2026.xlsx","variants":["Louvai louvai o Senhor"],"authors":["F. Silva"],"associations":[{"date":"2026-06-28","part":"entrada","moment":"Entrada","celebration":"DOMINGO XIII DO TEMPO COMUM","cycle":""}]},"Cantarei eternamente as misericórdias do Senhor.":{"source":"Programas 2026.xlsx","variants":["Cantarei eternamente as misericórdias do Senhor."],"authors":["M. Luis"],"associations":[{"date":"2026-06-28","part":"salmo","moment":"Salmo","celebration":"DOMINGO XIII DO TEMPO COMUM","cycle":""}]},"Na hóstia sobre a patena":{"source":"Programas 2026.xlsx","variants":["Na hóstia sobre a patena"],"authors":["B. Salgado"],"associations":[{"date":"2026-06-28","part":"ofertorio","moment":"Ofertório","celebration":"DOMINGO XIII DO TEMPO COMUM","cycle":""}]},"Se alguém quiser seguir-me":{"source":"Programas 2026.xlsx","variants":["Se alguem quiser seguir-me","Se alguém quiser seguir-me"],"authors":["C. Silva","C. Siva"],"associations":[{"date":"2026-06-28","part":"comunhao","moment":"Comunhão","celebration":"DOMINGO XIII DO TEMPO COMUM","cycle":""},{"date":"2026-08-30","part":"comunhao","moment":"Comunhão","celebration":"DOMINGO XXII DO TEMPO COMUM","cycle":""}]},"Povo teu somos ó Senhor":{"source":"Programas 2026.xlsx","variants":["Povo teu somos ó Senhor"],"authors":[],"associations":[{"date":"2026-06-28","part":"final","moment":"Final","celebration":"DOMINGO XIII DO TEMPO COMUM","cycle":""}]},"Apareceu um homem":{"source":"Programas 2026.xlsx","variants":["Apareceu um homem"],"authors":["A. Cartageno"],"associations":[{"date":"2026-06-24","part":"entrada","moment":"Entrada","celebration":"NASCIMENTO DE SÃO JOÃO BATISTA – SOLENIDADE","cycle":""}]},"Eu Vos dou graças, Senhor":{"source":"Programas 2026.xlsx","variants":["Eu Vos dou graças, Senhor"],"authors":["F. Santos"],"associations":[{"date":"2026-06-24","part":"salmo","moment":"Salmo","celebration":"NASCIMENTO DE SÃO JOÃO BATISTA – SOLENIDADE","cycle":""}]},"Eis os homens santos":{"source":"Programas 2026.xlsx","variants":["Eis os homens santos"],"authors":["Az. Oliveira"],"associations":[{"date":"2026-06-24","part":"ofertorio","moment":"Ofertório","celebration":"NASCIMENTO DE SÃO JOÃO BATISTA – SOLENIDADE","cycle":""},{"date":"2026-07-26","part":"saidaProcessao","moment":"Saída procissão","celebration":"DOMINGO XVII DO TEMPO COMUM","cycle":""}]},"Agnus Dei":{"source":"Programas 2026.xlsx","variants":["Agnus Dei"],"authors":["H. Botor"],"associations":[{"date":"2026-06-20","part":"cordeiro","moment":"Cordeiro de Deus","celebration":"Sacramento da Confirmação  Vesp XII TC","cycle":""},{"date":"2026-06-24","part":"cordeiro","moment":"Cordeiro de Deus","celebration":"NASCIMENTO DE SÃO JOÃO BATISTA – SOLENIDADE","cycle":""}]},"Quero amar-Te meu Jesus":{"source":"Programas 2026.xlsx","variants":["Quero amar-Te meu Jesus"],"authors":["H. Faria"],"associations":[{"date":"2026-06-24","part":"comunhao","moment":"Comunhão","celebration":"NASCIMENTO DE SÃO JOÃO BATISTA – SOLENIDADE","cycle":""}]},"S. João precussor":{"source":"Programas 2026.xlsx","variants":["S. João precussor"],"authors":["A. Costa Gomes"],"associations":[{"date":"2026-06-24","part":"final","moment":"Final","celebration":"NASCIMENTO DE SÃO JOÃO BATISTA – SOLENIDADE","cycle":""}]},"Bendito o que Deus nos envia":{"source":"Programas 2026.xlsx","variants":["Bendito o que Deus nos envia"],"authors":["P.Alaio"],"associations":[{"date":"2026-06-20","part":"entrada","moment":"Entrada","celebration":"Sacramento da Confirmação  Vesp XII TC","cycle":""}]},"Vós que fostes batizados":{"source":"Programas 2026.xlsx","variants":["Vós que fostes batizados"],"authors":["F. Santos"],"associations":[{"date":"2026-06-20","part":"aspersao","moment":"Aspersão","celebration":"Sacramento da Confirmação  Vesp XII TC","cycle":""}]},"Deixamos aqui Senhor":{"source":"Programas 2026.xlsx","variants":["Deixamos aqui Senhor"],"authors":["A. Cartageno"],"associations":[{"date":"2026-06-20","part":"ofertorio","moment":"Ofertório","celebration":"Sacramento da Confirmação  Vesp XII TC","cycle":""}]},"Sanctus":{"source":"Programas 2026.xlsx","variants":["Sanctus"],"authors":["H. Botor"],"associations":[{"date":"2026-06-20","part":"santo","moment":"Santo","celebration":"Sacramento da Confirmação  Vesp XII TC","cycle":""}]},"Pai Nosso":{"source":"Programas 2026.xlsx","variants":["Pai Nosso"],"authors":["Melodia oficial"],"associations":[{"date":"2026-06-20","part":"paiNosso","moment":"Pai Nosso","celebration":"Sacramento da Confirmação  Vesp XII TC","cycle":""}]},"Laudate Dominum":{"source":"Programas 2026.xlsx","variants":["Laudate Dominum"],"authors":["Taize"],"associations":[{"date":"2026-06-20","part":"acaoGracas","moment":"Acção de Graças","celebration":"Sacramento da Confirmação  Vesp XII TC","cycle":""}]},"Hino das JMJ 2023":{"source":"Programas 2026.xlsx","variants":["Hino das JMJ 2023"],"authors":[],"associations":[{"date":"2026-06-20","part":"final","moment":"Final","celebration":"Sacramento da Confirmação  Vesp XII TC","cycle":""}]},"Cantai ao Senhor um cântico novo":{"source":"Programas 2026.xlsx","variants":["Cantai ao Senhor um cântico novo"],"authors":["F. Silva"],"associations":[{"date":"2026-07-05","part":"entrada","moment":"Entrada","celebration":"DOMINGO XIV DO TEMPO COMUM","cycle":""}]},"Apresentamos Senhor os frutos":{"source":"Programas 2026.xlsx","variants":["Apresentamos Senhor os frutos"],"authors":["H. Faria"],"associations":[{"date":"2026-07-05","part":"ofertorio","moment":"Ofertório","celebration":"DOMINGO XIV DO TEMPO COMUM","cycle":""}]},"Eu Sou o Pão vivo":{"source":"Programas 2026.xlsx","variants":["Eu Sou o Pão vivo"],"authors":["C. Silva"],"associations":[{"date":"2026-07-05","part":"comunhao","moment":"Comunhão","celebration":"DOMINGO XIV DO TEMPO COMUM","cycle":""},{"date":"2026-08-16","part":"comunhao","moment":"Comunhão","celebration":"DOMINGO XX DO TEMPO COMUM","cycle":""}]},"A messe é grande":{"source":"Programas 2026.xlsx","variants":["A messe é grande"],"authors":["C. Silva"],"associations":[{"date":"2026-07-05","part":"final","moment":"Final","celebration":"DOMINGO XIV DO TEMPO COMUM","cycle":""}]},"Eu venho, Senhor, à vossa presença":{"source":"Programas 2026.xlsx","variants":["Eu venho, Senhor, à vossa presença"],"authors":["A. Cartageno"],"associations":[{"date":"2026-07-12","part":"entrada","moment":"Entrada","celebration":"DOMINGO XV DO TEMPO COMUM","cycle":""}]},"A semente caiu em boa terra e deu muito fruto.":{"source":"Programas 2026.xlsx","variants":["A semente caiu em boa terra e deu muito fruto."],"authors":["M.Luis"],"associations":[{"date":"2026-07-12","part":"salmo","moment":"Salmo","celebration":"DOMINGO XV DO TEMPO COMUM","cycle":""}]},"Apresentamos Senhor":{"source":"Programas 2026.xlsx","variants":["Apresentamos Senhor"],"authors":["H. Faria"],"associations":[{"date":"2026-07-12","part":"ofertorio","moment":"Ofertório","celebration":"DOMINGO XV DO TEMPO COMUM","cycle":""}]},"Quem comer deste pão":{"source":"Programas 2026.xlsx","variants":["Quem comer deste pão"],"authors":["C. Silva"],"associations":[{"date":"2026-07-12","part":"comunhao","moment":"Comunhão","celebration":"DOMINGO XV DO TEMPO COMUM","cycle":""}]},"Caminhamos para o vosso altar":{"source":"Programas 2026.xlsx","variants":["Caminhamos para o vosso altar"],"authors":["M. Luis"],"associations":[{"date":"2026-07-19","part":"entrada","moment":"Entrada","celebration":"DOMINGO XVI DO TEMPO COMUM","cycle":""}]},"Senhor, sois um Deus clemente e compassivo.":{"source":"Programas 2026.xlsx","variants":["Senhor, sois um Deus clemente e compassivo."],"authors":["M.Luis"],"associations":[{"date":"2026-07-19","part":"salmo","moment":"Salmo","celebration":"DOMINGO XVI DO TEMPO COMUM","cycle":""}]},"Pobres e fracos que somos":{"source":"Programas 2026.xlsx","variants":["Pobres e fracos que somos"],"authors":["A. Cartageno"],"associations":[{"date":"2026-07-19","part":"ofertorio","moment":"Ofertório","celebration":"DOMINGO XVI DO TEMPO COMUM","cycle":""}]},"Eu estou à porta e chamo":{"source":"Programas 2026.xlsx","variants":["Eu estou à porta e chamo"],"authors":["F. Silva"],"associations":[{"date":"2026-07-19","part":"comunhao","moment":"Comunhão","celebration":"DOMINGO XVI DO TEMPO COMUM","cycle":""}]},"Anunciaremos teu reino Senhor":{"source":"Programas 2026.xlsx","variants":["Anunciaremos teu reino Senhor"],"authors":[],"associations":[{"date":"2026-07-19","part":"final","moment":"Final","celebration":"DOMINGO XVI DO TEMPO COMUM","cycle":""}]},"Vinde á presnça de Deus":{"source":"Programas 2026.xlsx","variants":["Vinde á presnça de Deus"],"authors":["M. Carneiro"],"associations":[{"date":"2026-07-26","part":"entrada","moment":"Entrada","celebration":"DOMINGO XVII DO TEMPO COMUM","cycle":""}]},"Quanto amo, Senhor, a vossa lei!":{"source":"Programas 2026.xlsx","variants":["Quanto amo, Senhor, a vossa lei!"],"authors":["F. Santos"],"associations":[{"date":"2026-07-26","part":"salmo","moment":"Salmo","celebration":"DOMINGO XVII DO TEMPO COMUM","cycle":""}]},"Levamos para o vosso altar":{"source":"Programas 2026.xlsx","variants":["Levamos para o vosso altar"],"authors":[],"associations":[{"date":"2026-07-26","part":"ofertorio","moment":"Ofertório","celebration":"DOMINGO XVII DO TEMPO COMUM","cycle":""}]},"Bendiz minha alma o Senhor":{"source":"Programas 2026.xlsx","variants":["Bendiz minha alma o Senhor"],"authors":["M. Carneiro"],"associations":[{"date":"2026-07-26","part":"comunhao","moment":"Comunhão","celebration":"DOMINGO XVII DO TEMPO COMUM","cycle":""}]},"Com hinos preces e cantos":{"source":"Programas 2026.xlsx","variants":["Com hinos preces e cantos"],"authors":["A. Cartageno"],"associations":[{"date":"2026-07-26","part":"final","moment":"Final","celebration":"DOMINGO XVII DO TEMPO COMUM","cycle":""}]},"Deus vinde em meu auxilo":{"source":"Programas 2026.xlsx","variants":["Deus vinde em meu auxilo"],"authors":["F. Silva"],"associations":[{"date":"2026-08-02","part":"entrada","moment":"Entrada","celebration":"DOMINGO XVIII DO TEMPO COMUM","cycle":""}]},"Vós abris Senhor a Vossa mão":{"source":"Programas 2026.xlsx","variants":["Vós abris Senhor a Vossa mão"],"authors":["M.Luis"],"associations":[{"date":"2026-08-02","part":"salmo","moment":"Salmo","celebration":"DOMINGO XVIII DO TEMPO COMUM","cycle":""}]},"Tomai e recebei":{"source":"Programas 2026.xlsx","variants":["Tomai e recebei"],"authors":["H. Faria"],"associations":[{"date":"2026-08-02","part":"ofertorio","moment":"Ofertório","celebration":"DOMINGO XVIII DO TEMPO COMUM","cycle":""}]},"Eu sou o pão da vida":{"source":"Programas 2026.xlsx","variants":["Eu sou o pão da vida"],"authors":["B. Sousa"],"associations":[{"date":"2026-08-02","part":"comunhao","moment":"Comunhão","celebration":"DOMINGO XVIII DO TEMPO COMUM","cycle":""}]},"Cantai comigo":{"source":"Programas 2026.xlsx","variants":["Cantai comigo"],"authors":["H. Faria"],"associations":[{"date":"2026-08-02","part":"final","moment":"Final","celebration":"DOMINGO XVIII DO TEMPO COMUM","cycle":""}]},"Nós somos as pedras vivas":{"source":"Programas 2026.xlsx","variants":["Nós somos as pedras vivas"],"authors":["F. Santos"],"associations":[{"date":"2026-08-09","part":"entrada","moment":"Entrada","celebration":"DOMINGO XIX DO TEMPO COMUM","cycle":""}]},"Mostrai-nos o vosso amor":{"source":"Programas 2026.xlsx","variants":["Mostrai-nos o vosso amor"],"authors":["M.Luis"],"associations":[{"date":"2026-08-09","part":"salmo","moment":"Salmo","celebration":"DOMINGO XIX DO TEMPO COMUM","cycle":""}]},"Cremos em Vós ó Deus":{"source":"Programas 2026.xlsx","variants":["Cremos em Vós ó Deus"],"authors":["L. Mason"],"associations":[{"date":"2026-08-09","part":"ofertorio","moment":"Ofertório","celebration":"DOMINGO XIX DO TEMPO COMUM","cycle":""}]},"Senhor eu creio que sois Cristo":{"source":"Programas 2026.xlsx","variants":["Senhor eu creio que sois Cristo"],"authors":["F. Silva"],"associations":[{"date":"2026-08-09","part":"comunhao","moment":"Comunhão","celebration":"DOMINGO XIX DO TEMPO COMUM","cycle":""}]},"Senhor trazei-mos a paz":{"source":"Programas 2026.xlsx","variants":["Senhor trazei-mos a paz"],"authors":["Az. Oliveira"],"associations":[{"date":"2026-08-09","part":"final","moment":"Final","celebration":"DOMINGO XIX DO TEMPO COMUM","cycle":""}]},"Apareceu no Céu um sinal":{"source":"Programas 2026.xlsx","variants":["Apareceu no Céu um sinal"],"authors":["J. Geada"],"associations":[{"date":"2026-08-15","part":"entrada","moment":"Entrada","celebration":"ASSUNÇÃO DA VIRGEM SANTA MARIA – SOLENIDADE","cycle":""}]},"À vossa direita, Senhor":{"source":"Programas 2026.xlsx","variants":["À vossa direita, Senhor"],"authors":["J. Geada"],"associations":[{"date":"2026-08-15","part":"salmo","moment":"Salmo","celebration":"ASSUNÇÃO DA VIRGEM SANTA MARIA – SOLENIDADE","cycle":""}]},"O Santissima":{"source":"Programas 2026.xlsx","variants":["O Santissima"],"authors":["M. Faria"],"associations":[{"date":"2026-08-15","part":"ofertorio","moment":"Ofertório","celebration":"ASSUNÇÃO DA VIRGEM SANTA MARIA – SOLENIDADE","cycle":""}]},"Cordeiro de Deus II":{"source":"Programas 2026.xlsx","variants":["Cordeiro de Deus II"],"authors":["F. Silva"],"associations":[{"date":"2026-08-15","part":"cordeiro","moment":"Cordeiro de Deus","celebration":"ASSUNÇÃO DA VIRGEM SANTA MARIA – SOLENIDADE","cycle":""}]},"Maria, és a árvore da vida":{"source":"Programas 2026.xlsx","variants":["Maria, és a árvore da vida"],"authors":["F. Santos"],"associations":[{"date":"2026-08-15","part":"comunhao","moment":"Comunhão","celebration":"ASSUNÇÃO DA VIRGEM SANTA MARIA – SOLENIDADE","cycle":""}]},"Desde toda a eternidade":{"source":"Programas 2026.xlsx","variants":["Desde toda a eternidade"],"authors":["M. Carneiro"],"associations":[{"date":"2026-08-15","part":"final","moment":"Final","celebration":"ASSUNÇÃO DA VIRGEM SANTA MARIA – SOLENIDADE","cycle":""}]},"Senhor, quem entrará no santuário":{"source":"Programas 2026.xlsx","variants":["Senhor, quem entrará no santuário"],"authors":["I. Larrañaga"],"associations":[{"date":"2026-08-16","part":"entrada","moment":"Entrada","celebration":"DOMINGO XX DO TEMPO COMUM","cycle":""}]},"Senhor tende piedade somos o teu povo":{"source":"Programas 2026.xlsx","variants":["Senhor tende piedade somos o teu povo"],"authors":["J. Santos"],"associations":[{"date":"2026-08-16","part":"atoPenitencial","moment":"Acto Penitencial","celebration":"DOMINGO XX DO TEMPO COMUM","cycle":""}]},"Senhor nós vos oferecemos":{"source":"Programas 2026.xlsx","variants":["Senhor nós vos oferecemos"],"authors":["B. Salgado"],"associations":[{"date":"2026-08-16","part":"ofertorio","moment":"Ofertório","celebration":"DOMINGO XX DO TEMPO COMUM","cycle":""}]},"Povo teu somos, ó Senhor":{"source":"Programas 2026.xlsx","variants":["Povo teu somos, ó Senhor"],"authors":[],"associations":[{"date":"2026-08-16","part":"final","moment":"Final","celebration":"DOMINGO XX DO TEMPO COMUM","cycle":""}]},"Inclinai o vosso ouvido":{"source":"Programas 2026.xlsx","variants":["Inclinai o vosso ouvido"],"authors":["G. Gomes"],"associations":[{"date":"2026-08-23","part":"entrada","moment":"Entrada","celebration":"DOMINGO XXI DO TEMPO COMUM","cycle":""}]},"Por vossa misericórdia":{"source":"Programas 2026.xlsx","variants":["Por vossa misericórdia"],"authors":["M.Luis"],"associations":[{"date":"2026-08-23","part":"salmo","moment":"Salmo","celebration":"DOMINGO XXI DO TEMPO COMUM","cycle":""}]},"Irei mais além":{"source":"Programas 2026.xlsx","variants":["Irei mais além"],"authors":["H. Faria"],"associations":[{"date":"2026-08-23","part":"final","moment":"Final","celebration":"DOMINGO XXI DO TEMPO COMUM","cycle":""}]},"Meu Senhor eu vos amo":{"source":"Programas 2026.xlsx","variants":["Meu Senhor eu vos amo"],"authors":["A. Cartageno"],"associations":[{"date":"2026-08-30","part":"entrada","moment":"Entrada","celebration":"DOMINGO XXII DO TEMPO COMUM","cycle":""}]},"A minha alma tem sede de Vós, meu Deus.":{"source":"Programas 2026.xlsx","variants":["A minha alma tem sede de Vós, meu Deus."],"authors":["A. Cartageno"],"associations":[{"date":"2026-08-30","part":"salmo","moment":"Salmo","celebration":"DOMINGO XXII DO TEMPO COMUM","cycle":""}]},"Vimos trazer Senhor":{"source":"Programas 2026.xlsx","variants":["Vimos trazer Senhor"],"authors":["M. Faria"],"associations":[{"date":"2026-08-30","part":"ofertorio","moment":"Ofertório","celebration":"DOMINGO XXII DO TEMPO COMUM","cycle":""}]},"Vós sois justo senhor":{"source":"Programas 2026.xlsx","variants":["Vós sois justo senhor"],"authors":["S. Pinto"],"associations":[{"date":"2026-09-06","part":"entrada","moment":"Entrada","celebration":"DOMINGO XXIII DO TEMPO COMUM","cycle":""}]},"Onde se reunem dois ou tres":{"source":"Programas 2026.xlsx","variants":["Onde se reunem dois ou tres"],"authors":["az oliveira"],"associations":[{"date":"2026-09-06","part":"ofertorio","moment":"Ofertório","celebration":"DOMINGO XXIII DO TEMPO COMUM","cycle":""}]},"Como o veado em busca das aguas":{"source":"Programas 2026.xlsx","variants":["Como o veado em busca das aguas"],"authors":["B Salgado"],"associations":[{"date":"2026-09-06","part":"comunhao","moment":"Comunhão","celebration":"DOMINGO XXIII DO TEMPO COMUM","cycle":""}]},"Deus é pai Deus é amor":{"source":"Programas 2026.xlsx","variants":["Deus é pai Deus é amor"],"authors":["F. Silva","F. silva"],"associations":[{"date":"2026-09-06","part":"final","moment":"Final","celebration":"DOMINGO XXIII DO TEMPO COMUM","cycle":""},{"date":"2026-09-13","part":"final","moment":"Final","celebration":"DOMINGO XXIV DO TEMPO COMUM","cycle":""}]},"O Senhor é clemente e compassivo":{"source":"Programas 2026.xlsx","variants":["O Senhor é clemente e compassivo"],"authors":["M.Luis"],"associations":[{"date":"2026-09-13","part":"salmo","moment":"Salmo","celebration":"DOMINGO XXIV DO TEMPO COMUM","cycle":""}]},"Dou-vos um mandamento novo":{"source":"Programas 2026.xlsx","variants":["Dou-vos um mandamento novo"],"authors":["J.P. Martins"],"associations":[{"date":"2026-09-13","part":"ofertorio","moment":"Ofertório","celebration":"DOMINGO XXIV DO TEMPO COMUM","cycle":""}]},"Eu darei ao meu povo a salvação":{"source":"Programas 2026.xlsx","variants":["Eu darei ao meu povo a salvação"],"authors":["A.  Cartageno"],"associations":[{"date":"2026-09-20","part":"entrada","moment":"Entrada","celebration":"DOMINGO XXV DO TEMPO COMUM","cycle":""}]},"O Senhor está perto de quantos O invocam.":{"source":"Programas 2026.xlsx","variants":["O Senhor está perto de quantos O invocam."],"authors":["M.Luis"],"associations":[{"date":"2026-09-20","part":"salmo","moment":"Salmo","celebration":"DOMINGO XXV DO TEMPO COMUM","cycle":""}]},"Senhor fazei de mim um instrumento":{"source":"Programas 2026.xlsx","variants":["Senhor fazei de mim um instrumento"],"authors":["F. Silva"],"associations":[{"date":"2026-09-20","part":"ofertorio","moment":"Ofertório","celebration":"DOMINGO XXV DO TEMPO COMUM","cycle":""}]},"O Cordeiro de Deus é o nosso pastor":{"source":"Programas 2026.xlsx","variants":["O Cordeiro de Deus é o nosso pastor"],"authors":["Az. Oliveira"],"associations":[{"date":"2026-09-20","part":"comunhao","moment":"Comunhão","celebration":"DOMINGO XXV DO TEMPO COMUM","cycle":""}]},"Acabou a missa":{"source":"Programas 2026.xlsx","variants":["Acabou a missa"],"authors":["Az. Oliveira"],"associations":[{"date":"2026-09-20","part":"final","moment":"Final","celebration":"DOMINGO XXV DO TEMPO COMUM","cycle":""}]},"Vós sois justos Senhor":{"source":"Programas 2026.xlsx","variants":["Vós sois justos Senhor"],"authors":["G. Gomes"],"associations":[{"date":"2026-09-27","part":"entrada","moment":"Entrada","celebration":"DOMINGO XXVI DO TEMPO COMUM","cycle":""}]},"Lembrai-Vos, Senhor, da vossa misericórdia":{"source":"Programas 2026.xlsx","variants":["Lembrai-Vos, Senhor, da vossa misericórdia"],"authors":["M. Luis"],"associations":[{"date":"2026-09-27","part":"salmo","moment":"Salmo","celebration":"DOMINGO XXVI DO TEMPO COMUM","cycle":""}]}};
const CORO_2026_AUTO_ENRICHMENT_N = Object.fromEntries(Object.entries(CORO_2026_AUTO_ENRICHMENT).map(([k,v])=>[normSmart(k),v]));
function autoSongEnrichment(title){ return CORO_2026_AUTO_ENRICHMENT_N[normSmart(title)] || null; }

function songLiturgicalMetadata(song){
 const title=getSongTitle(song), manual=manualSongMetadata(title)||{};
 const base={moment:manual.moment||songMoment(song),celebration:manual.celebration||songCelebration(song),season:manual.season||songSeason(song),cycle:manual.cycle||songCycle(song),psalm:manual.psalm||songPsalm(song),theme:manual.theme||String(song?.Tema||'').trim(),manual};
 const ix=window.CORO_SONG_LITURGICAL_INDEX?.[title]||null;
 const auto=autoSongEnrichment(title);
 const historical=[...(ix?.associations||[])];
 const autoAssoc=auto?.associations||[];
 const seen=new Set(historical.map(a=>JSON.stringify([a.date,a.part,a.moment,a.celebration,a.cycle])));
 autoAssoc.forEach(a=>{const k=JSON.stringify([a.date,a.part,a.moment,a.celebration,a.cycle]);if(!seen.has(k)){seen.add(k);historical.push(a);}});
 const allMoments=Array.from(new Set([...(ix?.moments||[]),...(autoAssoc.map(a=>a.moment).filter(Boolean))]));
 const allCelebrations=Array.from(new Set([...(ix?.celebrations||[]),...(autoAssoc.map(a=>a.celebration).filter(Boolean))]));
 const allCycles=Array.from(new Set([...(ix?.cycles||[]),...(autoAssoc.map(a=>a.cycle).filter(Boolean))]));
 const allDates=Array.from(new Set([...(ix?.dates||[]),...(autoAssoc.map(a=>a.date).filter(Boolean))]));
 const allPsalms=Array.from(new Set([...(ix?.psalms||[]),...(autoAssoc.map(a=>a.psalm).filter(Boolean))]));
 base.historicalMoments=allMoments;base.historicalCelebrations=allCelebrations;base.historicalCycles=allCycles;base.historicalDates=allDates;base.historicalAssociations=historical;base.historicalPsalms=allPsalms;
 base.autoEnrichment=auto||null;
 return base;
}
function getUsageHistory(){try{const a=JSON.parse(localStorage.getItem('coroSongUsage')||'[]');const b=JSON.parse(localStorage.getItem('coroSongUsage_v1')||'[]');return [...(Array.isArray(a)?a:[]),...(Array.isArray(b)?b:[])];}catch(e){return [];}}
function lastUse(title){const key=normSmart(title);try{return getUsageHistory().filter(x=>normSmart(x.song||x.title)===key).sort((a,b)=>String(b.date).localeCompare(String(a.date)))[0]||null;}catch(e){return null;}}
function usageCount(title){return getUsageHistory().filter(x=>normSmart(x.song||x.title)===normSmart(title)).length;}
function currentProgramTitles(exceptPartId=''){return new Set(PROGRAM_PARTS.filter(p=>p.id!==exceptPartId).map(p=>document.getElementById(p.id)?.value||'').filter(Boolean).map(normSmart));}

// ============================================
// BASE DE PROPOSTAS LITÚRGICAS — fontes de referência
// Prioridade: Cantoral Nacional (SNL) > Laudate > catálogo do coro.
// A chave é celebração + ciclo + momento; não apenas "tempo litúrgico".
// ============================================
const LITURGICAL_MUSIC_PROPOSALS = {
  '2026-12-25|Missa do Dia|B': {
    sourceLabel:'Cantoral Nacional — Ano B',
    sourceUrl:'https://www.liturgia.pt/musica/cantoralB.php',
    laudateUrl:'https://www.canticos.pt/domingo/bn_dia/',
    parts:{
      entrada:[['Um Menino nos foi dado','',981],['No princípio, antes da criação','',644],['Glória! Hossana! Eis Jesus Cristo','',516]],
      salmo:[['Todos os confins da terra','',963]],
      comunhao:[['No princípio, antes de todos os tempos','',645],['Deus enviou ao mundo o seu Filho','',357]],
      final:[['Ah! Vinde todos à porfia','',185],['Cantam, cantem os Anjos a Deus','',289]]
    },
    laudate:{
      entrada:['Alegrem-se os céus e a terra','Bendito seja Deus','Cantemos cantemos ao Senhor','Cristo dará a liberdade','Deus enviou ao mundo','Ergue os teus olhos','Esta noite é de alegria','Exultemos de alegria','Hoje sobre nós resplandece','Jesus Cristo ontem e hoje','No princípio antes da criação','No princípio antes de todos','Noite de festa','Povos batei palmas','Senhor Tu és a luz','Um Menino nos foi dado'],
      salmo:['Todos os confins da terra','Hoje nasceu o nosso Salvador'],
      ofertorio:['Adeste fideles','Cristo dará a liberdade','Deus enviou ao mundo','Ergue os teus olhos','Esta noite é de alegria','Exultemos de alegria','Felizes as entranhas','Senhor Tu és a luz','Um Menino nos foi dado'],
      comunhao:['Bendito seja Deus','Deus enviou ao mundo','Exultemos de alegria','Felizes as entranhas','Jesus Cristo ontem e hoje','No princípio antes da criação','No princípio antes de todos','O trigo que Deus semeou','Senhor Tu és a luz'],
      acaoGracas:['Bendito seja Deus','Cantai comigo','Cantemos cantemos ao Senhor','Felizes as entranhas','No princípio antes de todos','Povos batei palmas','Senhor Tu és a luz'],
      final:['Adeste fideles','Alegrem-se os céus e a terra','Cantai comigo','Cantemos à porfia','Cantemos cantemos ao Senhor','Cristãos alegria','Cristo dará a liberdade','É Natal salvação e luz','Jesus Cristo ontem e hoje','Noite de festa','Noite feliz','Povos batei palmas']
    }
  },
  '2026-12-24|Missa da Noite|B': {
    sourceLabel:'Cantoral Nacional — Ano B', sourceUrl:'https://www.liturgia.pt/musica/cantoralB.php', laudateUrl:'https://www.canticos.pt/domingo/bn_noite/',
    parts:{entrada:[['Glória a Deus e paz na terra','',504],['Oh admirável noite – I','',759],['Oh admirável noite – II','',760]],salmo:[['Hoje nasceu','',526]],comunhao:[['O Verbo fez-Se carne – I','',753],['O Verbo fez-Se carne – II','',754],['O Verbo fez-Se carne – III','',755],['O Verbo fez-Se homem','',756],['A Vida que estava junto do Pai','',160]],final:[['Cristo nasceu: Vinde adoremos','',322],['Adeste fideles','',180]]}
  },
  '2026-12-25|Missa da Aurora|B': {
    sourceLabel:'Cantoral Nacional — Ano B', sourceUrl:'https://www.liturgia.pt/musica/cantoralB.php', laudateUrl:'https://www.canticos.pt/domingo/bn_aurora/',
    parts:{entrada:[['Hoje uma grande luz desceu','',528],['Brilha a luz da sua glória','',260]],salmo:[['Hoje sobre nós resplandece uma luz','',527]],comunhao:[['Os pastores vieram','',779],['O povo que estava nas trevas','',697]],final:[['Deus enviou ao mundo','',357],['Nós Vos saudamos, ó Mãe santa','',665]]}
  }
};

// 6.2: proposta oficial verificada para 13/09/2026 (Domingo XXIV, Ano A).
// A chave usa a variante vazia porque esta celebração não tem variante especial.
Object.assign(LITURGICAL_MUSIC_PROPOSALS, {
  '2026-09-13||A': {sourceLabel:'Cantoral Nacional — Ano A',sourceUrl:'https://www.liturgia.pt/musica/cantoralA.php',laudateUrl:'https://www.canticos.pt/domingo/ac_24/',parts:{entrada:[['Dai a paz, Senhor','',333],['Senhor, trazei-nos a paz','',916]],salmo:[['O Senhor é clemente e compassivo','M. Luís',null],['O Senhor é clemente e cheio','',711]],comunhao:[['Como é admirável, Senhor','',301],['O cálice de bênção é comunhão','',671]],final:[['Se cumprirdes os meus mandamentos','',899],['Se vos amardes uns aos outros','',902]]}}
});

const CELEBRATION_VARIANTS = {
  '2026-12-24':[
    {id:'Missa da Noite',label:'Natal — Missa da Noite'},
    {id:'Missa da Vigília',label:'Natal — Missa da Vigília'}
  ],
  '2026-12-25':[
    {id:'Missa da Aurora',label:'Natal — Missa da Aurora'},
    {id:'Missa do Dia',label:'Natal — Missa do Dia'}
  ]
};
function musicProposalKey(date,partId){
  const variant=document.getElementById('celebrationVariant')?.value||'';
  const cycle=getLiturgicalInfo(date||'').year||'A';
  return `${date}|${variant}|${cycle}`;
}
function getMusicProposals(date,partId){
  const key=musicProposalKey(date,partId), data=LITURGICAL_MUSIC_PROPOSALS[key];
  return data?.parts?.[partId]||[];
}
function getMusicSourceInfo(date,partId){return LITURGICAL_MUSIC_PROPOSALS[musicProposalKey(date,partId)]||null;}
function updateCelebrationVariantOptions(){
  const date=document.getElementById('date')?.value, wrap=document.getElementById('celebrationVariantWrap'), sel=document.getElementById('celebrationVariant');
  if(!wrap||!sel)return;
  const variants=CELEBRATION_VARIANTS[date]||[];
  const previous=sel.value;
  if(!variants.length){wrap.hidden=true;sel.innerHTML='<option value="">Celebração normal</option>';return;}
  wrap.hidden=false;
  sel.innerHTML=variants.map(v=>`<option value="${escSmart(v.id)}">${escSmart(v.label)}</option>`).join('');
  if(variants.some(v=>v.id===previous))sel.value=previous; else sel.value=variants[variants.length-1].id;
}
function renderLiturgicalProposalPreview(){
  const box=document.getElementById('liturgicalProposalPreview'); if(!box)return;
  const date=document.getElementById('date')?.value||'', variant=document.getElementById('celebrationVariant')?.value||'';
  const info=getMusicSourceInfo(date,'entrada');
  const lit=getLiturgicalInfo(date), ps=getOfficialPsalmData(date), links=liturgicalSourceLinks(date,'salmo');
  if(!date){box.hidden=true;box.innerHTML='';return;}
  box.hidden=false;
  const sourceLine=info
    ? `<b>📚 Repertório prioritário:</b> <a href="${escSmart(info.sourceUrl)}" target="_blank" rel="noopener">Cantoral Nacional</a> · <a href="${escSmart(info.laudateUrl)}" target="_blank" rel="noopener">Laudate</a>`
    : `<b>📚 Fontes litúrgicas:</b> <a href="${escSmart(links.cantoral)}" target="_blank" rel="noopener">Cantoral Nacional — Ano ${escSmart(lit.year||'')}</a> · <a href="${escSmart(links.laudate)}" target="_blank" rel="noopener">Laudate</a> · <a href="${escSmart(ps.source)}" target="_blank" rel="noopener">Liturgia diária</a>`;
  box.innerHTML=`<div class="small">${sourceLine}<br><b>📖 Salmo Responsorial:</b> ${escSmart(ps.ref?ps.ref+' — ':'')}${escSmart(ps.refrain||'não identificado')} <a href="${escSmart(ps.source)}" target="_blank" rel="noopener">ver liturgia oficial</a><br><span class="muted">${info?`A aplicação prioriza as propostas específicas de <b>${escSmart(variant)}</b>.`: 'As sugestões só entram quando existe associação litúrgica concreta; o histórico não pode transformar um cântico inadequado em sugestão.'}</span></div>`;
}
function initCelebrationVariant(){
  const date=document.getElementById('date'), sel=document.getElementById('celebrationVariant');
  date?.addEventListener('change',()=>{updateCelebrationVariantOptions();renderLiturgicalProposalPreview();renderProgramAssistant();});
  sel?.addEventListener('change',()=>{renderLiturgicalProposalPreview();renderProgramAssistant();});
  updateCelebrationVariantOptions();renderLiturgicalProposalPreview();
}

function getChoirPreferences(){
  try { const x=JSON.parse(localStorage.getItem('coroChoirPreferences_v1')||'[]'); return Array.isArray(x)?x:[]; } catch(e){ return []; }
}
function saveChoirPreferences(arr){ localStorage.setItem('coroChoirPreferences_v1',JSON.stringify(arr.slice(-1000))); }
function recordChoirPreference(title,partId){
  if(!title||!partId)return;
  const prefs=getChoirPreferences(), date=document.getElementById('date')?.value||'', info=getLiturgicalInfo(date)||{}, key=normSmart(title)+'|'+partId;
  let p=prefs.find(x=>x.key===key);
  if(p){p.count=(p.count||0)+1;p.lastDate=date;p.lastUpdated=new Date().toISOString();p.cycles=Array.from(new Set([...(p.cycles||[]),info.year||''].filter(Boolean)));}
  else prefs.push({key,title,partId,count:1,lastDate:date,lastUpdated:new Date().toISOString(),cycles:info.year?[info.year]:[]});
  saveChoirPreferences(prefs);
}
function choirPreferenceFor(title,partId){ return getChoirPreferences().find(x=>x.key===normSmart(title)+'|'+partId)||null; }
function choirPreferenceScore(title,partId){ const p=choirPreferenceFor(title,partId); return p?Math.min(24,(p.count||0)*6):0; }

function smartReasonScore(song,partId){
 const info=getLiturgicalInfo(document.getElementById('date')?.value||'');
 const title=getSongTitle(song), titleN=normSmart(title), tema=normSmart(song.Tema||''), tempo=normSmart(song.Tempo||''), obs=normSmart(song.Observações||song.Observacoes||'');
 const label=normSmart((PROGRAM_PARTS.find(p=>p.id===partId)||{}).label||'');
 const moment=normSmart(songMoment(song));
 const proposalTitles=getMusicProposals(document.getElementById('date')?.value||'',partId).map(x=>normSmart(x[0]));
 const isOfficialProposal=proposalTitles.includes(titleN);
 const psalmProposal=getMusicProposals(document.getElementById('date')?.value||'',partId).find(x=>normSmart(x[0])===titleN);
 const psalm=songPsalm(song), targetPsalm=getTargetPsalm(document.getElementById('date')?.value||'');
 let score=0, reasons=[];
 if(isOfficialProposal){score+=125; reasons.push('proposta do Cantoral Nacional');}
 if(partId==='salmo' && psalmProposal){score+=60; reasons.push('versão musical do Salmo oficial');}
 if(moment && (moment===label || moment.includes(label) || label.includes(moment))){score+=38; reasons.push('momento litúrgico');}
 else if(label && obs.includes(label)){score+=18; reasons.push('momento compatível');}
 const season=normSmart(info.time||info.season||'');
 const seasonAliases={tempocomum:'tempo comum',pascoa:'tempo pascal',quaresma:'quaresma',advento:'advento',natal:'tempo do natal'};
 const targetSeason=seasonAliases[season]||season;
 if(targetSeason && tempo.split(';').map(x=>normSmart(x)).some(x=>x===targetSeason || x.includes(targetSeason) || targetSeason.includes(x))){score+=22; reasons.push('tempo litúrgico');}
 const titleLit=normSmart(info.title||info.name||'');
 const src=getMusicSourceInfo(document.getElementById('date')?.value||'',partId);
 const laudateTitles=src?.laudate?.[partId]||[];
 if(laudateTitles.some(x=>normSmart(x)===titleN)){score+=72; reasons.push('proposta Laudate');}
 if(titleLit && (tema.includes(titleLit)||titleLit.includes(tema)) && tema.length>5){score+=35; reasons.push('celebração específica');}
 const words=String(info.theme||'').toLowerCase().split(/[,;]+/).map(x=>normSmart(x)).filter(x=>x.length>3);
 const songMeta=songLiturgicalMetadata(song);
 const celebrationMeta=normSmart(info.title||info.name||'');
 if(songMeta.celebration && celebrationMeta && normSmart(songMeta.celebration)===celebrationMeta){score+=42;reasons.push('celebração exata');}
 if(songMeta.cycle && info.year && normSmart(songMeta.cycle)===normSmart(info.year)){score+=12;reasons.push('ano litúrgico');}
 const matches=words.filter(w=>tema.includes(w)||obs.includes(w)||titleN.includes(w));
 if(matches.length){score+=Math.min(28,matches.length*7);reasons.push('tema da liturgia');}
 if(partId==='salmo' && targetPsalm){
   const pN=normSmart(targetPsalm), spN=normSmart(psalm);
   if(spN && (spN===pN || spN.includes(pN) || pN.includes(spN))){score+=90;reasons.push('salmo exato');}
   else if(spN){const A=new Set(pN.split(' ').filter(x=>x.length>3)),B=new Set(spN.split(' ').filter(x=>x.length>3));const inter=[...A].filter(x=>B.has(x)).length;const union=new Set([...A,...B]).size;if(union && inter/union>=0.45){score+=55;reasons.push('texto do salmo semelhante');}}
   else if(titleN && (titleN.includes(pN)||pN.includes(titleN))){score+=75;reasons.push('título corresponde ao salmo');}
 }
 const lu=lastUse(title), uses=usageCount(title);
 if(!lu){score+=18;reasons.push('nunca utilizado');}
 else {const days=Math.max(0,Math.round((Date.now()-new Date(lu.date+'T12:00:00').getTime())/86400000));if(days<90){score-=22;reasons.push('utilizado recentemente');}else if(days>365){score+=12;reasons.push('há mais de 1 ano');}else if(days>180){score+=6;reasons.push('há algum tempo');}}
 if(uses===0 && song._uses>0){score-=Math.min(10,Number(song._uses)||0);}
 const pref=choirPreferenceFor(title,partId); if(pref){ const bonus=choirPreferenceScore(title,partId); score+=bonus; reasons.push('preferência do coro ('+(pref.count||0)+' escolha'+((pref.count||0)===1?'':'s')+')'); }
 return {score,reasons,lu,uses,partMoment:songMoment(song),psalm:psalm,preference:pref};
}
function scoreSmartSong(song,partId){return smartReasonScore(song,partId).score;}
function exactLiturgicalAssociation(song,partId){
 const date=document.getElementById('date')?.value||'', info=getLiturgicalInfo(date);
 const tema=normSmart(song.Tema||''), obs=normSmart(song.Observações||song.Observacoes||''), title=normSmart(getSongTitle(song));
 const celebration=normSmart(info.title||info.name||'');
 const targetPsalm=normSmart(getTargetPsalm(date));
 const psalm=normSmart(songPsalm(song));
 // Para o Salmo, só aceitamos uma correspondência textual/referencial ao Salmo da celebração.
 if(partId==='salmo') return !!targetPsalm && !!(psalm && (psalm===targetPsalm || psalm.includes(targetPsalm) || targetPsalm.includes(psalm)) || title && (title.includes(targetPsalm) || targetPsalm.includes(title)));
 // Uma utilização anterior na mesma celebração, ciclo e momento é uma associação histórica forte.
 const ix=window.CORO_SONG_LITURGICAL_INDEX?.[getSongTitle(song)];
 const cycle=info.year||'';
 if(ix?.associations?.some(a=>normSmart(a.celebration)===celebration && normSmart(a.cycle)===normSmart(cycle) && normSmart(a.part)===normSmart(partId))) return true;
 // Nos restantes momentos, a associação à celebração concreta tem prioridade absoluta.
 if(!celebration) return false;
 const variants=[celebration, celebration.replace(/\bdo\b|\bda\b|\bde\b/g,' '), celebration.replace(/domingo\s+/,'')].map(normSmart).filter(x=>x.length>7);
 if(variants.some(v=>tema.includes(v)||obs.includes(v)||title.includes(v))) return true;
 const roman=celebration.match(/domingo\s+(i{1,3}|iv|v?i{0,3}|x{0,3})\b/);
 if(roman && tema.includes(roman[0])) return true;
 return false;
}
function liturgicalSourceLinks(date,partId){
 const info=getLiturgicalInfo(date||'');
 const cycle=info.year||'A';
 const q=encodeURIComponent((info.title||info.name||'')+' '+(partId||''));
 const ps=encodeURIComponent(getTargetPsalm(date||'')||'');
 return {
   ocl:'https://ocantonaliturgia.pt/obras?search='+q,
   laudate:getLaudateCelebrationUrl(date),
   cantoral:cycle==='B'?'https://www.liturgia.pt/musica/cantoralB.php':cycle==='C'?'https://www.liturgia.pt/musica/cantoralC.php':'https://www.liturgia.pt/musica/cantoralA.php',
   psalmOcl:'https://ocantonaliturgia.pt/obras?search='+ps
 };
}
function liturgicalDiagnostics(){
  const cases=[
    ['2026-12-24','Missa da Noite','Sl 95 (96)','Hoje nasceu o nosso Salvador: Jesus Cristo, Senhor'],
    ['2026-12-25','Missa da Aurora','Sl 96 (97)','Hoje sobre nós resplandece uma luz: nasceu o Senhor'],
    ['2026-12-25','Missa do Dia','Sl 97 (98)','Todos os confins da terra viram a salvação do nosso Deus']
  ];
  return cases.map(([date,variant,ref,refrain])=>{
    const d=CELEBRATION_LITURGY_DATA[date+'|'+variant];
    return {date,variant,ok:!!d&&d.psalmRef===ref&&normSmart(d.refrain)===normSmart(refrain)};
  });
}
window.CORO_LITURGICAL_6_DIAGNOSTICS=liturgicalDiagnostics;

function liturgicalConfidence(song,partId){
 const date=document.getElementById('date')?.value||'', info=getLiturgicalInfo(date), title=getSongTitle(song);
 const official=getMusicProposals(date,partId).some(x=>normSmart(x[0])===normSmart(title));
 if(official) return {level:'official',label:'🥇 Proposta oficial',rank:500,reason:'Associado diretamente pelo Cantoral Nacional à celebração e ao momento.'};
 const ix=window.CORO_SONG_LITURGICAL_INDEX?.[title];
 const cycle=normSmart(info.year||''); const celebration=normSmart(info.title||info.name||'');
 if(ix?.associations?.some(a=>normSmart(a.celebration)===celebration && normSmart(a.cycle)===cycle && normSmart(a.part)===normSmart(partId))) return {level:'historical-exact',label:'🟢 Histórico exato',rank:450,reason:'O próprio coro já utilizou este cântico nesta celebração, ciclo e momento.'};
 if(exactLiturgicalAssociation(song,partId)) return {level:'associated',label:'🟢 Associado à celebração',rank:400,reason:'Existe uma associação concreta no catálogo para esta celebração.'};
 const meta=songLiturgicalMetadata(song), moment=normSmart(songMoment(song)||meta.moment||'');
 const label=normSmart((PROGRAM_PARTS.find(p=>p.id===partId)||{}).label||'');
 const season=normSmart(info.time||info.season||'');
 const tempo=normSmart(song.Tempo||'');
 const sameMoment=moment && label && (moment===label || moment.includes(label) || label.includes(moment));
 const sameCycle=!meta.cycle || !cycle || normSmart(meta.cycle)===cycle || (meta.historicalCycles||[]).map(normSmart).includes(cycle);
 const seasonMatch=season && tempo && (tempo.includes(season) || season.includes(tempo));
 if(sameMoment && sameCycle) return {level:'same-cycle-moment',label:'🔵 Mesmo ciclo e momento',rank:300,reason:'O cântico está associado ao mesmo momento litúrgico e ao mesmo ciclo.'};
 if(sameMoment && seasonMatch) return {level:'season-moment',label:'🟡 Mesmo tempo e momento',rank:220,reason:'Compatível pelo tempo litúrgico e pelo momento, mas sem associação à celebração concreta.'};
 return {level:'none',label:'⚪ Sem associação suficiente',rank:0,reason:'Não há evidência litúrgica suficiente para o recomendar automaticamente.'};
}
function confidenceRank(song,partId){return liturgicalConfidence(song,partId).rank;}

function smartSuggestions(partId){
 const used=currentProgramTitles(partId), date=document.getElementById('date')?.value||'';
 const all=(songs||[]).filter(s=>!used.has(normSmart(getSongTitle(s))));
 const ranked=all.map(s=>({s,confidence:liturgicalConfidence(s,partId),meta:smartReasonScore(s,partId)}))
   .filter(x=>x.confidence.rank>0)
   .sort((a,b)=>b.confidence.rank-a.confidence.rank || b.meta.score-a.meta.score);
 return ranked.slice(0,10).map(x=>x);
}

function getLaudateCelebrationUrl(date){
 const info=getLiturgicalInfo(date||'');
 const cycle=String(info.year||'A').toLowerCase();
 const title=normSmart(info.title||info.name||'');
 const m=title.match(/domingo\s+([ivxlcdm]+)\s+do\s+tempo\s+comum/);
 if(m){
   const romans={i:1,ii:2,iii:3,iv:4,v:5,vi:6,vii:7,viii:8,ix:9,x:10,xi:11,xii:12,xiii:13,xiv:14,xv:15,xvi:16,xvii:17,xviii:18,xix:19,xx:20,xxi:21,xxii:22,xxiii:23,xxiv:24,xxv:25,xxvi:26,xxvii:27,xxviii:28,xxix:29,xxx:30,xxxi:31,xxxii:32,xxxiii:33,xxxiv:34};
   const n=romans[m[1]];
   if(n)return 'https://www.canticos.pt/domingo/'+cycle+'c_'+String(n).padStart(2,'0')+'/';
 }
 const special={
   'domingo de pentecostes':'pentecostes',
   'ascensao do senhor':'ascensao',
   'domingo de ramos e da paixao do senhor':'ramos',
   'domingo de pascoa da ressurreicao do senhor':'pascoa',
   'natal do senhor':'bn_dia',
   'sagrada familia de jesus maria e jose':'sagrada_familia'
 };
 const key=Object.keys(special).find(k=>title.includes(k));
 return key?'https://www.canticos.pt/domingo/'+special[key]+'/':'https://www.canticos.pt/domingos/';
}
function fitLabel(score){return score>=75?'🟢 Muito adequado':score>=48?'🟡 Adequado':'⚪ Possível';}
function openSongSelectModal(partId){
 const modal=document.getElementById('songSelectModal'); if(!modal)return; window.currentSmartPart=partId; const label=(PROGRAM_PARTS.find(p=>p.id===partId)||{}).label||partId;
 const lab=document.getElementById('songSelectPartLabel'); if(lab)lab.textContent='Escolher para: '+label;
 const search=document.getElementById('songSelectSearch'); if(search)search.value='';
 const theme=document.getElementById('songSelectTheme'); if(theme){theme.innerHTML='<option value="">Todos os temas</option>'+Array.from(new Set((songs||[]).flatMap(s=>String(s.Tema||'').split(';').map(x=>x.trim()).filter(Boolean)))).sort((a,b)=>a.localeCompare(b,'pt')).map(x=>'<option>'+x.replace(/</g,'&lt;')+'</option>').join('');}
 const author=document.getElementById('songSelectAuthor'); if(author){author.innerHTML='<option value="">Todos os autores</option>'+Array.from(new Set((songs||[]).map(getSongAuthor).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'pt')).map(x=>'<option>'+escSmart(x)+'</option>').join('');}
 const moment=document.getElementById('songSelectMoment'); if(moment){moment.innerHTML='<option value="">Todos os momentos</option>'+PROGRAM_PARTS.map(p=>`<option value="${escSmart(p.label)}">${escSmart(p.label)}</option>`).join(''); moment.value=label;}
 buildSmartSuggestionList(partId); renderSongListModal(); modal.hidden=false; modal.setAttribute('aria-hidden','false');
}
function openSuggestionWhy(song,partId){
 const modal=document.getElementById('suggestionWhyModal'), body=document.getElementById('suggestionWhyBody'); if(!modal||!body)return;
 const date=document.getElementById('date')?.value||'', info=getLiturgicalInfo(date), c=liturgicalConfidence(song,partId), m=smartReasonScore(song,partId), title=getSongTitle(song), author=getSongAuthor(song);
 const label=(PROGRAM_PARTS.find(p=>p.id===partId)||{}).label||partId, source=getMusicSourceInfo(date,partId), links=liturgicalSourceLinks(date,partId), ps=getOfficialPsalmData(date), meta=songLiturgicalMetadata(song), uses=usageCount(title), lu=lastUse(title);
 const safeReasons=m.reasons.length?m.reasons.slice(0,8).map(x=>'<li>'+escSmart(x)+'</li>').join(''):'<li>Sem fatores adicionais registados.</li>';
 const pref=m.preference; const preferenceBox=pref?'<div class="suggestion-why-reasons"><b>⭐ Preferência do coro</b><div>Escolhido manualmente '+escSmart(String(pref.count||0))+' vez(es) para este momento.'+(pref.lastDate?' Última escolha: '+escSmart(pref.lastDate)+'.':'')+'</div></div>':'';
 const sourceName=c.level==='official'?'Cantoral Nacional':c.level==='historical-exact'?'Histórico do coro':c.level==='associated'?'Biblioteca litúrgica':'Compatibilidade litúrgica';
 const officialLink=source?.sourceUrl||links.cantoral;
 document.getElementById('suggestionWhyTitle').textContent='Porque esta sugestão?';
 document.getElementById('suggestionWhySub').textContent=title+(author?' · '+author:'');
 body.innerHTML=`<div class="suggestion-why-card"><b>${escSmart(c.label)}</b><span>${escSmart(c.reason)}</span></div>
 <div class="suggestion-why-grid">
  <div class="suggestion-why-card"><b>📅 Celebração</b><span>${escSmart(info.title||info.name||date)}${info.year?' · Ano '+escSmart(info.year):''}</span></div>
  <div class="suggestion-why-card"><b>🎵 Momento</b><span>${escSmart(label)}</span></div>
  <div class="suggestion-why-card"><b>📚 Evidência</b><span>${escSmart(sourceName)}</span></div>
  <div class="suggestion-why-card"><b>📊 Histórico</b><span>${uses||0} utilização(ões)${lu?' · última: '+escSmart(lu.date):' · nunca utilizado'}</span></div>
 </div>
 ${partId==='salmo'&&ps?'<div class="suggestion-why-reasons"><b>📖 Salmo oficial da celebração</b><div>'+escSmart((ps.ref?ps.ref+' — ':'')+(ps.refrain||''))+'</div></div>':''}
 ${preferenceBox} <div class="suggestion-why-reasons"><b>Porque aparece no Assistente</b><ul>${safeReasons}</ul></div>
 ${meta&&Object.keys(meta).length?'<div class="small muted"><b>Metadados litúrgicos:</b> '+escSmart([meta.celebration,meta.cycle,meta.moment,meta.season].filter(Boolean).join(' · '))+'</div>':''}
 <div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.8rem"><a class="btn secondary small" href="${escSmart(officialLink)}" target="_blank" rel="noopener">📚 Ver fonte litúrgica</a><a class="btn secondary small" href="${escSmart(links.ocl)}" target="_blank" rel="noopener">🎼 O Canto na Liturgia</a><a class="btn secondary small" href="${escSmart(links.laudate)}" target="_blank" rel="noopener">📖 Laudate</a></div>`;
 modal.hidden=false;modal.setAttribute('aria-hidden','false');
}
function closeSuggestionWhy(){const m=document.getElementById('suggestionWhyModal');if(m){m.hidden=true;m.setAttribute('aria-hidden','true');}}
function initSuggestionWhy(){
 document.getElementById('suggestionWhyClose')?.addEventListener('click',closeSuggestionWhy);
 document.getElementById('suggestionWhyClose2')?.addEventListener('click',closeSuggestionWhy);
 document.getElementById('suggestionWhyModal')?.addEventListener('click',e=>{if(e.target.id==='suggestionWhyModal')closeSuggestionWhy();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.getElementById('suggestionWhyModal')?.hidden)closeSuggestionWhy();});
}
function buildSmartSuggestionList(partId){
 const box=document.getElementById('songSelectSuggestions'),list=document.getElementById('songSelectSuggestionsList');if(!box||!list)return;
 const date=document.getElementById('date')?.value||''; const info=getLiturgicalInfo(date); const top=smartSuggestions(partId);
 const source=getMusicSourceInfo(date,partId); const targetPsalm=getTargetPsalm(date); const special=getCelebrationLiturgyData(date);
 const official=getMusicProposals(document.getElementById('date')?.value||'',partId);
 const links=liturgicalSourceLinks(date,partId);
 const sourceBox='<div class="small" style="margin-bottom:.65rem;padding:.7rem;background:rgba(23,105,170,.055);border:1px solid rgba(23,105,170,.14);border-radius:.45rem;"><b>🎼 Repertório litúrgico desta celebração</b><br><span class="muted">A aplicação não apresenta cânticos genéricos como se fossem próprios desta liturgia. Quando o catálogo local não tem uma correspondência segura, consulte diretamente as fontes específicas:</span><div style="margin-top:.45rem;display:flex;gap:.4rem;flex-wrap:wrap"><a class="btn secondary small" href="'+links.ocl+'" target="_blank" rel="noopener">🎼 O Canto na Liturgia</a><a class="btn secondary small" href="'+links.laudate+'" target="_blank" rel="noopener">📖 Laudate — esta celebração</a><a class="btn secondary small" href="'+links.cantoral+'" target="_blank" rel="noopener">📚 Cantoral Nacional</a></div></div>' ;
 const officialBox=source&&official.length?'<div class="official-proposals"><b>🥇 Propostas do Cantoral Nacional</b>'+official.map(x=>'<div class="official-proposal"><span>'+escSmart(x[0])+(x[2]?' <small>nº '+escSmart(x[2])+'</small>':'')+'</span><button type="button" class="btn small proposal-search-btn" data-proposal-title="'+escSmart(x[0])+'">Pesquisar</button></div>').join('')+'</div>':'';
 const emptyNote=!top.length?'<div class="small" style="padding:.65rem;background:rgba(234,179,8,.08);border-radius:.4rem;">ℹ️ Não encontrei no catálogo local um cântico associado especificamente a esta celebração. Em vez de inventar uma sugestão, use as fontes litúrgicas acima para procurar repertório desta celebração.</div>':'';
 list.innerHTML=sourceBox+officialBox+(targetPsalm&&partId==='salmo'?'<div class="small" style="margin-bottom:.5rem;padding:.65rem;background:rgba(37,99,235,.08);border-radius:.35rem;"><b>📖 Salmo da celebração:</b> '+(special?.psalmRef?escSmart(special.psalmRef)+' — ':'')+escSmart(targetPsalm)+'</div>':'')+top.map(x=>{const t=getSongTitle(x.s),m=x.meta,lu=m.lu;const status=lu?('Último uso: '+lu.date):'⭐ Nunca utilizado';const why=m.reasons.slice(0,3).join(' · ');const pref=m.preference;const prefLabel=pref?' · ⭐ Preferência '+(pref.count||0)+'x':'';return '<div class="smart-suggestion-row"><div><b>'+escSmart(t)+'</b><div class="small muted">'+escSmart(x.confidence.label)+' · '+escSmart(status)+escSmart(prefLabel)+(getSongAuthor(x.s)?' · '+escSmart(getSongAuthor(x.s)):'')+'</div><div class="small">'+escSmart(why)+'</div></div><div class="smart-suggestion-actions"><button type="button" class="btn secondary small" data-smart-why="'+t.replace(/"/g,'&quot;')+'">Porquê?</button><button type="button" class="btn small" data-smart-title="'+t.replace(/"/g,'&quot;')+'">Usar</button></div></div>';}).join('')+emptyNote;
 box.style.display=(top.length||official.length)?'block':'none';list.querySelectorAll('[data-smart-title]').forEach(b=>b.onclick=()=>useSongInPart(partId,b.dataset.smartTitle,b.dataset.smartAuthor||'')); list.querySelectorAll('[data-smart-why]').forEach(b=>b.onclick=()=>{const hit=top.find(x=>normSmart(getSongTitle(x.s))===normSmart(b.dataset.smartWhy)); if(hit)openSuggestionWhy(hit.s,partId);}); list.querySelectorAll('[data-proposal-title]').forEach(b=>b.onclick=()=>{const q=b.dataset.proposalTitle||'';const search=document.getElementById('songSelectSearch');if(search){search.value=q;renderSongListModal();}});
}
function renderSongListModal(){
 const el=document.getElementById('songSelectList');if(!el)return;
 const rawQ=(document.getElementById('songSelectSearch')?.value||'').trim();
 const q=normSmart(rawQ),th=normSmart(document.getElementById('songSelectTheme')?.value||''),au=normSmart(document.getElementById('songSelectAuthor')?.value||''),mo=normSmart(document.getElementById('songSelectMoment')?.value||'');
 const arr=(songs||[]).filter(s=>{
   const hay=getSongSearchHaystack(s);
   const moment=normSmart(getSongMomentLabel(s));
   return (!q||hay.includes(q))&&(!th||String(s.Tema||'').toLowerCase().split(';').map(x=>normSmart(x.trim())).includes(th))&&(!au||normSmart(getSongAuthor(s))===au)&&(!mo||moment.includes(mo)||moment===mo);
 }).slice(0,100);
 const count=arr.length;
 const external=rawQ||mo?'<div class="song-online-search"><span>Não encontrou no catálogo local?</span><a class="btn secondary small" href="'+escSmart(getCantoNaLiturgiaGoogleUrl(rawQ||mo))+'" target="_blank" rel="noopener noreferrer">🎼 O Canto na Liturgia</a><a class="btn secondary small" href="'+escSmart(getLaudateUrl(rawQ||mo))+'" target="_blank" rel="noopener noreferrer">📖 Laudate</a><a class="btn secondary small" href="'+escSmart(getCantolicoUrl(rawQ||mo))+'" target="_blank" rel="noopener noreferrer">✝️ Cantólico</a></div>':'';
 const header='<div class="song-search-summary"><b>'+count+'</b> resultado(s)'+(rawQ?' para “'+escSmart(rawQ)+'”':'')+(mo?' · momento: '+escSmart(mo):'')+'</div>';
 const body=arr.map(s=>{const t=getSongTitle(s),a=getSongAuthor(s),m=getSongMomentLabel(s),score=getSongScoreUrl(s,a),links=getSongOnlineLinks(s,a);return '<div class="song-select-item"><div class="song-select-item-header"><div class="song-select-title">'+escSmart(t)+'</div><div class="song-select-meta">'+escSmart(a||'Autor não indicado')+(m?' · '+escSmart(m):'')+(s.Tema?' · '+escSmart(s.Tema):'')+'</div></div><div class="song-select-actions"><button type="button" class="btn small program-use-song-btn" data-title="'+t.replace(/"/g,'&quot;')+'" data-author="'+a.replace(/"/g,'&quot;')+'">Usar</button><a class="btn secondary small" href="'+escSmart(links.laudate)+'" target="_blank" rel="noopener noreferrer">📖 Letra/pauta</a>'+(score?'<button type="button" class="btn secondary small" data-preview-score="'+escSmart(score)+'" data-preview-title="'+escSmart(t)+'" data-preview-sub="'+escSmart(a||'')+'">🎼 Partitura</button>':'')+'<a class="btn secondary small" href="'+escSmart(links.cantolico)+'" target="_blank" rel="noopener noreferrer">✝️ Cantólico</a></div></div>';}).join('');
 el.innerHTML=header+body+(arr.length?'':'<p class="small muted">Nenhum cântico encontrado no catálogo local.</p>')+external;
 el.querySelectorAll('[data-title]').forEach(b=>b.onclick=()=>useSongInPart(window.currentSmartPart,b.dataset.title,b.dataset.author||''));
 refreshPartituraPreviewButtons();
}

function useSongInPart(partId,title,author='',silent=false){
  const sel=document.getElementById(partId);if(!sel)return;
  let opt=Array.from(sel.options).find(o=>o.value===title && (!author || normSmart(o.dataset.author||'')===normSmart(author)));
  if(!opt)opt=Array.from(sel.options).find(o=>o.value===title);
  if(!opt){opt=document.createElement('option');opt.value=title;opt.textContent=title;opt.dataset.author=author||'';sel.appendChild(opt);}
  sel.value=title; sel.dataset.selectedAuthor=author||opt.dataset.author||'';
  if(!silent) recordChoirPreference(title,partId);
  sel.dispatchEvent(new Event('change'));
  autoApplyLyricsToPart(partId);
  buildSmartSuggestionList(partId); closeSongSelectModal(); renderProgramAssistant();
}

function closeSongSelectModal(){
  const modal=document.getElementById('songSelectModal');
  if(!modal)return;
  modal.hidden=true;
  modal.setAttribute('aria-hidden','true');
  window.currentSmartPart=null;
}
function setupSmartSelectors(){
  document.querySelectorAll('.program-select-btn').forEach(b=>b.addEventListener('click',()=>openSongSelectModal(b.dataset.partId)));
  document.getElementById('songSelectCloseBtn')?.addEventListener('click',closeSongSelectModal);
  document.getElementById('songSelectCancelBtn')?.addEventListener('click',closeSongSelectModal);
  document.getElementById('songSelectSearch')?.addEventListener('input',renderSongListModal);
  document.getElementById('songSelectTheme')?.addEventListener('change',renderSongListModal);
  document.getElementById('songSelectAuthor')?.addEventListener('change',renderSongListModal);
  document.getElementById('songSelectMoment')?.addEventListener('change',renderSongListModal);
  document.getElementById('songSelectModal')?.addEventListener('click',e=>{if(e.target.id==='songSelectModal')closeSongSelectModal();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape' && !document.getElementById('songSelectModal')?.hidden)closeSongSelectModal();});
}

function selectedProgramPartIds(){return PROGRAM_PARTS.filter(p=>document.querySelector(`[data-moment-toggle="${p.id}"]`)?.checked).map(p=>p.id);}
function syncProgramMomentVisibility(){
  PROGRAM_PARTS.forEach(p=>{const checked=document.querySelector(`[data-moment-toggle="${p.id}"]`)?.checked;const card=document.querySelector(`[data-program-part="${p.id}"]`);if(card)card.classList.toggle('is-disabled',!checked);});
}
function syncMomentPickerFromForm(){
  PROGRAM_PARTS.forEach(p=>{const cb=document.querySelector(`[data-moment-toggle="${p.id}"]`);const el=document.getElementById(p.id);if(cb)cb.checked=!!el?.value;});syncProgramMomentVisibility();}
function setMomentSelection(ids){
  const set=new Set(ids||[]);PROGRAM_PARTS.forEach(p=>{const cb=document.querySelector(`[data-moment-toggle="${p.id}"]`);if(cb)cb.checked=set.has(p.id);});syncProgramMomentVisibility();renderProgramAssistant();}
function initProgramMomentPicker(){
  document.querySelectorAll('[data-moment-toggle]').forEach(cb=>cb.addEventListener('change',()=>{syncProgramMomentVisibility();renderProgramAssistant();}));
  document.getElementById('programMomentsCommonBtn')?.addEventListener('click',()=>setMomentSelection(['entrada','atoPenitencial','salmo','aclamacao','ofertorio','santo','cordeiro','comunhao','final']));
  document.getElementById('programMomentsClearBtn')?.addEventListener('click',()=>setMomentSelection([]));
  syncMomentPickerFromForm();
}

// ============================================
// ASSISTENTE DE PREPARAÇÃO DO PROGRAMA — v3
// ============================================
function currentLitInfo(){
  const d=document.getElementById('date')?.value||'';
  return getLiturgicalInfo(d)||{};
}
function assistantParts(){
  const active=selectedProgramPartIds();
  return PROGRAM_PARTS.filter(p=>document.getElementById(p.id) && active.includes(p.id));
}
function selectedProgramMap(){
  const out={};
  assistantParts().forEach(p=>out[p.id]=document.getElementById(p.id)?.value||'');
  return out;
}
function assistantScore(song,partId,selected){
  const meta=smartReasonScore(song,partId);
  const title=normSmart(getSongTitle(song));
  const duplicates=Object.entries(selected).filter(([id,t])=>id!==partId&&normSmart(t)===title).length;
  if(duplicates) meta.score-=45, meta.reasons.push('evitar repetição');
  return meta;
}
function assistantTop(partId,limit=3){
  const selected=selectedProgramMap();
  // 6.0: o assistente usa primeiro o filtro litúrgico rigoroso.
  // O score só ordena candidatos que já passaram pela validação da celebração.
  const strict=smartSuggestions(partId).map(x=>({song:x.s,meta:assistantScore(x.s,partId,selected),confidence:x.confidence}));
  return strict.filter(x=>getSongTitle(x.song)).sort((a,b)=>b.meta.score-a.meta.score).slice(0,limit);
}
function assistantStatus(score){
  if(score>=95)return '🟢 Excelente';
  if(score>=70)return '🟢 Muito adequado';
  if(score>=48)return '🟡 Adequado';
  return '⚪ Possível';
}
function renderProgramAssistant(){
  const box=document.getElementById('assistantList'),summary=document.getElementById('assistantSummary');
  if(!box||!summary)return;
  const info=currentLitInfo(), selected=selectedProgramMap();
  const parts=assistantParts();
  const missing=parts.filter(p=>!selected[p.id]).length;
  const duplicates=Object.entries(selected).filter(([id,t],i,a)=>t&&a.slice(i+1).some(x=>normSmart(x[1])===normSmart(t))).length;
  const sourceDate=document.getElementById('date')?.value||''; const sourceLinks=liturgicalSourceLinks(sourceDate,''); const psd=getOfficialPsalmData(sourceDate);
  summary.innerHTML=`<b>${escSmart(info.title||info.name||'Celebração')}</b>${info.year?' · Ano '+escSmart(info.year):''}${info.color?' · '+escSmart(info.color):''}<br><span class="muted">${missing?`⚠️ ${missing} secção(ões) sem cântico.`:'✅ Todas as secções visíveis têm seleção.'}${duplicates?` · ⚠️ ${duplicates} repetição(ões) detectada(s).`:''}</span>${psd.refrain?`<div style="margin-top:.6rem;padding:.65rem .75rem;border-radius:.55rem;background:#fff;border:1px solid var(--border)"><b>📖 Salmo oficial</b>${psd.ref?' · '+escSmart(psd.ref):''}<br><span>${escSmart(psd.refrain)}</span></div>`:''}<div class="tiny" style="margin-top:.55rem"><b>Fontes:</b> <a href="${sourceLinks.cantoral}" target="_blank" rel="noopener">Cantoral Nacional</a> · <a href="${sourceLinks.laudate}" target="_blank" rel="noopener">Laudate</a> · <a href="${sourceLinks.ocl}" target="_blank" rel="noopener">O Canto na Liturgia</a></div>`;
  box.innerHTML=parts.map(p=>{
    const current=selected[p.id];
    const tops=assistantTop(p.id,3);
    const best=tops[0];
    const currentMeta=current ? assistantScore((songs||[]).find(s=>normSmart(getSongTitle(s))===normSmart(current))||{Título:current},p.id,selected) : null;
    const display=current||'— sem seleção —';
    const reason=best?.confidence ? best.confidence.label+' · '+best.confidence.reason : (best?.meta?.reasons?.slice(0,3).join(' · ')||'Sem correspondência forte no repertório.');
    const evidence = current ? (()=>{ const song=(songs||[]).find(s=>normSmart(getSongTitle(s))===normSmart(current))||{Título:current}; const c=liturgicalConfidence(song,p.id); return `<div class="assistant-evidence"><span>${escSmart(c.label)}</span><button type="button" class="btn secondary tiny" data-assistant-why="${p.id}">Ver razão</button></div>`; })() : '';
    return `<div class="assistant-item"><div><b>${escSmart(p.label)}</b><div class="assistant-reason">Atual: ${escSmart(display)}</div>${evidence}</div><div><div class="assistant-score">${best?best.confidence.label:'⚪ Sem sugestão'}</div><div class="assistant-reason">${best?escSmart(getSongTitle(best.song))+' · '+escSmart(reason):'Reveja o catálogo para esta secção.'}</div>${currentMeta?`<div class="assistant-reason">Seleção atual: ${assistantStatus(currentMeta.score)}</div>`:''}</div><button type="button" class="btn secondary small" data-assistant-use="${p.id}" ${best?'':'disabled'}>${current?'Trocar':'Usar sugestão'}</button></div>`;
  }).join('');
  box.querySelectorAll('[data-assistant-use]').forEach(btn=>btn.onclick=()=>{
    const part=btn.dataset.assistantUse, best=assistantTop(part,1)[0];
    if(best)useSongInPart(part,getSongTitle(best.song),getSongAuthor(best.song));
    renderProgramAssistant();
  });
  box.querySelectorAll('[data-assistant-why]').forEach(btn=>btn.onclick=()=>{
    const part=btn.dataset.assistantWhy, current=selectedProgramMap()[part];
    if(!current) return;
    const song=(songs||[]).find(s=>normSmart(getSongTitle(s))===normSmart(current))||{Título:current};
    openSuggestionWhy(song,part);
  });
}
function fillProgramWithSuggestions(){
  const selected=selectedProgramMap();
  assistantParts().forEach(p=>{
    if(!selected[p.id]){
      const candidates=smartSuggestions(p.id);
      const best=candidates[0];
      const meta=best?assistantScore(best.s,p.id,selected):null;
      if(best && meta && best.confidence && best.confidence.rank>=220 && meta.score>=30){
        useSongInPart(p.id,getSongTitle(best.s),getSongAuthor(best.s),true);
        selected[p.id]=getSongTitle(best.s);
      }
    }
  });
  renderProgramAssistant();
}
function refreshProgramLyricsSourceIndicators(){
  PROGRAM_PARTS.forEach(p=>{
    const el=document.getElementById(p.id);
    const btn=document.querySelector('.program-lyrics-btn[data-part-id=\"'+p.id+'\"]');
    if(!el||!btn)return;
    const title=el.value||'';
    let badge=btn.parentElement?.querySelector('.lyrics-online-mini');
    if(!title){if(badge)badge.remove();return;}
    const song=getSelectedSongForPart(p.id)||getSongByTitle(title);
    if(!badge){badge=document.createElement('span');badge.className='tiny muted lyrics-online-mini';btn.parentElement?.appendChild(badge);}
    const la=getLaudateUrl(song||title,getSongAuthor(song));
    const direct=!!getLaudateDirectUrl(song||title,getSongAuthor(song));
    badge.innerHTML=(direct?'📖 ':'🌐 ')+'<a href=\"'+escSmart(la)+'\" target=\"_blank\" rel=\"noopener noreferrer\">'+escSmart(getLaudateSearchLabel(song||title,getSongAuthor(song)))+'</a>';
  });
}

function setupProgramAssistant(){
  document.getElementById('assistantFillBtn')?.addEventListener('click',fillProgramWithSuggestions);
  document.getElementById('assistantLaudateBtn')?.addEventListener('click',openLaudateSundayForCurrentDate);
  document.getElementById('shareProgramWhatsAppBtn')?.addEventListener('click',()=>shareProgram('whatsapp'));
  document.getElementById('shareProgramEmailBtn')?.addEventListener('click',()=>shareProgram('email'));
  document.getElementById('shareProgramDossierBtn')?.addEventListener('click',()=>shareProgram('share'));
  assistantParts().forEach(p=>{
    const el=document.getElementById(p.id);
    el?.addEventListener('change',()=>{
      el.dataset.selectedAuthor=el.selectedOptions?.[0]?.dataset?.author||el.dataset.selectedAuthor||'';
      autoApplyLyricsToPart(p.id);refreshProgramLyricsSourceIndicators();renderProgramAssistant();
    });
    el?.addEventListener('input',()=>renderProgramAssistant());
  });
  document.addEventListener('coro:catalog-updated',()=>{renderProgramAssistant();refreshProgramLyricsSourceIndicators();});
  refreshProgramLyricsSourceIndicators();
  renderProgramAssistant();
}


function buildProgramShareData(){
  const record=collectProgramFromForm();
  if(!record.date)return null;
  const info=getLiturgicalInfo(record.date)||{};
  const lines=[`🎵 ${record.title||'Programa litúrgico'}`,`📅 ${new Date(record.date+'T00:00:00').toLocaleDateString('pt-PT')}`,info.year?`📖 Ano ${info.year}`:'',record.salmista?`🎙️ Salmista: ${record.salmista}`:'',record.organista?`🎹 Organista: ${record.organista}`:'',''];
  const songsForProgram=[];
  PROGRAM_PARTS.forEach(p=>{
    const title=record.program?.[p.id]; if(!title)return;
    const song=getSongByTitle(title,record.programAuthors?.[p.id]||'')||{};
    const author=getSongAuthor(song)||record.programAuthors?.[p.id]||'';
    const links=getSongOnlineLinks(song||title,author);
    const score=record.programScores?.[p.id]||getSongScoreUrl(song,author);
    songsForProgram.push({part:p.label,title,author,lyrics:getSongLyrics(song||title,author),score,links});
    lines.push(`${p.label}: ${title}${author?' — '+author:''}`);
    if(score)lines.push(`📄 Partitura: ${score}`);
  });
  return {record,info,songs:songsForProgram,text:lines.filter(Boolean).join('\n')};
}
function buildProgramDossierHtml(data){
  const logo=new URL('logo_light.png',location.href).href;
  const r=data.record, info=data.info||{};
  return `<!doctype html><html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escSmart(r.title||'Programa litúrgico')}</title><style>body{font-family:Arial,sans-serif;max-width:900px;margin:auto;padding:24px;color:#172033}header{display:flex;gap:18px;align-items:center;border-bottom:2px solid #dbe4ef;padding-bottom:16px}header img{width:90px;height:90px;object-fit:contain}h1{margin:0 0 4px}h2{margin:22px 0 6px;color:#1769aa}.song{padding:12px 0;border-bottom:1px solid #e5e7eb}.meta{color:#667085;font-size:13px}.lyrics{white-space:pre-wrap;line-height:1.55;margin-top:8px}.links a{margin-right:12px;font-size:13px}a{color:#1769aa}</style></head><body><header><img src="${escSmart(logo)}"><div><h1>${escSmart(r.title||'Programa litúrgico')}</h1><div>${escSmart(r.date||'')}${info.year?' · Ano '+escSmart(info.year):''}</div>${r.salmista?'<div>🎙️ '+escSmart(r.salmista)+'</div>':''}${r.organista?'<div>🎹 '+escSmart(r.organista)+'</div>':''}</div></header><p>${escSmart(r.extraTheme||'')}</p>${data.songs.map(x=>`<section class="song"><h2>${escSmart(x.part)} — ${escSmart(x.title)}</h2><div class="meta">${escSmart(x.author||'Autor não indicado')}</div>${x.lyrics?`<div class="lyrics">${escSmart(x.lyrics)}</div>`:'<div class="meta">Letra não guardada localmente — consultar fonte online.</div>'}<div class="links">${x.score?`<a href="${escSmart(x.score)}" target="_blank">📄 Abrir partitura</a>`:''}<a href="${escSmart(x.links.laudate)}" target="_blank">📖 Laudate</a><a href="${escSmart(x.links.cantolico)}" target="_blank">✝️ Cantólico</a><a href="${escSmart(x.links.canto)}" target="_blank">🎼 O Canto na Liturgia</a></div></section>`).join('')}<footer style="margin-top:24px;font-size:12px;color:#667085">Coro Paroquial São João Batista de Rio Caldo · Gerado pelo Coro Litúrgico 5.0</footer></body></html>`;
}
function shareProgram(mode='share'){
  const data=buildProgramShareData(); if(!data){alert('Preencha primeiro a data e prepare o programa.');return;}
  const subject='Programa litúrgico — '+(data.record.title||data.record.date);
  if(mode==='whatsapp'){window.open('https://wa.me/?text='+encodeURIComponent(data.text),'_blank','noopener');return;}
  if(mode==='email'){window.location.href='mailto:?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(data.text);return;}
  const html=buildProgramDossierHtml(data);
  const blob=new Blob([html],{type:'text/html;charset=utf-8'});
  if(navigator.share){const file=new File([blob],`Programa_${data.record.date||'liturgico'}.html`,{type:'text/html'});navigator.share({title:subject,text:data.text,files:[file]}).catch(()=>{});return;}
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`Programa_${data.record.date||'liturgico'}.html`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  alert('Foi criado um dossier HTML com o programa, letras disponíveis e ligações para as partituras. Abra-o e use Imprimir/Guardar em PDF ou partilhe o ficheiro.');
}
function saveProgram() {
  const record = collectProgramFromForm();
  
  if (!record.date) {
    alert('Por favor preencha a data.');
    return;
  }
  
  loadHistory();
  
  // Remove duplicado
  history = history.filter(h => h.date !== record.date);
  
  // Adiciona novo
  history.unshift(record);
  
  // Limita a 50
  if (history.length > 50) {
    history = history.slice(0, 50);
  }
  
  saveHistory();
  recordSongUsage(record);
  renderHistory();
  renderCalendar();
  populateRehearsalPrograms();
  renderDashboardV3();
  alert('Programa guardado!');
}

function renderHistory() {
  const container = document.getElementById('historyContainer');
  if (!container) return;
  
  loadHistory();
  
  if (!history.length) {
    container.innerHTML = '<p>Nenhum programa guardado.</p>';
    return;
  }
  
  let html = '<div class="history-list">';
  
  history.forEach((record, index) => {
    const dateObj = new Date(record.date + 'T00:00:00');
    const formatted = dateObj.toLocaleDateString('pt-PT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    
    html += `
      <div class="history-item" style="padding: 1rem; border: 1px solid #ddd; border-radius: 0.5rem; margin-bottom: 0.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: start;">
          <div>
            <strong>${formatted}</strong><br>
            <span style="color: #666;">${record.title}</span>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn small" onclick="loadHistoryItem(${index})">📝 Carregar</button>
            <button class="btn small secondary" onclick="deleteHistoryItem(${index})">🗑️</button>
          </div>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  container.innerHTML = html;
}

window.loadHistoryItem = function(index) {
  loadHistory();
  if (history[index]) {
    applyProgramToForm(history[index]);
    // Muda para tab Programa
    const programTab = document.querySelector('button[data-tab="tab-programa"]');
    if (programTab) programTab.click();
    alert('Programa carregado!');
  }
};

window.deleteHistoryItem = function(index) {
  if (!confirm('Eliminar este programa?')) return;
  
  loadHistory();
  history.splice(index, 1);
  saveHistory();
  renderHistory();
};

// ============================================
// FOLHETOS GUARDADOS
// ============================================

function loadSavedLeaflets() {
  try {
    savedLeaflets = JSON.parse(localStorage.getItem('coroLeaflets') || '[]');
  } catch (e) {
    savedLeaflets = [];
  }
  return savedLeaflets;
}

function saveSavedLeaflets() {
  localStorage.setItem('coroLeaflets', JSON.stringify(savedLeaflets));
}

function saveCurrentLeaflet() {
  const record = collectProgramFromForm();
  
  if (!record.date) {
    alert('Por favor preencha a data primeiro.');
    return;
  }
  
  loadSavedLeaflets();
  
  const leaflet = {
    id: Date.now(),
    date: record.date,
    title: record.title,
    html: buildLeafletHtml(record),
    savedAt: new Date().toISOString()
  };
  
  savedLeaflets.unshift(leaflet);
  
  if (savedLeaflets.length > 30) {
    savedLeaflets = savedLeaflets.slice(0, 30);
  }
  
  saveSavedLeaflets();
  alert('Folheto guardado!');
  renderSavedLeaflets();
}

function renderSavedLeaflets() {
  const container = document.getElementById('savedLeafletsContainer');
  if (!container) return;
  
  loadSavedLeaflets();
  
  if (!savedLeaflets.length) {
    container.innerHTML = '<p>Nenhum folheto guardado.</p>';
    return;
  }
  
  let html = '<div class="leaflets-grid">';
  
  savedLeaflets.forEach(leaflet => {
    const dateObj = new Date(leaflet.date + 'T00:00:00');
    const formatted = dateObj.toLocaleDateString('pt-PT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    
    html += `
      <div class="leaflet-card" style="border: 1px solid #ddd; padding: 1rem; border-radius: 0.5rem;">
        <strong>${formatted}</strong><br>
        <span style="color: #666; font-size: 0.9rem;">${leaflet.title}</span>
        <div style="margin-top: 0.5rem; display: flex; gap: 0.5rem;">
          <button class="btn small" onclick="viewLeaflet(${leaflet.id})">👁️ Ver</button>
          <button class="btn small secondary" onclick="deleteLeaflet(${leaflet.id})">🗑️</button>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  container.innerHTML = html;
}

window.viewLeaflet = function(id) {
  loadSavedLeaflets();
  const leaflet = savedLeaflets.find(l => l.id === id);
  if (!leaflet) return;
  
  const modal = document.getElementById('leafletModalBackdrop');
  const content = document.getElementById('leafletModalContent');
  
  if (modal && content) {
    content.innerHTML = leaflet.html;
    modal.hidden = false;
  }
};

window.deleteLeaflet = function(id) {
  if (!confirm('Eliminar este folheto?')) return;
  
  loadSavedLeaflets();
  savedLeaflets = savedLeaflets.filter(l => l.id !== id);
  saveSavedLeaflets();
  renderSavedLeaflets();
};

// ============================================
// MODAL DO FOLHETO
// ============================================

function initLeafletModal() {
  const saveBtn = document.getElementById('saveCurrentLeafletBtn');
  const closeBtn = document.getElementById('leafletModalCloseBtn');
  const printBtn = document.getElementById('leafletModalPrintBtn');
  
  if (saveBtn) {
    saveBtn.addEventListener('click', saveCurrentLeaflet);
  }
  
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      const modal = document.getElementById('leafletModalBackdrop');
      if (modal) modal.hidden = true;
    });
  }
  
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      const content = document.getElementById('leafletModalContent');
      if (content) {
        const printWindow = window.open('', '', 'width=800,height=600');
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Folheto</title>
            <style>
              body { font-family: 'Noto Serif', serif; padding: 2rem; }
              @media print {
                body { padding: 1rem; }
              }
            </style>
          </head>
          <body>
            ${content.innerHTML}
          </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    });
  }
}

// ============================================
// HISTÓRICO DE USO DE CÂNTICOS
// ============================================

function recordSongUsage(record) {
  try { songUsageHistory = JSON.parse(localStorage.getItem('coroSongUsage') || '[]'); } catch (e) { songUsageHistory = []; }
  if (!Array.isArray(songUsageHistory)) songUsageHistory=[];
  const date=record.date;
  // Regravar o mesmo domingo substitui os usos desse domingo, evitando contagens duplicadas.
  const partLabels=new Set(PROGRAM_PARTS.map(p=>p.label));
  songUsageHistory=songUsageHistory.filter(u=>!(u.date===date && partLabels.has(u.part)));
  PROGRAM_PARTS.forEach(part => {
    const songTitle=record.program?.[part.id];
    if(songTitle){
      songUsageHistory.push({song:songTitle,date,part:part.label,liturgicalTitle:record.title,timestamp:new Date().toISOString()});
    }
  });
  if(songUsageHistory.length>500) songUsageHistory=songUsageHistory.slice(-500);
  localStorage.setItem('coroSongUsage',JSON.stringify(songUsageHistory));
}

window.viewSongUsage = function(songTitle) {
  try {
    songUsageHistory = JSON.parse(localStorage.getItem('coroSongUsage') || '[]');
  } catch (e) {
    songUsageHistory = [];
  }
  
  const usage = songUsageHistory.filter(u => u.song === songTitle);
  
  const modal = document.getElementById('songUsageModal');
  const title = document.getElementById('songUsageModalTitle');
  const content = document.getElementById('songUsageModalContent');
  
  if (!modal || !title || !content) return;
  
  title.textContent = `Histórico: ${songTitle}`;
  
  if (!usage.length) {
    content.innerHTML = '<p>Este cântico ainda não foi utilizado.</p>';
  } else {
    let html = '<div style="max-height: 400px; overflow-y: auto;">';
    usage.reverse().forEach(u => {
      const dateObj = new Date(u.date + 'T00:00:00');
      const formatted = dateObj.toLocaleDateString('pt-PT', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      html += `
        <div style="padding: 0.75rem; border-bottom: 1px solid #eee;">
          <strong>${formatted}</strong><br>
          <span style="color: #666;">${u.liturgicalTitle}</span><br>
          <span style="font-size: 0.85rem; color: #999;">Usado como: ${u.part}</span>
        </div>
      `;
    });
    html += '</div>';
    content.innerHTML = html;
  }
  
  modal.style.display = 'flex';
};

// Fechar modal de histórico
document.addEventListener('click', (e) => {
  if (e.target.id === 'songUsageModalClose') {
    document.getElementById('songUsageModal').style.display = 'none';
  }
});

// ============================================
// CÂNTICOS PERSONALIZADOS
// ============================================

function renderCustomSongs(){
  const c=document.getElementById('customSongsContainer'); if(!c)return;
  if(!customSongs.length){c.innerHTML='<p class="small muted">Ainda não existem cânticos personalizados.</p>';return;}
  c.innerHTML=customSongs.map(s=>`<div class="card" style="padding:.65rem;margin:.35rem 0;display:flex;justify-content:space-between;gap:.5rem;align-items:center"><div><b>${escSmart(s.title)}</b><div class="small muted">${escSmart(s.author||'')} ${s.section?'· '+escSmart(s.section):''}</div></div><div style="display:flex;gap:.35rem"><button type="button" class="btn small secondary" data-custom-view="${s.id}">Ver</button><button type="button" class="btn small secondary" data-custom-delete="${s.id}">Eliminar</button></div></div>`).join('');
  c.querySelectorAll('[data-custom-view]').forEach(b=>b.addEventListener('click',()=>window.viewCustomSong(Number(b.dataset.customView))));
  c.querySelectorAll('[data-custom-delete]').forEach(b=>b.addEventListener('click',()=>window.deleteCustomSong(Number(b.dataset.customDelete))));
}

function loadCustomSongs() {
  try {
    customSongs = JSON.parse(localStorage.getItem('coroCustomSongs') || '[]');
  } catch (e) {
    customSongs = [];
  }
  populateProgramSelects();
  renderCustomSongs();
}

function saveCustomSongs() {
  localStorage.setItem('coroCustomSongs', JSON.stringify(customSongs));
}

function initCustomSongs() {
  const openBtn = document.getElementById('addCustomSongBtn');
  const closeBtn = document.getElementById('customSongModalClose');
  const modal = document.getElementById('customSongModal');
  const form = document.getElementById('customSongForm');
  
  if (openBtn) {
    openBtn.addEventListener('click', () => {
      if (modal) modal.style.display = 'flex';
    });
  }
  
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (modal) modal.style.display = 'none';
      form.reset();
      document.getElementById('filePreview').style.display = 'none';
    });
  }
  
  // Upload de ficheiro
  const uploadBtn = document.getElementById('uploadFileBtn');
  const fileInput = document.getElementById('customSongFile');
  
  if (uploadBtn && fileInput) {
    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleCustomSongFile);
  }
  
  // Câmara
  const cameraBtn = document.getElementById('takePictureBtn');
  const cameraInput = document.getElementById('customSongCamera');
  
  if (cameraBtn && cameraInput) {
    cameraBtn.addEventListener('click', () => cameraInput.click());
    cameraInput.addEventListener('change', handleCustomSongFile);
  }
  
  // Remover ficheiro
  const removeBtn = document.getElementById('removeFileBtn');
  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      fileInput.value = '';
      cameraInput.value = '';
      document.getElementById('filePreview').style.display = 'none';
      delete window.customSongFileData;
    });
  }
  
  // Submit form
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      saveCustomSong();
    });
  }
}

function handleCustomSongFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  // Validação de tamanho
  if (file.size > 5 * 1024 * 1024) {
    alert('Ficheiro muito grande! Máximo 5MB.');
    e.target.value = '';
    return;
  }
  
  // Preview
  document.getElementById('fileName').textContent = file.name;
  document.getElementById('fileSize').textContent = formatFileSize(file.size);
  document.getElementById('filePreview').style.display = 'block';
  
  const reader = new FileReader();
  reader.onload = (e) => {
    window.customSongFileData = {
      name: file.name,
      type: file.type,
      data: e.target.result
    };
    
    // Preview de imagem
    if (file.type.startsWith('image/')) {
      const img = document.getElementById('imagePreview');
      img.src = e.target.result;
      img.style.display = 'block';
    }
  };
  reader.readAsDataURL(file);
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function saveCustomSong() {
  const title = document.getElementById('customSongTitle').value.trim();
  const section = document.getElementById('customSongSection').value;
  const author = document.getElementById('customSongAuthor').value.trim();
  const notes = document.getElementById('customSongNotes').value.trim();
  
  if (!title) {
    alert('Por favor indique o título.');
    return;
  }
  
  loadCustomSongs();
  
  const song = {
    id: Date.now(),
    title,
    section,
    author,
    notes,
    file: window.customSongFileData || null,
    createdAt: new Date().toISOString()
  };
  
  customSongs.push(song);
  saveCustomSongs();
  
  document.getElementById('customSongModal').style.display = 'none';
  document.getElementById('customSongForm').reset();
  document.getElementById('filePreview').style.display = 'none';
  delete window.customSongFileData;
  
  populateProgramSelects();
  renderCustomSongs();
  renderSongsTable();
  alert('Cântico personalizado guardado!');
}

window.viewCustomSong = function(id) {
  loadCustomSongs();
  const song = customSongs.find(s => s.id === id);
  if (!song) return;
  
  const modal = document.getElementById('viewCustomSongModal');
  
  document.getElementById('viewCustomSongTitle').textContent = song.title;
  document.getElementById('viewSongSection').textContent = song.section || '-';
  document.getElementById('viewSongAuthor').textContent = song.author || '-';
  
  if (song.notes) {
    document.getElementById('viewSongNotes').textContent = song.notes;
    document.getElementById('viewSongNotesContainer').style.display = 'block';
  } else {
    document.getElementById('viewSongNotesContainer').style.display = 'none';
  }
  
  if (song.file) {
    document.getElementById('viewSongFileContainer').style.display = 'block';
    
    // Download
    document.getElementById('downloadSongFileBtn').onclick = () => {
      const a = document.createElement('a');
      a.href = song.file.data;
      a.download = song.file.name;
      a.click();
    };
    
    // Abrir em nova aba
    document.getElementById('openSongFileBtn').onclick = () => {
      window.open(song.file.data, '_blank');
    };
    
    // Viewer
    if (song.file.type === 'application/pdf') {
      document.getElementById('pdfViewer').style.display = 'block';
      document.getElementById('imageViewer').style.display = 'none';
      document.getElementById('pdfEmbed').src = song.file.data;
    } else if (song.file.type.startsWith('image/')) {
      document.getElementById('imageViewer').style.display = 'block';
      document.getElementById('pdfViewer').style.display = 'none';
      document.getElementById('imageView').src = song.file.data;
    }
  } else {
    document.getElementById('viewSongFileContainer').style.display = 'none';
  }
  
  modal.style.display = 'flex';
};

window.deleteCustomSong = function(id) {
  if (!confirm('Eliminar este cântico personalizado?')) return;
  
  loadCustomSongs();
  customSongs = customSongs.filter(s => s.id !== id);
  saveCustomSongs();
  populateProgramSelects();
  renderCustomSongs();
  renderSongsTable();
};

// Fechar modal de visualização
document.addEventListener('click', (e) => {
  if (e.target.id === 'viewCustomSongClose') {
    document.getElementById('viewCustomSongModal').style.display = 'none';
  }
});


function renderVideos(){const c=document.getElementById('videosContainer');if(!c)return;const q=(document.getElementById('videoSearch')?.value||'').toLowerCase(),sec=(document.getElementById('videoSection')?.value||'').toLowerCase();const arr=(songs||[]).filter(s=>(s.Video||s.video)&&(!q||getSongTitle(s).toLowerCase().includes(q))&&(!sec||String(s.Tema||'').toLowerCase().includes(sec)));c.innerHTML=arr.map(s=>'<div class="card"><b>'+getSongTitle(s)+'</b><div class="small">'+getSongAuthor(s)+'</div><p><a class="btn" href="'+(s.Video||s.video)+'" target="_blank">▶️ Abrir vídeo</a></p></div>').join('')||'<p class="small muted">Não há vídeos associados ao catálogo atual.</p>';}

// Referências litúrgicas verificadas no Secretariado Nacional de Liturgia (Portugal).
window.CORO_READINGS_2026={
 '2026-09-06':{l1:'Ez 33, 7-9; Sl 94 (95), 1-2. 6-7. 8-9',l2:'Rm 13, 8-10',ev:'Mt 18, 15-20',refrain:'Não fecheis os vossos corações'},
 '2026-09-13':{l1:'Sir 27, 33 – 28, 9; Sl 102 (103), 1-2. 3-4. 9-10. 11-12',l2:'Rm 14, 7-8',ev:'Mt 18, 21-35',refrain:'O Senhor é clemente e compassivo, paciente e cheio de bondade'},
 '2026-09-20':{l1:'Is 55, 6-9; Sl 144 (145), 2-3. 8-9. 17-18',l2:'Flp 1, 20c-24. 27a',ev:'Mt 20, 1-16a',refrain:'O Senhor está perto de quantos O invocam'},
 '2026-09-27':{l1:'Ez 18, 25-28; Sl 24 (25), 4-5. 6-7. 8-9',l2:'Flp 2, 1-11 ou Flp 2, 1-5',ev:'Mt 21, 28-32',refrain:'Lembrai-Vos, Senhor, da vossa misericórdia'},
 '2026-10-04':{l1:'Is 5, 1-7; Sl 79 (80), 9 e 12. 13-14. 15-16. 19-20',l2:'Flp 4, 6-9',ev:'Mt 21, 33-43',refrain:'A vinha do Senhor é a casa de Israel'},
 '2026-10-11':{l1:'Is 25, 6-10a; Sl 22 (23), 1-3a. 3b-4. 5. 6',l2:'Flp 4, 12-14. 19-20',ev:'Mt 22, 1-14 ou Mt 22, 1-10',refrain:'Habitarei para sempre na casa do Senhor'}
};

function initSongEditModal(){
  const modal=document.getElementById('songEditModal');
  const partSel=document.getElementById('songEditPartSelect');
  if(partSel) partSel.innerHTML=PROGRAM_PARTS.map(p=>`<option value="${p.id}">${escSmart(p.label)}</option>`).join('');
  document.getElementById('songEditSaveInsertBtn')?.addEventListener('click',()=>{
    const part=partSel?.value, title=document.getElementById('songEditTitle')?.value.trim();
    if(!part||!title){alert('Indique o título e a secção.');return;}
    const sel=document.getElementById(part); if(sel){let opt=Array.from(sel.options).find(o=>o.value===title);if(!opt){opt=document.createElement('option');opt.value=title;opt.textContent=title;sel.appendChild(opt);}sel.value=title;sel.dispatchEvent(new Event('change'));}
    if(document.getElementById('songEditLyrics')?.value) localStorage.setItem('coroLyrics_'+normSmart(title),document.getElementById('songEditLyrics').value);
    modal.hidden=true;
  });
  document.getElementById('lyricsModalSave')?.addEventListener('click',()=>{
    const title=document.getElementById('lyricsModalTitle')?.textContent?.trim();
    const editor=document.getElementById('lyricsEditor');
    if(title && editor){const song=getSongByTitle(title);saveSongLyrics(title,getSongAuthor(song),editor.innerHTML||editor.textContent||'');}
    const m=document.getElementById('lyricsModal'); if(m)m.style.display='none';
  });
}

function initLegacyModals(){
  document.getElementById('leafletViewClose')?.addEventListener('click',()=>{const m=document.getElementById('leafletViewModal');if(m)m.style.display='none';});
  document.getElementById('leafletViewPrint')?.addEventListener('click',()=>{const c=document.getElementById('leafletViewContent');if(c)printHtml(c.innerHTML,'Folheto');});
  document.getElementById('lyricsModalCancel')?.addEventListener('click',()=>{const m=document.getElementById('lyricsModal');if(m)m.style.display='none';});
  document.getElementById('lyricsSearchCloseBtn')?.addEventListener('click',()=>{const m=document.getElementById('lyricsSearchBackdrop');if(m)m.hidden=true;});
  document.getElementById('songEditCancelBtn')?.addEventListener('click',()=>{const m=document.getElementById('songEditModal');if(m)m.hidden=true;});
}

// ============================================
// FUNCIONALIDADES DA INTERFACE / COMPATIBILIDADE
// ============================================

function initProgramForm(){
  const form=document.getElementById('programForm');
  if(form) form.addEventListener('submit',e=>{e.preventDefault();saveProgram();});
}

function getProgramForDate(date){
  loadHistory();
  return history.find(h=>h.date===date)||null;
}

function populateRehearsalPrograms(){
  const sel=document.getElementById('rehearsalProgram'); if(!sel)return;
  loadHistory();
  const current=sel.value;
  sel.innerHTML='<option value="">— escolher domingo —</option>'+history.map((h,i)=>`<option value="${i}">${escSmart(h.date)} — ${escSmart(h.title||'Programa')}</option>`).join('');
  if(current)sel.value=current;
}

function buildRehearsalMessage(){
  const sel=document.getElementById('rehearsalProgram');
  const date=document.getElementById('rehearsalDate')?.value||'';
  const time=document.getElementById('rehearsalTime')?.value||'';
  const place=document.getElementById('rehearsalPlace')?.value||'';
  const notes=document.getElementById('rehearsalNotes')?.value||'';
  loadHistory();
  const record=(sel&&sel.value!==''?history[Number(sel.value)]:null)||getProgramForDate(date);
  if(!record) return {record:null,text:'Selecione um programa/domingo.'};
  const lines=[`🎵 Ensaio — ${record.title||'Programa'}`,record.date?`📅 Celebração: ${new Date(record.date+'T00:00:00').toLocaleDateString('pt-PT')}`:'',time?`🕒 Hora: ${time}`:'',place?`📍 Local: ${place}`:'','',...PROGRAM_PARTS.filter(p=>record.program?.[p.id]).map(p=>`${p.label}: ${record.program[p.id]}`),notes?'':null,notes?`\n📝 ${notes}`:''].filter(Boolean);
  return {record,text:lines.join('\n')};
}

function initRehearsal(){
  populateRehearsalPrograms();
  const date=document.getElementById('rehearsalDate');
  if(date && !date.value){const d=new Date(); d.setDate(d.getDate()+1); date.value=d.toISOString().split('T')[0];}
  document.getElementById('rehearsalWhatsAppBtn')?.addEventListener('click',()=>{const r=buildRehearsalMessage(); if(!r.record){alert(r.text);return;} window.open('https://wa.me/?text='+encodeURIComponent(r.text),'_blank','noopener');});
  document.getElementById('rehearsalEmailBtn')?.addEventListener('click',()=>{const r=buildRehearsalMessage(); if(!r.record){alert(r.text);return;} const subject=encodeURIComponent('Ensaio — '+(r.record.title||'Programa')); window.location.href=`mailto:?subject=${subject}&body=${encodeURIComponent(r.text)}`;});
}

function initClearActions(){
  document.getElementById('clearAllHistoryBtn')?.addEventListener('click',()=>{
    if(!confirm('Eliminar TODO o histórico de domingos guardados neste dispositivo?'))return;
    localStorage.removeItem('coroHistory'); localStorage.removeItem('coroSongUsage'); localStorage.removeItem('coroSongUsage_v1'); history=[]; songUsageHistory=[]; renderHistory(); renderCalendar(); populateRehearsalPrograms(); renderSongsTable(); alert('Histórico eliminado.');
  });
  document.getElementById('clearAllLeafletsBtn')?.addEventListener('click',()=>{
    if(!confirm('Eliminar TODOS os folhetos guardados neste dispositivo?'))return;
    localStorage.removeItem('coroLeaflets'); savedLeaflets=[]; renderSavedLeaflets(); alert('Folhetos eliminados.');
  });
}

function initLegacyProgramButtons(){
  document.querySelectorAll('.program-lyrics-btn').forEach(btn=>btn.addEventListener('click',()=>{
    const part=btn.dataset.partId, title=document.getElementById(part)?.value;
    if(!title){alert('Escolha primeiro um cântico.');return;}
    const modal=document.getElementById('programLyricsModal');
    if(!modal)return;
    const titleEl=document.getElementById('programLyricsModalTitle'); const songEl=document.getElementById('programLyricsModalSong'); const ta=document.getElementById('programLyricsTextarea');
    if(titleEl)titleEl.textContent='Editar letra — '+title; if(songEl)songEl.textContent=title;
    const song=getSelectedSongForPart(part)||getSongByTitle(title); const lyrics=getSongLyrics(song||title); if(ta)ta.value=lyrics;
    const online=document.getElementById('programLyricsOnline'); if(online) online.innerHTML=getLyricsSourceHtml(song||title,getSongAuthor(song));
    modal.hidden=false; modal.dataset.partId=part;
  }));
  document.getElementById('programLyricsCancelBtn')?.addEventListener('click',()=>{document.getElementById('programLyricsModal').hidden=true;});
  document.getElementById('programLyricsSaveBtn')?.addEventListener('click',()=>{const modal=document.getElementById('programLyricsModal'),part=modal?.dataset.partId,title=document.getElementById(part)?.value,ta=document.getElementById('programLyricsTextarea');if(!modal||!title)return;const song=getSelectedSongForPart(part)||getSongByTitle(title); saveSongLyrics(title,getSongAuthor(song),ta?.value||'');modal.hidden=true;alert('Letra guardada neste dispositivo.');});
  document.querySelectorAll('.program-media-btn').forEach(btn=>btn.addEventListener('click',()=>{
    const title=document.getElementById(btn.dataset.partId)?.value; if(!title){alert('Escolha primeiro um cântico.');return;}
    const song=(songs||[]).find(s=>normSmart(getSongTitle(s))===normSmart(title));
    const url=song?.Video||song?.video||'';
    if(url) window.open(url,'_blank','noopener'); else alert('Este cântico não tem vídeo associado no catálogo.');
  }));
}

function buildAssemblyLeaflet(includeLyrics=true){
  const record=collectProgramFromForm();
  let html=buildLeafletHtml(record);
  if(!includeLyrics){return html;}
  const parts=PROGRAM_PARTS.filter(p=>record.program[p.id]);
  const lyrics=parts.map(p=>{const t=record.program[p.id], song=getSelectedSongForPart(p.id)||getSongByTitle(t), l=getSongLyrics(song||t);return l?`<div style="margin:1rem 0"><strong>${escSmart(p.label)} — ${escSmart(t)}</strong><div style="white-space:pre-wrap;margin-top:.4rem">${escSmart(l)}</div></div>`:''}).join('');
  return html.replace('</div></div>',lyrics+'</div></div>');
}
function initAssemblyButtons(){
  document.getElementById('assemblySheetBtn')?.addEventListener('click',()=>printHtml(buildAssemblyLeaflet(true),'Folheto da assembleia'));
  document.getElementById('assemblySheetBtnNoLyrics')?.addEventListener('click',()=>printHtml(buildAssemblyLeaflet(false),'Folheto da assembleia'));
}
function printHtml(content,title='Coro Litúrgico'){
  const w=window.open('','_blank','width=900,height=800'); if(!w){alert('O navegador bloqueou a janela de impressão. Permita pop-ups para este site.');return;}
  w.document.write(`<!doctype html><html lang="pt"><head><meta charset="utf-8"><title>${escSmart(title)}</title><style>body{font-family:Arial,sans-serif;padding:20mm;line-height:1.5} @media print{body{padding:10mm}}</style></head><body>${content}</body></html>`);w.document.close();w.focus();setTimeout(()=>w.print(),250);
}

function initPartituraSearch(){
  const input=document.getElementById('partituraSearch'); if(!input)return;
  let box=document.getElementById('partituraSearchResults');
  if(!box){box=document.createElement('div');box.id='partituraSearchResults';box.className='small';input.parentElement?.appendChild(box);}
  const render=()=>{const q=normSmart(input.value);if(!q){box.innerHTML='';return;}const arr=(songs||[]).filter(s=>normSmart(getSongTitle(s)).includes(q)||normSmart(s.Partitura||'').includes(q)).slice(0,20);box.innerHTML=arr.length?'<div style="margin-top:.75rem">'+arr.map(s=>{const p=s.Partitura||'';return `<div class="card" style="padding:.5rem;margin:.35rem 0"><b>${escSmart(getSongTitle(s))}</b> — ${escSmart(getSongAuthor(s)||'')} ${p?`<a href="${escSmart(p)}" target="_blank" rel="noopener">📄 Abrir</a>`:'<span class="muted">⚠️ Partitura não associada</span>'}</div>`}).join('')+'</div>':'<p class="muted">Nenhum resultado no catálogo local.</p>';};
  input.addEventListener('input',render);
}

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('🎵 Gestão Litúrgica - Iniciando...');
  
  // Sistemas principais
  initTabs();
  initMoreNav();
  initTheme();
  initDashboardV3();
  initCalendar();
  initProgramMomentPicker();
  updateDashboard();
  
  // Programa
  const dateInput = document.getElementById('date');
  if (dateInput) {
    // Define data de hoje
    dateInput.value = new Date().toISOString().split('T')[0];
    updateLiturgicalFromDate();
    
    dateInput.addEventListener('change', ()=>{updateLiturgicalFromDate();renderProgramAssistant();});
  }
  
  // Atualiza preview ao mudar qualquer campo
  PROGRAM_PARTS.forEach(part => {
    const input = document.getElementById(part.id);
    if (input) {
      input.addEventListener('change', ()=>{ updatePreview(); renderProgramAssistant(); });
      input.addEventListener('input', ()=>renderProgramAssistant());
    }
  });
  
  // Guardar programa pelo submit real do formulário
  initProgramForm();

  // Imagem do domingo
  initSundayImage();
  
  // Catálogo
  loadCsvFromGoogleSheets();
  window.setInterval(()=>{ if(document.visibilityState==='visible') loadCsvFromGoogleSheets(true); }, 300000);
  document.getElementById('videoSearch')?.addEventListener('input',renderVideos); document.getElementById('videoSection')?.addEventListener('change',renderVideos);
  ['songSearch','filterAuthor','filterTheme','filterMoment','filterCycle','filterCelebration','filterLibraryStatus'].forEach(id=>document.getElementById(id)?.addEventListener('input',renderSongsTable));
  ['filterAuthor','filterTheme','filterMoment','filterCycle','filterCelebration','filterLibraryStatus'].forEach(id=>document.getElementById(id)?.addEventListener('change',renderSongsTable));
  
  // Folhetos
  initLeafletModal();
  initAssemblyButtons();
  initLegacyProgramButtons();
  initCatalogControls();
  initPartituraSearch();
  initRehearsal();
  initClearActions();
  initLegacyModals();
  initSongEditModal();
  initSongProfile();
  initSongMetadataEditor();
  
  // Cânticos personalizados
  loadCustomSongs();
  initCustomSongs();
  setupSmartSelectors();
  initCelebrationVariant();
  initSuggestionWhy();
  PROGRAM_PARTS.forEach(p=>{
    const el=document.getElementById(p.id);
    if(el){el.dataset.selectedAuthor=el.selectedOptions?.[0]?.dataset?.author||el.dataset.selectedAuthor||'';autoApplyLyricsToPart(p.id);}
  });
  setupProgramAssistant();
  loadHistory();
  initPeople();
  populateRehearsalPrograms();
  console.log('✅ Aplicação carregada!');
});

// ============================================
// CORO LITÚRGICO 4.4 — EDITOR VISUAL A4
// ============================================
let leafletV4Draft = null;

function leafletV4CurrentImage(){
  return localStorage.getItem('coroSundayImage') || '';
}

function leafletV4DefaultItems(includeLyrics=true){
  const record=collectProgramFromForm();
  return PROGRAM_PARTS.filter(p=>record.program?.[p.id]).map((p,index)=>{
    const title=record.program[p.id]||'';
    const song=getSelectedSongForPart(p.id)||getSongByTitle(title);
    const author=record.programAuthors?.[p.id] || getSongAuthor(song);
    const lyrics=includeLyrics ? getSongLyrics(song||title) : '';
    return {id:`leaflet-${p.id}-${index}`,partId:p.id,moment:p.label,title,author,lyrics,include:true};
  });
}

function leafletV4RenderList(){
  const list=document.getElementById('leafletEditorList');
  if(!list||!leafletV4Draft)return;
  const items=leafletV4Draft.items||[];
  list.innerHTML=items.length ? items.map((item,i)=>`
    <article class="leaflet-editor-item ${item.include?'':'is-off'}" data-index="${i}">
      <div class="leaflet-editor-item-head">
        <div class="leaflet-editor-fields">
          <input class="leaflet-editor-title-input" value="${escSmart(item.title||'')}" aria-label="Título do cântico">
          <input class="leaflet-editor-author-input" value="${escSmart(item.author||'')}" aria-label="Autor do cântico" placeholder="Autor">
          <div class="leaflet-editor-meta">${escSmart(item.moment)}</div>
        </div>
        <div class="leaflet-editor-item-actions">
          <label class="leaflet-editor-check"><input type="checkbox" class="leaflet-include" ${item.include?'checked':''}> incluir</label>
          <button type="button" class="btn secondary tiny" data-move-up="${i}" ${i===0?'disabled':''} aria-label="Mover para cima">↑</button>
          <button type="button" class="btn secondary tiny" data-move-down="${i}" ${i===items.length-1?'disabled':''} aria-label="Mover para baixo">↓</button>
        </div>
      </div>
      <textarea class="leaflet-lyrics" aria-label="Letra de ${escSmart(item.title||'cântico')}">${escSmart(item.lyrics||'')}</textarea>
    </article>`).join('') : '<div class="leaflet-editor-empty">Não existem cânticos preenchidos no programa.</div>';

  list.querySelectorAll('.leaflet-editor-item').forEach((el,i)=>{
    el.querySelector('.leaflet-lyrics')?.addEventListener('input',e=>{leafletV4Draft.items[i].lyrics=e.target.value;leafletV4UpdateLivePreview();leafletV4UpdateFitNotice();});
    el.querySelector('.leaflet-editor-title-input')?.addEventListener('input',e=>{leafletV4Draft.items[i].title=e.target.value;leafletV4UpdateLivePreview();});
    el.querySelector('.leaflet-editor-author-input')?.addEventListener('input',e=>{leafletV4Draft.items[i].author=e.target.value;leafletV4UpdateLivePreview();});
    el.querySelector('.leaflet-include')?.addEventListener('change',e=>{leafletV4Draft.items[i].include=e.target.checked;el.classList.toggle('is-off',!e.target.checked);leafletV4UpdateLivePreview();leafletV4UpdateFitNotice();});
  });
  list.querySelectorAll('[data-move-up]').forEach(b=>b.addEventListener('click',()=>leafletV4Move(Number(b.dataset.moveUp),-1)));
  list.querySelectorAll('[data-move-down]').forEach(b=>b.addEventListener('click',()=>leafletV4Move(Number(b.dataset.moveDown),1)));
  leafletV4UpdateFitNotice();
  leafletV4UpdateLivePreview();
}

function leafletV4Move(index,delta){
  if(!leafletV4Draft?.items)return;
  const target=index+delta;
  if(target<0||target>=leafletV4Draft.items.length)return;
  const [item]=leafletV4Draft.items.splice(index,1);
  leafletV4Draft.items.splice(target,0,item);
  leafletV4RenderList();
}

function leafletV4UpdateFitNotice(){
  const box=document.getElementById('leafletEditorFitNotice');
  if(!box||!leafletV4Draft)return;
  const items=(leafletV4Draft.items||[]).filter(x=>x.include);
  const chars=items.reduce((n,x)=>n+(x.title?.length||0)+(x.author?.length||0)+(x.lyrics?.length||0),0);
  box.textContent = chars>9000 ? '⚠️ Conteúdo muito extenso para uma única A4. Considere retirar cânticos ou algumas estrofes.' : chars>6500 ? 'ℹ️ O folheto está bastante preenchido. A aplicação reduzirá automaticamente a tipografia para tentar caber numa A4.' : '✓ O conteúdo está dentro de um volume confortável para A4 em duas colunas.';
  box.className='leaflet-fit-notice '+(chars>9000?'warn':chars>6500?'info':'ok');
}

function openLeafletEditor(includeLyrics=true){
  const modal=document.getElementById('leafletEditorModal');
  const record=collectProgramFromForm();
  if(!modal)return;
  if(!record.date){alert('Preencha primeiro a data da celebração.');return;}
  const info=getLiturgicalInfo(record.date)||{};
  leafletV4Draft={record:JSON.parse(JSON.stringify(record)),image:leafletV4CurrentImage(),items:leafletV4DefaultItems(includeLyrics)};
  const d=new Date(record.date+'T00:00:00');
  const formatted=d.toLocaleDateString('pt-PT',{day:'numeric',month:'long',year:'numeric'});
  const c=document.getElementById('leafletEditorCelebration'); if(c)c.textContent=record.title||'Celebração';
  const m=document.getElementById('leafletEditorMeta'); if(m)m.textContent=` · ${formatted}${info.season?' · '+info.season:''}`;
  const input=document.getElementById('leafletEditorImage'); if(input)input.value='';
  const preview=document.getElementById('leafletEditorImagePreview'); if(preview){preview.src=leafletV4Draft.image||'';preview.hidden=!leafletV4Draft.image;}
  leafletV4RenderList();
  modal.hidden=false;
}

function closeLeafletEditor(){const m=document.getElementById('leafletEditorModal');if(m)m.hidden=true;leafletV4Draft=null;const host=document.getElementById('leafletEditorLivePreview');if(host)host.innerHTML='';}

function leafletV4CollectDraft(){
  if(!leafletV4Draft)return null;
  const list=document.getElementById('leafletEditorList');
  list?.querySelectorAll('.leaflet-editor-item').forEach((el,i)=>{
    if(!leafletV4Draft.items[i])return;
    const ta=el.querySelector('.leaflet-lyrics');
    const cb=el.querySelector('.leaflet-include');
    const ti=el.querySelector('.leaflet-editor-title-input');
    const au=el.querySelector('.leaflet-editor-author-input');
    if(ta)leafletV4Draft.items[i].lyrics=ta.value;
    if(cb)leafletV4Draft.items[i].include=cb.checked;
    if(ti)leafletV4Draft.items[i].title=ti.value.trim();
    if(au)leafletV4Draft.items[i].author=au.value.trim();
  });
  return leafletV4Draft;
}

function leafletV4Estimate(item){
  const chars=(item.title?.length||0)+(item.author?.length||0)+(item.lyrics?.length||0);
  return 10 + Math.ceil(chars/72);
}

function leafletV4SplitColumns(items){
  const arr=items.filter(x=>x.include);
  if(!arr.length)return [[],[]];
  const total=arr.reduce((n,x)=>n+leafletV4Estimate(x),0);
  let best=1,bestDiff=Infinity,acc=0;
  for(let i=1;i<arr.length;i++){
    acc+=leafletV4Estimate(arr[i-1]);
    const diff=Math.abs(acc-(total-acc));
    if(diff<bestDiff){bestDiff=diff;best=i;}
  }
  return [arr.slice(0,best),arr.slice(best)];
}

function leafletV4SongHtml(x){
  return `<article class="leaflet-print-song">
    <div class="moment">${escSmart(x.moment)}</div>
    <h2>${escSmart(x.title||'')}</h2>
    ${x.author?`<div class="author">${escSmart(x.author)}</div>`:''}
    ${x.lyrics?`<div class="lyrics">${escSmart(x.lyrics)}</div>`:''}
  </article>`;
}

function buildLeafletV4Html(draft){
  const r=draft.record||{};
  const dt=r.date?new Date(r.date+'T00:00:00').toLocaleDateString('pt-PT',{day:'numeric',month:'long',year:'numeric'}):'';
  const info=getLiturgicalInfo(r.date)||{};
  const logo=new URL('logo_light.png',location.href).href;
  const image=draft.image||'';
  const [left,right]=leafletV4SplitColumns(draft.items||[]);
  const total=(draft.items||[]).filter(x=>x.include).reduce((n,x)=>n+leafletV4Estimate(x),0);
  const density=total>900? 'ultra-compact': total>650 ? 'compact' : '';
  return `<div class="leaflet-print-root ${density}">
    <header class="leaflet-print-head">
      <img class="leaflet-print-logo" src="${escSmart(logo)}" alt="Coro Paroquial São João Batista">
      <div class="leaflet-print-title">
        <h1>${escSmart(r.title||'Celebração')}</h1>
        <p class="date">${escSmart(dt)}</p>
        ${info.season?`<div class="season">${escSmart(info.season)}${info.year?' · Ano '+escSmart(info.year):''}${info.color?' · '+escSmart(info.color):''}</div>`:''}
      </div>
      ${image?`<img class="leaflet-print-image" src="${escSmart(image)}" alt="Imagem da celebração">`:'<div class="leaflet-print-image" aria-hidden="true"></div>'}
    </header>
    <main class="leaflet-print-grid">
      <div class="leaflet-print-col">${left.map(leafletV4SongHtml).join('')}</div>
      <div class="leaflet-print-col">${right.map(leafletV4SongHtml).join('')}</div>
    </main>
    <footer class="leaflet-print-footer"><span>Coro Paroquial São João Batista de Rio Caldo</span><span>${escSmart(r.date||'')}</span></footer>
  </div>`;
}

function previewLeafletV4(){
  const draft=leafletV4CollectDraft(); if(!draft)return;
  const content=document.getElementById('leafletModalContent'); const modal=document.getElementById('leafletModalBackdrop');
  if(content&&modal){content.innerHTML=draftToPreviewShell(draft);modal.hidden=false;}
}
function draftToPreviewShell(draft){return buildLeafletV4Html(draft);}

function leafletV4UpdateLivePreview(){
  const host=document.getElementById('leafletEditorLivePreview');
  if(!host||!leafletV4Draft)return;
  const html=buildLeafletV4Html(leafletV4Draft);
  const match=html.match(/^<div class="leaflet-print-root ([^"]*)">/);
  const density=(match&&match[1])?match[1]:'';
  host.innerHTML=`<div class="leaflet-live-sheet ${density}">${html}</div>`;
  const sheet=host.querySelector('.leaflet-live-sheet');
  if(!sheet)return;
  const updateScale=()=>{
    const available=Math.max(260,host.clientWidth-36);
    const scale=Math.min(1,available/794);
    sheet.style.transform=`scale(${scale})`;
    sheet.style.marginLeft=scale<1?'0':'auto';
    sheet.style.marginRight=scale<1?'0':'auto';
    host.style.setProperty('--leaflet-scale',scale);
    host.style.minHeight=(1123*scale+20)+'px';
  };
  requestAnimationFrame(updateScale);
}

function printLeafletV4(){
  const draft=leafletV4CollectDraft(); if(!draft)return;
  const content=buildLeafletV4Html(draft);
  const w=window.open('','_blank','width=1000,height=850');
  if(!w){alert('O navegador bloqueou a janela de impressão. Permita pop-ups para este site.');return;}
  w.document.write(`<!doctype html><html lang="pt"><head><meta charset="utf-8"><title>Folheto — ${escSmart(draft.record.title||'Celebração')}</title><style>
  @page{size:A4 portrait;margin:0}html,body{margin:0;padding:0;background:#fff}body{font-family:Arial,Helvetica,sans-serif}.leaflet-print-root{width:210mm;height:297mm;box-sizing:border-box;background:#fff;color:#111;padding:9mm;overflow:hidden}.leaflet-print-head{display:grid;grid-template-columns:34mm 1fr 34mm;align-items:start;gap:5mm;min-height:29mm;padding-bottom:4mm;border-bottom:1px solid #cfd5dc;margin-bottom:4mm}.leaflet-print-logo,.leaflet-print-image{width:34mm;height:27mm;object-fit:contain;display:block}.leaflet-print-image{object-fit:cover;border:1px solid #d8dde3}.leaflet-print-title{text-align:center;align-self:center;min-width:0}.leaflet-print-title h1{font-size:15pt;line-height:1.1;margin:0 0 2mm;font-weight:700}.leaflet-print-title .date{font-size:8.5pt;color:#555;margin:0}.leaflet-print-title .season{font-size:7.5pt;color:#666;margin-top:1mm}.leaflet-print-grid{display:grid;grid-template-columns:1fr 1fr;gap:7mm;height:246mm;overflow:hidden}.leaflet-print-col{min-width:0}.leaflet-print-song{break-inside:avoid;page-break-inside:avoid;margin:0 0 3mm}.leaflet-print-song h2{font-size:8.7pt;line-height:1.12;margin:0 0 .7mm;font-weight:700}.leaflet-print-song .author{font-size:6.9pt;color:#555;margin-bottom:1mm}.leaflet-print-song .moment{font-size:6.5pt;color:#777;text-transform:uppercase;letter-spacing:.02em;margin-bottom:.8mm}.leaflet-print-song .lyrics{white-space:pre-wrap;font-size:7.2pt;line-height:1.24}.leaflet-print-root.compact .leaflet-print-song{margin-bottom:2mm}.leaflet-print-root.compact .leaflet-print-song h2{font-size:8.1pt}.leaflet-print-root.compact .leaflet-print-song .lyrics{font-size:6.7pt;line-height:1.18}.leaflet-print-root.ultra-compact .leaflet-print-song{margin-bottom:1.5mm}.leaflet-print-root.ultra-compact .leaflet-print-song h2{font-size:7.6pt}.leaflet-print-root.ultra-compact .leaflet-print-song .lyrics{font-size:6.2pt;line-height:1.12}.leaflet-print-footer{margin-top:2mm;padding-top:1.5mm;border-top:1px solid #d8dde3;font-size:6.5pt;color:#777;display:flex;justify-content:space-between}@media print{.leaflet-print-root{width:210mm;height:297mm}}
  </style></head><body>${content}</body></html>`);
  w.document.close();w.focus();setTimeout(()=>w.print(),500);
}

function saveLeafletV4(){
  const draft=leafletV4CollectDraft(); if(!draft)return;
  loadSavedLeaflets();
  const r=draft.record||{};
  savedLeaflets.unshift({id:Date.now(),date:r.date||'',title:r.title||'Folheto',html:buildLeafletV4Html(draft),savedAt:new Date().toISOString(),version:'4.4'});
  savedLeaflets=savedLeaflets.slice(0,30);saveSavedLeaflets();renderSavedLeaflets();
  alert('Folheto guardado.');
}

function initAssemblyButtons(){
  document.getElementById('assemblySheetBtn')?.addEventListener('click',()=>openLeafletEditor(true));
  document.getElementById('assemblySheetBtnNoLyrics')?.addEventListener('click',()=>openLeafletEditor(false));
  document.getElementById('leafletEditorClose')?.addEventListener('click',closeLeafletEditor);
  document.getElementById('leafletEditorPreview')?.addEventListener('click',previewLeafletV4);
  document.getElementById('leafletEditorPrint')?.addEventListener('click',printLeafletV4);
  document.getElementById('leafletEditorReset')?.addEventListener('click',()=>{
    if(!leafletV4Draft)return;
    const fresh=leafletV4DefaultItems(true);
    leafletV4Draft.items.forEach((x,i)=>{if(fresh[i])x.lyrics=fresh[i].lyrics;});
    leafletV4RenderList();
  });
  document.getElementById('leafletEditorImage')?.addEventListener('change',e=>{
    const file=e.target.files?.[0]; if(!file||!leafletV4Draft)return;
    if(!file.type.startsWith('image/')){alert('Escolha uma imagem válida.');return;}
    if(file.size>3*1024*1024){alert('A imagem deve ter no máximo 3 MB.');return;}
    const reader=new FileReader();
    reader.onload=()=>{leafletV4Draft.image=reader.result;const img=document.getElementById('leafletEditorImagePreview');if(img){img.src=leafletV4Draft.image;img.hidden=false;}leafletV4UpdateLivePreview();};
    reader.readAsDataURL(file);
  });
  document.getElementById('leafletEditorRemoveImage')?.addEventListener('click',()=>{if(!leafletV4Draft)return;leafletV4Draft.image='';const i=document.getElementById('leafletEditorImage');if(i)i.value='';const img=document.getElementById('leafletEditorImagePreview');if(img){img.src='';img.hidden=true;}leafletV4UpdateLivePreview();});
  document.getElementById('leafletEditorModal')?.addEventListener('click',e=>{if(e.target.id==='leafletEditorModal')closeLeafletEditor();});
  document.getElementById('leafletEditorSave')?.addEventListener('click',saveLeafletV4);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){const m=document.getElementById('leafletEditorModal');if(m&&!m.hidden)closeLeafletEditor();}});
}
function initLeafletsV4Save(){
  const b=document.getElementById('saveCurrentLeafletBtn');
  if(b){b.replaceWith(b.cloneNode(true));document.getElementById('saveCurrentLeafletBtn').addEventListener('click',()=>openLeafletEditor(true));}
}
document.addEventListener('DOMContentLoaded',()=>{initLeafletsV4Save();});

// Backup completo dos dados locais — 4.0
function coroBackupPayload(){
  const keys=['coroHistory','coroLeaflets','coroSongUsage','coroSongUsage_v1','coroPeople','coroLyrics_'];
  const data={version:'4.0',exportedAt:new Date().toISOString(),storage:{}};
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i); if(!k)continue;
    if(keys.some(prefix=>k===prefix||k.startsWith(prefix))) data.storage[k]=localStorage.getItem(k);
  }
  data.storage.coroTheme=localStorage.getItem('coroTheme');
  return data;
}
function exportCoroBackup(){
  const blob=new Blob([JSON.stringify(coroBackupPayload(),null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a');
  a.href=url;a.download='coro-liturgico-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function importCoroBackup(file){
  if(!file)return;
  const reader=new FileReader(); reader.onload=()=>{
    try{
      const data=JSON.parse(reader.result); if(!data||!data.storage)throw new Error('Formato inválido');
      if(!confirm('Importar esta cópia de segurança? Os dados locais com as mesmas chaves serão substituídos.'))return;
      Object.entries(data.storage).forEach(([k,v])=>{if(v===null||v===undefined)localStorage.removeItem(k);else localStorage.setItem(k,String(v));});
      alert('Dados importados. A aplicação será recarregada.'); location.reload();
    }catch(e){alert('Não foi possível importar a cópia de segurança.');}
  }; reader.readAsText(file);
}
document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('exportBackupBtn')?.addEventListener('click',exportCoroBackup);
  const ib=document.getElementById('importBackupBtn'), inp=document.getElementById('importBackupInput');
  ib?.addEventListener('click',()=>inp?.click()); inp?.addEventListener('change',e=>importCoroBackup(e.target.files?.[0]));
});

// ============================================
// v5 — VISUALIZADOR DE PARTITURAS / FONTES
// ============================================
function openMediaPreview(url,title='',subtitle=''){
  const modal=document.getElementById('mediaPreviewModal');
  const body=document.getElementById('mediaPreviewBody');
  const open=document.getElementById('mediaPreviewOpenBtn');
  if(!modal||!body||!url)return false;
  const u=String(url).trim();
  document.getElementById('mediaPreviewTitle').textContent='🎼 '+(title||'Partitura');
  document.getElementById('mediaPreviewSub').textContent=subtitle||'';
  open.href=u;
  const lower=u.toLowerCase().split('?')[0];
  if(/\.(pdf)$/.test(lower)){
    body.innerHTML='<iframe title="Partitura" src="'+escSmart(u)+'" style="width:100%;height:100%;border:0;background:#fff;"></iframe>';
  }else if(/\.(png|jpe?g|webp|gif|svg)$/.test(lower)){
    body.innerHTML='<img alt="Partitura" src="'+escSmart(u)+'" style="max-width:100%;max-height:100%;object-fit:contain;background:#fff;">';
  }else{
    body.innerHTML='<div style="padding:2rem;text-align:center"><div style="font-size:2rem">📄</div><p>Esta fonte não permite uma pré-visualização direta.</p><a class="btn" href="'+escSmart(u)+'" target="_blank" rel="noopener noreferrer">Abrir partitura</a></div>';
  }
  modal.hidden=false; modal.setAttribute('aria-hidden','false');
  return true;
}
function closeMediaPreview(){const m=document.getElementById('mediaPreviewModal');if(m){m.hidden=true;m.setAttribute('aria-hidden','true');const b=document.getElementById('mediaPreviewBody');if(b)b.innerHTML='';}}
function initMediaPreview(){
  document.getElementById('mediaPreviewCloseBtn')?.addEventListener('click',closeMediaPreview);
  document.getElementById('mediaPreviewDoneBtn')?.addEventListener('click',closeMediaPreview);
  document.getElementById('mediaPreviewModal')?.addEventListener('click',e=>{if(e.target.id==='mediaPreviewModal')closeMediaPreview();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.getElementById('mediaPreviewModal')?.hidden)closeMediaPreview();});
}
function refreshPartituraPreviewButtons(){
  document.querySelectorAll('[data-preview-score]').forEach(b=>{if(b.dataset.previewBound)return;b.dataset.previewBound='1';b.addEventListener('click',()=>openMediaPreview(b.dataset.previewScore,b.dataset.previewTitle||'Partitura',b.dataset.previewSub||''));});
}

if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',initMediaPreview);}else{initMediaPreview();}
