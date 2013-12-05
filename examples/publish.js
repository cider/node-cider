// Get Cider client socket factory.
var socket = require('cider').socket;

if (process.argv.length != 4) {
  process.stderr.write('Usage: node publish.js <event-type:string> <event-body:json>\n');
  process.exit(2);
}

var eventType = process.argv[2]
  , eventBody = JSON.parse(process.argv[3]);

// Create a new client socket using ZeroMQ as transport, set the identity.
var sock = socket('zmq').setIdentity('publisher');

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
    process.stderr.write(err);
    sock.close();
    process.exit(1);
  });

  // Sent the event to the broker.
  sock.publish(eventType, eventBody);

  // Disconnect once the event is published.
  sock.close();
});
