const fs = require(`fs`)
const http = require(`http`)
const WebSocket = require(`ws`)  // npm i ws


const board = [[['blue','blue','blue','blue'],[],[],[],[],[],[],[],[],[],[],[],[],[]
    ,['red','red','red','red']],[[],[],[],[],[],[],[],[],[],[],[],[],[],[]
    ,[]],[[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]],[[],[],[],[],[],[]
    ,[],[],[],[],[],[],[],[],[]],[[],[],[],[],[],[],[],[],[],[],[],[],[],[
    ],[]],[[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]],[[],[],[],[],[],[
    ],[],[],[],[],[],[],[],[],[]],[[],[],[],[],[],[],[],[],[],[],[],[],[],
    [],[]],[[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]],[[],[],[],[],[],
    [],[],[],[],[],[],[],[],[],[]],[[],[],[],[],[],[],[],[],[],[],[],[],[]
    ,[],[]],[[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]],[[],[],[],[],[]
    ,[],[],[],[],[],[],[],[],[],[]],[[],[],[],[],[],[],[],[],[],[],[],[],[
    ],[],[]],[['yellow','yellow','yellow','yellow'],[],[],[],[],[],[],[],[
    ],[],[],[],[],[],['green','green','green','green']]]



const readFile = (fileName) =>
  new Promise((resolve, reject) => {
    fs.readFile(fileName, `utf-8`, (readErr, fileContents) => {
      if (readErr) {
        reject(readErr)
      } else {
        resolve(fileContents)
      }
    })
  })


const server = http.createServer(async (req, resp) => {
    console.log(`browser asked for ${req.url}`)
    if (req.url == `/mydoc`) {
        const clientHtml = await readFile(`client.html`)
        resp.end(clientHtml)
    } else if (req.url == `/myjs`) {
        const clientJs = await readFile(`client.js`)
        resp.end(clientJs)
    } else if(req.url == `/ludo.css`){
        const ludoCss = await readFile(`ludo.css`)
        resp.end(ludoCss)
    }
    else if(req.url == `/center.png`){
        const centerPng = await readFile('center.png')
        resp.end(centerPng)
    }
    else{
        resp.end(`not found`)
    }
})

server.listen(8000)

const wss = new WebSocket.Server({ port: 8080 })

//board
let updatedBoard = JSON.parse(JSON.stringify(board))

//dice -- function taken from the pdf
const x = 6
const dice = () => Math.floor(Math.random()*x) + 1
let diceValue = 0
//const iskilled taken from the pdf
const iskilled = (ox, oy) => (ox-7)*(ox-7)+(oy-7)*(oy-7) == 98

// code taken from assignment for part2, since it is allowed to either use that code.
const step = (color, ox, oy, steps) => {
  const transform = ([ox,oy]) => (
    {
      'blue': [+ox,+oy], 'green': [-ox,-oy], 'red': [-oy,+ox], 'yellow': [+oy,-ox]
    }[color])
    const path = ['-7,-7', '-1,-6', '-1,-5', '-1,-4', '-1,-3', '-1,-2', '-2,-1', '-3,-1', '-4,-1', '-5,-1', '-6,-1', '-7,-1', '-7,0',
                  '-7,1', '-6,1', '-5,1', '-4,1', '-3,1', '-2,1', '-1,2', '-1,3', '-1,4',
                  '-1,5', '-1,6', '-1,7', '0,7', '1,7', '1,6', '1,5', '1,4', '1,3',
                  '1,2', '2,1', '3,1', '4,1', '5,1', '6,1', '7,1', '7,0', '7,-1', '6,- 1','5,-1', '4,-1', '3,-1', '2,-1', '1,-2', '1,-3', '1,-4', '1,-5',
                  '1,-6', '1,-7', '0,-7', '0,-6', '0,-5', '0,-4', '0,-3', '0,-2', '0,-1']
    const [x,y] =
    transform(transform(transform(path[path.indexOf(transform([ox-7, oy-7]).join(','))+steps].split(','))))
      return [x+7,y+7]
}


let totalPlayers = 0
let currentPlayer = 0
const playerColors = {
  1: 'blue',
  2: 'red',
  3: 'green',
  4: 'yellow'
}
const wins = {
  '1': 0,
  '2': 0,
  '3': 0,
  '4': 0
}
const safePoints = ['6,1', '2,6', '6,12', '8,2', '8,13', '13,6', '12,8', '1,8']
const winningPoints = ['7,6', '7,8','6,7','8,7']

//on connection
wss.on(`connection`, (ws) => {
    console.log(`A user connected`)
    let gameStarted = false
    diceValue = dice()
    console.log(diceValue)
  
    //on connection, we'll have to send a color to the player and increase the player to player+1
    totalPlayers = totalPlayers + 1
    let playerColor = playerColors[totalPlayers]
    ws.send(JSON.stringify ({
      type: 'setColor',
      colour: playerColors[totalPlayers]
    }))


    if(totalPlayers === 4){ // now the board will be visible to all and the turn will be set and along with that the value of dice as well
      wss.clients.forEach((client) => {
          client.send(JSON.stringify ({
            type: `setBoard`,
            board: board
          }))
      
          client.send(JSON.stringify ({
            type: `dice`,
            val: diceValue
          }))

          //assign turn here as well
          currentPlayer = 0
          client.send(JSON.stringify ({
            type: `turn`,
            turn: playerColors[currentPlayer+1]
          }))

        })
      
    }

    






    ws.on('message', (data) => {
      console.log(`received: ${data}`)
      const messageReceived = JSON.parse(data);
      console.log(messageReceived)

      
      //we have received a message from the client
      if (messageReceived.type == 'clickSprite'){ // implementation of when the person clicks on a sprite
        console.log(`sup`)
        
        if(messageReceived.color !== playerColors[currentPlayer+1]){ // then we send another error message 
          const message = "Not your turn!"
          // send this message to that person 
          ws.send(JSON.stringify ({
            type: `serverMessage`,
            message: message
          }))
        }
        else{
          //now we need to compute the new board
          //for simplicity steps will be called with 1 
          //lets extract x and y first
          const cords = messageReceived.spriteCord
          // console.log(cords)
          const rowIndex = cords.row
          const colIndex = cords.col
          const color = messageReceived.color
          const killed = iskilled(rowIndex,colIndex) // gives us true or false
          let newRowIndex = 0
          let newColIndex = 0
          let free = true
          if(iskilled(rowIndex,colIndex) && diceValue !== 6){
            free = false
          }
          //check here if the sprite can move, if it cant then free = false
          //then check if that color has the last sprite then turn is switched other wise it is not
          if(color == "blue"){
            if(rowIndex === 7){
              if(diceValue > (6-colIndex)){
                free = false
              }
            }
          }
          else if(color == "red"){
            if(colIndex === 7){
              if(diceValue > (6 - rowIndex)){
                free = false
              }
            }
          }
          else if(color == "yellow"){
            if(rowIndex > 8){
              if(colIndex ===7){
                if(diceValue> (rowIndex - 8)){
                  free = false
                }
              }
              
            }
          }
          else if(color == "green"){
            if(rowIndex === 7){
              if(colIndex > 8){
                if(diceValue> (colIndex-8)){
                  free = false
                }
              }
            }
          }


          if(free){//then it can move
            //if iskilled then move 1
            if(iskilled(rowIndex,colIndex)){
              const updateCordinates = step(color,rowIndex,colIndex,1)
              newRowIndex = updateCordinates[0]
              newColIndex = updateCordinates[1]
              updatedBoard[rowIndex][colIndex].splice(updatedBoard[rowIndex][colIndex].indexOf(color),1)
              // updatedBoard[updateCordinates[0]][updateCordinates[1]].push(color)
            }
            else{
              const updateCordinates = step(color,rowIndex,colIndex,diceValue)
              newRowIndex = updateCordinates[0]
              newColIndex = updateCordinates[1]
              updatedBoard[rowIndex][colIndex].splice(updatedBoard[rowIndex][colIndex].indexOf(color),1)
              // updatedBoard[updateCordinates[0]][updateCordinates[1]].push(color)
            }

            



            //board is updated but what if there is a killing situation 
            //we need to check if at that position, there is another sprite then we send it to its home
            // new row index neew col index is something we have
            let isSafe = safePoints.includes(`${newRowIndex},${newColIndex}`)
            let thatCell = updatedBoard[newRowIndex][newColIndex]
            console.log(isSafe)
            if(thatCell.length !== 0 ){ // if we have reached a point that is not safe then we can kill 
              if(!thatCell.includes(color)){
                if(!isSafe){
                  const killColor = thatCell[0]
                  const spritesPresent = [...thatCell]
                  const numSprites = thatCell.length
                  console.log("KILLED")
                  updatedBoard[newRowIndex][newColIndex] = []
                  if(killColor == "blue"){
                    //update board
                    updatedBoard[0][0].push(...spritesPresent)
                  }
                  else if(killColor == "yellow"){
                    updatedBoard[14][0].push(...spritesPresent)
                  }
                  else if(killColor == "red"){
                    updatedBoard[0][14].push(...spritesPresent)
                  }
                  else if(killColor == "green"){ // green
                    updatedBoard[14][14].push(...spritesPresent)
                  }
                }
              }
            }
            //update board
            updatedBoard[newRowIndex][newColIndex].push(color)


            //winning
            const spriteWon = winningPoints.includes(`${newRowIndex},${newColIndex}`)
            if(spriteWon){
              wins[currentPlayer+1] = wins[currentPlayer+1] + 1
            }

            const winsCurrent = wins[currentPlayer+1]
            console.log(wins)
            if(winsCurrent === 4){
              //send him winner message
              wss.clients.forEach((client) => {
                client.send(JSON.stringify ({
                  type: 'win',
                  color: color
                }))
              })
            }


          }
          

          
          
          

          // console.log(updatedBoard)
          // console.log(board)
          
          diceValue = dice()
          //diceValue = 1
          currentPlayer += 1
          currentPlayer = currentPlayer % 4

          wss.clients.forEach((client) => {
            client.send(JSON.stringify ({
              type: `updateBoard`,
              board: updatedBoard
            }))
        
            client.send(JSON.stringify ({
              type: `dice`,
              val: diceValue
            }))

            //assign turn here as well
            client.send(JSON.stringify ({
              type: `turn`,
              turn: playerColors[currentPlayer+1]
            }))

          })
        }


        
        
      }
    }) 

})
