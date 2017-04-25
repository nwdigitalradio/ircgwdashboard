var io = require('socket.io')();
var fs = require('fs');
var ini = require("ini");
var gwconfig = '/etc/opendv/ircddbgateway';
var gwConfStr = fs.readFileSync(gwconfig, { encoding : "UTF-8" });
var gw = ini.parse(gwConfStr);

var xmissions = {};

function repeaterCall(data) {
        if (data.trim().length === 8) return data;
        if (data.trim().length === 1) {
                var callsign = gw.gatewayCallsign;
                while(callsign.length < 7) callsign += ' ';
                callsign += data.trim();
                return callsign;
        }
        return null;
}

Object.keys(gw).forEach(function(cKey) {
	var key = String(cKey);
	if (key.startsWith("repeaterBand")) {
		var band = String(gw[cKey]);
		var rcall = repeaterCall(band);
		if (band.length > 0) {
			xmissions[rcall] = new Array();
		}
	}
});

function trimNull(a) {
  var c = a.indexOf('\0');
  if (c>-1) {
    return a.substr(0, c);
  }
  return a;
}

function getModel() {
        var mod = 'unknown';
        var modelfile = "/proc/device-tree/model";
        if (fs.existsSync(modelfile)) {
                var model = fs.readFileSync(modelfile).toString();
                mod = trimNull(model);
        }
        return mod;
}

function hatRead() {
        var path = "/proc/device-tree/hat";
        var hat = {};
        if (fs.existsSync(path)) {
                var items = fs.readdirSync(path);
                for (var i=0; i<items.length; i++) {
                        var filename = path + "/" + items[i];
                        var value = fs.readFileSync(filename).toString().trim();
                        hat[items[i]] = trimNull(value);
                }
        }
        return hat;
}


var SecondsTohhmmss = function(totalSeconds) {
        var days = Math.floor(totalSeconds / 86400);
        var used = days * 86400;
        var hours = Math.floor((totalSeconds - used) / 3600);
        used += hours * 3600;
        var minutes = Math.floor((totalSeconds - used) / 60);
        used += minutes * 60;
        var seconds = totalSeconds - used;

        seconds = Math.floor(seconds);
        var result = {}
        result['days'] = days;
        var hms = (hours < 10 ? "0" + hours : hours);
        hms += ":" + (minutes < 10 ? "0" + minutes : minutes);
        hms += ":" + (seconds < 10 ? "0" + seconds : seconds);
        result['hms'] = hms;
        return result;
}

var gwstatseconds = 60 * 1000;

io.on('connection', function(socket) {
	for (var key in xmissions) {
		if(!xmissions.hasOwnProperty(key)) continue;
		var xmit = xmissions[key];
		for (var i = 0; i < xmit.length; i++) {
			socket.emit('repeater',xmit[i]);
		}
	}

	socket.on('disconnect', function(){
		console.log('Client gone (id=' + socket.id + ').');
	});
	socket.on('repeater', function(msg){
		socket.broadcast.emit('repeater', msg);
		if (msg.transmit) {
			if (!msg.transmit.flags.startsWith('01') && msg.transmit.my !== gw.gatewayCallsign && msg.transmit.my !== msg.repeater){
				xmissions[msg.repeater].push(msg);
				if (xmissions[msg.repeater].length > 10) {
					var x = xmissions[msg.repeater].shift();
				}
			}
		}
	});
	setInterval(
        function() {
		var gwstats = {};
                gwstats['model'] = getModel();
                gwstats['hat'] = hatRead();
                fs.readFileSync("/proc/uptime").toString().split('\n').forEach(
                        function(line) {
                                if (line.trim().length > 0) {
                                        var timex = line.split(" ");
                                        gwstats['uptime'] = SecondsTohhmmss(timex[0]);
                                }
                        });
                fs.readFileSync("/proc/loadavg").toString().split('\n').forEach(
                        function(line) {
                                if (line.trim().length > 0) {
                                        var la = line.split(" ");
                                        var loadavg = {};
                                        loadavg["1m"] = la[0];
                                        loadavg["5m"] = la[1];
                                        loadavg["15m"] = la[2];
                                        gwstats['loadavg'] = loadavg;
                                }
                        });
                fs.readFileSync("/sys/class/thermal/thermal_zone0/temp").toString().split('\n').forEach(
                        function(line) {
                                if (line.trim().length > 0) {
                                        var cputemp = {};
                                        var temps = line.split(" ");
                                        var centigrade = temps[0] / 1000;
                                        var fahrenheit = (centigrade * 1.8) + 32;
                                        cputemp['c'] = Math.round(centigrade * 100) / 100;
                                        cputemp['f'] = Math.round(fahrenheit * 100) / 100;
                                        gwstats['cputemp'] = cputemp;
                                }
                        });
                gwstats['timestamp'] = new Date().getTime();
                socket.broadcast.emit("gateway", gwstats);
	}, gwstatseconds);
});

module.exports = io;
