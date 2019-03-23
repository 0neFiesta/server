
/**
 * Observo HTTP App Runtime
 * - This module runs the Express and Socket.io Servers.
 * - Also any "core" events will be ran here.
 * - :)
 */
//Include all modules
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var uuidv4 = require("uuid/v4")

server.listen(35575);
var num = Math.floor(Math.random() * 90000) + 10000;
console.log(num)

Plugin.onCustomMount((imports) => {

    let groups = { 0: {} }
    let groupData = {}


    let games = [
        "Bottle Flip",
        "Don't Press"
    ]
    let core = io.of("/core/").on('connection', function (client) {
        let uuid = uuidv4()
        let createdGroup = false
        let pin = 0
        client.on("isMaster", () => {
            console.log("NEW CLIENT [MASTER]")
            createdGroup = true
            let genCode = true
            while (genCode) {
                //Generate a 5 digit number for the pin
                var num = Math.floor(Math.random() * 90000) + 10000
                //Check if this pin is in use, make a new one if so.
                for (let group in groups) {
                    if (group[num] == null) {
                        genCode = false
                        pin = num
                        groups[num] = {}
                        //Emit the code to the client
                        client.emit("master_pin", { pin })
                        //Send list of all games to the user
                        client.emit("master_totalGames", { amount: games.length })
                        //Make the client join a room (which is the pin)
                        client.join(pin);
                        groupData[pin] = {}

                        let randomNoRepeats = (array) => {
                            var copy = array.slice(0);
                            return function () {
                                if (copy.length < 1) { copy = array.slice(0); }
                                var index = Math.floor(Math.random() * copy.length);
                                var item = copy[index];
                                copy.splice(index, 1);
                                return item;
                            };
                        }
                        groupData[pin].getGame = randomNoRepeats(games)
                        groupData[pin].scores = {}
                        groupData[pin].gameNumber = 0
                        groupData[pin].gameOn = null
                    }
                }
            }
        })
        let getWinner = (pin) => {
            //Loop through all of the games
            let scores = {
                users: {}
            }
            for (let _game in groupData[pin].scores) {
                for (let _user in groupData[pin].scores[_game]) {
                    let userScore = groupData[pin].scores[_game][_user] //Object
                    if (scores.users[userScore.user] == null) {

                        console.log("UUID")
                        console.log(userScore.user)
                        let name = groups[pin][userScore.user].name
                        scores.users[userScore.user] = {}
                        scores.users[userScore.user].name = name
                        scores.users[userScore.user].score = 0
                    }
                    let score = scores.users[userScore.user].score
                    score += userScore.score
                    scores.users[userScore.user].score = score
                }
            }
            let highest = 0
            let userName = null
            for (let user in scores.users) {
                let _u = scores.users[user]
                if (_u.score > highest) {
                    highest = _u.score
                    userName = _u.name
                }
            }
            let user = {name: userName, score: highest}
            return user
        }

        let selectGame = (pin) => {
            if (groupData[pin] != null) {
                let game = groupData[pin].getGame()
                groupData[pin].gameNumber++
                if (groupData[pin].gameNumber > games.length) {
                    let winner = getWinner(pin)
                    client.emit("master_winner", winner)
                    client.to(pin).emit("member_winner")
                    console.log("SHOW WINNER")
                } else {
                    client.emit("master_preview", {
                        number: groupData[pin].gameNumber,
                        game
                    })
                    groupData[pin].gameOn = game
                }

            }
        }
        client.on("master_startGame", () => {
            if (createdGroup) {
                let game = groupData[pin].gameOn
                groupData[pin].scores[game] = []

                client.to(pin).emit("member_startGame", { game })
                client.emit("master_startGame", { game })
                console.log("STARTING THE GAME FOR PIN: " + pin)
                let amountTime = (Math.floor(Math.random() * 10) + 4) * 1000;
                setTimeout(() => {
                    client.to(pin).emit("member_randomStartGame", { game })
                }, amountTime)
            }
        })

        //Game begins
        // --> Game gets picked,
        //5 second timer is added
        //Game is selected
        //Game timer started
        //GAME IS RUNNING
        //Group sends end game
        //Client sends score
        //Score is validated
        //Score is shown for 5 seconds
        //Next round
        client.on("master_stopGame", () => {
            if (createdGroup) {
                client.to(pin).emit("member_stopGame")
            }
        })
        client.on("master_begin", () => {
            if (createdGroup) {
                selectGame(pin)
            }
        })
        let updateUsers = (pin) => {
            console.log("UPDATE NAME")
            let users = {}
            for (let user in groups[pin]) {
                if (groups[pin][user].name != null) {
                    users[user] = groups[pin][user].name
                }
            }
            client.to(pin).emit("master_users", { users })
        }
        /////////////////////////////////////////////////////////////////////////////////////
        /**
         * IsMember?
         */
        client.on("isMember", () => {
            console.log("NEW CLIENT [MEMBER]")
        })
        let inGroup = false
        client.on("member_validatePin", (data) => {
            pin = data.pin
            if (groups[pin] != null) {
                client.join(pin) //Join the socket client group
                groups[pin][uuid] = {} //Create the user uuid
                groups[pin][uuid].name = null //Now set the name (which is nothing)
                inGroup = true
                client.emit("member_success")
            } else {
                client.emit("member_invalidPin")
            }
        })
        client.on("member_setName", (data) => {
            if (inGroup) {
                if (data.name != null) {
                    let name = data.name
                    groups[pin][uuid].name = name
                    console.log("SETTING NAME FOR: " + name)
                    //This should be sending event
                    updateUsers(pin)
                    client.emit("member_waiting")
                }
            }
        })

        let updateScores = (game) => {
            let scores = {}
            scores.now = {}
            scores.users = {}
            for (let _user in groupData[pin].scores[game]) {
                let userScore = groupData[pin].scores[game][_user] //Object
                console.log("UUID")
                console.log(userScore)
                let name = groups[pin][userScore.user].name
                console.log("SCORE")
                console.log(userScore.score)
                scores.now[userScore.user] = { name: name, score: userScore.score }
            }
            //Loop through all of the games
            for (let _game in groupData[pin].scores) {
                for (let _user in groupData[pin].scores[_game]) {
                    let userScore = groupData[pin].scores[_game][_user] //Object
                    if (scores.users[userScore.user] == null) {

                        console.log("UUID")
                        console.log(userScore.user)
                        let name = groups[pin][userScore.user].name
                        scores.users[userScore.user] = {}
                        scores.users[userScore.user].name = name
                        scores.users[userScore.user].score = 0
                    }
                    let score = scores.users[userScore.user].score
                    score += userScore.score
                    scores.users[userScore.user].score = score
                }
            }
            client.to(pin).emit("master_updateScores", { scores })
        }
        client.on("member_sendscore", (data) => {
            if (inGroup) {
                let score = data.score
                let game = groupData[pin].gameOn
                groupData[pin].scores[game].push({ user: uuid, score: score })
                updateScores(game);
            }
        })
    })

    app.get('/', function (req, res, next) {
        res.sendFile(__dirname + '/web/index.html');
        //db.createPack("FRC Scouting", ["database"])
    });
})
Plugin.register({
    GLOBAL: {

    },
})