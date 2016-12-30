/*global angular, d3, alert, FileReader, Blob*/
'use strict';

var module = angular.module('controller', []);

module.controller('MainCtrl', function ($scope, $http, $compile) {

    $scope.root = null;
    $scope.fileName = "mindMap";
    $scope.current_node = null;
    $scope.select_node = null;

    $scope.init = function (data) {
        if (screen.width <= '512') {
            var url = document.URL.split('/'),
                mapid = url[url.length-1];
            if ("map" === url[3]) {
                window.location = "/android/" + mapid;
            }
            else {
                window.location = "/android";
            }
            return;
        }
        else {
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
                //window.history.back(-1);
                return;
            }
            $scope.json = json;
            $scope.$apply();
        });
        }
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
        if (source.link && source.link.length > 0) {
            json.link = source.link;
        }
        return json;
    }

    $scope.create = function () {
        $scope.json = {
            "name" : "root"
        };
    };

    $scope.load = function (file) {
        var reader = new FileReader();
        reader.onload = function (event) {
            var contents = event.target.result;
            $scope.json = JSON.parse(contents);
            console.log(JSON.parse(contents));
            $scope.$apply();
            $("#uploadFile").val("");
        };
        reader.readAsText(file);
    };
    $scope.update = function () {
        var saveData = serializeData($scope.root),
            jsonData = JSON.stringify({'title': $scope.root.name, 'data': saveData});

        $http.post('/save', jsonData).success(function (data) {
            $scope.msg = 'Data saved';
            alert("success message:" + data);
        }).error(function (data) {
            alert("failure message:" + data);
        });
    };

    $scope.save = function () {
        var saveData = serializeData($scope.root),
            MIME_TYPE = 'application/json',
            jsonData = JSON.stringify(saveData),
            bb = new Blob([jsonData], {type: MIME_TYPE}),
            a = document.createElement('a');

        a.download = $scope.fileName + ".json";
        a.href = window.URL.createObjectURL(bb);
        a.textContent = '点击下载';

        a.dataset.downloadurl = [MIME_TYPE, a.download, a.href].join(':');
        document.querySelectorAll("#downloadLinkWrap")[0].innerHTML = "";
        document.querySelectorAll("#downloadLinkWrap")[0].appendChild(a);

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
                    d._children = null;
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

                toolTip.html('<table id="toolTipTable">');

                for (var i in d.link) {
                    var name = d.link[i]['name'],
                        text = '<td><button ng-click=\'deleteLink('+i+')\'>-'+
                            '</button></td>',
                        a = '<td class="tdlink"><a class="link" ng-click="'+
                            'toTutorial('+i+')" href="javascript:void(0)" >'
                            +name +' </a></td>',

                        tr = angular.element('<tr></tr>')
                            .append($compile(a)(scope))
                            .append($compile(text)(scope));

                    angular.element(document.getElementById('toolTipTable'))
                        .append(tr);
                }

                if (d.link && d.link.length) {
                    var left, top;
                    if (d3.event !== null) {
                        left = d3.event.pageX + 10;
                        top = d3.event.pageY - 3*d.link.length;
                    }
                    else {
                        left = toolTip.left;
                        top = toolTip.top;
                    }
                    toolTip.transition().duration(300)
                        .style("opacity", 0.8)
                        .style("left", left + "px")
                        .style("top", top + "px")
                        .style("visibility", "visible")
                        ;
                }
            }

            scope.keyup = function (keyCode) {
                var d = scope.select_node,
                    pd = d.parent;
                switch (keyCode) {
                case 13: // Enter
                    addNewNode(scope.select_node.parent);
                case 27:
                    break;
                case 37: // Left
                    if (pd) {
                        var newNode = null;
                        if (pd.children[0] === d) {
                            newNode = pd.children[
                                pd.children.length - 1];
                        }
                        else {
                            for (i = 1; i < pd.children.length; i++) {
                                if (pd.children[i] === d) {
                                    newNode = pd.children[i - 1];
                                }
                            }
                        }
                        if (newNode) {
                            clickNode(newNode);
                        }
                    }
                    break;
                case 38: // Up
                    clickNode(d.parent)
                    break;
                case 39: // Right
                    if (pd) {
                        var newNode = null;
                        if (pd.children[pd.children.length-1] === d) {
                            newNode = pd.children[0];
                        }
                        else {
                            for (i = 0; i < pd.children.length; i++) {
                                if (pd.children[i] === d) {
                                    newNode = pd.children[i + 1];
                                }
                            }
                        }
                        if (newNode) {
                            clickNode(newNode);
                        }
                    }
                    break;
                case 40: // Down
                    if (d.children.length)
                        clickNode(d.children[0])
                    break;
                case 45: // Insert
                    addNewNode(scope.select_node);
                    break;
                case 46: // Delete
                    removeNode(scope.select_node);
                    break;
                case 83:
                    break;
                }
                return false;
            };

            scope.deleteLink = function (i) {
                var d = scope.current_node;
                d.link.splice(i, 1);
                showToolTip(scope.current_node);
            }

            scope.toTutorial = function (i) {
                var d = scope.current_node,
                    p = d.parent.name || null,
                    curparts = document.URL.split('/'),
                    url = d.link[i]['url'].split('?')[0];
                url += '?id='+curparts[4]+'&name='+d.name+'&parent='+p;
                window.open(url);
            }

        function update(source) {
            if(!(source != null)){
                return;
            }

            // Compute the new tree layout.

            var nodes = tree.nodes(root).reverse();
            //console.log(nodes.length);

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

                    toolTip.transition().duration(500).style("opacity", 0);
                    toolTip.on("mouseover", function(d) {
                        toolTip.transition().duration(500).style("opacity", 0.8);
                    }).on("mouseout", function(d) {
                        toolTip.transition().duration(500).style("opacity", 0);
                    })

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
                scope.json = {
                    "name" : "root"
                }
            }
            root = scope.json;
            root.x0 = h / 2;
            root.y0 = 0;
            update(root);
            $("#mainMap").html('');
            var treeData = constructParent(root);
            $('#mainMap').treeview({
                color: "#428bca",
                expandIcon: 'glyphicon glyphicon-chevron-right',
                collapseIcon: 'glyphicon glyphicon-chevron-down',
                nodeIcon: 'glyphicon glyphicon-bookmark',
                levels: 3,
                enableLinks: true,
                showTags: true,
                data: [treeData]
            });
            scope.root = root;
        });

        function constructParent(node) {
            var temp = {text: node.name, nodes: [], tags: []};
            if (node.level) {
                var white = d3.rgb(255, 255, 255);
                var red   = d3.rgb(255, 0,   0);
                var compute = d3.interpolate(white, red);
                temp.backColor = compute(node.level / 8.0);
            }
            if (node.link && node.link.length) {
                temp.href = "";
                temp.tags.push(node.link.length);
                for (var i in node.link) {
                    var url = {text: node.link[i].name, href: node.link[i].url,
                        color: "yellow", backColor: "purple"}
                    temp.nodes.push(url);
                }
            }
            if (node.children && node.children.length) {
                temp.tags.push(node.children.length);
                for (var i in node.children) {
                    temp.nodes.push(constructParent(node.children[i]));
                }
            }
            return temp;
        }

        function to_backend_create(d, type, json, name) {
            $.ajax({
                url: '/new'+type,
                method: 'POST',
                contentType: 'application/json',
                dataType: "json",
                data: JSON.stringify(json),
                success: function (result) {
                    var whole_url = 'http://'+ window.location.host +'/'+type
                        +'/'+result.uuid;
                    //console.log(whole_url);
                    linkquiz(d, name, whole_url);
                }
            });
        }

        function linkquiz(d, name, url){

            var dict = {'name': name, 'url': url},
                urlparts = url.split('/'),
                curparts = document.URL.split('/'),
                practice_map = ['tutorial', 'practice'];

            if (urlparts[2] === curparts[2]) {
                var flag = false;
                for (var i in practice_map) {
                    if (practice_map[i] == urlparts[3]) {
                        var p = null;
                        if (d.parent) p = d.parent.name;
                        $.ajax({
                            method: "post",
                            url : "/linkquiz",
                            contentType: 'application/json',
                            dataType: "json",
                            data: JSON.stringify({
                                'mapid': curparts[4], 
                                'tutorid': urlparts[4], 
                                'name': d.name, 
                                'parent':p}
                                ),
                            success : function (result){
                                var response = result.status;
                                if (!response) {
                                    alert("与网页的关联创建失败! " + result.error);
                                }
                                else {
                                    d.link.push(dict);
                                }
                            },
                            error: function (data) {
                                alert(data.status + ' ' + data.statusText);
                            }
                        });
                        flag = true;
                        break;
                    }
                }
                if (!flag) {
                    d.link.push(dict);
                }
            } else {
                d.link.push(dict);
            }

            //console.log(d.link);
        }

        function addLink(d){	    			

            var name = prompt("输入新属性");
            if (name === null) return;

            var url = prompt("输入新链接");

            if (name !== null && url !== null){
                if (typeof(d.link) == "undefined") {
                    d.link = new Array();
                }

                if (url.indexOf(".mkd") > -1 || url.indexOf(".md") > -1) {
                    if (name === 'practice' || name === '练习') {
                        var json = {'url': url, 'title': d.name};
                        to_backend_create(d, 'practice', json, name);
                        return;
                    }
                    else if (name === '教程' || name === 'tutorial') {
                        var json = {'url': url, 'title': d.name};
                        to_backend_create(d, 'tutorial', json, name);
                        return;
                    }
                }
                linkquiz(d, name, url);
            }
            //update(d);
            //scope.root = root;	
        }

        function addNewNode (d){	    			
            var name = prompt("输入名称", d.name);
            if (name === null) {
                return;
            }

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
                "name": name,
                "parent": d
            });	
            update(d);
            //centerNode(d);
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
            scope.select_node = d.parent;
            update(d.parent);
            centerNode(d.parent);
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
        function computeRadius(d) {
            var radius = 20;
            if(d.children || d._children) return radius + (nbEndNodes(d) / 2);
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

        function clickNode(d) {
            if (scope.select_node != null) {
                d3.select("circle#circle"+scope.select_node.id)
                    .style('stroke-width','1px');
            }
            scope.select_node = d;
            d3.select("circle#circle"+d.id).style('stroke-width','3px');
            centerNode(d);
        }

        function InjectNodeContent (nodeEnter) {
            nodeEnter.append("circle")			
                .attr("id", function(d) {return "circle"+d.id})
                .attr("r", 1e-6)
                .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; })
                .classed("toggleCircle" , true)
                .on("click", function(d) {
                    clickNode(d);
                });

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
