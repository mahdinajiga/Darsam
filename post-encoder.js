var encode = function () {
    var rawMessage = arguments[0];
    rawMessage = rawMessage.replace("<", "&lt;");
    rawMessage = rawMessage.replace(">", "&gt;");
    rawMessage = rawMessage.replace(/\n/g, "<br>");
    return rawMessage;
}


function sleep(milliseconds) {
    var start = new Date().getTime();
    for (var i = 0; i < 1e7; i++) {
      if ((new Date().getTime() - start) > milliseconds){
        break;
      }
    }
  }

module.exports.encode = encode;