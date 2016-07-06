var express = require("express");
var app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);
var path = require("path");
var mysql = require('mysql');
var cookieSession = require("cookie-session");//per la session
var bodyParser = require('body-parser'); //per interpretare valori della req e res

app.use(express.static(path.join(__dirname, '/kj/public')));

app.set('views', 'views')
app.set("view engine", "ejs");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use(cookieSession({
	name: 'session',
	keys: ['key1', 'key2']
}))


//variabili globali
var inserimentRegistrationError = false;
var today; //acquisisce la data del giorno;
var query2;
var querydataSensor =[];
var querygeneralSensor = "";
var contatore = 0;
//fine variabili globali
var IdSelectHome = "";

var idClientHome = "";
http.listen(3000, function(){
	console.log("server on port 3000");
});
//--------------------------------------------ACCESSO PAGINA INDEX---------------------------------------------------------
app.get("/", function(req, res){
	res.sendFile(__dirname+"/index.html");
	console.log("ci ascolta: "+req.connection.remoteAddress);
});
app.get("/foto", function(req, res){
	res.sendFile (__dirname+"/kj/index.html");
})
//--------------------------------------------ACCESSO PAGINA REGISTRAZIONE--------------------------------------
app.get("/signin", function(req, res){
	var err = "";
		
		/*if(req.session.error){
			if(req.session.error.search("registration error") > -1){
				req.session.error = "";
				err = "errore registrazione";
				console.log("cav");
			}
		}
	
var data = {
		title: "home",
		message: "Hello world"
	};
	res.render("provaEjs", data);
*/
//in base al valore della lingua impostata sul cookie dell'utente andrò ad impostare la lingua della pagina
	if(req.session.registrationData === undefined){
		registrationSave = {
			vfirstname: "",
			vlastname: "",
			vdatabirth: "",
			vcitybirth: "",
			vresidence: "",
			vaddress: "",
			vcap: "",
			vnickname: "",
			vemail: "" 
		}
		req.session.registrationData = registrationSave;
	}
var translate = {//in caso fosse ITALIANO
	error: req.session.error,
	firstname: "nome",
	lastname: "cognome",
	datebirth: "data di nascita",
	citybirth: "città di nascita",
	residence: "residenza",
	address: "indirizzo",
	province:"provincia",
	cap: "cap",
	nickname: "nome utente",
	password: "password",
	password2: "ripeti password",
	email: "email",
	signup: "invia",
	data: req.session.registrationData
	};
	req.session.error = "";
	res.sendFile(__dirname+"/registration.html");
	//res.sendFile(__dirname + "registrazione.html");
});

//--------------------------------------------------RISPOSTA ALLA RICHIESTA DI REGISTRAZIONE-------------------------------------
app.post("/tryregistration", function(req, res){
	var data = req.body;
	//res.send(data);
	var registrationData = saveDataRegistrationSession(data);
	req.session.registrationData = registrationData;
	//controllo che tutti i campi della registrazione siano stati immessi
	if(data.firstname && data.lastname && data.datebirth && data.citybirth && data.residence && data.address && data.cap && data.nickname && data.password && data.email){

	//connessione al db
	var conn = connectionDb("localhost","root","AmiciziA","smarthome");
	conn.connect();

	

	//CON LO STREAM DI QUERY VIENE PRIMA ESEGUITO IL CODICE FUORI DALLA CONNESSIONE POI LE QUERY
	//CONTROLLO SE L'EMAIL È GIÀ PRESENTE NEL DATABASE
	var query = "SELECT email FROM user WHERE email = '"+data.email+ "'";
	var result = conn.query(query);
	result
	.on("error", function(err){
		if(err) throw err;
	})
	.on("fields", function(fields) {
    // the field packets for the rows to follow
 	 })
  	.on('result', function(row) { //row non è un array ma un oggetto con i risultati! entra solo in caso ci siano
    // Pausing the connnection is useful if your processing involves I/O   
	    console.log("email "+ row.email + "già presente nel database");
	 	req.session.error = "registration error: email already added";
	 	conn.destroy();
	    res.redirect("/signin");
	})
	.on('end', function() {
	    // all rows have been received
	    console.log("fatto email");
	    
	});
	

	//CONTROLLO SE L'UTENTE È GIÀ PRESENTE NEL DATABASE
	 query = "SELECT nickname FROM user WHERE nickname ='"+data.nickname+"'";
	 result = conn.query(query);
	result
	.on("error", function(err){
		if(err) throw err;
	})
	.on("fields", function(fields) {
    // the field packets for the rows to follow
 	 })
  	.on('result', function(row) {
    // Pausing the connnection is useful if your processing involves I/O
			console.log("nickname "+ row.nickname + "già presente nel database");
			req.session.error = "registration error: nickname already added";
			conn.destroy();
	     	res.redirect("/signin");
  	 })
	 .on('end', function() {
	    // all rows have been received
	     console.log("fatto nickname");
	     
	  });
	
	//INSERISCO UTENTE se non ci sono stati errori
	var query = 'INSERT INTO user (nickname, password, email, nome, cognome, datan, luogon, residenza, via, cap) VALUES ("'+data.nickname+'", "'+data.password+'", "'+data.email+'", "'+data.firstname+'", "'+ data.lastname+'", "'+data.datebirth+'", "'+data.citybirth+'", "'+data.residence+'", "'+data.address+'", "'+data.cap+'")';
	var result = conn.query(query);
	result
	.on("error", function(err){
		if(err) throw err;
	})
	.on("fields", function(fields) {
    // the field packets for the rows to follow
 	 })
  	.on('result', function(row) {
    // Pausing the connnection is useful if your processing involves I/O
	      console.log("inserito");

	   
  	 })
	 .on('end', function() {
	    // all rows have been received
	    	    conn.destroy();
	    	    // res.send("ben fatto ");
	    	    //utente inserito

	  });
	/*
	conn.query(query, function(err, rows, fields){
		if(err) throw err;

		if(rows.length > 0){
			console.log("errore email");
			//res.send("utente già presente");
			req.session.error = "registration error: email already added";
			conn.end;
			res.redirect("/");
		}
		console.log("n email: "+rows.length);
	});
	//CONTROLLO SE NOME UTENTE È GIÀ PRESENTE NEL DATABASE
	var query = "SELECT nickname FROM user WHERE nickname ='"+data.nickname+"'";
	console.log(data.nickname);
	conn.query(query, function(err, rows, fields){
		if(err) throw err;
		
		if(rows.length > 0){
			//res.send("utente già presente");
			req.session.error = "registration error: nickname already added";
			conn.end;
			res.redirect("/signin");
		}
	});
		console.log("inserisco");
			query = 'INSERT INTO user (nickname, password, email, nome, cognome, datan, luogon, residenza, via, cap) VALUES ("'+data.nickname+'", "'+data.password+'", "'+data.email+'", "'+data.firstname+'", "'+ data.lastname+'", "'+data.datebirth+'", "'+data.citybirth+'", "'+data.residence+'", "'+data.address+'", "'+data.cap+'")';
			conn.query(query, function(err, rows, fields){
				if(err) throw err;
				res.send("sei stato inserito "+data.firstname+ " "+data.lastname);
			});
	conn.end();	*/
	}else{
		req.session.error="registration error: alcuni campi sono vuoti";
		res.redirect("/signin");
	}
});


//-------------------------------------------------------GESTIONE RICHIESTA PAGINA LOGIN---------------------------------
app.get("/login", function(req, res){
	var loginEjs = {
		errorLogin: req.session.errorLogin
	};
	req.session.errorLogin  = "";
	res.render("login", loginEjs);
	//res.sendFile(__dirname+"/login.html")
})
//-------------------------------------------------------GESTIONE RICHIESTA PROVA LOGIN---------------------------------

app.post("/trylogin", function(req, res){
	var sess = req.session; //req.session è un oggetto perciò lo passa per riferimento
	var datiAccesso = req.body;
	console.log("dati accesso: "+datiAccesso.nickname + " pass: "+ datiAccesso.password);
	//controllo immissione dati
	if(datiAccesso.nickname && datiAccesso.password){
	//connession al db
	var conn = connectionDb("localhost","root","AmiciziA","smarthome");
	conn.connect();
	
	var query = "SELECT * FROM user WHERE nickname = '"+datiAccesso.nickname+ "' and password ='"+datiAccesso.password+"'"; 
	//esecuzione query
	var result = conn.query(query);
	result
	.on("error", function(err){
		if(err) throw err;
	})
	.on("fields", function(fields) {
    // the /field packets for the rows to follow
 	 })
  	.on('result', function(row) { //row non è un array ma un oggetto con i risultati! entra solo in caso ci siano
    // Pausing the connnection is useful if your processing involves I/O  
    req.session.cod = row.nickname;
    req.session.anagraphic = row;
    req.session.login = true;
   // res.end("/selectHome"); // viene inviato alla pagina di scelta della home per la visualizzazione delle casa da visualizzare
    res.end("/userHomeAccount");
    conn.destroy();
	})
	.on('end', function() {
	    // all rows have been received
   		req.session.errorLogin = "utente non presente nel database";
   		res.end("/login");
	});
	

	/*
	connessione.query(query, function(err, rows, fields){
		if(err) throw err;
		//se non ci sono errori di esecuzione e la query restituisce un risultato significa che l'utente è presente nel database
		if(rows.length == 1){
			//res.redirect("http://wwww.google.it")
			sess.nickname = datiAccesso.nickname;
			sess.password = datiAccesso.password;
			res.send("<h1>UTENTE TROVATO!</h1>");
		}else{
			res.send("<h1>UTENTE NON TROVATO!</h1>");
		}
	});
	connessione.end();
	*/

	/*
	var userName = req.body;
 	 var html = 'Hello: ' + userName.nome + " "+ userName.cognome;
	res.send(html);
	*/
}else{
	req.session.errorLogin = "non tutti i campi sono stati riempiti";
	res.end("/login");
}
});
app.get("/userHomeAccount", function(req, res){
	res.render("userHome", req.session.anagraphic);
})
app.get("/selectHome", function(req, res){
	//ricerco le case associate all'utente
	//res.sendFile(__dirname+"/selectHome.html");
	var data = {
		home: []
	}
	var sess = req.session;
	var conn  = connectionDb("localhost", "root", "AmiciziA", "smarthome");
	var query = "SELECT idhome, nome, citta, address, cap, ip, iduser FROM home WHERE iduser = '"+sess.cod+"'";
	var result = conn.query(query);
	result
	.on("err", function(err){
		if(err) throw err;
	})
	.on("fields", function(){

	})
	.on("result", function(row){
		//aggiungo le case trovate, e le informazioni, in un vettore e nell'end poi spedisco la pagina renderizzata per la scelta della home
		data.home.push(row);
		console.log("home: "+row.idhome);
	})
	.on("end", function(){
		if(data.home.length > 0){
			//se ho trovato delle case posso inviare i dati 
			console.log("invio dati home "+data.home[0].idhome);

			res.render("selectHome", data);
			//io.sockets.connected[IdSelectHome].emit("dataHome", data);
			//res.render("selectHome", data);
		}
	});
});
//----------------------------------------------------------------LOGOUT DALLA SESSION-----------------------
app.get("/logoutSession", function(req, res){
	req.session.destroy;
	console.log("session destroy");
	res.redirect("/");
});

app.get("/logout", function(req, res){
	req.session.destroy;
	req.session.cod = "";
	req.session = {};

	console.log("session destroy");
	res.redirect("/");
});

app.post("/userhome", function(req, res){
	var userData = [];
  	//console.log(userData.value.length);
	var dataPost = req.body;
	console.log("scelta casa: "+ dataPost.choice);
	//controllo la session per verificare che l'utente abbia effettuato il login
	if(!req.session.login || req.session.cod == ""){
		req.session.errorLogin = "non hai effettuato l'accesso";
		res.redirect("/login");
	};
	//in caso l'utente abbia effettuato l'accesso viene permesso l'accesso alla home
	//effetto la conessione al database ed estraggo i dati per la creazione della pagina
	
	var conn = connectionDb("localhost", "root", "AmiciziA","smarthome");
	var query = "SELECT ho.nome AS nameHome, gs.idgeneralSensor, gs.idsensorType, st.name as nameTypeSensor, st.description AS descriptionTypeSensor, st.img AS imgTypeSensor, gs.name AS nameSensor, sd.dataSensor FROM home AS ho, generalSensor AS gs, sensorData AS sd, sensorType AS st WHERE ho.idhome = '"+dataPost.choice+"' AND gs.home = '"+dataPost.choice+"' AND sd.idsensor = gs.idgeneralSensor AND st.idsensor = gs.idsensorType AND sd.date = (SELECT MAX(date) FROM sensorData WHERE idsensor = gs.idgeneralSensor)";
	var result = conn.query(query);
	result
	.on("err", function(err){
		if(err) throw err;
	})
	.on("fields", function(){

	})
	.on("result", function(row){
		console.log("riga di scelta");
		userData.push(row);
	})
	.on("end", function(){
		console.log("fine");
		req.session.userData = userData;
		res.end("/userSensorHome");
	})
});

app.get("/userSensorHome", function(req, res){ //userData => [{nameHome (nomecasa), idgeneralSensor, idsensorType, nameTypeSensor, descriptionTypeSensor, imgTypeSensor, nameSensor (nome sensore), dataSensor}]
	var d = req.session.userData;
	console.log(d[0].descriptionTypeSensor);
	console.log("/userSensorHome");
	res.render("home",{data: d});
});
//---------------------------------------------------------SOCKET CON CLIENT. USATI PER CONNETTERSI CON LE SMARTHOME-----------
io.on("connection", function(socket){
	var trovato = false;
	var query2 = "";
	console.log("client connesso" + socket);
	//----------------------------------------------------change data-------------------------
	/*socket.on("registrationIdSelectHome", function(){
		IdSelectHome = socket.id;
		console.log("registration idselecthome");
	})*/

	socket.on("dataSensor", function(value){// quando ricevo un dato questo deve essere visualizzato nella pagina html dell'utente, ma anche salvato
	//perciò apro il database e aggiungo il dato nella tabella corrispondente al 
	console.log("value received from " + checkIp(socket.request.connection.remoteAddress) + " sensor: "+value.nameSensor+" value: " + value.data + " user: "+value.user);
	//controllo se nel database è presente il sensore e la casa di provenienza
	var conn = connectionDb("localhost", "root", "AmiciziA", "smarthome");
	var idhome; //variabile contenente l'id della home in caso di 301
	conn.connect();
	var query = "SELECT idhome FROM home WHERE ip ='"+checkIp(socket.request.connection.remoteAddress)+"' AND iduser ='"+value.user+"'";
	var result = conn.query(query);
	result
	.on("error", function(err){
		if(err) throw err;
	})
	.on("fields", function(fields){

	})
	.on("result", function(row){
		trovato = true;
		console.log("trovata home "+ row.idhome);
		query= "SELECT idgeneralSensor FROM generalSensor WHERE home = '"+row.idhome+"' and name ='"+value.nameSensor+"' AND idsensorType = '"+value.idType+"'";
//--------------------------------
	result = conn.query(query);
	result
	.on("error", function(err){
		if(err) throw err;
	})
	.on("fields", function(fields){
		console.log(query);
	})
	.on("result", function(row){
		console.log("trovato sensor "+ row.idgeneralSensor);

		//inserisco una riga nella tabella sensorData
		today = new Date();
		var date = today.getFullYear() + "-" + (today.getMonth()+1) + "-" + today.getDate() + " " +today.getHours()+":"+today.getMinutes()+":"+today.getSeconds();
		console.log(date);
		console.log(row.idgeneralSensor);
		query2 = "INSERT INTO sensorData (date, dataSensor, idsensor) VALUES ('"+date+"', '"+value.data+"', '"+row.idgeneralSensor+"')";
		result = conn.query(query2);
		result
		.on("error", function(err){
			if(err) throw err;
		})
		.on("fields", function(fields){

		})
		.on("result", function(row){
			//console.log(query2);
			 console.log("inserito");
			if(idClientHome != "" && io.sockets.connected[idClientHome]){
	      		console.log("inseriti ed inviati");
	      		var data = {};
	      		data.value = value.data; // valore
	      		data.idsensor = value.idgeneralSensor; //id
	      		io.sockets.connected[idClientHome].emit("statusSensor", data);
	      	}else{
	      		console.log("idClientHome socket non trovato");
	      	}
		})
		.on("end", function(){
			conn.destroy();
		});	
//--------------------------------
	})
	.on("end", function(){
		if(query2.search("INSERT INTO") < 0){
			console.log("errore 302");
			socket.emit("errore", {text: "sensor non trovato", number:302});
			conn.destroy();
		}	
	});

	})
	.on("end", function(){
		if(trovato == false){
			console.log("errore 301");
			socket.emit("errore", {text: "home non trovata", number:301, idhome: idhome});
			conn.destroy();
		}	
	});	

	//controllo se sia presente il sensore
	var idgeneralSensor;
	//query= "SELECT idgeneralSensor FROM generalSensor WHERE home = '"+value.home+"' and name ='"+value.name+"'";
	
});	
//------------------------------------------------------------trylogin home------------------------
	socket.on("trylogin", function(dataLogin){
		var idSocketTryLogin = socket.id;
		var ipSocketTryLogin = checkIp(socket.request.connection.remoteAddress);
		console.log(dataLogin.nickname + " " + idSocketTryLogin + " " + ipSocketTryLogin);

		//leggo i valori e controllo se è presente nel database
		var conn = connectionDb("localhost", "root", "AmiciziA", "smarthome");
		var query = "SELECT nickname FROM user WHERE nickname ='"+dataLogin.nickname+"' AND password='"+dataLogin.password+"'";
		console.log(query);
		result = conn.query(query);
		result
		.on('error', function(err){
				if(err) throw err;
		})
		.on("fields", function(fields){

		})
		.on("result",function(row){
			console.log("query "+dataLogin.nickname);
			socket.emit("resultLogin",{result: true});
			conn.destroy();
		})
		.on("end", function(){
			console.log("non trovato");
			socket.emit("resultLogin",{result: false});
			conn.destroy();
		});
	});	

//-----------------------------------------------------------SE L'IP DELLA CASA SI MODIFICA VIENE RIMPOSTATO-------------------
	socket.on("changeHomeIp", function(data){
		//query di aggiornamento sulla tabella home dell'ip
		var conn = connectionDb("localhost", "root", "AmiciziA", "smarthome");
		var query = "UPDATE home SET ip = '"+checkIp(socket.request.connection.remoteAddress)+"' WHERE idhome = '"+data.idhome+"'";
		console.log("idhome"+data.idhome);
		var result = conn.query("UPDATE home SET ip = ? WHERE ip = ?", [checkIp(socket.request.connection.remoteAddress), data.iphome]);
		result
		.on('error', function(err){
				if(err) throw err;
		})
		.on("fields", function(fields){
			console.log(query);
		})
		.on("result",function(row){
			console.log(query);
			console.log("ip aggiornato");
		})
		.on("end", function(){
			console.log("fatto");
			conn.destroy();
		});
	});
	//-----------------------------------------------------SOCKET CHECKHOME------------------------------------------------
	socket.on("checkHome", function(){
		var idSocketCheckHome = socket.id;
		//controllo nel database se l'ip di provenienza è inserito nel database
		var conn = connectionDb("localhost", "root", "AmiciziA", "smarthome");
		var query = "SELECT idhome FROM home WHERE ip = '"+checkIp(socket.request.connection.remoteAddress)+"'";
		
		var result = conn.query(query);
		result
		.on('error', function(err){
				if(err) throw err;
		})
		.on("fields", function(fields){
			console.log(query);
		})
		.on("result",function(row){
			console.log("trovata casa " + row.idhome);
			socket.emit("resultCheckHome",{result: true});
			conn.destroy();
		})
		.on("end", function(){
			console.log("non trovata casa");
			socket.emit("resultCheckHome",{result: false});
			conn.destroy();
		});
	});
//-------------------------------------------------------SOCKET REGISTRATION HOME----------------------------------------
	socket.on("dataRegistrationHome", function(data){
		console.log("dataRegistrationHome: "+data.citta+" "+data.address+ " " + data.cap + " " + data.nome+ " " +data.userNickname);
		var idUser;
		var query2 = "";
		var result2;
		var casainserita = false;
		var idDataRegistrationHome = socket.id;

		//connessiona al database per inserimento della smarthome
		//prima devo trovare il codice dell'user
		var conn = connectionDb("localhost", "root", "AmiciziA", "smarthome");
		var query = "SELECT nickname from user where nickname = '"+data.userNickname+"' and password = '"+data.userPassword+"'";
		var result = conn.query(query);
		result
		.on('error', function(err){
			if(err) throw err;
			})
		.on("fields", function(fields){
				console.log(query);
			})
		.on("result",function(row){
				idUser = row.nickname;
				console.log("trovato iduser " + row.nickname);
				//socket.emit("resultCheckHome",{result: true});
				query2 = "INSERT INTO home (citta, address, cap, nome, ip, iduser) VALUES ('"+data.citta+"', '"+data.address+"', '"+data.cap+"', '"+ data.nome+"', '"+ checkIp(socket.request.connection.remoteAddress)+"', '"+data.userNickname+"')";
				console.log(query2);
		})
		.on("end", function(){
			if(query2 !== ""){
			result = conn.query(query2);
				result
				.on('error', function(err){
					if(err) throw err;
				})
				.on("fields", function(fields){
					console.log(query2);
				})
				.on("result",function(row){
					console.log("inserita casa ");
					casainserita = true;
					//emit verso css.js con risposta
					io.sockets.connected[idDataRegistrationHome].emit("resultRegistrationHome", {resultHome: true, resultUser: true});
					//socket.emit("resultRegistrationHome", {resultHome: true, resultUser: true});
					conn.destroy();
				})
				.on("end", function(){
					if(!casainserita){
						socket.emit("resultRegistrationHome",{resultHome: false, resultUser: true});
						console.log("casa non inserita");
						conn.destroy();
					}
				});
			}else{
				socket.emit("resultRegistrationHome",{resultHome: false, resultUser: false});				
				console.log("utente non trovato");
				conn.destroy();
			}
		})
	});
//---------------------------------------------------SOCKET RICHIESTA DEI TIPI PRESENTI NEL DB----------------------------------------------------------------------------------------------------------------------------------------------------------------------
	socket.on("askTypesSensors", function(data){
		console.log("askTypesSensors");
		var query;
		var result;
		var vSensor = [];//ci registro gli elementi provenienti dalla query
		var c = 1;
		console.log(data.length);
		//FOR PER LA QUERY CHE CAMBIA VALORE DI HOME PER OGNI ELEMENTO DI DATA
		for(var i = 0; i < data.length; i++){
			var conn = connectionDb("localhost", "root", "AmiciziA", "smarthome");
			query = "SELECT * FROM sensorType WHERE name = '"+data[i]+"'";
			result = conn.query(query);
			result
			.on('error', function(err){
					if(err) throw err;
				})
			.on("fields", function(fields){
				console.log(query);
			})
			.on("result",function(row){
				console.log("row");
				if(c == data.length){
					console.log("invio");
						vSensor.push(row);
						socket.emit("responseTypesSensors", vSensor);
				}else{
					c++;
					console.log("c: "+c);
					console.log("trovato sensore " + row.name);
					vSensor.push(row);
				}
				
			})
			.on("end", function(){
				
				conn.destroy();
			});
		}

	});

	socket.on("registrationHome", function(){//registra l'id della pagina client, così da poter spedire i dati
		idClientHome = socket.id;
		console.log("connesso client userhome");
		//quando l'utente si connette c'è bisogno di un invio dei dati dei sensori
		//leggo l'ultimo dato dei sensori a lui associati e li invio alla pagina
		//var query = "SELECT as.dataSensor, st.name FROM sensorData as sd, sensorType as st where "
	});

	socket.on("addSensor", function(data){ //invio un pacchetto con i dati utente (password e username) e con un vettore di sensori
	//data => .sensor[{idsensor, name}] e .username e .password
		console.log("addSensor of: "+data.username);
		//adesso devo effettuare il controllo suul'utente, sulla casa e successivamente aggiungere i sensori
		var conn = connectionDb("localhost", "root", "AmiciziA", "smarthome");
		var query = "SELECT nickname from user where nickname = '"+data.username+"' and password = '"+data.password+"'";

		var result = conn.query(query);
		result
		.on('error', function(err){
			if(err) throw err;
			})
		.on("fields", function(fields){
				console.log(query);
			})
		.on("result",function(row){
				idUser = row.nickname;
				console.log("trovato iduser " + row.nickname);
				//socket.emit("resultCheckHome",{result: true});
				query = "SELECT idhome FROM home WHERE iduser = '"+row.nickname+"' AND ip ='"+checkIp(socket.request.connection.remoteAddress)+"'";
				//con questa quert ricavo l'idhome della casa che ha richiesto l'aggiunta dei sensori
				var result2 = conn.query(query);
				result2
					.on("err", function(err){
						if(err) throw err;
					})
					.on("fields", function(fields){
							console.log(query);
					})
					.on("result",function(row2){
						console.log("idhome: "+row2.idhome);
						//adesso che ho l'idhome posso aggiungere i sensori in generalSensor
						//devo effettuarlo n volte per ogni sensore da inserire
						console.log("id tipo sensore: "+ data.sensor.idsensor);
						//for(var i = 0; i < data.sensor.length; i++){
							//console.log("ciclo for inserimento");
							query = "INSERT INTO generalSensor (idsensorType, name, home) VALUES ('"+data.sensor.idsensor+"', '"+data.sensor.name+"', '"+row2.idhome+"')";
							var result3 = conn.query(query);
							result3
							.on("err", function(err){
								if(err) throw err;
							})
							.on("fields", function(){
								console.log(query);
							})
							.on("result", function(row3){
								console.log("inserito sensore "+row3.insertId);
								if(data.sensor.idsensor == 2){
									today = new Date();
									var date = today.getFullYear() + "-" + (today.getMonth()+1) + "-" + today.getDate() + " " +today.getHours()+":"+today.getMinutes()+":"+today.getSeconds();
		
									var queryAddDataLight = "INSERT INTO sensorData (date, dataSensor, idsensor) VALUES('"+date+"','1','"+row3.insertId+"')";
									var resultAddDataLight = conn.query(queryAddDataLight);
									resultAddDataLight
									.on("err", function(err){
										if(err) throw err;
									})
									.on("fields", function(){
										console.log(queryAddDataLight);
									})
									.on("result", function(row4){
										console.log("inserito data light");
									})
									.on("end", function(){
										conn.destroy();
									});
								}else{
									conn.destroy();
								}
								
							})
							.on("end", function(){
								

							})
						//}
					})
					.on("end", function(){
						socket.emit("resultAddSensorG", {result: "ok"});
								console.log("invio result");
					})
		})
		.on("end", function(){
		
		})
	});
});




//----------------------------------------------------------------FUNZIONI-------------------------------------------------
//funzione connection database
function connectionDb(_host, _user, _password, _database){
	
	 var connessione = mysql.createConnection({
			host : _host,
			user: _user,
			password: _password,
			database: _database
		});
	 return connessione;
}

function saveDataRegistrationSession(data){
	
		return registrationSave = {
			vfirstname: data.firstname,
			vlastname: data.lastname,
			vdatabirth: data.datebirth,
			vcitybirth: data.citybirth,
			vresidence: data.residence,
			vaddress: data.address,
			vcap: data.cap,
			vnickname: data.nickname,
			vemail: data.email 
		}
	
}

function checkIp(ip){
	if(ip.search(":ffff:")>=0){
		return ip.substr(7);
	}else{
		return ip;
	}
}