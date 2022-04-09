const fs = require('fs');
const { exit } = require('process');
var voiceCommandList = new Array(String);
var README;


// COLLECTING COMMAND TAGS <VC>
fs.readFile('index.js',function(err, indexData){
    var lines = indexData.toString().split("\n");
    for(var i = 0; i < lines.length; i++){
        var tagSplit = lines[i].toString().split('//<VC> ');
        if(tagSplit.length > 1){
            voiceCommandList.push(tagSplit[1]);
        }
    }



    // Fetch the top of readme to preserve it
    fs.readFile('README.md', function(err, readmeData){
        var lines = readmeData.toString().split("\n");
        README = lines[0].toString() + "\n";
        var i = 1;
        while(lines[i] != undefined){
            README += lines[i].toString() + "\n";
            if(lines[i].includes("## Commands Here:")) break;
            i++;
        }

        // <SAM> Sam Commands
        // README += '### Sam Commands - "Hey Sam, <command>"\n'

        // <VC> Voice Commands
        README += "### Phrase Commands\n"
        for(var i = 1; i < voiceCommandList.length; i++){
            README += "- " + voiceCommandList[i].toString();
        }
        fs.writeFile('README.md', README.toString(), {encoding: "utf8"},function(){});
    });

});
