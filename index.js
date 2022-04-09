// IMPORTS
const { joinVoiceChannel, getVoiceConnection, getVoiceConnections, VoiceConnection } = require("@discordjs/voice");
const Discord = require("discord.js");
const { DiscordSR, VoiceMessage } = require("discord-speech-recognition");
const opus = require('@discordjs/opus');
const auth = require('./auth.json');
const voiceSets = require('./voiceClips/_voiceSets.json')
global.fetch = require('node-fetch');
const fs = require('fs');
const { moveMessagePortToContext } = require("worker_threads");
var serverSettings = loadServerSettings();
var serverSettingsJSON;


/******************
 * DECLS AND VARS *
 ******************/

const client = new Discord.Client({
	intents: [
		"GUILDS",
		"GUILD_VOICE_STATES",
		"GUILD_MESSAGES"
	]
});

const discordSR = new DiscordSR(client);
var strictlySam = false;					// Disables all non-sam voice clips
var progression_NiceCock = 0;				// Progresses through 4 versions of nice cock

/*************
 *    ***	 *
 * FUNCTIONS *
 *    ***    *
 *************/

/***************
 * VOICE FUNCS *
 ***************/

// Voice clip playback
function playClip(guildConnection, searchLogic, PATH, settings){
	if(searchLogic){
		const dispatcher = guildConnection.play(PATH, settings);
		dispatcher.on('start', () => {
			console.log(dispatcher.paused + " - " + dispatcher.pausedTime);
			dispatcher.pausedTime = 0;
		})
		doCooldown(guildConnection.channel.guild.id);
	}
}

// Voice clip cooldown
function doCooldown(guildID){
	// Fetch the voice cooldown for the server
	var cd = serverSettings.get(guildID).voiceCooldown 
	serverSettings.get(guildID).cooldownActive = true;
	console.log("Cooldown activated");
	setTimeout(function(){
		serverSettings.get(guildID).cooldownActive = false;
		console.log("Cooldown ended")
	}, cd * 1000);
}

// Play a random affirmation from the list
function playAffirmation(guildConnection){
	var rand = Math.floor(Math.random() * voiceSets.affirmations.length);
	const dispatcher = guildConnection.play("./voiceClips/" + voiceSets.affirmations[rand], {volume: 1});
}

// Play a random greeting from the list
function playGreeting(guildConnection){
	var rand = Math.floor(Math.random() * voiceSets.greetings.length);
	const dispatcher = guildConnection.play("./voiceClips/" + voiceSets.greetings[rand], {volume: 1});
}

// Regex sentence structure searches.
// Put multiple strings in an array within the SEQUENCE array to take any of the options as valid choices
function searchForSequence(words, sequence){
    let targets = sequence.length;
    let targetsFound = 0;

    //If sequence size is longer than words, it cant be possible
    if(words.length < sequence.length) return false;

    //If sequence size is 0, it's a useless search. Return true anyway
    if (targets == 0){
        console.log("searchForSequence: Sequence size is zero. Returning true anyway.");
        return true;
    } 

    //Iterate over the array of arrays
    for(var i = 0; i < words.length; i++){
        //Iterate over the inner array using 
        for(var j = 0; j < sequence[targetsFound].length; j++){
            //console.log("Comparing" + String(sequence[targetsFound][j]) + " to " + words[i]);             //DEBUG
            if(sequence[targetsFound][j].test(words[i])){
                targetsFound++;
                if(targets == targetsFound){
                    return true;
                }
                break;
            }
        }
    }

    return false;
}

// Special version of TheyCallMe
function theyCallMeMoonman(guildConnection, msg){
	const dispatcher = guildConnection.play("./voiceClips/theycallme12.ogg", {volume: 1});
	setTimeout(function(){ msg.member.setNickname('Moonman') }, 500);
	setTimeout(function(){ msg.member.setNickname('Teenus') }, 12500);
	setTimeout(function(){ msg.member.setNickname('David Duke?')}, 24000);
}



/******************
 * DATABASE FUNCS *
 ******************/

function loadServerSettings(){
	var collection = new Discord.Collection();
	
	//Read the server settings json
	fs.readFile('SERVER_SETTINGS.json', function(err, data) {
		// Check for errors
		if (err) throw err;   
		// Handle each entry being loaded
		serverSettingsJSON = JSON.parse(data);
		for(var i = 0; i < serverSettingsJSON.keys.length; i++){
			var key = serverSettingsJSON.keys[i]
			collection.set(key,serverSettingsJSON.data[i]);
			//Apply some changes for everything being loaded.
			collection.get(key).cooldownActive = false; 	//Reset all cooldownActive to false
			collection.get(key).isListening = true;			//Reset listening status to true
		}
		console.log(collection);
	});

	return collection;
}


function saveServerSettings(){
	// Apply all of the keys to serverSettingsJSON
	serverSettingsJSON.keys = serverSettings.keyArray();

	// Clear the array, then add each of the server props to the JSON
	serverSettingsJSON.data = [];
	for(var i = 0; i < serverSettingsJSON.keys.length; i++){
		serverSettingsJSON.data.push(serverSettings.get(serverSettingsJSON.keys[i]));
	}
	
	fs.writeFile('SERVER_SETTINGS.json', JSON.stringify( serverSettingsJSON ), err => {
     
    // Checking for errors
    if (err) throw err; 
   
    console.log("Done writing"); // Success
});
}



/*****************
 * API FUNCTIONS *
 *****************/

//Watch2Gether room generation
function createWatch2Gether(msg){
	// Find the text post channel for this server
	var targetChannelID = serverSettings.get(msg.channel.guild.id).textPostChannel;
	var targetChannel = msg.member.guild.channels.resolve(targetChannelID);
	// Check for failure to find a valid channel
	if(!targetChannel){
		console.log('No valid post channel set. Type "hey sam post here" to set one.');
		return;
	}

	fetch("https://w2g.tv/rooms/create.json", {
		method: 'POST',
		headers: {
			'Accept': 'application/json',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			"w2g_api_key": auth.watch2getherToken,
			"share": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
			"bg_color": "#000000",
			"bg_opacity": "50"
		})
	})
	.then(response => response.json())
	.then(function (data) {
		console.log("W2G: Here is your room! \n https://w2g.tv/rooms/" + data.streamkey);
		targetChannel.send("https://w2g.tv/rooms/" + data.streamkey);
	});
}


// Google search
function searchGoogle(msg){
	// Get the search URL
	var msgText = msg.content.toLowerCase();
	var searchText = msgText.split('google ')[1]
	if(!searchText) return;
	var searchURL = "https://www.google.com/search?btnI=1&q=" + searchText;
	console.log("Searching " + searchURL);

	// FETCH
	fetch(searchURL, {"allow_redirects": "false"}).then(function(response) {
		// Find the text post channel for this server
		var targetChannelID = serverSettings.get(msg.channel.guild.id).textPostChannel;
		var targetChannel = msg.member.guild.channels.resolve(targetChannelID);
		// Check for failure to find a valid channel
		if(!targetChannel){
			console.log('No valid post channel set. Type "hey sam post here" to set one.');
			return;
		}
		console.log(response);
		console.log(response.url);
		targetChannel.send('Blindly googling "' + searchText + '"\n' + response.url);
	});
}



/************
 *   ****	*
 * TRIGGERS *
 *   ****   *
 ************/


/*******************
 * LESSER TRIGGERS *
 *******************/

client.on('message', msg => {
	if (msg.member?.voice.channel && msg.content.toLowerCase() == 'hey sam'){
		const connection = msg.member.voice.channel.join();

		// Set up settings if they dont exist
		if(serverSettings.get(msg.guild.id) == undefined){
			console.log('New server detected! Creating a settings entry');
			serverSettings.set(msg.guild.id, {});
			serverSettings.get(msg.guild.id).voiceCooldown = 15;
			serverSettings.get(msg.guild.id).cooldownActive = false;
			serverSettings.get(msg.guild.id).isListening = true;
			console.log(serverSettings);
			console.log(serverSettings.keyArray());
			saveServerSettings();
		}
	}

	else if(msg.member?.voice.channel && msg.content.toLowerCase() == 'hey sam fuck off'){
		msg.member.voice.channel.leave();
	}

	// Type "hey sam post here" to provide a posting target sam's messages
	else if(msg.content.toLowerCase() == 'hey sam post here'){
		serverSettings.get(msg.member.guild.id).textPostChannel = msg.channel.id;
		saveServerSettings();
	}

  });

// When online, set activity to help message
client.on('ready', function(){
	client.user.setActivity('Type "hey sam"');
	console.log("Ready");
})


// Triggers whenver a member joins/leaves a channel, mutes/unmutes, etc.
client.on("voiceStateUpdate", function(oldMember, newMember){
	//Fetch the proper connection if available, exiting if unavailable
	var guildConnection = client.voice.connections.get(oldMember.guild.id);
	if(guildConnection == undefined){
		//console.log("No viable guild connection found. Exiting voiceStateUpdate trigger.")
		return;
	}

    // Events for when a member was not in a channel and enters a channel
	if(oldMember.channel == null && newMember.channel != null){

		//Fetch the proper connection if available, exiting if unavailable
		var guildConnection = client.voice.connections.get(newMember.member.guild.id);
		if(guildConnection == undefined) return;

		// If Sam is also in that channel
		if(newMember.channel.id == guildConnection.channel.id){
			
			// Check for coolguy names
			var nick = newMember.member.nickname;
			//console.log("User joined: " + nick);
			var callMeNum = -1;
			if(nick == 'Silver Bullet')	callMeNum = 0;
			else if(nick == 'All Kindsa Things') callMeNum = 1;
			else if(nick == 'Argon') callMeNum = 2;
			else if(nick == 'Darkchild') callMeNum = 3;
			else if(nick == 'Nightmasta') callMeNum = 4;
			else if(nick == 'Peabody') callMeNum = 5;
			else if(nick == 'Peanut Arbuckle') callMeNum = 6;
			else if(nick == 'Doorway') callMeNum = 7;
			else if(nick == 'Pink Dress') callMeNum = 8;
			else if(nick == 'Sweezy') callMeNum = 9;
			else if(nick == 'Go-Go Nutz') callMeNum = 10;
			else if(nick == 'Pineapple Man') callMeNum = 11;

			// Play line if coolguy detected
			if(callMeNum != -1) 
				guildConnection.play( "./voiceClips/theycallme" + callMeNum + ".mp3", {volume: .7} );
		
		}

	}			

});



/*******************
 * SPEECH TRIGGERS *
 *******************/

client.on("speech", (msg) => {
	if(msg.content == undefined) return;
	var msgText = (String)(msg.content);	// Message text in String format
	var words = msg.content.split(" ");		// Message text in Array[String] format split into words

	//Fetch the proper connection if available, exiting if unavailable
	var guildConnection = client.voice.connections.get(msg.member.guild.id);
	if(guildConnection == undefined){
		console.log("No viable guild connection found. Exiting speech trigger.")
		return;
	}

	// Transcript logging
	var guildName = msg.member.guild.name;
	var messengerName = msg.member.nickname;
	if(messengerName == null) messengerName = msg.member.user.username;
	var messengerID = msg.member.user.tag;
	console.log(guildName + ' -- ' + messengerName + " (" + messengerID + "): " + msgText);

	/****************
	 * SAM COMMANDS *
	 ****************/

	// "Sam" commands. Executed in order of precedence
	if( msgText.includes('Sam') ){
		
		//<SAM> "f*** off" - Kick Sam from the channel
		if(msgText.includes('f*** off')){
			msg.member.voice.channel.leave();
		}

		//<SAM> "listen" - Make Sam listen for quotes again
		else if(msgText.includes('listen')){
			serverSettings.get(msg.member.guild.id).isListening = true;
			playAffirmation(guildConnection);
		}

		//<SAM> "shut up" - Make Sam stop listening for quotes
		else if(msgText.includes('shut up')){
			serverSettings.get(msg.member.guild.id).isListening = false;
			const dispatcher = guildConnection.play( "./voiceClips/ok0.ogg", {volume: .7} );
		}

		else if(msgText.includes('debug server')){
			console.log( msg.member.guild );
			playAffirmation(guildConnection);
		}

		else if(msgText.includes('debug connections')){
			console.log( client.voice.connections );
			playAffirmation(guildConnection);
		}

		//<SAM> "set cooldown <seconds>" - Set the phrase cooldown
		else if(msgText.includes('set cool')){
			var msgArray = msgText.split(' ');
			var parsedCD = parseFloat(msgArray[msgArray.length-1]);
			if(parsedCD != NaN) {
				serverSettings.get(msg.member.guild.id).voiceCooldown = parsedCD;
				saveServerSettings();
				console.log("Cooldown set to: " + parsedCD);
				playAffirmation(guildConnection);
			}
		}

		//<SAM> "what do they call me" - What DO they call you??
		else if(msgText.includes('call') && msgText.includes('me')){
			// Exception for missing permissions
			// DO THIS AT SOME POINT ^^^
			// Exception for morty because fuck him
			if (msg.member.user.tag == 'FairWinds#8525'){
				const dispatcher = guildConnection.play( "./voiceClips/FUMorty.ogg", {volume: .7} );
				return;
			}
			
			var rand = Math.floor(Math.random() * 13);
			var clipName = ("./voiceClips/theycallme" + rand + ".mp3");	
			var name = '';
			switch(rand) {
				case 0: name = ('Silver Bullet');	break;
				case 1: name = ('All Kindsa Things'); break
				case 2: name = ('Argon'); break;
				case 3: name = ('Darkchild'); break;
				case 4: name = ('Nightmasta'); break;
				case 5: name = ('Peabody'); break;
				case 6: name = ('Peanut Arbuckle'); break;
				case 7: name = ('Doorway'); break;
				case 8: name = ('Pink Dress'); break;
				case 9: name = ('Sweezy'); break;
				case 10: name = ('Go-Go Nutz'); break;
				case 11: name = ('Pineapple Man'); break;
				case 12: theyCallMeMoonman(guildConnection, msg); return;
			}				
			
			const dispatcher = guildConnection.play( clipName, {volume: 1.2} );
			msg.member.setNickname( name );
		}

		//<SAM> "create watch" - Generate a watch2gether room
		else if(msgText.includes('create watch')){
			createWatch2Gether(msg);
		}

		//<SAM> "Google *search phrase*" - Search google for everything after Google
		else if(msgText.toLowerCase().includes('google')){
			searchGoogle(msg);
		}

		//<SAM> "Hi" / "Hello" / etc.
		else if(searchForSequence(words, [[/\bhey/i,/\bhello/i,/\bhi/i,/\byo/i,/\bIsam/i]])){
			playGreeting(guildConnection);
		}
	}


	/***********************
	 *        ******       *
	 * VOICE COMMANDS HERE *
	 *		  ******
	 * *********************/

	// Voice recognition clips ONLY IF IS LISTENING and NOT ON COOLDOWN
	else if(serverSettings.get(msg.member.guild.id).isListening 
	  && !serverSettings.get(msg.member.guild.id).cooldownActive){
		//<VC> "snake eyes"
		playClip( guildConnection, msgText.includes('snake eyes'), 
			'./voiceClips/fiveone.mp3', {volume: .9} );

		//<VC> "John Oliver"
		playClip( guildConnection, msgText.toLowerCase().includes('john oliver'), 
			'./voiceClips/johnOliver.mp3', {volume: .6} );

		//<VC> "early" + "often"
		playClip( guildConnection, msgText.includes('early') && msgText.includes('often'), 
			'./voiceClips/earlyoften.mp3', {volume: .8} );

		//<VC> "oh shit yo"
		playClip( guildConnection, msgText.includes('oh s*** yo'), 
			'./voiceClips/whoawhat.mp3', {volume: .8} );

		//<VC> "I'm dead"
		playClip( guildConnection, msgText.toLowerCase().includes('i\'m dead'), 
			//'./voiceClips/imdead.mp3', {volume: .8} );
			'./voiceClips/imDeadShort.ogg', {volume: .8} );

		//<VC> "peace" + "keeper"
		playClip( guildConnection, msgText.toLowerCase().includes('peace') && msgText.includes('keeper'), 
			'./voiceClips/peacekeeper.ogg', {volume: .6} );

		//<VC> "black" + "belt"
		playClip( guildConnection, msgText.includes('black') && msgText.includes('belt'), 
			'./voiceClips/blackbelt.mp3', {volume: .65} );

		//<VC> "queen" + " here"
		playClip( guildConnection, msgText.toLowerCase().includes('queen') && msgText.toLowerCase().includes('here'),
			'./voiceClips/queen.mp3', {volume: .8} );

		//<VC> "s***" + "king"
		playClip( guildConnection, msgText.includes('s***') && msgText.includes('King'), 
			'./voiceClips/mrking.mp3', {volume: .8} );

		//<VC> "you like it"
		playClip( guildConnection, msgText.includes('you like it') || msgText.includes('you like that'), 
			'./voiceClips/likeit.mp3', {volume: 1.1} );

		//<VC> "swag"
		playClip( guildConnection, msgText.includes('swag'), 
			'./voiceClips/swagout.mp3', {volume: .9} );

		//<VC> "Robbie"
		playClip( guildConnection, msgText.includes('Robbie'),
			'./voiceClips/aightrobbie.mp3', {volume: .7} );

		//<VC> "fly niggga" (spelled weird but it works)
		playClip( guildConnection, msgText.includes('fly niggga'),
			'./voiceClips/flynigga.mp3', {volume: 1} );

		//<VC> "fresh tap"
		playClip( guildConnection, msgText.includes('fresh tap'),
			'./voiceClips/youCanMakeFreshTap.ogg', {volume: 1} );

		//<VC> "straight fresh"
		playClip( guildConnection, msgText.includes('straight fresh'),
			'./voiceClips/straightFresh.ogg', {volume: 1} );

		//<VC> "nice knees"
		playClip( guildConnection, msgText.includes('nice knees'),
			'./voiceClips/niceknees.mp3', {volume: 1} );

		//<VC> "not ready"
		playClip( guildConnection, msgText.includes('not ready'),
			'./voiceClips/notready.mp3', {volume: 1} );

		//<VC> "powerlifter"
		playClip( guildConnection, msgText.includes('powerlifter'),
			'./voiceClips/powerlifter.mp3', {volume: 1} );

		//<VC> "first step" / "step one"
		playClip( guildConnection, msgText.includes('first step') || msgText.includes('step one'),
			'./voiceClips/step1.mp3', {volume: 1} );

		//<VC> "test tube" / "snail man"
		playClip( guildConnection, msgText.includes('test tube') || msgText.includes('snail m'),
			'./voiceClips/snailman.mp3', {volume: 1} );

		//<VC> "good night"
		playClip( guildConnection, msgText.toLowerCase().includes('goodnight') || msgText.toLowerCase().includes('good night'),
			'./voiceClips/goodnightManPeace.ogg', {volume: 1} );

		//<VC>"nice bike" / "trike"
		playClip( guildConnection, msgText.includes('nice bike') || msgText.includes('tricycle'),
			'./voiceClips/iGotANiceBike.ogg', {volume: .8} );

		//<VC> "it's like that"
		playClip( guildConnection, msgText.includes('it\'s like that'),
			'./voiceClips/itsLoikeThat.ogg', {volume: 1} );

		//<VC> "dinosaur"
		playClip( guildConnection, msgText.includes('dinosaur'),
			'./voiceClips/sillyDinosaurMan.ogg', {volume: .9} );

		// NON MDE QUOTES
		if(!strictlySam){
			//<VC> "I'm kind of retarded"
			playClip( guildConnection, msgText.includes('I\'m kind of retarded'),
				'./voiceClips/AlexJones_ImKindaRetarded.mp3', {volume: .6} );

			//<VC> "a lot of damage"
			playClip( guildConnection, msgText.includes('a lot of damage'),
				'./voiceClips/PhilSwift_LottaDamage.mp3', {volume: .4} );

			//<VC> "quite" + "big"
			playClip( guildConnection, msgText.includes('quite') &&  msgText.includes('big'),
				'./voiceClips/quiteBig.ogg', {volume:.4} );

			//<VC> "ah shit" / "here we go again"
			playClip( guildConnection, msgText.includes('ah s***') || msgText.includes('here we go again'),
				'./voiceClips/ahShitHereWeGoAgain.ogg', {volume: .7} );

			//<VC> "trash"
			playClip( guildConnection, msgText.includes('trash'),
				'./voiceClips/knowYourPlaceTrash.ogg', {volume: .5} );

			//<VC> "emotional damage"
			playClip( guildConnection, msgText.includes('emotional damage'),
				'./voiceClips/emotionalDamage.ogg', {volume: .5} );

			//<VC> "horn noises" (airhorn)
			playClip( guildConnection, msgText.includes('horn noises'),
			'./voiceClips/airhorn.mp3', {volume: .5} );

			//<VC> "i'm fine"
			playClip( guildConnection, msgText.toLowerCase().includes('i\'m fine'),
			'./voiceClips/theyAskYouHowYouAre.ogg', {volume: .65} );

			//<VC> "China"
			playClip( guildConnection, msgText.toLowerCase().includes('china'),
			'./voiceClips/socialCreditDeductedHalo.ogg', {volume: .8} );

			//<VC> "420"
			playClip( guildConnection, msgText.includes('420'),
			'./voiceClips/smokeWeedEveryDay.mp3', {volume: 1.2} );

			//<VC> "good" + "food"
			playClip( guildConnection, msgText.includes('good') & msgText.includes('food'),
			'./voiceClips/finallySomeGoodFuckingFood.wav', {volume: 2});

			//<VC> "these nuts"
			playClip( guildConnection, msgText.includes('these nuts') & msgText.includes(''),
			'./voiceClips/gottym0.ogg', {volume: .6});

			// "plead" + "fifth"

			// "built different"

			// "major bag alert"

			/********************
			 * Random Selectors *
			 ********************/


			//<VC> "thick"
			if(msgText.includes('thick')){
				var rand = Math.floor(Math.random() * 3);
				var vol;
				switch(rand){
					case 0: vol = .9; break;
					case 1: vol = .4; break;
					case 2: vol = .5; break;
				}
				const dispatcher = guildConnection.play("./voiceClips/damnBoy" + rand + ".ogg", {volume: vol});
				doCooldown(msg.member.guild.id);
			}

			//<VC> "suspicious"
			if(msgText.includes('suspicious')){
				var rand = Math.floor(Math.random() * 2);
				var vol;
				switch(rand){
					case 0: vol = 1; break;
					case 1: vol = 1; break;
				}
				const dispatcher = guildConnection.play("./voiceClips/sus" + rand + ".mp3", {volume: vol});
				doCooldown(msg.member.guild.id);
			}

			//<VC> "steven"
			if(msgText.toLowerCase().includes('steven')){
				var rand = Math.floor(Math.random() * 6);
				var vol;
				switch(rand){
					case 0: vol = .7; break;
					case 1: vol = .7; break;
					case 2: vol = .7; break;
					case 3: vol = .7; break;
					case 4: vol = .7; break;
					case 5: vol = .7; break;
				}
				const dispatcher = guildConnection.play("./voiceClips/steven" + rand + ".ogg", {volume: vol});
				doCooldown(msg.member.guild.id);
			}

			//<VC> "timmy"
			if(msgText.toLowerCase().includes('timmy')){
				var rand = Math.floor(Math.random() * 4);
				var vol;
				switch(rand){
					case 0: vol = .7; break;
					case 1: vol = .7; break;
					case 2: vol = .7; break;
					case 3: vol = .7; break;
				}
				const dispatcher = guildConnection.play("./voiceClips/timmy" + rand + ".ogg", {volume: vol});
				doCooldown(msg.member.guild.id);
			}

			//<VC> "nice cock"
			if(msgText.includes('nice cock') || msgText.toLowerCase().includes('jason')){
				var vol;
				switch(progression_NiceCock){
					case 0: vol = .7; break;
					case 1: vol = .8; break;
					case 2: vol = .7; break;
					case 3: vol = .4; break;
				}
				const dispatcher = guildConnection.play("./voiceClips/niceCock" + progression_NiceCock + ".ogg", {volume: vol});
				doCooldown(msg.member.guild.id);
				progression_NiceCock = (progression_NiceCock + 1) % 4
			}

		}
	}

  });

client.login(auth.discordToken);