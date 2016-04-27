var nodes = [];
var edges = [];
var nodeSet = null;
var edgeSet = null;
var data = null;
var structure = null;

var watch;

var network = null;
var stepLog = [];
var v = [];
var index = 0;
var global_l = null;
var global_k = null;

function print_list() {
    v = [];
    for (var i = 0; i < nodes.length; i++) {
        console.log(i);
        v.push(nodes[i].label);
    }
   
    return v;
}

function swap_label(i, j) {

    var t = nodes[i-1].label;
    nodes[i-1].label = nodes[j-1].label;
    nodes[j-1].label = t;
    var node_list = [
        {id: i, label: nodes[i-1].label},
        {id: j, label: nodes[j-1].label}
    ];

    nodeSet.update(node_list);
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
        i = step.p + 1,
        j = step.q + 1;

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

