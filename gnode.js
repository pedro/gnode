require.paths.unshift('vendor/node-compress')

var sys     = require('sys'),
  fs        = require('fs'),
  path      = require('path'),
  spawn     = require('child_process').spawn,
  http      = require('http'),
  url       = require('url'),
  compress  = require('compress'),
  Buffer    = require('buffer').Buffer

Gnode = module.exports = {
  action: function(req) {
    sys.puts('--- got req for ' + req.url)
    switch(req.method) {
      case 'POST':
        return (
          this.respondRpc(req, /(.*?)\/git-upload-pack$/i,  'upload-pack') ||
          this.respondRpc(req, /(.*?)\/git-receive-pack$/i, 'receive-pack') ||
          this.respondNotFound
        )
      case 'GET':
        return (
          this.respondInfoRef(req) || 
          this.respondNotFound
        )
      default:
        return this.respondNotAllowed
    }
  },

  respondRpc: function(req, regexp, cmd) {
    match = regexp.exec(req.url)
    if (!match) return

    compressed = (req.headers['content-encoding'] == 'gzip')
    sys.puts('    responding with rpc for ' + cmd)

    if (compressed) {
      sys.puts('    compressed request')
      req.setBodyEncoding('binary')
    }
    return function(res) {
      res.writeHead(200, {'Content-Type': 'application/x-git-' + cmd + '-result'})

      git = spawn(Gnode.git, [cmd, '--stateless-rpc', Gnode.path])
      git.stdout.addListener('data', function(d) {
        res.write(d)
      })
      git.stderr.addListener('data', function(d) {
        sys.puts('error: ' + d)
      })
      git.addListener('exit', function(code) {
        res.end()
      })

      body = ''
      req.addListener('data', function(chunk) {
        body += chunk
      })
      req.addListener('end', function() {
        if (compressed)
          body = Gnode.deflate(body)
        git.stdin.write(body)
        git.stdin.end()
      })
    }
  },

  respondInfoRef: function(req) {
    reqUrl = url.parse(req.url, true)
    match = /(.*?)\/info\/refs$/.exec(reqUrl.pathname)
    if (!match) return
    sys.puts('    responding with info ref')

    if (reqUrl.query && reqUrl.query.service) {
      service = reqUrl.query.service.replace('git-', '')
      return function(res) {
        Gnode.noCache(res, service)
        res.write(Gnode.pktWrite('# service=git-' + service + '\n'))
        res.write(Gnode.pktFlush())

        git = spawn(Gnode.git, [service, '--stateless-rpc', '--advertise-refs', Gnode.path])
        git.stdout.addListener('data', function(d) {
          res.write(d)
        })
        git.addListener('exit', function(code) {
          res.end()
        })
      }
    }
    // dumb info refs
    else {
      sys.puts("    dumb info ref")
      spawn('git update-server-info')
      return this.sendFile(match[0], 'text/plain; charset=utf-8')
    }
  },

  sendFile: function(file, contentType) {
    file = Gnode.path + file
    sys.puts('    sendfile called for ' + file)
    path.exists(file, function(exists) {
      if (!exists)
        return Gnode.respondNotFound
      else {
        return function(res) {
          fs.stat(file, function(err, stats) {
            res.writeHead(200, {'Content-Type': contentType})
            sys.puts(sys.inspect(stats))
            res.end()
          })
        }
      }
    })
  },

  noCache: function(res, service) {
    res.writeHead(200, {
      'Content-Type'  : 'application/x-git-' + service + '-advertisement',
      'Expires'       : 'Fri, 01 Jan 1980 00:00:00 GMT',
      'Pragma'        : 'no-cache',
      'Cache-Control' : 'no-cache, max-age=0, must-revalidate'
    })
  },

  respondNotAllowed: function(res) {
    res.writeHead(405, {'Content-Type': 'text/plain'})
    res.end('Not allowed')
  },

  respondNotFound: function(res) {
    res.writeHead(404, {'Content-Type': 'text/plain'})
    res.end('Not found')
  },

  pktFlush: function() {
    return '0000'
  },

  pktWrite: function(str) {
    hex = this.toHex(str.length + 4)
    return hex.rjust(4, '0') + str
  },

  toHex: function(n) {
    var r = n % 16
    var result
    if (n-r == 0) 
        result = this.toHexChar(r)
    else 
        result = this.toHex((n-r)/16) + this.toHexChar(r)
    return result;
  },

  toHexChar: function(n) {
    const alpha = "0123456789abcdef"
    return alpha.charAt(n)
  },

  deflate: function(data) {
    var gunzip = new compress.Gunzip;
    gunzip.init()
    uncompressed = gunzip.inflate(data, 'binary')
    gunzip.end()
    return uncompressed
  },

  run: function(options) {
    this.port = parseInt(options.port || 8000)
    this.path = options.path || process.cwd()
    this.git  = options.git || 'git'

    http.createServer(function (req, res) {
      action = Gnode.action(req)
      action(res)
    }).listen(this.port)

    sys.puts('Gnode running on http://0.0.0.0:' + this.port)
    sys.puts('Serving ' + this.path)
  }
}

// helpers
String.prototype.repeat = function(num) {
  return new Array( num + 1 ).join(this);
}

String.prototype.rjust = function(width, padding) {
  padding = padding || " ";
  padding = padding.substr( 0, 1 );
  if( this.length < width )
    return padding.repeat( width - this.length ) + this;
  else
    return this;
}
