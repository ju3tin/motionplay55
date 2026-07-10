const socket = new WebSocket(

"wss://tensorflowjs-multiplayer-backend-1.onrender.com"

);


socket.onopen = ()=>{

console.log(
"Connected to server"
);

};



socket.onerror=(error)=>{

console.log(
"WebSocket error",
error
);

};



export default socket;
