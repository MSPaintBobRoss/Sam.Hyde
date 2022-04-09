const fs = require('fs');
const { exit } = require('process');
var samCommandList = new Array(String);
var voiceCommandList = new Array(String);
var README;


// COLLECTING COMMAND TAGS <VC>
fs.readFile('index.js',function(err, indexData){
    var lines = indexData.toString().split("\n");
    for(var i = 0; i < lines.length; i++){
        // If <SAM>, add to samCommandList
        var SAMSplit = lines[i].toString().split('//<SAM> ');
        if(SAMSplit.length > 1){
            samCommandList.push(SAMSplit[1]);
        }
        
        // If <VC>, add to voiceCommandList
        var VCSplit = lines[i].toString().split('//<VC> ');
        if(VCSplit.length > 1){
            voiceCommandList.push(VCSplit[1]);
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
        README += '### Sam Commands - "Hey Sam, *command*\n"'
        for(var i = 1; i < samCommandList.length; i++){
            README += "<br />> " + samCommandList[i].toString();
        }

        // <VC> Quote Commands
        README += "### Quote Commands\n"
        for(var i = 1; i < voiceCommandList.length; i++){
            README += "<br />> " + voiceCommandList[i].toString();
        }
        fs.writeFile('README.md', README.toString(), {encoding: "utf8"},function(){});
    });

});
