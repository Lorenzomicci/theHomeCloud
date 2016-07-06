// Module node-dht-sensor demo
// Reads from two DHT sensors

var sensorLib = require('./build/Release/node_dht_sensor');
var sock=require('socket.io-client');
//var ex=require('express');
var server=require('http').Server;
var gpio=require('rpi-gpio');
const event = require('events');
var fs=require('fs');
var path = require('path'); 
var async=require('async');
var cluster=require('cluster');


var conn=sock.connect("http://192.168.1.116:7070",   { reconnect:true }     );



var sensor = {
  sensors: [ 
    { name: 'Indoor', type: 11, pin: 2 },
  ]
}


   var init={
      name:"home-raspberry",
      types:["temperatura","lightControl"],
      //data:[]
   }


if(cluster.isMaster){
       var worker=cluster.fork();

       worker.on('message',function(msg){
                 if(msg.data){
			var d = {data:msg.data, type: "temperature"}
                             conn.emit('data',d);
				console.log("invio" + msg.data );
		}
     });

     cluster.on('death',function(worker){
                  console.log("worker morto" + worker.pid);
	});


      fs.stat('/home/pi/Desktop/controllo.txt', function(err, stat) {
    if(err == null) {
        console.log('File exists');
    } else if(err.code == 'ENOENT') {
           fs.writeFile('/home/pi/Desktop/controllo.txt',"1",function(err){
                        if(err){   
                      console.log("errore")   
                    }    
              ok=1;          
        });
           console.log("a");
        conn.emit("firstConnection",init);
	console.log("init");
    } else {
        console.log('Some other error: ', err.code);
    }
});

 conn.on("errore",function(tipo){
             switch(tipo){
                    case "300":     
                             console.log("300");
                             conn.emit("firstConnection",init);
              break;
      
                 default:   
			console.log("errore");


           }
});




conn.on("connect",function(){
		conn.emit('sensorId');
		console.log("connesso");
});



	conn.on("comandLight",function(valore){
		console.log("passato di pomodoro");
		     switch(valore){

			case 1: gpio.setup(13,gpio.DIR_OUT,write);
				break;

			case 0:gpio.setup(13,gpio.DIR_OUT,spegni);
				break;

			default: console.log("valore anomalo");

		     }

	function write(){
		gpio.write(13,true,function(err){
			if(err)   {   console.log( err);    }

			else{
			    console.log("pin 13 settato: luce accesa");
			} //else			
		});//err
	}//write




		function spegni(){
		gpio.write(13,false,function(err){
			if(err)   {   throw err;    }

			else{
			    console.log("pin 13 settato: luce spenta");
			} //else			
		});//err
	}//write



});




}//master

else{
 	 async.forever(
                    function(next) {
		
	  	  for (var i in sensor.sensors) {   
			 var readout = sensorLib.readSpec(sensor.sensors[i].type, 
		     	 sensor.sensors[i].pin);
			 val=readout.temperature.toFixed(1);
			 //init.data=val;   
      			console.log(sensor.sensors[i].name+': '+
                 	 val+'C, '+
                  	readout.humidity.toFixed(1)+'%');
                     	val= val + " " +  readout.humidity.toFixed(1);
                  	 gpio.setup(5, gpio.DIR_IN, readInput);
			
			process.send({data: val});

			}

		 setTimeout(function() {
                    next();
                }, 10000);
             },
              function(err) {
                 // if next is called with a value in its first parameter, it will appear
                // in here as 'err', and execution will stop.
                  console.error(err);
         });
 
}  






/*

sensore.on("valueChange", function(val){
              conn.emit("data",val); 
});




var ciclo=0;
var ok=0;



   conn.on("connect",function(){
           
             console.log("dati");


                   console.log("while");
});



*/

function readInput() {
    gpio.read(5, function(err, value) {
        console.log('The value is ' + value);
    });
}

