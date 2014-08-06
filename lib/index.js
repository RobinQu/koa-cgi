var assert = require("assert"),
    // url = require("url"),
    path = require("path"),
    CGIExecution = require("./cgi_execution");


module.exports = function(options) {
  options = options || {};
  assert(options.root, "should provide document root");
  assert(options.script, "should provide script path");
  //bin path
  options.cgi = options.cgi || "php-cgi";
  
  
  var execution = new CGIExecution(options.cgi);
  execution.stderr = options.stderr;
  
  return function*cgi(next) {
    var scriptPath = path.normalize(path.join(options.root, scriptPath)),
        host = (this.get("host") || "").split(":"),
        ctx = this,
        env, resp;
    
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
      //TODO: reflect the actual IP
      REMOTE_ADDR: "127.0.0.1"
    };
    
    // expose request headers
    Object.keys(ctx.req.header).forEach(function(header) {
      var name = "HTTP_" + header.toUpperCase().replace(/-/g, "_");
      env[name] = ctx.get(header);
    });
    
    if (ctx.get("content-length")) {
        env.CONTENT_LENGTH = ctx.get("content-length");
    }

    if (ctx.get("content-type")) {
        env.CONTENT_TYPE = ctx.get("content-type");
    }
    
    //will throw if cgi returns non-zero
    resp = yield execution.run(env, ctx);
    ctx.body = resp.body;
    ctx.status = resp.status;
    ctx.set(resp.headers);

    //give other friends a chance
    yield next;
  };
};