const socket = new WebSocket(
    "wss://tensorflowjs-multiplayer-backend-1.onrender.com"
);


socket.onopen = () => {

    console.log(
        "WebSocket connected"
    );

};


socket.onmessage = (event)=>{

    const data =
        JSON.parse(event.data);


    if(data.type === "welcome")
    {
        console.log(
            "My player id:",
            data.id
        );
    }


    if(data.type === "state")
    {
        console.log(
            "Players:",
            data.playerCount
        );

        updatePlayers(data.players);
    }

};


socket.onerror = err => {

    console.log(
        "Socket error",
        err
    );

};



export function send(data)
{
    if(socket.readyState === WebSocket.OPEN)
    {
        socket.send(
            JSON.stringify(data)
        );
    }
}


function updatePlayers(players)
{
    console.log(
        players
    );

    // Later:
    // update Three.js avatars here
}
