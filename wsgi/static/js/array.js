var nodes = null;
var edges = null;
var network = null;
var stepLog = new Array();
var v = new Array();
var index = 0;
var global_l = null;
var global_k = null;

function print_list() {
    var len = nodes.length;
    
    return v;
}

function swap(a, i, j) {
    var t = a[i];
    a[i] = a[j];
    a[j] = t;
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
    var options = {
        layout: {
            hierarchical:{
                direction: 'UD'
            }//,
                         //physics: {hierarchicalRepulsion: {springConstant: 0}
        }};//physics:{barnesHut:{gravitationalConstant:-4000}}};
    network = new vis.Network(container, data, options);
}

function next() {
    if (stepLog.length == 0) {
        alert("步骤长度为0， 应该尚未执行算法");
        return;
    }

    if (stepLog.length == index) {
        alert("执行完毕");
        return;
    }

    var step = stepLog[index];
    var j = step.index;

    markNodes([j-1, j]);

    if (step.swap == true) {
        var label = nodes[j].label;
        nodes[j].label = nodes[j-1].label;
        nodes[j-1].label = label;
    }

    updateData(); 
    index++;
}

function start() {
    var len = nodes.length;

    var v = new Array();

    for (var i = 0; i < len; i++) {
        v.push(nodes[i].label);
    }

    var type = $("#algo option:selected").val();

    var map = {'bubble': bubblesort,
                'quick': qsort,
                'merge': mergesort,
                'select': selectsort}
    
    map['bubble'](v);

  //console.log('log size ' + stepLog.length);
  //console.log(v);

    index = 0;
}

function draw() {
    var len = document.getElementById('lenth').value;
    nodes = new Array();

    for (var i = 0; i < len; i++) {
        var node = {id: i+1,  font: {size: 10}, 
            fixed: {x: true, y: true }, 
            label: Math.floor(Math.random()*100), 
            shape: 'square', 
            color: 'orange'
        };
        nodes.push(node);
    }
    for (var i = 0; i < len; i++) {
        v.push(nodes[i].label);
    }
    edges = [];
    initNetwork();
}
