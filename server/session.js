var Session = function(nick, channel){ 
  this.nick = nick 
  this.channel = channel
  this.id = Math.floor(Math.random()*999999999999999).toString()
  this.channel.join(this)
  
  this.timestamp = new Date()
};

Session.all = {}
exports.Session = Session

Session.find = function (nick, channel) {
  for (var i in Session.all) {
    var session = Session.all[i];
    if (session && session.nick === nick && session.channel == channel) {
      return true
    }
  }
}

Session.create = function (nick, channel) {
  
  if (nick.length > 50) return null;
  if (/[^\w_\-^!]/.exec(nick)) return null;

  var session = new Session(nick, channel)
  Session.all[session.id] = session
  
  // TODO subscribe this session to the channel
  return session;
}

Session.prototype.poke = function () {
  this.timestamp = new Date();
}

Session.prototype.destroy = function () {
  this.channel.appendMessage(this.nick, "part");
  this.channel.unjoin(this)
  delete Session.all[this.id]; //sessions[this.id];
}

Session.killOld = function(timeout) {
  var now = new Date();
  for (var id in Session.all) {
    if (!Session.all.hasOwnProperty(id)) continue;
    var session = Session.all[id];
          
    if (now - session.timestamp > timeout) {
      session.destroy();
    }
  }
}
