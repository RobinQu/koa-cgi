var debug = require("debug")("cgi:core"),
    Runner = require("cgi-run").Runner;

module.exports = function(options) {
  
  var runner = new Runner(options);
  
  return function*cgi(next) {
    var ctx = this,
        resp;
    
    debug("exec %s", ctx.url);
    resp = yield runner.run.bind(runner, ctx.req);
    if(resp) {
      debug("returns %s, exit %s, status %s", ctx.url, resp.exit, resp.status);
      ctx.body = resp.body;
      ctx.status = resp.status;
      ctx.set(resp.headers);
    }
    
    //give other friends a chance
    yield next;
  };
};