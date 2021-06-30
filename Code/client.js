const ws = new WebSocket(`ws://localhost:8080`)


const Ludo = () => {
    // to set the board and update it
    const [board,setBoard] = React.useState([]) // of type list/array 
    // to set the color and store the color of the sprite for a specific client
    const [color,setColor] = React.useState("") // of type string
    // to set the value of dice, we need to have a dice variable
    const [dice, setDice] = React.useState(0) //initially setting the dice to zero 
    // to set the color of the person in the board
    const [colour, setColour] = React.useState("") // of type string
    //to set the message from the server
    const [serverMessage, setserverMessage] = React.useState("") //of type string
    //to set the turn
    const [turn, setTurn] = React.useState("")
    //if win
    const [win, setWin] = React.useState("")
  


    //part2 onclick function, whenever a client clicks on their sprite, a message is sent to the server
    const clickSprite = (colorSprite, spriteCord) => {
      console.log(`sup`)
      const clientMessage = {
        type: `clickSprite`,
        color: colorSprite,
        spriteCord
      };
      //only send message if clicked on their own sprite
      if(colorSprite === colour){
        if(win == ""){
          ws.send(JSON.stringify(clientMessage))
        }
      }
    };


    //message from server
    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log(message);

        //if the server sends a setBoard - it means game just started
        if (message.type === 'setBoard' ){
            console.log(`okk`)
            setBoard(message.board)
        }
        if (message.type === 'updateBoard'){
          console.log(`ok`)
          setBoard(message.board)
        }
        if (message.type === 'dice'){
          console.log(`dice value is here with the value: ${message.val}`)
          setDice(message.val)
        }
        if (message.type === 'setColor'){
          console.log(`color received: ${message.colour}`)
          setColour(message.colour)
        }
        if (message.type === 'turn'){
          console.log(`turn : ${message.turn}`)
          setTurn(message.turn)
        }
        if (message.type === 'serverMessage'){
          console.log( `message: ${message}`)
          setserverMessage(message.message)
          setTimeout(() => {
            setserverMessage("")
          }, 2000);
        }
        if(message.type === 'win'){
          console.log(`win`)
          setWin(message.color)
        }
    }

    return (
        <div>
        {board.map((row, rowIndex) => (
          <div key={rowIndex}>
            {row.map((col, colIndex) => (
              <div
                key={`${colIndex}${rowIndex}`}
                className={`cell${rowIndex}${colIndex}`}
              >
                {col.map((sprite, cell) => (
                  <div
                    onClick = { (event) => {
                      clickSprite(sprite, {row:rowIndex,col:colIndex})
                    }}
                    key={`${colIndex}${cell}`}
                    className={sprite}
                  ></div>
                ))}
              </div>
              
            ))}
          </div>
        ))}
        <div className = "dice">{dice}</div>
        <div className = {`color ${colour}`}></div>
        <div className = "text_box">
          {board.length === 0 && `Waiting for players to join`}
          {turn !== "" && win === "" && `${turn}'s turn. `}
          {win !== "" && `${win} has won, game over`}
          {serverMessage}
        </div>
      </div>

    )
}

ReactDOM.render(<Ludo />, document.querySelector(`#root`))
