var zAccel =0, yAccel =0, xAccel =0, button1val =0, button2val=0, lux=0, yaw=0, pitch=0, yawSend=0, pitchSend=0;
var lat=0, lon=0, xMag=0, yMag=0, zMag=0, xGyro=0, yGyro=0, zGyro=0, temperature=0, pressure=0;

var zAccelPrev =0, yAccelPrev =0, xAccelPrev =0, button1valPrev =0, button2valPrev=0, luxPrev=0, yawPrev=0, pitchPrev=0;
var latPrev=0, lonPrev=0, xMagPrev=0, yMagPrev=0, zMagPrev=0, xGyroPrev=0, yGyroPrev=0, zGyroPrev=0, temperaturePrev=0, pressurePrev=0;

var connected=0;

var hasName = false;

$(function() {
	if ($('#url').val() == '')
		$('#url').val(
				window.location.protocol + '//' + window.location.hostname
						+ ':8443/api');
});

var portraitScreenHeight;
var landscapeScreenHeight;
var initializeUI = function(){
	if(window.orientation === 0 || window.orientation === 180){
		portraitScreenHeight = $(window).height();
		landscapeScreenHeight = $(window).width();
	}
	else{
		portraitScreenHeight = $(window).width();
		landscapeScreenHeight = $(window).height();
	}

	var tolerance = 25;
	$(window).bind('resize', function(){
		if((window.orientation === 0 || window.orientation === 180) &&
		   ((window.innerHeight + tolerance) < portraitScreenHeight)){
			// keyboard visible in portrait
			$("#signature").hide();
		}
		else if((window.innerHeight + tolerance) < landscapeScreenHeight){
			// keyboard visible in landscape
			$("#signature").hide();
		}
		else{
			$("#signature").show();
		}
	});
}
var showModalRefresh = function(){
	$("#modalPage").show();
	$("#modalRadar").show();
	$("#radar").show();
}
var hideModal = function(){
	$(".modal").hide();
	$("#modalPage").hide();
}
var publishGps = function(){
	var thingkey = "ti-"+device.uuid;
	if (connected == false) {
		hideModal();
		$("#modalMessage").html("Failed to connect <br>check internet <br>connection and <br><button id='reconnectButton' onclick='reloadApp()'>restart application.</button>");
		$("#modalMessage").show();
		$("#modalPage").show();
	   return false;
	}
	var req = 
	'{'+
		'"publishGps" : {'+
			'"command" : "location.publish",'+
			'"params" : {'+
				'"thingKey" : "'+thingkey+'",'+
				'"lat" : '+lat+','+
				'"lng" : '+lon+','+
				'"fixType" : "gps",'+
				'"fixAcc" : 3'+
			'}'+
		'}'+
	'}';
	
	try {
		JSON.parse(req);
	} catch (e) {
		alert('Invalid JSON!' + e)
		return true;
	}

	message = new Paho.MQTT.Message(req);
	
	message.destinationName = "api";
	try{
	client.send(message);
	}catch(err){ 
		hideModal();
		$("#modalMessage").html("Failed to connect <br>check internet <br>connection and <br><button id='reconnectButton' onclick='reloadApp()'>restart application.</button>");
		$("#modalMessage").show();
		$("#modalPage").show();
	   return false;
	}
	return true;
}
var createThing = function(){
	var thingkey = "ti-"+device.uuid;
	var lastFive = thingkey.substr(thingkey.length - 5); 
	var name = "TI Sensor Tag - "+lastFive;
	if (connected == false) {
		return;
	}
	var req = 
	'{'+
		'"createThing": {'+
			'"command": "thing.create",'+
			'"params": {'+
				'"name": "'+name+'",'+
				'"key": "'+thingkey+'",'+      
				'"attrs": {'+  
					'"name": {'+  
					  '"value": "Name not set"'+  
					'}'+  
				  '},'+  
				'"defId": "57212b3f7094416f7531d992",'+
				'"desc": "",'+
				'"tags": ["tisensortag"],'+
				'"iccid": "",'+
				'"esn": ""'+
			'}'+
		'}'+
	'}';

	try {
		JSON.parse(req);
	} catch (e) {
		alert('Invalid JSON!' + e)
		return;
	}

	message = new Paho.MQTT.Message(req);
	
	message.destinationName = "api";
	
	try{
		client.send(message);
	}catch(err){
		hideModal();
		$("#modalMessage").html("Failed to connect <br>check internet <br>connection and <br><button id='reconnectButton' onclick='reloadApp()'>restart application.</button>");
		$("#modalMessage").show();
		$("#modalPage").show();
	   return;
	}
}

var publishOrientationVals = function() {
	if (connected == false) {
		return;
	}
	var thingkey = "ti-"+device.uuid;
	var newVal = false;
	var req = 
	'{'+
		'"1": {'+
			'"command": "property.batch",'+
			'"params": {'+
				'"thingKey": "'+thingkey+'",'+
				'"key": "batchkey",'+
				'"aggregate":false,'+
				'"data": [';
				
	if(Math.abs(yawPrev-yawSend)>1.0){
		newVal = true;
		yawPrev=yawSend;
		req +=	'{'+
					'"key": "yaw",'+
					'"value": '+yawSend+
				'},';
	}
	if(Math.abs(pitchPrev-pitchSend)>1.0){
		newVal = true;
		pitchPrev=pitchSend;
		req +=	'{'+
			'"key": "pitch",'+
			'"value": '+pitchSend+
		'},';
	}
	if(button1val != button1valPrev){
		newVal = true;
		button1valPrev=button1val;
		req +=	'{'+
			'"key": "button1",'+
			'"value": '+button1val+
		'},';
	}
	if(button2val != button2valPrev){
		newVal = true;
		button2valPrev=button2val;
		req +=	'{'+
			'"key": "button2",'+
			'"value": '+button2val+
		'},';
	}
	if(Math.abs(luxPrev-lux)>20){
		newVal = true;
		luxPrev=lux;
		req +=	'{'+
			'"key": "luxometer",'+
			'"value": '+lux+
		'},';
	}
	req = req.substring(0,req.length-1);
	req +=	']}}}';	

	if(newVal){
		if (req == '') {
			alert('Empty request!');
			return;
		}

		try {
			JSON.parse(req);
		} catch (e) {
			alert('Invalid JSON!' + e)
			return;
		}	

		message = new Paho.MQTT.Message(req);
		
		message.destinationName = "api";
		try{
			client.send(message);
		}catch(err){
			hideModal();
			$("#modalMessage").html("Failed to connect <br>check internet <br>connection and <br><button id='reconnectButton' onclick='reloadApp()'>restart application.</button>");
			$("#modalMessage").show();
			$("#modalPage").show();
		   return;
		}
	}
}

var publishVals = function() {
	if (connected == false) {
		return;
	}
	var thingkey = "ti-"+device.uuid;
	var newVal = false;
	var req = 
	'{'+
		'"1": {'+
			'"command": "property.batch",'+
			'"params": {'+
				'"thingKey": "'+thingkey+'",'+
				'"key": "batchkey",'+
				'"aggregate":false,'+
				'"data": [';

	if(Math.abs(yawPrev-yawSend)>1.0){
		newVal = true;
		yawPrev=yawSend;
		req +=	'{'+
					'"key": "yaw",'+
					'"value": '+yawSend+
				'},';
	}
	if(Math.abs(pitchPrev-pitchSend)>1.0){
		newVal = true;
		pitchPrev=pitchSend;
		req +=	'{'+
			'"key": "pitch",'+
			'"value": '+pitchSend+
		'},';
	}
	if(Math.abs(zAccelPrev-zAccel)>0.1){
		newVal = true;
		zAccelPrev=zAccel;
		req +=	'{'+
			'"key": "z_Accel",'+
			'"value": '+zAccel+
		'},';
	}
	if(Math.abs(yAccelPrev-yAccel)>0.1){
		newVal = true;
		yAccelPrev=yAccel;
		req +=	'{'+
			'"key": "y_Accel",'+
			'"value": '+yAccel+
		'},';
	}
	if(Math.abs(xAccelPrev-xAccel)>0.1){
		newVal = true;
		xAccelPrev=xAccel;
		req +=	'{'+
			'"key": "x_Accel",'+
			'"value": '+xAccel+
		'},';
	}
	if(Math.abs(zGyroPrev-zGyro)>5.0){
		newVal = true;
		zGyroPrev=zGyro;
		req +=	'{'+
			'"key": "z_Gyro",'+
			'"value": '+zGyro+
		'},';
	}
	if(Math.abs(yGyroPrev-yGyro)>5.0){
		newVal = true;
		yGyroPrev=yGyro;
		req +=	'{'+
			'"key": "y_Gyro",'+
			'"value": '+yGyro+
		'},';
	}
	if(Math.abs(xGyroPrev-xGyro)>5.0){
		newVal = true;
		xGyroPrev=xGyro;
		req +=	'{'+
			'"key": "x_Gyro",'+
			'"value": '+xGyro+
		'},';
	}
	if(Math.abs(zMagPrev-zMag)>30.0){
		newVal = true;
		zMagPrev=zMag;
		req +=	'{'+
			'"key": "z_Mag",'+
			'"value": '+zMag+
		'},';
	}
	if(Math.abs(yMagPrev-yMag)>30.0){
		newVal = true;
		yMagPrev=yMag;
		req +=	'{'+
			'"key": "y_Mag",'+
			'"value": '+yMag+
		'},';
	}
	if(Math.abs(xMagPrev-xMag)>30.0){
		newVal = true;
		xMagPrev=xMag;
		req +=	'{'+
			'"key": "x_Mag",'+
			'"value": '+xMag+
		'},';
	}
	if(button1val != button1valPrev){
		newVal = true;
		button1valPrev=button1val;
		req +=	'{'+
			'"key": "button1",'+
			'"value": '+button1val+
		'},';
	}
	if(button2val != button2valPrev){
		newVal = true;
		button2valPrev=button2val;
		req +=	'{'+
			'"key": "button2",'+
			'"value": '+button2val+
		'},';
	}
	if(Math.abs(temperaturePrev-temperature)>0.01){
		newVal = true;
		temperaturePrev=temperature;
		req +=	'{'+
			'"key": "temperature",'+
			'"value": '+temperature+
		'},';
	}
	if(Math.abs(pressurePrev-pressure)>0.02){
		newVal = true;
		pressurePrev=pressure;
		req +=	'{'+
			'"key": "pressure",'+
			'"value": '+pressure+
		'},';
	}
	if(Math.abs(luxPrev-lux)>20){
		newVal = true;
		luxPrev=lux;
		req +=	'{'+
			'"key": "luxometer",'+
			'"value": '+lux+
		'},';
	}
					
	req = req.substring(0,req.length-1);
	req +=	']}}}';
			
	if(newVal){
		if (req == '') {
			alert('Empty request!');
			return;
		}

		try {
			JSON.parse(req);
		} catch (e) {
			alert('Invalid JSON!' + e)
			return;
		}	

		message = new Paho.MQTT.Message(req);
		
		message.destinationName = "api";
		client.send(message);
	}
}

var connected = false;

var publishName = function(){
	console.log("Update name");
	if (connected == false) {
		alert('Connection to portal failed. Check internet connection and reload application.');
		return;
	}
	
	if(!publishGps()){
		return;
	}
	
	if($("#name").val().length<1){
		$("#modalMessage").html("Invalid name.<br> Please try again.");
		$("#modalMessage").show();
		$("#modalPage").show();
		setTimeout(function(){
		   if(searchingForDevices=true){
			   hideModal();
		   }
	   },3000);
	   return;
	}
	
	$("#modalLoading").show();
	$("#modalPage").show();
	
	setTimeout(
	  function() 
	  {
		var thingkey = "ti-"+device.uuid;
		console.log(thingkey);
		var req = 
		'{'+
			'"publishName": {'+
				'"command" : "attribute.publish",'+
				'"params" : {'+
					'"thingKey": "'+thingkey+'",'+
					'"key": "name",'+
					'"value":"'+$("#name").val()+'"'+
				'}'+
			'}'+
		'}';
		
		console.log("request"+req);
			

		if (req == '') {
			alert('Empty request!');
			return;
		}

		try {
			JSON.parse(req);
		} catch (e) {
			hideModal();
			return;
		}
		
		message = new Paho.MQTT.Message(req);
		
		message.destinationName = "api";
		try{
			client.send(message);
		}catch(err){
			hideModal();
			$("#modalMessage").html("Failed to connect <br>check internet <br>connection and <br><button id='reconnectButton' onclick='reloadApp()'>restart application.</button>");
			$("#modalMessage").show();
			$("#modalPage").show();
		   return;
		}
	}, 2000);
	
}

var getName = function() {
	if (connected == false) {
		return;
	}
	var thingkey = "ti-"+device.uuid;
	console.log(thingkey);
	var req = 
	'{'+
		'"getName": {'+
			'"command" : "attribute.current",'+
			'"params" : {'+
				'"thingKey": "'+thingkey+'",'+
				'"key": "name"'+
			'}'+
		'}'+
	'}';
	
	if (req == '') {
		alert('Empty request!');
		return;
	}

	try {
		JSON.parse(req);
	} catch (e) {
		alert('Invalid JSON!' + e)
		return;
	}
	
	message = new Paho.MQTT.Message(req);
	
	message.destinationName = "api";
	client.send(message);
}

var connectPortal = function() {

	//var host = "api-dev.devicewise.com";
	var host = "device1-api.10646.cn";
	var port = 443;
	//var port = 8883;
	var ssl = port != 80 && port != 8080

	
	var thingkey = "ti-"+device.uuid;
	console.log(thingkey);
	
	var clientId = thingkey;
	var username = thingkey;
	//var password = "demo_ti_ble";
	var password = "CX28T6lS6EjARkbj";	

	
	if(connected==1){
		return;
	}
	
	client = new Paho.MQTT.Client(host, port, '/mqtt' + (ssl ? '-ssl' : ''),
			clientId);

	client.onConnectionLost = onConnectionLost;
	client.onMessageArrived = onMessageArrived;
	
	client.connect({
		userName : username,
		password : password,
		useSSL : ssl,
		mqttVersion : 3,
		onSuccess : onConnect,
		onFailure : onFailure
	});

	function onFailure(responseObject) {
		console.log("failed");
		$("#modalMessage").html("Failed to connect <br>check internet<br>connection and<br><button id='reconnectButton' onclick='reloadApp()'>restart application.</button>");
		$("#modalMessage").show();
		$("#modalPage").show();
	}

	function onConnect() {
		connected=1;
		console.log("connected");
		getName();
    
		function disp(pos) {
			lat = pos.coords.latitude;
			lon = pos.coords.longitude;
		}
		navigator.geolocation.getCurrentPosition(disp);
		
		client.subscribe("reply");
	}

	function onConnectionLost(responseObject) {
	}

	function onMessageArrived(message) {
		var obj = jQuery.parseJSON(message.payloadString);
		if(!obj['publishGps']){
			hideModal();
		}
		
		if(obj['getName']){			
			if(obj['getName'].errorCodes){
				hasName = false;
				$("#name").attr("placeholder", "Click here to set name.");
				return;
			}
			var name = obj['getName'].params.value;
			
			if(name.length<1){
				hasName = false;
				return;
			}
			hasName = true;
			$("#name").val(name);
		}
		
		if(obj['publishName']){	
			if(obj['publishName'].errorCodes){
				$("#modalMessage").html("Update name failed.<br> Please try again.");
				$("#modalMessage").show();
				$("#modalPage").show();
				setTimeout(function(){
				   if(searchingForDevices=true){
					   hideModal();
				   }
				},4000);
				hasName = false;
				return;
			}
			hasName = true;
		}
	}
}
var littleEndianToUint8ZeroethIndex = function(data)
{
	return data[0];
}
var littleEndianToUint8FirstIndex = function(data)
{
	return data[1];
}
var littleEndianToUint16 = function(data)
{
	return (littleEndianToUint8FirstIndex(data) << 8) +
		littleEndianToUint8ZeroethIndex(data);
}
