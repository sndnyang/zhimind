var nodes = null;
var edges = null;
var options = {
    layout: {
        hierarchical:{
            direction: 'UD'
        }
    }
};
var watch;

var network = null;
var stepLog = new Array();
var v = new Array();
var index = 0;
var global_l = null;
var global_k = null;

function print_list() {
    v = new Array();
    var len = nodes.length;
    for (var i = 0; i < len; i++) {
        v.push(nodes[i].label);
    }
   
    return v;
}

function swap_label(i, j) {

    var label = nodes[j].label;
    nodes[j].label = nodes[i].label;
    nodes[i].label = label;

    updateData(); 
}

function swap(a, i, j) {
    var t = a[i];
    a[i] = a[j];
    a[j] = t;

    swap_label(i, j);
}

function execute() {
    var code = document.getElementById('code').value;
    var obj;
    /* jslint evil:true */
    obj = eval("({next:function() {" + code + "}})");
    console.log("Code is", obj);
    obj.next();
}

function initNetwork() {
    // create a network
    var container = document.getElementById('datastruct');
    var data = {
        nodes: nodes,
        edges: edges
    };

    network = new vis.Network(container, data, options);
}

function next() {
    if (stepLog.length == 0) {
        alert("步骤长度为0， 应该尚未执行算法");
        return -1;
    }

    if (stepLog.length == index) {
        alert("执行完毕");
        return -1;
    }

    var step = stepLog[index];
        i = step.p, 
        j = step.q;

    markNodes([i, j]);

    if (step.swap == true) {
        swap_label(i, j);
    }

    index++;
    return 0;
}

function generateStepLog() {
    stepLog = new Array();
    var len = nodes.length;

    var v = new Array();

    for (var i = 0; i < len; i++) {
        v.push(nodes[i].label);
    }
   
    procedure(v);

  //console.log('log size ' + stepLog.length);
}

function timenext() {
    watch = setTimeout(function() {
        var t = next();
        if (t != -1) {
            timenext();
        }
    }, 500);
}

function stopnext() {
    clearTimeout(watch);
}

function start() {
    generateStepLog();
    index = 0;
    timenext();
}

