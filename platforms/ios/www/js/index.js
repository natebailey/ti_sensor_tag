var button = {
service: "FFE0",
data: "FFE1", // Bit 2: side key, Bit 1- right key, Bit 0 –left key
};
var accelerometer = {
service: "F000AA80-0451-4000-B000-000000000000",
data: "F000AA81-0451-4000-B000-000000000000", // read/notify 3 bytes X : Y : Z
notification:"F0002902-0451-4000-B000-000000000000",
configuration: "F000AA82-0451-4000-B000-000000000000", // read/write 1 byte
period: "F000AA83-0451-4000-B000-000000000000" // read/write 1 byte Period = [Input*10]ms
};
var barometer = {
service: "F000AA40-0451-4000-B000-000000000000",
data: "F000AA41-0451-4000-B000-000000000000",
notification: "F0002902-0451-4000-B000-000000000000",
configuration: "F000AA42-0451-4000-B000-000000000000",
period: "F000AA43-0451-4000-B000-000000000000"
    
};
var luxometer = {
service: 'f000aa70-0451-4000-b000-000000000000',
data: 'f000aa71-0451-4000-b000-000000000000',
configuration: 'f000aa72-0451-4000-b000-000000000000',
period: 'f000aa83-0451-4000-b000-000000000000',
};
var LEFT_BUTTON = 1;  // 0001
var RIGHT_BUTTON = 2; // 0010
var REED_SWITCH = 4;  // 0100

var xf =0;
var yf =0;
var zf =0;
var accelCounter =0;
var gpsCounter = 601;
var connectedDeviceID = 0;
var searchingForDevices = false;
var connecting = true;

window.onbeforeunload = function () {
    if(connectedDeviceID != 0){
        //ble.disconnect(connectedDeviceID, app.showMainPage, app.onError);
    }
};

document.addEventListener("resume",onResume, false);

function reloadApp(){    
	if(connectedDeviceID != 0){
        ble.disconnect(connectedDeviceID, app.showMainPage, app.onError);
    }
	location.reload();
}

function onResume(){
    hideModal();
	connected=0;
	connectPortal();
}

var deviceListMap = new Map();

var app = {
initialize: function() {
    initializeUI();
    this.bindEvents();
    $("#detailPage").hide();
},
bindEvents: function() {
    document.addEventListener('deviceready', this.onDeviceReady, false);
    //refreshButton.addEventListener('touchstart', this.refreshDeviceList, false);
    disconnectButton.addEventListener('touchstart', this.disconnect, false);
},
onDeviceReady: function() {
    connectPortal();
},
refreshDeviceList: function() {
	if(!hasName){
	  $("#modalMessage").html("Update name before scanning for tags.")
	  $("#modalMessage").show();
	  $("#modalPage").show();
		setTimeout(function(){
			hideModal();
	   },3000);
	   return;
	}

	showModalRefresh();
	ble.isEnabled(
	function(){
		deviceListMap.clear();
		deviceList.innerHTML = '';
        setTimeout(
            function(){
            ble.scan(['AA80'], 5, app.onDiscoverDevice, app.onError);
            searchingForDevices=true;
            setTimeout(function(){
				if(searchingForDevices){
					hideModal();
				}
            },3000);
        },2000);
	},
	function(){
        hideModal();
		$("#modalMessage").html("Enable bluetooth <br> and <br><button disabled id='reconnectButton' class='bleReconnect' onclick='reloadApp()'>restart application.</button>");
		$("#modalMessage").show();
		$("#modalPage").show();
        setTimeout(function(){
                   $(".bleReconnect").prop('disabled',false);
        },500);
	});
	
},
onDiscoverDevice: function(device) {
    hideModal();
    searchingForDevices=false;
    var listItem = document.createElement('li'),
    html = '<span style="font-size:10px;">' +
    device.id + '</span><br/><span style="font-size:20px;">Connect</span>';
    console.log(device.id);
    listItem.dataset.deviceId = device.id;  // TODO
    listItem.innerHTML = html;
    listItem.onclick=function(){
        app.connect(device.id);
    };
	
	if(!deviceListMap.get(device.id)){
		deviceListMap.set(device.id,device.id);
		deviceList.appendChild(listItem);
	}
	
},
connect: function(id) {
	$("#modalLoading").show();
    $("#modalPage").show();
    var deviceId = id,
    onConnect = function() {
		connecting=false;
        app.showDetailPage();
        $("#deviceList").empty();
        connectedDeviceID = deviceId;
        //Subscribe to button service
        ble.startNotification(deviceId, button.service, button.data, app.onButtonData, app.onError);
        //Subscribe to accelerometer service
        ble.startNotification(deviceId, accelerometer.service, accelerometer.data, app.onAccelerometerData, app.onError);
        //Subscribe to barometer service
        ble.startNotification(deviceId, barometer.service, barometer.data, app.onBarometerData, app.onError);
        //lux and humidity
        ble.startNotification(deviceId, luxometer.service, luxometer.data, app.onLuxometerData, app.onError);
        
        // turn accelerometer on
        var configData = new Uint16Array(1);
        //Turn on gyro, accel, and mag, 2G range, Disable wake on motion
        configData[0] = 0x007F;
        ble.write(deviceId, accelerometer.service, accelerometer.configuration, configData.buffer,
                  function() { console.log("Started accelerometer."); },app.onError);
        
        var periodData = new Uint8Array(1);
        periodData[0] = 0x0A;
        ble.write(deviceId, accelerometer.service, accelerometer.period, periodData.buffer,
                  function() { console.log("Configured accelerometer period."); },app.onError);
        
        //Turn on barometer
        var barometerConfig = new Uint8Array(1);
        barometerConfig[0] = 0x01;
        ble.write(deviceId, barometer.service, barometer.configuration, barometerConfig.buffer,
                  function() { console.log("Started barometer."); },app.onError);
        
        //Turn on luxometer
        var luxConfig = new Uint8Array(1);
        luxConfig[0] = 0x01;
        ble.write(deviceId, luxometer.service, luxometer.configuration, luxConfig.buffer,
                  function() { console.log("Started luxometer."); },app.onError);
        
        //Associate the deviceID with the disconnect button
        disconnectButton.dataset.deviceId = deviceId;
    };
	connecting = true;
	setTimeout(function(){
		if(connecting){
			hideModal();
		}
	},10000);
    
    ble.connect(deviceId, onConnect, app.onError);
},
onButtonData: function(data) {
    var state = new Uint8Array(data);
    var message = '';
    
    if (state[0] == 0) {
        button1val=0;
        button2val=0;
    }
    
    if (state[0]==1) {
        button1val=1;
        button2val=0;
        var finalcolor = "hsla(180,100%,50%,.7)";
        $('#cube figure').css('background', finalcolor);
    }
    
    if (state[0]==2) {
        button1val=0;
        button2val=1;
        var finalcolor = "hsla(120,100%,50%,.7)";
        $('#cube figure').css('background', finalcolor);
    }
    
    buttonState.innerHTML = message;
},
    
sensorMpu9250GyroConvert: function(data){
    return data / (65536/500);
},
    
sensorMpu9250AccConvert: function(data){
    // Change  /2 to match accel range...i.e. 16 g would be /16
    return data / (32768 / 2);
},
    
onAccelerometerData: function(data) {
    var message;
    var a = new Int16Array(data);
    
    // Update orientation of box
    
    var alpha = 0;
    //Low Pass Filter
    xf = xf * alpha + (app.sensorMpu9250AccConvert(a[3]) * (1.0 - alpha));
    yf = yf * alpha + (app.sensorMpu9250AccConvert(a[4]) * (1.0 - alpha));
    zf = zf * alpha + (app.sensorMpu9250AccConvert(a[5]) * (1.0 - alpha));
    
    //Roll & Pitch Equations
    var beta = 0.90;
    
    //calculate yaw rotation based on gyro and normalize [-180,180]
    var rotationSinceLast = app.sensorMpu9250GyroConvert(a[0])*-0.1;
    if(((Math.atan2(-yf, zf)*180.0)/3.14)<0){
        if(yaw-180>60) yaw=yaw-360;
    }else{
        if(yaw-180<-60) yaw=yaw+360;
    }
    
    yaw  = ((Math.atan2(-yf, zf)*180.0)/3.14+180)*(1.0-beta)+
    (rotationSinceLast+yaw)*beta;
    pitch = ((Math.atan2(xf, Math.sqrt(yf*yf + zf*zf))*180.0)/3.14)*(1.0-beta)+
    (app.sensorMpu9250GyroConvert(a[1])*0.1+pitch)*beta;
    
    yawSend = yaw;
    pitchSend = pitch;
    
    zAccel = app.sensorMpu9250AccConvert(a[5]);
    yAccel = app.sensorMpu9250AccConvert(a[4]);
    xAccel = app.sensorMpu9250AccConvert(a[3]);
    zGyro = app.sensorMpu9250GyroConvert(a[2]);
    yGyro = app.sensorMpu9250GyroConvert(a[1]);
    xGyro = app.sensorMpu9250GyroConvert(a[0]);
    zMag = a[8];
    yMag = a[7];
    xMag = a[6];
    
    if(accelCounter>5){
        accelCounter=0;
        publishVals();
    }else{
        publishOrientationVals();
        accelCounter++;
    }
    
    if(gpsCounter>600){
        gpsCounter=0;
        function disp(pos) {
            lat = pos.coords.latitude;
            lon = pos.coords.longitude;
            if(latPrev!=lat || lonPrev!=lon){
                latPrev=lat;
                lonPrev=lon;
                publishGps();
            }
        }
        navigator.geolocation.getCurrentPosition(disp);
    }else{
        gpsCounter++;
    }
    document.querySelector('#cube .front').style.transform = 'rotateX( '+ (0+pitch) +'deg ) rotateY( '+ (0+yaw) +'deg ) translateZ( 100px )';
    document.querySelector('#cube .back').style.transform = 'rotateX( '+ (180+pitch) +'deg ) rotateY( '+ (0-yaw) +'deg ) translateZ( 100px )';
    document.querySelector('#cube .right').style.transform = 'rotateX( '+ (0+pitch) +'deg ) rotateY( '+ (90+yaw) +'deg ) translateZ( 100px )';
    document.querySelector('#cube .left').style.transform = 'rotateX( '+ (0+pitch) +'deg ) rotateY( '+ (-90+yaw) +'deg ) translateZ( 100px )';
    document.querySelector('#cube .top').style.transform = 'rotateX( '+ (90+pitch) +'deg ) rotateZ( '+ (0-yaw) +'deg ) translateZ( 100px )';
    document.querySelector('#cube .bottom').style.transform = 'rotateX( '+ (-90+pitch) +'deg ) rotateZ( '+ (0+yaw) +'deg ) translateZ( 100px )';
    
    
    message = "<b><i class='fa fa-repeat' aria-hidden='true'></i>&nbsp Gyro</b> <br/>"+
    "X: " + app.sensorMpu9250GyroConvert(a[0]) + "<br/>" +
    "Y: " + app.sensorMpu9250GyroConvert(a[1]) + "<br/>" +
    "Z: " + app.sensorMpu9250GyroConvert(a[2]) + "<br/>" +
    "<br/><b><i class='fa fa-arrows-alt' aria-hidden='true'></i>Accel</b> <br/>"+
    "X: " + app.sensorMpu9250AccConvert(a[3]) + "<br/>" +
    "Y: " + app.sensorMpu9250AccConvert(a[4]) + "<br/>" +
    "Z: " + app.sensorMpu9250AccConvert(a[5]) + "<br/>" +
    "<br/><b><i class='fa fa-compass' aria-hidden='true'></i>&nbsp; Mag</b> <br/>"+
    "X: " + a[6] + "<br/>" +
    "Y: " + a[7] + "<br/>" +
    "Z: " + a[8] + "<br/>" ;
    
    accelerometerData.innerHTML = message;
},
sensorBarometerConvert: function(data){
    return (data / 100);
    
},
onBarometerData: function(data) {
    var message;
    var a = new Uint8Array(data);
    
    //0-2 Temp
    //3-5 Pressure
    temperature = app.sensorBarometerConvert( a[0] | (a[1] << 8) | (a[2] << 16));
    pressure = app.sensorBarometerConvert( a[3] | (a[4] << 8) | (a[5] << 16));
    message =  "<br/><b><i class='fa fa-bar-chart' aria-hidden='true'></i>&nbsp; Temperature</b> <br/>" +
    app.sensorBarometerConvert( a[0] | (a[1] << 8) | (a[2] << 16)) + "°C <br/>" +
    "<br/><b><i class='fa fa-line-chart' aria-hidden='true'></i>&nbsp; Pressure</b> <br/>" +
    app.sensorBarometerConvert( a[3] | (a[4] << 8) | (a[5] << 16)) + "hPa <br/>" ;
    
    barometerData.innerHTML = message;
},
onLuxometerData: function(data) {
    var value = new Uint16Array(data);
    var mantissa = value[0] & 0x0FFF
    var exponent = value[0] >> 12
    
    magnitude = Math.pow(2, exponent)
    output = (mantissa * magnitude)
    
    lux = output/100;
    if(button1val!=1 && button2val!=1){
        var lux_norm = lux/100+.5;
        lux_norm=lux_norm*-1+1;
        var colx =0;
        var coly =0;
        var finalcolor = "hsla(" +colx +", " +coly +"%, " +"0%, " +lux_norm+")";
        $('#cube figure').css('background', finalcolor);
    }
},
disconnect: function(event) {
    var deviceId = event.target.dataset.deviceId;
    ble.disconnect(deviceId, app.showMainPage, app.onError);
},
showMainPage: function() {
    connectedDeviceID = 0;
    $("#detailPage").hide();
    $("#mainPage").show();
},
showDetailPage: function() {
    $("#mainPage").hide();
    $("#detailPage").show();
    hideModal();
},
onError: function(reason) {
	//$("#modalMessage").html("Error: <br>Enable bluetooth <br> and <br><button id='reconnectButton' onclick='reloadApp()'>restart application.</button>");
	//$("#modalMessage").show();
	//$("#modalPage").show();
	hideModal();
    searchingForDevices = false;
    console.log("onError: "+reason);
    $("#deviceList").empty();
}
};
