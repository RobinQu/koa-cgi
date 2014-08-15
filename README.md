# koa-cgi

Middleware to embbed CGI scripts like PHP

[![NPM](https://nodei.co/npm/koa-cgi.png)](https://nodei.co/npm/koa-cgi/)

## TL; DR

```
var app = require("koa")(),
	cgi = require("koa-cgi");

app.use(cgi({
	//Document root
	root: "./php-app-root/",
	//Gateway script, optional
	script: "index.php",
	//cgi bin to execute, optional
	cgi: "php-cgi",
	//stderr to which cgi bin is piped, optional
	stderr: process.stderr
}));

app.listen(9000);
```

Now you can visit pages in the php app that lives in `./php-app-root`.


## Configuration

See `options` at [cgi-run](https://github.com/RobinQu/cgi-run)

## License

MIT