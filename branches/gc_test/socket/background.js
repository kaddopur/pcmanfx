chrome.runtime.sendMessage({action: "wake"}, function(response) {
    if(response) // The socket page is loaded
        return;
    chrome.app.window.create('socket.htm', {
        id: 'socket',
        hidden : true
    }, function(socket) {
    });
});

chrome.app.runtime.onLaunched.addListener(function() {
    chrome.app.window.create('options.htm', {
        width: 300,
        height: 200
    }, function(options) {
    });
});