import gym 
import random
import os

import numpy as np

from os import listdir
from os.path import isfile, join

## States
# 0 and 1 are blank and obstacles
# colors = ['white', 'blue', 'red', 'black', 'azure4', 'orange']

numColors = 6
colors = [' ', '1', '2', '*', '1', '2']

states = np.ndarray((numColors))

## Actions
numHeading = 4




## Takes in a filename and return the created 2d array
def parseFile(filename):
    with open(filename) as f:
        ## read the first one as the grid size
        arr = []
        for i in range(8):
            row = f.readline()[0:-1].split(' ')
            arr.append(row)
        return arr

def readAllFiles(directory):
    files = [f for f in listdir(directory) if isfile(join(directory, f))]
    ## sort lexicographically
    files.sort()
    tests = []
    for test in files:
        tests.append(parseFile(directory + '/' + test))
    return tests, files

def genTemp(tests):
    ## pick a random test template
    picked = random.choice(tests)

    ## randomly transform it
    ## types of transforms:
    ## 1) Rotation (0,90,180,270) [4]
    ## 2) No Mirror, Mirror (Vertical, Horizontal) [3]
    ## 3) Swap (1 and 2) / no swap [3]
    ## 4) Remove random barriers
    ## 5) Shift / Translate

tests, files = readAllFiles('./benchmarks')
print(tests, files)
# res = parseFile("./benchmarks/"+filename)
genTemp([])
        

