// Get Cider client socket factory.
var socket = require('cider').socket;

if (process.argv.length != 4) {
  process.stderr.write('Usage: node request.js <method:string> <args:json>');
  process.exit(2);
}

var method = process.argv[2]
  , args   = JSON.parse(process.argv[3]);

// The same thing is happening if no options are passed into socket.connect,
// but let's see how to pass the options explicitly.
var rpcEndpoint = process.env.CIDER_ZMQ_RPC_ENDPOINT
  , evtEndpoint = process.env.CIDER_ZMQ_EVT_ENDPOINT;

if (rpcEndpoint == undefined || evtEndpoint == undefined)
  throw new Error('You forgot to set up the environment, dude');

// Create a new client socket using ZeroMQ as transport, set the identity.
var sock = socket('zmq').setIdentity('requester');

// Close the socket on signal.
process.on('SIGINT',  sock.close);
process.on('SIGTERM', sock.close);
process.on('SIGQUIT', sock.close);

// Connect to the broker, passing the required endpoints explicitly.
sock.connect({
  rpcEndpoint: rpcEndpoint,
  evtEndpoint: evtEndpoint
}, function(err) {
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

  // Create the request object.
  var req = sock.request(method, args);

  // Progress signaled from the remote end.
  req.on('progress', function(state) {
    console.log('Remote request handler started\n');
    console.log('>>>>> Output');
  });

  // Stdout frame has arrived.
  req.stdout.on('frame', function(seq,  frame) {
    console.log(frame.toString());
  });

  // Stderr frame has arrived.
  req.stderr.on('frame', function(seq,  frame) {
    console.log(frame.toString());
  });

  // The reply has arrived.
  req.on('reply', function(code, value) {
    console.log('<<<<< Output\n');
    console.log('Exit code:', code);
    sock.close();
  });

  // Send the request.
  req.send();
});
