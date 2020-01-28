
import heapq
import math
import time
import threading

import itertools
from copy import copy, deepcopy
import random

from collections import deque

try:
    # for Python2
    from Tkinter import *   ## notice capitalized T in Tkinter 
except ImportError:
    # for Python3
    from tkinter import *   ## notice lowercase 't' in tkinter here
import os

# 0 and 1 are blank and obstacles
COLORS = ['white', 'blue', 'black','red','yellow','azure4', 'orange', 'maroon', 'pink', 'lime green', 'dark violet','green']


## Takes in a filename and return the created grid and list of routes to be wired
def parseFile(filename):
    with open(filename) as f:
        ## read the first one as the grid size
        dim = f.readline().split(' ')
        w, h = int(dim[0]), int(dim[1])
        grid = [[0 for x in range(w)] for y in range(h)] 

        # read the number of obstructions
        numobst = int(f.readline())

        # populate obstacles as 1s
        for k in range(numobst):
            nextval = f.readline().split(' ')
            x, y = int(nextval[0]), int(nextval[1])
            grid[y][x] = 1
        
        # num sinks
        numsinks = f.readline()

        ## return the info on the sinks
        content = f.readlines()
        sinks = [x.strip() for x in content]
        wires = []
        for i in range(len(sinks)):
            vals = sinks[i].split(' ')
            res = []
            for j in range(1, len(vals)-1, 2):
                grid[int(vals[j+1])][int(vals[j])] = i + 2
                res.append([int(vals[j+1]), int(vals[j])])
            wires.append(res)
        return grid, wires

## Takes in a coordinate, color, and the existing canvas to draw a color in the grid
def drawcell(i, j, color, c):
    c.create_rectangle(sizex*i,sizey*j,sizex*(i+1),sizey*(j+1), fill=color)

## draw the updated grid colors
def updategrid(grid, c):
    for i in range(len(grid)):
        for j in range(len(grid[0])):
            drawcell(i, j, COLORS[grid[i][j]], c)


## Calculate manhattan distance
def L1norm(p1, p2):
    return abs(p1[1] - p2[1]) + abs(p1[0] + p2[0])

## Calculate Euclidean distance
def L2norm(p1, p2):
    return math.sqrt((p1[0] - p2[0])**2 + (p1[1] - p2[1])**2)

## Astar Heuristics
def AStarManhattan(p, start, end):
    return L1norm(p, start) + L1norm(p, end)

## Directions possible for search
directions = [[1, 0], [-1, 0], [0, 1], [0, -1]]

## Astar implementation using heap and path backtracking
def astar(grid, start, end, colorid, path, c, visuals):
    visited = set()
    copy = [row[:] for row in grid]
    heap = [(0, start)]
    while len(heap) > 0:
        nextval = heapq.heappop(heap) ## store tuple of (manhanttan distance, [x, y])
        curr = nextval[1]
        if curr[0] == end[0] and curr[1] == end[1]:
            ## clear everything and write down the result
            for i in range(len(copy)):
                for j in range(len(copy[0])):
                    if copy[i][j] == -1:
                        copy[i][j] = 0
                    if copy[i][j] == -2:
                        copy[i][j] = colorid
            if(visuals):
                updategrid(copy, c)
            res = [curr]
            encoded = str(curr[0]) + "," + str(curr[1])
            while encoded in path:
                curr = path[encoded]
                decoded = curr.split(',')
                i = int(decoded[0])
                j = int(decoded[1])
                grid[i][j] = colorid
                if(visuals):
                    drawcell(i, j, COLORS[colorid], c)
                del path[encoded]
                encoded = curr
            return True

        if(visuals):
            time.sleep(0.01)
            drawcell(curr[0], curr[1], "brown", c)
            
        ## store all directions
        for dir in directions:
            ni = curr[0] + dir[0]
            nj = curr[1] + dir[1]

            ## try all directions if they are valid, store their heuristics in heap
            if ni >= 0 and nj >= 0 and ni < len(copy) and nj < len(copy[0]) and (copy[ni][nj] == 0 or copy[ni][nj] == colorid):
                ## mark down path sequence
                enc1 = str(ni) + "," + str(nj)
                if(enc1 in path):
                    return False
                enc2 = str(curr[0]) + "," + str(curr[1])
                path[enc1] = enc2
                heapq.heappush(heap, (AStarManhattan([ni, nj], start, end), [ni, nj]))
                # heapq.heappush(heap, (L2norm(end, [ni, nj]), [ni, nj]))
                if(copy[ni][nj] == colorid):
                    copy[ni][nj] = -2
                else:
                    copy[ni][nj] = -1

    if(len(heap) == 0):
        return False #not routable
    else:
        return True


## Implementation of Lee-Moores algorithm. Takes in a start and end point
def leemore(grid, start, end, colorid, c, visuals):
    copy = [row[:] for row in grid]
    q = deque()
    copy[start[0]][start[1]] = -1
    q.append(start)
    while len(q) > 0:
        coord = q.popleft()
        ## hit the target, start backtracking
        if visuals:
            time.sleep(0.01)
            drawcell(coord[0], coord[1], "brown", c)
        if(coord[0] == end[0] and coord[1] == end[1]):
            if(visuals):
                updategrid(grid, c)
            curr = coord
            while(True):
                ## backtracked to the start point, completed algorithm
                if(curr[0] == start[0] and curr[1] == start[1]):
                    return True

                for dir in directions:
                    ni = curr[0] + dir[0]
                    nj = curr[1] + dir[1]
                    
                    ## pick the direction if it's smaller than current square
                    if(ni >= 0 and nj >= 0 and ni < len(copy) and nj < len(copy[0]) and copy[ni][nj] < 0 and -copy[ni][nj] < -copy[curr[0]][curr[1]]):
                        curr = [ni, nj]
                        if visuals:
                            drawcell(curr[0], curr[1], COLORS[colorid], c)
                        grid[curr[0]][curr[1]]= colorid
                        break
            return False ## some error

        for dir in directions:
            curr = coord
            ni = curr[0] + dir[0]
            nj = curr[1] + dir[1]

            ## only expand in valid directions
            if ni >= 0 and nj >= 0 and ni < len(copy) and nj < len(copy[0]) and (copy[ni][nj] == 0 or copy[ni][nj] == colorid):
                copy[ni][nj] = copy[coord[0]][coord[1]] - 1
                q.append([ni, nj])

    return False ## went through the bfs expansion, but didn't reach target

# ## iterate through sinks that needs to be solved
def solveroutes(method, grid, wires, c, visuals):
    pairs = []
    for i in range(len(wires)):
        colorid = i + 2
        start = wires[i][0]
        for j in range(1, len(wires[i])):
            pairs.append([start, wires[i][j]])

    ## try all permutations of the list orders and return the best one if impossible
    permutations = list(itertools.permutations(pairs))
    random.shuffle(permutations)
    numroutes = len(pairs)
    currbest = 0
    bestgrid = [row[:] for row in grid]
    original = [row[:] for row in grid] ## for reseting
    counter = 0
    for testset in permutations:
        for pair in testset:
            start = pair[0]
            end = pair[1]
            if(method == "leemoore"):
                if(leemore(grid, start, end, grid[start[0]][start[1]], c, visuals)):
                    counter += 1
            else:
                if(astar(grid, start, end, grid[start[0]][start[1]], {}, c, visuals)):
                    counter += 1
       
        if(counter == numroutes):
            print("Finished: All " + str(numroutes) + " wires routed successfully in best solution")
            return counter
        if(counter > currbest):
            bestgrid = [row[:] for row in grid]
            grid = [row[:] for row in original]
            currbest = counter
        grid = [row[:] for row in original]
        print("Finished: " + str(currbest) + " out of " + str(numroutes) + " wires routed successfully in curr solution")  
        counter = 0
    grid = [row[:] for row in bestgrid]
    print("Finished: " + str(currbest) + " out of " + str(numroutes) + " wires routed successfully in best solution")    

    if(visuals):
        time.sleep(1)
        updategrid(grid, c)

        
## Main Code
# Read and setup grid
graphicsenable = True
method = "leemoore" ## {"leemoore", "astar"}

filename = sys.argv[1]

if len(sys.argv)> 2:
    method = sys.argv[2]
if len(sys.argv) > 3:
    graphicsenable = sys.argv[3].lower() == 'true'

grid, wires = parseFile("./benchmarks/"+filename+".infile")
root = Tk()

numx = len(grid[0])
numy = len(grid)
sizex = 1000/numx
sizey = 500/numy
array = [0] * (numx*numy) 

## set up white grids
frame = Frame(root, width=1000, height=1000)
frame.pack()
c = Canvas(frame, bg='white', width=1000, height=1000)
c.focus_set()
c.pack()

## Run algorithm in background via a thread
updategrid(grid, c)
thread = threading.Thread(target = solveroutes, args = (method, grid, wires, c, graphicsenable))
thread.start()

root.mainloop()
