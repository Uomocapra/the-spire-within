import test from 'node:test';
import assert from 'node:assert/strict';
import { getQuestions } from '../dist/questions.js';
import { journeyMapMarkup, journeyLayout, journeyPoint, positionJourney, animateJourney, journeyNodeKind, JOURNEY_NODE_LABELS } from '../dist/journey-map.js';

test('ordinary daily questions use question marks, game scenarios use monsters, and restful or reflective questions get their special nodes', () => {
  const questions=getQuestions(50), kind=id=>journeyNodeKind(questions[id-1]);
  assert.equal(kind(3),'event','An everyday disagreement is an ordinary question');
  assert.equal(kind(10),'battle','Even a combat scenario remains a game question');
  assert.equal(kind(1),'battle','The merchant scene is a game question, not a new shop category');
  assert.equal(kind(16),'fire','The protected campfire question stays at a campfire');
  assert.equal(kind(13),'fire','Recovering energy is a restful question');
  assert.equal(kind(19),'elite','Considering Neow’s agreement is a featured reflection');
  assert.equal(kind(12),'shop','Planning what to spend gold on belongs in a shop');
  assert.equal(kind(30),'shop','Thinking about card removal belongs in a shop');
  assert.equal(JOURNEY_NODE_LABELS.battle,'游戏情境');
  assert.equal(JOURNEY_NODE_LABELS.event,'日常问题');
  for(const q of questions){
    const node=journeyNodeKind(q);
    if(node==='battle')assert.equal(q.kind,'spire');
    if(node==='event')assert.equal(q.kind,'daily');
  }
});

function fixture({reduced = false, framesAvailable = true, seed = 1} = {}) {
  const frames = new Map(), attributes = new Map(), classes = new Set();
  let frameId = 0;
  const marker = {style:{}}, viewport = {clientHeight:500, scrollTop:0};
  const root = {
    isConnected:true, dataset:{mapSeed:String(seed)},
    classList:{add:c=>classes.add(c), remove:c=>classes.delete(c)},
    setAttribute:(k,v)=>attributes.set(k,v), removeAttribute:k=>attributes.delete(k),
    querySelector:s=>s==='.map-player'?marker:viewport, querySelectorAll:()=>[],
    ownerDocument:{defaultView:{
      matchMedia:()=>({matches:reduced}),
      requestAnimationFrame:framesAvailable?fn=>{frames.set(++frameId,fn);return frameId;}:undefined,
      cancelAnimationFrame:id=>frames.delete(id),
    }},
  };
  const tick = timestamp => {const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(timestamp));};
  return {root,marker,viewport,frames,attributes,classes,tick};
}

test('30/50 maps expose only answered nodes and the first unanswered node; summit unlocks after all answers', () => {
  for (const length of [30,50]) {
    const questions=getQuestions(length), answers=Array(length).fill(null);
    answers[0]=0;answers[1]=-2;
    const markup=journeyMapMarkup(questions,2,answers);
    const buttons=[...markup.matchAll(/<button\b[^>]*data-node="(\d+)"[^>]*>/g)];
    assert.equal(buttons.length,length+1);
    assert.deepEqual(buttons.filter(m=>!m[0].includes(' disabled')).map(m=>Number(m[1])),[0,1,2]);
    assert.match(buttons[2][0],/aria-current="step"/);
    assert.match(markup,/map-node-fire/);
    const completed=journeyMapMarkup(questions,length-1,Array(length).fill(0));
    assert.equal([...completed.matchAll(/<button\b[^>]* disabled/g)].length,0);
    assert.match(completed,new RegExp('data-node="'+length+'"'));
  }
});

test('traveller stays on the rendered route, moves upward and reaches the summit', () => {
  for (const length of [30,50]) {
    const {points,height}=journeyLayout(length);
    assert.ok(points[0].y<height);assert.ok(points.at(-1).y>0);
    for (let i=0;i<length;i++) {
      assert.deepEqual(journeyPoint(length,i,i+1,0),{x:points[i].x,y:points[i].y});
      assert.deepEqual(journeyPoint(length,i,i+1,1),{x:points[i+1].x,y:points[i+1].y});
      const mid=journeyPoint(length,i,i+1,.5);
      assert.ok(mid.y<points[i].y && mid.y>points[i+1].y);
      assert.ok(mid.x>=Math.min(points[i].x,points[i+1].x) && mid.x<=Math.max(points[i].x,points[i+1].x));
    }
  }
});

test('travel lasts one finite interval and releases its frame and busy state', async () => {
  const f=fixture(), promise=animateJourney(f.root,30,0,1);
  assert.equal(f.attributes.get('aria-busy'),'true');
  f.tick(100);f.tick(550);
  assert.equal(parseFloat(f.marker.style.top),journeyPoint(30,0,1,.5).y);
  f.tick(1000);assert.equal(await promise,true);
  assert.equal(f.root.dataset.currentNode,'1');assert.equal(f.frames.size,0);
  assert.equal(f.attributes.has('aria-busy'),false);assert.equal(f.classes.size,0);
});

test('leaving, replacing and aborting travel cancel queued work without completing the move', async () => {
  const f=fixture(), controller=new AbortController();
  const first=animateJourney(f.root,50,2,3,{signal:controller.signal});
  f.tick(0);controller.abort();assert.equal(await first,false);assert.equal(f.frames.size,0);
  const second=animateJourney(f.root,50,2,3);
  const third=animateJourney(f.root,50,2,3);assert.equal(await second,false);
  positionJourney(f.root,50,2);assert.equal(await third,false);assert.equal(f.frames.size,0);
  const fourth=animateJourney(f.root,50,2,3);f.root.isConnected=false;f.tick(20);
  assert.equal(await fourth,false);assert.equal(f.frames.size,0);assert.equal(f.classes.size,0);
});

test('reduced motion and unavailable animation APIs arrive immediately with no scheduled frames', async () => {
  for (const options of [{reduced:true},{framesAvailable:false}]) {
    const f=fixture(options);assert.equal(await animateJourney(f.root,30,29,30),true);
    assert.equal(f.root.dataset.currentNode,'30');assert.equal(f.frames.size,0);
    assert.equal(parseFloat(f.marker.style.top),journeyLayout(30).points[30].y);
  }
});

test('a saved seed reproduces the whole map, while new seeds change its main route and branches', () => {
  for (const length of [30,50]) {
    const first=journeyLayout(length,741902);
    assert.deepEqual(journeyLayout(length,741902),first);
    assert.deepEqual(journeyLayout(length,'741902'),first,'DOM dataset strings use the same seed');
    assert.notDeepEqual(journeyLayout(length,741903).points,first.points);
    assert.notDeepEqual(journeyLayout(length,741903).branches,first.branches);
    assert.equal(first.seed,741902);
    assert.deepEqual(journeyLayout(length),journeyLayout(length,1));
  }
});

test('decorative branches remain inside the parchment, ascend, and end two to eight floors below the top', () => {
  for (const length of [30,50]) for (const seed of [1,2,3,7,29,193,41003,2147483647,4294967295]) {
    const layout=journeyLayout(length,seed);
    assert.equal(layout.branches.length,3,'Main route plus three alternatives is the four-route maximum');
    assert.equal(layout.points.length,length+1,'Every question and the summit stay on the main route');
    assert.equal(layout.segments.length,length);
    for (const point of layout.points) assert.ok(point.x>=44 && point.x<=556);
    for (const branch of layout.branches) {
      assert.ok(length-branch.endFloor>=2 && length-branch.endFloor<=8);
      assert.equal(branch.endIndex,branch.endFloor-1);
      assert.equal(branch.points.at(-1).index,branch.endIndex);
      assert.equal(branch.segments.length,branch.points.length-1);
      assert.equal(branch.points.filter(point=>point.kind).length,branch.points.length-2,'Every intermediate floor has a full-size node, just like the main route');
      assert.deepEqual({x:branch.points[0].x,y:branch.points[0].y},{x:layout.points[branch.startIndex].x,y:layout.points[branch.startIndex].y},'A branch begins at a main-route fork');
      for (let i=1;i<branch.points.length;i++) {
        const point=branch.points[i], previous=branch.points[i-1];
        assert.ok(point.x>=44 && point.x<=556);
        assert.ok(point.y>0 && point.y<layout.height);
        assert.ok(point.y<previous.y,'Every segment travels up the tower');
        const main=layout.points[point.index];
        assert.ok((point.x===main.x&&point.y===main.y)||Math.abs(point.x-main.x)>=60,'Shared junctions coincide exactly; separate nodes retain clearance');
      }
    }
  }
});

test('the main route roams across the map and random forks merge without exceeding four parallel paths', () => {
  for(const length of [30,50])for(const seed of [1,2,3,7,29,193,41003,88291,7182,4294967295]){
    const layout=journeyLayout(length,seed), xs=layout.points.slice(0,-1).map(p=>p.x);
    assert.ok(Math.min(...xs)<150&&Math.max(...xs)>450,'The main route visits both outer sides');
    let junctions=0,crossings=0;
    for(let floor=0;floor<length;floor++){
      assert.ok(1+layout.branches.filter(b=>b.startIndex<=floor&&b.endIndex>floor).length<=4);
      const active=layout.branches.filter(b=>b.startIndex<floor&&b.endIndex>floor);
      const points=[layout.points[floor],...active.map(b=>b.points[floor-b.startIndex])];
      const unique=new Set(points.map(p=>`${p.x},${p.y}`));
      if(unique.size<points.length)junctions++;
      const tracks=[layout.points,...layout.branches.filter(b=>b.startIndex<floor&&b.endIndex>=floor).map(b=>Array.from({length:b.startIndex},()=>null).concat(b.points))];
      if(floor>0)for(let a=0;a<tracks.length;a++)for(let b=a+1;b<tracks.length;b++){
        const before=tracks[a][floor-1].x-tracks[b][floor-1].x,after=tracks[a][floor].x-tracks[b][floor].x;
        if(before*after<0)crossings++;
      }
    }
    assert.ok(junctions>=2,'The map has actual shared-node junctions, not only crossing strokes');
    assert.ok(crossings>0,'Route order changes between floors');
    const html=journeyMapMarkup(getQuestions(length),0,[],seed);
    const positions=[...html.matchAll(/class="map-branch-spot" style="left:([^;]+);top:([^;]+)px"/g)].map(m=>`${m[1]}|${m[2]}`);
    assert.equal(new Set(positions).size,positions.length,'Shared junctions draw only one icon');
  }
});

test('branch artwork adds no answer buttons or alternative summit, and markup keeps its seed', () => {
  const questions=getQuestions(30), answers=Array(30).fill(null), seed=88291;
  const layout=journeyLayout(30,seed), html=journeyMapMarkup(questions,0,answers,seed);
  assert.match(html,/data-map-seed="88291"/);
  assert.equal([...html.matchAll(/<button\b[^>]*data-node=/g)].length,31);
  assert.equal([...html.matchAll(/class="map-dead-end"/g)].length,layout.branches.length);
  assert.equal([...html.matchAll(/data-node="30"/g)].length,1);
  assert.match(html,/data-action="inspect-room"/,'Side nodes offer scene previews while the only answer buttons remain on the main route');
  assert.match(html,/assets\/map\/(?:battle|event|fire|shop)\.png/);
  assert.match(html,/map-arrival-ring/,'The current hand-drawn arrival circle is preserved');
  assert.match(html,/class="map-active-title"/,'The current title has a place above the route canvas');
  assert.doesNotMatch(html,/class="map-node-label"/,'Node titles must not overlap map routes');
});

test('seeded node positions, SVG curves and animated traveller share the same geometry', async () => {
  for (const length of [30,50]) for (const seed of [3,7182]) {
    const layout=journeyLayout(length,seed), from=8, to=9;
    const html=journeyMapMarkup(getQuestions(length),from,Array(length).fill(0),seed);
    const node=html.match(new RegExp('<button[^>]*data-node="'+from+'"[^>]*>'))[0];
    assert.ok(node.includes(`left:${layout.points[from].x/600*100}%;top:${layout.points[from].y}px`));
    assert.ok(html.includes(`d="${layout.segments[from]}"`));
    const coordinates=layout.segments[from].match(/-?\d+(?:\.\d+)?/g).map(Number),t=.25,u=1-t;
    const quarter={x:u**3*coordinates[0]+3*u*u*t*coordinates[2]+3*u*t*t*coordinates[4]+t**3*coordinates[6],y:u**3*coordinates[1]+3*u*u*t*coordinates[3]+3*u*t*t*coordinates[5]+t**3*coordinates[7]};
    assert.deepEqual(journeyPoint(length,from,to,t,seed),quarter,'The traveller follows the actual diagonal curve between staggered floors');
    const f=fixture({seed});
    positionJourney(f.root,length,from);
    assert.equal(parseFloat(f.marker.style.left),layout.points[from].x/600*100);
    const promise=animateJourney(f.root,length,from,to);
    f.tick(100);f.tick(550);
    const midpoint=journeyPoint(length,from,to,.5,seed);
    assert.equal(parseFloat(f.marker.style.left),midpoint.x/600*100);
    assert.equal(parseFloat(f.marker.style.top),midpoint.y);
    f.tick(1000);assert.equal(await promise,true);
    assert.equal(parseFloat(f.marker.style.left),layout.points[to].x/600*100);
    assert.equal(f.frames.size,0);
  }
});
