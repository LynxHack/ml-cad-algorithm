// imports
const {createArray, getdim} = require( './util.js');
const {parseFiles} = require('./io.js')

var tests = parseFiles('./benchmarks')

var board;
var mapping;
var dirs = [[0,-1],[0,1],[-1,0],[1,0]]; //left, right, up, down

var enableLogger = true;

if(!enableLogger){
    console.log = function() {};
}

// create agent class
class Agent{
    constructor(id){
        this.i = this.j = null;
        this.id = id;
        this.complete = false;
    }

    setCoord = (ni, nj) => {
        this.i = ni;
        this.j = nj;
    }

    checkValid = (dir) => {
        if(this.complete){ //no more moves allowed after reaching end point for an agent
            return false;
        }
        var ni = this.i + dirs[dir][0];
        var nj = this.j + dirs[dir][1];
        // console.log("ID:", this.id, "dirs:", dir, ni, nj);
        if(ni < 0 || nj < 0 || ni >= board.length || nj >= board[0].length){
            // console.log("out of bounds");
            return false;
        }
        if(board[ni][nj] !== '0' && mapping[board[ni][nj]]!== this.id){
            // console.log("Not matched");
            return false;
        }

        return true;
    }

    // returns null if not possible to move
    move = (dir) => {
        var ni = this.i + dirs[dir][0];
        var nj = this.j + dirs[dir][1];
        console.log("agent", this.id, "picked direction", dir);
        if(!this.checkValid(dir)){
            throw new Error("Cannot go in this direction");
        }
        board[this.i][this.j] = (Number(this.id) + 3) + ""; //set as have traversed by minusing 2 from square status

        // check if complete
        if(board[ni][nj] === this.id){
            console.log("Agent", this.id, "reached its destination");
            this.complete = true;
        }

        board[ni][nj] = (Number(this.id) + 5) + "";
        this.setCoord(ni, nj);
    }

    reset = () => {
        this.i = null;
        this.j = null;
    }
}

function getRandom(arr){
    return arr[Math.floor(Math.random() * arr.length)];
}

// Hyper-parameters
var learnRate = 0.2
var epsilon = 0.9
var discountRate = 0.9;

// rewards
var rewards = {
    'getnode': 5,
    'finish': 100,
    'deadend': -10,
    'turn': -1
}

// states
mapping = {
    '7': '2', // square agent 2 is on
    '6': '1', // square agent 1 is on
    '5': '2', // square agent 2 have traversed
    '4': '1', // square agent 1 have traversed
    '3': '3', // barrier
    '2': '2', // agent 2's node
    '1': '1', // agent 1's node
    '0': '0'  // empty
}

var numactions = 8;
var qlut = {}; // create sparse object to store the lookup table (key is the encoded board state, row is the action to be taken)
var a1 = new Agent('1');
var a2 = new Agent('2');

function encodeBoard (board){
    var res = [];
    for(let i = 0; i < board.length; i++){
        for(let j = 0; j < board[0].length; j++){
            res.push(board[i][j]);
        }
    }
    return res.join('#');
}

// 4 possible actions for 2 agents (8 total possible actions)
var actions = {
    0: () => { a1.move(0) },
    1: () => { a1.move(1) },
    2: () => { a1.move(2) },
    3: () => { a1.move(3) },
    4: () => { a2.move(0) },
    5: () => { a2.move(1) },
    6: () => { a2.move(2) },
    7: () => { a2.move(3) },
}

var validmove = {
    0: () => { return a1.checkValid(0) },
    1: () => { return a1.checkValid(1) },
    2: () => { return a1.checkValid(2) },
    3: () => { return a1.checkValid(3) },
    4: () => { return a2.checkValid(0) },
    5: () => { return a2.checkValid(1) },
    6: () => { return a2.checkValid(2) },
    7: () => { return a2.checkValid(3) },
}

// Global values
var laststate;
var lastaction;
var reward = 0;

function maxQ(state){
    return Math.max.apply(null, qlut[state]);
}

function LUTupdate(state, action){
    if(laststate && lastaction){
        Qold = qlut[laststate][lastaction];
        Qnew = (1 - learnRate) * Qold + learnRate * (reward + discountRate * maxQ(state));
        qdiff = Qnew - Qold;
        qlut[laststate][lastaction] = Qnew;    
    }
    laststate = state;
    lastaction = action;
}

const syncWait = ms => {
    const end = Date.now() + ms
    while (Date.now() < end) continue
}

while(true){
    // step 1 get the board state, initialize agent starting coordinates
    board = getRandom(tests);
    a1.reset();
    a2.reset();

    for(let i = 0; i < board.length; i++){
        for(let j = 0; j < board[0].length; j++){
            if(board[i][j] === '1' && a1.i === null){
                a1.setCoord(i, j);
                board[i][j] = '6';
            }
            else if(board[i][j] === '2' && a2.i === null){
                a2.setCoord(i, j);
                board[i][j] = '7';
            }
        }
    }

    console.log(a1.i, a1.j, a2.i, a2.j);
    // pick actions until hits the end conditions
    var numturns = 0;
    while(true){
        if(numturns > 1000){
            reward += rewards['deadend'];
            break;
        }
        numturns++;

        // show board state
        // syncWait(1000);
        console.clear();
        console.log(board);

        // get qlut of currstate
        var currstate = encodeBoard(board);

        // get valid moves
        var moves = [];
        for(let i = 0; i < numactions; i++){
            if(validmove[i]()){
                moves.push(i);
            }
        }

        // check if all nodes are successfully routed
        if(a1.complete && a2.complete){
            reward += rewards['finish'];
            break;
        }

        // ran out of valid moves, lost, next epoch
        if(moves.length === 0){
            console.log("no more valid moves");
            reward += rewards['deadend'];
            break;
        }

        // penalty for each additional wire length unit
        reward += rewards['turn'];

        console.log("Possible moves:", moves); 

        if(!qlut[currstate]){
            qlut[currstate] = new Array(numactions);
            qlut[currstate].fill(0);
        }

        var chosenmove;
        if(Math.random() < epsilon){
            // do a random action from a list of valid moves
            chosenmove = getRandom(moves); //moves[Math.floor(Math.random() * moves.length)];
        }
        else{
            // pick the highest q value move from the list of valid actions
            chosenmove = moves[0];
            for(let i = 0; i < moves.length; i++){
                if(qlut[currstate][moves[i]] > qlut[currstate][chosenmove]){
                    chosenmove = moves[i];
                }
            }
        }
        console.log("Chosen move is", chosenmove);
        // perform chosen action
        actions[chosenmove]();

        //update the qtable
        LUTupdate(currstate, chosenmove);

        // break;

    }
    epsilon *= 0.995 // decrease the exploration rate over time
    break;
}

