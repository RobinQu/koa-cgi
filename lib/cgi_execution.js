var spawn = require("child_process").spawn,
    debug = require("debug")("cgi:exec"),
    CGIStream = require("./cgi_stream");

var CGIExecution = function(cgi, options) {
  options = options || {};
  this.cgi = cgi;
  this.stderr = options.stderr;
};

CGIExecution.prototype.run = function(env, stdin, cb) {
  var self = this, done, error, child, parser, 
      resp = {
        headers:{}
      };
  
  if(typeof stdin === "function") {
    cb = stdin;
    stdin = null;
  }
  
  done = function() {
    if (resp.exit === undefined) {
      return;
    }
    if (resp.exit && !resp.body) {
      error(500, self.cgi + " exited with code " + resp.exit);
    }
    else {
      cb(null, resp);
    }
  };

  error = function(code, reason) {
    debug("error %s", code);
    if(code instanceof Error) {
      cb(code);
    } else {
      var ex = new Error(reason);
      ex.status = code;
      cb(ex);
    }
  };
  
  debug("spawn %s", self.cgi);
  child = spawn(self.cgi, [], {
    "env": env
  }).on("exit", function(code) {
    resp.exit = code;
    done();
  });
  
  parser = new CGIStream();
  parser.on("error", error);
  parser.on("status", function(status) {
    resp.status = status;
  });
  parser.on("header", function(key, value) {
    resp.headers[key] = value;
  });
  parser.on("body", function(httpBody) {
    resp.body = httpBody;
    resp.status = resp.status || 200;
    done();
  });
  
  child.stdout.pipe(parser);

  if(stdin) {
    stdin.pipe(child.stdin);
  }
  if(self.stderr) {
    child.stderr.pipe(self.stderr);
  }
};

module.exports = CGIExecution;