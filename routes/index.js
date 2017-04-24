var express = require('express');
var router = express.Router();
var fs = require("fs");
var ini = require("ini");
var gwconfig = '/etc/opendv/ircddbgateway';
var gwConfStr = fs.readFileSync(gwconfig, { encoding : "UTF-8" });
var gwconf = ini.parse(gwConfStr);

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

gwconf['hat'] = hatRead();
gwconf['model'] = getModel();
Object.keys(gwconf).forEach(function(cKey) {
	var key = String(cKey);
	if (key.startsWith("ircddbPassword") || key.startsWith("remote")) {
		delete gwconf[cKey];
		console.log("Removed: " + key);
	}
});
/* GET home page. */
router.get('/', function(req, res, next) {
	res.render('home', { title: 'Dashboard', gw : gwconf });
});

module.exports = router;
