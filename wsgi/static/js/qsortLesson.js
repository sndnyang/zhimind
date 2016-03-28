var lessonCompleted = {
    lesson1Solution: 'setName(\'Your name\')',
    lesson1: function () {
     return !!data.name;
    },

    lesson2Solution: 'print_list()',
    lesson2: function (input, output) {
     return (input === "print_list()");
    },

    lesson3Solution: 'k = v[0]',
    lesson3: function (input, output) {
     return (output === v[0]);
    },

    lesson4Solution: 'l = 0',
    lesson4: function (input, output) {
     return (output === 0);
    },

    lesson5Solution: 'var count=0;\nfor (var i in v) {\nif(v[i] < k) {\ncount += 1;\n}\n}\n;count',
    lesson5: function (input, output) {
     var k = v[0], count = 0;
     for (var i in v) {
         if (v[i] < k) {
             count += 1;
         }
     }
     return (output === count);
    },

    lesson6Solution: '空',
    lesson6: function (input, output) {
     return true;
    },

    lesson7Solution: '自己想去',
    lesson7: function (input, output) {
     if (!global_l) return false;

     var len = nodes.length;
     //var list = new Array();
     //for (var i = 0; i < len; i++) {
     //    list.push(nodes[i].label);
     //}

     var k = v[global_l];
     for (var i = 0; i < len; i++) {
         if (i < global_l) {
             if (v[i] >= k) {
                 return false;
             }
         }
         if (i > global_l) { 
             if (v[i] < k) {
                 return false;
             }
         }
     }

     return true;
    }
}
