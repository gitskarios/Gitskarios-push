//@author Sagar Karandikar
//@web    http://sagark.org/snapnotify/
//@about  Node.js server for SnapNotify

var http = require('http');
var gcm = require('node-gcm');

//liveness checker for heroku (prevent idle)
function liveness(){
    //here, we want to post to ourselves to prevent heroku idle
    var opts = {
        host: url,
        port: 80,
        path: '/liveness',
        method: 'POST'
    };
    var req = http.request(opts, function(res) {
        //do nothing
    });
    req.on('error', function(e) {
        console.log('problem with request: ' + e.message);
    });
    req.end();
}

if (settings.heroku){
    console.log('running in heroku mode');
    var port = process.env.PORT;
    console.log("started liveness checker for heroku");
    setInterval(liveness, 60*20*1000); //keep server alive on heroku
} else {
    console.log('running in "Own Server" mode');
    var port = 1337;
    console.log('not starting liveness checker');
}

//more common vars
var urlport = url + ":" + port;

http.createServer(function (req, res) {
    switch(req.url) { 
        case '/':
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.end('Welcome to snapnotify-server! Your server is now running at: ' + urlport + '\n');
            break;
        case '/message':
            if (req.method == 'POST') {
                console.log('posted');
                recstr = "";
                req.on('data', function(chunk) {
                    recstr += chunk.toString();
                });

                req.on('end', function() {
                    var jsonObject = JSON.parse(recstr);

                    if (jsonObject.hook_id && jsonObject.repository) {
                        console.log(jsonObject.zen);
                        console.log(jsonObject.repository.full_name);
                        res.writeHead(200, "OK", {'Content-Type': 'text/html'});
                        res.end();
                    } else {
                        send_push = false;

                        data_object = {};
                        data_object.push_type = null;
                        data_object.repository_id = -1;
                        data_object.repository_name = "";
                        
                        if (jsonObject.action && jsonObject.issue) {
                            data_object.push_type = "issue";
                            send_push = true;
                        }

                        if (jsonObject.repository) {
                            data_object.repository_id = jsonObject.repository.id;
                            data_object.repository_name = jsonObject.repository.full_name;
                        }

                        if (send_push) {
                            res.writeHead(201, "OK", {'Content-Type': 'text/html'});
                            res.end();
                            var sender = new gcm.Sender(settings.apikey);

                            var message = new gcm.Message();

                            message.addData('key1', 'msg1');

                            topic = '/topcis/' + data_object.repository_name;

                            sender.sendNoRetry(message, { topic:  }, function (err, response) {
                                if(err) console.error(err);
                                else    console.log(response);
                            });
                        } else {    
                            res.writeHead(200, "OK", {'Content-Type': 'text/html'});
                            res.end();
                        }
                    }
                });
            } else {
                console.log("Uh oh, you should have used a POST.");
            }
            break;
    };
}).listen(port, '0.0.0.0');
console.log('Server running at: ' + urlport);
