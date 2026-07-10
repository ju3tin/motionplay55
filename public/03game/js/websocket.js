const socket = new WebSocket(

"wss://tensorflowjs-multiplayer-backend-1.onrender.com"

);


socket.onopen = ()=>{

console.log(
"WebSocket connected"
);

};


socket.onerror=(e)=>{

console.log(
"WebSocket error",
e
);

};


export default socket;
