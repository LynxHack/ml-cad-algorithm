// todo, make this more efficient, by using index instead of slice
function createArray(dimensions) {
    var recurse = function(index){
        if(index === dimensions.length){
            return;
        }
        console.log(dimensions[index]);
        var newArray = new Array(dimensions[index]);
        for(let i = 0; i < dimensions[index]; i++){
            newArray[i] = recurse(index + 1);
        }
        return newArray;
    }
    return recurse(0);
}

function getdim(arr)
{
  var curr = arr;
  var res = [];
  while(curr !== undefined){
    res.push(curr.length);
    curr = curr[0];
  }
  return res;
} 

module.exports = {
    createArray: createArray,
    getdim: getdim
};