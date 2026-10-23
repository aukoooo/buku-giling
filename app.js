(function(){var data=null, tab='ringkasan', confirming=null, CC=null, showDone=false;
var $=function(s){return document.querySelector(s)};
var fmt=function(n){var r=Math.round(n);return (r<0?'-':'')+'Rp'+Math.abs(r).toLocaleString('id-ID')};
var kg=function(n){return (Math.round(n*10)/10).toLocaleString('id-ID')};
var kr=function(n){return (Math.round(n)/10).toLocaleString('id-ID',{maximumFractionDigits:1})};
var tgl=function(s){var p=s.split('-');return p[2]+'/'+p[1]+'/'+p[0].slice(2)};
var today=function(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
var esc=function(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
var MON=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
var dv=function(a,b){var r=b?a/b:0;return isFinite(r)?r:0};
var num=function(x){x=+x;return isFinite(x)?x:0};
var txt=function(x){return x==null?'':String(x).slice(0,200)};
var validDate=function(x){return /^\d{4}-\d{2}-\d{2}$/.test(x)&&!isNaN(new Date(x))};
var sum=function(a,f){return a.reduce(function(t,x){return t+f(x)},0)};
var byDI=function(a,b){return a.tgl<b.tgl?-1:a.tgl>b.tgl?1:a.id-b.id};

var bulan='',editing=null,formOpen=false,fq='',fdue=false;
function tglLong(s){var d=new Date(s+'T00:00:00');return isNaN(d)?'':d.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
var monthOf=function(s){return s.slice(0,7)};
var monthLabel=function(k){return MON[+k.slice(5)-1]+' '+k.slice(0,4)};
var inMonth=function(x){return !bulan||monthOf(x.tgl)===bulan};
var av=function(x){return esc(x==null?'':x)};

/* Data. Id dipertahankan jika unik, supaya norm() aman dipanggil berulang. */
function norm(d){
  if(!d||typeof d!=='object'||Array.isArray(d)||!Array.isArray(d.purchases)||!Array.isArray(d.sales)||!Array.isArray(d.wages))return null;
  var used={},free=0,map={},ok=function(r){return r&&typeof r==='object'&&!Array.isArray(r)},dt=function(x){return validDate(x)?x:today()};
  function alloc(r){var w=+r.id;if(isFinite(w)&&w>0&&Math.floor(w)===w&&!used[w]){used[w]=1;return w}do{free++}while(used[free]);used[free]=1;return free}
  var P=d.purchases.filter(ok).map(function(r){var n=alloc(r);if(r.id!=null&&!map[r.id])map[r.id]=n;return {id:n,tgl:dt(r.tgl),gabah:num(r.gabah),karung:num(r.karung),beli:num(r.beli),pemasok:txt(r.pemasok),beras:num(r.beras),biaya:num(r.biaya)}});
  var S=d.sales.filter(ok).map(function(r){var kgv=num(r.kg),h=num(r.harga),tot=kgv*h,b=(r.bayar==null||r.bayar==='')?tot:Math.min(tot,Math.max(0,num(r.bayar)));return {id:alloc(r),tgl:dt(r.tgl),kg:kgv,harga:h,pembeli:txt(r.pembeli),batch:map[r.batch]||0,bayar:b}});
  var W=d.wages.filter(ok).map(function(r){return {id:alloc(r),nama:txt(r.nama),jumlah:num(r.jumlah)}});
  var A=(Array.isArray(d.adjust)?d.adjust:[]).filter(ok).map(function(r){return {id:alloc(r),tgl:dt(r.tgl),kg:num(r.kg),ket:txt(r.ket),batch:map[r.batch]||0}});
  return {purchases:P,sales:S,wages:W,adjust:A,capital:num(d.capital),debt:num(d.debt)};
}

/* Stok: beras masuk dari tiap pembelian (batch). Penjualan dan susut mengambil
   dari batch yang dipilih, sisanya dari batch tertua (FIFO). Modal/kg batch =
   (harga gabah + biaya produksi) / beras jadi. */
function compute(){
  if(CC)return CC;
  var P=data.purchases.filter(function(b){return b.beras>0}).sort(byDI),by={},fi=0;
  var B=P.map(function(b){var o={id:b.id,tgl:b.tgl,pemasok:b.pemasok,masuk:b.beras,rem:b.beras,cost:dv(b.beli+b.biaya,b.beras),out:0};by[b.id]=o;return o});
  var allBeras=sum(data.purchases,function(x){return x.beras}),avg=dv(sum(data.purchases,function(x){return x.beli+x.biaya}),allBeras);
  var ev=data.sales.map(function(x){return {t:'s',id:x.id,tgl:x.tgl,kg:x.kg,batch:x.batch}}).concat((data.adjust||[]).map(function(x){return {t:'a',id:x.id,tgl:x.tgl,kg:x.kg,batch:x.batch}})).sort(byDI);
  var res={};
  ev.forEach(function(e){
    var need=e.kg,parts=[],cost=0;
    function take(b){var k=Math.min(need,b.rem);if(k<=0)return;b.rem-=k;b.out+=k;need-=k;cost+=k*b.cost;parts.push({b:b,kg:k})}
    if(e.batch&&by[e.batch])take(by[e.batch]);
    while(need>1e-9){while(fi<B.length&&B[fi].rem<=1e-9)fi++;if(fi>=B.length)break;take(B[fi])}
    var short=need>1e-9?need:0;if(short){cost+=short*avg}
    res[e.t+e.id]={parts:parts,cost:cost,short:short};
  });
  var stokKg=sum(B,function(b){return b.rem}),short=0;for(var k in res)short+=res[k].short;
  var T={B:B,res:res,by:by,stokKg:stokKg,nilaiStok:sum(B,function(b){return b.rem*b.cost}),short:short,avg:avg};
  var P2=data.purchases,S=data.sales,W=data.wages,A=data.adjust||[];
  T.beli=sum(P2,function(x){return x.beli});T.biaya=sum(P2,function(x){return x.biaya});T.gaji=sum(W,function(x){return x.jumlah});
  T.jual=sum(S,function(x){return x.kg*x.harga});T.bayar=sum(S,function(x){return x.bayar});T.piutang=T.jual-T.bayar;
  T.keluar=T.beli+T.biaya+T.gaji;T.kas=data.capital+T.bayar-T.keluar;T.bersih=T.kas+data.debt;
  T.gabah=sum(P2,function(x){return x.gabah});T.beras=allBeras;T.terjual=sum(S,function(x){return x.kg});T.susutKg=sum(A,function(x){return x.kg});
  T.hppJual=sum(S,function(x){return res['s'+x.id].cost});T.profit=T.jual-T.hppJual;
  T.susut=sum(A,function(x){return res['a'+x.id].cost});T.laba=T.profit-T.susut;T.labaBersih=T.laba-T.gaji;
  T.modalKg=dv(T.beli+T.biaya,allBeras);
  CC=T;return T;
}
function totals(){return compute()}
/* Hitung stok tanpa satu penjualan atau susut tertentu (dipakai saat mengubah data itu). */
function tWithout(kind,id){
  if(!id)return compute();
  var sv=data,sc=CC,d2={};for(var k in data)d2[k]=data[k];
  if(kind==='s')d2.sales=data.sales.filter(function(x){return x.id!==id});
  if(kind==='a')d2.adjust=(data.adjust||[]).filter(function(x){return x.id!==id});
  data=d2;CC=null;var t=compute();data=sv;CC=sc;return t;
}
function cls(n){return n<0?'neg':''}
function head(){var t=compute();$('#k-kas').textContent=fmt(t.kas);$('#k-utang').textContent=fmt(data.debt);$('#k-bersih').textContent=fmt(t.bersih)}
function months(){var m={};data.purchases.forEach(function(x){m[monthOf(x.tgl)]=1});data.sales.forEach(function(x){m[monthOf(x.tgl)]=1});return Object.keys(m).sort().reverse()}
function findRec(kind,id){var l={p:data.purchases,s:data.sales,w:data.wages,a:data.adjust||[]}[kind]||[];return l.filter(function(x){return x.id===id})[0]}
function edRec(kind){return editing&&editing.kind===kind?findRec(kind,editing.id):null}
function actBtns(kind,id){return '<span class="inl"><button class="btn line mini" data-edit="'+kind+':'+id+'">Ubah</button>'+delBtn(kind,id)+'</span>'}
function delBtn(kind,id){var s=confirming===kind+id;return '<button class="btn ghost'+(s?' sure':'')+'" data-del="'+kind+':'+id+'">'+(s?'Yakin hapus?':'Hapus')+'</button>'}
function formBtns(kind,label){return '<button class="btn">'+(edRec(kind)?'Simpan perubahan':label)+'</button>'+(edRec(kind)?'<button type="button" class="btn line" data-cancel="1">Batal</button>':'')}
function pnl(kind){return '<div class="panel'+(edRec(kind)?' editing':'')+'">'}

function pct(n){return (Math.round(n*10)/10).toLocaleString('id-ID')+'%'}
function rend(x){return x.beras>0&&x.gabah>0?dv(x.beras,x.gabah)*100:null}
function rendOf(list){var g=0,b=0;list.forEach(function(x){if(x.beras>0&&x.gabah>0){g+=x.gabah;b+=x.beras}});return g>0?b/g*100:null}
function rendAll(){return rendOf(data.purchases)}
function rendCell(r){return r==null?'<td class="r num">-</td>':'<td class="r num'+(r<45||r>70?' neg':'')+'" title="Beras jadi dibagi gabah">'+pct(r)+'</td>'}

function monthBar(){
  var opts='<option value="">Semua bulan</option>'+months().map(function(k){return '<option value="'+k+'"'+(k===bulan?' selected':'')+'>'+monthLabel(k)+'</option>'}).join('');
  return '<div class="panel"><div class="row" style="align-items:flex-end"><label style="min-width:170px">Bulan<select id="f-bulan">'+opts+'</select></label><button class="btn line" data-export="1">Ekspor ke Excel</button></div><p class="note" id="ex-msg" style="margin-top:8px">Filter bulan berlaku untuk tabel Pembelian, Penjualan, dan file Excel.</p></div>';
}
function monthly(t){
  var m={};function g(k){return m[k]||(m[k]={k:k,gabah:0,beras:0,gb:0,modal:0,jualKg:0,jual:0,profit:0,bayar:0})}
  data.purchases.forEach(function(x){var o=g(monthOf(x.tgl));o.gabah+=x.gabah;o.modal+=x.beli+x.biaya;if(x.beras>0&&x.gabah>0){o.beras+=x.beras;o.gb+=x.gabah}});
  data.sales.forEach(function(x){var o=g(monthOf(x.tgl));o.jualKg+=x.kg;o.jual+=x.kg*x.harga;o.bayar+=x.bayar;o.profit+=x.kg*x.harga-t.res['s'+x.id].cost});
  return Object.keys(m).sort().map(function(k){var o=m[k];o.rend=o.gb>0?o.beras/o.gb*100:null;return o});
}

function renderRingkasan(){
  var t=compute(),m={};
  data.purchases.forEach(function(x){var k=x.tgl.slice(0,7);(m[k]=m[k]||{b:0,j:0}).b+=x.beli+x.biaya});
  data.sales.forEach(function(x){var k=x.tgl.slice(0,7);(m[k]=m[k]||{b:0,j:0}).j+=x.kg*x.harga});
  var keys=Object.keys(m).sort(),max=Math.max.apply(null,keys.map(function(k){return Math.max(m[k].b,m[k].j)}).concat([1]));
  var bars=keys.map(function(k){var mm=+k.slice(5)-1;return '<div class="bar"><div>'+MON[mm]+' '+k.slice(2,4)+'</div><div class="track"><i class="a" style="width:'+(m[k].j/max*100)+'%"></i><span>'+fmt(m[k].j)+'</span><i class="b" style="width:'+(m[k].b/max*100)+'%"></i><span>'+fmt(m[k].b)+'</span></div></div>'}).join('');
  var ra=rendAll();
  var items=[['Modal awal',fmt(data.capital)],['Pembelian gabah',fmt(t.beli)],['Biaya produksi',fmt(t.biaya)],['Gaji',fmt(t.gaji)],['Total uang keluar',fmt(t.keluar)],['Total penjualan',fmt(t.jual)],['Uang diterima',fmt(t.bayar)],['Piutang pembeli',fmt(t.piutang)],
   ['Stok beras',kr(t.stokKg)+' karung ('+kg(t.stokKg)+' kg)'],['Nilai stok (modal)',fmt(t.nilaiStok)],['Modal beras terjual',fmt(t.hppJual)],['Profit penjualan',fmt(t.profit)],['Susut / pemakaian',fmt(-t.susut)],['Laba setelah gaji',fmt(t.labaBersih)],['Modal per kg beras',fmt(t.modalKg)],['Gabah dibeli',kg(t.gabah)+' kg'],['Beras jadi',kg(t.beras)+' kg'],['Rendemen rata-rata',ra==null?'-':pct(ra)],['Beras terjual',kg(t.terjual)+' kg']];
  var mr=monthly(t).slice().reverse().map(function(o){return '<tr><td>'+monthLabel(o.k)+'</td><td class="r num">'+kg(o.gabah)+'</td><td class="r num">'+kg(o.beras)+'</td>'+rendCell(o.rend)+'<td class="r num">'+fmt(o.modal)+'</td><td class="r num">'+kg(o.jualKg)+'</td><td class="r num">'+fmt(o.jual)+'</td><td class="r num '+cls(o.profit)+'">'+fmt(o.profit)+'</td><td class="r num">'+fmt(o.jual-o.bayar)+'</td></tr>'}).join('');
  return '<div class="grid">'+items.map(function(i){return '<div class="stat"><small>'+i[0]+'</small><b>'+i[1]+'</b></div>'}).join('')+'</div>'+
  '<p class="note" style="margin-top:10px">Kas dihitung dari uang yang sudah diterima. Profit dihitung dari modal batch gabah yang beras-nya dijual (tertua dulu, atau batch yang Anda pilih). Laba setelah gaji = profit - susut - gaji. Stok yang belum terjual tercatat sebagai nilai stok, bukan kerugian.</p>'+
  '<div style="margin-top:16px">'+monthBar()+'</div>'+
  '<div class="panel" style="margin-top:16px"><h2>Per bulan</h2><div class="legend" style="margin:8px 0 14px"><span><i style="background:var(--accent)"></i>Penjualan</span><span><i style="background:var(--gold)"></i>Pembelian + biaya</span></div><div class="bars">'+bars+'</div></div>'+
  '<div class="panel scroll" style="margin-top:16px"><h2 style="margin-bottom:8px">Laporan bulanan</h2><table><thead><tr><th>Bulan</th><th class="r">Gabah kg</th><th class="r">Beras kg</th><th class="r">Rendemen</th><th class="r">Modal beli</th><th class="r">Jual kg</th><th class="r">Penjualan</th><th class="r">Profit</th><th class="r">Piutang</th></tr></thead><tbody>'+(mr||'<tr><td colspan="9" class="empty">Belum ada data.</td></tr>')+'</tbody></table><p class="note" style="margin-top:8px">Profit dicatat pada bulan penjualan. Modal beli = harga gabah + biaya produksi.</p></div>'+
  '<div class="panel" style="margin-top:16px"><h2>Modal dan utang</h2><form id="f-mod"><label>Modal awal (Rp)<input id="m-cap" type="number" step="any" max="1000000000000" value="'+data.capital+'"></label><label>Utang (Rp, minus)<input id="m-debt" type="number" step="any" max="1000000000000" value="'+data.debt+'"></label><button class="btn">Simpan</button></form></div>';
}

function renderPembelian(){
  var ed=edRec('p'),v=ed||{tgl:today(),gabah:'',karung:'',beli:'',pemasok:'',beras:'',biaya:0};
  var rowsP=data.purchases.filter(inMonth),sg=sum(rowsP,function(x){return x.gabah}),sbe=sum(rowsP,function(x){return x.beli}),sbi=sum(rowsP,function(x){return x.biaya}),sbr=sum(rowsP,function(x){return x.beras});
  var cardP=[];
  var rows=rowsP.slice().sort(function(a,b){return -byDI(a,b)}).map(function(x){
    var mod=x.beli+x.biaya,beras=x.beras>0?kg(x.beras):'<span class="inl"><input class="mini" id="br-'+x.id+'" type="number" step="any" min="0.01" max="1000000000000" placeholder="kg"><button class="btn mini" data-setberas="'+x.id+'">Isi</button></span>';
    var rr=rend(x);cardP.push('<div class="card"><div class="ch"><b>'+(esc(x.pemasok)||'(tanpa pemasok)')+'</b><span class="num">'+tgl(x.tgl)+'</span></div><div class="cm"><span class="num">'+kg(x.gabah)+' kg gabah'+(x.karung?' · '+x.karung+' krg':'')+'</span><b class="num">'+fmt(x.beli)+'</b></div><div class="cs">Harga '+fmt(dv(x.beli,x.gabah))+'/kg · biaya '+fmt(x.biaya)+'</div><div class="cs">Beras jadi: '+(x.beras>0?'<b class="num">'+kg(x.beras)+' kg</b>':'<span class="inl"><input class="mini" type="number" step="any" min="0.01" max="1000000000000" placeholder="kg"><button class="btn mini" data-setberas="'+x.id+'">Isi</button></span>')+(rr==null?'':' · rendemen <b class="num'+(rr<45||rr>70?' neg':'')+'">'+pct(rr)+'</b>')+(x.beras>0?' · modal '+fmt(dv(mod,x.beras))+'/kg':'')+'</div><div class="cf">'+actBtns('p',x.id)+'</div></div>');
    return '<tr><td>'+tgl(x.tgl)+'</td><td class="r num">'+kg(x.gabah)+'</td><td class="r num">'+(x.karung||'')+'</td><td class="r num">'+fmt(dv(x.beli,x.gabah))+'</td><td class="r num">'+fmt(x.beli)+'</td><td>'+esc(x.pemasok)+'</td><td class="r num">'+beras+'</td>'+rendCell(rend(x))+'<td class="r num">'+fmt(x.biaya)+'</td><td class="r num">'+(x.beras>0?fmt(dv(mod,x.beras)):'-')+'</td><td>'+actBtns('p',x.id)+'</td></tr>'}).join('');
  var N='type="number" step="any" max="1000000000000"';
  return pnl('p')+'<details class="addbox" data-fo="p"'+(ed||formOpen?' open':'')+'><summary>'+(ed?'Ubah pembelian gabah':'+ Tambah pembelian gabah')+'</summary><form id="f-p" style="margin-top:10px"><label>Tanggal <span class="dh">'+tglLong(v.tgl)+'</span><input name="tgl" type="date" value="'+av(v.tgl)+'" required></label><label>Gabah (kg)<input name="gabah" '+N+' min="0.01" value="'+av(v.gabah)+'" required></label><label>Karung<input name="karung" '+N+' min="0" value="'+av(v.karung||'')+'"></label><label>Total beli (Rp)<input name="beli" '+N+' min="0" value="'+av(v.beli)+'" required></label><label>Pemasok<input name="pemasok" type="text" value="'+av(v.pemasok)+'"></label><label>Beras jadi (kg)<input name="beras" '+N+' min="0" value="'+av(v.beras||'')+'" placeholder="kosong jika belum digiling"></label><label>Biaya produksi (Rp)<input name="biaya" '+N+' min="0" value="'+av(v.biaya)+'"></label>'+formBtns('p','Tambah')+'</form><p class="note" style="margin-top:8px">Setiap pembelian adalah satu batch. Beras jadi masuk ke stok batch itu. Kalau belum digiling, isi nanti lewat tombol Isi di tabel. <b id="r-prev"></b></p></details></div>'+
  monthBar()+
  '<div class="cards"><div class="sumrow">Total '+kg(sg)+' kg gabah · beli '+fmt(sbe)+' · beras '+kg(sbr)+' kg'+(rendOf(rowsP)==null?'':' · rendemen '+pct(rendOf(rowsP)))+'</div>'+(cardP.join('')||'<div class="empty">'+(bulan?'Tidak ada pembelian di bulan ini.':'Belum ada pembelian.')+'</div>')+'</div>'+
  '<div class="panel scroll tbl"><table><thead><tr><th>Tgl</th><th class="r">Gabah kg</th><th class="r">Karung</th><th class="r">Harga/kg</th><th class="r">Total beli</th><th>Pemasok</th><th class="r">Beras kg</th><th class="r">Rendemen</th><th class="r">Biaya</th><th class="r">Modal/kg</th><th></th></tr></thead><tbody>'+(rows||'<tr><td colspan="11" class="empty">'+(bulan?'Tidak ada pembelian di bulan ini.':'Belum ada pembelian.')+'</td></tr>')+'</tbody><tfoot><tr><td>Total</td><td class="r num">'+kg(sg)+'</td><td></td><td></td><td class="r num">'+fmt(sbe)+'</td><td></td><td class="r num">'+kg(sbr)+'</td>'+rendCell(rendOf(rowsP))+'<td class="r num">'+fmt(sbi)+'</td><td class="r num">'+fmt(dv(sbe+sbi,sbr))+'</td><td></td></tr></tfoot></table></div>'+
  '<p class="note">Rendemen = beras jadi dibagi gabah. Angka merah berarti di luar kisaran umum 45 sampai 70%, kemungkinan ada salah ketik. Total dihitung hanya dari batch yang beras jadinya sudah diisi.</p>';
}

function batchLabel(b){return tgl(b.tgl).slice(0,5)+(b.pemasok?' '+esc(b.pemasok):'')}
function payCell(x,c){
  var sisa=x.kg*x.harga-x.bayar;if(sisa<0.5)return '<span class="note">Lunas</span>';
  return '<span class="neg">Sisa '+fmt(sisa)+'</span> <span class="inl"><input class="mini" '+(c?'':'id="by-'+x.id+'" ')+'type="number" step="any" min="1" max="'+Math.ceil(sisa)+'" placeholder="Rp"><button class="btn mini" data-bayar="'+x.id+'">Bayar</button><button class="btn line mini" data-lunasi="'+x.id+'">Lunas</button></span>';
}
function piutangPanel(){
  var g={};data.sales.forEach(function(x){var s=x.kg*x.harga-x.bayar;if(s<0.5)return;var n=x.pembeli||'(tanpa nama)',o=g[n]||(g[n]={n:n,c:0,s:0});o.c++;o.s+=s});
  var l=Object.keys(g).map(function(k){return g[k]}).sort(function(a,b){return b.s-a.s});
  if(!l.length)return '';
  return '<div class="panel scroll"><h2 style="margin-bottom:8px">Piutang pembeli</h2><table><thead><tr><th>Pembeli</th><th class="r">Transaksi belum lunas</th><th class="r">Sisa tagihan</th></tr></thead><tbody>'+l.map(function(o){return '<tr><td>'+esc(o.n)+'</td><td class="r num">'+o.c+'</td><td class="r num neg">'+fmt(o.s)+'</td></tr>'}).join('')+'</tbody><tfoot><tr><td>Total</td><td></td><td class="r num">'+fmt(sum(l,function(o){return o.s}))+'</td></tr></tfoot></table></div>';
}
function renderPenjualan(){
  var t=compute(),ed=edRec('s'),tt=ed?tWithout('s',ed.id):t;
  var v=ed?{tgl:ed.tgl,karung:ed.kg/10,harga:ed.harga,pembeli:ed.pembeli,batch:ed.batch,bayar:(ed.kg*ed.harga-ed.bayar<0.5?'':ed.bayar)}:{tgl:today(),karung:'',harga:'',pembeli:'',batch:0,bayar:''};
  var opts='<option value="0">Otomatis (batch tertua dulu)</option>'+tt.B.filter(function(b){return b.rem>0.0001||b.id===v.batch}).map(function(b){return '<option value="'+b.id+'"'+(b.id===v.batch?' selected':'')+'>'+batchLabel(b)+' | sisa '+kr(b.rem)+' karung</option>'}).join('');
  var qq=fq.trim().toLowerCase(),rowsS=data.sales.filter(inMonth).filter(function(x){return (!qq||(x.pembeli||'').toLowerCase().indexOf(qq)>=0)&&(!fdue||x.kg*x.harga-x.bayar>=0.5)}),sk=sum(rowsS,function(x){return x.kg}),stot=sum(rowsS,function(x){return x.kg*x.harga}),spr=sum(rowsS,function(x){return x.kg*x.harga-t.res['s'+x.id].cost}),ssi=sum(rowsS,function(x){return x.kg*x.harga-x.bayar});
  var cardS=[];
  var rows=rowsS.slice().sort(function(a,b){return -byDI(a,b)}).map(function(x){
    var r=t.res['s'+x.id],from=r.parts.map(function(p){return batchLabel(p.b)+' ('+kr(p.kg)+' krg)'}).join(' + ');
    if(r.short)from+=(from?' + ':'')+'<span class="neg">stok kurang '+kr(r.short)+' krg</span>';
    var profit=x.kg*x.harga-r.cost;
    cardS.push('<div class="card"><div class="ch"><b>'+(esc(x.pembeli)||'(tanpa nama)')+'</b><span class="num">'+tgl(x.tgl)+'</span></div><div class="cm"><span class="num">'+kr(x.kg)+' krg · '+kg(x.kg)+' kg × '+fmt(x.harga)+'</span><b class="num">'+fmt(x.kg*x.harga)+'</b></div><div class="cs">Dari '+(from||'-')+'</div><div class="cs">Profit <b class="num '+cls(profit)+'">'+fmt(profit)+'</b></div><div class="cs">'+payCell(x,1)+'</div><div class="cf">'+actBtns('s',x.id)+'</div></div>');
    return '<tr><td>'+tgl(x.tgl)+'</td><td class="r num">'+kr(x.kg)+'</td><td class="r num">'+kg(x.kg)+'</td><td class="r num">'+fmt(x.harga)+'</td><td class="r num">'+fmt(x.kg*x.harga)+'</td><td>'+esc(x.pembeli)+'</td><td>'+from+'</td><td class="r num '+cls(profit)+'">'+fmt(profit)+'</td><td>'+payCell(x)+'</td><td>'+actBtns('s',x.id)+'</td></tr>'}).join('');
  var N='type="number" step="any"';
  return pnl('s')+'<details class="addbox" data-fo="s"'+(ed||formOpen?' open':'')+'><summary>'+(ed?'Ubah penjualan':'+ Tambah penjualan')+'</summary><form id="f-s" style="margin-top:10px"><label>Tanggal <span class="dh">'+tglLong(v.tgl)+'</span><input name="tgl" type="date" value="'+av(v.tgl)+'" required></label><label>Karung (10 kg)<input name="karung" '+N+' min="0.1" max="1000000" value="'+av(v.karung)+'" required></label><label>Harga per kg (Rp)<input name="harga" '+N+' min="0" max="1000000" value="'+av(v.harga)+'" required></label><label>Pembeli<input name="pembeli" type="text" value="'+av(v.pembeli)+'"></label><label class="wide">Ambil dari<select name="batch">'+opts+'</select></label><label>Dibayar (Rp)<input name="bayar" '+N+' min="0" max="1000000000000" step="any" value="'+av(v.bayar)+'" placeholder="kosong = lunas"></label>'+formBtns('s','Tambah')+'</form><p class="note" id="hint-s" style="margin-top:8px">Stok tersedia '+kr(tt.stokKg)+' karung ('+kg(tt.stokKg)+' kg). Isi Dibayar jika pembeli belum membayar penuh.</p></details></div>'+
  piutangPanel()+monthBar()+'<div class="panel"><div class="row" style="align-items:flex-end"><label style="flex:1;min-width:160px">Cari pembeli<input id="f-q" type="search" value="'+av(fq)+'" placeholder="ketik nama"></label><label class="chk"><input type="checkbox" id="f-due"'+(fdue?' checked':'')+'> Belum lunas saja</label></div></div>'+
  '<div class="cards"><div class="sumrow">Total '+kr(sk)+' karung · '+fmt(stot)+' · profit '+fmt(spr)+(ssi>0.5?' · sisa tagihan '+fmt(ssi):' · lunas')+'</div>'+(cardS.join('')||'<div class="empty">'+((bulan||fq||fdue)?'Tidak ada penjualan yang cocok.':'Belum ada penjualan.')+'</div>')+'</div>'+
  '<div class="panel scroll tbl"><table><thead><tr><th>Tgl</th><th class="r">Karung</th><th class="r">Kg</th><th class="r">Harga/kg</th><th class="r">Total</th><th>Pembeli</th><th>Dari batch</th><th class="r">Profit</th><th>Pembayaran</th><th></th></tr></thead><tbody>'+(rows||'<tr><td colspan="10" class="empty">'+((bulan||fq||fdue)?'Tidak ada penjualan yang cocok.':'Belum ada penjualan.')+'</td></tr>')+'</tbody><tfoot><tr><td>Total</td><td class="r num">'+kr(sk)+'</td><td class="r num">'+kg(sk)+'</td><td></td><td class="r num">'+fmt(stot)+'</td><td></td><td></td><td class="r num">'+fmt(spr)+'</td><td class="r num'+(ssi>0.5?' neg':'')+'">'+(ssi>0.5?'Sisa '+fmt(ssi):'Lunas')+'</td><td></td></tr></tfoot></table></div>';
}

function renderStok(){
  var t=compute(),ed=edRec('a'),v=ed||{tgl:today(),kg:'',ket:''};
  var rows=t.B.slice().reverse().filter(function(b){return showDone||b.rem>0.0001}).map(function(b){
    var low=b.rem<=0.0001;return '<tr'+(low?' class="done"':'')+'><td>'+tgl(b.tgl)+'</td><td>'+esc(b.pemasok)+'</td><td class="r num">'+kg(b.masuk)+'</td><td class="r num">'+kg(b.out)+'</td><td class="r num"><b>'+kg(b.rem)+'</b></td><td class="r num"><b>'+kr(b.rem)+'</b></td><td class="r num">'+fmt(b.cost)+'</td><td class="r num">'+fmt(b.rem*b.cost)+'</td></tr>'}).join('');
  var adj=(data.adjust||[]).slice().sort(function(a,b){return -byDI(a,b)}).map(function(x){var r=t.res['a'+x.id];return '<tr><td>'+tgl(x.tgl)+'</td><td class="r num">'+kg(x.kg)+'</td><td>'+esc(x.ket)+'</td><td class="r num neg">'+fmt(-r.cost)+'</td><td>'+actBtns('a',x.id)+'</td></tr>'}).join('');
  var pend=data.purchases.filter(function(b){return !(b.beras>0)}).length;
  return '<div class="grid"><div class="stat"><small>Stok sekarang</small><b>'+kr(t.stokKg)+' karung</b></div><div class="stat"><small>Stok (kg)</small><b>'+kg(t.stokKg)+' kg</b></div><div class="stat"><small>Nilai stok (modal)</small><b>'+fmt(t.nilaiStok)+'</b></div><div class="stat"><small>Susut / pemakaian</small><b>'+kg(t.susutKg)+' kg</b></div></div>'+
  (t.short>0.0001?'<p class="note neg" style="margin-top:10px">Penjualan dan susut melebihi beras yang tercatat sebanyak '+kg(t.short)+' kg. Periksa beras jadi di tab Pembelian.</p>':'')+
  (pend?'<p class="note" style="margin-top:10px">'+pend+' pembelian belum punya angka beras jadi, jadi belum masuk stok. Isi di tab Pembelian.</p>':'')+
  '<div class="panel scroll" style="margin-top:16px"><h2 style="margin-bottom:8px">Stok per batch</h2><table><thead><tr><th>Batch</th><th>Pemasok</th><th class="r">Masuk kg</th><th class="r">Keluar kg</th><th class="r">Sisa kg</th><th class="r">Sisa karung</th><th class="r">Modal/kg</th><th class="r">Nilai sisa</th></tr></thead><tbody>'+(rows||'<tr><td colspan="8" class="empty">'+(t.B.length?'Semua batch sudah habis terjual.':'Belum ada beras masuk.')+'</td></tr>')+'</tbody></table><p style="margin:10px 0 0"><button class="btn line" data-toggledone="1">'+(showDone?'Sembunyikan batch yang habis':'Tampilkan batch yang habis ('+t.B.filter(function(b){return b.rem<=0.0001}).length+')')+'</button></p></div>'+
  '<div style="margin-top:16px">'+pnl('a')+'<h2>'+(ed?'Ubah susut atau pemakaian':'Catat susut atau pemakaian')+'</h2><p class="note" style="margin:6px 0 10px">Untuk beras yang keluar tanpa dijual: susut, rusak, dipakai sendiri, atau koreksi hasil hitung stok fisik.</p><form id="f-a"><label>Tanggal<input name="tgl" type="date" value="'+av(v.tgl)+'" required></label><label>Jumlah (kg)<input name="kg" type="number" step="any" min="0.01" max="1000000" value="'+av(v.kg)+'" required></label><label>Keterangan<input name="ket" type="text" value="'+av(v.ket)+'"></label>'+formBtns('a','Catat')+'</form></div></div>'+
  (adj?'<div class="panel scroll" style="margin-top:16px"><table><thead><tr><th>Tgl</th><th class="r">Kg</th><th>Keterangan</th><th class="r">Nilai modal</th><th></th></tr></thead><tbody>'+adj+'</tbody></table></div>':'');
}

function renderGaji(){
  var t=compute(),ed=edRec('w'),v=ed||{nama:'',jumlah:''};
  var rows=data.wages.map(function(x){return '<tr><td>'+esc(x.nama)+'</td><td class="r num">'+fmt(x.jumlah)+'</td><td>'+actBtns('w',x.id)+'</td></tr>'}).join('');
  return pnl('w')+'<h2>'+(ed?'Ubah gaji':'Tambah gaji')+'</h2><form id="f-w" style="margin-top:10px"><label>Penerima<input name="nama" type="text" value="'+av(v.nama)+'"'+(ed?'':' required')+'></label><label>Jumlah (Rp)<input name="jumlah" type="number" step="any" max="1000000000000" min="0" value="'+av(v.jumlah)+'" required></label>'+formBtns('w','Tambah')+'</form></div>'+
  '<div class="panel scroll"><table><thead><tr><th>Penerima</th><th class="r">Jumlah</th><th></th></tr></thead><tbody>'+(rows||'<tr><td colspan="3" class="empty">Belum ada gaji.</td></tr>')+'</tbody><tfoot><tr><td>Total</td><td class="r num">'+fmt(t.gaji)+'</td><td></td></tr></tfoot></table></div>';
}

function render(){
  CC=null;var v=$('#view');
  if(!data){v.innerHTML='<div class="empty">Memuat data…</div>';return}
  if(bulan&&months().indexOf(bulan)<0)bulan='';
  if(editing&&!findRec(editing.kind,editing.id))editing=null;
  head();
  v.innerHTML=tab==='ringkasan'?renderRingkasan():tab==='pembelian'?renderPembelian():tab==='penjualan'?renderPenjualan():tab==='stok'?renderStok():renderGaji();
}

function nextId(){var m=0;['purchases','sales','wages','adjust'].forEach(function(k){(data[k]||[]).forEach(function(x){if(x.id>m)m=x.id})});return m+1}
function commit(){formOpen=false;render();persist()}
document.addEventListener('toggle',function(e){var d=e.target;if(d&&d.dataset&&d.dataset.fo&&!editing)formOpen=d.open},true);
function val(f,n){return f.elements[n].value}
function save(){persist()}
function say(s){var e=$('#ex-msg');if(e)e.textContent=s}
function upsert(list,kind,rec){
  if(editing&&editing.kind===kind){var o=list.filter(function(x){return x.id===editing.id})[0];if(o){for(var k in rec)o[k]=rec[k];return}}
  rec.id=nextId();list.push(rec);
}

/* ---------- Ekspor Excel (.xlsx dibuat langsung, tanpa library) ---------- */
function crc32(b){var t=crc32.t;if(!t){t=crc32.t=[];for(var n=0;n<256;n++){var c=n;for(var k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}}var r=-1;for(var i=0;i<b.length;i++)r=t[(r^b[i])&255]^(r>>>8);return(r^-1)>>>0}
function zipStore(files){
  var enc=new TextEncoder(),chunks=[],cd=[],off=0;
  var u16=function(v){return [v&255,(v>>>8)&255]},u32=function(v){return [v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255]};
  files.forEach(function(f){
    var nm=enc.encode(f.name),crc=crc32(f.data),sz=f.data.length;
    var lh=[].concat(u32(0x04034b50),u16(20),u16(0x0800),u16(0),u16(0),u16(0x21),u32(crc),u32(sz),u32(sz),u16(nm.length),u16(0));
    chunks.push(new Uint8Array(lh),nm,f.data);
    cd.push(new Uint8Array([].concat(u32(0x02014b50),u16(20),u16(20),u16(0x0800),u16(0),u16(0),u16(0x21),u32(crc),u32(sz),u32(sz),u16(nm.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(off))),nm);
    off+=lh.length+nm.length+sz;
  });
  var cdSize=0;cd.forEach(function(c){cdSize+=c.length});
  var end=new Uint8Array([].concat(u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(cdSize),u32(off),u16(0)));
  var all=chunks.concat(cd,[end]),total=0;all.forEach(function(c){total+=c.length});
  var out=new Uint8Array(total),p=0;all.forEach(function(c){out.set(c,p);p+=c.length});return out;
}
function xlsxBuild(sheets){
  var enc=new TextEncoder();
  var X=function(s){return String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')};
  var col=function(n){var s='';n++;while(n>0){var m=(n-1)%26;s=String.fromCharCode(65+m)+s;n=Math.floor((n-1)/26)}return s};
  var NS='http://schemas.openxmlformats.org/spreadsheetml/2006/main',HD='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  var names=sheets.map(function(s,i){var n=String(s.name).replace(/[\[\]:*?\/\\]/g,' ').slice(0,31).trim()||('Sheet'+(i+1));return n});
  var files=[];
  var add=function(name,txt){files.push({name:name,data:enc.encode(txt)})};
  add('[Content_Types].xml',HD+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+sheets.map(function(s,i){return '<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'}).join('')+'</Types>');
  add('_rels/.rels',HD+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
  add('xl/workbook.xml',HD+'<workbook xmlns="'+NS+'" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+names.map(function(n,i){return '<sheet name="'+X(n)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>'}).join('')+'</sheets></workbook>');
  add('xl/_rels/workbook.xml.rels',HD+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+sheets.map(function(s,i){return '<Relationship Id="rId'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>'}).join('')+'<Relationship Id="rId'+(sheets.length+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
  add('xl/styles.xml',HD+'<styleSheet xmlns="'+NS+'"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.0"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>');
  sheets.forEach(function(s,i){
    var rows=s.rows.map(function(r,ri){
      var cells=r.map(function(c,ci){
        if(c==null||c==='')return '';
        var ref=col(ci)+(ri+1);
        if(typeof c==='number'){if(!isFinite(c))return '';return '<c r="'+ref+'" s="'+(c%1===0?2:3)+'"><v>'+c+'</v></c>'}
        return '<c r="'+ref+'"'+(ri===0&&s.header!==false?' s="1"':'')+' t="inlineStr"><is><t xml:space="preserve">'+X(c)+'</t></is></c>';
      }).join('');
      return '<row r="'+(ri+1)+'">'+cells+'</row>';
    }).join('');
    var cols=(s.widths||[]).map(function(w,k){return '<col min="'+(k+1)+'" max="'+(k+1)+'" width="'+w+'" customWidth="1"/>'}).join('');
    add('xl/worksheets/sheet'+(i+1)+'.xml',HD+'<worksheet xmlns="'+NS+'">'+(cols?'<cols>'+cols+'</cols>':'')+'<sheetData>'+rows+'</sheetData></worksheet>');
  });
  return zipStore(files);
}
function exportXlsx(){
  if(!data)return;
  var t=compute(),R=Math.round;
  var P=data.purchases.filter(inMonth).sort(byDI),S=data.sales.filter(inMonth).sort(byDI);
  var sh=[];
  sh.push({name:'Ringkasan',header:false,widths:[34,22],rows:[['Buku Giling',''],['Periode tabel',bulan?monthLabel(bulan):'Semua bulan'],[],['Modal awal',R(data.capital)],['Pembelian gabah',R(t.beli)],['Biaya produksi',R(t.biaya)],['Gaji',R(t.gaji)],['Total uang keluar',R(t.keluar)],['Total penjualan',R(t.jual)],['Uang diterima',R(t.bayar)],['Piutang pembeli',R(t.piutang)],['Kas',R(t.kas)],['Utang',R(data.debt)],['Kas bersih',R(t.bersih)],['Stok beras (kg)',Math.round(t.stokKg*10)/10],['Nilai stok (modal)',R(t.nilaiStok)],['Profit penjualan',R(t.profit)],['Susut / pemakaian (modal)',R(t.susut)],['Laba setelah gaji',R(t.labaBersih)],['Rendemen rata-rata (%)',rendAll()==null?'':Math.round(rendAll()*10)/10]]});
  sh.push({name:'Per bulan',widths:[14,12,12,12,16,12,16,16,16],rows:[['Bulan','Gabah kg','Beras kg','Rendemen %','Modal beli','Jual kg','Penjualan','Profit','Piutang']].concat(monthly(t).map(function(o){return [monthLabel(o.k),Math.round(o.gabah*10)/10,Math.round(o.beras*10)/10,o.rend==null?'':Math.round(o.rend*10)/10,R(o.modal),Math.round(o.jualKg*10)/10,R(o.jual),R(o.profit),R(o.jual-o.bayar)]}))});
  sh.push({name:'Pembelian',widths:[12,12,9,12,16,16,12,11,15,12],rows:[['Tanggal','Gabah kg','Karung','Harga/kg','Total beli','Pemasok','Beras kg','Rendemen %','Biaya produksi','Modal/kg']].concat(P.map(function(x){return [x.tgl,x.gabah,x.karung||'',R(dv(x.beli,x.gabah)),R(x.beli),x.pemasok,x.beras>0?x.beras:'',rend(x)==null?'':Math.round(rend(x)*10)/10,R(x.biaya),x.beras>0?R(dv(x.beli+x.biaya,x.beras)):'']}))});
  sh.push({name:'Penjualan',widths:[12,9,9,12,16,18,40,12,16,16,16],rows:[['Tanggal','Karung','Kg','Harga/kg','Total','Pembeli','Dari batch','Modal/kg','Profit','Dibayar','Sisa']].concat(S.map(function(x){var r=t.res['s'+x.id],tot=x.kg*x.harga;return [x.tgl,Math.round(x.kg)/10,x.kg,R(x.harga),R(tot),x.pembeli,r.parts.map(function(p){return tgl(p.b.tgl).slice(0,5)+(p.b.pemasok?' '+p.b.pemasok:'')+' ('+Math.round(p.kg*10)/10+' kg)'}).join(' + ')+(r.short?' + stok kurang '+Math.round(r.short*10)/10+' kg':''),R(dv(r.cost,x.kg)),R(tot-r.cost),R(x.bayar),R(Math.max(0,tot-x.bayar))]}))});
  sh.push({name:'Stok',widths:[12,16,12,12,12,12,12,16],rows:[['Batch','Pemasok','Masuk kg','Keluar kg','Sisa kg','Sisa karung','Modal/kg','Nilai sisa']].concat(t.B.map(function(b){return [b.tgl,b.pemasok,Math.round(b.masuk*10)/10,Math.round(b.out*10)/10,Math.round(b.rem*10)/10,Math.round(b.rem)/10,R(b.cost),R(b.rem*b.cost)]}))});
  sh.push({name:'Susut',widths:[12,10,30,16],rows:[['Tanggal','Kg','Keterangan','Nilai modal']].concat((data.adjust||[]).slice().sort(byDI).map(function(x){return [x.tgl,x.kg,x.ket,R(t.res['a'+x.id].cost)]}))});
  sh.push({name:'Gaji',widths:[22,16],rows:[['Penerima','Jumlah']].concat(data.wages.map(function(x){return [x.nama,R(x.jumlah)]}))});
  var bytes;try{bytes=xlsxBuild(sh)}catch(e){say('Gagal membuat file Excel.');return}
  var name='buku-giling-'+(bulan||'semua-bulan')+'.xlsx';
  say('Menyiapkan '+name+'…');
  Promise.resolve(saveFile(name,bytes)).then(function(){say('File '+name+' sudah dibuat.')}).catch(function(e){say(e&&e.code==='declined'?'Unduhan dibatalkan.':'Unduhan gagal. '+((e&&e.message)||''))});
}

/* ---------- Event ---------- */
document.addEventListener('input',function(e){
  if(e.target.id==='f-q'){fq=e.target.value;var pos=e.target.selectionStart;render();var q=$('#f-q');if(q){q.focus();try{q.setSelectionRange(pos,pos)}catch(x){}}return}
  var f=e.target.form;if(!f)return;
  if(e.target.name==='tgl'){var dh=e.target.parentNode.querySelector('.dh');if(dh)dh.textContent=tglLong(e.target.value)}
  if(f.id==='f-p'){
    var el=$('#r-prev');if(!el)return;
    var g=num(f.elements.gabah.value),b=num(f.elements.beras.value);
    if(g>0&&b>0){var r=b/g*100;el.textContent='Rendemen '+pct(r)+(r<45||r>70?' (di luar kisaran umum 45 sampai 70%, cek angkanya)':'');el.className=(r<45||r>70)?'neg':''}
    else{el.textContent='';el.className=''}
  }else if(f.id==='f-s'){
    var tt=tWithout('s',edRec('s')?editing.id:0),k=num(f.elements.karung.value)*10,h=num(f.elements.harga.value),by=num(f.elements.bayar.value),el2=$('#hint-s');if(!el2)return;
    var s='Stok tersedia '+kr(tt.stokKg)+' karung ('+kg(tt.stokKg)+' kg).';
    if(k>0){s+=' Jual '+kr(k)+' karung = '+kg(k)+' kg';if(h>0)s+=', total '+fmt(k*h)+' ('+fmt(h*10)+' per karung)';s+='.';if(k>tt.stokKg+1e-9)s+=' Melebihi stok.';if(h>0&&f.elements.bayar.value!==''&&by<k*h-0.5)s+=' Sisa tagihan '+fmt(k*h-by)+'.'}
    el2.textContent=s;el2.className='note';
  }
});
document.addEventListener('change',function(e){
  if(e.target.id==='f-bulan'){bulan=e.target.value;confirming=null;render()}
  if(e.target.id==='f-due'){fdue=e.target.checked;render()}
});
document.addEventListener('click',function(e){
  var b=e.target.closest('button');if(!b)return;
  if(b.dataset.t){tab=b.dataset.t;confirming=null;editing=null;formOpen=false;document.querySelectorAll('#tabs button').forEach(function(x){x.setAttribute('aria-selected',x===b)});render();return}
  if(b.dataset.toggledone){showDone=!showDone;render();return}
  if(b.dataset.export){exportXlsx();return}
  if(b.dataset.cancel){editing=null;formOpen=false;render();return}
  if(b.dataset.edit){
    var q=b.dataset.edit.split(':');editing={kind:q[0],id:+q[1]};confirming=null;render();
    var fm=$('#view form');if(fm){try{fm.scrollIntoView({block:'center'})}catch(x){}var fi=fm.querySelector('input,select');if(fi)fi.focus()}
    return;
  }
  if(b.dataset.setberas){
    var inp=b.parentNode.querySelector('input'),v=num(inp&&inp.value);if(v<=0)return;
    data.purchases.forEach(function(x){if(x.id===+b.dataset.setberas)x.beras=v});commit();return;
  }
  if(b.dataset.bayar||b.dataset.lunasi){
    var sid=+(b.dataset.bayar||b.dataset.lunasi),s=findRec('s',sid);if(!s)return;var tot=s.kg*s.harga;
    if(b.dataset.lunasi){s.bayar=tot}
    else{var iv=num((b.parentNode.querySelector('input')||{}).value);if(iv<=0)return;s.bayar=Math.min(tot,s.bayar+iv)}
    commit();return;
  }
  if(b.dataset.del){
    if(confirming!==b.dataset.del){confirming=b.dataset.del;render();return}
    var p=b.dataset.del.split(':'),k={p:'purchases',s:'sales',w:'wages',a:'adjust'}[p[0]];
    data[k]=(data[k]||[]).filter(function(x){return x.id!==+p[1]});confirming=null;if(editing&&editing.kind===p[0]&&editing.id===+p[1])editing=null;commit();
  }
});
document.addEventListener('submit',function(e){
  e.preventDefault();if(!data)return;var f=e.target,id=f.id;
  if(id==='f-p'){
    upsert(data.purchases,'p',{tgl:val(f,'tgl'),gabah:num(val(f,'gabah')),karung:num(val(f,'karung')),beli:num(val(f,'beli')),pemasok:txt(val(f,'pemasok')),beras:num(val(f,'beras')),biaya:num(val(f,'biaya'))});
  }else if(id==='f-s'){
    var tt=tWithout('s',edRec('s')?editing.id:0),k=Math.round(num(val(f,'karung'))*100)/10,h=num(val(f,'harga')),tot=k*h,bs=val(f,'bayar'),by=bs===''?tot:Math.min(tot,Math.max(0,num(bs)));
    if(k<=0)return;
    if(k>tt.stokKg+1e-9){var el=$('#hint-s');el.textContent='Tidak bisa menjual '+kr(k)+' karung. Stok hanya '+kr(tt.stokKg)+' karung.';el.className='note neg';return}
    upsert(data.sales,'s',{tgl:val(f,'tgl'),kg:k,harga:h,pembeli:txt(val(f,'pembeli')),batch:num(val(f,'batch')),bayar:by});
  }else if(id==='f-a'){
    var t2=tWithout('a',edRec('a')?editing.id:0),k2=num(val(f,'kg'));if(k2>t2.stokKg+1e-9){k2=t2.stokKg;if(k2<=0)return}
    data.adjust=data.adjust||[];upsert(data.adjust,'a',{tgl:val(f,'tgl'),kg:k2,ket:txt(val(f,'ket')),batch:0});
  }else if(id==='f-w'){
    upsert(data.wages,'w',{nama:txt(val(f,'nama')),jumlah:num(val(f,'jumlah'))});
  }else if(id==='f-mod'){data.capital=num($('#m-cap').value);data.debt=num($('#m-debt').value)}
  else return;
  editing=null;commit();
});


function saveFile(name,bytes){
  var u=URL.createObjectURL(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  var a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(function(){URL.revokeObjectURL(u)},4000);return Promise.resolve();
}
render();

var dirty=false,saveTimer=null;
function persist(){dirty=true;cacheSet();$('#sync').textContent='Menyimpan…';clearTimeout(saveTimer);saveTimer=setTimeout(flush,400)}
/* ---------- Cadangan ---------- */
function cadanganPanel(){
  return '<div class="panel" style="margin-top:16px"><h2>Cadangan</h2><p class="note" style="margin:6px 0 10px">Data utama tersimpan di Google Drive Anda sebagai file buku-giling.json. Ekspor untuk menyimpan salinan, impor untuk memasukkan data dari file.</p><div class="row"><button class="btn line" id="b-exp">Ekspor JSON</button><button class="btn line" id="b-imp">'+(confirming==='imp'?'Yakin ganti semua data?':'Impor JSON')+'</button><input id="f-imp" type="file" accept="application/json,.json" hidden></div></div>';
}
var _rr=renderRingkasan;renderRingkasan=function(){return _rr()+cadanganPanel()};
document.addEventListener('click',function(e){
  var b=e.target.closest('button');if(!b)return;
  if(b.id==='b-exp'){var u=URL.createObjectURL(new Blob([JSON.stringify(data,null,1)],{type:'application/json'}));var a=document.createElement('a');a.href=u;a.download='buku-giling-'+today()+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u)},2000)}
  if(b.id==='b-imp'){if(confirming!=='imp'){confirming='imp';render();return}confirming=null;$('#f-imp').click()}
  if(b.id==='b-out')signOut();
  if(b.id==='b-in')signIn(true);
});
document.addEventListener('change',function(e){
  if(e.target.id!=='f-imp'||!e.target.files[0])return;
  var r=new FileReader();r.onload=function(){try{var n=norm(JSON.parse(r.result));if(!n)throw 0;data=n;commit()}catch(x){$('#sync').textContent='File tidak valid'}};r.readAsText(e.target.files[0]);
});

/* ---------- Login Google + Google Drive ---------- */
var CFG=window.APP_CONFIG||{},SCOPE='https://www.googleapis.com/auth/drive.file',FILE='buku-giling.json';
var token=null,exp=0,fileId=null,tc=null,waiters=[],want=false;
function cacheGet(){try{return norm(JSON.parse(localStorage.getItem('bg_cache')))}catch(e){return null}}
function cacheSet(){try{localStorage.setItem('bg_cache',JSON.stringify(data));localStorage.setItem('bg_dirty',dirty?'1':'0')}catch(e){}}
function wasDirty(){try{return localStorage.getItem('bg_dirty')==='1'}catch(e){return false}}
function showLogin(msg){
  $('#view').innerHTML='<div class="login"><h2>Masuk dulu</h2><p>'+(msg||'Masuk dengan akun Google. Data Anda disimpan di Google Drive Anda sendiri, tidak tercampur dengan orang lain.')+'</p><button class="btn" id="b-in">Masuk dengan Google</button></div>';
  $('#sync').textContent='Belum masuk';$('.kas').hidden=true;$('#tabs').hidden=true;$('#b-out').hidden=true;
}
function showApp(){$('.kas').hidden=false;$('#tabs').hidden=false;$('#b-out').hidden=false}
function gotToken(r){
  var w=waiters;waiters=[];
  if(!r||r.error||!r.access_token){w.forEach(function(x){x.no(r&&r.error||'gagal')});return}
  token=r.access_token;exp=Date.now()+(r.expires_in||3600)*1000;
  try{localStorage.setItem('bg_login','1')}catch(e){}
  w.forEach(function(x){x.ok(token)});
}
function ensureToken(interactive){
  if(token&&Date.now()<exp-60000)return Promise.resolve(token);
  return new Promise(function(ok,no){waiters.push({ok:ok,no:no});if(waiters.length>1)return;
    try{tc.requestAccessToken({prompt:interactive?'':'none'})}catch(e){waiters=[];no(e)}});
}
function api(method,url,body,type,retry){
  return ensureToken(false).then(function(t){
    var h={Authorization:'Bearer '+t};if(type)h['Content-Type']=type;
    return fetch(url,{method:method,headers:h,body:body}).then(function(r){
      if(r.status===401&&!retry){token=null;return api(method,url,body,type,true)}
      if(!r.ok)throw new Error('HTTP '+r.status);return r;
    });
  });
}
function findFile(){
  return api('GET','https://www.googleapis.com/drive/v3/files?spaces=drive&fields='+encodeURIComponent('files(id)')+'&q='+encodeURIComponent("name='"+FILE+"' and trashed=false")).then(function(r){return r.json()}).then(function(j){return j.files&&j.files[0]?j.files[0].id:null});
}
function createFile(d){
  var bd='bgbound',body='--'+bd+'\r\nContent-Type: application/json\r\n\r\n'+JSON.stringify({name:FILE,mimeType:'application/json'})+'\r\n--'+bd+'\r\nContent-Type: application/json\r\n\r\n'+JSON.stringify(d)+'\r\n--'+bd+'--';
  return api('POST','https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',body,'multipart/related; boundary='+bd).then(function(r){return r.json()}).then(function(j){return j.id});
}
function flush(){
  if(!dirty||!data)return;
  if(!fileId){return}
  api('PATCH','https://www.googleapis.com/upload/drive/v3/files/'+fileId+'?uploadType=media',JSON.stringify(data),'application/json').then(function(){dirty=false;try{localStorage.setItem('bg_dirty','0')}catch(e){}$('#sync').textContent='Tersimpan di Drive'}).catch(function(){$('#sync').textContent='Belum tersimpan, akan dicoba lagi'});
}
function load(){
  $('#sync').textContent='Memuat dari Drive…';
  findFile().then(function(id){
    if(!id){var empty={purchases:[],sales:[],wages:[],capital:0,debt:0};return createFile(empty).then(function(nid){fileId=nid;return empty})}
    fileId=id;return api('GET','https://www.googleapis.com/drive/v3/files/'+id+'?alt=media').then(function(r){return r.json()});
  }).then(function(d){
    d=norm(d);if(!d)throw new Error('format');
    var c=cacheGet();
    if(wasDirty()&&c){dirty=true}
    data=(dirty&&c)?c:d;showApp();render();$('#sync').textContent='Tersimpan di Drive';
    if(dirty)flush();
  }).catch(function(){
    var c=cacheGet();
    if(c){data=c;showApp();render();$('#sync').textContent='Offline, memakai data tersimpan di HP'}
    else showLogin('Data belum bisa dimuat dari Google Drive. Periksa sambungan internet lalu coba masuk lagi.');
  });
}
function signIn(interactive){
  if(!tc){want=true;$('#sync').textContent='Menyiapkan Google…';return}
  ensureToken(interactive).then(load).catch(function(){showLogin(interactive?'Login dibatalkan atau gagal. Ketuk tombol untuk mencoba lagi.':'Sesi Google berakhir. Ketuk tombol untuk masuk lagi.')});
}
function signOut(){
  var t=token;token=null;fileId=null;data=null;dirty=false;
  try{localStorage.removeItem('bg_cache');localStorage.removeItem('bg_login');localStorage.removeItem('bg_dirty')}catch(e){}
  if(t&&window.google)try{google.accounts.oauth2.revoke(t,function(){})}catch(e){}
  showLogin('Anda sudah keluar.');
}
window.addEventListener('online',function(){if(dirty)flush()});
function boot(){
  if(!CFG.CLIENT_ID||/GANTI/.test(CFG.CLIENT_ID)){showLogin('CLIENT_ID Google belum diisi di config.js. Lihat PANDUAN.md bagian 3.');return}
  tc=google.accounts.oauth2.initTokenClient({client_id:CFG.CLIENT_ID,scope:SCOPE,callback:gotToken,error_callback:function(e){gotToken({error:(e&&e.type)||'error'})}});
  var was=false;try{was=localStorage.getItem('bg_login')==='1'}catch(e){}
  if(want){signIn(true);return}
  if(was){var c=cacheGet();if(c){data=c;showApp();render();$('#sync').textContent='Menyambung ke Drive…'}signIn(false)}
  else showLogin();
}
$('#tabs').hidden=true;$('.kas').hidden=true;
var gs=document.createElement('script');gs.src='https://accounts.google.com/gsi/client';gs.async=true;gs.onload=boot;gs.onerror=function(){var c=cacheGet();if(c){data=c;showApp();render();$('#sync').textContent='Offline, memakai data tersimpan di HP'}else showLogin('Tidak ada koneksi ke Google.')};
document.head.appendChild(gs);

})();
