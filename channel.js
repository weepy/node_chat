//CHANNEL
var Channel = function (name) {
  this.name = name
  this.messages = [];
  this.callbacks = [];
  this.sessionCount = 0
  this.nickCounts = {}
};

Channel.all = {}
exports.Channel = Channel
var sys = require("sys");

Channel.create = function(name) {
  if(Channel.all[name]) 
    return Channel.all[name]

  if (name.length > 50) return null;
  if (/[^\w_\-^!]/.exec(name)) return null;
  
  Channel.all[name] = new Channel(name)
  return Channel.all[name]
}

Channel.clearCallbacks = function (timeout) {
  // clear old callbacks
  // they can hang around for at most 30 seconds.
  var now = new Date();
  for(var i in Channel.all) {
    var channel = Channel.all[i]
    while (channel.callbacks.length > 0 && now - channel.callbacks[0].timestamp > timeout) {
      channel.callbacks.shift().callback([]);
    }    
  }
}

Channel.prototype.appendMessage = function (nick, type, text) {
  var m = { nick: nick
          , type: type // "msg", "join", "part"
          , text: text
          , timestamp: (new Date()).getTime()
          };
  var ret = null
  switch (type) {
    case "msg":
      ret = ("<" + nick + "> " + text);
      break;
    case "join":
      ret = (nick + " join");
      break;
    case "part":
      ret = (nick + " part");
      break;
  }

  this.messages.push( m );

  while (this.callbacks.length > 0)
    this.callbacks.shift().callback([m]);

  while (this.messages.length > Channel.messageBackLog)
    this.messages.shift();

  return ret
};

Channel.prototype.query = function (since, callback) {
  var matching = [];
  
  sys.puts("querying channel for messages since: " + since)
  for (var i = 0; i < this.messages.length; i++) {
    var message = this.messages[i];
    sys.puts("message with timestamp" + message.timestamp)
    if (message.timestamp > since)
      matching.push(message)
  }

  sys.puts("found " + matching.length)
  
  if (matching.length != 0) {
    callback(matching);
  } else {
    this.callbacks.push({ timestamp: new Date(), callback: callback });
  }
};

Channel.prototype.join = function(session) {
  this.sessionCount += 1
  this.nickCounts[session.nick] = this.nickCounts[session.nick] || 0
  this.nickCounts[session.nick] += 1
}

Channel.prototype.unjoin = function(session) {
  this.sessionCount -= 1
  this.nickCounts[session.nick] -= 1
}


Channel.prototype.destroy = function() {
  // save backlog to disk when there's no longer any sessions ?
  
  delete Channel.all[this.name]
}
