var express = require("express");
var app = express();
var server = require("http").Server(app);
var io = require("socket.io")(server);
var path = require("path");
var cookieSession = require("cookie-session");//per la session

app.use(express.static(path.join(__dirname, 'public')));
var bodyParser = require('body-parser'); //per interpretare valori della req e res

app.use(cookieSession({
	name: 'session',
	keys: ['key1', 'key2']
}));

app.set('views', 'views')
app.set("view engine", "ejs");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

var jsonfile = require("jsonfile");
var sensorList = "fileJson/sensorList.json";
var sensorData = "fileJson/sensorData.json";
var fileUserData = "fileJson/userData.json";
var iDsocketClientSide = ""; //all'interno di essa salvo il valore del id del client node che si interfaccia con il server global
var iDclientResultLoginConnection = "";
var iDclientHomeConnection = "";
var iDclientResultRegistrationHome = "";
var idResultOfRegistration = "";
var resultCheckHome;
var dataResultLogin;
var dataChange = "";
var max = -1;
var primavolta = true;
var renderData;
var dataResultAddSensor = false; //salvo il valore proveniente dal server global dellìavvenuta registrazione del sensore
var invioTypesSensors = false; //variabile che salva se l'invio è stato effettuato o meno
var	idAptendTypesSensors = ""; // variabile che salva l'id del client aptedendTypesSensors
var dataTypesSensors = false; //variabile che salva se i dati sono arrivati o meno
var typesSensors; //variabile che salva i tipi di sensori ricevuti dal server
var GresultRegistrationHome = {};

var idSensor = ""; //id socket del sensore
//-------------------------------------------------gestione http--------------------------
//pagina di login in cui l'utente si autentica per inserire la propria casa domotica nel server home
app.get("/login", function(req, res){
	renderData = {
		errorLogin: ""
	};
	res.render("login", renderData);
});

app.post("/trylogin", function(req, res){
	//con try login ricevo i dati da login.html e li invio a clientsideSocket.js e salvo sulla session il passaggio dell'utente sulla pagina di login
	var loginData = req.body;
	req.session.userNickname = loginData.nickname;
	req.session.userPassword = loginData.password;

	console.log(loginData.password +  " " + loginData.nickname);
	//leggo i valori passatami da login.ejs e li invio tramite socket al clientsideSocket.js
	if(io.sockets.connected[iDsocketClientSide]){
		io.sockets.connected[iDsocketClientSide].emit("trylogin", loginData);
		req.session.tryLogin = true;
		res.end("/resultLogin");
	}
	
});

app.post("/loginTransition", function(req, res){
	req.session.resultLogin = req.body.result;
	var result = req.session.resultLogin;
	console.log("loginTransition: "+req.session.resultLogin);
	//se il login ha avuto successo salvo i dati in un file di testo cos' da usarli per la comunicazione con il server.js
	if(result == "true"){
		console.log("login ok!")
		var userData = {userNickname: req.session.userNickname, userPassword: req.session.userPassword};
		jsonfile.writeFile(fileUserData, userData, function(err){//li aggiungo riscrivendolo
			if(err) console.log(err);				
		});
		res.end("/home");
	}else{
		console.log("errore login");
		req.session.userNickname = "";
		req.session.userPassword = "";
		res.end("/login")
	}
});

app.get("/resultLogin", function(req, res){
	//invio una pagina html con un socket di ascolto che restituisce all'utente il risultato della login
	if(req.session.tryLogin){ //se l'utente ha inviato i dati di login 
		res.sendFile(__dirname+"/resultLogin.html");
	}
});

app.get("/home", function(req, res){
	if(req.session.resultLogin){
	//instrado un pacchetto al clientsideSocket che lo invia a sua volta al server global per controllare se l'ip della casa sia presente o meno
		io.sockets.connected[iDsocketClientSide].emit("checkHome");
		console.log("home invio");
		res.sendFile(__dirname+"/home.html");  
	}else{
		res.redirect("/login");
	}
})

app.post("/transitionHome", function(req, res){
	console.log("transitionHome");
	if(req.body.result){
		res.end("/administrationSensor");
	}else{
		res.end("/registrationHome");
	}
});
app.get("/registrationHome", function(req, res){
	console.log("registration home");
	res.sendFile(__dirname+"/registrationHome.html");
});
app.get("/administrationHome", function(req, res){
	console.log("administrationHome");
		res.sendFile(__dirname+"/administrationHome.html");

});
app.post("/dataRegistrationHome", function(req, res){ //riveve i dati dalla pagina registrationHome.html dal client
	var data = req.body;
	//leggo i dati user e password salvati in un file json
	jsonfile.readFile(fileUserData, function(err, value){
		if(err) console.log(err);

		data.userNickname = value.userNickname;
		data.userPassword = value.userPassword;
		console.log(data.userNickname+data.userPassword);
		console.log("dataRegistrationHome: "+data.citta+" "+data.address+ " " + data.cap + " " + data.nome+" "+ data.userPassword);
		//ricevuti i dati dalla pagina registrationHome.html li invio al css.js che li invia a sua volta al server.js per inserirli nel database
		io.sockets.connected[iDsocketClientSide].emit("dataRegistrationHome", data);
		res.redirect("/resultRegistrationHome");
	});
});
app.get("/resultRegistrationHome", function(req, res){
	res.sendFile(__dirname+"/resultRegistrationHome.html");
});
app.post("/transitionRegistrationHome", function(req, res){
	console.log("transitionRegistrationHome")
	
	var resultRegistrationHome = req.body.result;
	req.session.resultRegistrationHome = resultRegistrationHome;
	//in base al valore di ritorno dal server instrado l'utente in diverse pagine
	if(resultRegistrationHome.resultHome){
		res.end("/administrationSensor");
	}else{
		res.end("/registrationHome");
	}
});
app.get("/administrationSensor", function(req, res){//richiesta di gestione sensori
//lettura sulla sensorList.json dei vari sensori che comunicano con la smarthome
	jsonfile.readFile(sensorList, function(err, obj){ //con la lettura del file inserisco gli oggetti che descrivono i sensori nell'array lista
		if(err) throw err;
		console.log("readFile "+ obj[0].name + obj[0].types.length);
		/*for(var i = 0; i < obj.length; i++){
			lista[i] = obj[i];
		}*/
		//richiedo al server l'immagine descrittiva del sensore in base al tipo
		var tipiSensore = [];
		for(var i = 0; i < obj.length; i++){
			for(var j = 0; j < obj[i].types.length; j++ ){
				//controllo se un determinato tipo non sia già stato inserito
				if(tipiSensore.indexOf(obj[i].types[j])==-1){
					tipiSensore.push(obj[i].types[j]);
				}
			}
		}
		//invio richiesta per controllare se quei tipi siano presente nel database
		if(tipiSensore.length > 0){
			console.log("tipi sensore administrationSensor: " + tipiSensore.length);
			io.sockets.connected[iDsocketClientSide].emit("askTypesSensors", tipiSensore);
		}
	});
			res.sendFile(__dirname+"/administrationSensor.html"); //invio pagina per attendere i dati di risposta
});
app.post("/addSensor", function(req, res){//sensorsSelected => {name, type}
 //ricevo i sensori selezionati, in un vettore, dalla pagina administrationSensor
	var data = req.body;
	console.log("addSensor: "+data.value[0].name+" id: "+data.value[0].idsensor);
	//devo ora aggiungerli al database nel serverglobal
	//invio il tipo scelto, e il nome
	//il sensore deve essere corrispondente ad un user ed una casa
	io.sockets.connected[iDsocketClientSide].emit("addSensor", data.value); //invio i dati a clientsideserver.js
	res.end("/transitionResultOfRegistration");
	//adesso scrivo nel file json sensorList.json l'id del tipo deii sensori
	jsonfile.readFile(__dirname+"/fileJson/sensorList.json", function(err, lett){
		for(var i = 0; i < lett.length; i++){ //ciclo che scorre ul vettore di sensori
			for(var j = 0; j < lett[i].types.length; j++){//cliclo che scorre il vettore di tipi di ogni sensore
				console.log("secondo ciclo");
				for(var y = 0; y < data.value.length; y++){//ciclo che scorre i tipi di sensore che si vogliono inserire
					console.log("ter ciclo 1: "+lett[i].types[j]+ " 2 "+data.value[y].nameType);
					if(lett[i].types[j] == data.value[y].nameType){//controllo che il nome del sensore sia uguale a uno di quelli selezionati
						console.log("entro nell'if");
						lett[i].idSensor[j] = data.value[y].idsensor;
						lett[i].nameSensor[j] = data.value[y].name;
						jsonfile.writeFile(__dirname+"/fileJson/sensorList.json", lett, function(err){
							if(err) console.log(err);
							jsonfile.readFile(__dirname+"/fileJson/homeData.json", function(err, hom){ //hom dovrebbe essere costituito => {ip, readyForConnection}
								hom.readyForConnection = true;
								jsonfile.writeFile(__dirname+"/fileJson/homeData.json",hom,function(err){
									console.log("fatto registrazione");
								})

							})
						});

					}
				}
			}
		}
	});

});
app.get("/transitionResultOfRegistration", function(req, res){//per conoscere il risultato della registrazione dei sensori 
	res.sendFile(__dirname+"/resultOfRegistration.html");
});
app.post("/resultOfRegistration", function(req, res){
	console.log("resultOfRegistration aa");
	var data = req.body;
	if(data.result){
		console.log("true");
		res.end("/registrationHomeSensorSuccess")
	}else{
		res.end("/login");
	}
});
app.get("/registrationHomeSensorSuccess", function(req, res){
	res.send("success, go a http://thehomecloud.ddns.net to see your account");
	//da quuesto momento in poi la homelocal può inviare i dati
});

/*app.post("/transitionTypesSensors", function(req, res){
	//una volta ricevuti i dati renderizzo la pagina di risposta (se tutto è andato a buon fine) con i dati ricevuti
	console.log("transitionTypesSensors");
	var dati = req.body.result;
	//console.log(dati[0].name);
	req.session.typesSensors = dati;
	res.end("/addSensor");
});*/

/*app.get("/addSensor", function(req, res){ //moficare per prevedere più sensori
	//req.session.typesSensor => .name, .description, .img	
	var dati = {
			nsensor: 1,
			img: req.session.typesSensors[0].img
	}
	var data ={
		html: '<div id="sensorCell" style="hight:300, background-color:lightgrey">'+
			'<input type="checkbox" name=<%=nsensor%>/>'+
			'<div>'+
			'<img src=<%=img%> alt="sensorFoto">'+
			'</div>'+
		'</div>"'
	};
	res.render("administrationSensor.ejs", data);
	//res.render("administrationSensor", dati);
});*/
//---------------------------------------------fine gestione http req-------------------------
io.on("connection", function(socket){
	//console.log("sensore connesso "+socket.request.connection.remoteAddress);
	console.log("conn")
	primavolta = false;
					//prove letture e scritture json
			/*	
				jsonfile.readFile(file, function(err, obj){
					console.log(obj[0].name[1]);
					var dato = {ip: "ahahah.0", name:"marcoooo"};
					obj.push(dato);
					jsonfile.writeFile(file, obj, function(err){
							console.log(err);
					});
				});*/

	socket.on("registrationResultOfRegistration", function(){ //catturo emit per la registrazione dell'ide del socket di resultOfRegistrationHome
		console.log("salvo id registraion resultOfRegistration");
		idResultOfRegistration = socket.id;
		if(dataResultAddSensor == "ok"){
			console.log("invio dataResultAddSensor")
			io.sockets.connected[idResultOfRegistration].emit("resultOfRegistration", dataResultAddSensor);
		}else{
			console.log("non ho ancora i dati");
		}
	});
	socket.on("sensorId", function(){
		idSensor = socket.id;
		console.log("id sensor salvato");
	})

	socket.on("data", function(value){ //devo inviare un pacchetto che abbia anche il tipo di sensore e il nome a cui associare il dato| value = > {.data .type}
		console.log("message: "+value.data);
		jsonfile.readFile(__dirname+"/fileJson/homeData.json", function(err, dataRead){
			if(dataRead.readyForConnection){
				var i, j = -1;
			jsonfile.readFile(sensorList, function(err, obj){ //obj contiene la lista dei sensori
			if(obj){
					for(i = 0; i < obj.length; i++){
						if(obj[i].ip==checkIp(socket.request.connection.remoteAddress)){//controllo se nella lista è presente l'ip del richiedente
							j = i;
							//console.log(j);
							//se è presente scrivo nel file sensorData.json l'oggetto ip:"", data:["",""] 
							jsonfile.readFile(sensorData, function(err, sensorDataobj){//acquisisco i valori di sensorData
								
								write = [{ip:checkIp(socket.request.connection.remoteAddress), data: value.data, type: value.type}];
								
								if(!sensorDataobj){
								write = [{ip:checkIp(socket.request.connection.remoteAddress), data: value.data, type: value.type}];
									sensorDataobj = write;
									max = 0;
								}else{
									for(var c = 0; c < sensorDataobj.length; c++){
										if(sensorDataobj[c].ip == obj[j].ip){
											max = c; //cerco tutti i dati appartenenti ad un determinato ip. Confronto poi il dato appena introdotto con quello precedente ad esso. se sono differenti invio il dato al database global, in caso contrario no.
											write = {ip:checkIp(socket.request.connection.remoteAddress), data: value.data, type: value.type};
										}
									}
									sensorDataobj.push(write);
								}

								jsonfile.writeFile(sensorData, sensorDataobj, function(err){//li aggiungo riscrivendolo
									if(err) console.log(err);
									console.log("max "+max);
									//console.log(sensorDataobj[max].data); stampa dati precedenti
									if((sensorDataobj[max].data !== write.data) ||    primavolta){
										//se l'ultimo valore inserito e il penultimo sono diversi allora invio l'aggiornamento dei dati a clientsideSocket.js
										primavolta = false;
										console.log("i "+i);
										for(var z = 0; z < obj[j].types.length; z++){
											if(obj[j].types[z] == value.type){
												console.log("trovato i sensore"); //devo inviare il nome del sensore corrispondente al dato 
												//confrontare in parallelo     |
												dataChange = {nameSensor: obj[j].nameSensor[z], data: write.data, type: write.type, idType: obj[j].idSensor[z]};
												if(io.sockets.connected[iDsocketClientSide]){
													console.log("cambiati");
													io.sockets.connected[iDsocketClientSide].emit("dataSensor", dataChange);
												}
											}
										}
										//dati da inviare al socket.io-client che li invierà al server-global
										
									}
									});
							});
						}
					}
				}else
				{
					socket.emit("errore", "300"); //errore: bisogna prima effettuare la registrazione alla lista dei sensori per poter inviare dati
					console.log("registrarsi");
				}
				if(j < 0){//in caso sia -1 o minore significa che il sensore non è presente nella lista
					socket.emit("errore", "300"); //errore: bisogna prima effettuare la registrazione alla lista dei sensori per poter inviare dati
					console.log("registrarsi");
				}
			});
			}else{
				console.log("home non pronta per la connessione");
			}
		})
			
	
	});

	socket.on("firstConnection", function(data){
			var sensor = {ip : "", name: "", types: [""], idSensor:[""], nameSensor:[""]};
		  	var socketId = socket.id;
  		  	var clientIp = checkIp(socket.request.connection.remoteAddress);
  		  	console.log(data);
  		  sensor.ip = clientIp;
  		  sensor.name = data.name;
  		  sensor.types = data.types;
  		  //alla prima connessione aggiungo il sensore nella lista dei sensori
		jsonfile.readFile(sensorList, function(err, obj){
			if(!obj){
				obj = [sensor];
			}else{
				obj.push(sensor);
			};
			
			jsonfile.writeFile(sensorList, obj, function(err){
				console.log(err);
			});
		});
	socket.emit("conferma", "ok"); 
	});

	socket.on("firstConnectionClientSide", function(data){//prima conessione del socket.io-client che comunica con il server global. Appena connesso mi salvo l'id del socket 
		iDsocketClientSide = socket.id;
		console.log(iDsocketClientSide);
	});

	//risultati ricevuti dalla funzione login provenienti da clientsideSocket
	socket.on("resultLogin", function(data){
		console.log("result login " + data.result);
		dataResultLogin = data;
		//se il client ha già inviato l'emit di registrazione
		console.log("id client result login "+iDclientResultLoginConnection);
		if(iDclientResultLoginConnection != ""){
			if(io.sockets.connected[iDsocketClientSide]){
				io.sockets.connected[iDsocketClientSide].emit("resultLogin", data);
			}
		}
	});
	socket.on("clientResultLoginConnection", function(data){
		//registro l'id del socket che ha inviato l'emit clientResultLoginConnection
		iDclientResultLoginConnection = socket.id;
		console.log("socket id del clientResultLoginConnection: "+iDclientResultLoginConnection);
		socket.emit("resultLogin", dataResultLogin);
	});
	socket.on("clientHomeConnection", function(){
		//registro id del socket che ha inviato l'emit
		iDclientHomeConnection = socket.id;
		console.log("id del resultCheckHome: " + iDclientHomeConnection);
		socket.emit("clientResultCheckHome", resultCheckHome);
	});
	socket.on("resultCheckHome", function(data){
		console.log("result check home: " + data.result );
		resultCheckHome = data;

	});
	socket.on("clientResultRegistrationHome", function(){//cattura dell'emit del client e salvataggio dell'id del socekt
		iDclientResultRegistrationHome = socket.id;
		console.log(socket.id);
		console.log("clientResultRegistrationHome "+ GresultRegistrationHome.resultHome);
		/*
		if(GresultRegistrationHome){
			socket.emit("resultRegistrationHome",GresultRegistrationHome);
		}*/
	});
	socket.on("resultRegistrationHome", function(data){//dati che ricevo dal server per il risultato della registrazione della home
		console.log("resultRegistrationHome resultlogin:"+data.resultUser+" resultUser:"+data.resultHome);
		if(iDclientResultRegistrationHome){
			console.log("ho l'id " +iDclientResultRegistrationHome);
			if(io.sockets.connected[iDclientResultRegistrationHome]){
				console.log("invio");
				io.sockets.connected[iDclientResultRegistrationHome].emit("resultRegistrationHome", data);
				iDclientResultRegistrationHome = "";
			}
		}else{
			console.log("non ho l'id");
			GresultRegistrationHome = data;
			socket.emit("sendNow",{emit: "resultRegistrationHome", data: data});
		}
	})
	socket.on("registrationAptendTypesSensors", function(data){
		console.log("registrationAptendTypesSensors");
		idAptendTypesSensors = socket.io;
		if(dataTypesSensors){//se i dati sono arrivati invio i dati al socket client
			console.log("registrationAptendTypesSensors INVIO " + typesSensors[0].img);
			socket.emit("dataTypesSensors", typesSensors);
		}
	});
	socket.on("responseTypesSensors", function(data){
		typesSensors = data;
		console.log("idsensor: "+data[0].idsensor);
		dataTypesSensors = true;
		console.log("responseTypesSensors");
		if(idAptendTypesSensors != ""){
			if(io.sockets.connected[idAptendTypesSensors]){
				console.log("responseTypesSensors INVIO "+ data[0].img);
				io.sockets.connected[idAptendTypesSensors].emit("dataTypesSensors", data);
			}
		}
	});
	socket.on("comandLight", function(data){
		console.log("comandLight "+ data.light);
		console.log("idSensor: "+ idSensor);

		if(idSensor != "" && io.sockets.connected[idSensor]){

			io.sockets.connected[idSensor].emit("comandLight", data.light);
		}
	})
	socket.on("resultAddSensor", function(data){
		dataResultAddSensor = data;
		console.log("result: "+data);
		if(io.sockets.connected[idResultOfRegistration]){
			io.sockets.connected[idResultOfRegistration].emit("resultOfRegistration", data);
		}else{
			console.log("id resultOfRegistration non presente")
		}
	})
});

function checkIp(ip){ //pulisce l'ip
	if(ip.search(":ffff:")>=0){
		return ip.substr(7);
	}else{
		return ip;
	}
}

server.listen(7070);