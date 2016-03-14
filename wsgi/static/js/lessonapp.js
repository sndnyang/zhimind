/* global requirejs */

require.config({
    urlArgs: "bust=" + (new Date()).getTime(),
    paths: {
        jquery: 'http://cdn.bootcss.com/jquery/2.1.4/jquery.min'
	}
});

var all=[];
require.onResourceLoad = function (context, map, depArray) {
    all.push(map.name);    
};

function end(){
    console.log("--------------------------- END requirejs:");
    all.map(function(item){
        require.undef(item);
    });
};


require(['console', 'lessons']);
