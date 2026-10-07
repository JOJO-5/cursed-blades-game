// Combat silhouettes share the collision center. Rendering never changes damage or reach.
(() => {
  const particleDraw=Particle.prototype.draw;
  Particle.prototype.draw=function(ctx){
    if(!this.weaponImpact)return particleDraw.call(this,ctx);
    const phase=1-this.life/this.maxLife;
    ctx.save();ctx.globalAlpha=(1-phase)*.45;ctx.strokeStyle=this.color;ctx.lineWidth=2*(1-phase)+.5;
    // Brief fragments, rather than a filled blast or an enemy bounding rectangle.
    for(let i=0;i<5;i++){const a=i*TAU/5;ctx.beginPath();ctx.arc(this.x,this.y,Math.max(2,this.size*(.2+phase*.8)),a,a+.38);ctx.stroke()}
    ctx.restore();
  };
  const originalRepresentative=Game.drawRepresentativeWeapon;
  const heavy=new Set(['hammer','war_hammer_double','hammer_meteor','flail','mace_fire','axe','scythe','sword_wind','void_blade']);
  const metal=new Set(['sword','hammer','war_hammer_double','shield','shield_round_buckler','scythe','axe','flail','ring_steel']);
  Game.drawRepresentativeWeapon=function(ctx,id,size){
    if(!heavy.has(id))return originalRepresentative.call(this,ctx,id,size);
    ctx.save();ctx.scale(size/40,size/40);ctx.lineWidth=2;ctx.lineJoin='miter';ctx.strokeStyle='#17211f';
    const rect=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);ctx.strokeRect(x,y,w,h)};
    const polygon=(points,color)=>{ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();ctx.stroke()};
    if(['hammer','war_hammer_double','hammer_meteor'].includes(id)){
      // Head is centered on the hit position; handle points back toward the hero.
      rect(-32,-3,32,6,'#765039');rect(-29,-3,5,6,'#b68b58');
      const meteor=id==='hammer_meteor',double=id==='war_hammer_double';
      polygon([[-9,-9],[7,-9],[11,-5],[11,5],[7,9],[-9,9]],meteor?'#57423c':'#77878e');
      rect(-7,-7,12,3,meteor?'#d79054':'#d2dfd9');rect(5,-7,5,14,meteor?'#f5bb62':'#a3b6b9');
      if(double){rect(-9,-13,16,5,'#a3b6b9');rect(-9,8,16,5,'#a3b6b9')}
      if(meteor){ctx.fillStyle='#ffde97';ctx.fillRect(-3,-5,3,10);ctx.fillRect(0,-1,5,3)}
    }else if(id==='flail'||id==='mace_fire'){
      ctx.strokeStyle=id==='flail'?'#b1a18a':'#895b3d';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-31,0);ctx.lineTo(-10,0);ctx.stroke();
      for(let i=0;i<8;i++){const a=i*TAU/8;polygon([[Math.cos(a)*8,Math.sin(a)*8],[Math.cos(a+.12)*15,Math.sin(a+.12)*15],[Math.cos(a+.3)*8,Math.sin(a+.3)*8]],'#bac6bc')}
      rect(-7,-7,14,14,id==='mace_fire'?'#aa5737':'#67706b');ctx.fillStyle=id==='mace_fire'?'#ffda7a':'#d5d9c2';ctx.fillRect(-4,-4,4,4);
    }else if(id==='axe'){
      rect(-32,-3,37,6,'#805b3a');polygon([[-7,-4],[-5,-16],[5,-19],[14,-15],[17,-5],[12,0],[17,5],[14,15],[5,19],[-5,16],[-7,4]],'#7d9499');
      ctx.strokeStyle='#e0e8da';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(14,-14);ctx.lineTo(16,-5);ctx.lineTo(11,0);ctx.lineTo(16,5);ctx.lineTo(14,14);ctx.stroke();
    }else if(id==='scythe'){
      rect(-33,-2,34,4,'#80613f');polygon([[-4,-4],[-1,-15],[8,-19],[17,-13],[18,-3],[12,8],[3,16],[8,3],[9,-7],[4,-11]],'#c2d1ce');
    }else{
      const color=id==='void_blade'?'#9b76c9':'#b3e5d3';
      polygon([[-17,0],[-6,-6],[14,-8],[20,0],[14,8],[-6,6]],color);ctx.fillStyle='#f0efcf';ctx.fillRect(-4,-2,17,3);
      if(id==='sword_wind'){polygon([[-18,-13],[-10,-16],[8,-15],[14,-10],[-5,-9]],'#77b8a6')}
      else {ctx.fillStyle='#342644';ctx.fillRect(-6,-2,5,4)}
    }
    ctx.restore();return true;
  };
  const choice=Game.drawChoiceIcon;
  Game.drawChoiceIcon=function(ctx,key,x,y,w,h){
    const id=[...heavy].find(id=>(CONFIG.WEAPONS[id].hudIcon||CONFIG.WEAPONS[id].icon)===key);
    if(!id)return choice.call(this,ctx,key,x,y,w,h);
    ctx.save();ctx.translate(x+Math.min(w,h)*.14,y);ctx.rotate(-Math.PI/4);this.drawRepresentativeWeapon(ctx,id,Math.min(w,h)*.7);ctx.restore();
  };
  const oldWeaponDraw=Weapon.prototype.draw;
  Weapon.prototype.draw=function(ctx,layer='all'){
    const player=Game.player,type=this.def.type;
    if(layer==='aboveHero')return;
    if(type==='aura'){
      const time=Game.levelTime||0,range=this.getRange(),fire=!/poison/.test(this.id);
      const drawEmitter=()=>{
        // Separate held emitters, rather than stacking every icon on the head.
        if(this.id==='poison_aura')return;
        const list=player.weapons.filter(w=>w.def.type==='aura'&&w.id!=='poison_aura'),slot=Math.max(0,list.indexOf(this));
        const side=slot%2?-1:1,y=player.y-7-Math.floor(slot/2)*17;
        Game.drawCroppedAsset(ctx,this.def.icon,player.x+side*25,y,20,26,{imageSmoothingEnabled:false});return;
      };
      ctx.save();ctx.strokeStyle=this.def.color;ctx.lineWidth=1.25;ctx.globalAlpha=.18;
      // Interrupted rim marks the real reach; center stays readable.
      for(let i=0;i<8;i++){ctx.beginPath();ctx.arc(player.x,player.y,range,i*TAU/8+.04,i*TAU/8+.35);ctx.stroke()}
      for(let i=0;i<14;i++){
        const phase=(time*(fire ? .9 : .4)+i*.618)%1,a=i*2.399+time*.12,r=range*(.3+phase*.65);
        const x=player.x+Math.cos(a)*r,y=player.y+Math.sin(a)*r;
        ctx.globalAlpha=(1-phase)*.20;ctx.fillStyle=fire?'#ffbf66':'#abd779';
        if(fire){ctx.fillRect(x,y-phase*6,2,3+phase*4)}
        else {ctx.beginPath();ctx.ellipse(x,y,4+phase*5,2+phase*3,0,0,TAU);ctx.fill()}
      }
      ctx.restore();drawEmitter();return;
    }
    if(type!=='orbit')return oldWeaponDraw.call(this,ctx,layer);
    const range=this.getRange(),count=1+player.stats.weaponCountBonus,size=this.getSize();
    ctx.save();ctx.imageSmoothingEnabled=false;
    for(let i=0;i<count;i++){
      const angle=this.angle+i*TAU/count,x=player.x+Math.cos(angle)*range,y=player.y+Math.sin(angle)*range;
      // Draw continuous, short arcs behind the actual orbit center.
      for(let t=0;t<3;t++){ctx.strokeStyle=this.def.color;ctx.globalAlpha=(1-t/3)*(metal.has(this.id) ? .10 : .19);ctx.lineWidth=3-t;
        ctx.beginPath();ctx.arc(player.x,player.y,range,angle-.28*(t+1)/3,angle-.28*t/3);ctx.stroke()}
      ctx.globalAlpha=1;ctx.save();ctx.translate(x,y);ctx.rotate(angle+(heavy.has(this.id)?0:Math.PI/4));
      if(!Game.drawRepresentativeWeapon(ctx,this.id,size))Game.drawCroppedAsset(ctx,this.def.icon,0,0,size,size,{imageSmoothingEnabled:false});
      ctx.restore();
    }
    ctx.restore();
  };
  // Dedicated flying shapes: equipment icons are never used as projectiles.
  Projectile.prototype.getVisualFamily=function(){
    const id=this.weaponId||'';
    if(id==='holy_cross')return 'cross';if(id==='blade_dual')return 'blade';
    if(/spear/.test(id))return 'spear';if(/bow|ballista/.test(id))return 'arrow';if(id==='knife')return 'knife';
    if(/fire|burning/.test(id))return 'flame';if(/poison/.test(id))return 'toxin';
    return this.homing||/soul/.test(id)?'spirit':'arcane';
  };
  Projectile.prototype.draw=function(ctx){
    const family=this.getVisualFamily(),size=this.size,s=Math.max(5,size*.36);
    ctx.save();ctx.translate(this.x,this.y);ctx.rotate(this.angle);ctx.imageSmoothingEnabled=false;ctx.lineJoin='miter';
    ctx.fillStyle=this.color;ctx.globalAlpha=.18;ctx.beginPath();ctx.moveTo(-Math.min(32,size),0);ctx.lineTo(-s*.3,-s*.25);ctx.lineTo(s*.2,0);ctx.lineTo(-s*.3,s*.25);ctx.closePath();ctx.fill();ctx.globalAlpha=1;
    const poly=(points,color)=>{ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill()};
    if(['arrow','knife','spear'].includes(family)){
      const len=size*.7*(this.weaponId==='ballista'?1.25:1);ctx.strokeStyle='#17211f';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-len/2,0);ctx.lineTo(len/2+3,0);ctx.stroke();
      ctx.strokeStyle=family==='knife'?'#bfcfd2':family==='spear'?this.color:'#b99962';ctx.lineWidth=family==='knife'?3:2;ctx.stroke();
      poly([[len/2+5,0],[len/2-4,-4],[len/2-4,4]],'#e5ebd7');
      if(family==='spear'){for(const side of [-1,1])poly([[len/2+1,side*6],[len/2-8,side*3],[len/2-4,side*8]],this.color)}
      else if(family==='knife'){ctx.fillStyle='#81583e';ctx.fillRect(-len/2-3,-2,6,4)}
      else {ctx.strokeStyle='#acc8ae';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-len/2,0);ctx.lineTo(-len/2-4,-3);ctx.moveTo(-len/2,0);ctx.lineTo(-len/2-4,3);ctx.stroke()}
    }else if(family==='flame'){
      poly([[s+2,0],[s*.4,-s],[-s*.6,-s*.65],[-s*2,-s*.3],[-s*1.3,0],[-s*1.7,s*.4],[-s*.4,s*.8],[s*.4,s]],'#6c2d27');
      poly([[s,0],[s*.3,-s*.7],[-s*.7,-s*.4],[-s*1.4,0],[-s*.4,s*.6],[s*.4,s*.6]],'#f48632');ctx.fillStyle='#ffe2a0';ctx.fillRect(-s*.3,-s*.25,s*.7,s*.5);
    }else if(family==='cross'){
      ctx.rotate((this.traveled||0)/45);ctx.fillStyle='#50492e';ctx.fillRect(-s-2,-4,s*2+4,8);ctx.fillRect(-4,-s-2,8,s*2+4);ctx.fillStyle='#ead59c';ctx.fillRect(-s,-2,s*2,4);ctx.fillRect(-2,-s,4,s*2);ctx.fillStyle='#fff4cb';ctx.fillRect(-2,-2,4,4);
    }else if(family==='blade'){
      ctx.rotate((this.traveled||0)/26);poly([[-s*1.4,0],[-s*.4,-s*.7],[s*.4,-s*.7],[s*1.4,0],[s*.4,s*.7],[-s*.4,s*.7]],'#315a67');poly([[-s*1.2,0],[0,-s*.4],[s*1.2,0],[0,s*.4]],'#b7ebdc');ctx.fillStyle='#51b9cf';ctx.fillRect(-2,-2,4,4);
    }else if(family==='toxin'){
      poly([[s,0],[s*.2,-s*.6],[-s*.5,-s*.5],[-s*1.3,0],[-s*.5,s*.5],[s*.2,s*.6]],'#354d28');poly([[s*.6,0],[0,-s*.4],[-s*.6,0],[0,s*.4]],'#92c451');ctx.fillStyle='#d1e792';ctx.fillRect(0,-2,3,3);
    }else {
      const hunter=this.weaponId==='soul_hunter',crystal=this.weaponId==='crystal_weapon';
      if(crystal)poly([[s,0],[0,-s],[-s*.8,0],[0,s]],'#75ccec');
      else {ctx.fillStyle=hunter?'#304d37':'#304c70';ctx.beginPath();ctx.arc(0,0,s*.8,0,TAU);ctx.fill();ctx.strokeStyle=this.color;ctx.lineWidth=2;ctx.stroke();}
      ctx.fillStyle=hunter?'#d7f6a4':crystal?'#e0f6ff':'#b3e8ec';ctx.fillRect(-3,-3,5,5);
      if(/soul/.test(this.weaponId||'')){ctx.fillStyle='#315951';ctx.fillRect(1,-2,2,2);ctx.fillRect(1,1,2,2)}
    }
    ctx.restore();
  };
})();
