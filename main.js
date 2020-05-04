// imports
const {createArray, getdim} = require( './util.js');
const {parseFiles} = require('./io.js')
var myLoggers = require('log4js');

myLoggers.configure({
    appenders: {
        out: { type: 'stdout', layout: { type: 'messagePassThrough' } },
        file: { type: 'file', filename: 'data.log', layout: { type: 'messagePassThrough' } }
      },
      categories: {
        default: { appenders: ['out','file'], level: 'info' }
      }
    });

var logger = myLoggers.getLogger('default');  
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
        // console.log("agent", this.id, "picked direction", dir);
        if(!this.checkValid(dir)){
            throw new Error("Cannot go in this direction");
        }
        // board[this.i][this.j] = (Number(this.id) + 3) + ""; //set as have traversed by minusing 2 from square status
        board[this.i][this.j] = '3';
        // check if complete
        if(board[ni][nj] === this.id){
            // console.log("Agent", this.id, "reached its destination");
            this.complete = true;
        }

        board[ni][nj] = (Number(this.id) + 5) + "";
        this.setCoord(ni, nj);
    }

    reset = () => {
        this.i = null;
        this.j = null;
        this.complete = false;
    }
}

function getRandom(arr){
    return arr[Math.floor(Math.random() * arr.length)];
}

// Hyper-parameters
var learnRate = 0.2
var epsilon = 1.0
var discountRate = 0.9;

// rewards
var rewards = {
    // 'getnode': 10,
    'finish': 1000,
    'deadend': -100,
    // 'turn': -1
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

function encodeTile (a1, a2){
    var res = [];
    for(let i = -1; i < 3; i++){
        for(let j = -1; j < 3; j++){
            var ni1 = a1.i + i;
            var nj1 = a1.j + j;
            var ni2 = a2.i + i;
            var nj2 = a2.j + j;

            if(ni1 < 0 || ni1 >= board.length || nj1 < 0 || nj1 >= board.length){
                res.push('*');
            }
            else{
                res.push(board[ni1][nj1]);
            }

            if(ni2 < 0 || ni2 >= board.length || nj2 < 0 || nj2 >= board.length){
                res.push('*');
            }
            else{
                res.push(board[ni2][nj2]);
            }
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

function copyBoard(arr){
    var newArray = [];
    for (var i = 0; i < arr.length; i++)
        newArray[i] = arr[i].slice();
    return newArray;
}

var numturns = 0;
var numepochs = 200000;
var numfinish = 0;
logger.info("epoch, numturns");
for(let epoch = 0; epoch < numepochs; epoch++){
    if((epoch + 1) % 190 === 0){
        logger.info(`${(epoch + 1)/10},${numfinish}`);
        numfinish = 0;
        numturns = 0;
    }
    // step 1 get the board state, initialize agent starting coordinates
    board = copyBoard(getRandom(tests));
    // board = copyBoard(tests[0]);
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
    // pick actions until hits the end conditions
    // console.log(board);
    numturns = 0;
    while(true){
        if(numturns > 100000){
            reward += rewards['deadend'];
            console.log("over 100000 turns")
            break;
        }
        numturns++;

        // show board state
        // syncWait(1000);
        // console.clear();
        // console.log(board);

        // get qlut of currstate
        // var currstate = encodeBoard(board);
        // var currstate = encodeTile(a1, a2);
        var currstate = a1.i + '.' + a1.j + '.' + a2.i + '.' + a2.j;
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
            // console.log("completed both routing")
            numfinish++;
            break;
        }

        // ran out of valid moves, lost, next epoch
        if(moves.length === 0){
            // console.log("no more valid moves");
            reward += rewards['deadend'];
            break;
        }

        // penalty for each additional wire length unit
        reward += rewards['turn'];

        // console.log("Possible moves:", moves); 

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
        // console.log("Chosen move is", chosenmove);
        // perform chosen action
        actions[chosenmove]();
        //update the qtable
        LUTupdate(currstate, chosenmove);
        // logger.info(`${epoch} ${numturns}`);
        // break;
    }
    // console.log(board);
    epsilon *= 0.95 // decrease the exploration rate over time
}

