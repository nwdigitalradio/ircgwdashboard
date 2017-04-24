
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
