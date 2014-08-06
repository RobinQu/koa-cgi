var xtream = require("xtream"),
    Buffer = require("buffer").Buffer,
    debug = require("debug")("cgi:stream"),
    statusExp = /^Status:\s*(\d{3}) (.*)$/i;

module.exports = xtream.through.ctor(function(chunk, enc, callback) {
  var i, c, s, m, idx, buf;
  //reset two internals
  this.buffer = this.buffer || [];
  this.line = this.line || [];
  if(this.hasBody) {
    this.buffer.push(chunk);
    this.push(chunk);
  } else {
    for(i=0;i<chunk.length;i++) {
      c = chunk[i];
      if(c === 0xA) {
        if(!this.line.length) {//meet body
          this.hasBody = true;
          buf = chunk.slice(i+1);
          this.buffer.push(buf);
          this.push(buf);
          break;
        }
        
        s = this.line.join("");
        this.line = [];
        if(!this.statusCode) {//guess status code
          m = statusExp.exec(s);
          if(m) {
            this.statusCode = parseInt(m[1], 10);
            this.reason = m[2];
            this.emit("status", this.statusCode, this.reason);
            continue;
          }
        }
        
        idx = s.indexOf(":");
        if(!this.hasBody) {//got header
          this.emit("header", s.slice(0, idx), s.slice(idx+1).trim());
        }
      } else if(c !== 0xD) {//store chars for parsing
        this.line.push(String.fromCharCode(c));
      }
    }
    
  }
  callback();
}, function(callback) {
  debug("flush body");
  this.emit("body", Buffer.concat(this.buffer));
  callback();
});