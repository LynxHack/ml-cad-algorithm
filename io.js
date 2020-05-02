// read files
var fs = require('fs');

function parseFiles(templatedir){
    var files = fs.readdirSync(templatedir);
    files = files.sort((a, b) => {
        return a.localeCompare(b)
    });
    
    var tests = [];
    for(let file of files){
        content = fs.readFileSync(templatedir + "/" + file, { encoding: 'utf8' });
        var lines = content.split('\n');
        var temp = [];
        for(let line of lines){
            temp.push(line.split(' '));
        }
        tests.push(temp);
    }

    return tests;
}

module.exports = {
    parseFiles: parseFiles
}
