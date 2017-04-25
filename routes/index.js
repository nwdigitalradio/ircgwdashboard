var express = require('express');
var router = express.Router();
var fs = require("fs");
var ini = require("ini");
var gwconfig = '/etc/opendv/ircddbgateway';
var gwConfStr = fs.readFileSync(gwconfig, { encoding : "UTF-8" });
var gwconf = ini.parse(gwConfStr);
var rptrgwdata = [];
var xmissions = [];

String.prototype.startsWith = function (str)
{
   return this.indexOf(str) == 0;
}

String.prototype.trimBetween = function (before,after) {
        var left = this.indexOf(before) + before.length;
        var right = this.indexOf(after);
        var target = this.substring(left, right).trim();
        return target;
}

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


function repeaterCall(data) {
        if (data.trim().length === 8) return data;
        if (data.trim().length === 1) {
                var callsign = gwconf.gatewayCallsign;
                while(callsign.length < 7) callsign += ' ';
                callsign += data.trim();
                return callsign;
        }
        return null;
}

function buildRepeaterBasics(key,gwdata,call){
	var num = key.charAt(key.length-1);
       	var record = {};
       	record.callsign = call;
       	record.url = gwdata['url'+num];
       	record.latitude = gwdata['latitude'+num];
       	record.longitude = gwdata['longitude'+num];
       	record.description1 = gwdata['description'+num+'_1'];
       	record.description2 = gwdata['description'+num+'_2'];
       	record.frequency = gwdata['frequency'+num];
       	record.offset = gwdata['offset'+num];
       	record.atStartup = gwdata['atStartup'+num];
       	record.reflector = gwdata['reflector'+num];
       	record.reconnect = gwdata['reconnect'+num];
       	record.agl = gwdata['agl'+num];
	record.rangeKms = gwdata['rangeKms'+num];
       	console.log(JSON.stringify(record));
       	return record;
}

Object.keys(gwconf).forEach(function(cKey) {
	var key = String(cKey);
	if (key.startsWith("repeaterBand")) {
       		var band = String(gwconf[cKey]);
		var rcall = repeaterCall(band);
		if (band.length > 0) {
			rptrgwdata.push(buildRepeaterBasics(key,gwconf,rcall));
			xmissions[rcall] = new Array();
		}
	}
});

gwconf.model = getModel();
gwconf.hat = hatRead();


Object.keys(gwconf).forEach(function(cKey) {
	var key = String(cKey);
	if (key.startsWith("ircddbPassword") || key.startsWith("remote")) {
		delete gwconf[cKey];
		console.log("Removed: " + key);
	}
});
/* GET home page. */
router.get('/', function(req, res, next) {
	res.render('home', { title: gwconf.gatewayCallsign + ' Dashboard', gw : gwconf, repeaters : rptrgwdata });
});

module.exports = router;
