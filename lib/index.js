var assert = require("assert"),
    debug = require("debug")("cgi:core"),
    path = require("path"),
    fs = require("fs"),
    CGIExecution = require("./cgi_execution");

var parseClientIP = function(ctx) {
  if(ctx.get("X-Client-IP")) {
    return ctx.get("X-Client-IP");
  }
  var forwardStr = ctx.get("X-Forwarded-For");
  if(forwardStr) {
    return forwardStr.split(",")[0].trim();
  }
  return ctx.req.connection.remoteAddress;
};

module.exports = function(options) {
  options = options || {};
  assert(options.root, "should provide document root");
  //bin path
  options.cgi = options.cgi || "php-cgi";
  options.extension = options.extension || ".php";

  var execution = new CGIExecution(options.cgi);
  execution.stderr = options.stderr;
  
  return function*cgi(next) {
    var scriptPath,
        host = (this.get("host") || "").split(":"),
        ctx = this,
        env, resp;
    
    
    //Let's guess which script to execute with cgi bin 
    if(options.script) {// `options.script` is optional. However, if it's given, all cgi requests will be executed against this gateway script
      scriptPath = path.normalize(path.join(options.root, options.script));
    } else {
      scriptPath = path.normalize(path.join(options.root, ctx.path));
      if(fs.existsSync(scriptPath)) {
        if(fs.statsSync(scriptPath).isDirectory()) {//it's a dir
          scriptPath = path.join(scriptPath, "index" + options.extension);
        }
      } else {//if the gussed path is not valid and `options.script` is not given, we should give up
        return yield next;
      }
      
    }
    
    env = {
      SERVER_ROOT: options.root,
      DOCUMENT_ROOT: options.root,
      SERVER_NAME: host[0],
      SERVER_PORT: host[1] || 80,
      HTTPS: ctx.req.connection.encrypted ? "On" : "Off",
      REDIRECT_STATUS: 200,

      SCRIPT_NAME: options.script,
      REQUEST_URI: ctx.url,
      SCRIPT_FILENAME: scriptPath,
      PATH_TRANSLATED: scriptPath,
      REQUEST_METHOD: ctx.method,
      QUERY_STRING: ctx.querystring || "",
      GATEWAY_INTERFACE: "CGI/1.1",
      SERVER_PROTOCOL: "HTTP/1.1",
      PATH: process.env.PATH,
      "__proto__": options.env || {},
      REMOTE_ADDR: parseClientIP(ctx)
    };
    
    console.log(env.REMOTE_ADDR);
    
    // expose request headers
    Object.keys(ctx.req.headers).forEach(function(header) {
      var name = "HTTP_" + header.toUpperCase().replace(/-/g, "_");
      env[name] = ctx.get(header);
    });
    
    if (ctx.get("content-length")) {
        env.CONTENT_LENGTH = ctx.get("content-length");
    }

    if (ctx.get("content-type")) {
        env.CONTENT_TYPE = ctx.get("content-type");
    }
    debug("exec %s", ctx.url);
    //will throw if cgi returns non-zero
    resp = yield execution.run.bind(execution, env, ctx.req);
    debug("returns %s, exit %s, status %s", ctx.url, resp.exit, resp.status);
    ctx.body = resp.body;
    ctx.status = resp.status;
    ctx.set(resp.headers);
    
    //give other friends a chance
    yield next;
  };
};