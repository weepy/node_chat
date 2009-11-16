
var fu = require("./fu");
var sys = require("sys");
var MD5 = require("./md5");
var Session = require("./session").Session;
var Channel = require("./channel").Channel;

//CONFIG
var Config = {
  allowDuplicateUsernames: true,
  host: null,
  port: 8001,
  messageBacklog: 200,
  KeepaliveTimeout: 5 * 1000,
  SessionTimeout: 10 * 1000
  //,SecurityKey: "3244454u903-2hiout"
}

Channel.messageBackLog = Config.messageBackLog



//SESSION
// TODO move this into CommonJS modules ... not sure how to handle prototypes ?


//INTERVALS
setInterval(function () {
  Session.killOld(Config.sessionTimeout)
}, 1000);

setInterval(function () {
  Channel.clearCallbacks(Config.KeepaliveTimeout)
}, 1000);


//ROUTING

fu.listen(Config.port, Config.host);

fu.get("/", fu.staticHandler("./client/index.html"));
fu.get("/style.css", fu.staticHandler("./client/style.css"));
fu.get("/client.js", fu.staticHandler("./client/client.js"));
fu.get("/jquery-1.2.6.min.js", fu.staticHandler("./client/jquery-1.2.6.min.js"));


fu.get("/who", function (req, res) {
  var nicks = {}; // don't want to count the same name twice
  for (var id in Session.all) {
    if (!Session.all.hasOwnProperty(id)) continue;
    var session = Session.all[id];
    nicks[session.nick] = 1
  }
  
  var ret = []
  for(var i in nicks) {
    ret.push(i)
  }
  res.simpleJSON(200, { nicks: ret });
});

fu.get("/channels", function (req, res) {
  var channels = []
  for(var i in Channel.all) {
    channels.push(Channel.all[i].name)
  }
  res.simpleJSON(200, { channels: channels });
})

fu.get("/join", function (req, res) {
  var nick = req.uri.params["nick"];
  if (nick == null || nick.length == 0) {
    res.simpleJSON(400, {error: "Bad nick."});
    return;
  }
  
  var channel_name = req.uri.params["channel"]
  if (channel_name == null || channel_name.length == 0) {
    res.simpleJSON(400, {error: "Bad channel name."});
    return;
  }
  
  // check Crypto
  if(Config.SecurityKey) {
    var md5 = MD5.hex_md5(nick+channel+Config.SecurityKey)
    if( req.uri.params["key"] != md5)
    res.simpleJSON(400, {error: "Bad auth"});
    return;
  }
  
  
  var channel = Channel.create(channel_name)
  if (channel == null) {
    res.simpleJSON(400, {error: "Bad channel name"});
    return;
  }
  
  if(!Config.allowDuplicateUsernames) {
    if(Session.find(nick, channel))
      return null
  }
  
  var session = Session.create(nick, channel);
  
  if (session == null) {
    res.simpleJSON(400, {error: "Bad Nick?"});
    return;
  }

  //sys.puts("connection: " + nick + "@" + res.connection.remoteAddress);

  var log = channel.appendMessage(session.nick, "join");
  sys.puts(log)
  res.simpleJSON(200, { id: session.id, nick: session.nick});
});

fu.get("/part", function (req, res) {
  var id = req.uri.params.id;
  var session;
  if (id && Session.all[id]) {
    session = Session.all[id];
    session.destroy();
  }
  res.simpleJSON(200, { });
});

fu.get("/recv", function (req, res) {
  var since = req.uri.params.since, id = req.uri.params.id;
  if (!since || !id) {
    res.simpleJSON(400, { error: "Must supply since and id parameter" });
    return;
  }

  var session = Session.all[id];
  
  if (session)
    session.poke();
  else {
    sys.puts("no session for for id: " + id  )
    return 
  }

  var s = parseInt(since, 10);
    
  session.channel.query(s, function (messages) {
    if (session) session.poke();
    res.simpleJSON(200, { messages: messages });
  });
});

fu.get("/send", function (req, res) {
  var id = req.uri.params.id;
  var text = req.uri.params.text;

  var session = Session.all[id];
  if (!session || !text) {
    res.simpleJSON(400, { error: "No such session id" });
    return; 
  }

  session.poke();
    

  var log = session.channel.appendMessage(session.nick, "msg", text);
  sys.puts(log)
  res.simpleJSON(200, {});
});
