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

var conn=sock.connect("http://192.168.1.111:7070",   { reconnect:true }     );

var event = require("event");
function asyncDHTC11Read(){
	event.EventEmitter.call(this);
	this.readValue = function(){
 		
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
			this.emit("valueChange", val);
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
		
} //fine asyncDHTC11Read
var sensore = new asyncDHTC11Read();
sensore.readValue();

sensore.on("valueChange", function(val){
              conn.emit("data",val); 
});

var ciclo=0;
var ok=0;


var sensor = {
  sensors: [ 
    { name: 'Indoor', type: 11, pin: 2 },
  ]
}


   var init={
      name:"home-raspberry",
      types:["temperatura","movimento"],
      //data:[]
   }


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



   conn.on("connect",function(){
           
             console.log("dati");


                   console.log("while");
});

 conn.on("errore",function(tipo){
             switch(tipo){
                    case "300":     
                             console.log("300");    
              break;


           }
});

function readInput() {
    gpio.read(5, function(err, value) {
        console.log('The value is ' + value);
    });
}
