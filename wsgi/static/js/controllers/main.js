/*global angular, d3, alert, FileReader, Blob*/
'use strict';

var module = angular.module('controller', []);

module.controller('MainCtrl', function ($scope, $http, $compile) {

    $scope.root = null;
    $scope.fileName = "mindMap";
    $scope.current_node = null;
    $scope.select_node = null;

    $scope.init = function (data) {
        var url = "/static/data/data.json";
        if (data !== "index") {
            url = "/loadmap/" + data;
        }

        d3.json(url, function (error, json) {
            if (error) {
                alert('遇到问题了');
            }
            if (json.error === 'not exist') {
                alert('该导图不存在，返回');
                window.history.back(-1);
                return;
            }
            $scope.json = json;
            $scope.$apply();
        });
    };

    function serializeData(source) {
        var json = {},
            children = source.children || source._children,
            childList = [];
        json.name = source.name;

        if (children) {
            children.forEach(function (node) {
                childList.push(serializeData(node));
            });
            json.children = childList;
        }
        json.show = false;
        return json;
    }


    $scope.keyup = function (keyCode) {
        switch (keyCode) {
        case 33:
        case 38:
            break;
        case 13:
        case 34:
        case 40:
            break;
        case 37:
            break;
        case 39:
            break;
        case 45:
            break;
        case 46:
            break;
        case 27:
            break;
        case 83:
            break;
        }
        return false;
    };

    $scope.create = function () {
        $scope.json = {
            "name" : "root"
        };
    };

    $scope.load = function (file) {
        var reader = new FileReader();
        reader.onload = function (event) {
            var contents = event.target.result;
            //console.log(JSON.parse(contents));
            $scope.json = JSON.parse(contents);
            $scope.$apply();
        };
        reader.readAsText(file);
    };

    $scope.save = function () {
        var saveData = serializeData($scope.root),
            MIME_TYPE = 'application/json',
            jsonData = JSON.stringify({'title': $scope.root.name, 'data': saveData}),
            bb = new Blob([jsonData], {type: MIME_TYPE}),
            a = document.createElement('a');
        
        a.download = $scope.fileName + ".json";
        a.href = window.URL.createObjectURL(bb);
        a.textContent = '点击下载';

        a.dataset.downloadurl = [MIME_TYPE, a.download, a.href].join(':');
        document.querySelectorAll("#downloadLinkWrap")[0].innerHTML = "";
        document.querySelectorAll("#downloadLinkWrap")[0].appendChild(a);

        $http.post('/save', jsonData).success(function (data) {
            $scope.msg = 'Data saved';
            alert("success message:" + data);
        }).error(function (data) {
            alert("failure message:" + data);
        });
    };
});

module.directive('mindMap', function ($compile) {
    return {
        link: function (scope, element) {
            var eleW = element[0].clientWidth,
                eleH = element[0].clientHeight,
                m = [20, 40, 20, 120],
                w = eleW - m[1] - m[3],
                r = Math.min(eleW, eleH),
                x = d3.scale.linear().range([0, r]),
                y = d3.scale.linear().range([0, r]),
                h = eleH - m[0] - m[2],
                i = 0,
                root,
                tree = d3.layout.tree().size([h, w]),
                diagonal = d3.svg.diagonal().projection(function (d) { return [d.y, d.x]; }),
                toolTip = d3.select(element[0])
                    .append("div")
                    .attr("id", "myToolTip")
                    .attr("class", "tooltip")
                    //.style("position", "absolute")
                    .style("z-index", "10")
                    .style("visibility", "hiden"),
                vis = d3.select(element[0]).append("svg")
                    .attr("width", w + m[1] + m[3])
                    .attr("height", h + m[0] + m[2])
                    .append("g")
                    .attr("class", "outer")
                    .attr("transform", "translate(" + m[3] + "," + m[0] + ")"),
                linkSvg = vis.append("g").attr("class", "linkContainer");
            
            // Toggle children.
            function toggle(d) {
                if (d.children) {
                    d._children = d.children;
                    d.children = null;
                } else {
                    d.children = d._children;
                    //d._children = null;
                }
            }

            function toggleAll(d) {
                if (d.children) {
                    d.children.forEach(toggleAll);
                    toggle(d);
                }
            }

            function showToolTip(d) {

                scope.current_node = d;

                toolTip.html('<a href="#" style="cursor:pointer">test</a><table id="toolTipTable">');

                for (var i in d.link) {
                    var name = d.link[i]['name'],
                        url = d.link[i]['url'],
                        text = '<td><button ng-click=\'deleteLink('+i+')\'>-'+
                            '</button></td>',
                        a = angular.element('<td class="tdlink"><a class="'
                                + 'link" href="' + url + '" target="_blank">'
                            +name +' </a></td>'),
                        tr = angular.element('<tr></tr>').append(a)
                            .append($compile(text)(scope));

                    angular.element(document.getElementById('toolTipTable'))
                        .append(tr);
                }

                if (d.link && d.link.length) {
                    toolTip.transition().duration(300)
                        .style("opacity", 1)
                        .style("left", (d3.event.pageX+10) + "px")
                        .style("top", (d3.event.pageY - 3*d.link.length) + "px")
                        .style("visibility", "visible")
                        ;
                }
            }
            
            scope.deleteLink = function (i) {
                var d = scope.current_node;
                d.link.splice(i, 1);
                showToolTip(scope.current_node);
            }
            
        function update(source) {
            if(!(source != null)){
                return;
            }

            // Compute the new tree layout.

            var nodes = tree.nodes(root).reverse();

            var deepest = 0,
                generationGutter = w;

            // Normalize for fixed-depth.
            nodes.forEach(function(d){
                if(deepest < d.depth){
                    deepest = d.depth;
                }			
            });

            generationGutter = Math.floor(w/(deepest+1));
            nodes.forEach(function(d) { d.y = d.depth * generationGutter; });

            // Update the nodes…
            var node = vis.selectAll("g.node")
                .data(nodes, function(d) {
                    return d.id || (d.id = ++i);
                });

          //d3.select("body").on("click", function() {
          //    toolTip.style("opacity", "0");
          //})


            // Enter any new nodes at the parent's previous position.
            var nodeEnter = node.enter().append("g")
                .attr("class", "node")
                .attr("id", function(d) {return "node"+d.id})
                .on("click", function(d) { 			      	
                })
                .on("dblclick", function(d) {
                    toggle(d);
                    update(d);
                    //centerNode(d);

                })
                .on("mouseover", function(d, i){
                    showToolTip(d);
                    d3.select(this).style('stroke-width','10px')
                })
                .on("mouseout", function(d){
                 // toolTip.transition().duration(500).style("opacity", 0);
                })
                .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
                ;

            //inject content to node
            InjectNodeContent(nodeEnter);

            var duration = 500;
            // Transition nodes to their new position.
            var nodeUpdate = node.transition()
                .duration(duration)
                .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

            nodeUpdate.selectAll("circle")
                .attr("r", function(d) { return computeRadius(d); })
                .style("fill", function(d) {
                    if (typeof(d.level) == "undefined") {
                        d.level = 0;
                    }
                    var white = d3.rgb(255, 255, 255);
                    var red   = d3.rgb(255, 0,   0);
                    var compute = d3.interpolate(white, red);
                    return compute(d.level / 8.0);
                });

            nodeUpdate.select("text")
                .text(function(d) { return d.name; })
                .style("fill-opacity", 1);

            // Transition exiting nodes to the parent's new position.
            var nodeExit = node.exit().transition()
                .duration(duration)
                .attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
                .remove();

            nodeExit.select("circle").attr("r", 1e-6);
            nodeExit.select("text").style("fill-opacity", 1e-6);


            // Update the links…
            var link = vis.selectAll("path.link")
                .data(tree.links(nodes), function(d) { return d.target.id; });

            // Enter any new links at the parent's previous position.
            link.enter().insert("path", "g")
                .attr("class", "link")
                .attr("d", function(d) {
                    var o = {x: source.x0, y: source.y0};
                    return diagonal({source: o, target: o});
                })
            .transition()
                .duration(duration)
                .attr("d", diagonal);

            // Transition links to their new position.
            link.transition()
                .duration(duration)
                .attr("d", diagonal);

            // Transition exiting nodes to the parent's new position.
            link.exit().transition()
                .duration(duration)
                .attr("d", function(d) {
                    var o = {x: source.x, y: source.y};
                    return diagonal({source: o, target: o});
                })
            .remove();

            // Stash the old positions for transition.
            nodes.forEach(function(d) {
                d.x0 = d.x;
                d.y0 = d.y;
            });
        }
                
        scope.$watch('json', function () {
            if (scope.json === undefined || scope.json === null) {
                console.log("in")
                scope.json = {
                    "name" : "root"
                }
            }
            console.log(scope.json);
            root = scope.json;
            console.log(root);
            root.x0 = h / 2;
            root.y0 = 0;
            update(root);
            scope.root = root;
        });

        function computeRadius(d) {
            var radius = 20;
            if(d.children || d._children) return radius + (radius * nbEndNodes(d) / 10);
            else return radius;
        }

        function nbEndNodes(n) {
            var nb = 0;
            if(n.children){
                n.children.forEach(function(c){
                    nb += nbEndNodes(c);
                });
            }
            else if(n._children){
                n._children.forEach(function(c){
                    nb += nbEndNodes(c);
                });
            }
            else nb++;

            return nb;
        }

        function InjectNodeContent (nodeEnter) {
            nodeEnter.append("circle")			
                .attr("r", 1e-6)
                .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; })
                .classed("toggleCircle" , true)
              //.on("click", function(d) {
              //    if (scope.select_node != null) {
              //        d3.select(scope.select_node).style('stroke-width','1px');
              //    }
              //    scope.select_node = this;
              //    d3.select(this).style('stroke-width','3px');
              //})

                nodeEnter.append("text")
                .attr("x", function(d) {
                    var spacing = computeRadius(d) + 5;
                    return d.children || d._children ? -spacing : spacing;
                })
            .attr("y", function(d) {
                // var spacing = computeRadius(d) + 5;
                // return d.children || d._children ? -spacing : 0;
            })
            .attr("dy", ".35em")
                .attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
                .text(function(d) { return d.name; })
                .style("fill-opacity", 1e-6);

            addIcon(nodeEnter);
        }

        function addIcon(nodeEnter) {
            // Add btn icon
            nodeEnter.append("path")			
                .attr("d", "M12 24c-6.627 0-12-5.372-12-12s5.373-12 12-12c6.628 0 12 5.372 12 12s-5.372 12-12 12zM12 3c-4.97 0-9 4.030-9 9s4.030 9 9 9c4.971 0 9-4.030 9-9s-4.029-9-9-9zM13.5 18h-3v-4.5h-4.5v-3h4.5v-4.5h3v4.5h4.5v3h-4.5v4.5z")
                .attr("transform", function(d) {
                    var offset = (d.children || d._children) ? -70 : 0;
                    return "translate(" + offset + "," + computeRadius(d) + ")";
                })
            .classed("function-btn add" , true);

            nodeEnter.append("rect")
                .classed("function-bg add" , true)
                .attr("width" , "24px")
                .attr("height" , "24px")
                .attr("transform", function(d) {
                    var offset = (d.children || d._children) ? -70 : 0;
                    return "translate(" + offset + "," + computeRadius(d) + ")";
                })
            .on("click" , addNewNode);

            // Remove btn icon
            nodeEnter.append("path")			
                .attr("d", "M3.514 20.485c-4.686-4.686-4.686-12.284 0-16.97 4.688-4.686 12.284-4.686 16.972 0 4.686 4.686 4.686 12.284 0 16.97-4.688 4.687-12.284 4.687-16.972 0zM18.365 5.636c-3.516-3.515-9.214-3.515-12.728 0-3.516 3.515-3.516 9.213 0 12.728 3.514 3.515 9.213 3.515 12.728 0 3.514-3.515 3.514-9.213 0-12.728zM8.818 17.303l-2.121-2.122 3.182-3.182-3.182-3.182 2.121-2.122 3.182 3.182 3.182-3.182 2.121 2.122-3.182 3.182 3.182 3.182-2.121 2.122-3.182-3.182-3.182 3.182z")
                .attr("transform", function(d) {
                    var offset = (d.children || d._children) ? -40 : 30;
                    return "translate(" + offset + "," + computeRadius(d) + ")";			
                })
            .classed("function-btn remove" , true);

            nodeEnter.append("rect")
                .classed("function-bg remove" , true)
                .attr("width" , "24px")
                .attr("height" , "24px")
                .attr("transform", function(d) {
                    var offset = (d.children || d._children) ? -40 : 30;
                    return "translate(" + offset + "," + computeRadius(d) + ")";
                })
            .on("click" , removeNode);

            // Edit btn
            nodeEnter.append("path")			
                .attr("d", "M20.307 1.998c-0.839-0.462-3.15-1.601-4.658-1.913-1.566-0.325-3.897 5.79-4.638 5.817-1.202 0.043-0.146-4.175 0.996-5.902-1.782 1.19-4.948 2.788-5.689 4.625-1.432 3.551 2.654 9.942 0.474 10.309-0.68 0.114-2.562-4.407-3.051-5.787-1.381 2.64-0.341 5.111 0.801 8.198v0.192c-0.044 0.167-0.082 0.327-0.121 0.489h0.121v4.48c0 0.825 0.668 1.493 1.493 1.493 0.825 0 1.493-0.668 1.493-1.493v-4.527c2.787-0.314 4.098 0.6 6.007-3.020-1.165 0.482-3.491-0.987-3.009-1.68 0.97-1.396 4.935 0.079 7.462-4.211-4 1.066-4.473-0.462-4.511-1.019-0.080-1.154 3.999-0.542 5.858-2.146 1.078-0.93 2.37-3.133 0.97-3.905z")
                .attr("transform", function(d) {
                    var offset = (d.children || d._children) ? -10 : 60;
                    return "translate(" + offset + "," + computeRadius(d) + ")";
                })
            .classed("function-btn edit" , true);

            nodeEnter.append("rect")
                .classed("function-bg edit" , true)
                .attr("width" , "24px")
                .attr("height" , "24px")
                .attr("transform", function(d) {
                    var offset = (d.children || d._children) ? -10 : 60;
                    return "translate(" + offset + "," + computeRadius(d) + ")";
                })
            .on("click" , editNode);

            // Add link btn icon
            nodeEnter.append("path")			
                .attr("d", "M12 24c-6.627 0-12-5.372-12-12s5.373-12 12-12c6.628 0 12 5.372 12 12s-5.372 12-12 12zM12 3c-4.97 0-9 4.030-9 9s4.030 9 9 9c4.971 0 9-4.030 9-9s-4.029-9-9-9zM13.5 18h-3v-4.5h-4.5v-3h4.5v-4.5h3v4.5h4.5v3h-4.5v4.5z")
                .attr("transform", function(d) {
                    var offset = (d.children || d._children) ? 20 : 90;
                    return "translate(" + offset + "," + computeRadius(d) + ")";
                })
            .classed("function-btn addlink" , true);

            nodeEnter.append("rect")
                .classed("function-bg addlink" , true)
                .attr("width" , "24px")
                .attr("height" , "24px")
                .attr("transform", function(d) {
                    var offset = (d.children || d._children) ? 20 : 90;
                    return "translate(" + offset + "," + computeRadius(d) + ")";
                })
            .on("click" , addLink);

            function addLink(d){	    			

                var name = prompt("输入新属性");
                var url = prompt("输入新链接");

                if (name != null && url != null){
                    if (typeof(d.link) == "undefined") {
                        d.link = new Array();
                    }
                    var dict = {'name': name, 'url': url};
                    d.link.push(dict);
                }
                //update(d);
                //scope.root = root;	
            }

            function addNewNode (d){	    			
                var childList;
                if(d.children){
                    childList = d.children;
                }
                else if(d._children){	
                    childList = d.children = d._children;
                    d._children = null;
                }
                else{
                    childList = [];
                    d.children = childList;
                }	
                childList.push({	
                    "depth": d.depth + 1,
                    "name": "new Node",
                    "parent": d
                });	
                update(d);
                centerNode(d);
                scope.root = root;	
            }

            function removeNode (d){	
                var thisId = d.id;
                if(!d.parent){
                    alert("没法删除Root");
                    return;
                }
                d.parent.children.forEach(function(c , index){	
                    if(thisId === c.id){
                        d.parent.children.splice(index , 1);
                        return;
                    }
                });	
                update(d.parent);
                centerNode(d);
                scope.root = root;	
            }

            function editNode (d){	
                var name = prompt("输入新名称", d.name);
                if (name != null){
                    d.name = name;
                }
                if(!d.parent){
                    update(d);
                    centerNode(d);
                }
                update(d.parent);
                centerNode(d);
                scope.root = root;	
            }
        }

        function zoom(nodeEnter) {
            nodeEnter.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
        }

        var zoomListener = d3.behavior.zoom().scaleExtent([0.1, 3]).on("zoom", zoom);

        function centerNode(source) {
            var scale = zoomListener.scale();
            var x = -source.y0;
            var y = -source.x0;
            x = x * scale + eleW / 2;
            y = y * scale + eleH / 2;
            d3.select('g').transition()
                .duration(500)
                .attr("transform", "translate(" + x + "," + y + ")scale(" + scale + ")");
            zoomListener.scale(scale);
            zoomListener.translate([x, y]);
        }
        }
    }
});

module.directive('changeFile', function() {
    return {
        scope: {
            changeFunction: '=changeFile'
        },
        link: function(scope, el, attrs){
            el.bind('change', function (event) {
                var files = event.target.files,
                    file = files[0];
                scope.changeFunction(file);
            });
        }
    };
});
