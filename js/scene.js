// Shared feet, static contact shading and bounded local objective lights.
(() => {
  const generateMap=Game.generateMap,applyHit=Game.applyPlayerHitEffects,drawChoiceIcon=Game.drawChoiceIcon;
  Object.assign(Game,{
    drawChoiceIcon(ctx,key,x,y,w,h){
      const id=['sword','shield','bow','fireball'].find(id=>(CONFIG.WEAPONS[id].hudIcon||CONFIG.WEAPONS[id].icon)===key);
      if(!id)return drawChoiceIcon.call(this,ctx,key,x,y,w,h);
      ctx.save();ctx.translate(x,y);this.drawRepresentativeWeapon(ctx,id,Math.min(w,h)*.86);ctx.restore();
    },
    applyPlayerHitEffects(enemy,damage,weapon,source,critical,options){
      const result=applyHit.call(this,enemy,damage,weapon,source,critical,options);
      if(['bow','fireball'].includes(weapon?.id)&&this.particlePool&&this.particles.length<480){
        const color=weapon.id==='bow'?'#dee5cc':'#ffd585';
        for(let i=0;i<3;i++){const a=i*TAU/3+(enemy.id||0)*.7;this.particles.push(this.particlePool.obtain(enemy.x,enemy.y,Math.cos(a)*90,Math.sin(a)*90,color,.18,2));}
      }
      return result;
    },
    drawRepresentativeWeapon(ctx,id,size){
      if(!['sword','shield','bow','fireball'].includes(id))return false;
      ctx.save();ctx.scale(size/32,size/32);ctx.lineWidth=2;ctx.strokeStyle='#151c1d';
      if(id==='sword'){
        ctx.fillStyle='#abc0c5';ctx.beginPath();ctx.moveTo(0,-17);ctx.lineTo(4,-11);ctx.lineTo(3,6);ctx.lineTo(-3,6);ctx.lineTo(-4,-11);ctx.closePath();ctx.fill();ctx.stroke();
        ctx.fillStyle='#edf5e3';ctx.fillRect(-2,-10,2,15);ctx.fillStyle='#9a6735';ctx.fillRect(-7,5,14,3);ctx.strokeRect(-7,5,14,3);
        ctx.fillStyle='#513727';ctx.fillRect(-2,8,4,8);ctx.fillStyle='#c6a368';ctx.fillRect(-3,15,6,3);
      }else if(id==='shield'){
        ctx.fillStyle='#c0b18b';ctx.beginPath();ctx.moveTo(-11,-13);ctx.lineTo(11,-13);ctx.lineTo(10,5);ctx.lineTo(0,17);ctx.lineTo(-10,5);ctx.closePath();ctx.fill();ctx.stroke();
        ctx.fillStyle='#345048';ctx.beginPath();ctx.moveTo(-7,-9);ctx.lineTo(7,-9);ctx.lineTo(6,4);ctx.lineTo(0,12);ctx.lineTo(-6,4);ctx.closePath();ctx.fill();
        ctx.fillStyle='#dfcf9b';ctx.fillRect(-1,-9,2,20);ctx.fillRect(-7,-1,14,2);ctx.fillStyle='#f4e1b3';ctx.fillRect(-9,-11,2,2);ctx.fillRect(7,-11,2,2);
      }else if(id==='bow'){
        ctx.strokeStyle='#17221d';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(6,-15);ctx.bezierCurveTo(-15,-9,-15,9,6,15);ctx.stroke();
        ctx.strokeStyle='#a47c43';ctx.lineWidth=3;ctx.stroke();ctx.strokeStyle='#d9ddc0';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(6,-15);ctx.lineTo(6,15);ctx.stroke();
        ctx.fillStyle='#503a27';ctx.fillRect(-10,-4,4,8);
      }else{
        ctx.fillStyle='#682b26';ctx.beginPath();ctx.moveTo(0,-17);ctx.lineTo(10,-5);ctx.lineTo(12,8);ctx.lineTo(4,15);ctx.lineTo(-6,15);ctx.lineTo(-12,6);ctx.lineTo(-6,-6);ctx.lineTo(-5,0);ctx.closePath();ctx.fill();
        ctx.fillStyle='#f38635';ctx.beginPath();ctx.moveTo(0,-11);ctx.lineTo(7,3);ctx.lineTo(5,11);ctx.lineTo(-4,11);ctx.lineTo(-7,4);ctx.closePath();ctx.fill();ctx.fillStyle='#ffedb1';ctx.fillRect(-2,3,4,7);
      }
      ctx.restore();return true;
    },
    getScenePropFoot(prop){return prop.scene?prop.y:(prop.collisionY??prop.y)+(prop.halfH||prop.radius||0);},
    drawSceneProp(ctx,prop){
      const image=Assets.get(prop.type);if(!image)return;
      const foot=this.getScenePropFoot(prop),scale=prop.scene?Math.min(prop.drawW/image.width,prop.drawH/image.height):.8;
      const w=image.width*scale,h=image.height*scale,p=this.player;
      const obscures=p&&((prop.category==='houses')||(prop.category==='trees'))&&Math.abs(p.x-prop.x)<w*.4&&p.y<foot&&p.y>foot-h;
      ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha=obscures ? .48 : 1;
      ctx.drawImage(image,Math.round(prop.x-w/2),Math.round(foot-h),w,h);ctx.restore();
    },
    bakeSceneContact(ctx,x,y,width,seed){
      ctx.save();ctx.translate(x+5,y+2);ctx.scale(1,.38);
      const radius=Math.max(12,Math.min(72,width*.46)),g=ctx.createRadialGradient(0,0,2,0,0,radius);
      g.addColorStop(0,'rgba(8,12,9,.4)');g.addColorStop(.5,'rgba(8,12,9,.18)');g.addColorStop(1,'rgba(8,12,9,0)');
      ctx.fillStyle=g;ctx.fillRect(-radius,-radius,radius*2,radius*2);ctx.restore();
      const rng=makeRNG(seed),frost=this.levelData.theme==='frost';ctx.save();
      for(let n=0;n<8;n++){const dx=(rng()-.5)*width,dy=rng()*10;
        ctx.fillStyle=n%3===0?(frost?'#869ca4':'#71664c'):(frost?'#526c78':'#435038');ctx.globalAlpha=.45;
        ctx.fillRect(Math.round(x+dx),Math.round(y+dy),2+rng()*3,2);}
      ctx.restore();
    },
    generateMap(){
      generateMap.call(this);const c=this.groundTileCache.getContext('2d');
      for(const [i,p] of (this.mapData?.props||[]).entries())this.bakeSceneContact(c,p.x,this.getScenePropFoot(p),p.drawW||Math.max(30,(p.halfW||p.radius||20)*2),this.runSeed^i);
      for(const s of this.levelEncounters||[])if(!['cart','rift'].includes(s.id))this.bakeSceneContact(c,s.x,s.y,70,this.runSeed^0x73697465);
    },
    drawSceneObjective(ctx,site){
      const torch=this.levelData.theme==='frost'||site.id==='camp',key=torch?'props/torch_v110':'props/altar_v110';
      this.drawSceneProp(ctx,{type:key,x:site.x,y:site.y,scene:true,drawW:torch?38:72,drawH:torch?80:92});
      if(site.status==='waiting')return;
      // A short warm light highlights the upright fixture, never its trigger radius.
      const y=site.y-(torch?66:55),g=ctx.createRadialGradient(site.x,y,1,site.x,y,32);
      g.addColorStop(0,'rgba(255,190,75,.17)');g.addColorStop(1,'rgba(255,190,75,0)');
      ctx.fillStyle=g;ctx.fillRect(site.x-32,y-32,64,64);
    }
  });
  const drawEnemyProjectile=EnemyProjectile.prototype.draw;
  EnemyProjectile.prototype.draw=function(ctx){
    drawEnemyProjectile.call(this,ctx);
    ctx.save();ctx.strokeStyle='#ff8e72';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.arc(this.x,this.y,this.radius+1,0,TAU);ctx.stroke();ctx.restore();
  };
})();
