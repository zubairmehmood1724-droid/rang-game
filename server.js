
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let rooms = {};

const order = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];

function createDeck(){
  const suits=["♠","♥","♦","♣"];
  let d=[];
  suits.forEach(s=>order.forEach(v=>d.push({suit:s,value:v})));
  return d.sort(()=>Math.random()-0.5);
}

function value(v){return order.indexOf(v)}

app.get("/",(req,res)=>res.sendFile(__dirname+"/index.html"));

io.on("connection",s=>{

s.on("createRoom",()=>{
 let id=Math.random().toString(36).substring(7);
 rooms[id]={players:[],hands:{},table:[],turn:0,hukum:null,scores:[0,0]};
 s.join(id);
 rooms[id].players.push(s.id);
 s.emit("room",id);
});

s.on("join",(id)=>{
 let r=rooms[id]; if(!r) return;
 s.join(id); r.players.push(s.id);

 if(r.players.length===4){
   r.deck=createDeck();
   r.hukum=r.deck[0].suit;

   r.players.forEach(p=>r.hands[p]=r.deck.splice(0,13));
   io.to(id).emit("start",r);
 }
});

s.on("play",({id,card})=>{
 let r=rooms[id]; if(!r) return;
 if(r.players[r.turn]!==s.id) return;

 r.table.push({player:s.id,card});
 r.hands[s.id]=r.hands[s.id].filter(c=>!(c.suit===card.suit&&c.value===card.value));

 r.turn=(r.turn+1)%4;

 if(r.table.length===4){
   let lead=r.table[0].card.suit;
   let win=r.table[0];

   r.table.forEach(c=>{
     if(c.card.suit===r.hukum && win.card.suit!==r.hukum) win=c;
     else if(c.card.suit===win.card.suit && value(c.card.value)>value(win.card.value)) win=c;
   });

   let idx=r.players.indexOf(win.player);
   r.turn=idx;
   r.scores[idx%2]+=1;
   r.table=[];
 }

 io.to(id).emit("update",r);
});

});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Running on " + PORT));
