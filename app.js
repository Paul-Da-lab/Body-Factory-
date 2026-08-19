const KEY="body_factory_pwa_v1";
const defaults=[
["Куриная грудка",165,31],["Яйцо",157,13],["Творог 5%",121,17],["Греческий йогурт",73,10],
["Рис варёный",130,2.7],["Гречка варёная",110,4.2],["Овсянка сухая",370,13],["Картофель варёный",82,2],
["Макароны варёные",158,5.8],["Хлеб",250,8],["Банан",89,1.1],["Яблоко",52,.3],["Овощи ассорти",35,1.5],
["Лосось",208,20],["Тунец",116,26],["Говядина",187,26],["Сыр",350,25],["Орехи",600,18],
["Оливковое масло",884,0],["Шоколад",540,7]
];
let db=JSON.parse(localStorage.getItem(KEY)||"null")||{
 start:90,target:80,deficit:500,nextId:21,
 products:defaults.map((x,i)=>({id:i+1,name:x[0],kcal:x[1],protein:x[2],custom:false})),
 food:[],days:[]
};
function save(){localStorage.setItem(KEY,JSON.stringify(db))}
function today(){return new Date().toISOString().slice(0,10)}
function product(id){return db.products.find(p=>p.id==id)}
function kcal(e){let p=product(e.productId);return p?e.grams*p.kcal/100:0}
function protein(e){let p=product(e.productId);return p?e.grams*p.protein/100:0}
function todayFood(){return db.food.filter(x=>x.date===today())}
function todayKcal(){return todayFood().reduce((s,e)=>s+kcal(e),0)}
function todayProtein(){return todayFood().reduce((s,e)=>s+protein(e),0)}
function weight(){return db.days.slice().sort((a,b)=>a.date.localeCompare(b.date)).at(-1)?.weight||db.start}
function lost(){return Math.max(0,db.start-weight())}
function remaining(){return Math.max(0,weight()-db.target)}
function progress(){return db.start===db.target?0:Math.max(0,Math.min(1,(db.start-weight())/(db.start-db.target)))}
function level(){return Math.floor(progress()*10)+1}
function toast(t){let x=document.getElementById("toast");x.textContent=t;x.style.display="block";setTimeout(()=>x.style.display="none",1500)}
function esc(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function render(screen="home"){
 document.querySelectorAll("nav button").forEach(b=>b.classList.toggle("active",b.dataset.screen===screen));
 const a=document.getElementById("app");
 if(screen==="home") return home(a);
 if(screen==="food") return food(a);
 if(screen==="products") return products(a);
 if(screen==="diary") return diary(a);
 settings(a);
}
function home(a){
 a.innerHTML=`
 <div class="grid">
  <div class="card stat">⚖️ Вес<b>${weight().toFixed(1)} кг</b></div>
  <div class="card stat">📉 Сброшено<b>${lost().toFixed(1)} кг</b></div>
  <div class="card stat">🎯 Осталось<b>${remaining().toFixed(1)} кг</b></div>
  <div class="card stat">🏆 Уровень<b>${level()} / 11</b></div>
 </div>
 <div class="card"><div class="title">Прогресс кампании</div>
  <div class="progress"><div style="width:${progress()*100}%"></div></div>
  <div class="muted">${Math.round(progress()*100)}% пути до цели</div>
 </div>
 <div class="card"><div class="title">🍽️ Сегодня</div>
  <b>${Math.round(todayKcal())} ккал</b><br>${Math.round(todayProtein())} г белка
 </div>
 <div class="card"><div class="title">📈 История веса</div><canvas id="chart"></canvas></div>`;
 drawChart();
}
function drawChart(){
 const c=document.getElementById("chart"); if(!c)return;
 const dpr=devicePixelRatio||1, w=c.clientWidth, h=190;
 c.width=w*dpr;c.height=h*dpr;let x=c.getContext("2d");x.scale(dpr,dpr);
 let pts=db.days.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(d=>d.weight);
 if(pts.length<2){x.fillStyle="#6b7280";x.font="14px system-ui";x.fillText("Добавь минимум 2 записи веса",10,30);return}
 let min=Math.min(...pts),max=Math.max(...pts),r=Math.max(1,max-min);
 x.strokeStyle="#2563eb";x.lineWidth=4;x.beginPath();
 pts.forEach((v,i)=>{let px=i*(w-20)/(pts.length-1)+10,py=h-20-(v-min)/r*(h-40);i?x.lineTo(px,py):x.moveTo(px,py)});x.stroke();
}
function food(a){
 let list=todayFood().slice().reverse().map(e=>{let p=product(e.productId);return p?`
 <div class="foodrow row between"><div><b>${esc(p.name)}</b><br><span class="muted">${e.grams} г • ${Math.round(kcal(e))} ккал • ${protein(e).toFixed(1)} г белка</span></div>
 <button class="danger" onclick="delFood(${e.id})">×</button></div>`:""}).join("");
 a.innerHTML=`
 <div class="card"><div class="title">🍽️ Добавить еду</div>
 <label>Продукт</label><select id="foodProduct">${db.products.slice().sort((x,y)=>x.name.localeCompare(y.name)).map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join("")}</select>
 <label>Граммы</label><input id="foodGrams" type="number" value="100" min="0" step="1">
 <button class="full" onclick="addFood()">Добавить на сегодня</button>
 <p class="muted">Сегодня: ${Math.round(todayKcal())} ккал • ${Math.round(todayProtein())} г белка</p></div>
 <div class="card"><div class="title">Записи за сегодня</div>${list||'<div class="empty">Пока пусто</div>'}</div>`;
}
function addFood(){
 let id=+document.getElementById("foodProduct").value,g=+document.getElementById("foodGrams").value;
 if(!g||g<=0)return;
 db.food.push({id:Date.now(),date:today(),productId:id,grams:g});save();toast("Еда добавлена");render("food")
}
function delFood(id){db.food=db.food.filter(x=>x.id!==id);save();render("food")}
function products(a){
 let list=db.products.slice().sort((x,y)=>x.name.localeCompare(y.name)).map(p=>`
 <div class="productrow row between">
     <div>
         <b>${esc(p.name)}</b>${p.custom?' <span class="muted">• свой</span>':''}<br>
         <span class="muted">${p.kcal} ккал / 100 г • ${p.protein} г белка</span>
     </div>
     ${p.custom?`<button class="danger" onclick="delProduct(${p.id})">Удалить</button>`:""}
 </div>`).join("");
 a.innerHTML=
 `<div class="card">
      <div class="row between">
          <div class="title">🍎 Склад продуктов</div>
          <button class="btn" onclick="showAddProduct=true;render('products')">+ Добавить</button>
      </div>
 </div>
 <div class="muted">Всего продуктов: ${db.products.length}. Свои продукты сохраняются на телефоне.</div>
 ${window.showAddProduct?`
 <div class="card"><div class="title">Новый продукт</div>
     <label>Название</label><input id="pn" placeholder="Например: Пельмени">
     <label>Ккал / 100 г</label><input id="pk" type="number" step=".1">
     <label>Белок / 100 г</label><input id="pp" type="number" step=".1">
     <div class="row">
         <button onclick="saveProduct()">Сохранить</button>
         <button class="secondary" onclick="showAddProduct=false;render('products')">Отмена</button>
     </div>
 </div>
 `:""}
 <div class="card">${list}</div>`;
}
function saveProduct(){
 let name=document.getElementById("pn").value.trim(),k=+document.getElementById("pk").value,p=+document.getElementById("pp").value;
 if(!name||k<0||p<0){toast("Заполни все поля");return}
 db.products.push({id:db.nextId++,name,kcal:k,protein:p,custom:true});save();window.showAddProduct=false;toast("Продукт сохранён");render("products")
}
function delProduct(id){
 if(!confirm("Удалить этот продукт? Записи питания с ним тоже будут удалены."))return;
 db.products=db.products.filter(p=>p.id!==id);db.food=db.food.filter(e=>e.productId!==id);save();render("products")
}
function diary(a){
 let rows=db.days.slice().sort((x,y)=>y.date.localeCompare(x.date)).map(d=>`
 <div class="dayrow"><b>${d.date}: ${d.weight.toFixed(1)} кг</b><br><span class="muted">${d.steps} шагов • силовая: ${d.strength?"да":"нет"}</span></div>`).join("");
 a.innerHTML=`
 <div class="card"><div class="title">📖 Дневник</div><div class="muted">${today()}</div>
 <label>Вес, кг</label><input id="dw" type="number" step=".1" placeholder="${weight().toFixed(1)}">
 <label>Шаги</label><input id="ds" type="number" value="8000">
 <label><input id="dst" type="checkbox" style="width:auto"> Силовая тренировка</label>
 <button class="full" onclick="saveDay()">Сохранить день</button></div>
 <div class="card"><div class="title">История</div>${rows||'<div class="empty">Записей пока нет</div>'}</div>`;
}
function saveDay(){
 let w=+document.getElementById("dw").value,s=+document.getElementById("ds").value||0,st=document.getElementById("dst").checked;
 if(!w||w<=0){toast("Введи вес");return}
 db.days=db.days.filter(d=>d.date!==today());db.days.push({date:today(),weight:w,steps:s,strength:st});save();toast("День сохранён");render("diary")
}
function settings(a){
 a.innerHTML=`
 <div class="card"><div class="title">⚙️ Настройки кампании</div>
 <label>Стартовый вес, кг</label><input id="ss" type="number" step=".1" value="${db.start}">
 <label>Целевой вес, кг</label><input id="st" type="number" step=".1" value="${db.target}">
 <label>Целевой дефицит, ккал</label><input id="sd" type="number" value="${db.deficit}">
 <button class="full" onclick="saveSettings()">Сохранить настройки</button></div>
 <div class="card"><div class="title">💾 Хранилище</div>
 <div class="muted">Все данные находятся в локальном хранилище браузера на этом телефоне.</div>
 <button class="secondary full" onclick="exportData()">Экспортировать данные</button>
 <button class="secondary full" onclick="document.getElementById('importFile').click()">Импортировать данные</button>
 <input id="importFile" type="file" accept=".json" style="display:none" onchange="importData(event)">
 </div>`;
}
function saveSettings(){
 let s=+ss.value,t=+st.value,d=+sd.value;if(s<=0||t<=0||d<=0){toast("Проверь значения");return}
 db.start=s;db.target=t;db.deficit=d;save();toast("Настройки сохранены");render("settings")
}
function exportData(){
 let blob=new Blob([JSON.stringify(db,null,2)],{type:"application/json"}),a=document.createElement("a");
 a.href=URL.createObjectURL(blob);a.download="body-factory-backup.json";a.click();URL.revokeObjectURL(a.href)
}
function importData(ev){
 let f=ev.target.files[0];if(!f)return;let r=new FileReader();
 r.onload=()=>{try{let x=JSON.parse(r.result);if(!x.products||!x.food||!x.days)throw 0;db=x;save();toast("Данные импортированы");render("settings")}catch{toast("Не удалось импортировать")}};
 r.readAsText(f)
}
window.showAddProduct=false;
document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>render(b.dataset.screen));
if("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(()=>{});
render("home");
