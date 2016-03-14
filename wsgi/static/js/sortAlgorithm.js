
var k = null;
var l = null;

function bubblesort(v) {
    len = v.length;

    for (var i = 0; i < len; i++) {
        for (var j = 1; j < len-i; j++) {
            var step = {index:j};
            if (v[j] < v[j-1]) {
                step.swap = true;
                var tmp = v[j];
                v[j] = v[j-1];
                v[j-1] = tmp;
            }
            else {
                step.swap = false
            }
            stepLog.push(step);
        }
    }
}

function qsort(v) {
    len = v.length;

    for (var i = 0; i < len; i++) {
        for (var j = 1; j < len-i; j++) {
            var step = {index:j};
            if (v[j] < v[j-1]) {
                step.swap = true;
                var tmp = v[j];
                v[j] = v[j-1];
                v[j-1] = tmp;
            }
            else {
                step.swap = false
            }
            stepLog.push(step);
        }
    }
}

function selectsort(v) {
    len = v.length;

    for (var i = 0; i < len; i++) {
        for (var j = 1; j < len-i; j++) {
            var step = {index:j};
            if (v[j] < v[j-1]) {
                step.swap = true;
                var tmp = v[j];
                v[j] = v[j-1];
                v[j-1] = tmp;
            }
            else {
                step.swap = false
            }
            stepLog.push(step);
        }
    }
}

function partition_std(a, l, h, type) {

    var i = l-1;
    var k =a[l];
    for (var j in a) {


    }

    return i+1;
}

function mergesort(v) {
    len = v.length;

    for (var i = 0; i < len; i++) {
        for (var j = 1; j < len-i; j++) {
            var step = {index:j};
            if (v[j] < v[j-1]) {
                step.swap = true;
                var tmp = v[j];
                v[j] = v[j-1];
                v[j-1] = tmp;
            }
            else {
                step.swap = false
            }
            stepLog.push(step);
        }
    }
}
