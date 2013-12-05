// Get Cider client socket factory.
var socket = require('cider').socket
  , spawn  = require('child_process').spawn;

if (process.argv.length != 2) {
  process.stderr.write('Usage: node export_bash.js');
  process.exit(2);
}

// Create a new client socket using ZeroMQ as transport, set the identity.
var sock = cider.socket('zmq').setIdentity('bash-exporter');

// Close the socket on signal.
process.on('SIGINT',  sock.close);
process.on('SIGTERM', sock.close);
process.on('SIGQUIT', sock.close);

// Connect to the broker. If no options are provided, the configuration
// is loaded from the environment. An exception is thrown when the required
// environmental variables are not set.
sock.connect(function(err) {
  if (err != null) {
    process.stderr.write(err);
    sock.close();
    process.exit(1);
  }

  sock.on('error', function(err) {
    process.stdout.write(err);
    sock.close();
    process.exit(1);
  });

  // Export callback as 'bash' method.
  sock.export('bash', function(req) {
    req.signalProgress();

    if (req.args.src === undefined) {
      req.resolve(2, 'src argument missing');
      return;
    }

    // Spawn a new Bash process with the relevant source code.
    var bash = spawn('/bin/bash', ['-c', req.args.src]);

    // Forward stderr, stdout and the exit code.
    bash.stdout.on('data', req.stdout.write);
    bash.stderr.on('data', req.stderr.write);
    bash.on('close', function(code) {
      req.resolve(code);
    });

    // If the request is interrupted from the other end,
    // signal the Bash process.
    req.on('interrupt', function() {
      bash.kill('SIGINT');
    });
  });
});
